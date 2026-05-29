/**
 * SoundWaveform — Animated visual indicator for the COGNAPSE audio ambient state.
 *
 * Renders 5 vertical bars that pulse with different rhythms depending on whether
 * the system is idle, running research, or deep research.
 *
 * No audio input required — the animation is driven purely by state and time,
 * creating a visual analogue of the ambient atmosphere.
 */

import { useEffect, useRef } from 'react';

export type WaveformState = 'silent' | 'idle' | 'research' | 'deep-research';

interface SoundWaveformProps {
  /** Current audio ambient state */
  state: WaveformState;
  /** Optional className for positioning */
  className?: string;
}

const BAR_COUNT = 5;

/**
 * For each state, define the target heights (0–1) and animation speed.
 * Bars are distributed across the state profile.
 */
const PROFILES: Record<WaveformState, { heights: number[]; speed: number; amp: number }> = {
  silent: {
    heights: [0.05, 0.05, 0.05, 0.05, 0.05],
    speed: 0,
    amp: 0,
  },
  idle: {
    // Slight asymmetric cluster — gentle breathing
    heights: [0.15, 0.25, 0.30, 0.20, 0.12],
    speed: 0.4,
    amp: 0.08,
  },
  research: {
    // More energy, higher peaks, tighter cluster
    heights: [0.30, 0.55, 0.70, 0.45, 0.25],
    speed: 1.2,
    amp: 0.15,
  },
  deep_research: {
    // Deep, slow, expansive — tallest bars with wide spacing
    heights: [0.50, 0.75, 0.95, 0.65, 0.40],
    speed: 0.25,
    amp: 0.12,
  },
};

export default function SoundWaveform({ state, className = '' }: SoundWaveformProps) {
  // Normalise state key
  const profileKey = state === 'deep-research' ? 'deep_research' : state;
  const profile = PROFILES[profileKey] ?? PROFILES.silent;

  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Time offset per bar for staggered animation
  const phases = useRef<number[]>([]);
  if (phases.current.length === 0) {
    phases.current = Array.from({ length: BAR_COUNT }, (_, i) => (i / BAR_COUNT) * Math.PI * 2);
  }

  useEffect(() => {
    if (state === 'silent' || profile.speed === 0) {
      // Static — set heights directly and stop animation
      barRefs.current.forEach((el, i) => {
        if (el) el.style.height = `${profile.heights[i] * 100}%`;
      });
      return;
    }

    let rafId: number;
    let startTime: number | null = null;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;
      const elapsed = (time - startTime) / 1000; // seconds

      barRefs.current.forEach((el, i) => {
        if (!el) return;
        const base = profile.heights[i];
        const phase = phases.current[i];
        // Sine wave modulation per bar with staggered phase
        const wave = Math.sin(elapsed * profile.speed + phase);
        const modulated = base + wave * profile.amp;
        const clamped = Math.max(0.02, Math.min(1, modulated));
        el.style.height = `${clamped * 100}%`;
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [state, profile.heights, profile.speed, profile.amp]);

  // Compute bar width and gap based on bar count
  const gapPx = 2;

  return (
    <div
      className={`flex items-end gap-[2px] h-4 transition-opacity duration-500 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        const baseHeight = profile.heights[i];
        // Initial render uses base height before RAF kicks in
        return (
          <div
            key={i}
            ref={(el) => { barRefs.current[i] = el; }}
            className="w-[3px] rounded-[1px] transition-colors duration-500"
            style={{
              height: `${baseHeight * 100}%`,
              background:
                state === 'silent'
                  ? 'var(--border, #374151)'
                  : `linear-gradient(to top,
                      var(--accent, #3b82f6) 0%,
                      color-mix(in srgb, var(--accent, #3b82f6) 60%, transparent) 100%
                    )`,
              opacity: state === 'silent' ? 0.25 : 0.85,
              minHeight: '2px',
            }}
          />
        );
      })}
    </div>
  );
}
