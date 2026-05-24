/**
 * COGNAPSE Ops Telemetry Service
 *
 * A lightweight, self-contained, event-driven telemetry pipeline that
 * passively observes the main app's Zustand store and sends operational
 * events to Firestore for the Ops Command Centre to consume.
 *
 * DESIGN PRINCIPLES:
 * - Zero modifications to existing app code (import + initialize only)
 * - Non-blocking: all Firestore writes are fire-and-forget
 * - Throttled: max 1 event per 2s per type
 * - Batched: events are batched and flushed on interval + page unload
 * - Silent: no console output in production
 * - Clean lifecycle: all listeners are removed on destroy()
 *
 * BEHAVIOR TRACKING (privacy-conscious, aggregated only):
 * - Keystrokes: total count, backspace ratio, avg WPM (no actual keys/content)
 * - Scroll depth: max depth %, avg scroll speed (no exact positions)
 * - Mouse movement: total distance, hover zone distribution (no exact coords)
 *
 * The service auto-detects these events via Zustand subscription:
 *   session_start, session_end, session_abandoned
 *   auth_login, auth_logout
 *   research_started, research_completed, research_failed
 *   deep_research_started, deep_research_completed, deep_research_failed
 *   report_exported, onboarding_completed
 *   behavior_snapshot (aggregated session behavior data)
 *
 * For events that can't be auto-detected (board_created, fork_used, etc.),
 * use: import { trackOperationalEvent } from './services/opsTelemetry'
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useStore } from '../store';

/* ─── Types ─── */

export type TelemetryEventType =
  | 'session_start'
  | 'session_end'
  | 'session_abandoned'
  | 'auth_login'
  | 'auth_logout'
  | 'research_started'
  | 'research_completed'
  | 'research_failed'
  | 'deep_research_started'
  | 'deep_research_completed'
  | 'deep_research_failed'
  | 'report_exported'
  | 'onboarding_completed'
  | 'onboarding_started'
  | 'board_created'
  | 'board_opened'
  | 'fork_used'
  | 'graph_render_slow'
  | 'ai_provider_failure'
  | 'sync_error'
  | 'extension_failure'
  | 'electron_crash'
  | 'error_encountered'
  | 'feature_used'
  | 'behavior_snapshot';

export interface TelemetryPayload {
  type: TelemetryEventType;
  sessionId: string;
  userId?: string;
  username?: string;
  metadata?: Record<string, unknown>;
}

/* ─── Constants ─── */

const FLUSH_INTERVAL_MS = 15_000;              // flush batch every 15s
const THROTTLE_MS = 2_000;                     // min gap between same event type
const MAX_BATCH_SIZE = 20;                     // max events per batch
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;  // 10 min inactivity = abandoned
const BEHAVIOR_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000; // behavior snapshot every 5 min
const SCROLL_THROTTLE_MS = 500;                // scroll sampling throttle
const MOUSE_THROTTLE_MS = 1_000;               // mouse movement sampling throttle
const KEYSTROKE_SAMPLE_INTERVAL = 10;          // sample every Nth keystroke for WPM
const DPI = 96;                                // standard screen DPI for px→cm conversion
const CM_PER_INCH = 2.54;
const isDev = typeof window !== 'undefined' && import.meta.env?.DEV;

/* ─── Telemetry Engine ─── */

