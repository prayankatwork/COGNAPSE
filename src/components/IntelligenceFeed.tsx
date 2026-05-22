import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, Zap, ArrowRight, Check, Plus, 
  TrendingUp, Newspaper, ShieldAlert, Cpu, 
  BarChart3, FlaskConical, Landmark, Activity,
  ChevronRight, Search, LayoutGrid, List as ListIcon, RefreshCw
} from 'lucide-react';
import { useStore } from '../store';
import { callCloudAI } from '../services/aiService';
import clsx from 'clsx';

interface NewsItem {
  id: string;
  category: string;
  headline: string;
  summary: string;
  timestamp: string;
  impact: 'high' | 'medium' | 'low';
}

const CATEGORIES = [
  { id: 'TECH', icon: <Cpu size={14} />, label: 'Technology' },
  { id: 'FINANCE', icon: <BarChart3 size={14} />, label: 'Finance' },
  { id: 'GEOPOLITICS', icon: <Globe size={14} />, label: 'Geopolitics' },
  { id: 'SCIENCE', icon: <FlaskConical size={14} />, label: 'Science' },
  { id: 'HEALTH', icon: <Activity size={14} />, label: 'Health' },
];

export default function IntelligenceFeed({ onTriggerResearch }: { onTriggerResearch: (query: string) => void }) {
  const { subscribedCategories, toggleCategory, setView } = useStore();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'subscriptions'>('feed');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchNews = useCallback(async (isSilent = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (!isSilent) setLoading(true);
    setSyncError(null);

    try {
      const currentDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Diverse intelligence angles to prevent repetitive outputs
      const scenarioAngles = [
        "quantum cybersecurity standards, semiconductor supply chain choke points, and zero-day vulnerabilities in satellite grids",
        "global sovereign debt restructurings, trade embargoes on critical minerals, and central bank digital currency trials",
        "deep-sea energy infrastructure security, space-based telecom blockades, and rare-earth element processing anomalies",
        "biosecurity protocols, synthetic gene-editing therapeutic breakthroughs, and neural computing interfaces",
        "lithium and cobalt procurement standoffs, Baltic logistics choke points, and micro-satellite orbital deployment failures",
        "nuclear fusion commercial milestones, critical smart-grid pipeline security, and geothermal power regulations"
      ];

      // Shuffle and pick 2 random vectors to focus this query's creative output
      const dynamicVectors = [...scenarioAngles].sort(() => 0.5 - Math.random()).slice(0, 2);

      const prompt = `
        Current System Time: ${currentDate}.
        Generate exactly 10 trending, highly realistic, and detailed global intelligence headlines for these categories: ${subscribedCategories.join(', ')}.
        
        To ensure maximum freshness and prevent repetitive output, heavily align your headlines around these dynamic context vectors:
        - ${dynamicVectors.join('\n        - ')}

        Avoid standard generic cliches. Focus on realistic scenarios featuring specific geographic hotspots (e.g. Taiwan Strait, North Sea, Baltic region, Sub-Saharan mineral fields), fictional/real global conglomerates, or government regulatory bodies.
        
        Return ONLY a JSON array of objects:
        [{
          "id": "unique-id",
          "category": "TECH", 
          "headline": "Highly specific and detailed industry headline",
          "summary": "1-2 sentence analytical summary detailing the immediate macro implications.",
          "timestamp": "e.g., '12m ago', '3h ago', '7h ago' (vary these randomly between 5 minutes and 24 hours)",
          "impact": "high"
        }]
      `;
      
      const response = await callCloudAI(prompt, true, "gemini-1.5-flash");
      let data = JSON.parse(response);
      if (!Array.isArray(data)) {
        if (data && typeof data === 'object') {
          const arrayField = Object.values(data).find(val => Array.isArray(val));
          data = Array.isArray(arrayField) ? arrayField : [];
        } else {
          data = [];
        }
      }
      setNews(data);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Failed to fetch intelligence feed:", error);
      const msg = error instanceof Error ? error.message : 'Sync failed';
      setSyncError(msg.includes('Sign in') ? msg : 'Could not refresh feed. Try again.');
      setNews((prev) => {
        if (Array.isArray(prev) && prev.length > 0) return prev;
        return [
          { id: '1', category: 'TECH', headline: 'Quantum Supremacy Breakout in Silicon Photonics', summary: 'New experimental data suggests a breakthrough in room-temperature quantum computing.', timestamp: '1h ago', impact: 'high' },
          { id: '2', category: 'FINANCE', headline: 'Global Liquidity Crisis Looming in Tier-2 Banking', summary: 'Multiple mid-sized institutions reporting unexpected capital shortfalls.', timestamp: '3h ago', impact: 'medium' },
          { id: '3', category: 'GEOPOLITICS', headline: 'Subsurface Mineral Rights Conflict in Arctic Circle', summary: 'Diplomatic tensions rise as new seismic surveys reveal massive rare-earth deposits.', timestamp: '5h ago', impact: 'high' }
        ];
      });
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [subscribedCategories]);

  // Load feed when categories change
  useEffect(() => {
    if (subscribedCategories.length > 0) {
      fetchNews();
    } else {
      setNews([]);
      setLoading(false);
      setLastRefreshed(null);
      setSyncError(null);
    }
  }, [subscribedCategories, fetchNews]);

  // Auto-refresh every 10 minutes + when tab becomes visible
  useEffect(() => {
    if (subscribedCategories.length === 0) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNews(true);
      }
    }, 10 * 60 * 1000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchNews(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [subscribedCategories, fetchNews]);

  const handleManualRefresh = () => {
    fetchNews(false);
  };

  const lastSyncLabel = useMemo(() => {
    if (loading && !lastRefreshed) return 'Syncing…';
    if (syncError) return syncError;
    if (!lastRefreshed) return 'Not synced yet';
    return `Last Sync: ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [loading, lastRefreshed, syncError]);

  // Group news by category
  const groupedNews = useMemo(() => {
    const groups: Record<string, NewsItem[]> = {};
    if (Array.isArray(news)) {
      news.forEach(item => {
        if (item && item.category) {
          if (!groups[item.category]) groups[item.category] = [];
          groups[item.category].push(item);
        }
      });
    }
    return groups;
  }, [news]);

  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleTriggerResearch = async (headline: string) => {
    setIsTransitioning(true);
    // Artificial delay for tactical feel & swarm sync
    await new Promise(r => setTimeout(r, 1200));
    setView('research');
    onTriggerResearch(headline);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700 relative">
      <AnimatePresence>
        {isTransitioning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-my-bg/90 backdrop-blur-md md:backdrop-blur-2xl flex flex-col items-center justify-center text-center p-12"
          >
             <div className="w-24 h-24 relative mb-8">
                <div className="absolute inset-0 border-4 border-my-accent/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-my-accent border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <Zap size={32} className="text-my-accent animate-pulse" />
                </div>
             </div>
             <h2 className="text-xl font-black text-my-ink uppercase tracking-[0.4em] mb-4">Preparing Analysis</h2>
             <p className="text-[11px] text-my-muted uppercase tracking-[0.2em] max-w-md">
                Connecting to primary data sources for in-depth review. <br />
                Initializing research framework for the selected topic.
             </p>
          </motion.div>
        )}
      </AnimatePresence>

      <header 
        id="walkthrough-hub-anchor"
        className="px-6 py-6 md:px-12 md:py-10 border-b border-my-border bg-my-sidebar/50 backdrop-blur-md md:backdrop-blur-xl"
      >
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-my-accent/10 rounded-lg text-my-accent">
                    <Newspaper size={20} />
                  </div>
                  <h1 className="text-2xl font-serif font-bold italic text-my-ink tracking-tight">Knowledge Hub</h1>
               </div>
               <div className="flex items-center gap-4">
                  <p className="text-[11px] text-my-muted uppercase tracking-[0.2em] font-black">Global Event Tracking</p>
                  <div className="w-1 h-1 rounded-full bg-my-border" />
                  <div className="flex items-center gap-2">
                     <div className={clsx(
                       "w-1.5 h-1.5 rounded-full shrink-0",
                       loading ? "bg-my-accent animate-pulse" : syncError ? "bg-red-500" : "bg-green-500"
                     )} />
                     <span className={clsx(
                       "text-[9px] font-bold uppercase tracking-widest max-w-[200px] truncate",
                       syncError ? "text-red-500/80" : "text-my-muted"
                     )}>
                        {lastSyncLabel}
                     </span>
                  </div>
               </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
               <button 
                 onClick={handleManualRefresh}
                 disabled={loading}
                 className="p-3 border border-my-border rounded-full text-my-muted hover:text-my-accent hover:border-my-accent transition-all group"
                 title="Refresh Signals"
               >
                  <RefreshCw size={16} className={clsx(loading && "animate-spin")} />
               </button>

               <div className="flex items-center gap-2 p-1 bg-my-border/30 rounded-full">
                  <button 
                    onClick={() => setActiveTab('feed')}
                    className={clsx(
                      "px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-full flex items-center gap-2",
                      activeTab === 'feed' ? "bg-my-accent text-white dark:text-black shadow-lg" : "text-my-muted hover:text-my-ink"
                    )}
                  >
                    <ListIcon size={14} /> Live Feed
                  </button>
                  <button 
                    onClick={() => setActiveTab('subscriptions')}
                    className={clsx(
                      "px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-full flex items-center gap-2",
                      activeTab === 'subscriptions' ? "bg-my-accent text-white dark:text-black shadow-lg" : "text-my-muted hover:text-my-ink"
                    )}
                  >
                    <LayoutGrid size={14} /> Subscriptions
                  </button>
               </div>
            </div>
         </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
         <div className="max-w-7xl mx-auto px-4 md:px-12 py-6 md:py-12">
            
            <AnimatePresence mode="wait">
               {activeTab === 'feed' ? (
                 <motion.div 
                   key="feed"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -20 }}
                   className="space-y-16"
                 >
                    {loading ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {[...Array(6)].map((_, i) => (
                             <div key={i} className="h-64 bg-my-sidebar/50 border border-my-border animate-pulse rounded-xl" />
                          ))}
                       </div>
                    ) : subscribedCategories.length === 0 ? (
                       <div className="py-20 text-center">
                          <Globe className="mx-auto text-my-muted opacity-20 mb-6" size={48} />
                          <h2 className="text-xl font-bold text-my-ink mb-2 uppercase tracking-widest">No Intelligence Vectors Active</h2>
                          <p className="text-sm text-my-muted mb-8">Subscribe to categories to begin global forensic monitoring.</p>
                          <button 
                            onClick={() => setActiveTab('subscriptions')}
                            className="px-8 py-3 bg-my-accent text-white dark:text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:scale-105 transition-all shadow-xl"
                          >
                            Set Subscriptions
                          </button>
                       </div>
                    ) : (
                       Object.entries(groupedNews).map(([category, items], sectionIdx) => (
                          <div key={category} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${sectionIdx * 100}ms` }}>
                             <div className="flex items-center gap-4 mb-8">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-my-border" />
                                <h2 className="text-[12px] font-black text-my-accent uppercase tracking-[0.4em] px-4">
                                   {CATEGORIES.find(c => c.id === category)?.label || category}
                                </h2>
                                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-my-border" />
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {items.map((item, idx) => (
                                   <NewsCard 
                                     key={item.id} 
                                     item={item} 
                                     idx={idx} 
                                     onResearch={() => handleTriggerResearch(item.headline)}
                                   />
                                ))}
                             </div>
                          </div>
                       ))
                    )}
                 </motion.div>
               ) : (
                 <motion.div 
                   key="subs"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -20 }}
                   className="max-w-2xl mx-auto"
                 >
                    <div className="text-center mb-12">
                       <h2 className="text-xl font-bold text-my-ink mb-4 uppercase tracking-[0.2em]">Curate Your Intelligence</h2>
                       <p className="text-sm text-my-muted leading-relaxed">
                          Select the domains you wish the COGNAPSE Swarm to monitor. 
                          Your global feed will be tailored to these specific intelligence vectors.
                       </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                       {CATEGORIES.map((cat) => {
                          const isSubscribed = subscribedCategories.includes(cat.id);
                          return (
                             <button
                               key={cat.id}
                               onClick={() => toggleCategory(cat.id)}
                               className={clsx(
                                 "flex items-center justify-between p-6 border transition-all group rounded-xl",
                                 isSubscribed 
                                   ? "bg-my-accent/5 border-my-accent shadow-[0_0_20px_rgba(249,115,22,0.1)]" 
                                   : "bg-my-sidebar/50 border-my-border hover:border-my-accent/30"
                               )}
                             >
                                <div className="flex items-center gap-6">
                                   <div className={clsx(
                                     "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                                     isSubscribed ? "bg-my-accent text-white dark:text-black" : "bg-my-border text-my-muted group-hover:text-my-accent"
                                   )}>
                                      {cat.icon}
                                   </div>
                                   <div className="text-left">
                                      <h3 className={clsx(
                                        "text-sm font-black uppercase tracking-widest",
                                        isSubscribed ? "text-my-accent" : "text-my-muted"
                                      )}>{cat.label}</h3>
                                      <p className="text-[11px] text-my-muted mt-1">Real-time forensic monitoring for {cat.label.toLowerCase()} events.</p>
                                   </div>
                                </div>
                                <div className={clsx(
                                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                  isSubscribed ? "bg-my-accent border-my-accent text-white" : "border-my-border"
                                )}>
                                   {isSubscribed && <Check size={14} />}
                                </div>
                             </button>
                          );
                       })}
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>

         </div>
      </main>
    </div>
  );
}

