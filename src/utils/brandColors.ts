/** Runtime brand colors for canvas/WebGL (reads CSS variables). */
const FALLBACK_SIGNAL = '#F27D26';
const FALLBACK_ACCENT_LIGHT = '#2A4365';
const FALLBACK_ACCENT_DARK = '#FACC15';

export function readCssVar(name: string, fallback = ''): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function getSignalColor(): string {
  return readCssVar('--signal', FALLBACK_SIGNAL);
}

export function getAccentColor(isDark?: boolean): string {
  if (isDark === undefined && typeof document !== 'undefined') {
    isDark = document.documentElement.classList.contains('dark');
  }
  return readCssVar('--accent', isDark ? FALLBACK_ACCENT_DARK : FALLBACK_ACCENT_LIGHT);
}
