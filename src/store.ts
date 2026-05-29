import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await idbGet(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbSet(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await idbDel(name);
  },
};
import { dbService } from './services/dbService';
import { syncAuthSession } from './services/authSession';
import { auth } from './services/firebase';
import type { COGNAPSE_Output, DeepResearchThesis, ResearchScore } from './types';

export interface UserBadge {
  name: string;
  icon: string;
  message: string;
  unlockedAt: string;
}

export interface ArchiveEntry {
  id: string;
  query: string;
  timestamp: string;
  topic_cluster: string;
  tags: string[];
  summary_snippet: string;
  report: COGNAPSE_Output;
  notes?: string;
  starred?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
}

// DeepResearch interfaces moved to types.ts

export type ThoughtType = 'claim' | 'evidence' | 'question' | 'assumption' | 'conclusion';

export interface Thought {
  id: string;
  type: ThoughtType;
  content: string;
  source?: string;
  confidence_score: number;
  related_thoughts: string[]; // IDs of related thoughts
  contradictions: string[]; // IDs of contradictory thoughts
  created_at: string;
}

export interface CognitionGraph {
  thoughts: Record<string, Thought>;
  rootThoughts: string[]; // Entry points
}

export interface DeepResearchState {
  status: 'idle' | 'running' | 'completed' | 'error';
  stage: number;
  progress: string;
  thesis: DeepResearchThesis | null;
  error: string | null;
  scores: ResearchScore | null;
  reasoningTimeline: ReasoningStep[];
}

export interface ReasoningStep {
  id: string;
  stage: string;
  action: string;
  insight: string;
  status: 'active' | 'confirmed' | 'discarded' | 'pivoted';
  timestamp: number;
}

export interface Note {
  id: string;
  user_id: string;
  content: string;
  source_query: string;
  timestamp: string;
}

export interface User {
  id: string;
  username: string;
  premium?: boolean;
  premiumPlan?: string;
  premiumActivatedAt?: string;
  premiumExpiresAt?: string;
  suspended?: boolean;
}

interface AppState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  theme: 'light' | 'dark';
  toggleTheme: () => void;

  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  
  isAuthOpen: boolean;
  setAuthOpen: (open: boolean) => void;

  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  isNotebookOpen: boolean;
  setNotebookOpen: (open: boolean) => void;

  isStatusOpen: boolean;
  setStatusOpen: (open: boolean) => void;

  currentView: 'onboarding' | 'landing' | 'research' | 'documentation' | 'dev' | 'news' | 'games' | 'creator';
  setView: (view: 'onboarding' | 'landing' | 'research' | 'documentation' | 'dev' | 'news' | 'games' | 'creator') => void;

  xp: number;
  searchCount: number;
  rank: string;
  updateGamification: (data: { xpAcquired?: number; searchCountIncrease?: number }) => void;
  badges: UserBadge[];
  lastSearchDate: string | null;
  streak: number;

  subscribedCategories: string[];
  setSubscribedCategories: (cats: string[]) => void;
  toggleCategory: (category: string) => void;
  
  walkthroughCompleted: boolean;
  setWalkthroughCompleted: (completed: boolean) => void;
  
  currentReport: COGNAPSE_Output | null;
  setCurrentReport: (report: COGNAPSE_Output | null) => void;
  lastReportId: string | null;
  restoreLastReport: () => void;
  currentChat: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  error: string | null;
  setError: (err: string | null) => void;

  investigationStack: COGNAPSE_Output[];
  pushToStack: (report: COGNAPSE_Output) => void;
  popFromStack: () => void;
  clearStack: () => void;

  archive: ArchiveEntry[];
  setArchive: (archive: ArchiveEntry[]) => void;
  addToArchive: (entry: ArchiveEntry) => void;
  removeFromArchive: (id: string) => void;
  clearArchive: () => void;
  updateArchiveNotes: (id: string, notes: string) => void;
  toggleArchiveStar: (id: string) => void;

  setStats: (stats: { xp: number, searchCount: number, rank: string }) => void;

  initialQuery: string | null;
  setInitialQuery: (q: string | null) => void;


  deepResearch: DeepResearchState;
  setDeepResearch: (update: Partial<DeepResearchState>) => void;
  resetDeepResearch: () => void;
  addReasoningStep: (action: string) => void;

  notes: Note[];
  setNotes: (notes: Note[]) => void;
  addNote: (content: string, sourceQuery: string) => void;
  removeNote: (id: string) => void;
  clearNotebook: () => void;

  cognitionGraph: CognitionGraph;
  addThought: (thought: Omit<Thought, 'id' | 'created_at'>) => string;
  linkThoughts: (id1: string, id2: string, relationship: 'related' | 'contradictory') => void;
  clearCognition: () => void;

  speculativeCache: Record<string, string>; // question -> answer
  setSpeculativeAnswer: (question: string, answer: string) => void;

  missions: { id: string; title: string; xp: number; completed: boolean }[];
  completeMission: (id: string) => void;
  refreshMissions: () => void;

  isBlinking: boolean;
  setBlinking: (val: boolean) => void;

  isDevOpen: boolean;
  setDevOpen: (val: boolean) => void;

  deleteAccount: () => Promise<void>;
  isResearching: boolean;
  setIsResearching: (val: boolean) => void;
  
  sessionMemory: {
    sessionId: string;
    entries: { id: string; query: string; timestamp: string; topicCluster: string; tags: string[]; bottomLine: string; credibility: number }[];
    crossLinks: { type: 'reinforcement' | 'conflict' | 'expansion'; queryA: string; queryB: string; insight: string }[];
    dominantTopics: string[];
    researcherBias: string | null;
    synthesisReady: boolean;
  };
  clearSessionMemory: () => void;

  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;

  pdfExports: any[];
  unlockedReports: Record<string, boolean>;
  unlockReport: (researchId: string) => void;
  addExport: (exportData: any) => Promise<void>;
  fetchExports: () => Promise<void>;
  removeExport: (exportId: string) => Promise<void>;
  clearExports: () => Promise<void>;

  // #8: Premium chat history
  premiumChatHistory: ChatMessage[];
  setPremiumChatHistory: (history: ChatMessage[]) => void;
  addPremiumChatMessage: (msg: ChatMessage) => void;
  clearPremiumChatHistory: () => void;
}

