import React, { useState } from 'react';
import { useStore } from '../store';
import { ChevronDown, ChevronRight, CheckCircle2, Shield, Lock, Download, Loader2 } from 'lucide-react';
import { toast } from '../utils/toast';
import { stripCitationMarkers } from '../utils/citations';
import ResearchScoreCard from './ResearchScoreCard';
import PremiumExportModal from './PremiumExportModal';
import { generatePremiumPDF } from '../utils/pdfGenerator';
import clsx from 'clsx';

export default function DeepResearchView() {
  const { deepResearch, resetDeepResearch, currentReport, user, walkthroughCompleted } = useStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    abstract: true,
    introduction: true
  });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  if (!deepResearch.thesis) return null;

  const thesis = deepResearch.thesis;
  const reportId = currentReport?.id || currentReport?.query_understood || 'deep_research';
  const isUnlocked = !!user?.premium;

  const handleDownloadPDF = async () => {
    if (!isUnlocked) {
      setIsExportModalOpen(true);
      return;
    }

    setGeneratingPDF(true);
    try {
      await generatePremiumPDF({
        query: thesis.title,
        report: currentReport,
        deepThesis: thesis,
        aiProvider: currentReport?.provider || 'gemini'
      });
      if (user) {
        await useStore.getState().addExport({
          id: crypto.randomUUID(),
          userId: user.id,
          researchId: reportId,
          exportType: 'deep',
          aiProvider: currentReport?.provider || 'gemini',
          query: thesis.title,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error packaging PDF. Please try again.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const safeText = (val: unknown) => {
    if (typeof val === 'string') return val;
    if (val === null || val === undefined) return "";
    return JSON.stringify(val);
  };

  const sections = [
    { id: 'abstract', title: 'Abstract', content: stripCitationMarkers(safeText(thesis.abstract)) },
    { id: 'introduction', title: 'Introduction', content: stripCitationMarkers(safeText(thesis.introduction)) },
    { id: 'problemStatement', title: 'Problem Statement', content: stripCitationMarkers(safeText(thesis.problemStatement)) },
    { id: 'literatureReview', title: 'Literature Review', content: stripCitationMarkers(safeText(thesis.literatureReview)) },
    { id: 'methodology', title: 'Methodology / Approach', content: stripCitationMarkers(safeText(thesis.methodology)) },
    { id: 'findings', title: 'Key Findings & Analysis', content: stripCitationMarkers(safeText(thesis.findings)) },
    { id: 'comparativeInsights', title: 'Comparative Insights', content: stripCitationMarkers(safeText(thesis.comparativeInsights)) },
    { id: 'limitations', title: 'Limitations', content: stripCitationMarkers(safeText(thesis.limitations)) },
    { id: 'futureScope', title: 'Future Scope', content: stripCitationMarkers(safeText(thesis.futureScope)) },
    { id: 'conclusion', title: 'Conclusion', content: stripCitationMarkers(safeText(thesis.conclusion)) },
  ];

  return (
    <div className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      <div className="mb-8 border-b border-my-border pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-my-accent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-my-muted">Detailed Analysis Report</span>
          </div>
          <h1 className="font-serif text-[28px] md:text-[36px] leading-[1.15] text-my-ink max-w-2xl">
            {safeText(thesis.title)}
          </h1>
        </div>

        <div className="flex flex-col gap-1 items-end shrink-0 self-stretch md:self-auto">
          <button
            onClick={handleDownloadPDF}
            disabled={generatingPDF}
            className={clsx(
              "px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2",
              isUnlocked 
                ? "bg-green-600 hover:bg-green-700 text-white dark:text-white hover:scale-105" 
                : "bg-my-accent hover:bg-my-accent/90 text-white dark:text-black hover:scale-105"
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
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="border border-my-border bg-my-callout shadow-sm overflow-hidden">
            <button 
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 md:px-6 md:py-4 flex items-center justify-between hover:bg-my-callout/80 transition-colors text-left"
            >
              <h3 className="text-sm font-bold uppercase tracking-widest text-my-ink flex items-center gap-3">
                <span className="text-my-accent opacity-50 font-mono">
                  {expandedSections[section.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                {section.title}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-my-muted uppercase tracking-tighter">Verified</span>
                <CheckCircle2 size={12} className="ds-text-success" />
              </div>
            </button>
            {expandedSections[section.id] && (
              <div className="px-4 pb-6 pt-2 md:px-10 md:pb-8 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="text-[14px] leading-[1.7] text-my-syn whitespace-pre-wrap max-w-[65ch]">
                  {section.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {deepResearch.scores && (
          <ResearchScoreCard scores={deepResearch.scores} />
        )}

        {!isUnlocked && (
          <p className="text-[9px] text-my-muted font-mono text-center border-t border-my-border pt-3">
            What did the other AI models find? Consensus scores, reasoning layers &amp; strategic intel — <strong>locked in Premium</strong>
          </p>
        )}
      </div>

      <div className="mt-12 flex justify-center">
        <button 
          onClick={() => walkthroughCompleted && resetDeepResearch()}
          disabled={!walkthroughCompleted}
          className={clsx(
            "px-6 py-3 border text-[11px] font-bold uppercase tracking-widest transition-all",
            walkthroughCompleted 
              ? "border-my-border text-my-muted hover:text-my-ink hover:border-my-accent cursor-pointer" 
              : "border-my-border/50 text-my-muted/50 cursor-not-allowed"
          )}
        >
          {walkthroughCompleted ? "Back to Main Dashboard" : "Lockout Active (Training)"}
        </button>
      </div>

      <PremiumExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        researchId={reportId}
        query={thesis.title}
        onUnlockSuccess={handleDownloadPDF}
      />
    </div>
  );
}
