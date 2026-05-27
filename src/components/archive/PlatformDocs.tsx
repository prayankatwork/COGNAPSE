import React from 'react';
import { Workflow, Brain, Database, Share, ShieldCheck, Layers, ArrowRight, Globe, Zap, Trophy, Fingerprint, BookOpen, Cpu } from 'lucide-react';
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
            designed to aggregate, synthesize, and verify information from multiple online sources through a secure, 
            multi-engine AI swarm.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 pt-4">
          <div className="p-8 border border-my-border bg-my-callout/40 backdrop-blur-md rounded-sm hover:border-my-accent/30 transition-colors">
             <Brain className="text-my-accent mb-6" size={24} />
             <h4 className="font-bold uppercase tracking-widest text-xs text-my-ink mb-4">Information Synthesis</h4>
             <p className="text-sm text-my-muted leading-relaxed">
               Standard AI tools often output unverified text. COGNAPSE is structured to reduce inaccuracies by utilizing multi-step research workflows, multi-model consensus verification, and applying automated client-side claim verification to generated reports.
             </p>
          </div>
          <div className="p-8 border border-my-border bg-my-callout/40 backdrop-blur-md rounded-sm hover:border-my-accent/30 transition-colors">
             <Layers className="text-my-accent mb-6" size={24} />
             <h4 className="font-bold uppercase tracking-widest text-xs text-my-ink mb-4">Data Management</h4>
             <p className="text-sm text-my-muted leading-relaxed">
               Built with privacy in mind. User-generated reports are stored locally on the device by default using IndexedDB, with optional cloud synchronization to Firebase Firestore when authenticated.
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
           {/* System Card: Standard Research */}
           <div className="group border border-my-border bg-my-sidebar/10 hover:bg-my-sidebar/30 transition-colors rounded-sm overflow-hidden">
              <div className="p-6 md:p-8 flex items-start gap-6">
                 <div className="w-12 h-12 rounded-full bg-my-accent/10 flex items-center justify-center shrink-0 border border-my-accent/20">
                    <Database size={20} className="text-my-accent" />
                 </div>
                 <div>
                    <h5 className="font-bold text-my-ink mb-2">Standard Research Engine</h5>
                    <p className="text-sm text-my-muted leading-relaxed mb-4">
                      The primary research pipeline accepts natural language queries and routes them through a smart model selector. 
                      Standard queries use an optimized 8-billion-parameter model for fast, reliable results. Each report includes 
                      inline citations, credibility scoring, source diversity analysis, conflict detection, bias alerts, and 
                      an interactive intelligence map for visual exploration.
                    </p>
                 </div>
              </div>
           </div>

           {/* System Card: Deep Research */}
           <div className="group border border-my-border bg-my-sidebar/10 hover:bg-my-sidebar/30 transition-colors rounded-sm overflow-hidden">
              <div className="p-6 md:p-8 flex items-start gap-6">
                 <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
                    <Cpu size={20} className="text-orange-500" />
                 </div>
                 <div>
                    <h5 className="font-bold text-my-ink mb-2">Deep Research Protocol</h5>
                    <p className="text-sm text-my-muted leading-relaxed mb-4">
                      A premium, multi-stage research pipeline that routes queries through a larger 70-billion-parameter model 
                      for academic-grade analysis. Generates comprehensive theses with abstract, introduction, literature review, 
                      methodology, findings, comparative insights, limitations, and conclusion — each section independently 
                      verifiable. An Intelligence Quality Report scores accuracy, objectivity, source diversity, and confidence.
                    </p>
                 </div>
              </div>
           </div>

           {/* System Card: Intelligence Feed */}
           <div className="group border border-my-border bg-my-sidebar/10 hover:bg-my-sidebar/30 transition-colors rounded-sm overflow-hidden">
              <div className="p-6 md:p-8 flex items-start gap-6">
                 <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                    <Globe size={20} className="text-blue-500" />
                 </div>
                 <div>
                    <h5 className="font-bold text-my-ink mb-2">Knowledge Hub (Intelligence Feed)</h5>
                    <p className="text-sm text-my-muted leading-relaxed mb-4">
                      A curated global intelligence feed that monitors five categories: Technology, Finance, Geopolitics, 
                      Science, and Health. Users subscribe to specific intelligence vectors, and the AI swarm generates 
                      dynamically contextualized headlines with summaries, impact ratings, and the ability to initiate 
                      full research investigations directly from any headline. The feed auto-refreshes every 10 minutes 
                      and updates when the tab becomes visible.
                    </p>
                 </div>
              </div>
           </div>

           {/* System Card: Shared Research */}
           <div className="group border border-my-border bg-my-sidebar/10 hover:bg-my-sidebar/30 transition-colors rounded-sm overflow-hidden">
              <div className="p-6 md:p-8 flex items-start gap-6">
                 <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <Share size={20} className="text-emerald-500" />
                 </div>
                 <div>
                    <h5 className="font-bold text-my-ink mb-2">Interactive Knowledge Graphs & Sharing</h5>
                    <p className="text-sm text-my-muted leading-relaxed mb-4">
                      Research reports generate an interactive, node-based visual map of key topics. Users can securely 
                      share read-only access links with three visibility tiers — Private, Unlisted, or Public. 
                      Shared research renders in a dedicated read-only view preserving all sections, synthesis, 
                      and deep research theses. Links can be disabled by the owner at any time.
                    </p>
                 </div>
              </div>
           </div>

           {/* System Card: Premium & Export */}
           <div className="group border border-my-border bg-my-sidebar/10 hover:bg-my-sidebar/30 transition-colors rounded-sm overflow-hidden">
              <div className="p-6 md:p-8 flex items-start gap-6">
                 <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
                    <Zap size={20} className="text-purple-500" />
                 </div>
                 <div>
                    <h5 className="font-bold text-my-ink mb-2">Premium Subscriptions & Export</h5>
                    <p className="text-sm text-my-muted leading-relaxed mb-4">
                      Users can upgrade to a Monthly or Annual Premium pass to unlock advanced capabilities. 
                      Premium features include generating structured PDF dossiers of completed research with 
                      executive summaries, multi-AI consensus scoring,SWOT analysis, actionable takeaways, and comprehensive appendix metadata. Payments are processed securely via Razorpay.
                    </p>
                 </div>
              </div>
           </div>

           {/* System Card: Gamification */}
           <div className="group border border-my-border bg-my-sidebar/10 hover:bg-my-sidebar/30 transition-colors rounded-sm overflow-hidden">
              <div className="p-6 md:p-8 flex items-start gap-6">
                 <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Trophy size={20} className="text-amber-500" />
                 </div>
                 <div>
                    <h5 className="font-bold text-my-ink mb-2">Analyst Progression System</h5>
                    <p className="text-sm text-my-muted leading-relaxed mb-4">
                      A gamification layer tracks research activity through XP accumulation, search streak bonuses, 
                      and rank progression from Novice through Omni-Observer. Badge unlocks, confetti celebrations 
                      on rank-ups, and ongoing progression milestones incentivize continuous research. The analyst profile displays 
                      cumulative stats, PDF export history, and an activity heatmap.
                    </p>
                 </div>
              </div>
           </div>

           {/* System Card: Cognition & Memory */}
           <div className="group border border-my-border bg-my-sidebar/10 hover:bg-my-sidebar/30 transition-colors rounded-sm overflow-hidden">
              <div className="p-6 md:p-8 flex items-start gap-6">
                 <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0 border border-pink-500/20">
                    <Brain size={20} className="text-pink-500" />
                 </div>
                 <div>
                    <h5 className="font-bold text-my-ink mb-2">Session Cognition & Memory</h5>
                    <p className="text-sm text-my-muted leading-relaxed mb-4">
                      Each research session maintains a Cognition Graph — a real-time network of thoughts, claims, 
                      evidence nodes, questions, assumptions, and conclusions with cross-linking and contradiction tracking. The Thought Replay Engine replays the AI's analytical journey — from initial query decomposition through source aggregation, contradiction handling, bias mitigation, and final synthesis — as a scrollable forensic timeline. Session Memory 
                      cross-links related queries, tracks dominant topics, and flags researcher bias patterns.
                    </p>
                 </div>
              </div>
           </div>

           {/* System Card: Neural Walkthrough */}
           <div className="group border border-my-border bg-my-sidebar/10 hover:bg-my-sidebar/30 transition-colors rounded-sm overflow-hidden">
              <div className="p-6 md:p-8 flex items-start gap-6">
                 <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                    <BookOpen size={20} className="text-indigo-500" />
                 </div>
                 <div>
                    <h5 className="font-bold text-my-ink mb-2">Interactive Onboarding (Neural Walkthrough)</h5>
                    <p className="text-sm text-my-muted leading-relaxed mb-4">
                      First-time users are guided through a step-by-step interactive tour of the interface, covering 
                      the navigation system, command palette (Ctrl+K), research input, sidebar archive, deep research 
                      protocol, and the knowledge hub. The walkthrough can be restarted at any time from the 
                      Onboarding section of this documentation.
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
               Users submit a research topic or question via the main input field, the Knowledge Hub, or the 
               Command Palette (Ctrl+K). The system routes the query through the smart model selector — 
               standard queries use an 8-billion-parameter model for speed, while deep research uses a 
               70-billion-parameter model for depth.
             </p>
          </div>

          <div className="relative">
             <div className="absolute -left-[37px] top-1 w-4 h-4 bg-my-bg border-2 border-my-accent/50 rounded-full" />
             <h4 className="text-lg font-bold text-my-ink mb-2">2. Automated Search Processing</h4>
             <p className="text-sm text-my-muted leading-relaxed max-w-xl">
               The application identifies relevant sub-topics and executes concurrent search queries through 
               multiple AI providers (Groq, Gemini) to gather comprehensive data. An intelligent swarm health 
               registry monitors provider stability and automatically fails over between local (Ollama) and 
               cloud endpoints.
             </p>
          </div>

          <div className="relative">
             <div className="absolute -left-[37px] top-1 w-4 h-4 bg-my-bg border-2 border-my-accent/50 rounded-full" />
             <h4 className="text-lg font-bold text-my-ink mb-2">3. Report Generation & Verification</h4>
             <p className="text-sm text-my-muted leading-relaxed max-w-xl">
               The collected data is synthesized into a structured report with inline citations, credibility scores, 
               conflict detection, bias analysis, and an interactive intelligence map. A synthetic reasoning 
               timeline recreates the AI's analytical path for transparency. Reports include optional ELI5 
               summaries, SWOT analysis, timeline events, and actionable takeaways.
             </p>
          </div>

          <div className="relative">
             <div className="absolute -left-[37px] top-1 w-4 h-4 bg-my-bg border-2 border-my-accent/50 rounded-full" />
             <h4 className="text-lg font-bold text-my-ink mb-2">4. Storage & Progression</h4>
             <p className="text-sm text-my-muted leading-relaxed max-w-xl">
               The completed report is saved to local browser storage (IndexedDB) and synchronized to the 
               Firebase cloud vault when authenticated. Users earn XP, streak bonuses, and progress through 
               analyst ranks. Premium users can generate PDF dossiers with executive summaries and multi-AI 
               consensus analysis.
             </p>
          </div>

        </div>
      </section>

      {/* Onboarding */}
      <section id="onboarding" className="scroll-mt-32 pt-16">
        <div className="p-8 border border-dashed border-my-accent/40 bg-my-accent/5 rounded-sm">
           <h4 className="font-bold text-my-ink mb-2">User Onboarding</h4>
           <p className="text-sm text-my-muted mb-6 max-w-xl">
             You can restart the introductory Neural Walkthrough at any time to familiarize yourself 
             with the application interface, including navigation, research input, archive management, 
             command palette, and the knowledge hub.
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

      {/* Collaboration Governance */}
      <section id="collaboration" className="scroll-mt-32 pt-16 border-t border-my-border">
        <div>
          <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.4em] text-[10px] mb-4">
            <div className="w-10 h-px bg-my-accent" /> Section_07
          </div>
          <h2 className="text-3xl font-serif font-bold italic text-my-ink mb-6">Collaboration &amp; Governance</h2>
        </div>

        <div className="space-y-4">
           <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
              <h4 className="font-bold text-my-ink mb-3">Shared Research Architecture</h4>
              <p className="text-sm text-my-muted leading-relaxed mb-4">
                COGNAPSE enables secure, read-only sharing of research reports through three visibility tiers. 
                Shared research links use cryptographically random identifiers, preventing enumeration attacks. 
                Owners retain full control and may disable shared links at any time. Read-only views preserve 
                all report sections, synthesis content, deep research theses, and intelligence maps.
              </p>
           </div>

           <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
              <h4 className="font-bold text-my-ink mb-3">Community Standards</h4>
              <p className="text-sm text-my-muted leading-relaxed">
                All shared content must comply with the platform&rsquo;s Community Guidelines. Users may not share 
                illegal content, sensitive personal information, or material that infringes third-party rights. 
                Violations may result in content removal, link disablement, or account suspension. Abuse reports 
                are reviewed and acted upon promptly.
              </p>
           </div>
        </div>
      </section>

      {/* Enterprise Governance */}
      <section id="enterprise-governance" className="scroll-mt-32 pt-16 border-t border-my-border">
        <div>
          <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.4em] text-[10px] mb-4">
            <div className="w-10 h-px bg-my-accent" /> Section_08
          </div>
          <h2 className="text-3xl font-serif font-bold italic text-my-ink mb-6">Enterprise Governance</h2>
        </div>

        <div className="space-y-4">
           <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
              <h4 className="font-bold text-my-ink mb-3">Platform Governance Model</h4>
              <p className="text-sm text-my-muted leading-relaxed">
                COGNAPSE operates under a structured governance framework that separates platform operations, 
                data management, AI infrastructure, and user-facing features into distinct governance domains. 
                Each domain has defined policies, access controls, and accountability measures documented in 
                the Trust &amp; Security Center and Legal &amp; Compliance sections.
              </p>
           </div>

           <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
              <h4 className="font-bold text-my-ink mb-3">Data Governance</h4>
              <p className="text-sm text-my-muted leading-relaxed">
                Data governance follows a local-first philosophy: user data resides on-device by default, with 
                opt-in cloud synchronization. Data retention, deletion, and portability policies are defined 
                in the Privacy Policy. Telemetry collection is limited to anonymized operational events with 
                strict access controls.
              </p>
           </div>

           <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
              <h4 className="font-bold text-my-ink mb-3">AI Governance</h4>
              <p className="text-sm text-my-muted leading-relaxed">
                AI systems are governed by transparency requirements including: multi-model consensus methodology, 
                contradiction analysis, forensic reasoning timelines, confidence scoring with documented 
                limitations, and bias detection. All AI-generated content is clearly labeled as such, and 
                users are advised to independently verify critical findings.
              </p>
           </div>

           <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
              <h4 className="font-bold text-my-ink mb-3">Operational Governance</h4>
              <p className="text-sm text-my-muted leading-relaxed">
                Operational monitoring, incident response, and platform reliability are managed through 
                documented processes that emphasize detection, containment, remediation, and preventive 
                improvement. Infrastructure dependencies on third-party providers (Vercel, Firebase, 
                Groq, Gemini, Razorpay) are disclosed with transparent service-level expectations.
              </p>
           </div>
        </div>
      </section>

      {/* Responsible AI */}
      <section id="responsible-ai" className="scroll-mt-32 pt-16 border-t border-my-border">
        <div>
          <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.4em] text-[10px] mb-4">
            <div className="w-10 h-px bg-my-accent" /> Section_09
          </div>
          <h2 className="text-3xl font-serif font-bold italic text-my-ink mb-6">Responsible AI Usage</h2>
        </div>

        <div className="p-6 border border-my-border bg-my-callout/20 mb-4">
           <p className="text-sm text-my-muted leading-relaxed">
             COGNAPSE is designed as an assistive intelligence tool. The platform encourages independent 
             verification, critical evaluation, and source validation. AI-generated research is not a 
             substitute for domain expertise, professional judgment, or authoritative sources.
           </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
           <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
              <h4 className="font-bold text-my-ink mb-2">Verification First</h4>
              <p className="text-sm text-my-muted">Always verify claims, statistics, and citations from primary sources. Use the inline verification tools provided within each report.</p>
           </div>
           <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
              <h4 className="font-bold text-my-ink mb-2">Context Awareness</h4>
              <p className="text-sm text-my-muted">Consider the limitations of AI models: knowledge cutoffs, potential hallucinations, and statistical rather than deterministic reasoning.</p>
           </div>
           <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
              <h4 className="font-bold text-my-ink mb-2">Transparency</h4>
              <p className="text-sm text-my-muted">Disclose AI assistance when incorporating generated content into professional or public work. Do not misrepresent AI outputs as human-produced.</p>
           </div>
           <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
              <h4 className="font-bold text-my-ink mb-2">Critical Evaluation</h4>
              <p className="text-sm text-my-muted">Use scores (confidence, relevance, consensus) as directional indicators, not absolute measures of truth. Apply your own domain expertise to evaluate outputs.</p>
           </div>
        </div>
      </section>

    </div>
  );
}
