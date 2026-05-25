import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { 
  doc, 
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
    try {
      const email = `${username.toLowerCase().replace(/\s/g, '')}@cognapse.vault`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = { id: userCredential.user.uid, username };
      
      try {
        // Initialize stats
        await setDoc(doc(db, "user_stats", user.id), {
          xp: 0,
          search_count: 0,
          rank: "ANALYST"
        });
      } catch (statsErr) {
        console.warn("Firebase stats init failed, using local storage fallback:", statsErr);
        localStorage.setItem(`cognapse_stats_${user.id}`, JSON.stringify({
          xp: 0,
          search_count: 0,
          rank: "ANALYST",
          user_id: user.id
        }));
      }

      return { success: true, user };
    } catch (error: any) {
      if (!allowLocalVault) throw error;
      console.warn("Firebase Auth registration failed, falling back to local vault:", error);
      const localUsers = JSON.parse(localStorage.getItem('cognapse_local_users') || '{}');
      const lowerName = username.toLowerCase().replace(/\s/g, '');
      if (localUsers[lowerName]) {
        throw new Error("Username already registered in local vault.");
      }
      const localId = `local_${Date.now()}`;
      localUsers[lowerName] = { id: localId, username, password };
      localStorage.setItem('cognapse_local_users', JSON.stringify(localUsers));
      
      localStorage.setItem(`cognapse_stats_${localId}`, JSON.stringify({
        xp: 0,
        search_count: 0,
        rank: "ANALYST",
        user_id: localId
      }));

      return { success: true, user: { id: localId, username } };
    }
  },

  async login(username: string, password: string) {
    try {
      const email = `${username.toLowerCase().replace(/\s/g, '')}@cognapse.vault`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { 
        success: true, 
        user: { id: userCredential.user.uid, username } 
      };
    } catch (error: any) {
      if (!allowLocalVault) throw error;
      console.warn("Firebase Auth login failed, checking local vault:", error);
      const localUsers = JSON.parse(localStorage.getItem('cognapse_local_users') || '{}');
      const lowerName = username.toLowerCase().replace(/\s/g, '');
      const localUser = localUsers[lowerName];
      if (localUser && localUser.password === password) {
        return {
          success: true,
          user: { id: localUser.id, username: localUser.username }
        };
      }
      throw error;
    }
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
      const localReports = JSON.parse(localStorage.getItem(`cognapse_reports_${userId}`) || '[]');
      const filtered = localReports.filter((r: any) => r.id !== id);
      filtered.unshift(reportItem);
      localStorage.setItem(`cognapse_reports_${userId}`, JSON.stringify(filtered.slice(0, 100)));
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
        where("user_id", "==", userId)
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
        localStorage.setItem(`cognapse_reports_${userId}`, JSON.stringify(querySnapshot.docs.map(doc => doc.data())));
      }
      return reports;
    } catch (error) {
      console.warn("Firebase load reports failed, loading from local storage cache:", error);
      const local = localStorage.getItem(`cognapse_reports_${userId}`);
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
    localStorage.setItem(`cognapse_stats_${userId}`, JSON.stringify(statsItem));

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
        localStorage.setItem(`cognapse_stats_${userId}`, JSON.stringify(data));
        return data;
      }
    } catch (error) {
      console.warn("Firebase load stats failed, loading from local storage:", error);
    }
    
    const local = localStorage.getItem(`cognapse_stats_${userId}`);
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
      localStorage.setItem(`cognapse_notebook_${userId}`, JSON.stringify(notes));
      return notes;
    } catch (error) {
      console.warn("Firebase load notes failed, loading from local storage:", error);
      const local = localStorage.getItem(`cognapse_notebook_${userId}`);
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
      const localNotes = JSON.parse(localStorage.getItem(`cognapse_notebook_${userId}`) || '[]');
      const filtered = localNotes.filter((n: any) => n.id !== id);
      filtered.unshift(noteItem);
      localStorage.setItem(`cognapse_notebook_${userId}`, JSON.stringify(filtered));
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
          const notes = JSON.parse(localStorage.getItem(key) || '[]');
          const filtered = notes.filter((n: any) => n.id !== noteId);
          if (filtered.length !== notes.length) {
            localStorage.setItem(key, JSON.stringify(filtered));
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
    localStorage.removeItem(`cognapse_notebook_${userId}`);
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

  async deleteReport(id: string) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cognapse_reports_')) {
          const reports = JSON.parse(localStorage.getItem(key) || '[]');
          const filtered = reports.filter((r: any) => r.id !== id);
          if (filtered.length !== reports.length) {
            localStorage.setItem(key, JSON.stringify(filtered));
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
  },

  async clearHistory(userId: string) {
    localStorage.removeItem(`cognapse_reports_${userId}`);
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
  },

  // News Feed Subscriptions & Walkthrough Status
  async saveSettings(userId: string, settings: { subscribedCategories?: string[], walkthroughCompleted?: boolean }) {
    try {
      const current = JSON.parse(localStorage.getItem(`cognapse_settings_${userId}`) || '{}');
      const updated = { ...current, ...settings, user_id: userId, updated_at: new Date().toISOString() };
      localStorage.setItem(`cognapse_settings_${userId}`, JSON.stringify(updated));
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
        localStorage.setItem(`cognapse_settings_${userId}`, JSON.stringify(data));
        return data;
      }
    } catch (error) {
      console.warn("Firebase load settings failed, using local storage cache:", error);
    }
    
    const local = localStorage.getItem(`cognapse_settings_${userId}`);
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
      const localExports = JSON.parse(localStorage.getItem(`cognapse_exports_${exportData.userId}`) || '[]');
      const filtered = localExports.filter((e: any) => e.id !== exportData.id);
      filtered.unshift(exportData);
      localStorage.setItem(`cognapse_exports_${exportData.userId}`, JSON.stringify(filtered));
    } catch (e) {}

    try {
      await setDoc(doc(db, "pdf_exports", exportData.id), exportData);
    } catch (error) {
      console.warn("Firebase save export failed, using local fallback:", error);
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
      localStorage.setItem(`cognapse_exports_${userId}`, JSON.stringify(sorted));
      return sorted;
    } catch (error) {
      console.warn("Firebase load exports failed, loading from local storage:", error);
      const local = localStorage.getItem(`cognapse_exports_${userId}`);
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
    localStorage.setItem(localKey, JSON.stringify(record));
    if (input.ownerId) {
      const ownerKey = `cognapse_shared_index_${input.ownerId}`;
      const existing = safeParse<string[]>(localStorage.getItem(ownerKey), []);
      localStorage.setItem(ownerKey, JSON.stringify(Array.from(new Set([id, ...existing]))));
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
    const local = safeParse<SharedResearchRecord | null>(localStorage.getItem(localKey), null);
    const updatedAt = new Date().toISOString();
    if (local) {
      localStorage.setItem(localKey, JSON.stringify({ ...local, visibility, updatedAt }));
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
        localStorage.setItem(`cognapse_shared_${shareId}`, JSON.stringify(record));
        return record;
      }
    } catch (error) {
      console.warn("Firebase shared research load failed, checking local cache:", error);
    }
    return safeParse<SharedResearchRecord | null>(localStorage.getItem(`cognapse_shared_${shareId}`), null);
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
      shares.forEach(share => localStorage.setItem(`cognapse_shared_${share.id}`, JSON.stringify(share)));
      localStorage.setItem(`cognapse_shared_index_${ownerId}`, JSON.stringify(shares.map(s => s.id)));
      return shares.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.warn("Firebase shared research index failed, loading local shares:", error);
      const ids = safeParse<string[]>(localStorage.getItem(`cognapse_shared_index_${ownerId}`), []);
      return ids
        .map(id => safeParse<SharedResearchRecord | null>(localStorage.getItem(`cognapse_shared_${id}`), null))
        .filter(Boolean) as SharedResearchRecord[];
    }
  },

  async updateSharedResearch(record: SharedResearchRecord, visibility: ResearchVisibility) {
    const updated = {
      ...record,
      visibility,
      active: record.active !== false,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`cognapse_shared_${record.id}`, JSON.stringify(updated));
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
    localStorage.setItem(`cognapse_shared_${record.id}`, JSON.stringify(updated));
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
    localStorage.removeItem(`cognapse_shared_${record.id}`);
    const ownerKey = `cognapse_shared_index_${record.ownerId}`;
    const existing = safeParse<string[]>(localStorage.getItem(ownerKey), []);
    localStorage.setItem(ownerKey, JSON.stringify(existing.filter(id => id !== record.id)));
    try {
      await deleteDoc(doc(db, "shared_research", record.id));
    } catch (error) {
      console.warn("Firebase shared research delete failed, local share cache removed:", error);
    }
  },

  // Premium Access Models
  async loadPremium(userId: string) {
    try {
      if (import.meta.env.PROD) {
        const response = await apiFetch('/api/check-premium', { method: 'POST', body: JSON.stringify({ userId }) });
        if (response.ok) {
          const data = await response.json();
          if (data.premiumData) {
            localStorage.setItem(`cognapse_premium_${userId}`, JSON.stringify(data.premiumData));
            return data.premiumData;
          }
        }
      }
    } catch (e) {
      console.warn("API check-premium failed, falling back to Firebase:", e);
    }

    try {
      const docRef = doc(db, "user_premium", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        localStorage.setItem(`cognapse_premium_${userId}`, JSON.stringify(data));
        return data;
      }
    } catch (error) {
      console.warn("Firebase load premium failed, loading from local storage:", error);
    }
    
    const local = localStorage.getItem(`cognapse_premium_${userId}`);
    if (local) {
      try { return JSON.parse(local); } catch (e) { return null; }
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
    localStorage.setItem(`cognapse_premium_${userId}`, JSON.stringify(premiumData));
  },

  // #8: Premium chat history persistence
  async saveChatHistory(userId: string, history: any[]) {
    try {
      localStorage.setItem(`cognapse_chat_${userId}`, JSON.stringify(history));
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
        localStorage.setItem(`cognapse_chat_${userId}`, JSON.stringify(messages));
        return messages;
      }
    } catch (error) {
      console.warn('Firebase load chat history failed, loading from local storage:', error);
    }
    const local = localStorage.getItem(`cognapse_chat_${userId}`);
    if (local) {
      try { return JSON.parse(local); } catch { return []; }
    }
    return [];
  },

  clearLocalUserData(userId: string) {
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
    keys.forEach((k) => localStorage.removeItem(k));

    if (userId.startsWith('local_')) {
      const localUsers = safeParse<Record<string, { id: string }>>(
        localStorage.getItem('cognapse_local_users'),
        {}
      );
      const next = Object.fromEntries(
        Object.entries(localUsers).filter(([, u]) => u.id !== userId)
      );
      localStorage.setItem('cognapse_local_users', JSON.stringify(next));
    }
  },

  async deleteUserAccount(userId: string) {
    this.clearLocalUserData(userId);

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

      const sharedQ = query(
        collection(db, 'shared_research'),
        where('ownerId', '==', userId)
      );
      const sharedSnap = await getDocs(sharedQ);
      for (const d of sharedSnap.docs) {
        await deleteDoc(d.ref);
      }

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
      this.clearLocalUserData(userId);
      if (err?.code === 'auth/requires-recent-login') {
        const e = new Error('REAUTH_REQUIRED');
        (e as Error & { code: string }).code = 'auth/requires-recent-login';
        throw e;
      }
      throw error;
    }
  }
};