class OpsTelemetryEngine {
  private sessionId = '';
  private batch: TelemetryPayload[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEventTimestamps = new Map<TelemetryEventType, number>();
  private unsubStore: (() => void) | null = null;
  private boundHandleUnload: (() => void) | null = null;
  private boundHandleVisibility: (() => void) | null = null;
  private lastActiveTime = Date.now();
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;

  /* ─── Behavior tracking state (aggregated only) ─── */
  private behavior = {
    // Keystrokes
    totalKeystrokes: 0,
    backspaceCount: 0,
    keystrokeTimestamps: [] as number[],
    keystrokeStartTime: 0,

    // Scroll
    maxScrollDepth: 0,
    totalScrollPixels: 0,
    scrollSamples: 0,
    lastScrollY: 0,
    lastScrollTime: 0,

    // Mouse
    totalMouseDistancePx: 0,
    mouseSamples: 0,
    hoverZones: {} as Record<string, number>,
    lastMouseX: -1,
    lastMouseY: -1,
    lastMouseTime: 0,

    // Session
    sessionStartTime: 0,
  };

  private behaviorSnapshotTimer: ReturnType<typeof setTimeout> | null = null;
  private scrollThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private mouseThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private boundHandleKeydown: ((e: KeyboardEvent) => void) | null = null;
  private boundHandleScrollThrottled: (() => void) | null = null;
  private boundHandleMousemoveThrottled: ((e: MouseEvent) => void) | null = null;
  private boundHandleClick: (() => void) | null = null;

  private previousState: {
    userId: string | null;
    userUsername: string | null;
    isLoading: boolean;
    hasReport: boolean;
    deepResearchStatus: string;
    error: string | null;
    walkthroughCompleted: boolean;
    pdfExportsLength: number;
  } | null = null;
  private destroyed = false;

  /* ─── Lifecycle ─── */

  init(): void {
    if (this.sessionId) return; // already initialized
    this.sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.lastActiveTime = Date.now();

    // Initialize behavior tracking
    this.behavior.sessionStartTime = Date.now();
    this.behavior.keystrokeStartTime = Date.now();

    // Fire session_start
    this.enqueue('session_start', {
      metadata: {
        url: window.location.href,
        referrer: document.referrer || undefined,
        userAgent: navigator.userAgent.slice(0, 120),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      },
    });

    // Subscribe to Zustand store
    this.unsubStore = useStore.subscribe((state) => this.onStateChange(state));

    // Lifecycle hooks
    this.boundHandleUnload = () => this.handleUnload();
    this.boundHandleVisibility = () => this.handleVisibilityChange();
    window.addEventListener('beforeunload', this.boundHandleUnload);
    document.addEventListener('visibilitychange', this.boundHandleVisibility);

    // Start flush timer
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);

    // Start behavior snapshot timer (every 5 min)
    this.behaviorSnapshotTimer = setInterval(
      () => this.emitBehaviorSnapshot(),
      BEHAVIOR_SNAPSHOT_INTERVAL_MS,
    );

    // ─── Behavior Tracking Listeners ───

    // Keystroke tracking
    this.boundHandleKeydown = (e: KeyboardEvent) => {
      this.lastActiveTime = Date.now();
      this.behavior.totalKeystrokes++;

      if (e.key === 'Backspace') {
        this.behavior.backspaceCount++;
      }

      // Sample every Nth keystroke for WPM calculation
      if (this.behavior.totalKeystrokes % KEYSTROKE_SAMPLE_INTERVAL === 0) {
        this.behavior.keystrokeTimestamps.push(Date.now());
        // Keep last 20 samples to bound memory
        if (this.behavior.keystrokeTimestamps.length > 20) {
          this.behavior.keystrokeTimestamps.shift();
        }
      }
    };
    window.addEventListener('keydown', this.boundHandleKeydown, { passive: true });

    // Scroll depth tracking (throttled)
    this.boundHandleScrollThrottled = () => {
      this.lastActiveTime = Date.now();
      if (this.scrollThrottleTimer) return; // throttle

      this.scrollThrottleTimer = setTimeout(() => {
        this.scrollThrottleTimer = null;
      }, SCROLL_THROTTLE_MS);

      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      if (this.behavior.lastScrollTime === 0) {
        this.behavior.lastScrollY = scrollY;
        this.behavior.lastScrollTime = Date.now();
        return;
      }

      const deltaY = Math.abs(scrollY - this.behavior.lastScrollY);
      this.behavior.totalScrollPixels += deltaY;
      this.behavior.scrollSamples++;

      const depthPercent = Math.min(100, ((scrollY + vh) / docHeight) * 100);
      if (depthPercent > this.behavior.maxScrollDepth) {
        this.behavior.maxScrollDepth = depthPercent;
      }

      this.behavior.lastScrollY = scrollY;
      this.behavior.lastScrollTime = Date.now();
    };
    window.addEventListener('scroll', this.boundHandleScrollThrottled, { passive: true });

    // Mouse movement tracking (throttled)
    this.boundHandleMousemoveThrottled = (e: MouseEvent) => {
      this.lastActiveTime = Date.now();
      if (this.mouseThrottleTimer) return; // throttle

      this.mouseThrottleTimer = setTimeout(() => {
        this.mouseThrottleTimer = null;
      }, MOUSE_THROTTLE_MS);

      const { clientX, clientY } = e;
      this.behavior.mouseSamples++;

      // Calculate distance from last known position
      if (this.behavior.lastMouseX >= 0 && this.behavior.lastMouseY >= 0) {
        const dx = clientX - this.behavior.lastMouseX;
        const dy = clientY - this.behavior.lastMouseY;
        this.behavior.totalMouseDistancePx += Math.sqrt(dx * dx + dy * dy);
      }
      this.behavior.lastMouseX = clientX;
      this.behavior.lastMouseY = clientY;

      // Track hover zone (viewport-relative zones, no exact coordinates)
      const zone = this.getHoverZone(clientX, clientY);
      this.behavior.hoverZones[zone] = (this.behavior.hoverZones[zone] ?? 0) + 1;
    };
    window.addEventListener('mousemove', this.boundHandleMousemoveThrottled, { passive: true });

    // Inactivity detection (reset on any interaction)
    this.boundHandleClick = () => { this.lastActiveTime = Date.now(); };
    window.addEventListener('click', this.boundHandleClick, { passive: true });

    // Error monitoring (passive)
    window.addEventListener('error', (e) => {
      this.enqueue('error_encountered', {
        metadata: {
          message: e.message?.slice(0, 200),
          filename: e.filename?.slice(0, 100),
          lineno: e.lineno,
        },
      });
    }, { passive: true });

    window.addEventListener('unhandledrejection', (e) => {
      this.enqueue('error_encountered', {
        metadata: {
          message: (e.reason?.message || String(e.reason))?.slice(0, 200),
        },
      });
    }, { passive: true });

    this.log('[OpsTelemetry] Initialized');
  }

