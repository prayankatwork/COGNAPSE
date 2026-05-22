/** Map Firestore report rows → archive entries (single source of truth). */
export function reportsToArchiveEntries(reports: unknown[]) {
  return (reports || [])
    .filter((r: any) => r && r.id && r.query)
    .map((r: any) => {
      const reportData = r.data || {};
      return {
        id: r.id,
        query: r.query,
        timestamp: r.timestamp || new Date().toISOString(),
        topic_cluster: reportData?.archive_entry?.topic_cluster || 'General',
        tags: reportData?.archive_entry?.tags || [],
        summary_snippet:
          reportData?.archive_entry?.summary_snippet ||
          reportData?.summary?.bottom_line ||
          '',
        report: reportData,
      };
    })
    .sort(
      (a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}
