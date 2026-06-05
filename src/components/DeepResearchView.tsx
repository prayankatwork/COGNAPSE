import React, { useState } from 'react';
import { useStore } from '../store';
import { ChevronDown, ChevronRight, CheckCircle2, Shield, Lock, Download, Loader2 } from 'lucide-react';
import { toast } from '../utils/toast';
import { stripCitationMarkers } from '../utils/citations';
import ResearchScoreCard from './ResearchScoreCard';
import PremiumExportModal from './PremiumExportModal';
import { generatePremiumPDF } from '../utils/pdfGenerator';
import { Button } from './ui';
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
          <Button
            variant="primary"
            onClick={handleDownloadPDF}
            disabled={generatingPDF}
            className={clsx(
              "px-5 py-2.5 text-[9px] font-black shadow-lg hover:scale-105",
              isUnlocked && "bg-green-600 hover:bg-green-700 text-white dark:text-white"
            )}
            icon={generatingPDF ? <Loader2 size={12} className="animate-spin" /> : isUnlocked ? <Download size={12} /> : <Lock size={12} />}
          >
            {generatingPDF ? "Compiling Dossier..." : isUnlocked ? "Generate Premium Intelligence Report" : "Unlock Full Report"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="border border-my-border bg-my-callout shadow-sm overflow-hidden">
            <Button
              variant="ghost"
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 md:px-6 md:py-4 !justify-between !rounded-none !border-0 text-left"
            >
              <span className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-my-ink">
                <span className="text-my-accent opacity-50 font-mono">
                  {expandedSections[section.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                {section.title}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-my-muted uppercase tracking-tighter">Verified</span>
                <CheckCircle2 size={12} className="ds-text-success" />
              </div>
            </Button>
            {expandedSections[section.id] && (
              <div className="px-4 pb-5 pt-2 md:px-4 md:pb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="text-[14px] leading-[1.7] text-my-syn w-full text-justify hyphens-auto space-y-[1.7em]" lang="en">
                  {(() => {
                    const paragraphs = section.content.replace(/\r/g, '').split(/\n{2,}/).filter(Boolean);
                    return paragraphs.map((para, i) => {
                      const lines = para.split('\n').filter(Boolean);
                      if (lines.length <= 1) {
                        return <p key={i}>{lines.join(' ').trim()}</p>;
                      }
                      // Detect list content: lines starting with -, *, •, or digits+.)
                      const listMarker = /^\s*(?:[-*•]\s|\d+[.)]\s)/;
                      const listLineCount = lines.filter(l => listMarker.test(l)).length;
                      // Require at least half the lines to be list items to avoid false positives
                      const isList = listLineCount / lines.length >= 0.5;
                      if (isList) {
                        const isOrdered = lines.some(l => /^\s*\d+[.)]\s/.test(l));
                        const ListTag = isOrdered ? 'ol' : 'ul';
                        const listClass = isOrdered ? 'list-decimal' : 'list-disc';
                        return (
                          <ListTag key={i} className={`${listClass} pl-5 space-y-1.5`}>
                            {lines.map((line, j) => (
                              <li key={j} className="text-justify">{line.replace(listMarker, '').trim()}</li>
                            ))}
                          </ListTag>
                        );
                      }
                      return <p key={i}>{lines.join(' ').trim()}</p>;
                    });
                  })()}
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
        <Button
          variant="ghost"
          onClick={() => walkthroughCompleted && resetDeepResearch()}
          disabled={!walkthroughCompleted}
          className={clsx(
            "px-6 py-3 text-[11px] rounded-none",
            walkthroughCompleted 
              ? "hover:text-my-ink hover:border-my-accent" 
              : ""
          )}
        >
          {walkthroughCompleted ? "Back to Main Dashboard" : "Lockout Active (Training)"}
        </Button>
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
