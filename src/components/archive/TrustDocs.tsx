import React from 'react';
import { Shield, Fingerprint, Lock, Activity, EyeOff, Key } from 'lucide-react';

export default function TrustDocs() {
  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
      
      {/* Overview Section */}
      <section id="trust-overview" className="scroll-mt-32 space-y-8">
        <div>
          <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.4em] text-[10px] mb-4">
            <div className="w-10 h-px bg-my-accent" /> Section_06
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold italic text-my-ink mb-6">Security Center</h2>
          <p className="text-xl font-light leading-relaxed text-my-muted max-w-3xl">
            Information regarding platform security and data architecture. COGNAPSE is designed to prioritize data privacy through local storage and secure cloud synchronization.
          </p>
        </div>
      </section>

      {/* Security Architecture */}
      <section id="security-model" className="scroll-mt-32 space-y-8">
         <div className="grid md:grid-cols-2 gap-4">
            <div className="p-8 border border-my-border bg-my-sidebar/10 rounded-sm">
               <Fingerprint className="text-my-accent mb-6" size={28} />
               <h4 className="text-lg font-bold text-my-ink mb-3">Identity Access Management</h4>
               <p className="text-sm text-my-muted leading-relaxed">
                 User authentication is handled by Firebase Auth using JSON Web Tokens (JWTs). 
                 We do not store or manage passwords directly. User sessions are monitored and can be invalidated based on inactivity or security policies.
               </p>
            </div>
            <div className="p-8 border border-my-border bg-my-sidebar/10 rounded-sm">
               <Lock className="text-blue-500 mb-6" size={28} />
               <h4 className="text-lg font-bold text-my-ink mb-3">Database Security</h4>
               <p className="text-sm text-my-muted leading-relaxed">
                 Direct database access from the client is restricted. Data synchronization uses Firestore Security Rules 
                 to validate that a user's unique ID matches the document ownership metadata before permitting read or write operations.
               </p>
            </div>
         </div>
      </section>

      {/* Data Isolation */}
      <section id="data-isolation" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-4 border-b border-my-border pb-2">Data Privacy & Storage</h3>
         
         <div className="space-y-4">
            <div className="flex gap-4 p-6 border border-my-border bg-my-callout/20">
               <EyeOff className="text-emerald-500 shrink-0 mt-1" size={20} />
               <div>
                  <h5 className="font-bold text-my-ink mb-2">Local Data Persistence</h5>
                  <p className="text-sm text-my-muted leading-relaxed">
                    The application defaults to storing data locally on the user's device using LocalForage (IndexedDB). Users retain access to their locally saved information even when disconnected from cloud services.
                  </p>
               </div>
            </div>
            
            <div className="flex gap-4 p-6 border border-my-border bg-my-callout/20">
               <Key className="text-my-accent shrink-0 mt-1" size={20} />
               <div>
                  <h5 className="font-bold text-my-ink mb-2">Secure Link Sharing</h5>
                  <p className="text-sm text-my-muted leading-relaxed">
                    When a user opts to share a document, the platform generates a unique, secure URL. 
                    This creates a read-only view of the document. If a collaborator chooses to duplicate the document, it creates a separate instance under their account, leaving the original document unmodified.
                  </p>
               </div>
            </div>
         </div>
      </section>

      {/* Infrastructure Reliability */}
      <section id="reliability" className="scroll-mt-32 space-y-8 border-t border-my-border pt-16">
         <h3 className="text-2xl font-bold text-my-ink mb-4 border-b border-my-border pb-2">Infrastructure Hosting</h3>
         <div className="p-8 bg-my-accent/5 border border-my-accent/20 rounded-sm">
            <div className="flex items-center gap-3 mb-6">
               <Activity className="text-my-accent" size={24} />
               <span className="font-bold uppercase tracking-widest text-xs text-my-ink">Cloud Providers</span>
            </div>
            <p className="text-sm text-my-muted leading-relaxed mb-6">
              The COGNAPSE web application is hosted on Vercel. Database and synchronization services are provided by Google Cloud (Firebase). Note that application functionality is dependent on the availability of third-party API providers.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-my-accent/10 pt-6 mt-6">
               <div>
                  <div className="text-2xl font-bold text-my-ink">Available</div>
                  <div className="text-[10px] text-my-accent font-bold uppercase tracking-widest mt-1">Uptime Target</div>
               </div>
               <div>
                  <div className="text-2xl font-bold text-my-ink">Multi-Reg</div>
                  <div className="text-[10px] text-my-accent font-bold uppercase tracking-widest mt-1">Database Config</div>
               </div>
               <div>
                  <div className="text-2xl font-bold text-my-ink">HTTPS</div>
                  <div className="text-[10px] text-my-accent font-bold uppercase tracking-widest mt-1">Transit Encryption</div>
               </div>
               <div>
                  <div className="text-2xl font-bold text-my-ink">Standard</div>
                  <div className="text-[10px] text-my-accent font-bold uppercase tracking-widest mt-1">Compliance Target</div>
               </div>
            </div>
         </div>
      </section>

    </div>
  );
}
