import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dbService } from './services/dbService';
import type { COGNAPSE_Output } from './types';

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

export interface DeepResearchThesis {
  title: string;
  abstract: string;
  introduction: string;
  problemStatement: string;
  literatureReview: string;
  methodology: string;
  findings: string;
  comparativeInsights: string;
  limitations: string;
  futureScope: string;
  conclusion: string;
  references: { title: string; url: string; credibility: number }[];
}

export interface ResearchScore {
  accuracy: number;
  bias: number;
  sourceDiversity: number;
  confidenceInterval: number;
}

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

export interface ReasoningStep {
  id: string;
  stage: string;
  action: string;
  insight: string;
  status: 'confirmed' | 'discarded' | 'pivoted';
  timestamp: string;
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

export interface Note {
  id: string;
  user_id: string;
  content: string;
  source_query: string;
  timestamp: string;
}

interface AppState {
  hasOnboarded: boolean;
  setHasOnboarded: (val: boolean) => void;
  
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  theme: 'light' | 'dark';
  toggleTheme: () => void;

  user: { id: string, username: string } | null;
  setUser: (user: { id: string, username: string } | null) => void;
  logout: () => void;
  
  isAuthOpen: boolean;
  setAuthOpen: (open: boolean) => void;

  isNotebookOpen: boolean;
  setNotebookOpen: (open: boolean) => void;

  isStatusOpen: boolean;
  setStatusOpen: (open: boolean) => void;

  currentView: 'onboarding' | 'landing' | 'research' | 'documentation' | 'games';
  setView: (view: 'onboarding' | 'landing' | 'research' | 'documentation' | 'games') => void;

  xp: number;
  searchCount: number;
  rank: string;
  gameScores: Record<string, number>;
  updateGameScore: (gameId: string, score: number) => void;
  updateGamification: (data: { xpAcquired?: number; searchCountIncrease?: number }) => void;
  badges: UserBadge[];
  lastSearchDate: string | null;
  streak: number;

  currentReport: COGNAPSE_Output | null;
  setCurrentReport: (report: COGNAPSE_Output | null) => void;
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

  setStats: (stats: { xp: number, searchCount: number, rank: string, gameScores: Record<string, number> }) => void;

  initialQuery: string | null;
  setInitialQuery: (q: string | null) => void;

  vibe: 'focus' | 'energy';
  setVibe: (vibe: 'focus' | 'energy') => void;

  deepResearch: DeepResearchState;
  setDeepResearch: (update: Partial<DeepResearchState>) => void;
  resetDeepResearch: () => void;

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

  addReasoningStep: (step: Omit<ReasoningStep, 'id' | 'timestamp'>) => void;
  clearReasoningTimeline: () => void;

  missions: { id: string; title: string; xp: number; completed: boolean }[];
  completeMission: (id: string) => void;
  refreshMissions: () => void;
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
      hasOnboarded: false,
      setHasOnboarded: (val) => set({ hasOnboarded: val, currentView: val ? 'landing' : 'onboarding' }),
      
      // Cleanup stale emojis from persisted state
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
      setUser: (user) => set({ user }),
      logout: async () => {
        try { await dbService.logout(); } catch(e) {}
        set({ 
          user: null, 
          xp: 0, 
          searchCount: 0, 
          gameScores: {}, 
          rank: 'OPERATIVE',
          archive: [],
          currentReport: null,
          notes: []
        });
      },

      isAuthOpen: false,
      setAuthOpen: (open) => set({ isAuthOpen: open }),

      isNotebookOpen: false,
      setNotebookOpen: (open) => set({ isNotebookOpen: open }),

      isStatusOpen: false,
      setStatusOpen: (open) => set({ isStatusOpen: open }),

      currentView: 'landing',
      setView: (view) => set({ currentView: view }),

      xp: 0,
      searchCount: 0,
      rank: "Novice",
      gameScores: {},
      updateGameScore: (gameId, score) => set((state) => {
        const currentHigh = state.gameScores[gameId] || 0;
        if (score > currentHigh) {
          const newScores = { ...state.gameScores, [gameId]: score };
          if (state.user) {
            dbService.syncStats(state.user.id, {
               xp: state.xp,
               search_count: state.searchCount,
               rank: state.rank,
               game_scores: newScores
            });
          }
          return { gameScores: newScores };
        }
        return state;
      }),
      badges: [],
      lastSearchDate: null,
      streak: 0,

      currentReport: null,
      setCurrentReport: (report) => set({ currentReport: report, currentChat: [] }),
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
      setArchive: (archive) => 
        set((state) => ({ 
          archive: typeof archive === 'function' ? archive(state.archive) : archive 
        })),
      addToArchive: (entry) =>
        set((state) => ({ archive: [entry, ...state.archive].slice(0, 100) })),
      removeFromArchive: (id) =>
        set((state) => {
          if (state.user) {
            dbService.deleteReport(id);
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
              scores: null,
              reasoningTimeline: []
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
        rank: stats.rank, 
        gameScores: stats.gameScores 
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
               rank: newRank,
               game_scores: state.gameScores
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

      vibe: 'focus',
      setVibe: (vibe) => set({ vibe }),

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

      addReasoningStep: (step) => set((state) => ({
        deepResearch: {
          ...state.deepResearch,
          reasoningTimeline: [
            ...state.deepResearch.reasoningTimeline,
            { ...step, id: crypto.randomUUID(), timestamp: new Date().toISOString() }
          ]
        }
      })),
      clearReasoningTimeline: () => set((state) => ({
        deepResearch: { ...state.deepResearch, reasoningTimeline: [] }
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
    }),
    {
      name: 'cognapse-storage',
      partialize: (state) => ({
        hasOnboarded: state.hasOnboarded,
        xp: state.xp,
        searchCount: state.searchCount,
        gameScores: state.gameScores,
        rank: state.rank,
        badges: state.badges,
        archive: state.archive,
        streak: state.streak,
        lastSearchDate: state.lastSearchDate,
        theme: state.theme,
        user: state.user,
        notes: state.notes,
        currentReport: state.currentReport,
        deepResearch: state.deepResearch,
      }),
    }
  )
);
