/**
 * COGNAPSE Benchmark Tracker
 *
 * Lightweight in-memory benchmark aggregator that:
 * 1. Tracks the last N benchmark data points per category
 * 2. Computes p50, p95, min, max statistics
 * 3. Logs a warning when p95 exceeds a configurable threshold
 * 4. Periodically persists a summary snapshot to ops-telemetry
 *
 * Designed to be imported by aiService.ts, deepResearchService.ts,
 * and consumed by DevDashboard.tsx.
 */

import { trackOperationalEvent } from './opsTelemetry';

/* ─── Types ─── */

export interface BenchmarkPoint {
  /** Unique id for dedup / rendering */
  id: string;
  /** Category of benchmark: 'research' | 'deep_research' */
  category: 'research' | 'deep_research';
  /** Client-observed round-trip time in ms */
  roundTripMs: number;
  /** Server-reported swarm processing time in ms (0 if unknown) */
  swarmMs: number;
  /** Total token count (0 if unknown) */
  totalTokens: number;
  /** Model identifier (e.g., 'llama-3.1-8b-instant') */
  model: string;
  /** Whether this was a retry after an initial failure */
  isRetry: boolean;
  /** Query preview (first 40 chars) */
  queryPreview: string;
  /** Timestamp */
  timestamp: number;
}

export interface BenchmarkStats {
  /** Number of data points in the window */
  count: number;
  /** p50 latency in ms */
  p50: number;
  /** p95 latency in ms */
  p95: number;
  /** Minimum latency in ms */
  min: number;
  /** Maximum latency in ms */
  max: number;
  /** Average latency in ms */
  avg: number;
  /** Total tokens accumulated */
  totalTokens: number;
  /** Model distribution map */
  modelDistribution: Record<string, number>;
  /** Number of retries */
  retryCount: number;
}

/* ─── Constants ─── */

const MAX_SAMPLES = 100;
const PERSIST_INTERVAL_MS = 60_000; // persist summary to ops-telemetry every 60s
const P95_WARN_THRESHOLD_MS = 10_000; // warn when p95 > 10s
const P95_DEGRADE_THRESHOLD_MS = 20_000; // stale warning above 20s

/* ─── Tracker ─── */

class BenchmarkTracker {
  private samples: BenchmarkPoint[] = [];
  private persistTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  /** Initialize the periodic persistence timer */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.persistTimer = setInterval(() => this.persistSummary(), PERSIST_INTERVAL_MS);
  }

  /** Cleanup on destroy */
  destroy(): void {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
    this.initialized = false;
  }

  /** Track a new benchmark data point */
  track(point: Omit<BenchmarkPoint, 'id' | 'timestamp'>): void {
    const sample: BenchmarkPoint = {
      ...point,
      id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };

    this.samples.push(sample);

    // Keep only the most recent MAX_SAMPLES
    if (this.samples.length > MAX_SAMPLES) {
      this.samples = this.samples.slice(-MAX_SAMPLES);
    }

    // Check p95 threshold and log warning if exceeded
    const stats = this.getStats();
    if (stats.count >= 10 && stats.p95 > P95_DEGRADE_THRESHOLD_MS) {
      console.warn(
        `[BENCH:ALERT] p95 latency ${stats.p95}ms exceeds ${P95_DEGRADE_THRESHOLD_MS}ms threshold! ` +
        `Model: ${point.model}, Samples: ${stats.count}, Retries: ${stats.retryCount}`
      );
    } else if (stats.count >= 10 && stats.p95 > P95_WARN_THRESHOLD_MS) {
      console.warn(
        `[BENCH:WARN] p95 latency ${stats.p95}ms exceeds ${P95_WARN_THRESHOLD_MS}ms. ` +
        `Model: ${point.model}`
      );
    }
  }

  /** Get computed statistics from recent samples */
  getStats(category?: 'research' | 'deep_research'): BenchmarkStats {
    const filtered = category
      ? this.samples.filter(s => s.category === category)
      : this.samples;

    if (filtered.length === 0) {
      return {
        count: 0,
        p50: 0,
        p95: 0,
        min: 0,
        max: 0,
        avg: 0,
        totalTokens: 0,
        modelDistribution: {},
        retryCount: 0,
      };
    }

    const sorted = [...filtered].sort((a, b) => a.roundTripMs - b.roundTripMs);
    const sortedMs = sorted.map(s => s.roundTripMs);
    const total = filtered.reduce((s, p) => s + p.roundTripMs, 0);
    const totalTokens = filtered.reduce((s, p) => s + p.totalTokens, 0);

    // Model distribution
    const modelDistribution: Record<string, number> = {};
    for (const s of filtered) {
      modelDistribution[s.model] = (modelDistribution[s.model] || 0) + 1;
    }

    return {
      count: filtered.length,
      p50: percentile(sortedMs, 0.5),
      p95: percentile(sortedMs, 0.95),
      min: sorted[0].roundTripMs,
      max: sorted[sorted.length - 1].roundTripMs,
      avg: Math.round(total / filtered.length),
      totalTokens,
      modelDistribution,
      retryCount: filtered.filter(s => s.isRetry).length,
    };
  }

  /** Get the most recent samples for rendering */
  getRecentEvents(limit = 20): BenchmarkPoint[] {
    return this.samples.slice(-limit).reverse();
  }

  /** Persist a summary snapshot to ops-telemetry */
  private persistSummary(): void {
    if (this.samples.length === 0) return;

    const overall = this.getStats();
    const research = this.getStats('research');
    const deep = this.getStats('deep_research');

    // Fire and forget — telemetry must never throw
    try {
      trackOperationalEvent('benchmark_snapshot', {
        overall,
        research,
        deep,
        sampleCount: this.samples.length,
        windowMinutes: Math.round(MAX_SAMPLES / 100 * 60), // rough estimate
      });
    } catch {
      // Silent
    }
  }
}

/* ─── Helpers ─── */

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/* ─── Singleton Export ─── */

export const benchmarkTracker = new BenchmarkTracker();
