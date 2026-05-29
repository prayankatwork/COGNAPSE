import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Terminal, Shield, Globe2, Code2,
  Scale, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import PlatformDocs from './archive/PlatformDocs';
import TechnicalDocs from './archive/TechnicalDocs';
import LegalDocs from './archive/LegalDocs';
import TrustDocs from './archive/TrustDocs';

type SectionKey = 'platform' | 'technical' | 'trust' | 'legal';

const ARCHIVE_MAP = [
  {
    key: 'platform' as SectionKey,
    title: 'Platform Infrastructure',
    icon: <Terminal size={16} />,
    component: <PlatformDocs />,
    subsections: [
      { id: 'overview', label: 'Overview' },
      { id: 'product-systems', label: 'Product Systems' },
      { id: 'workflow', label: 'Research Workflow' },
      { id: 'onboarding', label: 'Analyst Onboarding' },
      { id: 'collaboration', label: 'Collaboration & Governance' },
      { id: 'enterprise-governance', label: 'Enterprise Governance' },
      { id: 'responsible-ai', label: 'Responsible AI Usage' },
    ]
  },
  {
    key: 'technical' as SectionKey,
    title: 'Technical Architecture',
    icon: <Code2 size={16} />,
    component: <TechnicalDocs />,
    subsections: [
      { id: 'tech-overview', label: 'Stack Overview' },
      { id: 'stack', label: 'Infrastructure Diagram' },
      { id: 'research-pipeline-diagram', label: 'Research Pipeline Diagram' },
      { id: 'orchestration', label: 'AI Swarm Logic' },
      { id: 'deep-research', label: 'Deep Research Protocol' },
      { id: 'state', label: 'State Mgmt & Data' },
      { id: 'security-architecture', label: 'Security Architecture' },
      { id: 'observability', label: 'Observability & Telemetry' },
    ]
  },
  {
    key: 'trust' as SectionKey,
    title: 'Trust & Security',
    icon: <Shield size={16} />,
    component: <TrustDocs />,
    subsections: [
      { id: 'trust-overview', label: 'Security Center' },
      { id: 'security-model', label: 'Identity Management' },
      { id: 'data-isolation', label: 'Data Privacy & Storage' },
      { id: 'ai-transparency', label: 'AI Transparency' },
      { id: 'responsible-ai', label: 'Responsible AI' },
      { id: 'collaboration-safety', label: 'Collaboration Safety' },
      { id: 'premium-security', label: 'Premium Security' },
      { id: 'incident-response', label: 'Incident Response' },
      { id: 'reliability', label: 'Infrastructure Uptime' },
      { id: 'observability', label: 'Observability' },
    ]
  },
  {
    key: 'legal' as SectionKey,
    title: 'Legal & Compliance',
    icon: <Scale size={16} />,
    component: <LegalDocs />,
    subsections: [
      { id: 'legal-overview', label: 'Compliance Overview' },
      { id: 'terms', label: 'Terms of Service' },
      { id: 'privacy', label: 'Privacy Policy' },
      { id: 'cookie-policy', label: 'Cookie Policy' },
      { id: 'ai-disclaimer', label: 'AI Liability Disclaimer' },
      { id: 'ip-rights', label: 'IP & Copyright' },
      { id: 'collaboration', label: 'Collaboration Governance' },
      { id: 'export-policy', label: 'Export & Redistribution' },
      { id: 'governing-law', label: 'Governing Law' },
    ]
  }
];