  destroy(): void {
    this.unsubStore?.();
    this.unsubStore = null;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    // Clean up behavior snapshot timer
    if (this.behaviorSnapshotTimer) {
      clearInterval(this.behaviorSnapshotTimer);
      this.behaviorSnapshotTimer = null;
    }

    // Clean up behavior throttle timers
    if (this.scrollThrottleTimer) {
      clearTimeout(this.scrollThrottleTimer);
      this.scrollThrottleTimer = null;
    }
    if (this.mouseThrottleTimer) {
      clearTimeout(this.mouseThrottleTimer);
      this.mouseThrottleTimer = null;
    }

    // Emit final behavior snapshot before closing (BEFORE setting destroyed)
    this.emitBehaviorSnapshot();

    // Final flush (BEFORE setting destroyed)
    this.flush();

    this.destroyed = true;

    // Clean up behavior listeners
    if (this.boundHandleKeydown) {
      window.removeEventListener('keydown', this.boundHandleKeydown);
    }
    if (this.boundHandleScrollThrottled) {
      window.removeEventListener('scroll', this.boundHandleScrollThrottled);
    }
    if (this.boundHandleMousemoveThrottled) {
      window.removeEventListener('mousemove', this.boundHandleMousemoveThrottled);
    }
    if (this.boundHandleClick) {
      window.removeEventListener('click', this.boundHandleClick);
    }

    if (this.boundHandleUnload) {
      window.removeEventListener('beforeunload', this.boundHandleUnload);
    }
    if (this.boundHandleVisibility) {
      document.removeEventListener('visibilitychange', this.boundHandleVisibility);
    }

    this.log('[OpsTelemetry] Destroyed');
  }

  /* ─── Public API for manual events ─── */

