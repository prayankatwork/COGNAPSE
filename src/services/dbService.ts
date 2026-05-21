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
import type { BoardActivity, BoardInvite, BoardMode, COGNAPSE_Output, IntelligenceBoard, ResearchVisibility, SharedResearchRecord } from '../types';

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
};

const getReportTitle = (report: COGNAPSE_Output) =>
  report.query_understood || report.deep_research?.title || "Untitled Research";

const getReportSummary = (report: COGNAPSE_Output) =>
  report.summary?.bottom_line || report.summary?.full_synthesis || report.deep_research?.abstract || "";

const normalizeAccessKey = (value: string) => value.trim().toLowerCase();

const deserializeBoard = (data: any) => ({
  ...data,
  researches: typeof data.researches === "string" ? JSON.parse(data.researches) : data.researches || [],
  nodeNotes: typeof data.nodeNotes === "string" ? JSON.parse(data.nodeNotes) : data.nodeNotes || {},
  activity: typeof data.activity === "string" ? JSON.parse(data.activity) : data.activity || [],
  archived: !!data.archived,
  archivedAt: data.archivedAt || null
}) as IntelligenceBoard;

const deserializeInvite = (data: any) => ({
  ...data,
  inviteeKeys: Array.isArray(data.inviteeKeys) ? data.inviteeKeys : []
}) as BoardInvite;

const activityEntry = (
  type: BoardActivity["type"],
  actor: { id: string; username: string },
  detail: string
): BoardActivity => ({
  id: crypto.randomUUID(),
  type,
  actorId: actor.id,
  actorName: actor.username,
  detail,
  timestamp: new Date().toISOString()
});