function NewsCard({ item, idx, onResearch }: { item: NewsItem, idx: number, onResearch: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1 }}
      className="group relative flex flex-col bg-my-sidebar/30 border border-my-border rounded-xl p-8 hover:border-my-accent/50 transition-all hover:shadow-2xl hover:shadow-my-accent/5"
    >
       <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2 text-[9px] text-my-muted font-bold uppercase tracking-widest">
             <Activity size={10} className={clsx(item.impact === 'high' ? "text-red-500 animate-pulse" : "text-my-muted")} />
             {item.timestamp}
          </div>
          {item.impact === 'high' && (
             <span className="text-[8px] font-black text-red-500 uppercase tracking-widest border border-red-500/30 px-2 py-0.5 rounded">High Impact</span>
          )}
       </div>

       <h3 className="text-lg font-serif font-bold italic text-my-ink leading-tight mb-4 group-hover:text-my-accent transition-colors">
          {item.headline}
       </h3>

       <p className="text-xs text-my-syn leading-relaxed mb-8 flex-1">
          {item.summary}
       </p>

       <button 
         onClick={onResearch}
         className="w-full py-4 bg-my-border/30 text-my-ink text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 group-hover:bg-my-accent group-hover:text-white transition-all rounded-lg"
       >
          <Search size={14} /> Begin Detailed Analysis <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
       </button>

       {/* Decorative Impact Line */}
       <div className={clsx(
         "absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-1/2 transition-all",
         item.impact === 'high' ? "bg-red-500/50" : "bg-my-accent/30"
       )} />
    </motion.div>
  );
}
