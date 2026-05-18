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
    const email = `${username.toLowerCase().replace(/\s/g, '')}@cognapse.vault`;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = { id: userCredential.user.uid, username };
    
    // Initialize stats
    await setDoc(doc(db, "user_stats", user.id), {
      xp: 0,
      search_count: 0,
      rank: "ANALYST"
    });

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
    await signOut(auth);
  },

  // Persistence for intelligence reports
  async saveReport(id: string, userId: string, queryText: string, data: COGNAPSE_Output) {
    try {
      await setDoc(doc(db, "intelligence_reports", id), {
        id,
        user_id: userId,
        query: queryText,
        data: JSON.stringify(data),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn("Firebase save failed:", error);
    }
  },

  async getAllReports(userId: string) {
    try {
      const q = query(
        collection(db, "intelligence_reports"), 
        where("user_id", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          data: JSON.parse(d.data)
        };
      });
    } catch (error) {
      console.warn("Firebase load failed:", error);
      return [];
    }
  },

  // Persistence for user telemetry
  async syncStats(userId: string, stats: { xp: number; search_count: number; rank: string }) {
    try {
      await setDoc(doc(db, "user_stats", userId), {
        ...stats,
        user_id: userId
      }, { merge: true });
    } catch (error) {
      console.warn("Firebase stats sync failed.");
    }
  },

  async loadStats(userId: string) {
    try {
      const docRef = doc(db, "user_stats", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  // Notebook Sync
  async getNotes(userId: string) {
    try {
      const q = query(
        collection(db, "notebook"), 
        where("user_id", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      return [];
    }
  },

  async addNote(id: string, userId: string, content: string, sourceQuery: string) {
    try {
      await setDoc(doc(db, "notebook", id), {
        id,
        user_id: userId,
        content,
        source_query: sourceQuery,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn("Firebase note sync failed.");
    }
  },

  async deleteNote(noteId: string) {
    try {
      await deleteDoc(doc(db, "notebook", noteId));
    } catch (error) {
      console.warn("Firebase note deletion failed.");
    }
  },

  async clearNotebook(userId: string) {
    try {
      const q = query(collection(db, "notebook"), where("user_id", "==", userId));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      console.warn("Firebase notebook purge failed.");
    }
  },

  async deleteReport(id: string) {
    try {
      await deleteDoc(doc(db, "intelligence_reports", id));
    } catch (error) {
      console.warn("Firebase report deletion failed.");
    }
  },

  async clearHistory(userId: string) {
    try {
      const q = query(collection(db, "intelligence_reports"), where("user_id", "==", userId));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      console.warn("Firebase history purge failed.");
    }
  },

  // News Feed Subscriptions & Walkthrough Status
  async saveSettings(userId: string, settings: { subscribedCategories?: string[], walkthroughCompleted?: boolean }) {
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
        return docSnap.data();
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  async deleteUserAccount(userId: string) {
    try {
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

      await batch.commit();

      // 5. Delete Auth User
      if (auth.currentUser) {
        await auth.currentUser.delete();
      }
      
      return { success: true };
    } catch (error: any) {
      console.error("Account excision failed:", error);
      throw error;
    }
  },

  // Premium PDF Export History Sync
  async saveExportRecord(id: string, userId: string, researchId: string, queryText: string, exportType: string, aiProvider: string) {
    const record = {
      id,
      user_id: userId,
      research_id: researchId,
      query: queryText,
      export_type: exportType,
      ai_provider: aiProvider,
      created_at: new Date().toISOString()
    };

    // 1. Save to Firestore
    try {
      await setDoc(doc(db, "user_exports", id), record);
    } catch (error) {
      console.warn("Firestore export save failed, using local vault sync...");
    }

    // 2. Synchronize to Local SQLite Express Backend
    try {
      await fetch("http://127.0.0.1:3001/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });
    } catch (error) {
      // Local server is not running or unreachable
    }
  },

  async getExportHistory(userId: string) {
    // 1. Try Firestore First
    try {
      const q = query(
        collection(db, "user_exports"),
        where("user_id", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: d.id,
            user_id: d.user_id,
            research_id: d.research_id,
            query: d.query,
            export_type: d.export_type,
            ai_provider: d.ai_provider,
            created_at: d.created_at
          };
        });
      }
    } catch (error) {
      console.warn("Firestore export fetch failed, falling back to local vault...");
    }

    // 2. Fallback to Local SQLite Express Server
    try {
      const res = await fetch(`http://127.0.0.1:3001/api/exports/${userId}`);
      if (res.ok) {
        const localExports = await res.json();
        return localExports;
      }
    } catch (error) {
      // Local server offline
    }

    return [];
  }
};
