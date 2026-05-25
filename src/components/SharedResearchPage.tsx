import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Calendar, FlaskConical, Loader2, ShieldCheck, Flag, X } from 'lucide-react';
import { useStore } from '../store';
import { dbService } from '../services/dbService';
import type { SharedResearchRecord } from '../types';
import ReportView from './ReportView';

export default function SharedResearchPage({ shareId }: { shareId: string }) {
  const [shared, setShared] = useState<SharedResearchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAbuseDialog, setShowAbuseDialog] = useState(false);
  const [abuseReason, setAbuseReason] = useState('');
  const [abuseSubmitted, setAbuseSubmitted] = useState(false);
  const { user } = useStore();

  const submitAbuseReport = async () => {
    if (!abuseReason.trim()) return;
    try {
      await fetch('/api/ops-telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [{
            sessionId: '',
            type: 'abuse_report',
            userId: user?.id || null,
            username: user?.username || null,
            metadata: {
              reason: abuseReason.slice(0, 500),
              shareId,
            },
          }],
        }),
      });
    } catch {}
    setAbuseSubmitted(true);
    setAbuseReason('');
    setTimeout(() => {
      setShowAbuseDialog(false);
      setAbuseSubmitted(false);
    }, 2000);
  };

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
            Shared Research is currently in preview testing. Links and read-only rendering are functional, but this workflow may be refined before final release.
          </p>
        </div>

        {/* AI Limitation Notice on Shared Content */}
        <div className="mb-4 flex items-start gap-3 p-3 border border-amber-500/20 bg-amber-500/5 text-my-muted">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[10px] leading-relaxed">
            <strong className="uppercase tracking-widest text-amber-500">AI-Generated Content:</strong> This research was produced by AI systems. 
            Confidence scores are model self-assessments. Independently verify all critical claims before relying on this content. 
            See the full <a href="/policies" onClick={(e) => { e.preventDefault(); window.location.hash = 'ai-disclaimer'; }} className="underline hover:text-my-accent">AI Liability Disclaimer</a>.
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
        </div>

        <ReportView report={shared.report} onSubSearch={() => {}} readOnly />

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

      {/* Abuse Report Button */}
      <div className="max-w-5xl mx-auto px-6 pb-8">
        <div className="border-t border-my-border pt-6 mt-2">
          <button
            onClick={() => setShowAbuseDialog(true)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-my-muted hover:text-red-500 transition-colors"
          >
            <Flag size={12} /> Report This Content
          </button>
        </div>
      </div>

      {/* Abuse Report Dialog */}
      {showAbuseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAbuseDialog(false)}>
          <div className="bg-my-bg border border-my-border p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-my-ink uppercase tracking-widest">Report Content</h3>
              <button onClick={() => setShowAbuseDialog(false)} className="text-my-muted hover:text-my-ink">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-my-muted mb-4 leading-relaxed">
              Help us keep the platform safe. Describe the issue with this shared research content.
            </p>
            <textarea
              value={abuseReason}
              onChange={e => setAbuseReason(e.target.value)}
              placeholder="Describe the issue..."
              className="w-full bg-my-sidebar border border-my-border text-sm text-my-ink p-3 mb-4 h-24 resize-none focus:outline-none focus:border-my-accent"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAbuseDialog(false)}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-my-muted border border-my-border hover:bg-my-sidebar transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitAbuseReport}
                disabled={!abuseReason.trim()}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Submit Report
              </button>
            </div>
            {abuseSubmitted && (
              <p className="mt-3 text-[11px] text-emerald-600 font-medium">Report submitted. Thank you.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
