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
  FileText, Settings, HelpCircle, AlertCircle, Waves
} from 'lucide-react';
import clsx from 'clsx';

const DOC_SECTIONS = [
  {
    id: 'overview',
    title: 'System Overview',
    icon: <TerminalIcon size={20} />,
    content: (
      <div className="space-y-8">
        <p className="text-xl font-light leading-relaxed">
          COGNAPSE (Cognitive Network Analysis & Processing Synthesis Engine) is a 
          sovereign intelligence terminal designed to extract high-fidelity truth from 
          global knowledge indexes using Cloud-Hybrid Synthetic Intelligence.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 border border-my-border bg-my-callout">
             <h4 className="font-bold uppercase tracking-widest text-xs text-my-accent mb-4">Core Philosophy</h4>
             <p className="text-sm opacity-80 leading-relaxed">COGNAPSE operates on the principle of "Total Awareness" through semantic clustering, eliminating the bias of centralized search algorithms.</p>
          </div>
          <div className="p-6 border border-my-border bg-my-callout">
             <h4 className="font-bold uppercase tracking-widest text-xs text-my-accent mb-4">Zero-Friction Execution</h4>
             <p className="text-sm opacity-80 leading-relaxed">Intelligence is served via ultra-fast Groq LPU™ nodes. By utilizing Cloud-Hybrid synthesis, the system delivers 70B-parameter reasoning with zero local setup.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'neural-flow',
    title: 'The Neural Flow',
    icon: <Workflow size={20} />,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-light italic">The three-stage intelligence lifecycle of COGNAPSE.</p>
        <div className="space-y-6">
           <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-my-accent text-white flex items-center justify-center shrink-0 font-bold">01</div>
              <div>
                 <h5 className="font-bold uppercase tracking-widest mb-1">Capture Phase</h5>
                 <p className="text-sm opacity-70">User input is deconstructed into a multi-dimensional search vector. This involves identifying entities, temporal markers, and geographic relevance.</p>
              </div>
           </div>
           <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 font-bold">02</div>
              <div>
                 <h5 className="font-bold uppercase tracking-widest mb-1">Synthesis Phase</h5>
                 <p className="text-sm opacity-70">The system executes parallel crawls of global indexes. High-performance cloud models then cross-reference findings to eliminate noise and detect contradictions.</p>
              </div>
           </div>
           <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold">03</div>
              <div>
                 <h5 className="font-bold uppercase tracking-widest mb-1">Awareness Phase</h5>
                 <p className="text-sm opacity-70">Results are mapped into a semantic node-graph. This allows for non-linear exploration of the topic, revealing hidden connections between entities.</p>
              </div>
           </div>
        </div>
      </div>
    )
  },
  {
    id: 'deep-research',
    title: 'Deep Research Protocol',
    icon: <Cpu size={20} />,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-light leading-relaxed">When standard research isn't enough, the Deep Research Protocol generates academic-grade intelligence theses.</p>
        <div className="p-8 bg-my-callout text-my-ink space-y-6">
           <h4 className="text-2xl font-serif italic border-b border-my-border pb-4">Protocol Requirements</h4>
           <ul className="grid md:grid-cols-2 gap-4 text-sm opacity-80">
              <li className="flex items-center gap-2"><Zap size={14} className="text-my-accent" /> 5-Stage Synthesis Engine</li>
              <li className="flex items-center gap-2"><Zap size={14} className="text-my-accent" /> Comparative Entity Insights</li>
              <li className="flex items-center gap-2"><Zap size={14} className="text-my-accent" /> Full Literature Review</li>
              <li className="flex items-center gap-2"><Zap size={14} className="text-my-accent" /> Problem Statement Isolation</li>
           </ul>
        </div>
        <div className="p-6 border border-dashed border-my-accent/30 text-center">
           <p className="text-sm italic opacity-60">Deep Research is powered by Llama 3.3 70B, providing academic-grade coherence through high-performance cloud compute.</p>
        </div>
      </div>
    )
  },
  {
    id: 'gamification',
    title: 'Operator Status',
    icon: <Trophy size={20} />,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-light">As you expand your awareness, you unlock higher tiers of investigative clearance.</p>
        <table className="w-full text-left border-collapse">
           <thead>
              <tr className="border-b border-my-border">
                 <th className="py-4 font-bold uppercase tracking-widest text-[10px]">Rank</th>
                 <th className="py-4 font-bold uppercase tracking-widest text-[10px]">Requirement</th>
                 <th className="py-4 font-bold uppercase tracking-widest text-[10px]">Clearance</th>
              </tr>
           </thead>
           <tbody className="text-sm opacity-80">
              <tr className="border-b border-my-border/50">
                 <td className="py-4">Novice</td>
                 <td className="py-4">0 XP</td>
                 <td className="py-4">Standard Search</td>
              </tr>
              <tr className="border-b border-my-border/50">
                 <td className="py-4 text-my-accent">Analyst</td>
                 <td className="py-4">350 XP</td>
                 <td className="py-4">Full Semantic Mapping</td>
              </tr>
              <tr className="border-b border-my-border/50">
                 <td className="py-4">Researcher</td>
                 <td className="py-4">700 XP</td>
                 <td className="py-4">Deep Thesis Protocol</td>
              </tr>
              <tr>
                 <td className="py-4 font-bold">Mastermind</td>
                 <td className="py-4">1200+ XP</td>
                 <td className="py-4">Total System Access</td>
              </tr>
           </tbody>
        </table>
      </div>
    )
  },
  {
    id: 'privacy',
    title: 'Sovereign Intel',
    icon: <Shield size={20} />,
    content: (
      <div className="space-y-8">
        <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
           <Lock size={20} />
           <span className="font-bold uppercase tracking-widest text-xs">Security Status: Encrypted Cloud-Hybrid</span>
        </div>
        <p className="text-lg leading-relaxed">COGNAPSE is built for operators who cannot afford data leaks.</p>
        <div className="space-y-4">
           <div className="p-6 border border-my-border">
              <h5 className="font-bold mb-2 flex items-center gap-2"><Fingerprint size={16} /> Operative Registry</h5>
              <p className="text-sm opacity-70">COGNAPSE uses an Operative Registry for data isolation. By registering a codename and security key, your research dossiers, training scores, and telemetry are uniquely mapped to your identity in the Intelligence Vault.</p>
           </div>
           <div className="p-6 border border-my-border">
              <h5 className="font-bold mb-2 flex items-center gap-2"><Database size={16} /> The Cloud Intelligence Vault</h5>
              <p className="text-sm opacity-70">Your data is stored in a secure, encrypted Firebase vault. This ensures that your investigative history is persistent, globally accessible, and logically partitioned from other operatives.</p>
           </div>
        </div>
      </div>
    )
  },
  {
    id: 'playground',
    title: 'Neural Calibration',
    icon: <Box size={20} />,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-light leading-relaxed">The Playground is a high-fidelity environment designed to refine the cognitive reflexes required for advanced intelligence processing.</p>
        <div className="grid md:grid-cols-2 gap-6">
           <div className="p-6 border border-my-border bg-my-callout">
              <h4 className="font-bold uppercase tracking-widest text-xs text-my-accent mb-4">Neural Link</h4>
              <p className="text-sm opacity-80 leading-relaxed">Establish sequential connections between distant data nodes to stabilize the neural grid.</p>
           </div>
           <div className="p-6 border border-my-border bg-my-callout">
              <h4 className="font-bold uppercase tracking-widest text-xs text-my-accent mb-4">Logic Matrix</h4>
              <p className="text-sm opacity-80 leading-relaxed">Match forensic icon pairs to decrypt memory clusters and enhance pattern recognition.</p>
           </div>
        </div>
        <p className="text-sm italic opacity-60">Training scores are synced to your Operative Profile and contribute to your overall system clearance.</p>
      </div>
    )
  },
  {
    id: 'thought-replay',
    title: 'Thought Replay Engine',
    icon: <History size={20} />,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-light leading-relaxed">The Thought Replay Engine provides a forensic breakdown of the COGNAPSE logic flow, allowing operators to audit the synthesis process.</p>
        <div className="p-6 border-l-4 border-my-accent bg-my-accent/5">
           <h4 className="font-bold mb-2">Audit-Trail Logic</h4>
           <p className="text-sm opacity-80">Every research report includes a hidden logic trace. By activating Thought Replay, you can see exactly which pieces of evidence led to specific claims, and where the system identified potential contradictions.</p>
        </div>
        <div className="flex gap-4 items-center p-4 bg-my-callout border border-my-border">
           <Layers size={24} className="text-my-accent" />
           <p className="text-xs font-mono uppercase tracking-tighter">REPLAY_MODE: ACTIVE // TRACE_INDEX: SEED_DELTA</p>
        </div>
      </div>
    )
  },
  {
    id: 'notebook',
    title: 'Cognitive Notebook',
    icon: <FileText size={20} />,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-light leading-relaxed">The Cognitive Notebook is a persistent scratchpad for capturing investigative sparks.</p>
        <ul className="space-y-4">
           <li className="flex gap-4 items-start">
              <MousePointer2 size={16} className="text-my-accent mt-1" />
              <div>
                 <span className="font-bold block">Selection Capture</span>
                 <p className="text-sm opacity-70">Highlight any text in a research report to instantly save it to your notebook with its source attribution.</p>
              </div>
           </li>
           <li className="flex gap-4 items-start">
              <Database size={16} className="text-my-accent mt-1" />
              <div>
                 <span className="font-bold block">Vault Integration</span>
                 <p className="text-sm opacity-70">Your notes are stored in the Intelligence Vault, meaning they are private, persistent, and logically linked to your profile.</p>
              </div>
           </li>
        </ul>
      </div>
    )
  },
  {
    id: 'sonification',
    title: 'Visual Sonification',
    icon: <Waves size={20} />,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-light italic">Intelligence you can feel.</p>
        <p className="text-sm opacity-80 leading-relaxed">
          The COGNAPSE background canvas is not merely aesthetic; it is a **Visual Sonification** of the current research vibe.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
           <div className="p-4 bg-my-callout text-my-ink">
              <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-my-accent">Focus Mode</h5>
              <p className="text-[11px] opacity-60">High-frequency, geometric patterns indicating deep academic synthesis.</p>
           </div>
           <div className="p-4 bg-my-callout text-my-ink">
              <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-blue-400">Energy Mode</h5>
              <p className="text-[11px] opacity-60">Fluid, organic data streams representing broad-spectrum discovery.</p>
           </div>
        </div>
      </div>
    )
  }
];

export default function Documentation() {
  const setView = useStore((state) => state.setView);
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="min-h-screen bg-my-bg text-my-ink selection:bg-my-accent selection:text-white flex flex-col">

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-80 border-r border-my-border overflow-y-auto no-scrollbar p-8 hidden md:block">
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
                   <h2 className="text-6xl font-serif font-bold italic">{DOC_SECTIONS.find(s => s.id === activeSection)?.title}</h2>
                </div>

                <div className="prose dark:prose-invert max-w-none">
                   {DOC_SECTIONS.find(s => s.id === activeSection)?.content}
                </div>

                <div className="mt-40 pt-10 border-t border-my-border flex items-center justify-between text-[10px] font-bold text-my-muted uppercase tracking-widest">
                   <span>COGNAPSE v2.5 // INTERNAL_USE_ONLY</span>
                   <div className="flex gap-4">
                      <button className="hover:text-my-accent transition-colors">Privacy Policy</button>
                      <button className="hover:text-my-accent transition-colors">Terms of Awareness</button>
                   </div>
                </div>
             </motion.div>
           </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
