import React, { useState } from 'react';
import { useStore } from '../store';
import { ChevronDown, ChevronRight, CheckCircle2, Shield, Lock } from 'lucide-react';
import ResearchScoreCard from './ResearchScoreCard';
import PremiumExportModal from './PremiumExportModal';

export default function DeepResearchView() {
  const { deepResearch, resetDeepResearch } = useStore();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    abstract: true,
    introduction: true
  });

  if (!deepResearch.thesis) return null;

  const thesis = deepResearch.thesis;

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
      <div className="mb-8 border-b border-my-border pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-my-accent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-my-muted">Detailed Analysis Report</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl leading-tight text-my-ink max-w-2xl">
            {safeText(thesis.title)}
          </h1>
        </div>
        <button 
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-2 border border-my-accent/30 hover:border-my-accent px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-my-accent hover:text-white transition-all bg-my-accent/5 hover:bg-my-accent/20 cursor-pointer shadow-sm rounded-none shrink-0"
        >
          <Lock size={10} className="text-my-accent" />
          Download Full PDF
        </button>
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
      </div>

      <div className="mt-12 flex justify-center">
        <button 
          onClick={resetDeepResearch}
          className="px-6 py-3 border border-my-border text-[11px] font-bold uppercase tracking-widest text-my-muted hover:text-my-ink hover:border-my-accent transition-all"
        >
          Back to Main Dashboard
        </button>
      </div>

      {/* Premium PDF Export Modal Overlay */}
      {isExportModalOpen && (
        <PremiumExportModal 
          onClose={() => setIsExportModalOpen(false)}
          researchData={thesis}
          isDeepResearch={true}
        />
      )}
    </div>
  );
}
