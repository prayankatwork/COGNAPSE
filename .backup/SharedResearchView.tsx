import React, { useState } from 'react';
import ReportView from './ReportView';
import BrandLogo from './BrandLogo';
import { Shield, Clock, User, ArrowRight, Server, Compass, GitFork, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import confetti from 'canvas-confetti';

interface SharedResearchViewProps {
  sharedReport: {
    id: string;
    report_id: string;
    user_id: string;
    query: string;
    data: string;
    visibility: 'private' | 'unlisted' | 'public';
    timestamp: string;
    username?: string;
    report: any;
  };
}

export default function SharedResearchView({ sharedReport }: SharedResearchViewProps) {
  const { report, timestamp, username, visibility } = sharedReport;
  const [forking, setForking] = useState(false);
  const { user } = useStore();

  const handleCreateOwn = () => {
    // Reset query parameters to take user back to regular app landing
    window.location.href = window.location.origin;
  };

  const handleFork = async () => {
    if (!user) {
      useStore.setState({ isAuthOpen: true });
      return;
    }

    setForking(true);
    try {
      const parentAuthor = username || 'Anonymous Curator';
      await useStore.getState().forkReport(report, parentAuthor);
      
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#F27D26', '#2A4365', '#E2E8F0', '#1A1A1A']
      });

      // Exit the shared/read-only router wrapper seamlessly
      window.dispatchEvent(new CustomEvent('exit-share-mode'));
      
    } catch (err: any) {
      console.error("Forking failed:", err);
      alert(err.message || "Failed to fork this research dossier.");
    } finally {
      setForking(false);
    }
  };

  const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  return (
    <div className="min-h-screen bg-my-bg text-my-ink selection:bg-my-accent selection:text-white dark:selection:text-black">
      
      {/* Top Banner Warning / System Protocol */}
      <div className="w-full bg-[#F27D26]/10 border-b border-[#F27D26]/20 py-2 px-4 text-center">
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#F27D26] animate-pulse flex items-center justify-center gap-2">
          <Shield size={10} /> SYSTEM PROTOCOL: SECURE DECRYPTED PUBLIC READ-ONLY INTEL DOSSIER ACTIVE
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        
        {/* Diagnostic Meta Header */}
        <header className="mb-10 p-6 bg-my-sidebar/30 border border-my-border backdrop-blur-md relative overflow-hidden shadow-2xl">
          {/* Subtle tech grid details */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-my-accent/10 to-transparent pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-my-accent/10 border border-my-accent/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-my-accent">
                  DECRYPTED SHARE DOSSIER
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
                <h1 className="text-xl md:text-2xl font-serif font-black text-my-ink leading-tight italic">
                  "{report?.query_understood || sharedReport.query}"
                </h1>
                
                {/* Meta details list */}
                <div className="flex flex-wrap gap-4 mt-3 text-[10px] font-mono text-my-muted uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-my-accent" />
                    <span>Analyst: <strong className="text-my-ink">{username || 'Anonymous Analyst'}</strong></span>
                  </div>
                  <div className="w-px h-3 bg-my-border self-center" />
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-my-accent" />
                    <span>Generated: <strong className="text-my-ink">{formattedDate}</strong></span>
                  </div>
                  <div className="w-px h-3 bg-my-border self-center" />
                  <div className="flex items-center gap-1.5">
                    <Server size={12} className="text-my-accent" />
                    <span>Dossier Key: <strong className="text-my-ink">{sharedReport.id.substring(0, 8).toUpperCase()}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium CTAs: Fork & Create Own */}
            <div className="shrink-0 w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleFork}
                disabled={forking}
                className="w-full lg:w-auto px-6 py-4 bg-my-bg border border-my-accent text-my-accent font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-my-accent hover:text-white dark:hover:text-black hover:scale-[102%] transition-all flex items-center justify-center gap-3 relative group overflow-hidden disabled:opacity-50"
              >
                {forking ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <GitFork size={14} className="group-hover:rotate-12 transition-transform duration-300" />
                )}
                <span>Fork Research Branch</span>
              </button>

              <button
                onClick={handleCreateOwn}
                className="w-full lg:w-auto px-6 py-4 bg-gradient-to-r from-my-accent to-[#F27D26] text-white dark:text-black font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:shadow-[#F27D26]/20 hover:scale-[102%] transition-all flex items-center justify-center gap-3 relative group overflow-hidden border border-transparent"
              >
                <Compass size={14} className="group-hover:rotate-45 transition-transform duration-500" />
                <span>Create Your Own Dossier</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </header>

        {/* The main report render */}
        <main className="w-full">
          <ReportView 
            report={report} 
            onSubSearch={() => {}} 
            onChatFollowUp={() => {}} 
            readOnly={true} 
          />
        </main>

        {/* Footer info branding */}
        <footer className="mt-16 border-t border-my-border/55 pt-8 pb-12 flex flex-col md:flex-row justify-between items-center gap-6">
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
    </div>
  );
}