const getRank = (xp: number) => {
  if (xp <= 50) return "Novice";
  if (xp <= 150) return "Curious";
  if (xp <= 350) return "Explorer";
  if (xp <= 700) return "Analyst";
  if (xp <= 1200) return "Researcher";
  if (xp <= 2000) return "Mastermind";
  return "Omni-Observer";
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Cleanup stale emojis from old sessions
      _hydrateCleanup: () => {
        const currentRank = get().rank;
        if (currentRank && /[^\x00-\x7F]/.test(currentRank)) {
          set({ rank: currentRank.replace(/[^\x00-\x7F]/g, "").trim() });
        }
      },

      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      theme: 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      user: null,
      setUser: (user) => {
        set({ user });
        void syncAuthSession(user);
      },
      logout: async () => {
        // Capture ID token before sign out so we can revoke it server-side
        let idToken: string | null = null;
        try {
          const user = auth.currentUser;
          if (user) {
            idToken = await user.getIdToken(false);
          }
        } catch {}

        try { await dbService.logout(); } catch(e) {}
        await syncAuthSession(null);

        // Revoke the session server-side so stale tokens (e.g. in Chrome extension)
        // are immediately invalidated instead of lingering for up to 1 hour.
        if (idToken) {
          fetch('/api/revoke-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          }).catch(() => {});
        }

        set({ 
          user: null, 
          xp: 0, 
          searchCount: 0, 
          rank: 'ANALYST',
          archive: [],
          currentReport: null,
          notes: [],
          deepResearch: {
            status: 'idle',
            stage: 0,
            progress: '',
            thesis: null,
            error: null,
            scores: null
          },
          currentView: 'landing'
        });
      },

      deleteAccount: async () => {
        const user = get().user;
        if (!user) return;

        await dbService.deleteUserAccount(user.id);
        set({
          user: null,
          xp: 0,
          searchCount: 0,
          rank: 'ANALYST',
          archive: [],
          currentReport: null,
          notes: [],
          pdfExports: [],
          unlockedReports: {},
          currentView: 'landing',
          isStatusOpen: false,
          subscribedCategories: ['TECH', 'FINANCE', 'GEOPOLITICS'],
        });
      },

      isAuthOpen: false,
      setAuthOpen: (open) => set({ isAuthOpen: open }),

      isCommandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

      isNotebookOpen: false,
      setNotebookOpen: (open) => set({ isNotebookOpen: open }),

      isStatusOpen: false,
      setStatusOpen: (open) => set({ isStatusOpen: open }),

      currentView: 'landing',
      setView: (view) => set({ currentView: view }),

      subscribedCategories: ['TECH', 'FINANCE', 'GEOPOLITICS'], // Defaults
      setSubscribedCategories: (cats) => set({ subscribedCategories: cats }),
      toggleCategory: (cat) => set((state) => {
        const newCats = state.subscribedCategories.includes(cat)
          ? state.subscribedCategories.filter(c => c !== cat)
          : [...state.subscribedCategories, cat];
        
        if (state.user) {
          dbService.saveSettings(state.user.id, { subscribedCategories: newCats });
        }
        
        return { subscribedCategories: newCats };
      }),

      walkthroughCompleted: true, // Default to true to prevent flashes, will be updated on load
      setWalkthroughCompleted: (completed) => set((state) => {
        if (state.user) {
          dbService.saveSettings(state.user.id, { walkthroughCompleted: completed });
        }
        return { walkthroughCompleted: completed };
      }),

      xp: 0,
      searchCount: 0,
      rank: "Novice",
      badges: [],
      lastSearchDate: null,
      streak: 0,

      currentReport: null,
      setCurrentReport: (report) => set({ currentReport: report, currentChat: [], lastReportId: report?.id || null }),
      lastReportId: null,
      restoreLastReport: () => {
        const state = get();
        if (!state.lastReportId || state.archive.length === 0) return;
        const entry = state.archive.find(e => e.id === state.lastReportId);
        if (entry) {
          set({ currentReport: entry.report });
          if (entry.report.deep_research) {
            set({
              deepResearch: {
                ...state.deepResearch,
                status: 'completed',
                thesis: entry.report.deep_research,
                scores: entry.report.deep_scores || null,
                stage: 4,
                progress: 'Decrypted from Archive'
              }
            });
          }
        }
      },
      currentChat: [],
      addChatMessage: (msg) => set((state) => ({ currentChat: [...state.currentChat, msg] })),
      clearChat: () => set({ currentChat: [] }),
      isLoading: false,
      setIsLoading: (val) => set({ isLoading: val }),
      error: null,
      setError: (err) => set({ error: err }),

      investigationStack: [],
      pushToStack: (report) => set((state) => ({ 
        investigationStack: [...state.investigationStack, report],
        currentReport: report 
      })),
      popFromStack: () => set((state) => {
        const newStack = state.investigationStack.slice(0, -1);
        return {
          investigationStack: newStack,
          currentReport: newStack[newStack.length - 1] || null
        };
      }),
      clearStack: () => set({ investigationStack: [] }),

      archive: [],
      setArchive: (archive) => set({ archive }),
      addToArchive: (entry) =>
        set((state) => ({ archive: [entry, ...state.archive].slice(0, 100) })),
      removeFromArchive: (id) =>
        set((state) => {
          if (state.user) {
            dbService.deleteReport(id, state.user.id);
          }
          return { archive: state.archive.filter(item => item.id !== id) };
        }),
      clearArchive: () =>
        set((state) => {
          if (state.user) {
            dbService.clearHistory(state.user.id);
          }
          return { 
            archive: [],
            currentReport: null,
            deepResearch: {
              status: 'idle',
              stage: 0,
              progress: '',
              thesis: null,
              error: null,
              scores: null
            }
          };
        }),
      updateArchiveNotes: (id, notes) =>
        set((state) => ({
          archive: state.archive.map((item) =>
            item.id === id ? { ...item, notes } : item
          ),
        })),
      toggleArchiveStar: (id) =>
        set((state) => ({
          archive: state.archive.map((item) =>
            item.id === id ? { ...item, starred: !item.starred } : item
          ),
        })),

      initialQuery: null,
      setInitialQuery: (q) => set({ initialQuery: q }),


      setStats: (stats) => set({ 
        xp: stats.xp, 
        searchCount: stats.searchCount, 
        rank: stats.rank
      }),

      updateGamification: ({ xpAcquired = 0, searchCountIncrease = 0 }) =>
        set((state) => {
          let bonusXp = 0;
          let currentStreak = state.streak || 0;
          let dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
          let storedDate = state.lastSearchDate ? state.lastSearchDate.split('T')[0] : null;

          if (searchCountIncrease > 0 && storedDate !== dateStr) {
             let yesterday = new Date();
             yesterday.setDate(yesterday.getDate() - 1);
             let yesterdayStr = yesterday.toISOString().split('T')[0];

             if (storedDate === yesterdayStr) {
               currentStreak += 1;
             } else {
               currentStreak = 1;
             }
             bonusXp = 25;
          }

          const newXp = state.xp + xpAcquired + bonusXp;
          const newSearches = state.searchCount + searchCountIncrease;
          const newRank = getRank(newXp);
          
          if (state.user) {
            dbService.syncStats(state.user.id, {
               xp: newXp,
               search_count: newSearches,
               rank: newRank
            });
          }

          return {
            xp: newXp,
            searchCount: newSearches,
            rank: newRank,
            streak: searchCountIncrease > 0 ? currentStreak : state.streak,
            lastSearchDate: searchCountIncrease > 0 ? new Date().toISOString() : state.lastSearchDate,
          };
        }),

      deepResearch: {
        status: 'idle',
        stage: 0,
        progress: '',
        thesis: null,
        error: null,
        scores: null,
        reasoningTimeline: []
      },
      setDeepResearch: (update) => set((state) => ({
        deepResearch: { ...state.deepResearch, ...update }
      })),
      resetDeepResearch: () => set({
        deepResearch: {
          status: 'idle',
          stage: 0,
          progress: '',
          thesis: null,
          error: null,
          scores: null,
          reasoningTimeline: []
        }
      }),
      addReasoningStep: (action) => set((state) => {
        const stages = ['Thesis Formulation', 'Source Retrieval', 'Evidence Synthesis', 'Finalization'];
        const step: ReasoningStep = {
          id: crypto.randomUUID(),
          stage: stages[state.deepResearch.stage - 1] || 'Processing',
          action,
          insight: action,
          status: 'active' as const,
          timestamp: Date.now()
        };
        return {
          deepResearch: {
            ...state.deepResearch,
            reasoningTimeline: [...state.deepResearch.reasoningTimeline, step]
          }
        };
      }),

      notes: [],
      setNotes: (notes) => set({ notes }),
      addNote: (content, sourceQuery) => set((state) => {
        const id = Date.now().toString();
        const newNote: Note = {
          id,
          user_id: state.user?.id || 'guest',
          content,
          source_query: sourceQuery,
          timestamp: new Date().toISOString()
        };
        if (state.user) {
          dbService.addNote(id, state.user.id, content, sourceQuery);
        }
        return { notes: [newNote, ...state.notes] };
      }),
      removeNote: (id) => set((state) => {
        if (state.user) {
          dbService.deleteNote(id);
        }
        return { notes: state.notes.filter(n => n.id !== id) };
      }),
      clearNotebook: () => set((state) => {
        if (state.user) {
          dbService.clearNotebook(state.user.id);
        }
        return { notes: [] };
      }),

      cognitionGraph: {
        thoughts: {},
        rootThoughts: []
      },
      addThought: (thoughtData) => {
        const id = crypto.randomUUID();
        const newThought: Thought = {
          ...thoughtData,
          id,
          created_at: new Date().toISOString()
        };
        set((state) => ({
          cognitionGraph: {
            ...state.cognitionGraph,
            thoughts: { ...state.cognitionGraph.thoughts, [id]: newThought },
            rootThoughts: thoughtData.type === 'conclusion' ? [...state.cognitionGraph.rootThoughts, id] : state.cognitionGraph.rootThoughts
          }
        }));
        return id;
      },
      linkThoughts: (id1, id2, relationship) => set((state) => {
        const t1 = state.cognitionGraph.thoughts[id1];
        const t2 = state.cognitionGraph.thoughts[id2];
        if (!t1 || !t2) return state;

        const updatedT1 = { ...t1 };
        const updatedT2 = { ...t2 };

        if (relationship === 'related') {
          updatedT1.related_thoughts = Array.from(new Set([...t1.related_thoughts, id2]));
          updatedT2.related_thoughts = Array.from(new Set([...t2.related_thoughts, id1]));
        } else {
          updatedT1.contradictions = Array.from(new Set([...t1.contradictions, id2]));
          updatedT2.contradictions = Array.from(new Set([...t2.contradictions, id1]));
        }

        return {
          cognitionGraph: {
            ...state.cognitionGraph,
            thoughts: {
              ...state.cognitionGraph.thoughts,
              [id1]: updatedT1,
              [id2]: updatedT2
            }
          }
        };
      }),
      clearCognition: () => set({ cognitionGraph: { thoughts: {}, rootThoughts: [] } }),

      speculativeCache: {},
      setSpeculativeAnswer: (question, answer) => set((state) => ({
        speculativeCache: { ...state.speculativeCache, [question]: answer }
      })),

      missions: [
        { id: '1', title: 'Synthesize a Scientific Paper', xp: 50, completed: false },
        { id: '2', title: 'Drill into 3 Evidence Nodes', xp: 30, completed: false },
        { id: '3', title: 'Export a Research Report', xp: 20, completed: false },
      ],
      completeMission: (id) => set((state) => ({
        missions: state.missions.map(m => m.id === id ? { ...m, completed: true } : m),
        xp: state.xp + (state.missions.find(m => m.id === id)?.xp || 0)
      })),
      refreshMissions: () => set({
        missions: [
          { id: Math.random().toString(), title: 'Analyze Geopolitical Conflict', xp: 50, completed: false },
          { id: Math.random().toString(), title: 'Link 5 Cognition Thoughts', xp: 40, completed: false },
          { id: Math.random().toString(), title: 'Initialize a Deep Research Protocol', xp: 60, completed: false },
        ]
      }),

      isBlinking: false,
      setBlinking: (val) => set({ isBlinking: val }),

      isDevOpen: false,
      setDevOpen: (val: boolean) => set({ isDevOpen: val }),

      isResearching: false,
      setIsResearching: (val: boolean) => set({ isResearching: val }),

      sessionMemory: {
        sessionId: crypto.randomUUID(),
        entries: [],
        crossLinks: [],
        dominantTopics: [],
        researcherBias: null,
        synthesisReady: false
      },
      clearSessionMemory: () => set({ 
        sessionMemory: {
          sessionId: crypto.randomUUID(),
          entries: [],
          crossLinks: [],
          dominantTopics: [],
          researcherBias: null,
          synthesisReady: false
        }
      }),

      soundEnabled: false,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

      pdfExports: [],
      unlockedReports: {},
      unlockReport: (researchId) => set((state) => ({
        unlockedReports: { ...state.unlockedReports, [researchId]: true }
      })),
      addExport: async (exportData) => {
        await dbService.saveExport(exportData);
        set((state) => ({
          pdfExports: [exportData, ...state.pdfExports]
        }));
      },
      fetchExports: async () => {
        const user = get().user;
        if (!user) return;
        const exports = await dbService.getUserExports(user.id);
        set({ pdfExports: exports });
      },
      removeExport: async (exportId: string) => {
        const user = get().user;
        if (!user) return;
        await dbService.deleteExport(exportId, user.id);
        set((state) => ({
          pdfExports: state.pdfExports.filter(e => e.id !== exportId)
        }));
      },
      clearExports: async () => {
        const user = get().user;
        if (!user) return;
        await dbService.clearExports(user.id);
        set({ pdfExports: [] });
      },

      // #8: Premium chat history
      premiumChatHistory: [],
      setPremiumChatHistory: (history) => set({ premiumChatHistory: history }),
      addPremiumChatMessage: (msg) => set((state) => ({
        premiumChatHistory: [...state.premiumChatHistory, msg]
      })),
      clearPremiumChatHistory: () => set({ premiumChatHistory: [] }),
    }),
    {
      name: 'cognapse-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => {
        const partial: Record<string, any> = {
          xp: state.xp,
          searchCount: state.searchCount,
          rank: state.rank,
          badges: state.badges,
          streak: state.streak,
          lastSearchDate: state.lastSearchDate,
          theme: state.theme,
subscribedCategories: state.subscribedCategories,
          isSidebarOpen: state.isSidebarOpen,
          lastReportId: state.lastReportId,
          soundEnabled: state.soundEnabled,
        };
        // Persist chat history only for premium users
        if (state.user?.premium) {
          partial.premiumChatHistory = state.premiumChatHistory;
        }
        return partial;
      },
    }
  )
);
