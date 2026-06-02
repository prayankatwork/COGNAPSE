import React from 'react';
import { Shield, Fingerprint, Lock, Activity, EyeOff, Key, Users, Share2, Cloud, AlertCircle, CheckCircle2, RefreshCw, FileSearch, Siren, Gavel, BarChart3, Sparkles } from 'lucide-react';

export default function TrustDocs() {
  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
      
      {/* ─── OVERVIEW ─── */}
      <section id="trust-overview" className="scroll-mt-32 space-y-8">
        <div>
          <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.3em] text-[10px] mb-4">
            <div className="w-10 h-px bg-my-accent" /> Section_06
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold italic text-my-ink mb-6">Trust &amp; Security Center</h2>
          <p className="text-xl font-light leading-relaxed text-my-muted max-w-3xl">
            COGNAPSE is architected with data privacy, operational security, and AI transparency as foundational 
            principles. This section documents our security infrastructure, data handling practices, AI transparency 
            methodology, and operational governance.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
            <Shield className="text-my-accent mb-4" size={24} />
            <h4 className="font-bold text-sm text-my-ink mb-2">Security Architecture</h4>
            <p className="text-xs text-my-muted leading-relaxed">Defense-in-depth approach with Firebase Auth, Firestore security rules, and API key isolation.</p>
          </div>
          <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
            <EyeOff className="text-emerald-500 mb-4" size={24} />
            <h4 className="font-bold text-sm text-my-ink mb-2">Data Privacy</h4>
            <p className="text-xs text-my-muted leading-relaxed">Local-first storage with optional encrypted cloud sync. No data sale, no third-party training on user data.</p>
          </div>
          <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
            <FileSearch className="text-blue-500 mb-4" size={24} />
            <h4 className="font-bold text-sm text-my-ink mb-2">AI Transparency</h4>
            <p className="text-xs text-my-muted leading-relaxed">Multi-model consensus scoring, contradiction analysis, and forensic reasoning timelines.</p>
          </div>
        </div>
      </section>

      {/* ─── 1. SECURITY ARCHITECTURE ─── */}
      <section id="security-model" className="scroll-mt-32 space-y-8">
         <h3 className="text-2xl font-bold text-my-ink mb-6 border-b border-my-border pb-2">1. Security Architecture</h3>
         <div className="grid md:grid-cols-2 gap-4">
            <div className="p-8 border border-my-border bg-my-sidebar/10 rounded-sm">
               <Fingerprint className="text-my-accent mb-6" size={28} />
               <h4 className="text-lg font-bold text-my-ink mb-3">Authentication System</h4>
               <p className="text-sm text-my-muted leading-relaxed mb-4">
                 User authentication is handled by Firebase Auth using email/password authentication with 
                 JSON Web Tokens (JWTs). We do not store or manage passwords directly — authentication is 
                 delegated entirely to Firebase&rsquo;s secure infrastructure, which employs industry-standard 
                 encryption and security practices.
               </p>
               <ul className="space-y-2 text-xs text-my-muted">
                 <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" /> Password hashing with bcrypt-equivalent strength (handled by Firebase)</li>
                 <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" /> Session tokens with automatic expiration and refresh</li>
                 <li className="flex items-start gap-2"><CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" /> Optional session invalidation on security events</li>
               </ul>
            </div>
            <div className="p-8 border border-my-border bg-my-sidebar/10 rounded-sm">
               <Lock className="text-blue-500 mb-6" size={28} />
               <h4 className="text-lg font-bold text-my-ink mb-3">Database &amp; API Security</h4>
               <p className="text-sm text-my-muted leading-relaxed mb-4">
                 All data access is governed by Firestore Security Rules that enforce strict row-level security:
               </p>
               <ul className="space-y-2 text-xs text-my-muted">
                 <li className="flex items-start gap-2"><Lock size={12} className="text-blue-500 mt-0.5 shrink-0" /> User data is scoped by user ID — no user can read another user&rsquo;s private data.</li>
                 <li className="flex items-start gap-2"><Lock size={12} className="text-blue-500 mt-0.5 shrink-0" /> Shared research collections enforce visibility-based access (public/unlisted/private).</li>
                 <li className="flex items-start gap-2"><Lock size={12} className="text-blue-500 mt-0.5 shrink-0" /> Admin API keys (Firebase Admin, Razorpay secret) are stored exclusively as Vercel environment variables — never exposed to client-side bundles.</li>
                 <li className="flex items-start gap-2"><Lock size={12} className="text-blue-500 mt-0.5 shrink-0" /> Serverless API endpoints act as a secure proxy layer for sensitive operations (payment verification, premium status checks). Client-side research queries use provider-specific API keys bundled via Vite, which is standard for browser-based AI applications.</li>
               </ul>
            </div>
         </div>

         <div className="p-8 border border-my-border bg-my-sidebar/10 rounded-sm mt-4">
            <h4 className="font-bold text-lg text-my-ink mb-4">Infrastructure Security</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div>
                  <div className="text-2xl font-bold text-my-ink">TLS 1.3</div>
                  <div className="text-xs text-my-muted font-bold uppercase tracking-widest mt-1">Encryption in Transit</div>
               </div>
               <div>
                  <div className="text-2xl font-bold text-my-ink">SOC 2</div>
                  <div className="text-xs text-my-muted font-bold uppercase tracking-widest mt-1">Firebase Compliance</div>
               </div>
               <div>
                  <div className="text-2xl font-bold text-my-ink">RBAC</div>
                  <div className="text-xs text-my-muted font-bold uppercase tracking-widest mt-1">Role-Based Access Controls</div>
               </div>
               <div>
                  <div className="text-2xl font-bold text-my-ink">CCPA / GDPR</div>
                  <div className="text-xs text-my-muted font-bold uppercase tracking-widest mt-1">Privacy Framework Alignment</div>
               </div>
            </div>
         </div>
      </section>

      {/* ─── 2. DATA PRIVACY & HANDLING ─── */}
      <section id="data-isolation" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-6 border-b border-my-border pb-2">2. Data Privacy &amp; Handling Practices</h3>
         
         <div className="space-y-4">
            <div className="flex gap-4 p-6 border border-my-border bg-my-callout/20">
               <EyeOff className="text-emerald-500 shrink-0 mt-1" size={20} />
               <div>
                  <h5 className="font-bold text-my-ink mb-2">Local-First Architecture</h5>
                  <p className="text-sm text-my-muted leading-relaxed">
                    COGNAPSE defaults to storing data locally on the user&rsquo;s device using LocalForage (IndexedDB). 
                    This means your research data remains on your device by default. Cloud synchronization is 
                    strictly opt-in through authentication. All local storage is sandboxed to the browser origin 
                    and inaccessible to other websites or applications.
                  </p>
               </div>
            </div>
            
            <div className="flex gap-4 p-6 border border-my-border bg-my-callout/20">
               <Cloud className="text-blue-500 shrink-0 mt-1" size={20} />
               <div>
                  <h5 className="font-bold text-my-ink mb-2">Cloud Sync &amp; Data Handling</h5>
                  <p className="text-sm text-my-muted leading-relaxed">
                    When authenticated, research data is synchronized to Firestore using a generation counter 
                    to prevent stale data overwrites. Premium status is fetched from a secure server endpoint 
                    and cached locally. We do not sell user data, search histories, or research outputs to 
                    third parties. AI providers process queries temporarily but are contractually prohibited 
                    from retaining or training on user data.
                  </p>
               </div>
            </div>

            <div className="flex gap-4 p-6 border border-my-border bg-my-callout/20">
               <Key className="text-my-accent shrink-0 mt-1" size={20} />
               <div>
                  <h5 className="font-bold text-my-ink mb-2">Data Retention &amp; Deletion Rights</h5>
                  <p className="text-sm text-my-muted leading-relaxed">
                    Users retain full control over their data. Account deletion permanently removes user data 
                    from Firestore (reports, stats, notes, settings, shared links) and clears all local state. 
                    Residual backup copies are purged within 30 days. Export history and payment records may 
                    be retained as required by applicable financial regulations. Data portability requests are 
                    fulfilled within 30 days.
                  </p>
               </div>
            </div>

            <div className="flex gap-4 p-6 border border-my-border bg-my-callout/20">
               <BarChart3 className="text-purple-500 shrink-0 mt-1" size={20} />
               <div>
                  <h5 className="font-bold text-my-ink mb-2">Observability &amp; Operational Analytics</h5>
                  <p className="text-sm text-my-muted leading-relaxed">
                    COGNAPSE collects minimal operational telemetry to monitor platform health, detect errors, 
                    and improve service reliability. Telemetry is limited to anonymized event types (e.g., 
                    research completion, export generation, login events). No personal information, search 
                    query content, or research output data is included in telemetry payloads. Telemetry data 
                    is stored in a dedicated, access-restricted Firestore collection and is never shared with 
                    third parties or used for advertising purposes. Users may opt out of non-essential telemetry 
                    collection through account settings.
                  </p>
               </div>
            </div>
         </div>
      </section>

      {/* ─── 3. AI TRANSPARENCY & RESEARCH INTEGRITY ─── */}
      <section id="ai-transparency" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-6 border-b border-my-border pb-2">3. AI Transparency &amp; Research Integrity</h3>

         <div className="space-y-6">
            <div className="p-6 border border-my-border bg-my-callout/20">
               <h4 className="font-bold text-my-ink mb-3 flex items-center gap-2">
                  <Sparkles size={18} className="text-my-accent" /> Multi-Model Consensus Methodology
               </h4>
               <p className="text-sm text-my-muted leading-relaxed">
                 COGNAPSE employs a multi-provider AI swarm architecture designed to surface agreement and 
                 disagreement across models rather than presenting a single authoritative output. The consensus 
                 score represents statistical alignment between models, not empirical truth. When models disagree, 
                 the platform surfaces contradictions explicitly, allowing analysts to evaluate divergent viewpoints 
                 rather than hiding uncertainty.
               </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
               <div className="p-6 border border-my-border bg-my-callout/20">
                  <h4 className="font-bold text-my-ink mb-3 text-sm">Confidence Score Interpretation</h4>
                  <p className="text-xs text-my-muted leading-relaxed">
                    Confidence scores represent the AI model&rsquo;s self-assessed certainty based on available 
                    training data and response coherence. <strong className="text-my-accent">Confidence does not equal 
                    factual accuracy.</strong> A high-confidence output may still contain errors, hallucinations, 
                    or outdated information. Scores should be used as a relative indicator, not an absolute measure 
                    of truth.
                  </p>
                  <p className="text-xs text-my-muted leading-relaxed mt-2 italic border-l-2 border-my-accent/20 pl-3">
                    All quality metrics are displayed using standardized labels (Superior, High, Moderate, Limited, Insufficient) 
                    to support rapid interpretation. These labels correspond to approximate numerical ranges derived from 
                    heuristic computation, domain credibility analysis, and multi-model consensus — not ground-truth 
                    validation. Numerical precision should not be inferred; the underlying scoring methodology produces 
                    approximations suitable for comparative analysis, not absolute measurement. Premium subscribers 
                    have access to raw numerical values for independent technical verification.
                  </p>
               </div>
               <div className="p-6 border border-my-border bg-my-callout/20">
                  <h4 className="font-bold text-my-ink mb-3 text-sm">Relevance Score Interpretation</h4>
                  <p className="text-xs text-my-muted leading-relaxed">
                    Relevance scores indicate the topical alignment between a source and the research query. 
                    A high relevance score means the source addresses the query topic but does not guarantee 
                    the source is authoritative, current, or accurate. Relevance is a measure of topical fit, 
                    not quality.
                  </p>
               </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
               <div className="p-6 border border-my-border bg-my-callout/20">
                  <h4 className="font-bold text-my-ink mb-3 text-sm">Consensus Score Interpretation</h4>
                  <p className="text-xs text-my-muted leading-relaxed">
                    Consensus scores reflect the degree of agreement between multiple AI models or sources on 
                    a given finding. <strong className="text-my-accent">Consensus does not equal factual truth.</strong> 
                    Multiple models may share the same incorrect assumption, training data bias, or knowledge 
                    cutoff limitation. Disagreement between models does not necessarily indicate system failure 
                    — it may reflect genuine uncertainty or legitimate analytical divergence in the underlying data.
                  </p>
               </div>
               <div className="p-6 border border-my-border bg-my-callout/20">
                  <h4 className="font-bold text-my-ink mb-3 text-sm">Contradiction Analysis Methodology</h4>
                  <p className="text-xs text-my-muted leading-relaxed">
                    Contradiction detection identifies conflicting claims across sources or AI models. Contradictions 
                    are flagged with explanatory context to help analysts understand the nature of the disagreement. 
                    Contradictions may arise from: genuine factual disputes, temporal differences (outdated vs. 
                    current data), source quality variation, or AI hallucination. Contradiction detection is a 
                    transparency feature, not a resolution mechanism.
                  </p>
               </div>
            </div>

            <div className="p-6 border border-my-border bg-my-callout/20">
               <h4 className="font-bold text-my-ink mb-3 flex items-center gap-2">
                  <Activity size={18} className="text-blue-500" /> Forensic Reasoning Timeline
               </h4>
               <p className="text-sm text-my-muted leading-relaxed">
                 The Thought Replay Engine provides a scrollable forensic timeline of the AI&rsquo;s analytical 
                 process — from initial query decomposition through source aggregation, contradiction handling, 
                 bias mitigation, and final synthesis. This transparency mechanism allows analysts to inspect 
                 the AI&rsquo;s reasoning path, evaluate the quality of intermediate steps, and identify potential 
                 gaps or weaknesses in the analytical chain. The reasoning timeline is a post-hoc reconstruction 
                 and may not capture all internal model computations.
               </p>
            </div>

            <div className="p-6 border border-my-border bg-my-callout/20">
               <h4 className="font-bold text-my-ink mb-3 flex items-center gap-2">
                  <Gavel size={18} className="text-amber-500" /> Bias Detection &amp; Mitigation
               </h4>
               <p className="text-sm text-my-muted leading-relaxed">
                 The platform includes automated bias alerts that flag potential directional skew in research 
                 outputs. Bias detection is heuristic and may not identify all forms of bias. Users are encouraged 
                 to critically evaluate outputs for their own potential biases in query formulation and 
                 interpretation. Research integrity is a shared responsibility between the platform and the analyst.
               </p>
            </div>
         </div>
      </section>

      {/* ─── 4. RESPONSIBLE AI USAGE ─── */}
      <section id="responsible-ai" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-6 border-b border-my-border pb-2">4. Responsible AI Usage Guidelines</h3>

         <div className="space-y-4">
            <div className="p-6 border border-my-border bg-my-callout/20 flex gap-4">
               <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-1" />
               <div>
                  <h5 className="font-bold text-my-ink mb-2">Do: Verify Critical Information</h5>
                  <p className="text-sm text-my-muted leading-relaxed">
                    Always independently verify factual claims, statistics, and citations from authoritative 
                    primary sources before relying on them for decision-making. The inline verification tools 
                    are designed to assist this process, not replace it.
                  </p>
               </div>
            </div>
            <div className="p-6 border border-my-border bg-my-callout/20 flex gap-4">
               <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-1" />
               <div>
                  <h5 className="font-bold text-my-ink mb-2">Do: Disclose AI Assistance</h5>
                  <p className="text-sm text-my-muted leading-relaxed">
                    When incorporating AI-generated content into professional, academic, or public work, clearly 
                    disclose the AI-assisted nature of the content in accordance with applicable guidelines, 
                    standards, and regulations.
                  </p>
               </div>
            </div>
            <div className="p-6 border border-my-border bg-my-callout/20 flex gap-4">
               <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-1" />
               <div>
                  <h5 className="font-bold text-my-ink mb-2">Do: Apply Critical Thinking</h5>
                  <p className="text-sm text-my-muted leading-relaxed">
                    Use COGNAPSE as an assistive intelligence tool, not an authoritative decision-maker. 
                    Cross-reference outputs with domain expertise, human judgment, and trusted primary sources.
                  </p>
               </div>
            </div>
            <div className="p-6 border border-my-border bg-my-callout/20 flex gap-4">
               <AlertCircle size={20} className="text-amber-500 shrink-0 mt-1" />
               <div>
                  <h5 className="font-bold text-my-ink mb-2">Don&rsquo;t: Use for High-Stakes Decisions Without Human Review</h5>
                  <p className="text-sm text-my-muted leading-relaxed">
                    Do not rely solely on AI-generated outputs for decisions involving legal liability, medical 
                    diagnosis, financial investment, safety-critical systems, or any other high-stakes context 
                    without qualified human review and independent verification.
                  </p>
               </div>
            </div>
            <div className="p-6 border border-my-border bg-my-callout/20 flex gap-4">
               <AlertCircle size={20} className="text-amber-500 shrink-0 mt-1" />
               <div>
                  <h5 className="font-bold text-my-ink mb-2">Don&rsquo;t: Misrepresent AI Outputs</h5>
                  <p className="text-sm text-my-muted leading-relaxed">
                    Do not misrepresent AI-generated content as human-produced, independent research, or 
                    expert analysis. Always maintain transparency about the role of AI in content generation.
                  </p>
               </div>
            </div>
         </div>
      </section>

      {/* ─── 5. COLLABORATION SAFETY ─── */}
      <section id="collaboration-safety" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-6 border-b border-my-border pb-2">5. Collaboration Safety Standards</h3>
         
         <div className="grid md:grid-cols-2 gap-4">
            <div className="p-6 border border-my-border bg-my-callout/20">
               <Share2 className="text-emerald-500 mb-4" size={24} />
               <h4 className="font-bold text-my-ink mb-2">Visibility Controls</h4>
               <p className="text-sm text-my-muted leading-relaxed">
                 Shared research content is governed by granular visibility tiers (Private, Unlisted, Public). 
                 Owners retain full control over access and may disable sharing at any time. Shared links use 
                 cryptographically random identifiers that are not enumerable.
               </p>
            </div>
            <div className="p-6 border border-my-border bg-my-callout/20">
               <Siren className="text-amber-500 mb-4" size={24} />
               <h4 className="font-bold text-my-ink mb-2">Abuse Prevention</h4>
               <p className="text-sm text-my-muted leading-relaxed">
                 COGNAPSE monitors shared content for violations of our Community Guidelines. Reported content 
                 is reviewed, and accounts found to be abusing sharing features for illegal or harmful purposes 
                 may be suspended or terminated. Automated and manual moderation mechanisms are employed.
               </p>
            </div>
         </div>
      </section>

      {/* ─── 6. PREMIUM SUBSCRIPTION SECURITY ─── */}
      <section id="premium-security" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-6 border-b border-my-border pb-2">6. Premium Subscription Security</h3>
         <div className="p-8 bg-my-accent/5 border border-my-accent/20 rounded-sm">
            <div className="flex items-center gap-3 mb-6">
               <Shield className="text-my-accent" size={24} />
               <span className="font-bold uppercase tracking-widest text-xs text-my-ink">Payment Processing &amp; Access Control</span>
            </div>
            <p className="text-sm text-my-muted leading-relaxed mb-6">
              All financial transactions for Premium access are processed securely through Razorpay, a PCI-DSS 
              compliant payment gateway. COGNAPSE does not directly store or process credit card information. 
              Premium status is verified server-side and cached in the user&rsquo;s Firestore profile. Unauthorized 
              access attempts to premium features are blocked at both the client and server level.
            </p>
            <div className="space-y-3 text-xs text-my-muted">
               <div className="flex items-start gap-2"><Lock size={14} className="text-emerald-500 mt-0.5 shrink-0" /> Payment instrument data never touches COGNAPSE servers.</div>
               <div className="flex items-start gap-2"><Lock size={14} className="text-emerald-500 mt-0.5 shrink-0" /> Premium status is verified via a secure serverless API endpoint.</div>
               <div className="flex items-start gap-2"><Lock size={14} className="text-emerald-500 mt-0.5 shrink-0" /> Payment verification employs cryptographic signature validation.</div>
            </div>
         </div>
      </section>

      {/* ─── 7. INCIDENT RESPONSE ─── */}
      <section id="incident-response" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-6 border-b border-my-border pb-2">7. Incident Response Philosophy</h3>
         <p className="text-sm text-my-muted leading-relaxed max-w-3xl mb-6">
           COGNAPSE maintains a structured incident response approach to address security events, service 
           disruptions, and data protection incidents:
         </p>
         <div className="relative border-l border-my-accent/30 pl-8 space-y-10">
            <div className="relative">
               <div className="absolute -left-[37px] top-1 w-4 h-4 bg-my-bg border-2 border-emerald-500 rounded-full" />
               <h5 className="font-bold text-my-ink mb-1">Detection &amp; Assessment</h5>
               <p className="text-xs text-my-muted">Operational telemetry and monitoring systems detect anomalies. Incidents are categorized by severity and impact.</p>
            </div>
            <div className="relative">
               <div className="absolute -left-[37px] top-1 w-4 h-4 bg-my-bg border-2 border-blue-500 rounded-full" />
               <h5 className="font-bold text-my-ink mb-1">Containment &amp; Analysis</h5>
               <p className="text-xs text-my-muted">Immediate steps are taken to contain the incident while forensic analysis determines root cause and scope.</p>
            </div>
            <div className="relative">
               <div className="absolute -left-[37px] top-1 w-4 h-4 bg-my-bg border-2 border-amber-500 rounded-full" />
               <h5 className="font-bold text-my-ink mb-1">Remediation &amp; Notification</h5>
               <p className="text-xs text-my-muted">Affected systems are restored. Affected users are notified in accordance with applicable legal and regulatory requirements.</p>
            </div>
            <div className="relative">
               <div className="absolute -left-[37px] top-1 w-4 h-4 bg-my-bg border-2 border-purple-500 rounded-full" />
               <h5 className="font-bold text-my-ink mb-1">Post-Mortem &amp; Prevention</h5>
               <p className="text-xs text-my-muted">Incidents are documented, preventive measures are implemented, and security controls are updated to prevent recurrence.</p>
            </div>
         </div>
      </section>

      {/* ─── 8. INFRASTRUCTURE RELIABILITY ─── */}
      <section id="reliability" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-4 border-b border-my-border pb-2">8. Infrastructure &amp; Operational Reliability</h3>
         <div className="p-8 bg-my-accent/5 border border-my-accent/20 rounded-sm">
            <div className="flex items-center gap-3 mb-6">
               <Activity className="text-my-accent" size={24} />
               <span className="font-bold uppercase tracking-widest text-xs text-my-ink">Hosting &amp; Dependencies</span>
            </div>
            <p className="text-sm text-my-muted leading-relaxed mb-6">
              The COGNAPSE web application is hosted on Vercel&rsquo;s edge network. Database and authentication 
              services are provided by Google Cloud (Firebase/Firestore). AI inference is powered by Groq 
              and Google Gemini APIs. The AI Swarm includes automatic failover between providers to 
              mitigate individual service disruptions.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-my-accent/10 pt-6 mt-6">
               <div>
                  <div className="text-2xl font-bold text-my-ink">99.9%</div>
                  <div className="text-xs text-my-accent font-bold uppercase tracking-widest mt-1">Vercel Uptime Target</div>
               </div>
               <div>
                  <div className="text-2xl font-bold text-my-ink">Multi-Reg</div>
                  <div className="text-xs text-my-accent font-bold uppercase tracking-widest mt-1">Firestore Config</div>
               </div>
               <div>
                  <div className="text-2xl font-bold text-my-ink">Auto-Failover</div>
                  <div className="text-xs text-my-accent font-bold uppercase tracking-widest mt-1">AI Swarm Resiliency</div>
               </div>
               <div>
                  <div className="text-2xl font-bold text-my-ink">TLS 1.3</div>
                  <div className="text-xs text-my-accent font-bold uppercase tracking-widest mt-1">Transit Encryption</div>
               </div>
            </div>
         </div>
      </section>

      {/* ─── 9. OBSERVABILITY & TELEMETRY ─── */}
      <section id="observability" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-6 border-b border-my-border pb-2">9. Observability &amp; Telemetry Governance</h3>
         
         <div className="p-6 border border-my-border bg-my-callout/20">
            <p className="text-sm text-my-muted leading-relaxed mb-4">
              COGNAPSE employs lightweight, privacy-conscious operational telemetry to monitor platform health, 
              detect errors, and improve service reliability. Our telemetry governance framework ensures:
            </p>
            <ul className="space-y-3 text-xs text-my-muted">
               <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" /> <strong>Minimal Collection:</strong> Telemetry is limited to anonymized event types (research completions, export generation, login events, error signatures).</li>
               <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" /> <strong>No Content Collection:</strong> Telemetry payloads do not include search query text, research output content, or personal identifying information.</li>
               <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" /> <strong>Access Control:</strong> Telemetry data is stored in a dedicated Firestore collection with restricted access governance.</li>
               <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" /> <strong>No Third-Party Sharing:</strong> Telemetry data is used exclusively for operational improvement and is never shared with third parties or used for advertising.</li>
               <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" /> <strong>Operational Purpose:</strong> Telemetry enables error detection, performance monitoring, and capacity planning — not user profiling or behavioral tracking.</li>
            </ul>
         </div>
      </section>

    </div>
  );
}
