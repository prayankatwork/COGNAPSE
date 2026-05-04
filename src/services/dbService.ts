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
      rank: "OPERATIVE"
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
  }
};
