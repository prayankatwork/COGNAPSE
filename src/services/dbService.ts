import { auth, db } from './firebase';
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from 'idb-keyval';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, limit, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy,
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import type { COGNAPSE_Output, ResearchVisibility, SharedResearchRecord } from '../types';
import { apiFetch } from './apiClient';

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
};

const getReportTitle = (report: COGNAPSE_Output) =>
  report.query_understood || report.deep_research?.title || "Untitled Research";

const getReportSummary = (report: COGNAPSE_Output) =>
  report.summary?.bottom_line || report.summary?.full_synthesis || report.deep_research?.abstract || "";

/** Local vault (plaintext passwords) — dev-only; never in production builds. */
const allowLocalVault =
  !import.meta.env.PROD &&
  (import.meta.env.DEV || import.meta.env.VITE_ALLOW_LOCAL_VAULT === 'true');

export const dbService = {
  // Auth (Map username to virtual email for seamless transition)
  async register(username: string, password: string) {
    const email = `${username.toLowerCase().replace(/\s/g, '')}@cognapse.vault`;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = { id: userCredential.user.uid, username };
    
    try {
      await setDoc(doc(db, "user_stats", user.id), {
        xp: 0,
        search_count: 0,
        rank: "ANALYST"
      });
    } catch (statsErr) {
      console.warn("Firebase stats init failed, using local storage fallback:", statsErr);
      await idbSet(`cognapse_stats_${user.id}`, JSON.stringify({
        xp: 0,
        search_count: 0,
        rank: "ANALYST",
        user_id: user.id
      }));
    }

    return { success: true, user };
  },

  async login(username: string, password: string) {
    const email = `${username.toLowerCase().replace(/\s/g, '')}@cognapse.vault`;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { 
      success: true, 
      user: { id: userCredential.user.uid, username } 
    };
  },

  async logout() {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase logout failed:", e);
    }
  },

  // Persistence for intelligence reports
  async saveReport(id: string, userId: string, queryText: string, data: COGNAPSE_Output) {
    const reportItem = {
      id,
      user_id: userId,
      query: queryText,
      data: JSON.stringify(data),
      timestamp: new Date().toISOString()
    };
    
    // Always keep a local copy as a backup/cache
    try {
      const localReports = JSON.parse((await idbGet<string>(`cognapse_reports_${userId}`) ?? null) || '[]');
      const filtered = localReports.filter((r: any) => r.id !== id);
      filtered.unshift(reportItem);
      await idbSet(`cognapse_reports_${userId}`, JSON.stringify(filtered.slice(0, 100)));
    } catch (e) {
      console.warn("Failed to write report to local storage cache:", e);
    }

    try {
      await setDoc(doc(db, "intelligence_reports", id), reportItem);
    } catch (error) {
      console.warn("Firebase save failed, falling back to local storage cache:", error);
    }
  },

  async getAllReports(userId: string) {
    try {
      const q = query(
        collection(db, "intelligence_reports"), 
        where("user_id", "==", userId),
        orderBy('timestamp', 'desc'),
        limit(15)
      );
      const querySnapshot = await getDocs(q);
      const reports = querySnapshot.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          data: JSON.parse(d.data)
        };
      });
      
      // Update local storage cache
      if (reports.length > 0) {
        await idbSet(`cognapse_reports_${userId}`, JSON.stringify(querySnapshot.docs.map(doc => doc.data())));
      }
      return reports;
    } catch (error) {
      console.warn("Firebase load reports failed, loading from local storage cache:", error);
      const local = (await idbGet<string>(`cognapse_reports_${userId}`) ?? null);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          return parsed.map((r: any) => ({
            ...r,
            data: JSON.parse(r.data)
          }));
        } catch (e) {
          return [];
        }
      }
      return [];
    }
  },

  // Persistence for user telemetry
  async syncStats(userId: string, stats: { xp: number; search_count: number; rank: string }) {
    const statsItem = {
      ...stats,
      user_id: userId
    };
    await idbSet(`cognapse_stats_${userId}`, JSON.stringify(statsItem));

    try {
      await setDoc(doc(db, "user_stats", userId), statsItem, { merge: true });
    } catch (error) {
      console.warn("Firebase stats sync failed, local storage updated.");
    }
  },

  async loadStats(userId: string) {
    try {
      const docRef = doc(db, "user_stats", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        await idbSet(`cognapse_stats_${userId}`, JSON.stringify(data));
        return data;
      }
    } catch (error) {
      console.warn("Firebase load stats failed, loading from local storage:", error);
    }
    
    const local = (await idbGet<string>(`cognapse_stats_${userId}`) ?? null);
    if (local) {
      try { return JSON.parse(local); } catch (e) { return null; }
    }
    return null;
  },

  // Notebook Sync
  async getNotes(userId: string) {
    try {
      const q = query(
        collection(db, "notebook"), 
        where("user_id", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      const notes = querySnapshot.docs.map(doc => doc.data());
      await idbSet(`cognapse_notebook_${userId}`, JSON.stringify(notes));
      return notes;
    } catch (error) {
      console.warn("Firebase load notes failed, loading from local storage:", error);
      const local = (await idbGet<string>(`cognapse_notebook_${userId}`) ?? null);
      if (local) {
        try { return JSON.parse(local); } catch (e) { return []; }
      }
      return [];
    }
  },

  async addNote(id: string, userId: string, content: string, sourceQuery: string) {
    const noteItem = {
      id,
      user_id: userId,
      content,
      source_query: sourceQuery,
      timestamp: new Date().toISOString()
    };

    try {
      const localNotes = JSON.parse((await idbGet<string>(`cognapse_notebook_${userId}`) ?? null) || '[]');
      const filtered = localNotes.filter((n: any) => n.id !== id);
      filtered.unshift(noteItem);
      await idbSet(`cognapse_notebook_${userId}`, JSON.stringify(filtered));
    } catch (e) {}

    try {
      await setDoc(doc(db, "notebook", id), noteItem);
    } catch (error) {
      console.warn("Firebase note sync failed, fallback to local storage active.");
    }
  },

  async deleteNote(noteId: string) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cognapse_notebook_')) {
          const notes = JSON.parse((await idbGet<string>(key) ?? null) || '[]');
          const filtered = notes.filter((n: any) => n.id !== noteId);
          if (filtered.length !== notes.length) {
            await idbSet(key, JSON.stringify(filtered));
            break;
          }
        }
      }
    } catch (e) {}

    try {
      await deleteDoc(doc(db, "notebook", noteId));
    } catch (error) {
      console.warn("Firebase note deletion failed, local storage updated.");
    }
  },

  async clearNotebook(userId: string) {
    await idbDel(`cognapse_notebook_${userId}`);
    try {
      const q = query(collection(db, "notebook"), where("user_id", "==", userId));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      console.warn("Firebase notebook purge failed, local storage cleared.");
    }
  },

  async deleteReport(id: string, userId?: string) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cognapse_reports_')) {
          const reports = JSON.parse((await idbGet<string>(key) ?? null) || '[]');
          const filtered = reports.filter((r: any) => r.id !== id);
          if (filtered.length !== reports.length) {
            await idbSet(key, JSON.stringify(filtered));
            break;
          }
        }
      }
    } catch (e) {}

    try {
      await deleteDoc(doc(db, "intelligence_reports", id));
    } catch (error) {
      console.warn("Firebase report deletion failed, local storage updated.");
    }

    // Also delete associated PDF exports and shared research links
    if (userId) {
      try {
        const exportsQ = query(
          collection(db, "pdf_exports"),
          where("researchId", "==", id)
        );
        const exportsSnap = await getDocs(exportsQ);
        for (const d of exportsSnap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn("Failed to delete associated exports:", e);
      }

      try {
        const sharedQ = query(
          collection(db, "shared_research"),
          where("researchId", "==", id)
        );
        const sharedSnap = await getDocs(sharedQ);
        for (const d of sharedSnap.docs) {
          await idbDel(`cognapse_shared_${d.id}`);
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn("Failed to delete associated shared research:", e);
      }
    }
  },

  async clearHistory(userId: string) {
    await idbDel(`cognapse_reports_${userId}`);
    try {
      const q = query(collection(db, "intelligence_reports"), where("user_id", "==", userId));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      console.warn("Firebase history purge failed, local storage cleared.");
    }

    // Also delete all PDF exports for this user
    try {
      const exportsQ = query(collection(db, "pdf_exports"), where("userId", "==", userId));
      const exportsSnap = await getDocs(exportsQ);
      for (const d of exportsSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn("Firebase exports purge failed:", e);
    }

    // Also delete all shared research for this user
    try {
      const sharedQ = query(collection(db, "shared_research"), where("ownerId", "==", userId));
      const sharedSnap = await getDocs(sharedQ);
      for (const d of sharedSnap.docs) {
        await idbDel(`cognapse_shared_${d.id}`);
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn("Firebase shared research purge failed:", e);
    }
  },

  // News Feed Subscriptions & Walkthrough Status
  async saveSettings(userId: string, settings: { subscribedCategories?: string[], walkthroughCompleted?: boolean }) {
    try {
      const current = JSON.parse((await idbGet<string>(`cognapse_settings_${userId}`) ?? null) || '{}');
      const updated = { ...current, ...settings, user_id: userId, updated_at: new Date().toISOString() };
      await idbSet(`cognapse_settings_${userId}`, JSON.stringify(updated));
    } catch (e) {}

    try {
      await setDoc(doc(db, "user_settings", userId), {
        ...settings,
        user_id: userId,
        updated_at: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.warn("Firebase settings sync failed.");
    }
  },

  async loadSettings(userId: string) {
    try {
      const docRef = doc(db, "user_settings", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        await idbSet(`cognapse_settings_${userId}`, JSON.stringify(data));
        return data;
      }
    } catch (error) {
      console.warn("Firebase load settings failed, using local storage cache:", error);
    }
    
    const local = (await idbGet<string>(`cognapse_settings_${userId}`) ?? null);
    if (local) {
      try { return JSON.parse(local); } catch (e) { return null; }
    }
    return null;
  },

  // PDF Exports
  async saveExport(exportData: {
    id: string;
    userId: string;
    researchId: string;
    exportType: 'normal' | 'deep';
    aiProvider: string;
    query: string;
    timestamp: string;
  }) {
    try {
      const localExports = JSON.parse((await idbGet<string>(`cognapse_exports_${exportData.userId}`) ?? null) || '[]');
      const filtered = localExports.filter((e: any) => e.id !== exportData.id);
      filtered.unshift(exportData);
      await idbSet(`cognapse_exports_${exportData.userId}`, JSON.stringify(filtered));
    } catch (e) {}

    try {
      await setDoc(doc(db, "pdf_exports", exportData.id), exportData);
    } catch (error) {
      console.warn("Firebase save export failed, using local fallback:", error);
    }
  },

  async deleteExport(exportId: string, userId: string) {
    // Remove from local storage
    try {
      const localExports = JSON.parse((await idbGet<string>(`cognapse_exports_${userId}`) ?? null) || '[]');
      const filtered = localExports.filter((e: any) => e.id !== exportId);
      await idbSet(`cognapse_exports_${userId}`, JSON.stringify(filtered));
    } catch (e) {}

    // Remove from Firestore
    try {
      await deleteDoc(doc(db, "pdf_exports", exportId));
    } catch (error) {
      console.warn("Firebase export deletion failed, local storage updated:", error);
    }
  },

  async clearExports(userId: string) {
    // Clear from local storage
    await idbDel(`cognapse_exports_${userId}`);

    // Clear from Firestore
    try {
      const exportsQ = query(collection(db, "pdf_exports"), where("userId", "==", userId));
      const exportsSnap = await getDocs(exportsQ);
      for (const d of exportsSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (error) {
      console.warn("Firebase exports clear failed, local storage cleared:", error);
    }
  },

  async getUserExports(userId: string) {
    try {
      const q = query(
        collection(db, "pdf_exports"),
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      const exports = querySnapshot.docs.map(doc => doc.data() as any);
      const sorted = exports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      await idbSet(`cognapse_exports_${userId}`, JSON.stringify(sorted));
      return sorted;
    } catch (error) {
      console.warn("Firebase load exports failed, loading from local storage:", error);
      const local = (await idbGet<string>(`cognapse_exports_${userId}`) ?? null);
      if (local) {
        try { return JSON.parse(local); } catch (e) { return []; }
      }
      return [];
    }
  },

  // Shared Research
  async createSharedResearch(input: {
    ownerId: string;
    ownerName: string;
    researchId: string;
    report: COGNAPSE_Output;
    visibility: ResearchVisibility;
  }) {
    const now = new Date().toISOString();
    const id = `share_${input.researchId}_${Date.now()}`;
    const record: SharedResearchRecord = {
      id,
      ownerId: input.ownerId,
      ownerName: input.ownerName,
      researchId: input.researchId,
      title: getReportTitle(input.report),
      summary: getReportSummary(input.report),
      visibility: input.visibility,
      report: input.report,
      sourceCount: input.report.sources?.length || 0,
      graphNodeCount: input.report.intelligence_map?.nodes?.length || 0,
      active: true,
      disabledAt: null,
      createdAt: now,
      updatedAt: now
    };

    const localKey = `cognapse_shared_${id}`;
    await idbSet(localKey, JSON.stringify(record));
    if (input.ownerId) {
      const ownerKey = `cognapse_shared_index_${input.ownerId}`;
      const existing = safeParse<string[]>((await idbGet<string>(ownerKey) ?? null), []);
      await idbSet(ownerKey, JSON.stringify(Array.from(new Set([id, ...existing]))));
    }

    try {
      await setDoc(doc(db, "shared_research", id), {
        ...record,
        report: JSON.stringify(record.report)
      });
    } catch (error) {
      console.warn("Firebase shared research save failed, local share cache active:", error);
    }
    return record;
  },

  async updateSharedResearchVisibility(shareId: string, visibility: ResearchVisibility) {
    const localKey = `cognapse_shared_${shareId}`;
    const local = safeParse<SharedResearchRecord | null>((await idbGet<string>(localKey) ?? null), null);
    const updatedAt = new Date().toISOString();
    if (local) {
      await idbSet(localKey, JSON.stringify({ ...local, visibility, updatedAt }));
    }
    try {
      await setDoc(doc(db, "shared_research", shareId), { visibility, updatedAt }, { merge: true });
    } catch (error) {
      console.warn("Firebase share visibility update failed:", error);
    }
  },

  async getSharedResearch(shareId: string) {
    try {
      const docSnap = await getDoc(doc(db, "shared_research", shareId));
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        const record = {
          ...data,
          active: data.active !== false,
          disabledAt: data.disabledAt || null,
          report: typeof data.report === "string" ? JSON.parse(data.report) : data.report
        } as SharedResearchRecord;
        await idbSet(`cognapse_shared_${shareId}`, JSON.stringify(record));
        return record;
      }
    } catch (error) {
      console.warn("Firebase shared research load failed, checking local cache:", error);
    }
    return safeParse<SharedResearchRecord | null>((await idbGet<string>(`cognapse_shared_${shareId}`) ?? null), null);
  },

  async getUserSharedResearch(ownerId: string) {
    try {
      const q = query(collection(db, "shared_research"), where("ownerId", "==", ownerId));
      const querySnapshot = await getDocs(q);
      const shares = querySnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          ...data,
          active: data.active !== false,
          disabledAt: data.disabledAt || null,
          report: typeof data.report === "string" ? JSON.parse(data.report) : data.report
        } as SharedResearchRecord;
      });
      for (const share of shares) { await idbSet(`cognapse_shared_${share.id}`, JSON.stringify(share)); }
      await idbSet(`cognapse_shared_index_${ownerId}`, JSON.stringify(shares.map(s => s.id)));
      return shares.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.warn("Firebase shared research index failed, loading local shares:", error);
      const ids = safeParse<string[]>((await idbGet<string>(`cognapse_shared_index_${ownerId}`) ?? null), []);
      const records = await Promise.all(ids.map(async id => safeParse<SharedResearchRecord | null>((await idbGet<string>(`cognapse_shared_${id}`) ?? null), null)));
      return records.filter(Boolean) as SharedResearchRecord[];
    }
  },

  async updateSharedResearch(record: SharedResearchRecord, visibility: ResearchVisibility) {
    const updated = {
      ...record,
      visibility,
      active: record.active !== false,
      updatedAt: new Date().toISOString()
    };
    await idbSet(`cognapse_shared_${record.id}`, JSON.stringify(updated));
    try {
      await setDoc(doc(db, "shared_research", record.id), {
        ...updated,
        report: JSON.stringify(updated.report)
      }, { merge: true });
    } catch (error) {
      console.warn("Firebase shared research update failed, local share cache active:", error);
    }
    return updated;
  },

  async disableSharedResearch(record: SharedResearchRecord) {
    const updated = {
      ...record,
      active: false,
      disabledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await idbSet(`cognapse_shared_${record.id}`, JSON.stringify(updated));
    try {
      await setDoc(doc(db, "shared_research", record.id), {
        active: false,
        disabledAt: updated.disabledAt,
        updatedAt: updated.updatedAt
      }, { merge: true });
    } catch (error) {
      console.warn("Firebase shared research disable failed, local share cache active:", error);
    }
    return updated;
  },

  async deleteSharedResearch(record: SharedResearchRecord) {
    await idbDel(`cognapse_shared_${record.id}`);
    const ownerKey = `cognapse_shared_index_${record.ownerId}`;
    const existing = safeParse<string[]>((await idbGet<string>(ownerKey) ?? null), []);
    await idbSet(ownerKey, JSON.stringify(existing.filter(id => id !== record.id)));
    try {
      await deleteDoc(doc(db, "shared_research", record.id));
    } catch (error) {
      console.warn("Firebase shared research delete failed, local share cache removed:", error);
    }
  },

  // Premium Access Models
  async loadPremium(userId: string) {
    // Try API first (handles expiry server-side)
    try {
      if (import.meta.env.PROD) {
        const response = await apiFetch('/api/check-premium', { method: 'POST', body: JSON.stringify({ userId }) });
        if (response.ok) {
          const data = await response.json();
          const result = {
            premium: data.premium === true,
            premiumPlan: data.premiumPlan || null,
            premiumActivatedAt: data.premiumActivatedAt || null,
            premiumExpiresAt: data.premiumExpiresAt || null,
          };
          await idbSet(`cognapse_premium_${userId}`, JSON.stringify(result));
          return result;
        }
      }
    } catch (e) {
      console.warn("API check-premium failed, falling back to Firebase:", e);
    }

    // Fallback: direct Firestore read with client-side expiry check
    try {
      const docRef = doc(db, "user_premium", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const now = new Date();
        const expiry = data.premiumExpiresAt ? new Date(data.premiumExpiresAt) : null;
        const expired = data.premium && expiry && expiry <= now;
        const result = {
          premium: data.premium === true && !expired,
          premiumPlan: expired ? null : data.premiumPlan || null,
          premiumActivatedAt: expired ? null : data.premiumActivatedAt || null,
          premiumExpiresAt: expired ? null : data.premiumExpiresAt || null,
        };
        await idbSet(`cognapse_premium_${userId}`, JSON.stringify(result));
        return result;
      }
    } catch (error) {
      console.warn("Firebase load premium failed, loading from local storage:", error);
    }
    
    // Final fallback: localStorage with client-side expiry check
    const local = (await idbGet<string>(`cognapse_premium_${userId}`) ?? null);
    if (local) {
      try {
        const data = JSON.parse(local);
        const now = new Date();
        const expiry = data.premiumExpiresAt ? new Date(data.premiumExpiresAt) : null;
        const expired = data.premium && expiry && expiry <= now;
        return {
          premium: data.premium === true && !expired,
          premiumPlan: expired ? null : data.premiumPlan || null,
          premiumActivatedAt: expired ? null : data.premiumActivatedAt || null,
          premiumExpiresAt: expired ? null : data.premiumExpiresAt || null,
        };
      } catch (e) { return null; }
    }
    return null;
  },
  
  async activatePremium(userId: string, plan: string) {
    const premiumData = {
      premium: true,
      premiumPlan: plan,
      premiumActivatedAt: new Date().toISOString(),
      premiumExpiresAt: plan === 'yearly'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    await idbSet(`cognapse_premium_${userId}`, JSON.stringify(premiumData));
  },

  // #8: Premium chat history persistence
  async saveChatHistory(userId: string, history: any[]) {
    try {
      await idbSet(`cognapse_chat_${userId}`, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save chat history to local storage:', e);
    }
    try {
      await setDoc(doc(db, 'chat_history', userId), {
        user_id: userId,
        messages: JSON.stringify(history),
        updated_at: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.warn('Firebase chat history save failed, local storage fallback active:', error);
    }
  },

  async loadChatHistory(userId: string) {
    try {
      const docRef = doc(db, 'chat_history', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const messages = safeParse<any[]>(data.messages || '[]', []);
        await idbSet(`cognapse_chat_${userId}`, JSON.stringify(messages));
        return messages;
      }
    } catch (error) {
      console.warn('Firebase load chat history failed, loading from local storage:', error);
    }
    const local = (await idbGet<string>(`cognapse_chat_${userId}`) ?? null);
    if (local) {
      try { return JSON.parse(local); } catch { return []; }
    }
    return [];
  },

  // Score history for trend analysis
  async saveScoreHistory(userId: string, report: COGNAPSE_Output) {
    const cluster = report.archive_entry?.topic_cluster || report.query_understood?.substring(0, 60);
    if (!cluster) return;
    const key = `cognapse_score_history_${userId}`;
    const history = JSON.parse((await idbGet<string>(key) ?? null) || '[]');
    history.push({
      cluster,
      scores: {
        accuracy: report.scores?.overall_credibility ?? 0,
        sourceDiversity: report.sources?.length || 0,
        confidenceInterval: report.scores?.evidence_consensus || 'insufficient',
        timestamp: new Date().toISOString(),
      },
    });
    await idbSet(key, JSON.stringify(history.slice(-50)));
  },

  async getScoreHistory(userId: string, cluster: string): Promise<any[]> {
    const key = `cognapse_score_history_${userId}`;
    const history = JSON.parse((await idbGet<string>(key) ?? null) || '[]');
    return history.filter((h: any) => h.cluster === cluster).slice(-5);
  },

  async clearLocalUserData(userId: string) {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.includes(userId) ||
        key === 'cognapse_session' ||
        key === 'cognapse-storage'
      ) {
        keys.push(key);
      }
    }
    await Promise.all(keys.map(k => idbDel(k)));

    if (userId.startsWith('local_')) {
      const localUsers = safeParse<Record<string, { id: string }>>(
        (await idbGet<string>('cognapse_local_users') ?? null),
        {}
      );
      const next = Object.fromEntries(
        Object.entries(localUsers).filter(([, u]) => u.id !== userId)
      );
      await idbSet('cognapse_local_users', JSON.stringify(next));
    }
  },

  async deleteUserAccount(userId: string) {
    await this.clearLocalUserData(userId);

    if (userId.startsWith('local_')) {
      try {
        await signOut(auth);
      } catch {
        /* ignore */
      }
      return { success: true };
    }

    try {
      await this.clearHistory(userId);
      await this.clearNotebook(userId);

      // Clear PDF exports
      try {
        const exportsQ = query(collection(db, 'pdf_exports'), where('userId', '==', userId));
        const exportsSnap = await getDocs(exportsQ);
        for (const d of exportsSnap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn('Failed to delete exports during account deletion:', e);
      }

      // Clear chat history
      try {
        await deleteDoc(doc(db, 'chat_history', userId));
      } catch (e) {
        console.warn('Failed to delete chat history:', e);
      }

      // Clear document chunks
      try {
        const chunksQ = query(collection(db, 'document_chunks'), where('userId', '==', userId));
        const chunksSnap = await getDocs(chunksQ);
        for (const d of chunksSnap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn('Failed to delete document chunks:', e);
      }

      // Clear user documents
      try {
        const docsQ = query(collection(db, 'user_documents'), where('userId', '==', userId));
        const docsSnap = await getDocs(docsQ);
        for (const d of docsSnap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn('Failed to delete user documents:', e);
      }

      // Note: shared_research, stats, settings, premium are already deleted in clearHistory
      // We still delete the user profile docs below

      const batch = writeBatch(db);
      batch.delete(doc(db, 'user_stats', userId));
      batch.delete(doc(db, 'user_settings', userId));
      batch.delete(doc(db, 'user_premium', userId));
      await batch.commit();

      if (auth.currentUser?.uid === userId) {
        await auth.currentUser.delete();
      }

      return { success: true };
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      console.error('Account excision failed:', err);
      await this.clearLocalUserData(userId);
      if (err?.code === 'auth/requires-recent-login') {
        const e = new Error('REAUTH_REQUIRED');
        (e as Error & { code: string }).code = 'auth/requires-recent-login';
        throw e;
      }
      throw error;
    }
  }
};

