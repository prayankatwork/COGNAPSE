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
import type { COGNAPSE_Output } from '../types';

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

  // Premium Access Models
  async loadPremium(userId: string) {
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

    try {
      await setDoc(doc(db, "user_premium", userId), premiumData);
    } catch (error) {
      console.warn("Firebase activate premium failed, local storage premium activated:", error);
    }
  },

  async deleteUserAccount(userId: string) {
    try {
      localStorage.removeItem(`cognapse_reports_${userId}`);
      localStorage.removeItem(`cognapse_stats_${userId}`);
      localStorage.removeItem(`cognapse_notebook_${userId}`);
      localStorage.removeItem(`cognapse_settings_${userId}`);
      localStorage.removeItem(`cognapse_exports_${userId}`);
      localStorage.removeItem(`cognapse_premium_${userId}`);

      const batch = writeBatch(db);
      
      // 1. Delete Reports
      const reportsQ = query(collection(db, "intelligence_reports"), where("user_id", "==", userId));
      const reportsSnap = await getDocs(reportsQ);
      reportsSnap.forEach(doc => batch.delete(doc.ref));

      // 2. Delete Notebook
      const notesQ = query(collection(db, "notebook"), where("user_id", "==", userId));
      const notesSnap = await getDocs(notesQ);
      notesSnap.forEach(doc => batch.delete(doc.ref));

      // 3. Delete Stats
      batch.delete(doc(db, "user_stats", userId));

      // 4. Delete Settings
      batch.delete(doc(db, "user_settings", userId));

      // 5. Delete Premium
      batch.delete(doc(db, "user_premium", userId));

      await batch.commit();

      // 6. Delete Auth User
      if (auth.currentUser) {
        await auth.currentUser.delete();
      }
      
      return { success: true };
    } catch (error: any) {
      console.error("Account excision failed:", error);
      throw error;
    }
  }
};