  track(type: TelemetryEventType, metadata?: Record<string, unknown>): void {
    this.enqueue(type, { metadata });
  }

  /* ─── State Change Detection ─── */

  private onStateChange(state: Record<string, unknown>): void {
    if (this.destroyed) return;

    const current = {
      userId: (state.user as { id?: string } | null)?.id ?? null,
      userUsername: (state.user as { username?: string } | null)?.username ?? null,
      isLoading: !!(state.isLoading as boolean),
      hasReport: !!(state.currentReport as unknown),
      deepResearchStatus: ((state.deepResearch as { status?: string })?.status) ?? 'idle',
      error: (state.error as string) ?? null,
      walkthroughCompleted: !!(state.walkthroughCompleted as boolean),
      pdfExportsLength: ((state.pdfExports as unknown[])?.length) ?? 0,
    };

    const prev = this.previousState;
    this.previousState = current;

    if (!prev) return; // skip first emission (initial state)

    // Auth events
    if (!prev.userId && current.userId) {
      this.enqueue('auth_login', {
        userId: current.userId,
        username: current.userUsername ?? undefined,
      });
    }
    if (prev.userId && !current.userId) {
      this.enqueue('auth_logout', { userId: prev.userId });
    }

    // Research events
    if (current.isLoading && !prev.isLoading) {
      this.enqueue('research_started');
    }
    if (!current.isLoading && prev.isLoading && current.hasReport) {
      this.enqueue('research_completed');
    }
    if (current.error && !prev.error) {
      this.enqueue('research_failed', {
        metadata: { error: current.error.slice(0, 200) },
      });
    }

    // Deep research events
    if (current.deepResearchStatus === 'running' && prev.deepResearchStatus !== 'running') {
      this.enqueue('deep_research_started');
    }
    if (current.deepResearchStatus === 'completed' && prev.deepResearchStatus !== 'completed') {
      this.enqueue('deep_research_completed');
    }
    if (current.deepResearchStatus === 'error' && prev.deepResearchStatus !== 'error') {
      this.enqueue('deep_research_failed');
    }

    // Export events
    if (current.pdfExportsLength > prev.pdfExportsLength) {
      this.enqueue('report_exported', {
        metadata: { total: current.pdfExportsLength },
      });
    }

    // Onboarding events
    if (current.walkthroughCompleted && !prev.walkthroughCompleted) {
      this.enqueue('onboarding_completed');
    }
  }

  /* ─── Behavior Tracking ─── */

  /**
   * Determine a coarse hover zone based on viewport-relative position.
   * No exact coordinates are stored — only zone name counts.
   */
  private getHoverZone(x: number, y: number): string {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Check sidebar zone first (left ~15%)
    if (x < vw * 0.15) {
      if (y < vh * 0.1) return 'sidebar_header';
      if (y < vh * 0.35) return 'sidebar_top';
      if (y < vh * 0.65) return 'sidebar_mid';
      if (y < vh * 0.9) return 'sidebar_bot';
      return 'sidebar_footer';
    }

    // Main content vertical zones
    if (y < vh * 0.1) return 'header';
    if (y < vh * 0.35) return 'content_top';
    if (y < vh * 0.65) return 'content_mid';
    if (y < vh * 0.9) return 'content_bot';
    return 'footer';
  }

  /**
   * Calculate average WPM from sampled keystroke timestamps.
   */
  private calculateAvgWpm(): number {
    const samples = this.behavior.keystrokeTimestamps;
    if (samples.length < 2) return 0;

    // Use last sample relative to session start for more stable reading
    const elapsedMs = samples[samples.length - 1] - this.behavior.keystrokeStartTime;
    if (elapsedMs <= 0) return 0;

    const elapsedMin = elapsedMs / 60000;
    // Standard: 1 word = 5 keystrokes, exclude backspaces
    const netKeystrokes = Math.max(0, this.behavior.totalKeystrokes - this.behavior.backspaceCount);
    const words = netKeystrokes / 5;
    return Math.round(words / Math.max(elapsedMin, 0.01));
  }

