import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Activity, User, LogOut, Settings2, X } from 'lucide-react';
import { MultiverseCanvas } from './components/MultiverseCanvas';
import { generateRealities, generateExpansion, ParallelRealities } from './services/ai';
import { useStore } from '../../store';
import { dbService } from '../../services/dbService';

export default function App() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [data, setData] = useState<ParallelRealities | null>(null);
  const [error, setError] = useState('');
  
  const user = useStore(state => state.user);
  const [profile, setProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [inventoryText, setInventoryText] = useState('');
  const [useInventory, setUseInventory] = useState(false);
  const [traits, setTraits] = useState({
    openness: 50,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 50,
    neuroticism: 50
  });

  // Restore from Archive
  const currentDecision = useStore(state => state.currentDecision);
  React.useEffect(() => {
    if (currentDecision) {
      setData(currentDecision.data);
      setSubmittedQuery(currentDecision.query);
      setQuery(currentDecision.query);
    } else {
      setData(null);
      setSubmittedQuery('');
      setQuery('');
    }
  }, [currentDecision]);

  // Sync profile on mount/user change
  React.useEffect(() => {
    if (user) {
      dbService.getDecisionProfile(user.id).then(p => {
        if (p) {
          setProfile(p);
          setInventoryText(p.inventory || '');
          setUseInventory(p.useInventory || false);
          setTraits({
            openness: p.openness ?? 50,
            conscientiousness: p.conscientiousness ?? 50,
            extraversion: p.extraversion ?? 50,
            agreeableness: p.agreeableness ?? 50,
            neuroticism: p.neuroticism ?? 50,
          });
        }
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError('');
    setData(null);
    setSubmittedQuery(query);

    try {
      const activeInventory = profile?.useInventory ? 
        `BIG FIVE TRAITS:\nOpenness: ${profile.openness}/100\nConscientiousness: ${profile.conscientiousness}/100\nExtraversion: ${profile.extraversion}/100\nAgreeableness: ${profile.agreeableness}/100\nNeuroticism: ${profile.neuroticism}/100\n\nADDITIONAL NOTES:\n${profile.inventory || 'None'}` 
        : undefined;
      const result = await generateRealities(query, activeInventory);
      setData(result);
      
      if (user) {
        const id = await dbService.saveDecision(user.id, query, result);
        useStore.getState().addToDecisionArchive({
          id,
          query,
          timestamp: new Date().toISOString(),
          data: result
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate realities');
      setSubmittedQuery('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpand = async () => {
    if (!data || !submittedQuery) return;
    setIsExpanding(true);
    try {
      const activeInventory = profile?.useInventory ? 
        `BIG FIVE TRAITS:\nOpenness: ${profile.openness}/100\nConscientiousness: ${profile.conscientiousness}/100\nExtraversion: ${profile.extraversion}/100\nAgreeableness: ${profile.agreeableness}/100\nNeuroticism: ${profile.neuroticism}/100\n\nADDITIONAL NOTES:\n${profile.inventory || 'None'}` 
        : undefined;
      const expansion = await generateExpansion(submittedQuery, data.realities.filter(r => !r.id.startsWith('second-order-')), activeInventory);
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          realities: [...prev.realities, ...expansion.realities],
          divergence_insights: [...prev.divergence_insights, ...expansion.divergence_insights]
        };
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to expand simulation');
    } finally {
      setIsExpanding(false);
    }
  };

  const handleCombine = async (id1: string, id2: string) => {
    if (!data || !submittedQuery) return;
    
    // Find matching realities
    const r1Id = id1.replace('reality-', '');
    const r2Id = id2.replace('reality-', '');
    
    const r1 = data.realities.find(r => r.id === r1Id);
    const r2 = data.realities.find(r => r.id === r2Id);
    
    if (!r1 || !r2) return;
    
    setIsExpanding(true); // Reuse loading state
    try {
      const { generateHybrid } = await import('./services/ai');
      const activeInventory = profile?.useInventory ? 
        `BIG FIVE TRAITS:\nOpenness: ${profile.openness}/100\nConscientiousness: ${profile.conscientiousness}/100\nExtraversion: ${profile.extraversion}/100\nAgreeableness: ${profile.agreeableness}/100\nNeuroticism: ${profile.neuroticism}/100\n\nADDITIONAL NOTES:\n${profile.inventory || 'None'}` 
        : undefined;
      const hybridData = await generateHybrid(submittedQuery, r1, r2, activeInventory);
      
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          realities: [...prev.realities, hybridData.reality],
          divergence_insights: [...prev.divergence_insights, hybridData.divergence_insight]
        };
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsExpanding(false);
    }
  };

  const openProfileModal = () => {
    setInventoryText(profile?.inventory || '');
    setUseInventory(profile?.useInventory || false);
    setTraits({
      openness: profile?.openness ?? 50,
      conscientiousness: profile?.conscientiousness ?? 50,
      extraversion: profile?.extraversion ?? 50,
      agreeableness: profile?.agreeableness ?? 50,
      neuroticism: profile?.neuroticism ?? 50,
    });
    setShowProfileModal(true);
  };

  const saveProfile = async () => {
    if (!user) return;
    const newProfile = { inventory: inventoryText, useInventory, ...traits };
    await dbService.saveDecisionProfile(user.id, newProfile);
    setProfile(newProfile);
    setShowProfileModal(false);
  };

  return (
    <div className="h-screen w-full flex flex-col font-sans bg-transparent text-my-ink overflow-hidden relative">
      <div className="mesh-gradient opacity-30 pointer-events-none"></div>

      {/* Input Bar */}
      <div className="relative z-10 p-4 md:px-10 md:py-6 flex flex-col md:flex-row md:items-center justify-center gap-4">
        <div className="flex-1 md:max-w-3xl w-full flex gap-3 items-center">
          <form onSubmit={handleSubmit} className="flex-1">
            <div className="relative flex items-center">
              <div className="absolute left-4 z-10 pointer-events-none text-white/50">
                <Sparkles size={18} />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter a decision, challenge, or scenario you're facing..."
                className="w-full pl-11 pr-32 py-4 rounded-full border border-my-border glass-card bg-my-callout/40 backdrop-blur-xl focus:bg-my-callout focus:outline-none focus:ring-1 focus:ring-my-accent focus:border-my-accent transition-all text-my-ink font-medium placeholder:text-my-muted/40 placeholder:font-normal shadow-2xl"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="absolute right-2 top-2 bottom-2 bg-my-ink text-my-bg dark:bg-my-accent dark:text-black px-6 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg"
              >
                {isLoading ? 'Processing' : 'Explore Paths'}
                {!isLoading && <ArrowRight size={14} />}
              </button>
            </div>
          </form>

          {user && (
            <button 
              onClick={openProfileModal} 
              className="p-4 rounded-full bg-my-callout/40 border border-my-border hover:bg-my-callout text-my-accent transition-all shadow-xl active:scale-95" 
              title="Psychological Profile"
            >
              <Settings2 size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <main className="flex-1 relative w-full h-full">
        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 z-1 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        {error && (
          <div className="absolute inset-x-0 top-4 z-20 flex justify-center pointer-events-none">
            <div className="glass-card border-red-500/50 text-red-200 px-6 py-3 shadow-lg font-medium">
              {error}
            </div>
          </div>
        )}

        {!submittedQuery && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-center max-w-2xl px-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-24 h-24 mx-auto mb-10 relative flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-my-accent/10 rounded-full animate-pulse" />
                <div className="absolute inset-2 border border-dashed border-my-accent/30 rounded-full animate-spin-slow" />
                <NetworkIcon className="text-my-accent w-10 h-10 relative z-10" />
              </motion.div>
              
              <h2 className="text-5xl md:text-6xl font-serif font-bold italic text-my-ink mb-6 tracking-tight">The Multiverse Awaits.</h2>
              <p className="text-[11px] text-my-muted uppercase tracking-[0.4em] leading-relaxed max-w-md mx-auto">
                Describe a choice or action above. Our engine will fracture the timeline into optimistic, realistic, and pessimistic realities to reveal the second-order consequences.
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20 pointer-events-none">
             <div className="flex gap-2.5 mb-6">
                <div className="w-3 h-3 bg-my-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-3 h-3 bg-my-muted rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-3 h-3 bg-my-ink rounded-full animate-bounce"></div>
              </div>
              <div className="text-my-muted font-bold uppercase tracking-[0.3em] text-[10px]">Fracturing timelines...</div>
          </div>
        )}

        {submittedQuery && (
          <div className={`w-full h-full transition-opacity duration-1000 relative z-10 ${isLoading && !data ? 'opacity-30' : 'opacity-100'}`}>
             <MultiverseCanvas query={submittedQuery} data={data} onExpand={handleExpand} isExpanding={isExpanding} onCombine={handleCombine} />
          </div>
        )}
      </main>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-my-bg/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-8 flex flex-col gap-6 border border-my-border bg-my-callout/40 backdrop-blur-2xl shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold italic text-my-ink flex items-center gap-3">
                <Settings2 className="text-my-accent" size={24} />
                Personal Context
              </h2>
              <button onClick={() => setShowProfileModal(false)} className="text-my-muted hover:text-my-accent transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-[11px] text-my-muted uppercase tracking-[0.2em] leading-relaxed border-l-2 border-my-accent/30 pl-4">
              Ground these scenarios in your identity. Real traits help tailor outcomes to your emotional and practical constraints.
            </p>

            <div className="grid grid-cols-1 gap-4 my-2">
              {[
                { key: 'openness', label: 'Openness', desc: 'Willingness to try new things and think outside the box.' },
                { key: 'conscientiousness', label: 'Conscientiousness', desc: 'Level of organization, responsibility, and goal-orientation.' },
                { key: 'extraversion', label: 'Extraversion', desc: 'Energy drawn from social interactions and others.' },
                { key: 'agreeableness', label: 'Agreeableness', desc: 'Cooperation, empathy, and friendliness with others.' },
                { key: 'neuroticism', label: 'Neuroticism', desc: 'Sensitivity to stress, anxiety, and negative emotions.' }
              ].map(trait => (
                <div key={trait.key} className="flex flex-col gap-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-my-muted">
                    <div className="relative group">
                      <span className="cursor-help border-b border-dotted border-my-muted/30">
                        {trait.label}
                      </span>
                      <div className="absolute bottom-full left-0 mb-2 w-56 p-3 bg-my-ink text-my-bg border border-my-border rounded-none shadow-2xl text-[10px] leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none z-50">
                        {trait.desc}
                      </div>
                    </div>
                    <span className="text-my-accent">{traits[trait.key as keyof typeof traits]}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0" max="100"
                    value={traits[trait.key as keyof typeof traits]}
                    onChange={(e) => setTraits(prev => ({ ...prev, [trait.key]: Number(e.target.value) }))}
                    className="w-full accent-my-accent hover:accent-my-ink focus:outline-none bg-my-border h-1 rounded-none appearance-none" 
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-my-muted">Additional Intelligence Notes</label>
              <textarea 
                value={inventoryText}
                onChange={e => setInventoryText(e.target.value)}
                className="w-full h-24 bg-my-callout/50 border border-my-border p-4 text-sm text-my-ink placeholder:text-my-muted/30 focus:outline-none focus:border-my-accent resize-none font-mono"
                placeholder="E.g., High openness but currently constrained by finances..."
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setUseInventory(!useInventory)}
                  className={`w-10 h-5 transition-colors flex items-center px-1 ${useInventory ? 'bg-my-accent' : 'bg-my-muted/30'}`}
                >
                  <div className={`w-3 h-3 bg-my-bg transition-transform ${useInventory ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className="text-[10px] font-bold uppercase tracking-widest text-my-ink">
                  Apply Identity Logic
                </span>
              </div>

              <button 
                onClick={saveProfile}
                className="bg-my-ink text-my-bg dark:bg-my-accent dark:text-black px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-my-accent hover:text-white transition-all shadow-xl rounded-full"
              >
                Sync Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple fallback icon
function NetworkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M5 16v-3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
      <path d="M12 8v3" />
    </svg>
  );
}
