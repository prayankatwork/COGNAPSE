import React from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import {
  Search, Brain, Database, Shield, Zap,
  BarChart3, Globe2, Cpu, ArrowRight,
  Layers, Network, Sparkles, Activity,
  Lock, MousePointer2, Terminal as TerminalIcon,
  ChevronRight, Fingerprint, Radio,
  MessageSquare, History, Trophy, Gauge,
  Box, Eye, HardDrive, Share, Compass,
  Workflow, ArrowDown, Waves, FileText
} from 'lucide-react';

export default function LandingPage() {
  const setView = useStore((state) => state.setView);
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -400]);

  return (
    <div className="min-h-screen text-my-ink selection:bg-my-accent selection:text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        <motion.div
          style={{ y: y1 }}
          {/* Optimized background glow for mobile */}
          className="hidden md:block absolute top-1/4 left-1/10 w-[600px] h-[600px] bg-my-accent/5 rounded-full blur-[140px] -z-10 animate-pulse"
        />
        <div className="absolute inset-0 opacity-[0.02] -z-20 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="max-w-7xl mx-auto text-center relative z-10 pt-20">


          <motion.h1
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, type: 'spring', bounce: 0.4 }}
            className="text-7xl md:text-[12rem] font-serif font-bold tracking-tighter mb-12 leading-[0.8] italic"
          >
            Total <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-tr from-my-accent via-my-ink dark:via-white to-my-accent">Awareness.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-10 mt-20"
          >
            <motion.button
              id="walkthrough-search-anchor"
              onClick={() => setView('research')}
              className="group relative px-6 py-4 md:px-10 md:py-5 bg-my-ink text-white dark:bg-my-accent dark:text-my-bg overflow-hidden border border-my-accent/30 shadow-[0_20px_60px_rgba(0,0,0,0.2)] transition-all w-full sm:w-auto"
            >
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-my-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-my-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-my-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-my-accent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Scanning Line */}
              <motion.div
                className="absolute inset-0 bg-my-accent/10 z-0"
                initial={{ y: "-100%" }}
                animate={{ y: "100%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />

              <div className="relative z-10 flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 bg-my-accent rounded-full"
                  />
                  <span className="text-[10px] font-black uppercase tracking-[0.5em]">
                    ENTER RESEARCH
                  </span>
                  <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                </div>

              </div>
            </motion.button>


          </motion.div>
        </div>
      </section>

      {/* Feature Universe */}
      <section className="py-40 px-6 border-t border-my-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-32 gap-10">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-8xl font-serif font-bold mb-8 leading-none">The Research <br /> Ecosystem.</h2>
              <p className="text-xl text-my-muted font-light leading-relaxed">Every tool you need to extract objective insights from the noise of the digital age.</p>
            </div>
            <div className="text-my-accent font-bold uppercase tracking-[0.5em] text-xs flex items-center gap-4">
              <div className="w-16 h-px bg-my-accent" /> Full Feature Matrix
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-px bg-my-border border border-my-border">
            <FeatureBox icon={<Search />} title="Autonomous Discovery" desc="Parallel crawling of global knowledge indexes with semantic clustering." />
            <FeatureBox icon={<Sparkles />} title="Comprehensive Reports" desc="Autonomous generation of 5,000+ word professional analytical reports." />
            <FeatureBox icon={<History />} title="Thought Replay" desc="Deconstruct and replay the step-by-step logic used to reach conclusions." />
            <FeatureBox icon={<Layers />} title="Research Hub" desc="Hierarchical investigation stacks and cross-reference layers." />
            <FeatureBox icon={<HardDrive />} title="Native Desktop Client" desc="Zero-configuration local AI acceleration via Ollama. 100% private and offline." />
            <FeatureBox icon={<BarChart3 />} title="Visual Research Map" desc="Interactive semantic node-branching logic and evidence mapping." />
            <FeatureBox icon={<FileText />} title="Cognitive Notebook" desc="Instantly capture snippets and insights into a persistent research journal." />
            <FeatureBox icon={<Database />} title="Secure Archive" desc="Persistent SQLite-backed research reports with analyst isolation." />
            <FeatureBox icon={<Waves />} title="Adaptive Sonification" desc="Syncs with Spotify to visually react to your music in both dark and light modes." />
            <FeatureBox icon={<Trophy />} title="Research Analytics" desc="Acquire experience, unlock new tiers, and expand system access." />
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-40 px-6 bg-[#05080F] text-white overflow-hidden relative">
        {/* Dynamic Background Data Stream */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100px_100px]" />
          <motion.div
            animate={{ y: [0, -1000] }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 text-[10px] font-mono leading-none flex flex-wrap gap-4 p-4 text-my-accent"
          >
            {Array.from({ length: 100 }).map((_, i) => (
              <div key={i}>010110010101011010101101010101101010110101010110</div>
            ))}
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-60">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-my-accent text-white dark:text-my-bg text-[10px] font-bold uppercase tracking-[0.5em] mb-12 shadow-[0_0_40px_rgba(242,125,38,0.3)]">
              <Workflow size={14} className="animate-spin-slow" /> Research Protocol Walkthrough
            </motion.div>
            <h2 className="text-8xl md:text-[10rem] font-serif font-bold italic leading-tight tracking-tighter">The Analysis <br /> Flow.</h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-32 relative">
            {/* Animated Energy Flow Line (Desktop) */}
            <div className="hidden lg:block absolute top-[40px] left-[15%] right-[15%] h-[2px] bg-white/10 -z-0 overflow-hidden">
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-1/3 h-full bg-gradient-to-r from-transparent via-my-accent to-transparent"
              />
            </div>

            <FlowStep
              title="Capture"
              desc="Input your query. COGNAPSE deconstructs your objective into multi-dimensional research vectors."
              icon={<Radio size={48} />}
              accent="text-my-accent"
            />
            <FlowStep
              title="Synthesize"
              desc="Cross-platform Synthetic Intelligence. COGNAPSE crawls, cross-references, and eliminates noise."
              icon={<Brain size={48} />}
              accent="text-blue-400"
            />
            <FlowStep
              title="Insight"
              desc="A comprehensive synthesis of findings, with Thought Replay allowing you to audit every logical step."
              icon={<Sparkles size={48} />}
              accent="text-emerald-400"
            />
          </div>
        </div>
      </section>

      {/* Final Call */}
      <section className="py-60 px-6 relative overflow-hidden bg-my-bg">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(var(--accent) 2px, transparent 2px)', backgroundSize: '100px 100px' }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-9xl font-serif font-bold mb-12 md:mb-20 leading-none tracking-tighter italic">Ready for <br /> clarity?</h2>
          <button onClick={() => setView('research')} className="px-10 py-6 md:px-20 md:py-10 bg-my-accent text-white dark:text-my-bg font-bold uppercase tracking-[0.5em] hover:bg-my-ink transition-all shadow-2xl transform hover:-translate-y-4 w-full md:w-auto text-sm md:text-base">
            ENTER COGNAPSE
          </button>
          <div className="mt-14 flex items-center justify-center gap-10">
            <button
              onClick={() => setView('documentation')}
              className="text-[10px] font-bold uppercase tracking-[0.3em] text-my-muted hover:text-my-accent transition-colors flex items-center gap-2"
            >
              Documentation <ChevronRight size={14} />
            </button>
            <div className="w-px h-4 bg-my-border" />

          </div>

          {/* Student Developer Disclaimer - Compact & Visible */}
          <div className="mt-16 pt-8 border-t border-my-border max-w-xl mx-auto">
            <p className="text-[11px] text-my-ink leading-relaxed font-semibold italic">
              I am a Student & built this using Gemini, Groq, and Ollama (free tiers).
              If limits are hit, results might be slower.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureBox({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="bg-my-bg p-12 group hover:bg-my-sidebar transition-all cursor-default">
      <div className="w-12 h-12 bg-my-accent/10 flex items-center justify-center text-my-accent mb-8 group-hover:scale-110 group-hover:bg-my-accent group-hover:text-white transition-all">
        {icon}
      </div>
      <h4 className="font-bold text-xl mb-4 tracking-tight uppercase">{title}</h4>
      <p className="text-my-muted text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function FlowStep({ title, desc, icon, accent }: { title: string, desc: string, icon: any, accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      className="group relative"
    >
      <div className="mb-12 flex items-center justify-center relative">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className={clsx("w-32 h-32 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_60px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden transition-all group-hover:border-white/20", accent)}
        >
          <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 transition-opacity" />
          <div className="absolute inset-0 rounded-[2rem] border-2 border-current opacity-0 group-hover:opacity-100 animate-pulse-slow" />
          {icon}
        </motion.div>
      </div>
      <div className="text-center">
        <h3 className="text-5xl font-serif font-bold mb-6 italic group-hover:text-my-accent transition-colors">{title}</h3>
        <p className="text-xl text-white/40 leading-relaxed font-light group-hover:text-white/70 transition-colors">{desc}</p>
      </div>
    </motion.div>
  );
}

import clsx from 'clsx';