  /**
   * Calculate average scroll speed in pixels per second.
   */
  private calculateAvgScrollSpeed(): number {
    if (this.behavior.scrollSamples < 2 || this.behavior.totalScrollPixels <= 0) return 0;
    const elapsedSec = (Date.now() - this.behavior.sessionStartTime) / 1000;
    return Math.round(this.behavior.totalScrollPixels / Math.max(elapsedSec, 0.01));
  }

  /**
   * Build aggregated behavior metadata for a snapshot event.
   */
  private getBehaviorSnapshotMetadata(): Record<string, unknown> {
    const durationMs = Date.now() - this.behavior.sessionStartTime;
    const durationMin = Math.round(durationMs / 60000);

    // Calculate mouse distance in pixels → approx cm (assuming 96 DPI)
    const distanceCm = Math.round((this.behavior.totalMouseDistancePx / DPI) * CM_PER_INCH);

    // Calculate hover zone distribution as percentages
    const totalHover = Object.values(this.behavior.hoverZones).reduce((a, b) => a + b, 0);
    const hoverDistribution: Record<string, number> = {};
    if (totalHover > 0) {
      for (const [zone, count] of Object.entries(this.behavior.hoverZones)) {
        hoverDistribution[zone] = Math.round((count / totalHover) * 100);
      }
    }

    // Sort zones by percentage descending for cleaner data
    const sortedHover: Record<string, number> = {};
    Object.entries(hoverDistribution)
      .sort(([, a], [, b]) => b - a)
      .forEach(([k, v]) => { sortedHover[k] = v; });

    return {
      sessionDurationMin: durationMin,
      // Keystrokes
      totalKeystrokes: this.behavior.totalKeystrokes,
      backspaceCount: this.behavior.backspaceCount,
      backspaceRatio: this.behavior.totalKeystrokes > 0
        ? Math.round((this.behavior.backspaceCount / this.behavior.totalKeystrokes) * 100)
        : 0,
      avgWpm: this.calculateAvgWpm(),
      keystrokesPerMin: durationMin > 0
        ? Math.round(this.behavior.totalKeystrokes / durationMin)
        : 0,
      // Scroll
      maxScrollDepthPct: Math.round(this.behavior.maxScrollDepth),
      avgScrollSpeedPxPerSec: this.calculateAvgScrollSpeed(),
      totalScrollPixels: this.behavior.totalScrollPixels,
      // Mouse
      totalMouseDistancePx: this.behavior.totalMouseDistancePx,
      totalMouseDistanceCm: distanceCm,
      mouseSampleCount: this.behavior.mouseSamples,
      hoverZoneDistribution: Object.keys(sortedHover).length > 0 ? sortedHover : undefined,
    };
  }

  /**
   * Emit a behavior_snapshot event with aggregated session data.
   * Called every 5 minutes and on destroy/unload.
   */
  private emitBehaviorSnapshot(): void {
    // Skip if no meaningful data collected yet (less than 10s elapsed)
    const elapsed = Date.now() - this.behavior.sessionStartTime;
    if (elapsed < 10_000) return;

    // Skip if nothing tracked
    const hasData =
      this.behavior.totalKeystrokes > 0 ||
      this.behavior.maxScrollDepth > 0 ||
      this.behavior.mouseSamples > 0;
    if (!hasData) return;

    const metadata = this.getBehaviorSnapshotMetadata();
    this.enqueue('behavior_snapshot', { metadata });
    this.log('[OpsTelemetry] Behavior snapshot emitted');
  }

  /* ─── Lifecycle Handlers ─── */

