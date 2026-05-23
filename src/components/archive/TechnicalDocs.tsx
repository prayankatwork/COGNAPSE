import React from 'react';
import { Layers, Database, Cpu, Terminal, Zap, ShieldCheck } from 'lucide-react';

export default function TechnicalDocs() {
  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
      
      {/* Overview Section */}
      <section id="tech-overview" className="scroll-mt-32 space-y-8">
        <div>
          <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.4em] text-[10px] mb-4">
            <div className="w-10 h-px bg-my-accent" /> Section_04
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold italic text-my-ink mb-6">Technical Stack</h2>
          <p className="text-xl font-light leading-relaxed text-my-muted max-w-3xl">
            COGNAPSE utilizes a client-optimized architecture, leveraging client-side WebAssembly, React rendering, and local state management to prioritize data privacy and application responsiveness.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
           <div className="p-4 border border-my-border bg-my-sidebar/10 flex flex-col items-center justify-center text-center gap-3">
              <Layers className="text-blue-500" size={24} />
              <div className="text-[10px] font-bold uppercase tracking-widest text-my-ink">Vite + React</div>
           </div>
           <div className="p-4 border border-my-border bg-my-sidebar/10 flex flex-col items-center justify-center text-center gap-3">
              <Database className="text-emerald-500" size={24} />
              <div className="text-[10px] font-bold uppercase tracking-widest text-my-ink">Zustand + IndexedDB</div>
           </div>
           <div className="p-4 border border-my-border bg-my-sidebar/10 flex flex-col items-center justify-center text-center gap-3">
              <Cpu className="text-purple-500" size={24} />
              <div className="text-[10px] font-bold uppercase tracking-widest text-my-ink">WASM (Transformers.js)</div>
           </div>
           <div className="p-4 border border-my-border bg-my-sidebar/10 flex flex-col items-center justify-center text-center gap-3">
              <Zap className="text-yellow-500" size={24} />
              <div className="text-[10px] font-bold uppercase tracking-widest text-my-ink">Firebase Auth / Firestore</div>
           </div>
        </div>
      </section>

      {/* Architecture Diagram Equivalent */}
      <section id="stack" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-4 border-b border-my-border pb-2">Application Architecture</h3>
         <div className="space-y-6">
            <p className="text-sm text-my-muted leading-relaxed">
              The application processes compute-intensive tasks on the user's local hardware where possible. This approach reduces server latency for state changes and minimizes the storage of user data on external servers.
            </p>
            <div className="p-6 border border-my-border bg-my-sidebar/5 font-mono text-[11px] leading-relaxed text-my-muted">
               <span className="text-my-accent">Client Application [Browser]</span><br/>
               ├── UI Framework: React 18, Tailwind CSS v4, Framer Motion<br/>
               ├── State Management: Zustand (LocalForage/IndexedDB Persistence)<br/>
               ├── Background Processing: Web Workers<br/>
               └── Inference Engine: ONNX Runtime (WASM)<br/>
               <br/>
               <span className="text-emerald-500">Cloud Services</span><br/>
               ├── API Providers: Groq, Google Gemini API<br/>
               ├── Synchronization: Firebase Firestore<br/>
               └── Authentication: Firebase Auth (JWT Tokens)<br/>
            </div>
         </div>
      </section>

      {/* AI Swarm Logic */}
      <section id="orchestration" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-4 border-b border-my-border pb-2">Research Processing Logic</h3>
         <p className="text-sm text-my-muted leading-relaxed max-w-3xl">
           The research feature uses a structured programmatic loop within `geminiService.ts` to manage API requests and data synthesis:
         </p>
         
         <div className="pl-6 border-l-2 border-my-accent space-y-4">
            <div>
               <h5 className="font-bold text-sm text-my-ink">1. Search Structure Generation</h5>
               <p className="text-xs text-my-muted">The initial query is processed to establish a structured outline of related topics.</p>
            </div>
            <div>
               <h5 className="font-bold text-sm text-my-ink">2. Concurrent Data Retrieval</h5>
               <p className="text-xs text-my-muted">The application executes independent API requests for each topic to gather specific information efficiently.</p>
            </div>
            <div>
               <h5 className="font-bold text-sm text-my-ink">3. Document Synthesis</h5>
               <p className="text-xs text-my-muted">Retrieved data is compiled into a single prompt to generate a formatted document that includes inline citations.</p>
            </div>
         </div>
      </section>


      {/* State Management */}
      <section id="state" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <div className="flex items-center gap-2 mb-4">
            <Terminal size={16} className="text-my-accent" />
            <h3 className="text-lg font-bold text-my-ink uppercase tracking-widest text-[11px]">State Management</h3>
         </div>
         <p className="text-sm text-my-muted leading-relaxed">
           Application state (including current views, saved documents, and user preferences) is managed centrally in <code>store.ts</code> using Zustand. 
         </p>
         <p className="text-sm text-my-muted leading-relaxed">
           This implementation includes Zustand's <code>persist</code> middleware configured with <strong>LocalForage</strong>. This allows users to access their saved documents locally even without an active internet connection. Data synchronization with Firebase occurs in the background when network connectivity is available.
         </p>
      </section>

    </div>
  );
}
