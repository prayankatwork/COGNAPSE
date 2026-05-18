import React, { useState } from 'react';
import { COGNAPSE_Output } from '../types';
import { ShieldAlert, Info, AlertTriangle, ArrowRight, CheckCircle2, Link2, Map, Clock, Download, Search, Lock, Loader2 } from 'lucide-react';
import clsx from 'clsx';
// Map rendering removed per request
import PhysicsMap from './PhysicsMap';
import { useStore } from '../store';
import confetti from 'canvas-confetti';
import ThoughtReplayEngine from './ThoughtReplayEngine';
import BrandLogo from './BrandLogo';
import PremiumExportModal from './PremiumExportModal';
import { generatePremiumPDF } from '../utils/pdfGenerator';

export default function ReportView({ report, onSubSearch, onChatFollowUp }: { report: COGNAPSE_Output, onSubSearch: (q: string) => void, onChatFollowUp?: (q: string) => void }) {
  
  const safeText = (val: any) => {
    if (typeof val === 'string') return val;
    if (val === null || val === undefined) return "";
    return JSON.stringify(val);
  };
  const hasConflicts = report.conflicts && report.conflicts.length > 0;
  const hasBias = !!report.bias_alert;
  const [rated, setRated] = useState(false);
  const { updateGamification, unlockedReports, user } = useStore();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const reportId = report.id || report.query_understood;
  const isUnlocked = unlockedReports[reportId] || false;

  const handleDownloadPDF = async () => {
    if (!isUnlocked) {
      setIsExportModalOpen(true);
      return;
    }

    setGeneratingPDF(true);
    try {
      await generatePremiumPDF({
        query: report.query_understood,
        report: report,
        deepThesis: report.deep_research || null,
        aiProvider: report.provider || 'gemini'
      });
    } catch (err) {
      console.error(err);
      alert("Error packaging PDF. Please try again.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleRating = (rating: number) => {
    if (rated) return;
    setRated(true);

    if (rating >= 4) {
      updateGamification({ xpAcquired: 20 });
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#F27D26', '#2A4365', '#E2E8F0']
      });
    }
  };

  let normalizedSuggestions = report.follow_up_suggestions || [];
  if (normalizedSuggestions.length === 1 && typeof normalizedSuggestions[0] === 'string' && normalizedSuggestions[0].trim().startsWith('[')) {
    try {
      normalizedSuggestions = JSON.parse(normalizedSuggestions[0]);
    } catch(e) {}
  }

  // Aggressive normalization to handle AI hallucinating objects instead of strings
  normalizedSuggestions = normalizedSuggestions.map((s: any) => {
    if (typeof s === 'string') return s;
    if (typeof s === 'object' && s !== null) {
      return s.question || s.text || s.suggestion || s.query || Object.values(s)[0] || JSON.stringify(s);
    }
    return String(s);
  }).filter(Boolean);

  return (
    <div className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      
      {/* Header & Badges */}
      {report.gamification?.badge_unlocked && (
         <div className="mb-4 inline-flex items-center gap-3 px-4 py-2 bg-my-score border border-my-accent/20 rounded-full text-my-accent animate-bounce w-fit">
           <span className="text-xl">{report.gamification.badge_unlocked.icon}</span>
           <div>
             <p className="text-xs font-bold uppercase tracking-widest leading-none">Badge Unlocked: {report.gamification.badge_unlocked.name}</p>
           </div>
         </div>
      )}

      {/* Query Title & Bottom Line */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-6">
          <h1 className="font-serif text-[32px] leading-[1.1] text-my-ink flex-1">
            {safeText(report.query_understood)}
          </h1>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 pt-1">
            <button
              onClick={handleDownloadPDF}
              disabled={generatingPDF}
              className={clsx(
                "px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2",
                isUnlocked 
                  ? "bg-green-600 hover:bg-green-700 text-white hover:scale-105" 
                  : "bg-my-accent hover:bg-my-accent/90 text-white dark:text-my-bg hover:scale-105"
              )}
            >
              {generatingPDF ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Compiling Dossier...
                </>
              ) : isUnlocked ? (
                <>
                  <Download size={12} /> Generate Premium Intelligence Report
                </>
              ) : (
                <>
                  <Lock size={12} /> Unlock Full Report
                </>
              )}
            </button>
            <div className="hidden md:flex flex-col items-end text-right">
            </div>
            <BrandLogo size={44} />
          </div>
        </div>

        <div className="bg-my-callout border-l-[4px] border-my-accent px-6 py-4 italic font-serif text-base text-my-ink">
          {safeText(report.summary?.bottom_line) || "No summary provided."}
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[1.4fr_1fr] gap-[24px]">
        
        {/* Synthesis Column */}
        <div className="flex flex-col gap-6">
          <SectionTitle>Intelligence Synthesis</SectionTitle>
          
          {(report.summary?.full_synthesis || report.summary?.eli5_version) && (
            <div className="bg-my-bg/70 backdrop-blur-md p-6 border border-my-border rounded-[4px] text-[13px] leading-[1.6] text-my-syn flex flex-col gap-4 shadow-sm">
              {report.summary?.eli5_version && (
                <div className="p-4 bg-my-accent/5 border border-my-accent/10 rounded">
                  <span className="font-bold text-[10px] uppercase tracking-widest block mb-1 text-my-accent">ELI5 Version</span>
                  {safeText(report.summary.eli5_version)}
                </div>
              )}
              {report.summary?.full_synthesis && (
                 <p className="whitespace-pre-line">{safeText(report.summary.full_synthesis)}</p>
              )}
              {report.summary?.confidence_narrative && (
                 <p className="italic text-my-muted mt-2">{safeText(report.summary.confidence_narrative)}</p>
              )}
              
              <div className="mt-4 p-3 border border-my-accent/20 bg-my-accent/5 rounded flex items-center gap-3 cursor-pointer hover:bg-my-accent/10 transition-colors" onClick={handleDownloadPDF}>
                <div className="text-xl">🧠</div>
                <div>
                  <span className="font-bold text-[10px] uppercase tracking-widest block text-my-accent">Export-Only Advanced Analysis</span>
                  <p className="text-[11px] text-my-muted">Deeper synthesis, multi-AI consensus scoring, and hidden reasoning layers are preserved exclusively in the Premium Analyst Dossier.</p>
                </div>
              </div>
            </div>
          )}

          {/* Actionable Takeaways */}
          {report.actionable_takeaways && (
            <div className="mt-4">
              <SectionTitle>Takeaways</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1 bg-my-border border border-my-border mt-3">
                 <TakeawayCard title="Key Insight" content={safeText(report.actionable_takeaways.key_insight)} />
                 <TakeawayCard title="Watch Out" content={safeText(report.actionable_takeaways.watch_out_for)} />
                 <TakeawayCard title="Next Step" content={safeText(report.actionable_takeaways.next_step)} />
              </div>
            </div>
          )}

          {/* SWOT Analysis */}
          {report.swot && (
            <div className="mt-4">
              <SectionTitle>Decision Matrix (SWOT)</SectionTitle>
              <p className="text-[10px] text-my-muted font-mono mb-2">Perspective: {report.swot.perspective}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-my-border border border-my-border">
                <SwotQuadrant title="Strengths" items={report.swot.strengths || []} />
                <SwotQuadrant title="Weaknesses" items={report.swot.weaknesses || []} />
                <SwotQuadrant title="Opportunities" items={report.swot.opportunities || []} />
                <SwotQuadrant title="Threats" items={report.swot.threats || []} />
              </div>
            </div>
          )}

          {/* Timeline */}
          {report.timeline_triggered && report.timeline_events && Array.isArray(report.timeline_events) && report.timeline_events.length > 0 && (
            <div className="mt-4">
              <SectionTitle>Timeline</SectionTitle>
              <div className="relative border-l border-my-border ml-2 space-y-4 pt-2">
                {report.timeline_events.map((t, i) => (
                  <div key={i} className="pl-6 relative">
                    <div className={clsx("absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white", t.significance >= 4 ? "bg-my-accent" : "bg-my-muted")} />
                    <div className="text-[10px] font-bold text-my-accent mb-0.5">{safeText(t.date)}</div>
                    <h5 className="font-bold text-my-ink text-[12px] leading-tight mb-0.5">{safeText(t.title)}</h5>
                    <p className="text-[11px] text-my-syn">{safeText(t.description)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="flex flex-col gap-6">
          
          {/* Metrics */}
          <SectionTitle>Metrics</SectionTitle>
          {report.scores && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-my-border border border-my-border">
               <ScoreCard label="Credibility" value={safeText(report.scores.overall_credibility)} />
               <ScoreCard label="Relevance" value={safeText(report.scores.overall_relevance)} />
               <div className="bg-my-callout p-3 flex flex-col justify-center col-span-2">
                 <span className="text-[9px] font-bold text-my-muted uppercase mb-1">Consensus</span>
                 <span className="text-my-ink font-semibold capitalize text-[13px]">{safeText(report.scores.evidence_consensus)}</span>
               </div>
            </div>
          )}

          {/* Intelligence Map */}
          {report.intelligence_map && (
            <div className="mt-6 lg:mt-0">
              <SectionTitle>Intelligence Map</SectionTitle>
              <div className="mt-3">
                 <PhysicsMap mapData={report.intelligence_map} onSubSearch={onSubSearch} />
              </div>
            </div>
          )}

          {/* Forensic Reasoning Replay */}
          <ThoughtReplayEngine />



          {/* Sources */}
          {report.sources && Array.isArray(report.sources) && report.sources.length > 0 && (
            <div>
              <SectionTitle>References (Click to Verify)</SectionTitle>
              <div className="flex flex-col mt-3">
                {report.sources.map((s) => (
                  <div key={s.id} className="mb-3 p-2.5 bg-my-callout border border-my-border rounded-[4px]">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="font-bold text-my-accent bg-my-score px-1.5 py-0.5 rounded-[4px] text-[10px] shrink-0 mt-0.5">
                        {safeText(s.credibility_score)}
                      </span>
                      <div>
                        <span className="text-[12px] text-my-ink font-semibold leading-tight block mb-0.5">
                          {safeText(s.title)}
                        </span>
                        {s.domain && <span className="text-[9px] text-my-muted uppercase tracking-wider">{safeText(s.domain)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pl-9">
                       <a 
                         href={`https://www.google.com/search?q=${encodeURIComponent((typeof s.title === 'string' ? s.title : '') + ' ' + (typeof s.domain === 'string' ? s.domain : ''))}`} 
                         target="_blank" 
                         rel="noreferrer" 
                         className="px-3 py-1 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider hover:bg-blue-700 transition-all rounded-[2px] flex items-center gap-1.5 shadow-sm"
                       >
                          <Search size={10} /> Verify on Google
                       </a>
                       {s.url && s.url !== "URL unavailable" && !s.url.includes("unavailable") && (
                         <a 
                           href={typeof s.url === 'string' ? s.url : '#'} 
                           target="_blank" 
                           rel="noreferrer" 
                           className="text-[9px] font-bold flex items-center gap-1.5 text-my-muted hover:text-my-ink transition-colors uppercase tracking-wider border border-my-border px-3 py-1 rounded-[2px]"
                         >
                            <Link2 size={10} /> Direct Access
                         </a>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}



          {/* Warnings & Conflicts */}
          {hasConflicts && Array.isArray(report.conflicts) && (
            <div>
              <SectionTitle>Conflicts Detected</SectionTitle>
              <div className="space-y-2 mt-3">
                {report.conflicts.map((c, i) => (
                   <div key={i} className="p-3 bg-my-conflict-bg border border-my-conflict-border text-my-ink text-[11px] leading-relaxed">
                      <div className="font-bold text-my-conflict-text mb-2 uppercase tracking-wide flex items-center gap-1.5">
                        <ShieldAlert size={12} /> Conflict Note
                      </div>
                      <div className="mb-1"><span className="font-bold">Source A:</span> {safeText(c.claim_a)} <span className="opacity-60">({safeText(c.source_a)})</span></div>
                      <div className="mb-2"><span className="font-bold">Source B:</span> {safeText(c.claim_b)} <span className="opacity-60">({safeText(c.source_b)})</span></div>
                      <div className="pt-2 border-t border-my-conflict-border text-my-conflict-text">
                        {safeText(c.explanation)}
                      </div>
                   </div>
                ))}
              </div>
            </div>
          )}

          {hasBias && (
            <div className="p-3 bg-my-conflict-bg border border-my-conflict-border text-my-ink text-[11px] mt-4">
              <span className="font-bold text-my-conflict-text mb-1 uppercase tracking-wide flex items-center gap-1.5"><AlertTriangle size={12}/> Bias Alert</span>
              <p className="mb-1">{safeText(report.bias_alert!.direction)}</p>
              <p className="text-my-conflict-text font-medium">Rec: {safeText(report.bias_alert!.recommendation)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Follow-ups */}
      {normalizedSuggestions && normalizedSuggestions.length > 0 && (
        <div className="pt-6 mt-8 border-t border-my-border">
          <SectionTitle>Investigate Further</SectionTitle>
          <div className="flex flex-wrap gap-2 mt-3">
            {normalizedSuggestions.map((f: string, i: number) => (
              <button 
                key={i} 
                onClick={() => onChatFollowUp ? onChatFollowUp(f) : onSubSearch(f)}
                className="bg-my-bg border border-my-border hover:border-my-accent text-[12px] text-my-ink py-1.5 px-3 transition-colors flex items-center gap-2"
              >
                {safeText(f)} <ArrowRight size={12} className="opacity-50" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feedback */}
      {report.feedback_prompt && !rated && (
         <div className="mt-8 flex justify-center py-4 border-t border-b border-my-border">
           <div className="flex items-center gap-4 text-xs tracking-wide text-my-ink font-bold">
             <span>{safeText(report.feedback_prompt)}</span>
             <div className="flex items-center gap-1">
               {[1,2,3,4,5].map(i => (
                 <button key={i} onClick={() => handleRating(i)} className="hover:scale-125 transition-transform text-lg grayscale hover:grayscale-0 cursor-pointer">⭐</button>
               ))}
             </div>
           </div>
        </div>
      )}
      {rated && (
        <div className="mt-8 flex items-center justify-center py-4 border-t border-my-border text-my-accent text-xs font-bold gap-2 animate-in fade-in zoom-in">
           <CheckCircle2 size={16} /> Thank you for your feedback! Data logged.
        </div>
      )}

      <PremiumExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        researchId={reportId}
        query={report.query_understood}
        onUnlockSuccess={handleDownloadPDF}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.1em] font-bold text-my-muted border-b border-my-border pb-1">
      {children}
    </div>
  );
}

function ScoreCard({ label, value }: { label: string, value: any }) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const displayValue = typeof num === 'number' && !isNaN(num) ? num.toFixed(1) + '%' : value;
  return (
    <div className="bg-my-callout p-3 flex flex-col justify-center">
      <span className="text-[9px] font-bold text-my-muted uppercase mb-1">{label}</span>
      <span className="text-my-accent font-bold text-lg leading-none">{displayValue}</span>
    </div>
  );
}

function TakeawayCard({ title, content }: { title: string, content: string }) {
  return (
    <div className="bg-my-callout p-3">
      <h4 className="font-bold text-[9px] uppercase tracking-wide mb-1 text-my-muted">
        {title}
      </h4>
      <p className="text-[11px] leading-tight text-my-ink font-medium">{content}</p>
    </div>
  );
}

function SwotQuadrant({ title, items }: { title: string, items: string[] }) {
  if (!items || !Array.isArray(items) || items.length === 0) return (
    <div className="bg-my-callout p-3">
      <h4 className="font-bold text-[9px] uppercase tracking-wide text-my-muted">{title}</h4>
      <div className="text-[10px] text-my-border mt-2">N/A</div>
    </div>
  );
  return (
    <div className="bg-my-callout p-3 flex flex-col">
      <h4 className="font-bold text-[9px] uppercase tracking-wide mb-1 text-my-muted">{title}</h4>
      <div className="flex flex-col gap-1 mt-1">
        {items.map((item, i) => (
          <div key={i} className="text-[11px] leading-[1.3] text-my-ink">
            • {typeof item === 'object' && item !== null ? JSON.stringify(item) : item}
          </div>
        ))}
      </div>
    </div>
  );
}