  private handleUnload(): void {
    // Emit final behavior snapshot
    this.emitBehaviorSnapshot();

    // Force-sync remaining events using sendBeacon
    this.flush(true);

    // Use sendBeacon for session_end (most reliable during page unload)
    try {
      const body = JSON.stringify({
        fields: {
          sessionId: { stringValue: this.sessionId },
          type: { stringValue: 'session_end' },
          ts: { stringValue: new Date().toISOString() },
        },
      });
      const url =
        `https://firestore.googleapis.com/v1/projects/${encodeURIComponent('cognapse-93cdf')}/databases/(default)/documents/ops_telemetry?key=AIzaSyBUZoskVfIc7ZkJqFxx21r4Fb-XkahNaWQ`;
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } catch {
      // Best-effort
    }
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Tab minimized — detect inactivity later
      this.inactivityTimer = setTimeout(() => {
        const elapsed = Date.now() - this.lastActiveTime;
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          this.enqueue('session_abandoned', {
            metadata: { inactiveMinutes: Math.round(elapsed / 60000) },
          });
        }
      }, INACTIVITY_TIMEOUT_MS);
    } else {
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = null;
      }
    }
  }

  /* ─── Event Queue ─── */

  private enqueue(type: TelemetryEventType, extra?: Partial<TelemetryPayload>): void {
    if (this.destroyed) return;

    // Throttle: skip if same type fired within THROTTLE_MS
    const now = Date.now();
    const last = this.lastEventTimestamps.get(type) ?? 0;
    if (now - last < THROTTLE_MS) return;
    this.lastEventTimestamps.set(type, now);

    const state = useStore.getState();
    const payload: TelemetryPayload = {
      type,
      sessionId: this.sessionId,
      userId: state.user?.id,
      username: state.user?.username,
      ...extra,
      metadata: {
        ...extra?.metadata,
      },
    };

    this.batch.push(payload);

    if (this.batch.length >= MAX_BATCH_SIZE) {
      this.flush();
    }
  }

  /* ─── Flush (write to Firestore) ─── */

  private flush(forceBeacon = false): void {
    if (this.batch.length === 0) return;

    const events = this.batch.splice(0);
    this.log(`[OpsTelemetry] Flushing ${events.length} events`);

    if (forceBeacon) {
      // Use sendBeacon for page unload (most reliable)
      for (const event of events) {
        try {
          const body = JSON.stringify({
            fields: {
              sessionId: { stringValue: event.sessionId },
              type: { stringValue: event.type },
              userId: { stringValue: event.userId ?? '' },
              username: { stringValue: event.username ?? '' },
              metadata: { stringValue: JSON.stringify(event.metadata ?? {}) },
              ts: { stringValue: new Date().toISOString() },
            },
          });
          const url =
            `https://firestore.googleapis.com/v1/projects/${encodeURIComponent('cognapse-93cdf')}/databases/(default)/documents/ops_telemetry?key=AIzaSyBUZoskVfIc7ZkJqFxx21r4Fb-XkahNaWQ`;
          navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        } catch {
          // Best-effort
        }
      }
      return;
    }

    // Normal flush: write via Firestore SDK
    for (const event of events) {
      this.writeEvent(event).catch(() => {
        // Silent fail
      });
    }
  }

  private async writeEvent(event: TelemetryPayload): Promise<void> {
    try {
      const col = collection(db, 'ops_telemetry');
      await addDoc(col, {
        sessionId: event.sessionId,
        type: event.type,
        userId: event.userId ?? null,
        username: event.username ?? null,
        metadata: event.metadata ?? {},
        createdAt: serverTimestamp(),
      });
    } catch {
      // Silent fail — telemetry must never throw
    }
  }

  /* ─── Logging ─── */

  private log(...args: unknown[]): void {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug(...args);
    }
  }
}

/* ─── Singleton Export ─── */

export const opsTelemetry = new OpsTelemetryEngine();

/**
 * Track a manual operational event.
 * Use this for events that can't be auto-detected from the Zustand store,
 * such as board_created, fork_used, collaboration_joined, etc.
 *
 * Example:
 *   import { trackOperationalEvent } from './services/opsTelemetry';
 *   trackOperationalEvent('board_created', { boardId: 'abc-123' });
 */
export function trackOperationalEvent(
  type: TelemetryEventType,
  metadata?: Record<string, unknown>,
): void {
  opsTelemetry.track(type, metadata);
}
