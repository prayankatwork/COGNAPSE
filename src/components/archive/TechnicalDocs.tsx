import React from 'react';
import { Layers, Database, Cpu, Terminal, Zap, ShieldCheck, Globe, GitBranch, FileText, Brain, Activity, Lock } from 'lucide-react';
import researchPipelineDiagram from '../../../docs/current-research-pipeline-only.svg';

export default function TechnicalDocs() {
  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
      
      {/* Overview Section */}
      <section id="tech-overview" className="scroll-mt-32 space-y-8">
        <div>
          <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.3em] text-[10px] mb-4">
            <div className="w-10 h-px bg-my-accent" /> Section_04
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold italic text-my-ink mb-6">Technical Stack</h2>
          <p className="text-xl font-light leading-relaxed text-my-muted max-w-3xl">
            COGNAPSE utilizes a client-optimized architecture, leveraging client-side WebAssembly, React rendering, 
            and local state management to prioritize data privacy and application responsiveness. The AI layer 
            consists of a multi-provider swarm with intelligent failover and model routing.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
           <div className="p-4 border border-my-border bg-my-sidebar/10 flex flex-col items-center justify-center text-center gap-3">
              <Layers className="text-blue-500" size={24} />
              <div className="text-xs font-bold uppercase tracking-widest text-my-ink">Vite + React 18</div>
           </div>
           <div className="p-4 border border-my-border bg-my-sidebar/10 flex flex-col items-center justify-center text-center gap-3">
              <Database className="text-emerald-500" size={24} />
              <div className="text-xs font-bold uppercase tracking-widest text-my-ink">Zustand + IndexedDB</div>
           </div>
           <div className="p-4 border border-my-border bg-my-sidebar/10 flex flex-col items-center justify-center text-center gap-3">
              <Cpu className="text-purple-500" size={24} />
              <div className="text-xs font-bold uppercase tracking-widest text-my-ink">WASM (Transformers.js)</div>
           </div>
           <div className="p-4 border border-my-border bg-my-sidebar/10 flex flex-col items-center justify-center text-center gap-3">
              <Zap className="text-yellow-500" size={24} />
              <div className="text-xs font-bold uppercase tracking-widest text-my-ink">Firebase Auth / Firestore</div>
           </div>
        </div>
      </section>

      {/* Architecture Diagram */}
      <section id="stack" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-4 border-b border-my-border pb-2">Application Architecture</h3>
         <div className="space-y-6">
            <p className="text-sm text-my-muted leading-relaxed">
              The application processes compute-intensive tasks on the user's local hardware where possible. This approach 
              reduces server latency for state changes and minimizes the storage of user data on external servers.
            </p>
            <div className="p-6 border border-my-border bg-my-sidebar/5 font-mono text-sm leading-relaxed text-my-muted">
               <span className="text-my-accent">Client Application [Browser]</span><br/>
               ├── UI Framework: React 18, Tailwind CSS v4, Framer Motion<br/>
               ├── State Management: Zustand with persist middleware (LocalForage/IndexedDB)<br/>
               ├── Background Processing: Web Workers<br/>
               ├── Inference Engine: ONNX Runtime (WASM) via Transformers.js<br/>
               └── Audio: Web Audio API for completion sounds & visualizer<br/>
               <br/>
               <span className="text-emerald-500">AI Provider Swarm</span><br/>
               ├── Primary Cloud: Groq API (8B model — standard research)<br/>
               ├── Secondary Cloud: Google Gemini API (1.5 Flash — fallback & feed)<br/>
               ├── Deep Research: Groq 70B model (academic-grade analysis)<br/>
               ├── Local Fallback: Ollama (llama3, localhost:11434)<br/>
               └── Smart Routing: Health registry with automatic failover & 45-second cooldown<br/>
               <br/>
               <span className="text-blue-500">Backend Services</span><br/>
               ├── Vercel Serverless (API proxy — hides API keys)<br/>
               ├── Razorpay (payment processing for premium subscriptions)<br/>
               └── Firebase Auth + Firestore (authentication & cloud sync)<br/>
            </div>
         </div>
      </section>

      {/* Research Pipeline Diagram */}
      <section id="research-pipeline-diagram" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <div className="flex items-center gap-2 mb-6">
            <FileText size={16} className="text-my-accent" />
            <h3 className="text-lg font-bold text-my-ink uppercase tracking-widest text-[11px]">Research Pipeline Diagram</h3>
         </div>

         <div className="space-y-4">
            <p className="text-sm text-my-muted leading-relaxed max-w-3xl">
              A research-only execution map showing retrieval, source processing, synthesis, consensus,
              citation verification, scoring, graph payload generation, and the deep analysis continuation.
            </p>

            <div className="border border-my-border bg-my-sidebar/10 rounded-sm overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-my-border px-5 py-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.25em] text-my-ink">Current Research Pipeline</h4>
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest text-my-muted">Anonymized technical flow</p>
                </div>
                <a
                  href={researchPipelineDiagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 border border-my-border px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-my-muted transition-colors hover:border-my-accent hover:text-my-accent"
                >
                  Open SVG
                </a>
              </div>
              <div className="overflow-x-auto bg-white p-4 custom-scrollbar">
                <img
                  src={researchPipelineDiagram}
                  alt="Current research pipeline diagram"
                  className="min-w-[1200px] w-full h-auto"
                  loading="lazy"
                />
              </div>
            </div>
         </div>
      </section>

      {/* Smart Model Routing */}
      <section id="orchestration" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-4 border-b border-my-border pb-2">AI Swarm & Model Routing</h3>
         
         <div className="space-y-4">
            <p className="text-sm text-my-muted leading-relaxed max-w-3xl">
              The AI service layer implements an intelligent multi-node swarm architecture with health monitoring 
              and automatic failover between providers:
            </p>

            <div className="pl-6 border-l-2 border-my-accent space-y-5">
               <div>
                  <h5 className="font-bold text-sm text-my-ink flex items-center gap-2">
                    <Terminal size={14} className="text-my-accent" /> 1. Provider Selection
                  </h5>
                  <p className="text-xs text-my-muted">
                    Each request evaluates the health registry. Local Ollama is preferred when available on 
                    localhost and not mobile. If unstable or unavailable, the request falls through to the 
                    Cloud Swarm (Vercel serverless endpoint).
                  </p>
               </div>
               <div>
                  <h5 className="font-bold text-sm text-my-ink flex items-center gap-2">
                    <GitBranch size={14} className="text-emerald-500" /> 2. Smart Model Routing
                  </h5>
                  <p className="text-xs text-my-muted">
                    Standard research queries are routed through an 8-billion-parameter model (Groq) for 
                    optimal speed-accuracy balance. Deep Research Protocol routes through a 70-billion-parameter 
                    model for comprehensive academic-grade theses. The Knowledge Hub uses Gemini 1.5 Flash.
                  </p>
               </div>
               <div>
                  <h5 className="font-bold text-sm text-my-ink flex items-center gap-2">
                    <ShieldCheck size={14} className="text-amber-500" /> 3. Health Registry & Failover
                  </h5>
                  <p className="text-xs text-my-muted">
                    A master health registry tracks each node's status (stable/unstable) and timestamps of 
                    last failures. Nodes that fail automatically enter a 45-second cooldown followed by 
                    automatic revival. After 2 minutes of consecutive failures, nodes are marked permanently 
                    unstable until the next session.
                  </p>
               </div>
               <div>
                  <h5 className="font-bold text-sm text-my-ink flex items-center gap-2">
                    <Zap size={14} className="text-purple-500" /> 4. JSON Extraction Pipeline
                  </h5>
                  <p className="text-xs text-my-muted">
                    AI responses undergo multi-layered JSON extraction — direct parse, regex extraction of 
                    JSON blocks, and character sanitization for unicode escape sequences. Failed extractions 
                    trigger automatic retries (up to 2 for sub-reports).
                  </p>
               </div>
            </div>
         </div>
      </section>

      {/* Research Processing Logic */}
      <section id="deep-research" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-4 border-b border-my-border pb-2">Deep Research Protocol</h3>
         <p className="text-sm text-my-muted leading-relaxed max-w-3xl">
           The Deep Research feature uses a structured 4-stage pipeline to generate comprehensive academic-grade theses:
         </p>
         
         <div className="pl-6 border-l-2 border-emerald-500 space-y-4 mt-6">
            <div>
               <h5 className="font-bold text-sm text-my-ink">Stage 1 — Objective Expansion</h5>
               <p className="text-xs text-my-muted">The query is decomposed into multi-dimensional investigation vectors with a reasoning step logged to the timeline.</p>
            </div>
            <div>
               <h5 className="font-bold text-sm text-my-ink">Stage 2 — Intelligence Synthesis</h5>
               <p className="text-xs text-my-muted">The expanded query is sent to the 70B model which generates a structured thesis covering: title, abstract, introduction, problem statement, literature review, methodology, findings, comparative insights, limitations, future scope, and conclusion.</p>
            </div>
            <div>
               <h5 className="font-bold text-sm text-my-ink">Stage 3 — Quality Scoring</h5>
               <p className="text-xs text-my-muted">An Intelligence Quality Report is generated with metrics for accuracy, bias (objectivity), source diversity, and confidence interval based on cross-verification analysis.</p>
            </div>
            <div>
               <h5 className="font-bold text-sm text-my-ink">Stage 4 — Finalization & Export</h5>
               <p className="text-xs text-my-muted">The thesis is stored in the archive with the report. Premium users can generate PDF dossiers with executive summaries, multi-AI consensus scoring, and hidden reasoning layers.</p>
            </div>
         </div>
      </section>

      {/* State Management */}
      <section id="state" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <div className="flex items-center gap-2 mb-6">
            <Terminal size={16} className="text-my-accent" />
            <h3 className="text-lg font-bold text-my-ink uppercase tracking-widest text-[11px]">State Management & Data Layer</h3>
         </div>

         <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border border-my-border bg-my-sidebar/10">
               <h4 className="font-bold text-sm text-my-ink mb-3 flex items-center gap-2">
                  <Database size={14} className="text-emerald-500" /> Zustand Store
               </h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 All application state is managed centrally through Zustand with the persist middleware configured 
                 for LocalForage (IndexedDB). The store manages: user authentication, theme, navigation views, 
                 research archive (100 entries), chat messages, investigation stack, deep research state, 
                 cognition graph, notebook notes, session memory, missions, gamification stats, and premium exports.
               </p>
               <p className="text-xs text-my-muted leading-relaxed mt-3">
                 Selectively persisted fields include XP, search count, rank, badges, streak, theme, and 
                 subscribed categories — ensuring fast local reloads while sensitive report data is fetched 
                 from the cloud vault on authentication.
               </p>
            </div>
            <div className="p-6 border border-my-border bg-my-sidebar/10">
               <h4 className="font-bold text-sm text-my-ink mb-3 flex items-center gap-2">
                  <Globe size={14} className="text-blue-500" /> Firebase Sync Layer
               </h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 When authenticated via Firebase Auth (email/password), user data is synchronized with 
                 Firestore in a structured vault: reports are saved with user ID, query, and full report 
                 data; stats (XP, rank, search count) sync bidirectionally; notes are persisted with 
                 timestamps; settings (walkthrough completion, subscribed categories) sync on change; 
                 and premium status is loaded from the server.
               </p>
               <p className="text-xs text-my-muted leading-relaxed mt-3">
                 Shared research records are stored in a dedicated <code>shared_research</code> collection 
                 with owner ID, visibility tier, and timestamps. Firestore security rules enforce 
                 user-scoped read/write access with row-level security.
               </p>
            </div>
         </div>

         <div className="p-6 border border-my-border bg-my-sidebar/10 mt-4">
            <h4 className="font-bold text-sm text-my-ink mb-3 flex items-center gap-2">
               <Brain size={14} className="text-pink-500" /> Cognition Graph & Session Memory
            </h4>
            <p className="text-xs text-my-muted leading-relaxed">
              The application maintains a real-time cognition graph — a directed graph of thoughts (claims, evidence, 
              questions, assumptions, conclusions) with cross-linking and contradiction tracking. Session Memory 
              aggregates cross-links between related queries, tracks dominant research topics, and identifies 
              potential researcher bias patterns. Both structures are ephemeral (in-memory) and reset between 
              sessions unless persisted to the archive.
            </p>
         </div>
      </section>


      {/* Security Architecture */}
      <section id="security-architecture" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-4 border-b border-my-border pb-2">Security Architecture</h3>
         
         <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 border border-my-border bg-my-sidebar/10">
               <h4 className="font-bold text-sm text-my-ink mb-3 flex items-center gap-2">
                  <Terminal size={14} className="text-emerald-500" /> Authentication Layer
               </h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 Firebase Auth with email/password authentication. JWT-based session tokens with automatic 
                 expiration. No password storage on COGNAPSE infrastructure. Sessions monitored for inactivity 
                 with optional forced re-authentication on security-sensitive operations.
               </p>
            </div>
            <div className="p-6 border border-my-border bg-my-sidebar/10">
               <h4 className="font-bold text-sm text-my-ink mb-3 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-blue-500" /> Data Access Controls
               </h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 Firestore Security Rules enforce row-level security: user data is scoped by authenticated 
                 user ID. Shared research collection enforces visibility-based read access. All security 
                 rules are validated server-side; clients cannot bypass them.
               </p>
            </div>
         </div>

         <div className="p-6 border border-my-border bg-my-sidebar/10 mt-4">
            <h4 className="font-bold text-sm text-my-ink mb-3 flex items-center gap-2">
               <Lock size={14} className="text-amber-500" /> API Key Protection &amp; Secrets Management
            </h4>
            <p className="text-xs text-my-muted leading-relaxed">
              All third-party API keys (Groq, Gemini, Razorpay secret) are stored exclusively as 
              Vercel environment variables. Backend API endpoints act as a secure proxy layer: the client 
              sends requests to Vercel serverless functions, which inject the necessary keys server-side. 
              This prevents credential leakage through browser DevTools, network inspection, or source map 
              exposure.
            </p>
            <p className="text-xs text-amber-600 leading-relaxed mt-2">
              <strong>Note:</strong> The Groq and Gemini API keys used for client-side research queries are 
              compiled into the JavaScript bundle via Vite environment variables (<code>VITE_GROQ_API_KEY</code>, 
              <code>VITE_GEMINI_API_KEY</code>). This is standard for browser-based AI applications where the 
              client directly calls provider APIs. The public-facing API key presented to the browser is distinct 
              from any restricted admin keys. API key rotation is recommended periodically to limit exposure.
            </p>
            <p className="text-xs text-my-muted leading-relaxed mt-3">
              Premium status verification, payment order creation, and payment signature verification are all 
              performed server-side through Vercel API endpoints using the <code>/api/*</code> route pattern.
            </p>
         </div>

         <div className="p-6 border border-my-border bg-my-sidebar/10 mt-4">
            <h4 className="font-bold text-sm text-my-ink mb-3 flex items-center gap-2">
               <Globe size={14} className="text-purple-500" /> Transport Security
            </h4>
            <p className="text-xs text-my-muted leading-relaxed">
              All communications between the client application and backend services are encrypted in transit 
              using TLS 1.3. Vercel edge network provides automatic SSL/TLS termination with modern cipher 
              suites. Firebase communications are encrypted with Google Cloud&rsquo;s transport security.
            </p>
         </div>
      </section>

      {/* Observability Governance */}
      <section id="observability" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-4 border-b border-my-border pb-2">Observability &amp; Telemetry Governance</h3>
         
         <p className="text-sm text-my-muted leading-relaxed max-w-3xl mb-6">
           COGNAPSE employs lightweight operational telemetry for platform health monitoring, error detection, 
           and capacity planning. The telemetry system is governed by strict privacy and data minimization 
           principles.
         </p>

         <div className="space-y-4">
            <div className="flex gap-4 p-6 border border-my-border bg-my-sidebar/10">
               <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <ShieldCheck size={14} className="text-emerald-500" />
               </div>
               <div>
                  <h5 className="font-bold text-sm text-my-ink mb-1">Privacy-Preserving by Design</h5>
                  <p className="text-xs text-my-muted leading-relaxed">Telemetry payloads contain no personal identifying information, search query content, or research output data.</p>
               </div>
            </div>
            <div className="flex gap-4 p-6 border border-my-border bg-my-sidebar/10">
               <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Database size={14} className="text-blue-500" />
               </div>
               <div>
                  <h5 className="font-bold text-sm text-my-ink mb-1">Access-Controlled Storage</h5>
                  <p className="text-xs text-my-muted leading-relaxed">Telemetry data is stored in a dedicated, access-restricted Firestore collection separate from user data.</p>
               </div>
            </div>
            <div className="flex gap-4 p-6 border border-my-border bg-my-sidebar/10">
               <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Lock size={14} className="text-purple-500" />
               </div>
               <div>
                  <h5 className="font-bold text-sm text-my-ink mb-1">No Third-Party Sharing</h5>
                  <p className="text-xs text-my-muted leading-relaxed">Telemetry is used exclusively for operational improvement. Never shared or used for advertising.</p>
               </div>
            </div>
            <div className="flex gap-4 p-6 border border-my-border bg-my-sidebar/10">
               <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Activity size={14} className="text-amber-500" />
               </div>
               <div>
                  <h5 className="font-bold text-sm text-my-ink mb-1">Operational Purpose Only</h5>
                  <p className="text-xs text-my-muted leading-relaxed">Telemetry enables error detection, performance monitoring, and reliability improvement. Not used for profiling.</p>
               </div>
            </div>
         </div>
      </section>

    </div>
  );
}
