import React from 'react';
import { Scale, AlertTriangle, ShieldAlert, FileText, Gavel, Share2, Globe, Lock, Eye, BookOpen, Ban, UserX, Copyright, Cookie, Siren, Users } from 'lucide-react';

export default function LegalDocs() {
  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
      
      {/* Overview Section */}
      <section id="legal-overview" className="scroll-mt-32 space-y-8">
        <div>
          <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.3em] text-[10px] mb-4">
            <div className="w-10 h-px bg-my-accent" /> Section_05
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold italic text-my-ink mb-6">Legal &amp; Compliance</h2>
          <p className="text-xl font-light leading-relaxed text-my-muted max-w-3xl">
            By accessing the COGNAPSE platform, you agree to the following terms, policies, and governance frameworks 
            governing platform usage, data handling, intellectual property, and liability.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
            <Scale className="text-my-accent mb-4" size={24} />
            <h4 className="font-bold text-sm text-my-ink mb-2">Enterprise Terms</h4>
            <p className="text-xs text-my-muted leading-relaxed">Legally binding terms governing access, usage, payments, and platform conduct.</p>
          </div>
          <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
            <ShieldAlert className="text-emerald-500 mb-4" size={24} />
            <h4 className="font-bold text-sm text-my-ink mb-2">Data Governance</h4>
            <p className="text-xs text-my-muted leading-relaxed">Privacy-first data handling, local storage defaults, and transparent data practices.</p>
          </div>
          <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
            <Gavel className="text-amber-500 mb-4" size={24} />
            <h4 className="font-bold text-sm text-my-ink mb-2">Compliance Framework</h4>
            <p className="text-xs text-my-muted leading-relaxed">AI transparency, copyright governance, collaboration rules, and abuse prevention.</p>
          </div>
        </div>
      </section>

      {/* ─── 1. TERMS OF SERVICE ─── */}
      <section id="terms" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <div className="flex items-center gap-3">
           <FileText className="text-my-ink" size={28} />
           <h3 className="text-2xl font-bold text-my-ink border-b border-my-border pb-2 flex-1">Terms of Service</h3>
         </div>
         <p className="text-sm text-my-muted leading-relaxed max-w-3xl">
           These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User,&rdquo; &ldquo;Analyst,&rdquo; or &ldquo;you&rdquo;) and COGNAPSE 
           (&ldquo;the Platform,&rdquo; &ldquo;we,&rdquo; or &ldquo;us&rdquo;) governing your access to and use of the COGNAPSE research and intelligence platform, 
           including any associated websites, APIs, extensions, and services (collectively, the &ldquo;Service&rdquo;).
         </p>

         <div className="space-y-6">
            {/* 1.1 Account Registration */}
            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest flex items-center gap-2">
                  <UserX size={16} className="text-my-accent" /> 1.1 Account Registration &amp; Security
               </h4>
               <p className="text-xs text-my-muted leading-relaxed mb-3">
                 You are responsible for maintaining the confidentiality of your authentication credentials and for all 
                 activities that occur under your account. You agree to notify us immediately of any unauthorized access 
                 or security breach. You must be at least 13 years of age to use the Service. Accounts registered by 
                 automated methods or bots are prohibited.
               </p>
               <p className="text-xs text-my-muted leading-relaxed">
                 COGNAPSE reserves the right to suspend or terminate accounts that violate these Terms or exhibit 
                 suspicious activity, including but not limited to: automated scraping, abuse of AI infrastructure, 
                 or unauthorized commercial exploitation of the Service.
               </p>
            </div>

            {/* 1.2 Service Description & Limitations */}
            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest flex items-center gap-2">
                  <Globe size={16} className="text-blue-500" /> 1.2 Service Description &amp; Limitations
               </h4>
               <p className="text-xs text-my-muted leading-relaxed mb-3">
                 COGNAPSE provides an AI-assisted research and information synthesis platform. The Service utilizes 
                 Large Language Models (LLMs) from multiple third-party providers to generate research reports, 
                 intelligence feeds, and analytical content. The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
               </p>
               <p className="text-xs text-my-muted leading-relaxed">
                 We do not guarantee that the Service will be uninterrupted, timely, secure, or error-free. Platform 
                 functionality depends on third-party AI providers (Groq, Google Gemini), cloud infrastructure (Vercel, 
                 Firebase/Firestore), and payment processing (Razorpay). COGNAPSE is not liable for service interruptions, 
                 data loss, or API deprecations resulting from these third-party dependencies.
               </p>
            </div>

            {/* 1.3 Acceptable Use */}
            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest flex items-center gap-2">
                  <Ban size={16} className="text-red-500" /> 1.3 Acceptable Use Policy
               </h4>
               <p className="text-xs text-my-muted leading-relaxed mb-3">
                 You agree not to use the Service to:
               </p>
               <ul className="list-disc pl-5 space-y-1.5 text-xs text-my-muted leading-relaxed">
                 <li>Generate, distribute, or promote illegal content, hate speech, harassment, or defamatory material.</li>
                 <li>Violate any applicable local, national, or international law or regulation.</li>
                 <li>Infringe upon the intellectual property rights of any third party.</li>
                 <li>Attempt to reverse engineer, decompile, or extract the source code of the platform or its AI systems.</li>
                 <li>Use automated scripts, bots, or scraping tools to access the Service without explicit written authorization.</li>
                 <li>Engage in any activity that could damage, disable, overburden, or impair the platform&rsquo;s infrastructure.</li>
                 <li>Submit sensitive personal information, financial data, or protected health information through the research system.</li>
                 <li>Use the platform for purposes that could result in physical harm, property damage, or financial loss.</li>
                 <li>Falsely represent the provenance, accuracy, or authenticity of AI-generated content as human-produced.</li>
                 <li>Exploit shared research features to distribute malware, phishing links, or other harmful content.</li>
               </ul>
            </div>

            {/* 1.4 Payments & Subscriptions */}
            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest flex items-center gap-2">
                  <Lock size={16} className="text-emerald-500" /> 1.4 Payments, Subscriptions &amp; Refunds
               </h4>
               <p className="text-xs text-my-muted leading-relaxed mb-3">
                 All financial transactions for Premium access (Monthly or Annual passes) are processed securely 
                 through Razorpay, a PCI-DSS compliant payment gateway. COGNAPSE does not directly store or process 
                 credit card information. We are not liable for any payment processing errors, unauthorized charges, 
                 or data breaches occurring at the payment processor level.
               </p>
               <p className="text-xs text-my-muted leading-relaxed mb-3">
                 <strong className="text-my-accent">Refund Policy:</strong> All subscription payments are final and 
                 non-refundable unless otherwise mandated by applicable law. Cancellation of a subscription will 
                 prevent future billing, but no prorated refunds will be issued for the current billing cycle. 
                 Premium access is verified server-side and may be revoked if payment processing fails or if 
                 fraudulent activity is detected.
               </p>
               <p className="text-xs text-my-muted leading-relaxed">
                 COGNAPSE reserves the right to modify subscription pricing with 30 days&rsquo; notice. Existing 
                 subscribers will be grandfathered at their current rate until their next renewal date.
               </p>
            </div>

            {/* 1.5 Account Suspension & Termination */}
            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest flex items-center gap-2">
                  <UserX size={16} className="text-amber-500" /> 1.5 Account Suspension &amp; Termination
               </h4>
               <p className="text-xs text-my-muted leading-relaxed mb-3">
                 COGNAPSE reserves the right to suspend or terminate any account at our sole discretion, without 
                 prior notice or liability, for any reason including but not limited to:
               </p>
               <ul className="list-disc pl-5 space-y-1.5 text-xs text-my-muted leading-relaxed">
                 <li>Breach of these Terms of Service or any incorporated policies.</li>
                 <li>Violation of the Acceptable Use Policy outlined in Section 1.3.</li>
                 <li>Suspected fraudulent, abusive, or illegal activity.</li>
                 <li>Non-payment of subscription fees.</li>
                 <li>Request by law enforcement or other government agencies.</li>
                 <li>Extended periods of inactivity.</li>
               </ul>
               <p className="text-xs text-my-muted leading-relaxed mt-3">
                 Upon termination, your right to use the Service will immediately cease. You may request a copy of 
                 your data within 30 days of termination; thereafter, we may permanently delete all associated data 
                 in accordance with our data retention policies.
               </p>
            </div>

            {/* 1.6 Limitation of Liability */}
            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" /> 1.6 Limitation of Liability
               </h4>
               <p className="text-xs text-my-muted leading-relaxed mb-3">
                 To the maximum extent permitted by applicable law, COGNAPSE and its operators, affiliates, and 
                 licensors shall not be liable for any indirect, incidental, special, consequential, or punitive 
                 damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss 
                 of data, use, goodwill, or other intangible losses, resulting from:
               </p>
               <ul className="list-disc pl-5 space-y-1.5 text-xs text-my-muted leading-relaxed">
                 <li>Your use or inability to use the Service.</li>
                 <li>Any content generated by the AI systems, including inaccuracies, hallucinations, or omissions.</li>
                 <li>Unauthorized access to or alteration of your transmissions or data.</li>
                 <li>Statements or conduct of any third party on the Service.</li>
                 <li>Any interruption or cessation of transmission to or from the Service.</li>
               </ul>
               <p className="text-xs text-my-muted leading-relaxed mt-3">
                 Our total liability to you for any claim arising out of or relating to these Terms or the Service 
                 shall not exceed the greater of the amount you have paid us in the twelve (12) months preceding 
                 the event giving rise to the liability, or one hundred US dollars ($100).
               </p>
            </div>

            {/* 1.7 Indemnification */}
            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">1.7 Indemnification</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 You agree to defend, indemnify, and hold harmless COGNAPSE, its affiliates, licensors, and service 
                 providers from and against any claims, liabilities, damages, judgments, awards, losses, costs, 
                 expenses, or fees (including reasonable attorneys&rsquo; fees) arising out of or relating to your 
                 violation of these Terms, your use of the Service, or your violation of any third-party rights, 
                 including intellectual property rights.
               </p>
            </div>

            {/* 1.8 Service Modifications */}
            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">1.8 Modifications to the Service</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 COGNAPSE reserves the right to modify, suspend, or discontinue the Service (or any part thereof) 
                 at any time with or without notice. We shall not be liable to you or any third party for any 
                 modification, suspension, or discontinuation of the Service. Material changes to these Terms 
                 will be communicated through the platform and continued use constitutes acceptance.
               </p>
            </div>
         </div>
      </section>

      {/* ─── 2. PRIVACY POLICY ─── */}
      <section id="privacy" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <div className="flex items-center gap-3">
           <ShieldAlert className="text-emerald-500" size={28} />
           <h3 className="text-2xl font-bold text-my-ink border-b border-my-border pb-2 flex-1">Privacy Policy</h3>
         </div>
         <p className="text-sm text-my-muted leading-relaxed max-w-3xl">
           COGNAPSE follows a privacy-first methodology regarding user data collection, processing, and storage. 
           This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you 
           use our platform.
         </p>

         <div className="space-y-6">
            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">2.1 Information We Collect</h4>
               <ul className="list-disc pl-5 space-y-2 text-xs text-my-muted leading-relaxed">
                 <li><strong>Authentication Data:</strong> Email addresses and encrypted authentication tokens are collected via Firebase Auth for account creation and login purposes.</li>
                 <li><strong>Research Queries:</strong> User-submitted queries and uploaded documents are processed to fulfill research requests. Query history is stored locally by default and synced to Firestore when authenticated.</li>
                 <li><strong>Gamification Data:</strong> XP, rank, search count, streak data, and badge achievements are stored to support the analyst progression system.</li>
                 <li><strong>Shared Research Content:</strong> When you create a shared research link, the report data is stored in Firestore with your selected visibility tier.</li>
                 <li><strong>Payment Data:</strong> All payment information is processed and stored by Razorpay. COGNAPSE does not collect or store credit card numbers, bank details, or payment instrument data.</li>
               </ul>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">2.2 How We Use Your Information</h4>
               <ul className="list-disc pl-5 space-y-2 text-xs text-my-muted leading-relaxed">
                 <li>To provide, maintain, and improve the Service.</li>
                 <li>To process research queries and generate analytical reports.</li>
                 <li>To synchronize data across devices when you are authenticated.</li>
                 <li>To process premium subscription payments and verify access rights.</li>
                 <li>To monitor platform usage, detect abuse, and ensure compliance with our Terms.</li>
                 <li>To communicate administrative announcements and material policy changes.</li>
               </ul>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">2.3 Data Storage &amp; Processing</h4>
               <p className="text-xs text-my-muted leading-relaxed mb-3">
                 The majority of data processing occurs locally on the user&rsquo;s device. AI inference is performed 
                 via cloud APIs, but report storage defaults to local IndexedDB. Cloud synchronization via Firebase 
                 Firestore is optional and occurs only when the user is authenticated.
               </p>
               <p className="text-xs text-my-muted leading-relaxed">
                 AI providers (Groq, Gemini, and Ollama when configured locally) process queries temporarily. 
                 We contractually require our AI providers to not retain or train on our users&rsquo; data. For local 
                 Ollama deployments, all processing occurs on your hardware and no data leaves your network.
               </p>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">2.4 Data Retention &amp; Deletion</h4>
               <p className="text-xs text-my-muted leading-relaxed mb-3">
                 User data is retained for as long as your account is active or as needed to provide the Service. 
                 You have the right to request the deletion of your account and associated data at any time.
               </p>
               <p className="text-xs text-my-muted leading-relaxed">
                 Initiating account deletion from the Operative Status panel will permanently remove user data 
                 from Firestore (reports, stats, notes, settings, shared links) and clear all local state. 
                 Residual copies may remain in backup systems for up to 30 days before permanent deletion.
                 Export history and payment records may be retained as required by applicable financial regulations.
               </p>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">2.5 Third-Party Data Sharing</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 We do not sell, trade, or rent your personal information to third parties. We may share anonymized, 
                 aggregated data for platform analytics and improvement purposes. We may disclose information if 
                 required by law, legal process, or governmental request, or to protect the rights, property, or 
                 safety of COGNAPSE, our users, or the public.
               </p>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">2.6 Data Portability</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 Upon request, we will provide you with a copy of your personal data in a structured, commonly 
                 used, and machine-readable format. This request can be initiated by contacting our support team. 
                 We will fulfill data portability requests within 30 days.
               </p>
            </div>
         </div>
      </section>

      {/* ─── 3. COOKIE POLICY ─── */}
      <section id="cookie-policy" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <div className="flex items-center gap-3">
           <Cookie className="text-amber-500" size={28} />
           <h3 className="text-2xl font-bold text-my-ink border-b border-my-border pb-2 flex-1">Cookie Policy</h3>
         </div>

         <div className="space-y-6">
            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">3.1 How We Use Cookies</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 COGNAPSE uses minimal browser storage to enhance platform functionality. We do not use third-party 
                 tracking cookies, advertising cookies, or cross-site tracking mechanisms. The following storage 
                 mechanisms are employed:
               </p>
               <ul className="list-disc pl-5 space-y-2 text-xs text-my-muted leading-relaxed mt-3">
                 <li><strong>LocalForage (IndexedDB):</strong> Primary data persistence for research reports, settings, and gamification data. This data never leaves your browser unless you authenticate and opt into cloud sync.</li>
                 <li><strong>Firebase Authentication Tokens:</strong> Short-lived JWT tokens stored in browser memory/IndexedDB to maintain authenticated sessions.</li>
                 <li><strong>Local Storage:</strong> Theme preference and a minimal hydration flag for Zustand persist middleware.</li>
               </ul>
            </div>
            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">3.2 Your Choices</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 You can clear all locally stored data at any time through your browser&rsquo;s privacy settings. 
                 Clearing browser data will reset your local configuration but will not affect data stored in 
                 the cloud vault (if you are authenticated). You may disable local storage in your browser 
                 settings, but this may impact core platform functionality.
               </p>
            </div>
         </div>
      </section>

      {/* ─── 4. AI LIABILITY DISCLAIMER ─── */}
      <section id="ai-disclaimer" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <div className="flex items-center gap-3">
           <AlertTriangle className="text-red-500" size={28} />
           <h3 className="text-2xl font-bold text-my-ink border-b border-my-border pb-2 flex-1">AI-Generated Content &amp; Liability</h3>
         </div>

         <div className="space-y-6">
            <div className="p-8 border border-red-500/30 bg-red-500/5 rounded-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Gavel size={100} />
               </div>
               <h4 className="text-sm font-bold text-red-400 mb-4 uppercase tracking-widest">4.1 Limitations of AI-Generated Research</h4>
               <p className="text-xs text-my-muted leading-relaxed font-semibold mb-4">
                 COGNAPSE utilizes Large Language Models (LLMs) from multiple providers including Groq and Google 
                 Gemini. While the platform is designed to assist with research and information synthesis, the 
                 underlying technology is statistical and has inherent limitations:
               </p>
               <ul className="list-disc pl-5 space-y-2 text-xs text-my-muted leading-relaxed">
                 <li><strong>Hallucinations:</strong> AI models may produce information that appears factual but is inaccurate, fabricated, or nonsensical.</li>
                 <li><strong>Source Fabrication:</strong> AI systems may generate citations, references, or source attributions that do not correspond to real documents.</li>
                 <li><strong>Temporal Limitations:</strong> AI models have knowledge cutoffs and may not reflect current events, recent research, or updated information.</li>
                 <li><strong>Confidence Does Not Equal Certainty:</strong> Confidence scores, credibility ratings, and consensus metrics are derived from model self-assessment and cross-verification heuristics, not ground-truth validation.</li>
                 <li><strong>Consensus Does Not Equal Factual Truth:</strong> Multi-model agreement indicates statistical alignment, not empirical correctness.</li>
                 <li><strong>Contradictions Do Not Indicate System Failure:</strong> Conflicting outputs across sources or models may reflect genuine disagreement in the underlying data rather than system error.</li>
               </ul>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">4.2 Not Professional Advice</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 The information generated by COGNAPSE is for research, informational, and analytical purposes only. 
                 It should not be construed as financial, medical, legal, academic, engineering, or any other form of 
                 professional advice. Users should consult qualified professionals before making decisions based on 
                 platform output. AI-generated research is assistive intelligence, not guaranteed factual authority.
               </p>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">4.3 Independent Verification</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 The platform encourages and expects users to independently verify all factual claims, source 
                 citations, and analytical conclusions before relying on them. The inline source verification 
                 system, Google Search integration, and credibility scoring are tools to assist in this process, 
                 not substitutes for critical evaluation. Users are responsible for exercising independent 
                 judgment regarding the accuracy, completeness, and appropriateness of generated content.
               </p>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">4.4 Model Variability &amp; Provider Reliability</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 Different AI models may produce divergent outputs for identical queries. The multi-provider 
                 swarm architecture is designed to surface these differences through contradiction analysis, 
                 not to eliminate them. Provider availability, response quality, and latency vary based on 
                 third-party infrastructure outside COGNAPSE&rsquo;s control.
               </p>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">4.5 AI-Generated Content Disclosure</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 All content generated by COGNAPSE is produced by artificial intelligence systems. Users who 
                 export, share, or redistribute AI-generated research are responsible for clearly disclosing 
                 the AI-assisted nature of the content where required by applicable law or professional standards. 
                 Misrepresenting AI-generated content as human-produced may violate these Terms and applicable 
                 regulations.
               </p>
            </div>
         </div>
      </section>

      {/* ─── 5. INTELLECTUAL PROPERTY & COPYRIGHT ─── */}
      <section id="ip-rights" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <div className="flex items-center gap-3">
           <Copyright className="text-blue-500" size={28} />
           <h3 className="text-2xl font-bold text-my-ink border-b border-my-border pb-2 flex-1">Intellectual Property &amp; Copyright</h3>
         </div>

         <div className="space-y-6">
            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">5.1 Platform Ownership</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 The COGNAPSE platform, including its codebase, design systems, architectural patterns, brand 
                 identity, and proprietary algorithms, is the exclusive intellectual property of COGNAPSE and 
                 its licensors. You may not reproduce, distribute, modify, create derivative works from, or 
                 reverse engineer any portion of the platform without explicit written authorization.
               </p>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">5.2 User-Generated Content &amp; Research Outputs</h4>
               <p className="text-xs text-my-muted leading-relaxed mb-3">
                 You retain ownership of any research queries, prompts, notes, and analytical content you create 
                 using the platform (&ldquo;User Content&rdquo;). You grant COGNAPSE a worldwide, non-exclusive, royalty-free 
                 license to store, process, synchronize, and display your User Content solely for the purpose of 
                 providing the Service to you.
               </p>
               <p className="text-xs text-my-muted leading-relaxed">
                 Users are solely responsible for ensuring they have the legal right to submit, process, and export 
                 any content that includes third-party materials, copyrighted works, or proprietary information. 
                 You represent and warrant that your User Content does not infringe upon any third-party intellectual 
                 property rights.
               </p>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">5.3 Copyrighted Source Material</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 The AI swarm may reference, summarize, or synthesize information from copyrighted source materials 
                 during research generation. COGNAPSE does not host, store, or distribute copyrighted content. 
                 Users are responsible for ensuring that their use of generated research, including any referenced 
                 or synthesized copyrighted material, complies with applicable copyright laws and fair-use 
                 provisions. Users bear all responsibility for the lawful usage and redistribution of exported 
                 and shared content.
               </p>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">5.4 DMCA Takedown Procedure</h4>
               <p className="text-xs text-my-muted leading-relaxed mb-3">
                 COGNAPSE respects intellectual property rights and complies with the Digital Millennium Copyright 
                 Act (DMCA). If you believe that content available through the platform infringes your copyright, 
                 please provide our designated agent with a written notice containing:
               </p>
               <ul className="list-disc pl-5 space-y-1.5 text-xs text-my-muted leading-relaxed">
                 <li>A physical or electronic signature of the copyright owner or authorized representative.</li>
                 <li>Identification of the copyrighted work claimed to have been infringed.</li>
                 <li>Identification of the material that is claimed to be infringing, with sufficient detail to locate it.</li>
                 <li>Your contact information (address, telephone number, and email address).</li>
                 <li>A statement that you have a good faith belief that the use is not authorized by the copyright owner.</li>
                 <li>A statement that the information in the notice is accurate and, under penalty of perjury, that you are authorized to act on behalf of the copyright owner.</li>
               </ul>
               <p className="text-xs text-my-muted leading-relaxed mt-3">
                 Upon receipt of a valid DMCA notice, we will expeditiously remove or disable access to the 
                 allegedly infringing content and take reasonable steps to notify the user who posted it.
               </p>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">5.5 Fair Use &amp; Research Purpose</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 COGNAPSE is designed as a research and analytical tool. The platform&rsquo;s use of third-party 
                 content for AI training, synthesis, and analysis is positioned under fair-use principles for 
                 research, commentary, and educational purposes. This does not constitute legal advice regarding 
                 your specific use case. Users should independently evaluate whether their use of generated 
                 content qualifies as fair use in their jurisdiction.
               </p>
            </div>
         </div>
      </section>

      {/* ─── 6. COLLABORATION GOVERNANCE & COMMUNITY GUIDELINES ─── */}
      <section id="collaboration" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <div className="flex items-center gap-3">
           <Users className="text-emerald-500" size={28} />
           <h3 className="text-2xl font-bold text-my-ink border-b border-my-border pb-2 flex-1">Collaboration Governance &amp; Community Guidelines</h3>
         </div>

         <div className="space-y-6">
            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">6.1 Shared Research Governance</h4>
               <p className="text-xs text-my-muted leading-relaxed mb-3">
                 When you share a research report, you create a read-only view accessible according to the 
                 visibility tier you select:
               </p>
               <ul className="list-disc pl-5 space-y-1.5 text-xs text-my-muted leading-relaxed">
                 <li><strong className="text-my-accent">Private:</strong> Accessible only to the report owner.</li>
                 <li><strong className="text-my-accent">Unlisted:</strong> Accessible to anyone with the direct link, but not indexed or publicly discoverable through the platform.</li>
                 <li><strong className="text-my-accent">Public:</strong> Accessible to anyone with the direct link.</li>
               </ul>
               <p className="text-xs text-my-muted leading-relaxed mt-3">
                 Owners retain full control over shared content and may disable shared links at any time, 
                 immediately rendering them inaccessible. Disabling a shared link does not affect copies that 
                 may have been created by collaborators who duplicated the document to their own accounts.
               </p>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">6.3 Community Guidelines</h4>
               <p className="text-xs text-my-muted leading-relaxed mb-3">
                 All users are expected to adhere to the following standards of conduct when using the platform&rsquo;s 
                 collaborative and sharing features:
               </p>
               <ul className="list-disc pl-5 space-y-1.5 text-xs text-my-muted leading-relaxed">
                 <li>Do not share illegal content, including material that violates intellectual property laws, privacy laws, or export controls.</li>
                 <li>Do not use shared research to harass, intimidate, defame, or threaten individuals or groups.</li>
                 <li>Do not share sensitive personal information (PII), financial data, or protected health information through shared links.</li>
                 <li>Do not share content that incites violence, promotes terrorism, or glorifies harmful activities.</li>
                 <li>Do not use the Collaboration feature to distribute spam, advertisements, or promotional content unrelated to research.</li>
                 <li>Do not exploit shared research to distribute malware, phishing links, or other harmful resources.</li>
                 <li>Do not misrepresent the authorship or provenance of shared research.</li>
                 <li>Do not use shared research to manipulate markets, spread disinformation, or coordinate illegal activities.</li>
               </ul>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">6.4 Abuse Reporting &amp; Moderation</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 If you encounter content that violates these Community Guidelines or Terms of Service, please 
                 report it through the platform&rsquo;s reporting mechanism or by contacting our team. COGNAPSE 
                 reserves the right to investigate reported content and take appropriate action, including 
                 removing content, disabling shared links, or suspending accounts. We are committed to 
                 maintaining a safe and professional research environment and will respond promptly to 
                 legitimate abuse reports.
               </p>
            </div>

         </div>
      </section>

      {/* ─── 7. EXPORT & REDISTRIBUTION ─── */}
      <section id="export-policy" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <div className="flex items-center gap-3">
           <Share2 className="text-purple-500" size={28} />
           <h3 className="text-2xl font-bold text-my-ink border-b border-my-border pb-2 flex-1">Export, Report Usage &amp; Redistribution</h3>
         </div>

         <div className="space-y-6">
            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">7.1 PDF Export Usage</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 PDF dossiers generated through the Premium export feature are provided for personal, research, 
                 and analytical purposes. Users who redistribute exported reports are responsible for ensuring 
                 compliance with applicable laws, including copyright law, data protection regulations, and 
                 professional standards. Exported reports prominently display AI-generated content disclosures. 
                 Users must not remove or obscure these disclosures when redistributing exported content.
               </p>
            </div>

            <div className="p-6 border border-my-border bg-my-sidebar/10 rounded-sm">
               <h4 className="text-sm font-bold text-my-ink mb-3 uppercase tracking-widest">7.2 Redistribution Limitations</h4>
               <p className="text-xs text-my-muted leading-relaxed">
                 Users may not systematically extract, scrape, or redistribute significant portions of platform 
                 content for commercial purposes without explicit written authorization. This includes, but is 
                 not limited to, using COGNAPSE outputs to train competing AI models, populate external databases 
                 for commercial sale, or operate content aggregation services.
               </p>
            </div>
         </div>
      </section>

      {/* ─── 8. GOVERNING LAW ─── */}
      <section id="governing-law" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <div className="flex items-center gap-3">
           <Scale className="text-slate-500" size={28} />
           <h3 className="text-2xl font-bold text-my-ink border-b border-my-border pb-2 flex-1">Governing Law &amp; Dispute Resolution</h3>
         </div>
         <p className="text-sm text-my-muted leading-relaxed max-w-3xl">
           These Terms shall be governed by and construed in accordance with Indian law. Any disputes arising 
           out of or relating to these Terms or the Service shall be resolved through binding arbitration in 
           accordance with the Arbitration and Conciliation Act, 1996. The seat of arbitration shall be Mumbai, 
           India. You agree that any cause of action arising out of or related to the Service must commence 
           within one (1) year after the cause of action accrues; otherwise, such cause of action is permanently barred.
         </p>
      </section>

    </div>
  );
}
