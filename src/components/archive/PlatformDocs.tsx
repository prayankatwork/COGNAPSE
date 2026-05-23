import React from 'react';
import { Workflow, Brain, Database, Share, ShieldCheck, Layers, ArrowRight } from 'lucide-react';
import { useStore } from '../../store';

export default function PlatformDocs() {
  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
      
      {/* Overview Section */}
      <section id="overview" className="scroll-mt-32 space-y-8">
        <div>
          <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.4em] text-[10px] mb-4">
            <div className="w-10 h-px bg-my-accent" /> Section_01
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold italic text-my-ink mb-6">Platform Overview</h2>
          <p className="text-xl font-light leading-relaxed text-my-muted max-w-3xl">
            COGNAPSE is an AI-assisted research and documentation platform. It provides automated workflows 
            designed to aggregate, synthesize, and verify information from multiple online sources.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 pt-4">
          <div className="p-8 border border-my-border bg-my-callout/40 backdrop-blur-md rounded-sm hover:border-my-accent/30 transition-colors">
             <Brain className="text-my-accent mb-6" size={24} />
             <h4 className="font-bold uppercase tracking-widest text-xs text-my-ink mb-4">Information Synthesis</h4>
             <p className="text-sm text-my-muted leading-relaxed">
               Standard AI tools often output unverified text. COGNAPSE is structured to reduce inaccuracies by utilizing multi-step research workflows and applying automated, client-side claim verification to generated reports.
             </p>
          </div>
          <div className="p-8 border border-my-border bg-my-callout/40 backdrop-blur-md rounded-sm hover:border-my-accent/30 transition-colors">
             <Layers className="text-my-accent mb-6" size={24} />
             <h4 className="font-bold uppercase tracking-widest text-xs text-my-ink mb-4">Data Management</h4>
             <p className="text-sm text-my-muted leading-relaxed">
               Built with privacy in mind. User-generated reports are stored locally on the device by default using IndexedDB, with optional cloud synchronization.
             </p>
          </div>
        </div>
      </section>

      {/* Product Systems Section */}
      <section id="product-systems" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
        <div>
          <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.4em] text-[10px] mb-4">
            <div className="w-10 h-px bg-my-accent" /> Section_02
          </div>
          <h2 className="text-3xl font-serif font-bold italic text-my-ink mb-6">Product Features</h2>
        </div>

        <div className="space-y-4">
           {/* System Card */}
           <div className="group border border-my-border bg-my-sidebar/10 hover:bg-my-sidebar/30 transition-colors rounded-sm overflow-hidden">
              <div className="p-6 md:p-8 flex items-start gap-6">
                 <div className="w-12 h-12 rounded-full bg-my-accent/10 flex items-center justify-center shrink-0 border border-my-accent/20">
                    <Database size={20} className="text-my-accent" />
                 </div>
                 <div>
                    <h5 className="font-bold text-my-ink mb-2">Deep Research Tool</h5>
                    <p className="text-sm text-my-muted leading-relaxed mb-4">
                      An automated research pipeline that recursively searches sub-topics, evaluates source credibility, and compiles a comprehensive report with inline citations.
                    </p>
                 </div>
              </div>
           </div>

           {/* System Card */}
           <div className="group border border-my-border bg-my-sidebar/10 hover:bg-my-sidebar/30 transition-colors rounded-sm overflow-hidden">
              <div className="p-6 md:p-8 flex items-start gap-6">
                 <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <Share size={20} className="text-emerald-500" />
                 </div>
                 <div>
                    <h5 className="font-bold text-my-ink mb-2">Interactive Knowledge Graphs & Sharing</h5>
                    <p className="text-sm text-my-muted leading-relaxed mb-4">
                      Reports generate an interactive, node-based visual map of key topics. Users can securely share read-only access links to these reports with external collaborators.
                    </p>
                 </div>
              </div>
           </div>

           {/* System Card */}
           <div className="group border border-my-border bg-my-sidebar/10 hover:bg-my-sidebar/30 transition-colors rounded-sm overflow-hidden">
              <div className="p-6 md:p-8 flex items-start gap-6">
                 <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
                    <Workflow size={20} className="text-purple-500" />
                 </div>
                 <div>
                    <h5 className="font-bold text-my-ink mb-2">Premium Subscriptions & Export</h5>
                    <p className="text-sm text-my-muted leading-relaxed mb-4">
                      Users can upgrade to a Monthly or Annual pass to unlock advanced capabilities. Premium features include generating structured PDF dossiers of completed research for offline distribution.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Research Workflow Section */}
      <section id="workflow" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
        <div>
          <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.4em] text-[10px] mb-4">
            <div className="w-10 h-px bg-my-accent" /> Section_03
          </div>
          <h2 className="text-3xl font-serif font-bold italic text-my-ink mb-6">Research Workflow</h2>
          <p className="text-sm text-my-muted mb-8 max-w-2xl">
            The standard process for generating a documented research report using the platform.
          </p>
        </div>

        <div className="relative border-l border-my-accent/30 pl-8 space-y-12">
          
          <div className="relative">
             <div className="absolute -left-[37px] top-1 w-4 h-4 bg-my-bg border-2 border-my-accent rounded-full" />
             <h4 className="text-lg font-bold text-my-ink mb-2">1. Query Submission</h4>
             <p className="text-sm text-my-muted leading-relaxed max-w-xl">
               Users submit a research topic or question. The application formulates an initial research structure based on preliminary search results.
             </p>
          </div>

          <div className="relative">
             <div className="absolute -left-[37px] top-1 w-4 h-4 bg-my-bg border-2 border-my-accent/50 rounded-full" />
             <h4 className="text-lg font-bold text-my-ink mb-2">2. Automated Search Processing</h4>
             <p className="text-sm text-my-muted leading-relaxed max-w-xl">
               The application identifies relevant sub-topics and executes concurrent search queries to gather comprehensive data from multiple sources.
             </p>
          </div>

          <div className="relative">
             <div className="absolute -left-[37px] top-1 w-4 h-4 bg-my-bg border-2 border-my-accent/50 rounded-full" />
             <h4 className="text-lg font-bold text-my-ink mb-2">3. Report Generation</h4>
             <p className="text-sm text-my-muted leading-relaxed max-w-xl">
               The collected data is synthesized into a final report with inline citations. The report is structured for clarity and referenced against the original source material.
             </p>
          </div>

          <div className="relative">
             <div className="absolute -left-[37px] top-1 w-4 h-4 bg-my-bg border-2 border-my-accent/50 rounded-full" />
             <h4 className="text-lg font-bold text-my-ink mb-2">4. Storage & Progression</h4>
             <p className="text-sm text-my-muted leading-relaxed max-w-xl">
               The completed report is saved to local browser storage and synchronized via the cloud if enabled. Users earn progression points for completing research tasks.
             </p>
          </div>

        </div>
      </section>

      {/* Legacy Restart Intro */}
      <section id="onboarding" className="scroll-mt-32 pt-16">
        <div className="p-8 border border-dashed border-my-accent/40 bg-my-accent/5 rounded-sm">
           <h4 className="font-bold text-my-ink mb-2">User Onboarding</h4>
           <p className="text-sm text-my-muted mb-6 max-w-xl">
             You can restart the introductory sequence at any time to familiarize yourself with the application interface.
           </p>
           <button 
             onClick={() => useStore.getState().setWalkthroughCompleted(false)}
             className="px-6 py-3 bg-my-ink text-my-bg dark:bg-my-accent dark:text-black text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:scale-105 transition-all shadow-xl rounded-sm group"
           >
              <Workflow size={14} className="group-hover:rotate-180 transition-transform duration-1000" /> 
              Restart Application Introduction
           </button>
        </div>
      </section>

    </div>
  );
}
