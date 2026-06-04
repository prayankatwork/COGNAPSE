import React from 'react';
import { SectionLabel } from './ui';
import {
  Fingerprint, Shield, Cpu, Zap,
  Terminal, Globe, Github, Linkedin,
  Mail, Award, Users
} from 'lucide-react';

export default function CreatorProfile() {

  const skills = [
    { name: "Intelligent Systems", icon: BrainIcon },
    { name: "Full-Stack Dev", icon: Cpu },
    { name: "Automation", icon: Zap },
    { name: "AI/UX Design", icon: Fingerprint }
  ];

  return (
    <div className="max-w-5xl mx-auto px-8 pt-12 pb-32">
      {/* Forensic Header */}
      <div className="mb-16 border-b border-my-border pb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-[0.05] pointer-events-none">
          <Fingerprint size={300} />
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-[1px] bg-my-accent" />
          <SectionLabel className="!text-xs !text-my-accent">System Architect Profile</SectionLabel>
        </div>

        <h1 className="text-6xl md:text-8xl font-serif font-bold tracking-tighter leading-none italic mb-8">
          Prayank <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-tr from-my-accent via-my-ink dark:via-white to-my-accent">Patnaik.</span>
        </h1>

        <div className="flex flex-wrap gap-10 mt-12">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-my-muted uppercase tracking-widest mb-1">Clearance</span>
            <span className="text-sm font-mono font-bold text-my-ink flex items-center gap-2">
              <Shield size={14} className="text-my-accent" /> LEVEL 07 / ADMIN
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-my-muted uppercase tracking-widest mb-1">Specialization</span>
            <span className="text-sm font-mono font-bold text-my-ink">Intelligent Architecture</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-my-muted uppercase tracking-widest mb-1">Location</span>
            <span className="text-sm font-mono font-bold text-my-ink">Neural Grid / Global</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
        {/* Main Bio Section */}
        <div className="md:col-span-2 space-y-12">
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Terminal size={18} className="text-my-accent" />
              <SectionLabel>Mission Dossier</SectionLabel>
            </div>
            <p className="text-xl md:text-2xl font-light text-my-ink leading-relaxed font-serif italic">
              "A passionate and innovation-driven developer focused on building intelligent, user-centric digital solutions. 
              Prayank bridges the gap between efficient backend logic and intuitive user interfaces, creating systems that 
              are responsive, adaptive, and impactful."
            </p>
          </section>

          <section className="bg-my-callout/40 backdrop-blur-md border border-my-border p-8 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-my-accent/50 to-transparent" />
             <div className="flex items-center gap-3 mb-8">
                <Award size={18} className="text-my-accent" />
                <SectionLabel>Core Philosophy</SectionLabel>
             </div>
             <p className="text-sm text-my-muted leading-relaxed mb-8">
               Strong foundation in computer applications with hands-on experience in developing both web and desktop-based 
               systems that integrate automation and real-time functionality. Prayank holds a strong interest in working at 
               the intersection of artificial intelligence and user experience.
             </p>
             <div className="grid grid-cols-2 gap-8">
                {skills.map(skill => (
                  <div key={skill.name} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-full border border-my-border flex items-center justify-center group-hover:border-my-accent transition-colors">
                      <skill.icon size={16} className="text-my-muted group-hover:text-my-accent transition-colors" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">{skill.name}</span>
                  </div>
                ))}
             </div>
          </section>
        </div>

        {/* Tactical Info Sidebar */}
        <div className="space-y-12">
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Users size={18} className="text-my-accent" />
              <SectionLabel>Leadership & Context</SectionLabel>
            </div>
            <div className="space-y-6">
               <div className="border-l-2 border-my-border pl-6 py-2">
                  <h4 className="text-sm font-bold uppercase tracking-widest mb-2">Event Architecture</h4>
                  <p className="text-sm text-my-muted leading-relaxed">
                    Experienced in organizing and managing large-scale events, handling coordination, logistics, and end-to-end planning.
                  </p>
               </div>
               <div className="border-l-2 border-my-border pl-6 py-2">
                  <h4 className="text-sm font-bold uppercase tracking-widest mb-2">High-Pressure Execution</h4>
                  <p className="text-sm text-my-muted leading-relaxed">
                    Proven ability to perform under pressure in competitive and performance-based environments.
                  </p>
               </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <Globe size={18} className="text-my-accent" />
              <SectionLabel>Network Links</SectionLabel>
            </div>
            <div className="flex flex-col gap-4">
               <a href="https://www.linkedin.com/in/prayank-patnaik-b20243383/" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-my-bg border border-my-border hover:border-my-accent transition-all group">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Connect on LinkedIn</span>
                  <Linkedin size={14} className="text-my-muted group-hover:text-my-accent" />
               </a>
               <a href="https://github.com/prayankatwork" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-my-bg border border-my-border hover:border-my-accent transition-all group">
                  <span className="text-[10px] font-bold uppercase tracking-widest">View Source Code</span>
                  <Github size={14} className="text-my-muted group-hover:text-my-accent" />
               </a>
               <a href="mailto:Prayankatwork@gmail.com" className="flex items-center justify-between p-4 bg-my-bg border border-my-border hover:border-my-accent transition-all group">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Direct Comms</span>
                  <Mail size={14} className="text-my-muted group-hover:text-my-accent" />
               </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function BrainIcon({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3-4-4-6.5c-1 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
      <path d="M12 22v-5" />
      <path d="M9 18c-1.5 0-3-1.5-3-3s1.5-3 3-3" />
      <path d="M15 18c1.5 0 3-1.5 3-3s-1.5-3-3-3" />
    </svg>
  );
}
