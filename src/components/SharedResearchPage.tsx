import { useEffect, useState } from 'react';
import { AlertCircle, Calendar, FlaskConical, GitFork, Loader2, ShieldCheck } from 'lucide-react';
import { useStore } from '../store';
import { dbService } from '../services/dbService';
import type { SharedResearchRecord } from '../types';
import ReportView from './ReportView';

export default function SharedResearchPage({ shareId }: { shareId: string }) {
  const [shared, setShared] = useState<SharedResearchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, addToArchive, setCurrentReport, setView, pushToStack, clearStack, setAuthOpen } = useStore();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      const record = await dbService.getSharedResearch(shareId);
      if (!mounted) return;
      if (!record) {
        setError("Shared research link was not found.");
      } else if (record.active === false) {
        setError("This shared research link has been disabled by its owner.");
      } else if (record.visibility === 'private' && record.ownerId !== user?.id) {
        setError("This research is private.");
      } else {
        setShared(record);
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [shareId, user?.id]);

  const handleFork = async () => {
    if (!shared) return;
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const forkId = crypto.randomUUID();
    const forkedAt = new Date().toISOString();
    const forkedReport = {
      ...shared.report,
      id: forkId,
      fork_lineage: {
        originalResearchId: shared.researchId,
        originalShareId: shared.id,
        forkedAt,
        forkedFromTitle: shared.title
      }
    };

    addToArchive({
      id: forkId,
      query: `${shared.title} (Fork)`,
      timestamp: forkedAt,
      topic_cluster: shared.report.archive_entry?.topic_cluster || "Forked Intelligence",
      tags: Array.from(new Set([...(shared.report.archive_entry?.tags || []), "fork"])),
      summary_snippet: shared.summary,
      report: forkedReport
    });

    if (user) {
      await dbService.saveReport(forkId, user.id, `${shared.title} (Fork)`, forkedReport);
    }

    setCurrentReport(forkedReport);
    clearStack();
    pushToStack(forkedReport);
    setView('research');
    window.history.pushState({}, '', '/');
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-my-bg">
        <div className="flex items-center gap-3 text-my-muted text-[10px] font-black uppercase tracking-[0.3em]">
          <Loader2 size={16} className="animate-spin text-my-accent" /> Loading Shared Research
        </div>
      </div>
    );
  }

  if (error || !shared) {
    return (
      <div className="h-full flex items-center justify-center bg-my-bg p-8">
        <div className="max-w-md border border-my-border bg-my-callout p-8 text-center">
          <AlertCircle size={28} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-serif text-my-ink mb-3">Research unavailable</h1>
          <p className="text-sm text-my-muted">{error}</p>
        </div>
      </div>
    );
  }

  const thesis = shared.report.deep_research;

  return (
    <div className="h-full overflow-y-auto bg-my-bg">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-4 border border-my-border bg-my-callout/70 px-4 py-3 flex items-start gap-3 text-my-muted">
          <FlaskConical size={14} className="text-my-accent mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            Shared Research and Fork Research are currently in preview testing. Links and read-only rendering are functional, but this workflow may be refined before final release.
          </p>
        </div>

        <div className="mb-6 border border-my-border bg-my-callout p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-my-accent">
              <ShieldCheck size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Shared Research</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-my-muted uppercase tracking-widest font-bold">
              <span>{shared.visibility}</span>
              <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(shared.createdAt).toLocaleString()}</span>
              <span>{shared.sourceCount} sources</span>
              <span>{shared.graphNodeCount} graph nodes</span>
            </div>
          </div>
          <button
            onClick={handleFork}
            className="px-5 py-3 bg-my-ink text-white dark:bg-my-accent dark:text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <GitFork size={14} /> Fork Research
          </button>
        </div>

        <ReportView report={shared.report} onSubSearch={() => {}} readOnly onFork={handleFork} />

        {thesis && (
          <div className="mt-8 border-t border-my-border pt-8">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted mb-4">Detailed Report View</h2>
            {[
              ['Abstract', thesis.abstract],
              ['Findings', thesis.findings],
              ['Comparative Insights', thesis.comparativeInsights],
              ['Limitations', thesis.limitations],
              ['Conclusion', thesis.conclusion]
            ].map(([title, content]) => (
              content ? (
                <section key={title} className="mb-4 border border-my-border bg-my-callout p-5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-my-accent mb-3">{title}</h3>
                  <p className="text-sm leading-relaxed text-my-syn whitespace-pre-wrap">{String(content)}</p>
                </section>
              ) : null
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
