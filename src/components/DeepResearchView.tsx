import React, { useState } from 'react';
import { useStore } from '../store';
import { ChevronDown, ChevronRight, CheckCircle2, Shield, Lock, Download, Loader2 } from 'lucide-react';
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
      alert("Error packaging PDF. Please try again.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const safeText = (val: any) => {
    if (typeof val === 'string') return val;
    if (val === null || val === undefined) return "";
    return JSON.stringify(val);
  };

  const sections = [
    { id: 'abstract', title: 'Abstract', content: safeText(thesis.abstract) },
    { id: 'introduction', title: 'Introduction', content: safeText(thesis.introduction) },
    { id: 'problemStatement', title: 'Problem Statement', content: safeText(thesis.problemStatement) },
    { id: 'literatureReview', title: 'Literature Review', content: safeText(thesis.literatureReview) },
    { id: 'methodology', title: 'Methodology / Approach', content: safeText(thesis.methodology) },
    { id: 'findings', title: 'Key Findings & Analysis', content: safeText(thesis.findings) },
    { id: 'comparativeInsights', title: 'Comparative Insights', content: safeText(thesis.comparativeInsights) },
    { id: 'limitations', title: 'Limitations', content: safeText(thesis.limitations) },
    { id: 'futureScope', title: 'Future Scope', content: safeText(thesis.futureScope) },
    { id: 'conclusion', title: 'Conclusion', content: safeText(thesis.conclusion) },
  ];

  return (
    <div className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      <div className="mb-8 border-b border-my-border pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-my-accent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-my-muted">Detailed Analysis Report</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl leading-tight text-my-ink max-w-2xl">
            {safeText(thesis.title)}
          </h1>
        </div>

        <div className="flex flex-col gap-2 shrink-0 self-stretch md:self-auto">
          <button
            onClick={handleDownloadPDF}
            disabled={generatingPDF}
            className={clsx(
              "px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2",
              isUnlocked 
                ? "bg-green-600 hover:bg-green-700 text-white hover:scale-105" 
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
              className="w-full px-4 py-3 md:px-6 md:py-4 flex items-center justify-between hover:bg-black/5 transition-colors text-left"
            >
              <h3 className="text-sm font-bold uppercase tracking-widest text-my-ink flex items-center gap-3">
                <span className="text-my-accent opacity-50 font-mono">
                  {expandedSections[section.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                {section.title}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-my-muted uppercase tracking-tighter">Verified</span>
                <CheckCircle2 size={12} className="text-green-500" />
              </div>
            </button>
            {expandedSections[section.id] && (
              <div className="px-4 pb-6 pt-2 md:px-10 md:pb-8 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="prose prose-sm max-w-none text-my-syn leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {deepResearch.scores && (
          <ResearchScoreCard scores={deepResearch.scores} />
        )}
        
        <div className="mt-4 p-4 border border-my-accent/20 bg-my-accent/5 rounded flex items-center gap-4 cursor-pointer hover:bg-my-accent/10 transition-colors" onClick={handleDownloadPDF}>
          <div className="text-2xl">🧠</div>
          <div>
            <span className="font-bold text-[10px] uppercase tracking-widest block text-my-accent mb-1">Export-Only Advanced Analysis Layer Hidden</span>
            <p className="text-[11px] text-my-muted">Deeper synthesis, multi-AI consensus scoring, hidden reasoning layers, and strategic interpretations are preserved exclusively in the printed Premium Analyst Dossier.</p>
          </div>
        </div>
      </div>

      <div className="mt-12 flex justify-center">
        <button 
          onClick={() => walkthroughCompleted && resetDeepResearch()}
          disabled={!walkthroughCompleted}
          className={clsx(
            "px-6 py-3 border text-[11px] font-bold uppercase tracking-widest transition-all",
            walkthroughCompleted 
              ? "border-my-border text-my-muted hover:text-my-ink hover:border-my-accent cursor-pointer" 
              : "border-my-border/30 text-my-muted/30 cursor-not-allowed"
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
