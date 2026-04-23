import React, { useState } from 'react';
import { useStore, DeepResearchThesis } from '../store';
import { ChevronDown, ChevronRight, FileText, Download, CheckCircle2, Shield, Info, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export default function DeepResearchView() {
  const { deepResearch, resetDeepResearch } = useStore();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    abstract: true,
    introduction: true
  });

  if (!deepResearch.thesis) return null;

  const thesis = deepResearch.thesis;

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sections = [
    { id: 'abstract', title: 'Abstract', content: thesis.abstract },
    { id: 'introduction', title: 'Introduction', content: thesis.introduction },
    { id: 'problemStatement', title: 'Problem Statement', content: thesis.problemStatement },
    { id: 'literatureReview', title: 'Literature Review', content: thesis.literatureReview },
    { id: 'methodology', title: 'Methodology / Approach', content: thesis.methodology },
    { id: 'findings', title: 'Key Findings & Analysis', content: thesis.findings },
    { id: 'comparativeInsights', title: 'Comparative Insights', content: thesis.comparativeInsights },
    { id: 'limitations', title: 'Limitations', content: thesis.limitations },
    { id: 'futureScope', title: 'Future Scope', content: thesis.futureScope },
    { id: 'conclusion', title: 'Conclusion', content: thesis.conclusion },
  ];

  return (
    <div className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      <div className="mb-8 border-b border-my-border pb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-my-accent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-my-muted">Autonomous Research Thesis</span>
          </div>
          <h1 className="font-serif text-4xl leading-tight text-my-ink max-w-2xl">
            {thesis.title}
          </h1>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-my-ink text-white text-xs font-bold uppercase tracking-widest hover:bg-my-accent transition-colors"
        >
          <Download size={14} /> Export Thesis
        </button>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="border border-my-border bg-white shadow-sm overflow-hidden">
            <button 
              onClick={() => toggleSection(section.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-black/5 transition-colors text-left"
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
              <div className="px-10 pb-8 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="prose prose-sm max-w-none text-my-syn leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* References Section */}
        <div className="border border-my-border bg-white shadow-sm mt-8">
          <div className="px-6 py-4 border-b border-my-border">
            <h3 className="text-sm font-bold uppercase tracking-widest text-my-ink">References & Citations</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {thesis.references.map((ref, i) => (
              <div key={i} className="flex flex-col p-3 border border-my-border bg-black/5 rounded-[4px]">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-my-accent px-1.5 py-0.5 bg-my-accent/10 rounded">
                    Credibility: {ref.credibility}/10
                  </span>
                  <a href={ref.url} target="_blank" rel="noreferrer" className="text-my-muted hover:text-my-accent transition-colors">
                    <FileText size={14} />
                  </a>
                </div>
                <p className="text-xs font-medium text-my-ink leading-snug">{ref.title}</p>
                <p className="text-[10px] text-my-muted truncate mt-1">{ref.url}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 flex justify-center">
        <button 
          onClick={resetDeepResearch}
          className="px-6 py-3 border border-my-border text-[11px] font-bold uppercase tracking-widest text-my-muted hover:text-my-ink hover:border-my-accent transition-all"
        >
          Return to Standard Interface
        </button>
      </div>
    </div>
  );
}
