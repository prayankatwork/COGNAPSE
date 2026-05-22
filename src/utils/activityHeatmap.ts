export type HeatmapCell = { intensity: 0 | 1 | 2 | 3; count: number; dayLabel: string };

/** 42-day research frequency grid (6×7), newest day on the right. */
export function buildActivityHeatmap(
  archive: { timestamp?: string | number }[],
  days = 42
): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  const counts = new Array(days).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const entry of archive) {
    if (!entry?.timestamp) continue;
    const d = new Date(entry.timestamp);
    if (Number.isNaN(d.getTime())) continue;
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
    if (diffDays >= 0 && diffDays < days) {
      counts[days - 1 - diffDays] += 1;
    }
  }

  const max = Math.max(...counts, 1);

  for (let i = 0; i < days; i++) {
    const c = counts[i];
    const dayDate = new Date(today);
    dayDate.setDate(dayDate.getDate() - (days - 1 - i));
    let intensity: 0 | 1 | 2 | 3 = 0;
    if (c > 0) {
      const ratio = c / max;
      intensity = ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1;
    }
    cells.push({
      intensity,
      count: c,
      dayLabel: dayDate.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    });
  }

  return cells;
}
