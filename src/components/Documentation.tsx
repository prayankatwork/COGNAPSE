import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { 
  Search, Brain, Database, Shield, Zap, 
  BarChart3, Globe2, Cpu, ArrowRight,
  Layers, Network, Sparkles, Activity,
  Lock, MousePointer2, Terminal as TerminalIcon,
  ChevronRight, Fingerprint, Radio,
  MessageSquare, History, Trophy, Gauge,
  Box, Eye, HardDrive, Share, Compass, 
  Workflow, ArrowLeft, BookOpen, Key,
  FileText, Settings, HelpCircle, AlertCircle, Waves, Headphones,
  Users, Info, List
} from 'lucide-react';
import clsx from 'clsx';

const DOC_SECTIONS = [
  {
    id: 'overview',
    title: 'Overview',
    icon: <TerminalIcon size={18} />,
    content: (
      <div className="space-y-8">
        <p className="text-xl font-light leading-relaxed">
          COGNAPSE is a sovereign intelligence terminal designed to extract high-fidelity truth from 
          global knowledge indexes and simulate parallel decision realities.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 border border-my-border bg-my-callout">
             <h4 className="font-bold uppercase tracking-widest text-xs text-my-accent mb-4">Research Core</h4>
             <p className="text-sm opacity-80 leading-relaxed">Deep intelligence synthesis and evidence-based investigation of any complex topic.</p>
          </div>
          <div className="p-6 border border-my-border bg-my-callout">
             <h4 className="font-bold uppercase tracking-widest text-xs text-my-accent mb-4">Decision Matrix</h4>
             <p className="text-sm opacity-80 leading-relaxed">Multiverse simulation engine for exploring second-order consequences of life choices.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'core-concepts',
    title: 'Core Concepts',
    icon: <Brain size={18} />,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-light">The foundational pillars of the COGNAPSE architecture.</p>
        <div className="space-y-6">
           <div className="p-6 border-l-2 border-my-accent bg-my-callout/50">
              <h5 className="font-bold uppercase tracking-widest mb-2">Synthetic Intelligence</h5>
              <p className="text-sm opacity-70 italic">Beyond search engines. We use multi-agent analysis logic to cross-reference conflicting data points and synthesize objective insights.</p>
           </div>
           <div className="p-6 border-l-2 border-my-accent bg-my-callout/50">
              <h5 className="font-bold uppercase tracking-widest mb-2">Detailed Investigation</h5>
              <p className="text-sm opacity-70 italic">Every claim is backed by a source. The Research Archive allows you to audit the "why" behind every system output.</p>
           </div>
        </div>
      </div>
    )
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Zap size={18} />,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-light leading-relaxed">Set up your analyst profile and begin your first research project.</p>
        <div className="space-y-4">
           <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-my-accent text-white flex items-center justify-center shrink-0 text-xs font-bold">1</div>
              <p className="text-sm opacity-80 leading-relaxed pt-1">Register your username and password to enable the **Research Archive**.</p>
           </div>
           <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-my-ink text-white flex items-center justify-center shrink-0 text-xs font-bold">2</div>
              <p className="text-sm opacity-80 leading-relaxed pt-1">Select your **Workspace** (Research or Decision) from the main application hub.</p>
           </div>
           <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-my-muted text-white flex items-center justify-center shrink-0 text-xs font-bold">3</div>
              <p className="text-sm opacity-80 leading-relaxed pt-1">Submit your first query. The analysis engine will adapt to your research style.</p>
           </div>
        </div>

        <div className="pt-8 border-t border-my-border">
           <button 
             onClick={() => useStore.getState().setWalkthroughCompleted(false)}
             className="px-8 py-4 bg-my-ink text-my-bg dark:bg-my-accent dark:text-black text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-4 hover:scale-105 transition-all shadow-xl rounded-sm group"
           >
              <Workflow size={14} className="group-hover:rotate-180 transition-transform duration-1000" /> Restart System Introduction
           </button>
           <p className="mt-4 text-[9px] text-my-muted italic opacity-60">
             Note: Restarting will trigger the initial onboarding flow. Your established settings will be preserved but the introductory sequence will reset.
           </p>
        </div>
      </div>
    )
  },
  {
    id: 'research-guide',
    title: 'Research Guide',
    icon: <Search size={18} />,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-light leading-relaxed">Optimizing the Research Core for deep synthesis.</p>
        <div className="p-8 bg-my-callout text-my-ink space-y-6">
           <h4 className="text-2xl font-serif italic border-b border-my-border pb-4">Query Optimization</h4>
           <p className="text-sm opacity-80 italic mb-4">Be specific. Instead of "Artificial Intelligence," try "The impact of LMMs on academic research integrity 2024-2025."</p>
           <ul className="grid md:grid-cols-2 gap-4 text-sm opacity-80">
              <li className="flex items-center gap-2"><ArrowRight size={14} className="text-my-accent" /> Semantic Node Graphing</li>
              <li className="flex items-center gap-2"><ArrowRight size={14} className="text-my-accent" /> Deep Research Thesis (5-Stage)</li>
              <li className="flex items-center gap-2"><ArrowRight size={14} className="text-my-accent" /> Source Credibility Scoring</li>
              <li className="flex items-center gap-2"><ArrowRight size={14} className="text-my-accent" /> Logical Conflict Detection</li>
           </ul>
        </div>
      </div>
    )
  },
  {
    id: 'decision-guide',
    title: 'Decision Guide',
    icon: <Network size={18} />,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-light leading-relaxed">Navigating the Multiverse with the Decision Matrix.</p>
        <div className="p-8 bg-my-callout text-my-ink space-y-6">
           <h4 className="text-2xl font-serif italic border-b border-my-border pb-4">Personal Context Engine</h4>
           <p className="text-sm opacity-80 leading-relaxed mb-4">Use the **Identity Profile** to ground simulations in your personality (Big Five traits) and specific life constraints for 100% personalized pathways.</p>
           <div className="grid md:grid-cols-2 gap-4 text-sm opacity-80">
              <div className="p-4 border border-my-border">
                 <h5 className="font-bold mb-2">Timeline Fracturing</h5>
                 <p className="text-xs opacity-70">Splits choices into Optimistic, Realistic, and Pessimistic outcomes.</p>
              </div>
              <div className="p-4 border border-my-border">
                 <h5 className="font-bold mb-2">Second-Order Logic</h5>
                 <p className="text-xs opacity-70">Simulate further into the future to see long-term compounding effects.</p>
              </div>
           </div>
        </div>
      </div>
    )
  },
  {
    id: 'ai-system',
    title: 'AI System',
    icon: <Cpu size={18} />,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-light leading-relaxed">The architecture behind the intelligence.</p>
        <div className="space-y-6">
           <div className="flex gap-4 p-6 border border-my-border bg-my-sidebar/20">
              <Zap className="text-my-accent shrink-0" size={24} />
              <div>
                 <h5 className="font-bold uppercase tracking-widest text-xs mb-2">Cloud-Hybrid Engine</h5>
                 <p className="text-sm opacity-70">Utilizes Groq LPU™ for millisecond-latency synthesis and Gemini 1.5 Pro for deep multi-modal reasoning and massive context handling.</p>
              </div>
           </div>
           <div className="flex gap-4 p-6 border border-my-border bg-my-sidebar/20">
              <Activity className="text-blue-500 shrink-0" size={24} />
              <div>
                 <h5 className="font-bold uppercase tracking-widest text-xs mb-2">Swarm Calibration</h5>
                 <p className="text-sm opacity-70">Parallel processing of multiple LLM nodes to ensure no single bias dominates the final intelligence output.</p>
              </div>
           </div>
        </div>
      </div>
    )
  },
  {
    id: 'use-cases',
    title: 'Use Cases',
    icon: <Globe2 size={18} />,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-light">Practical applications for high-stakes intelligence.</p>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
           <div className="p-6 border border-my-border">
              <h5 className="font-bold mb-2">Competitive Intelligence</h5>
              <p className="opacity-70">Mapping market movements and competitor pivots before they go public.</p>
           </div>
           <div className="p-6 border border-my-border">
              <h5 className="font-bold mb-2">Career Pivot Simulation</h5>
              <p className="opacity-70">Testing the second-order financial and emotional impact of changing industries.</p>
           </div>
           <div className="p-6 border border-my-border">
              <h5 className="font-bold mb-2">Crisis Response</h5>
              <p className="opacity-70">Rapid synthesis of evolving events during information blackouts.</p>
           </div>
           <div className="p-6 border border-my-border">
              <h5 className="font-bold mb-2">Academic Synthesis</h5>
              <p className="opacity-70">Generating comprehensive literature reviews and problem statements for research papers.</p>
           </div>
        </div>
      </div>
    )
  },
  {
    id: 'data-privacy',
    title: 'Data & Privacy',
    icon: <Shield size={18} />,
    content: (
      <div className="space-y-8">
        <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
           <Lock size={20} />
           <span className="font-bold uppercase tracking-widest text-xs">Security Protocol: Active</span>
        </div>
        <p className="text-lg leading-relaxed">Your research history belongs only to you.</p>
        <div className="space-y-4">
           <div className="p-6 border border-my-border bg-my-callout">
              <h5 className="font-bold mb-2 flex items-center gap-2 text-xs uppercase tracking-widest"><Fingerprint size={16} className="text-my-accent" /> Analyst Isolation</h5>
              <p className="text-sm opacity-70 leading-relaxed">Data is partitioned using secure architecture. Your username ensures that your private archive cannot be accessed by other system users.</p>
           </div>
           <div className="p-6 border border-my-border bg-my-callout">
              <h5 className="font-bold mb-2 flex items-center gap-2 text-xs uppercase tracking-widest"><Database size={16} className="text-my-accent" /> Encrypted Archive</h5>
              <p className="text-sm opacity-70 leading-relaxed">All research reports and simulations are encrypted at rest. We do not use your personal data to train global AI models.</p>
           </div>
        </div>
      </div>
    )
  }
];

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="min-h-screen text-my-ink selection:bg-my-accent selection:text-white flex flex-col">

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-80 border-r border-my-border overflow-y-auto no-scrollbar p-8 hidden md:block bg-my-sidebar/20">
           <div className="space-y-2">
              {DOC_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={clsx(
                    "w-full text-left px-5 py-4 flex items-center gap-4 transition-all group",
                    activeSection === section.id 
                      ? "bg-my-ink text-my-bg dark:bg-my-accent dark:text-black shadow-xl translate-x-2" 
                      : "hover:bg-my-sidebar/50 text-my-muted"
                  )}
                >
                  <span className={clsx("transition-transform group-hover:scale-110", activeSection === section.id ? "text-my-accent" : "opacity-50")}>
                     {section.icon}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-widest">{section.title}</span>
                </button>
              ))}
           </div>

           <div className="mt-12 p-6 border border-dashed border-my-border bg-my-callout/30">
              <div className="flex items-center gap-2 mb-2 text-my-accent">
                 <AlertCircle size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Analyst Note</span>
              </div>
              <p className="text-[10px] text-my-ink italic font-semibold leading-relaxed">
                 Use the search function in the Archive to query your archived reports once indexes are enabled.
              </p>
           </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-10 md:p-20 relative scroll-smooth">
           {/* Background Grid */}
           <div className="absolute inset-0 opacity-[0.02] pointer-events-none -z-10" 
                style={{ backgroundImage: 'radial-gradient(var(--ink) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

           <AnimatePresence mode="wait">
             <motion.div
               key={activeSection}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               transition={{ duration: 0.4 }}
               className="max-w-3xl"
             >
                <div className="mb-14">
                   <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.4em] text-[10px] mb-4">
                      <div className="w-10 h-px bg-my-accent" /> Section_{activeSection.toUpperCase()}
                   </div>
                   <h2 className="text-6xl font-serif font-bold italic text-my-ink">{DOC_SECTIONS.find(s => s.id === activeSection)?.title}</h2>
                </div>

                <div className="prose dark:prose-invert max-w-none text-my-ink">
                   {DOC_SECTIONS.find(s => s.id === activeSection)?.content}
                </div>

                <div className="mt-40 pt-10 border-t border-my-border flex items-center justify-between text-[10px] font-bold text-my-muted uppercase tracking-widest">
                   <span>COGNAPSE v2.5 // ARCHITECT_LEVEL_CLEARANCE</span>
                   <div className="flex gap-4">
                      <button className="hover:text-my-accent transition-colors">Privacy Protocol</button>
                      <button className="hover:text-my-accent transition-colors">Privacy Policy</button>
                   </div>
                </div>
             </motion.div>
           </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
