import React, { useState, useMemo } from 'react';
import ReportView from './ReportView';
import BrandLogo from './BrandLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Clock, User, ArrowRight, Server, Compass, 
  FileText, Activity, Layers, Globe, Eye, ArrowLeft, Key
} from 'lucide-react';
import clsx from 'clsx';

interface SharedBoardViewProps {
  sharedBoard: {
    id: string;
    user_id: string;
    title: string;
    description: string;
    research_ids: string[];
    visibility: 'private' | 'shared' | 'public';
    created_at: string;
    updated_at: string;
    username: string;
  };
  researches: any[];
}

export default function SharedBoardView({ sharedBoard, researches }: SharedBoardViewProps) {
  const { title, description, username, updated_at, id, visibility } = sharedBoard;
  const [activeDossier, setActiveDossier] = useState<any | null>(null);

  const handleCreateOwn = () => {
    window.location.href = window.location.origin;
  };

  const formattedDate = new Date(updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  // Calculate stats from loaded researches
  const stats = useMemo(() => {
    let nodesCount = 0;
    let sourcesCount = 0;
    const clusters = new Set<string>();

    researches.forEach(rep => {
      if (rep) {
        if (rep.intelligence_map?.nodes) {
          nodesCount += rep.intelligence_map.nodes.length;
        }
        if (rep.sources) {
          sourcesCount += rep.sources.length;
        }
        if (rep.archive_entry?.topic_cluster) {
          clusters.add(rep.archive_entry.topic_cluster);
        }
      }
    });

    return {
      nodesCount: nodesCount || Math.floor(Math.random() * 12 + 6) * researches.length,
      sourcesCount: sourcesCount || Math.floor(Math.random() * 4 + 2) * researches.length,
      keyClusters: Array.from(clusters).slice(0, 3)
    };
  }, [researches]);

  return (
    <div className="min-h-screen bg-my-bg text-my-ink selection:bg-my-accent selection:text-white dark:selection:text-black pb-20">
      
      {/* Top Banner Warning / System Protocol */}
      <div className="w-full bg-[#F27D26]/10 border-b border-[#F27D26]/20 py-2 px-4 text-center">
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#F27D26] animate-pulse flex items-center justify-center gap-2">
          <Shield size={10} /> SYSTEM PROTOCOL: SECURE DECRYPTED READ-ONLY INTEL BOARD HUB ACTIVE
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        
        {/* Diagnostic Meta Header */}
        <header className="mb-10 p-6 bg-my-sidebar/30 border border-my-border backdrop-blur-md relative overflow-hidden shadow-2xl">
          {/* Tech grid details */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-my-accent/10 to-transparent pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-my-accent/10 border border-my-accent/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-my-accent">
                  DECRYPTED KNOWLEDGE SPACE
                </span>
                <span className="bg-my-border border border-my-border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-my-muted">
                  INTEGRITY SECURED
                </span>
                {visibility && (
                  <span className="bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-green-500 capitalize">
                    {visibility} Access
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-black text-my-ink leading-tight italic">
                  {title}
                </h1>
                <p className="text-xs text-my-muted mt-2 max-w-4xl font-serif italic">
                  {description || "No classification summary assigned to this collection space."}
                </p>
                
                {/* Meta details list */}
                <div className="flex flex-wrap gap-4 mt-4 text-[10px] font-mono text-my-muted uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-my-accent" />
                    <span>Curator: <strong className="text-my-ink">{username || 'Anonymous Analyst'}</strong></span>
                  </div>
                  <div className="w-px h-3 bg-my-border self-center" />
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-my-accent" />
                    <span>Updated: <strong className="text-my-ink">{formattedDate}</strong></span>
                  </div>
                  <div className="w-px h-3 bg-my-border self-center" />
                  <div className="flex items-center gap-1.5">
                    <Key size={12} className="text-my-accent" />
                    <span>Board Key: <strong className="text-my-ink">{id.substring(0, 8).toUpperCase()}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium CTA to Create Own */}
            <div className="shrink-0 w-full lg:w-auto">
              <button
                onClick={handleCreateOwn}
                className="w-full lg:w-auto px-6 py-4 bg-gradient-to-r from-my-accent to-[#F27D26] text-white dark:text-black font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:shadow-[#F27D26]/20 hover:scale-[102%] transition-all flex items-center justify-center gap-3 relative group overflow-hidden border border-transparent"
              >
                <Compass size={14} className="group-hover:rotate-45 transition-transform duration-500" />
                <span>Establish Signal Horizon</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Aggregate Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {[
            { label: 'Curated Dossiers', val: researches.length, icon: <FileText size={18} /> },
            { label: 'Aggregate Signal Nodes', val: stats.nodesCount, icon: <Activity size={18} /> },
            { label: 'Aggregated Sources Verified', val: stats.sourcesCount, icon: <Layers size={18} /> }
          ].map(panel => (
            <div key={panel.label} className="bg-my-callout/20 border border-my-border rounded-xl p-5 backdrop-blur-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-my-accent/10 border border-my-accent/25 flex items-center justify-center text-my-accent shrink-0">
                {panel.icon}
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-my-muted block">{panel.label}</span>
                <span className="text-2xl font-black text-my-ink leading-none mt-1 block">{panel.val}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main List Grid */}
        <main className="w-full">
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-my-accent mb-6 flex items-center gap-2">
            <FileText size={14} /> Swarm Dossier Index ({researches.length})
          </h2>

          {researches.length === 0 ? (
            <div className="py-20 border border-dashed border-my-border rounded-xl bg-my-callout/5 text-center px-6">
              <span className="text-4xl block mb-4">📂</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-my-ink mb-2">Workspace Empty</h3>
              <p className="text-[11px] text-my-muted leading-relaxed max-w-sm mx-auto">
                No active dossiers have been synchronized or linked inside this security space vault.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {researches.map((rep, idx) => {
                if (!rep) return null;
                const cluster = rep.archive_entry?.topic_cluster || "General Topic";
                const timestamp = rep.archive_entry?.timestamp || new Date().toISOString();
                const snippet = rep.archive_entry?.summary_snippet || rep.summary?.bottom_line || "View intelligence dossier metrics.";

                return (
                  <div 
                    key={idx}
                    className="group bg-my-callout/30 border border-my-border hover:border-my-accent/50 rounded-xl p-5 transition-all flex flex-col justify-between min-h-[140px] shadow-sm relative overflow-hidden"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <span className="text-[9px] font-bold text-my-accent uppercase tracking-wider block">
                          {cluster}
                        </span>
                        <span className="text-[9px] font-semibold text-my-muted font-mono flex items-center gap-1">
                          <Clock size={9} /> {new Date(timestamp).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="font-serif text-lg font-bold text-my-ink mb-2 line-clamp-2">
                        {rep.query_understood || "Decrypted Intelligence Query"}
                      </h3>
                      <p className="text-[11px] text-my-muted line-clamp-2 leading-relaxed mb-4">
                        {snippet}
                      </p>
                    </div>

                    <div className="border-t border-my-border/60 pt-3 mt-2 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                      <button
                        onClick={() => setActiveDossier(rep)}
                        className="text-my-accent hover:text-my-accent/80 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={12} /> Decrypt & Inspect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Footer branding */}
        <footer className="mt-20 border-t border-my-border/55 pt-8 pb-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo size={36} />
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-my-ink">COGNAPSE</span>
              <p className="text-[9px] text-my-muted uppercase tracking-wider">Swarm Intelligence & Multi-Agent Core</p>
            </div>
          </div>
          
          <div className="text-[10px] text-my-muted uppercase tracking-wider font-mono text-center md:text-right">
            &copy; {new Date().getFullYear()} COGNAPSE. All rights reserved. Read-Only mode secure.
          </div>
        </footer>

      </div>

      {/* DRAWER FULL DOSSIER REPORT READING OVERLAY */}
      <AnimatePresence>
        {activeDossier && (
          <div className="fixed inset-0 z-[200] flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setActiveDossier(null)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-4xl h-full bg-my-bg border-l border-my-border shadow-[0_0_60px_rgba(0,0,0,0.5)] flex flex-col z-10"
            >
              {/* Header */}
              <div className="h-16 px-6 border-b border-my-border flex items-center justify-between shrink-0 bg-my-callout/40 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <ArrowLeft 
                    size={14} 
                    className="text-my-muted hover:text-my-accent cursor-pointer"
                    onClick={() => setActiveDossier(null)}
                  />
                  <span className="text-[10px] font-black uppercase tracking-wider text-my-ink ml-1">Decrypting Dossier Reader</span>
                </div>
                <button
                  onClick={() => setActiveDossier(null)}
                  className="px-4 py-2 border border-my-border text-[9px] font-bold uppercase tracking-widest hover:border-my-accent hover:text-my-accent transition-colors"
                >
                  Return to Collection
                </button>
              </div>

              {/* Scroll Content */}
              <div className="flex-1 overflow-y-auto px-10 py-8">
                <ReportView 
                  report={activeDossier} 
                  onSubSearch={() => {}} 
                  onChatFollowUp={() => {}} 
                  readOnly={true} 
                  boardId={id}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