export default function Documentation() {
  const [activeTab, setActiveTab] = useState<SectionKey>('platform');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArchiveMap = useMemo(() => {
    if (!searchQuery.trim()) return ARCHIVE_MAP;
    const lowerQuery = searchQuery.toLowerCase();

    return ARCHIVE_MAP.map(section => {
      // Check if the section title matches
      const sectionMatches = section.title.toLowerCase().includes(lowerQuery);

      // Filter subsections
      const matchingSubsections = section.subsections.filter(sub =>
        sub.label.toLowerCase().includes(lowerQuery)
      );

      if (sectionMatches) {
        // If the main section matches, show it with all its original subsections
        return section;
      } else if (matchingSubsections.length > 0) {
        // If only subsections match, show the section but only with matching subsections
        return { ...section, subsections: matchingSubsections };
      }
      return null;
    }).filter(Boolean) as typeof ARCHIVE_MAP;
  }, [searchQuery]);

  // Handle incoming deep links on mount and hash changes
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'privacy' || hash === 'terms' || hash === 'ai-disclaimer' || hash === 'legal-overview') {
        setActiveTab('legal');
        // Small delay to allow render before scrolling
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    handleHash(); // Run on mount
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Smooth scroll to subsection
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const activeContent = ARCHIVE_MAP.find(s => s.key === activeTab)?.component;

  return (
    <div className="min-h-screen bg-my-bg text-my-ink selection:bg-my-accent selection:text-black flex flex-col font-sans">

      {/* Top Banner */}
      <header className="h-16 border-b border-my-border flex items-center justify-between px-8 bg-my-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Globe2 className="text-my-accent" size={20} />
          <span className="font-serif font-bold text-lg tracking-widest text-my-ink italic uppercase">
            Cognapse <span className="text-my-muted font-sans font-normal text-sm not-italic ml-2">/ Documentation Center</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-4 border border-my-border bg-my-callout/50 px-4 py-2 w-96 rounded-sm">
          <Search size={16} className="text-my-muted" />
          <input
            type="text"
            placeholder="Search documentation..."
            className="bg-transparent outline-none text-xs w-full font-mono placeholder:text-my-muted/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="text-[10px] font-bold text-my-muted border border-my-border px-1.5 py-0.5 rounded-sm"></div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* Nested Sidebar */}
        <aside className="w-80 border-r border-my-border overflow-y-auto custom-scrollbar p-6 hidden lg:block bg-my-sidebar/10">
          <div className="space-y-8">
            {filteredArchiveMap.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-my-border">
                <Search className="mx-auto text-my-muted mb-2" size={24} />
                <p className="text-xs text-my-muted uppercase tracking-widest font-bold">No results found</p>
              </div>
            ) : (
              filteredArchiveMap.map((section) => (
                <div key={section.key} className="space-y-3">
                  {/* Parent Category */}
                  <button
                    onClick={() => setActiveTab(section.key)}
                    className={clsx(
                      "w-full text-left flex items-center gap-3 transition-colors group",
                      (activeTab === section.key || searchQuery) ? "text-my-ink" : "text-my-muted hover:text-my-ink"
                    )}
                  >
                    <span className={clsx("transition-transform", (activeTab === section.key || searchQuery) ? "text-my-accent" : "opacity-50")}>
                      {section.icon}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest">{section.title}</span>
                  </button>

                  {/* Subsections (Nested) */}
                  <AnimatePresence>
                    {(activeTab === section.key || searchQuery.length > 0) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="pl-7 space-y-2 overflow-hidden border-l border-my-border ml-2"
                      >
                        {section.subsections.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => scrollTo(sub.id)}
                            className="block text-left text-[11px] text-my-muted hover:text-my-accent transition-colors py-1 hover:translate-x-1 duration-300"
                          >
                            {sub.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>

          <div className="mt-16 pt-8 border-t border-my-border">
            <div className="p-5 border border-dashed border-my-accent/30 bg-my-accent/5 rounded-sm">
              <div className="flex items-center gap-2 mb-2 text-my-accent">
                <AlertCircle size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Documentation Status</span>
              </div>
              <p className="text-[10px] text-my-muted leading-relaxed">
                This documentation is actively maintained and updated by the COGNAPSE team.
              </p>
            </div>
          </div>
        </aside>

        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-y-auto p-10 md:p-20 relative scroll-smooth custom-scrollbar bg-my-bg">

          {/* Cinematic Background */}
          <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-my-accent/5 to-transparent pointer-events-none -z-10" />
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none -z-10"
            style={{ backgroundImage: 'radial-gradient(var(--ink) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {activeContent}
              </motion.div>
            </AnimatePresence>

            {/* Footer */}
            <footer className="mt-40 pt-10 pb-20 border-t border-my-border flex flex-col md:flex-row items-center justify-between text-[10px] font-bold text-my-muted uppercase tracking-widest gap-6">
              <span>COGNAPSE // DOCUMENTATION CENTER</span>
              <div className="flex items-center gap-6">
                <button onClick={() => setActiveTab('legal')} className="hover:text-my-accent transition-colors">Privacy Policy</button>
                <button onClick={() => setActiveTab('legal')} className="hover:text-my-accent transition-colors">Terms of Service</button>
                <button onClick={() => setActiveTab('trust')} className="hover:text-my-accent transition-colors">Security Center</button>
              </div>
            </footer>
          </div>

        </main>
      </div>
    </div>
  );
}