const withActivity = (
  board: IntelligenceBoard,
  type: BoardActivity["type"],
  actor: { id: string; username: string },
  detail: string
) => ({
  ...board,
  activity: [activityEntry(type, actor, detail), ...(board.activity || [])].slice(0, 100)
});

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

  // Intelligence Boards
  async saveBoard(board: IntelligenceBoard) {
    const localKey = `cognapse_board_${board.id}`;
    localStorage.setItem(localKey, JSON.stringify(board));
    const ownerKey = `cognapse_board_index_${board.ownerId}`;
    const existing = safeParse<string[]>(localStorage.getItem(ownerKey), []);
    localStorage.setItem(ownerKey, JSON.stringify(Array.from(new Set([board.id, ...existing]))));
    board.collaborators.forEach(collaborator => {
      const collabKey = `cognapse_board_collab_index_${normalizeAccessKey(collaborator)}`;
      const collabExisting = safeParse<string[]>(localStorage.getItem(collabKey), []);
      localStorage.setItem(collabKey, JSON.stringify(Array.from(new Set([board.id, ...collabExisting]))));
    });

    try {
      await setDoc(doc(db, "intelligence_boards", board.id), {
        ...board,
        researches: JSON.stringify(board.researches),
        nodeNotes: JSON.stringify(board.nodeNotes)
      });
    } catch (error) {
      console.warn("Firebase board save failed, local board cache active:", error);
    }
    return board;
  },

  async createBoard(input: {
    ownerId: string;
    ownerName: string;
    title: string;
    description: string;
    mode: BoardMode;
  }) {
    const now = new Date().toISOString();
    return this.saveBoard({
      id: `board_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ownerId: input.ownerId,
      ownerName: input.ownerName,
      title: input.title,
      description: input.description,
      mode: input.mode,
      collaborators: [],
      researches: [],
      nodeNotes: {},
      activity: [{
        id: crypto.randomUUID(),
        type: "created",
        actorId: input.ownerId,
        actorName: input.ownerName,
        detail: "Board created",
        timestamp: now
      }],
      archived: false,
      archivedAt: null,
      createdAt: now,
      updatedAt: now
    });
  },

  async getBoard(boardId: string) {
    try {
      const docSnap = await getDoc(doc(db, "intelligence_boards", boardId));
      if (docSnap.exists()) {
        const board = deserializeBoard(docSnap.data());
        localStorage.setItem(`cognapse_board_${boardId}`, JSON.stringify(board));
        return board;
      }
    } catch (error) {
      console.warn("Firebase board load failed, checking local cache:", error);
    }
    return safeParse<IntelligenceBoard | null>(localStorage.getItem(`cognapse_board_${boardId}`), null);
  },

  async getUserBoards(ownerId: string) {
    try {
      const q = query(collection(db, "intelligence_boards"), where("ownerId", "==", ownerId));
      const querySnapshot = await getDocs(q);
      const boards = querySnapshot.docs.map(doc => deserializeBoard(doc.data()));
      boards.forEach(board => localStorage.setItem(`cognapse_board_${board.id}`, JSON.stringify(board)));
      localStorage.setItem(`cognapse_board_index_${ownerId}`, JSON.stringify(boards.map(b => b.id)));
      return boards.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.warn("Firebase board index failed, loading local boards:", error);
      const ids = safeParse<string[]>(localStorage.getItem(`cognapse_board_index_${ownerId}`), []);
      return ids
        .map(id => safeParse<IntelligenceBoard | null>(localStorage.getItem(`cognapse_board_${id}`), null))
        .filter(Boolean) as IntelligenceBoard[];
    }
  },

  async getAccessibleBoards(userId: string, username: string) {
    const byId = new Map<string, IntelligenceBoard>();
    const addBoards = (boards: IntelligenceBoard[]) => boards.forEach(board => byId.set(board.id, board));

    addBoards(await this.getUserBoards(userId));

    const accessKeys = Array.from(new Set([userId, username, normalizeAccessKey(username)].filter(Boolean)));
    for (const accessKey of accessKeys) {
      try {
        const q = query(collection(db, "intelligence_boards"), where("collaborators", "array-contains", accessKey));
        const querySnapshot = await getDocs(q);
        addBoards(querySnapshot.docs.map(doc => deserializeBoard(doc.data())));
      } catch (error) {
        console.warn("Firebase collaborator board lookup failed, checking local cache:", error);
        const ids = safeParse<string[]>(localStorage.getItem(`cognapse_board_collab_index_${normalizeAccessKey(accessKey)}`), []);
        addBoards(ids
          .map(id => safeParse<IntelligenceBoard | null>(localStorage.getItem(`cognapse_board_${id}`), null))
          .filter(Boolean) as IntelligenceBoard[]);
      }
    }

    const boards = Array.from(byId.values());
    boards.forEach(board => localStorage.setItem(`cognapse_board_${board.id}`, JSON.stringify(board)));
    return boards.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async createBoardInvite(board: IntelligenceBoard, invitee: string, inviter: { id: string; username: string }) {
    const cleanInvitee = invitee.trim();
    const now = new Date().toISOString();
    const inviteeKeys = Array.from(new Set([
      cleanInvitee,
      normalizeAccessKey(cleanInvitee)
    ].filter(Boolean)));
    const id = `invite_${board.id}_${normalizeAccessKey(cleanInvitee).replace(/[^a-z0-9_-]/g, '_')}`;
    const invite: BoardInvite = {
      id,
      boardId: board.id,
      boardTitle: board.title,
      boardDescription: board.description,
      invitedById: inviter.id,
      invitedByName: inviter.username,
      invitee: cleanInvitee,
      inviteeKeys,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };

    localStorage.setItem(`cognapse_board_invite_${id}`, JSON.stringify(invite));
    inviteeKeys.forEach(key => {
      const indexKey = `cognapse_board_invite_index_${normalizeAccessKey(key)}`;
      const existing = safeParse<string[]>(localStorage.getItem(indexKey), []);
      localStorage.setItem(indexKey, JSON.stringify(Array.from(new Set([id, ...existing]))));
    });

    const boardWithActivity = withActivity(board, "invite_sent", inviter, `Invited ${cleanInvitee}`);
    await this.saveBoard(boardWithActivity);

    try {
      await setDoc(doc(db, "board_invites", id), invite);
    } catch (error) {
      console.warn("Firebase board invite save failed, local invite cache active:", error);
    }

    return invite;
  },

  async getUserBoardInvites(userId: string, username: string) {
    const byId = new Map<string, BoardInvite>();
    const accessKeys = Array.from(new Set([userId, username, normalizeAccessKey(username)].filter(Boolean)));

    for (const accessKey of accessKeys) {
      try {
        const q = query(collection(db, "board_invites"), where("inviteeKeys", "array-contains", accessKey));
        const querySnapshot = await getDocs(q);
        querySnapshot.docs
          .map(doc => deserializeInvite(doc.data()))
          .forEach(invite => byId.set(invite.id, invite));
      } catch (error) {
        console.warn("Firebase board invite lookup failed, checking local cache:", error);
        const ids = safeParse<string[]>(localStorage.getItem(`cognapse_board_invite_index_${normalizeAccessKey(accessKey)}`), []);
        ids
          .map(id => safeParse<BoardInvite | null>(localStorage.getItem(`cognapse_board_invite_${id}`), null))
          .filter(Boolean)
          .forEach(invite => byId.set((invite as BoardInvite).id, invite as BoardInvite));
      }
    }

    const invites = Array.from(byId.values()).filter(invite => invite.status === "pending");
    invites.forEach(invite => localStorage.setItem(`cognapse_board_invite_${invite.id}`, JSON.stringify(invite)));
    return invites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async acceptBoardInvite(invite: BoardInvite, user: { id: string; username: string }) {
    const board = await this.getBoard(invite.boardId);
    if (!board) throw new Error("Board invitation target was not found.");

    const collaborators = Array.from(new Set([
      ...board.collaborators,
      user.id,
      user.username,
      normalizeAccessKey(user.username)
    ].filter(Boolean)));

    const updatedBoard = await this.saveBoard(withActivity(
      { ...board, collaborators, updatedAt: new Date().toISOString() },
      "invite_accepted",
      user,
      `Accepted invitation to ${board.title}`
    ));
    const updatedInvite = { ...invite, status: "accepted" as const, updatedAt: new Date().toISOString() };
    localStorage.setItem(`cognapse_board_invite_${invite.id}`, JSON.stringify(updatedInvite));

    try {
      await setDoc(doc(db, "board_invites", invite.id), updatedInvite, { merge: true });
    } catch (error) {
      console.warn("Firebase board invite acceptance update failed:", error);
    }

    return updatedBoard;
  },

  async declineBoardInvite(invite: BoardInvite) {
    const updatedInvite = { ...invite, status: "declined" as const, updatedAt: new Date().toISOString() };
    localStorage.setItem(`cognapse_board_invite_${invite.id}`, JSON.stringify(updatedInvite));
    try {
      await setDoc(doc(db, "board_invites", invite.id), updatedInvite, { merge: true });
    } catch (error) {
      console.warn("Firebase board invite decline update failed:", error);
    }
    return updatedInvite;
  },

  async getSentBoardInvites(ownerId: string) {
    try {
      const q = query(collection(db, "board_invites"), where("invitedById", "==", ownerId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => deserializeInvite(doc.data()))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.warn("Firebase sent invite lookup failed:", error);
      return [];
    }
  },

  async cancelBoardInvite(invite: BoardInvite, actor: { id: string; username: string }) {
    const updatedInvite = { ...invite, status: "declined" as const, updatedAt: new Date().toISOString() };
    localStorage.setItem(`cognapse_board_invite_${invite.id}`, JSON.stringify(updatedInvite));
    const board = await this.getBoard(invite.boardId);
    if (board) {
      await this.saveBoard(withActivity(board, "invite_cancelled", actor, `Cancelled invitation for ${invite.invitee}`));
    }
    try {
      await setDoc(doc(db, "board_invites", invite.id), updatedInvite, { merge: true });
    } catch (error) {
      console.warn("Firebase board invite cancel update failed:", error);
    }
    return updatedInvite;
  },

  async resendBoardInvite(invite: BoardInvite, actor: { id: string; username: string }) {
    const updatedInvite = { ...invite, status: "pending" as const, updatedAt: new Date().toISOString() };
    localStorage.setItem(`cognapse_board_invite_${invite.id}`, JSON.stringify(updatedInvite));
    const board = await this.getBoard(invite.boardId);
    if (board) {
      await this.saveBoard(withActivity(board, "invite_sent", actor, `Resent invitation to ${invite.invitee}`));
    }
    try {
      await setDoc(doc(db, "board_invites", invite.id), updatedInvite, { merge: true });
    } catch (error) {
      console.warn("Firebase board invite resend update failed:", error);
    }
    return updatedInvite;
  },

  async updateBoardMode(board: IntelligenceBoard, mode: BoardMode, actor?: { id: string; username: string }) {
    const next = { ...board, mode, updatedAt: new Date().toISOString() };
    return this.saveBoard(actor ? withActivity(next, "mode_changed", actor, `Board visibility changed to ${mode}`) : next);
  },

  async updateBoardDetails(board: IntelligenceBoard, updates: { title: string; description: string }, actor: { id: string; username: string }) {
    return this.saveBoard(withActivity({
      ...board,
      title: updates.title.trim() || board.title,
      description: updates.description.trim(),
      updatedAt: new Date().toISOString()
    }, "updated", actor, "Board settings updated"));
  },

  async archiveBoard(board: IntelligenceBoard, actor: { id: string; username: string }) {
    return this.saveBoard(withActivity({
      ...board,
      archived: true,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, "updated", actor, "Board archived"));
  },

  async duplicateBoard(board: IntelligenceBoard, actor: { id: string; username: string }) {
    const now = new Date().toISOString();
    const duplicate: IntelligenceBoard = {
      ...board,
      id: `board_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ownerId: actor.id,
      ownerName: actor.username,
      title: `${board.title} Copy`,
      mode: "private",
      collaborators: [],
      activity: [activityEntry("duplicated", actor, `Duplicated from ${board.title}`)],
      archived: false,
      archivedAt: null,
      createdAt: now,
      updatedAt: now
    };
    return this.saveBoard(duplicate);
  },

  async addResearchToBoard(board: IntelligenceBoard, report: COGNAPSE_Output, actor?: { id: string; username: string }) {
    const researchId = report.id || `research_${Date.now()}`;
    const existing = board.researches.filter(item => item.researchId !== researchId);
    const next = {
      ...board,
      researches: [
        {
          researchId,
          title: getReportTitle(report),
          summary: getReportSummary(report),
          report: { ...report, id: researchId },
          addedById: actor?.id,
          addedByName: actor?.username,
          addedAt: new Date().toISOString()
        },
        ...existing
      ],
      updatedAt: new Date().toISOString()
    };
    return this.saveBoard(actor ? withActivity(next, "research_added", actor, `Added ${getReportTitle(report)}`) : next);
  },

  async removeResearchFromBoard(board: IntelligenceBoard, researchId: string, actor?: { id: string; username: string }) {
    const removed = board.researches.find(item => item.researchId === researchId);
    const next = {
      ...board,
      researches: board.researches.filter(item => item.researchId !== researchId),
      updatedAt: new Date().toISOString()
    };
    return this.saveBoard(actor ? withActivity(next, "research_removed", actor, `Removed ${removed?.title || "research"}`) : next);
  },

  async updateBoardCollaborators(board: IntelligenceBoard, collaborators: string[], actor?: { id: string; username: string }, detail = "Collaborator access updated") {
    const next = {
      ...board,
      collaborators,
      updatedAt: new Date().toISOString()
    };
    return this.saveBoard(actor ? withActivity(next, "collaborator_removed", actor, detail) : next);
  },

  async updateBoardNodeNote(board: IntelligenceBoard, noteKey: string, content: string, actor?: { id: string; username: string }) {
    const nodeNotes = { ...board.nodeNotes };
    if (content.trim()) {
      nodeNotes[noteKey] = actor
        ? { content, authorId: actor.id, authorName: actor.username, updatedAt: new Date().toISOString() }
        : content;
    }
    else delete nodeNotes[noteKey];
    const next = { ...board, nodeNotes, updatedAt: new Date().toISOString() };
    return this.saveBoard(actor ? withActivity(next, "note_updated", actor, "Updated a research node note") : next);
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
