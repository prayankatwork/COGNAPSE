import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Archive, Calendar, CheckCircle2, Copy, FilePlus2, FlaskConical, History, Loader2, Lock, MailCheck, Network, Plus, RotateCcw, Search, Settings, Share2, Trash2, Users, X } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store';
import { dbService } from '../services/dbService';
import type { BoardInvite, BoardMode, BoardNodeNote, IntelligenceBoard, ResearchVisibility, SharedResearchRecord } from '../types';
import PhysicsMap from './PhysicsMap';

const matchesCollaborator = (board: IntelligenceBoard, user: { id: string; username: string } | null) => {
  if (!user) return false;
  const keys = [user.id, user.username, user.username.toLowerCase()];
  return board.collaborators.map(item => item.toLowerCase()).some(item => keys.includes(item));
};

const displayCollaborators = (board: IntelligenceBoard, ownerId: string) => {
  const seen = new Set<string>();
  return board.collaborators
    .filter(item => item !== ownerId)
    .filter(item => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const noteContent = (note: string | BoardNodeNote | undefined) =>
  typeof note === 'string' ? note : note?.content || "";

const noteMeta = (note: string | BoardNodeNote | undefined) =>
  typeof note === 'object' && note ? `${note.authorName} · ${new Date(note.updatedAt).toLocaleString()}` : "";

const explainVisibility = (visibility: ResearchVisibility | BoardMode) => {
  if (visibility === "private") return "Only you can access it.";
  if (visibility === "unlisted") return "Anyone with the link can view it.";
  if (visibility === "shared") return "Accepted collaborators can co-manage it.";
  return "Anyone with the board link can view it read-only.";
};

export default function IntelligenceBoards({ routeBoardId }: { routeBoardId?: string }) {
  const { user, setAuthOpen, archive, currentReport, setCurrentReport, setView } = useStore();
  const [boards, setBoards] = useState<IntelligenceBoard[]>([]);
  const [pendingInvites, setPendingInvites] = useState<BoardInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<BoardInvite[]>([]);
  const [sharedResearch, setSharedResearch] = useState<SharedResearchRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [copiedBoardId, setCopiedBoardId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<BoardMode>("private");
  const [collaborator, setCollaborator] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [selectedNodeNotes, setSelectedNodeNotes] = useState<Record<string, string>>({});
  const [boardSearch, setBoardSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [settingsTitle, setSettingsTitle] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");

  const activeBoard = useMemo(
    () => boards.find(board => board.id === activeId) || boards[0] || null,
    [boards, activeId]
  );
  const isOwner = !!activeBoard && activeBoard.ownerId === user?.id;
  const isCollaborator = !!activeBoard && matchesCollaborator(activeBoard, user);
  const canManageBoard = !!activeBoard && (isOwner || (activeBoard.mode === 'shared' && isCollaborator));
  const canViewBoard = !!activeBoard && (activeBoard.mode === 'public' || isOwner || (activeBoard.mode === 'shared' && isCollaborator));

  const filteredBoards = useMemo(() => {
    const q = boardSearch.trim().toLowerCase();
    return boards.filter(board => {
      if (!q) return true;
      return (
        board.title.toLowerCase().includes(q) ||
        board.description.toLowerCase().includes(q) ||
        board.mode.toLowerCase().includes(q) ||
        board.researches.some(item => item.title.toLowerCase().includes(q) || item.summary.toLowerCase().includes(q))
      );
    });
  }, [boards, boardSearch]);

  const filteredArchive = useMemo(() => {
    const q = archiveSearch.trim().toLowerCase();
    return archive.filter(item => {
      const title = item.report?.query_understood || item.query || "";
      return !q || title.toLowerCase().includes(q) || (item.summary_snippet || "").toLowerCase().includes(q);
    });
  }, [archive, archiveSearch]);

  useEffect(() => {
    let mounted = true;
    const loadBoards = async () => {
      setLoading(true);
      setAccessError(null);
      let data: IntelligenceBoard[] = [];
      if (routeBoardId) {
        const board = await dbService.getBoard(routeBoardId);
        if (board) data = [board];
      } else if (user) {
        data = await dbService.getAccessibleBoards(user.id, user.username);
      }
      const invites = user ? await dbService.getUserBoardInvites(user.id, user.username) : [];
      const sent = user ? await dbService.getSentBoardInvites(user.id) : [];
      const shares = user ? await dbService.getUserSharedResearch(user.id) : [];
      if (mounted) {
        const visible = data.filter(board =>
          !board.archived && (
            board.mode === 'public' ||
            board.ownerId === user?.id ||
            (board.mode === 'shared' && matchesCollaborator(board, user))
          )
        );
        setBoards(visible);
        setPendingInvites(invites);
        setSentInvites(sent);
        setSharedResearch(shares);
        setActiveId(routeBoardId || visible[0]?.id || null);
        if (routeBoardId && data[0] && visible.length === 0) {
          setAccessError(data[0].mode === 'private' ? "This board is private." : "Sign in as an invited collaborator to access this shared board.");
        } else if (routeBoardId && !data[0]) {
          setAccessError("Board link was not found.");
        }
        setLoading(false);
      }
    };
    loadBoards();
    return () => { mounted = false; };
  }, [routeBoardId, user?.id, user?.username]);

  useEffect(() => {
    if (activeBoard) {
      setSettingsTitle(activeBoard.title);
      setSettingsDescription(activeBoard.description);
      setConfirmArchive(false);
    }
  }, [activeBoard?.id]);

  const replaceBoard = (board: IntelligenceBoard) => {
    setBoards(prev => [board, ...prev.filter(item => item.id !== board.id)]);
    setActiveId(board.id);
    setSyncNotice("Saved to Firebase. If cloud sync is temporarily unavailable, Cognapse keeps a local cache and retries on the next load.");
  };

  const createBoard = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const board = await dbService.createBoard({
      ownerId: user.id,
      ownerName: user.username,
      title: title.trim() || "Untitled Intelligence Board",
      description: description.trim(),
      mode
    });
    setTitle("");
    setDescription("");
    replaceBoard(board);
    setShowSettings(false);
  };

  const addCurrentResearch = async (board: IntelligenceBoard) => {
    if (!canManageBoard || !currentReport) return;
    replaceBoard(await dbService.addResearchToBoard(board, currentReport, user ? { id: user.id, username: user.username } : undefined));
  };

  const addArchivedResearch = async (board: IntelligenceBoard, reportId: string) => {
    if (!canManageBoard) return;
    const entry = archive.find(item => item.id === reportId);
    if (!entry) return;
    replaceBoard(await dbService.addResearchToBoard(board, entry.report, user ? { id: user.id, username: user.username } : undefined));
  };

  const removeResearch = async (board: IntelligenceBoard, researchId: string) => {
    if (!canManageBoard) return;
    replaceBoard(await dbService.removeResearchFromBoard(board, researchId, user ? { id: user.id, username: user.username } : undefined));
  };

  const updateMode = async (board: IntelligenceBoard, nextMode: BoardMode) => {
    if (!isOwner) return;
    replaceBoard(await dbService.updateBoardMode(board, nextMode, user ? { id: user.id, username: user.username } : undefined));
  };

  const addCollaborator = async (board: IntelligenceBoard) => {
    if (!isOwner) return;
    const clean = collaborator.trim();
    if (!clean) return;
    setCollaborator("");
    setInviteStatus("");
    const invite = await dbService.createBoardInvite(board, clean, { id: user!.id, username: user!.username });
    setSentInvites(prev => [invite, ...prev.filter(item => item.id !== invite.id)]);
    setInviteStatus(`Invitation sent to ${clean}. They will see it in Intelligence Boards and must accept before access is enabled.`);
  };

  const removeCollaborator = async (board: IntelligenceBoard, value: string) => {
    if (!isOwner) return;
    const normalized = value.toLowerCase();
    replaceBoard(await dbService.updateBoardCollaborators(
      board,
      board.collaborators.filter(item => item.toLowerCase() !== normalized),
      user ? { id: user.id, username: user.username } : undefined,
      `Revoked collaborator access for ${value}`
    ));
  };

  const saveNodeNote = async (board: IntelligenceBoard, key: string) => {
    if (!canManageBoard) return;
    replaceBoard(await dbService.updateBoardNodeNote(board, key, noteDrafts[key] ?? noteContent(board.nodeNotes[key]), user ? { id: user.id, username: user.username } : undefined));
  };

  const acceptInvite = async (invite: BoardInvite) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const board = await dbService.acceptBoardInvite(invite, { id: user.id, username: user.username });
    setPendingInvites(prev => prev.filter(item => item.id !== invite.id));
    replaceBoard(board);
  };

  const declineInvite = async (invite: BoardInvite) => {
    await dbService.declineBoardInvite(invite);
    setPendingInvites(prev => prev.filter(item => item.id !== invite.id));
  };

  const cancelInvite = async (invite: BoardInvite) => {
    if (!user) return;
    const updated = await dbService.cancelBoardInvite(invite, { id: user.id, username: user.username });
    setSentInvites(prev => prev.map(item => item.id === invite.id ? updated : item));
  };

  const resendInvite = async (invite: BoardInvite) => {
    if (!user) return;
    const updated = await dbService.resendBoardInvite(invite, { id: user.id, username: user.username });
    setSentInvites(prev => prev.map(item => item.id === invite.id ? updated : item));
  };

  const saveSettings = async () => {
    if (!activeBoard || !user || !isOwner) return;
    replaceBoard(await dbService.updateBoardDetails(activeBoard, {
      title: settingsTitle,
      description: settingsDescription
    }, { id: user.id, username: user.username }));
    setShowSettings(false);
  };

  const archiveActiveBoard = async () => {
    if (!activeBoard || !user || !isOwner) return;
    if (!confirmArchive) {
      setConfirmArchive(true);
      return;
    }
    const archived = await dbService.archiveBoard(activeBoard, { id: user.id, username: user.username });
    setBoards(prev => prev.filter(board => board.id !== archived.id));
    setActiveId(null);
    setConfirmArchive(false);
  };

  const updateShareVisibility = async (share: SharedResearchRecord, visibility: ResearchVisibility) => {
    const updated = await dbService.updateSharedResearch(share, visibility);
    setSharedResearch(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  const disableShare = async (share: SharedResearchRecord) => {
    const updated = await dbService.disableSharedResearch(share);
    setSharedResearch(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  const deleteShare = async (share: SharedResearchRecord) => {
    await dbService.deleteSharedResearch(share);
    setSharedResearch(prev => prev.filter(item => item.id !== share.id));
  };

  const copyBoardLink = async (board: IntelligenceBoard) => {
    const url = `${window.location.origin}/board/${board.id}`;
    await navigator.clipboard?.writeText(url);
    setCopiedBoardId(board.id);
    setTimeout(() => setCopiedBoardId(null), 1800);
  };

  if (!user && !routeBoardId) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md text-center border border-my-border bg-my-callout p-8">
          <Lock size={28} className="mx-auto text-my-accent mb-4" />
          <h1 className="font-serif text-2xl text-my-ink mb-3">Intelligence Boards</h1>
          <p className="text-sm text-my-muted mb-6">Sign in to create persistent knowledge spaces and save research across sessions.</p>
          <button onClick={() => setAuthOpen(true)} className="px-6 py-3 bg-my-ink text-white dark:bg-my-accent dark:text-black text-[10px] font-black uppercase tracking-widest">
            Sync Identity
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-my-bg">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        <div className="mb-5 border border-my-border bg-my-callout/70 px-4 py-3 flex items-start gap-3 text-my-muted">
          <FlaskConical size={14} className="text-my-accent mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            Intelligence Boards, public board links, and collaborative board management are in preview testing. Core saving and sharing workflows are active, while polish and permissions UX may still evolve.
          </p>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 border-b border-my-border pb-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-my-accent mb-2">
              <Network size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Persistent Knowledge Spaces</span>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl text-my-ink">Intelligence Boards</h1>
            <p className="mt-3 text-sm leading-relaxed text-my-muted">
              Organize research into durable workspaces, manage board access, and annotate the exact graph nodes that matter.
            </p>
          </div>

          <div className="grid grid-cols-3 border border-my-border bg-my-callout/80 min-w-full xl:min-w-[360px]">
            <div className="px-4 py-3">
              <div className="text-2xl font-black text-my-ink">{boards.length}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-my-muted">Boards</div>
            </div>
            <div className="px-4 py-3 border-x border-my-border">
              <div className="text-2xl font-black text-my-ink">{activeBoard?.researches.length || 0}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-my-muted">Saved</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-2xl font-black text-my-ink">{pendingInvites.length}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-my-muted">Invites</div>
            </div>
          </div>
        </div>

        {syncNotice && (
          <div className="mb-5 border border-my-border bg-my-callout/60 px-4 py-3 text-[11px] text-my-muted leading-relaxed">
            {syncNotice}
          </div>
        )}

        {user && pendingInvites.length > 0 && (
          <section className="mb-6 border border-my-accent/25 bg-my-accent/5 p-4">
            <div className="flex items-center gap-2 mb-4 text-my-accent">
              <MailCheck size={15} />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em]">Pending Board Invitations</h2>
            </div>
            <div className="grid gap-3">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="border border-my-border bg-my-callout p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-xl text-my-ink">{invite.boardTitle}</h3>
                    <p className="text-xs text-my-muted mt-1">
                      Invited by {invite.invitedByName}. {invite.boardDescription || "No board description provided."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptInvite(invite)} className="px-4 py-2 bg-my-ink text-white dark:bg-my-accent dark:text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 size={12} /> Accept
                    </button>
                    <button onClick={() => declineInvite(invite)} className="px-4 py-2 border border-my-border text-my-muted hover:text-red-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                      <X size={12} /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {user && sharedResearch.length > 0 && (
          <section className="mb-6 border border-my-border bg-my-callout p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted flex items-center gap-2">
                  <Share2 size={13} className="text-my-accent" /> Shared Research Manager
                </h2>
                <p className="text-[11px] text-my-muted mt-2">Manage active research links, visibility, and disabled shares.</p>
              </div>
            </div>
            <div className="grid gap-3">
              {sharedResearch.map(share => (
                <div key={share.id} className="border border-my-border bg-my-bg p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-serif text-lg text-my-ink truncate">{share.title}</h3>
                    <p className="text-[11px] text-my-muted mt-1 line-clamp-2">{share.summary}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-[9px] uppercase tracking-widest font-bold text-my-muted">
                      <span>{share.active === false ? "Disabled" : "Active"}</span>
                      <span>{share.visibility}</span>
                      <span>{new Date(share.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={share.visibility}
                      onChange={e => updateShareVisibility(share, e.target.value as ResearchVisibility)}
                      disabled={share.active === false}
                      className="bg-my-callout border border-my-border px-3 py-2 text-[9px] uppercase tracking-widest font-bold text-my-ink disabled:opacity-50"
                    >
                      <option value="private">Private</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="public">Public</option>
                    </select>
                    <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/share/${share.id}`)} className="px-3 py-2 border border-my-border text-[9px] font-black uppercase tracking-widest text-my-muted flex items-center gap-2">
                      <Copy size={12} /> Copy
                    </button>
                    <button onClick={() => disableShare(share)} disabled={share.active === false} className="px-3 py-2 border border-my-border text-[9px] font-black uppercase tracking-widest text-my-muted disabled:opacity-50">
                      Disable
                    </button>
                    <button onClick={() => deleteShare(share)} className="px-3 py-2 border border-red-500/30 text-[9px] font-black uppercase tracking-widest text-red-500">
                      Delete
                    </button>
                  </div>
                  <p className="lg:basis-full text-[10px] text-my-muted">{explainVisibility(share.visibility)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {user && sentInvites.length > 0 && (
          <section className="mb-6 border border-my-border bg-my-callout p-5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted mb-4 flex items-center gap-2">
              <MailCheck size={13} className="text-my-accent" /> Sent Invitations
            </h2>
            <div className="grid gap-3">
              {sentInvites.slice(0, 8).map(invite => (
                <div key={invite.id} className="border border-my-border bg-my-bg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-my-ink">{invite.invitee}</div>
                    <div className="text-[10px] uppercase tracking-widest text-my-muted">{invite.boardTitle} · {invite.status}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => resendInvite(invite)} className="px-3 py-2 border border-my-border text-[9px] font-black uppercase tracking-widest text-my-muted flex items-center gap-2">
                      <RotateCcw size={11} /> Resend
                    </button>
                    {invite.status === "pending" && (
                      <button onClick={() => cancelInvite(invite)} className="px-3 py-2 border border-red-500/30 text-[9px] font-black uppercase tracking-widest text-red-500">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-my-muted text-[10px] font-black uppercase tracking-[0.3em]">
            <Loader2 size={16} className="animate-spin text-my-accent" /> Loading Boards
          </div>
        ) : (
          <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] gap-6">
            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <section className="border border-my-border bg-my-callout/90 p-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted">New Board</h2>
                  <Plus size={14} className="text-my-accent" />
                </div>
                <div className="grid gap-2">
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Board title" className="bg-my-bg border border-my-border px-3 py-2.5 text-sm text-my-ink focus:outline-none focus:border-my-accent" />
                  <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="bg-my-bg border border-my-border px-3 py-2.5 text-sm text-my-ink focus:outline-none focus:border-my-accent" />
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <select value={mode} onChange={e => setMode(e.target.value as BoardMode)} className="bg-my-bg border border-my-border px-3 py-2.5 text-[10px] uppercase tracking-widest font-bold text-my-ink">
                      <option value="private">Private</option>
                      <option value="shared">Shared</option>
                      <option value="public">Public</option>
                    </select>
                    <button onClick={createBoard} className="px-4 py-2.5 bg-my-ink text-white dark:bg-my-accent dark:text-black text-[10px] font-black uppercase tracking-widest">
                      Create
                    </button>
                  </div>
                </div>
              </section>

              <section className="border border-my-border bg-my-callout/90 p-3">
              <div className="relative mb-3">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-my-muted" />
                <input
                  value={boardSearch}
                  onChange={e => setBoardSearch(e.target.value)}
                  placeholder="Search boards..."
                  className="w-full bg-my-bg border border-my-border pl-8 pr-3 py-2 text-xs text-my-ink focus:outline-none focus:border-my-accent"
                />
              </div>
              <div className="max-h-[430px] overflow-y-auto pr-1">
              {boards.length === 0 ? (
                <div className="text-xs text-my-muted p-4 space-y-3">
                  <p>Create your first board to collect research over time.</p>
                  <p className="text-[10px] uppercase tracking-widest">Start by saving the current research, adding from archive, or inviting collaborators after switching to shared mode.</p>
                </div>
              ) : filteredBoards.length === 0 ? (
                <p className="text-xs text-my-muted p-4">No boards match your search.</p>
              ) : filteredBoards.map(board => (
                <button
                  key={board.id}
                  onClick={() => setActiveId(board.id)}
                  className={clsx("w-full text-left p-4 mb-2 last:mb-0 border transition-colors", activeBoard?.id === board.id ? "border-my-accent bg-my-accent/10" : "border-my-border bg-my-bg/70 hover:border-my-accent/50")}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="text-sm font-bold text-my-ink truncate">{board.title}</div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-my-accent">{board.mode}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-widest text-my-muted">
                    <span>{board.researches.length} researches</span>
                    <span>{new Date(board.updatedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
              </div>
              </section>
            </aside>

            {accessError && (
              <main className="border border-my-border bg-my-callout p-8 text-center">
                <AlertCircle size={28} className="mx-auto mb-4 text-red-500" />
                <h2 className="font-serif text-2xl text-my-ink mb-3">Board unavailable</h2>
                <p className="text-sm text-my-muted mb-5">{accessError}</p>
                {!user && (
                  <button onClick={() => setAuthOpen(true)} className="px-5 py-3 bg-my-ink text-white dark:bg-my-accent dark:text-black text-[10px] font-black uppercase tracking-widest">
                    Sync Identity
                  </button>
                )}
              </main>
            )}

            {activeBoard && canViewBoard && (
              <main className="min-w-0 space-y-5">
                <section className="border border-my-border bg-my-callout/90 p-5">
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="border border-my-accent/40 bg-my-accent/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-my-accent">{activeBoard.mode}</span>
                        {!isOwner && isCollaborator && <span className="border border-my-border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-my-muted">Collaborator</span>}
                        {!canManageBoard && activeBoard.mode === 'public' && <span className="border border-my-border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-my-muted">Read Only</span>}
                      </div>
                      <h2 className="font-serif text-3xl md:text-4xl text-my-ink mb-2">{activeBoard.title}</h2>
                      <p className="text-sm text-my-muted max-w-3xl leading-relaxed">{activeBoard.description || "No description yet."}</p>
                      <div className="grid sm:grid-cols-3 gap-3 mt-5 text-[10px] uppercase tracking-widest font-bold text-my-muted">
                        <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(activeBoard.updatedAt).toLocaleString()}</span>
                        <span className="flex items-center gap-1.5"><Network size={12} /> {activeBoard.researches.length} saved</span>
                        <span className="flex items-center gap-1.5"><Users size={12} /> {displayCollaborators(activeBoard, activeBoard.ownerId).length} collaborators</span>
                      </div>
                      <p className="text-[11px] text-my-muted mt-3">{explainVisibility(activeBoard.mode)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button onClick={() => copyBoardLink(activeBoard)} className="px-3 py-2 text-[9px] font-black uppercase tracking-widest border border-my-border text-my-muted hover:border-my-accent hover:text-my-ink flex items-center gap-2">
                        {copiedBoardId === activeBoard.id ? <Copy size={12} /> : <Share2 size={12} />}
                        {copiedBoardId === activeBoard.id ? "Copied" : "Board Link"}
                      </button>
                      {isOwner && (
                        <button onClick={() => setShowSettings(v => !v)} className={clsx("px-3 py-2 text-[9px] font-black uppercase tracking-widest border flex items-center gap-2", showSettings ? "border-my-accent bg-my-accent/10 text-my-accent" : "border-my-border text-my-muted hover:border-my-accent hover:text-my-ink")}>
                          <Settings size={12} /> Settings
                        </button>
                      )}
                      {inviteStatus && (
                        <span className="w-full text-[10px] text-my-muted leading-relaxed">
                          {inviteStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </section>

                {showSettings && isOwner && (
                  <section className="grid xl:grid-cols-[1fr_320px] gap-4 border border-my-border bg-my-callout/90 p-5">
                    <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted mb-4 flex items-center gap-2">
                      <Settings size={13} /> Board Settings
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3 mb-4">
                      <input value={settingsTitle} onChange={e => setSettingsTitle(e.target.value)} className="bg-my-bg border border-my-border px-3 py-2.5 text-sm text-my-ink focus:outline-none focus:border-my-accent" />
                      <input value={settingsDescription} onChange={e => setSettingsDescription(e.target.value)} className="bg-my-bg border border-my-border px-3 py-2.5 text-sm text-my-ink focus:outline-none focus:border-my-accent" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={saveSettings} className="px-4 py-2.5 bg-my-ink text-white dark:bg-my-accent dark:text-black text-[10px] font-black uppercase tracking-widest">
                        Save Settings
                      </button>
                      <button onClick={archiveActiveBoard} className="px-4 py-2.5 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Archive size={12} /> {confirmArchive ? "Confirm Archive" : "Archive Board"}
                      </button>
                    </div>
                    <p className="text-[10px] text-my-muted mt-3">Archiving hides this board without deleting its saved research.</p>
                    </div>
                    <div className="border border-my-border bg-my-bg p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted mb-2">Visibility</div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['private', 'shared', 'public'] as BoardMode[]).map(item => (
                          <button key={item} onClick={() => updateMode(activeBoard, item)} className={clsx("px-3 py-2 text-[9px] font-black uppercase tracking-widest border", activeBoard.mode === item ? "bg-my-accent text-white dark:text-black border-my-accent" : "border-my-border text-my-muted")}>
                            {item}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-my-muted mt-2">{explainVisibility(activeBoard.mode)}</p>
                    </div>
                  </section>
                )}

                {canManageBoard && (
                <section className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
                <div className="border border-my-border bg-my-callout/90 p-5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted mb-4">Add Research</h3>
                  <div className="grid md:grid-cols-[auto_1fr] gap-2 mb-3">
                    <button disabled={!currentReport} onClick={() => addCurrentResearch(activeBoard)} className="px-4 py-3 bg-my-ink text-white dark:bg-my-accent dark:text-black disabled:opacity-40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 justify-center">
                      <FilePlus2 size={13} /> Current Research
                    </button>
                    <input
                      value={archiveSearch}
                      onChange={e => setArchiveSearch(e.target.value)}
                      placeholder="Search archive before adding..."
                      className="flex-1 bg-my-bg border border-my-border px-3 py-3 text-sm text-my-ink focus:outline-none focus:border-my-accent"
                    />
                  </div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <select onChange={e => e.target.value && addArchivedResearch(activeBoard, e.target.value)} value="" className="flex-1 bg-my-bg border border-my-border px-3 py-3 text-sm text-my-ink">
                      <option value="">Add from archive...</option>
                      {filteredArchive.map(item => <option key={item.id} value={item.id}>{item.report?.query_understood || item.query}</option>)}
                    </select>
                  </div>
                  {archive.length === 0 && (
                    <p className="text-[11px] text-my-muted mt-3">Your archive is empty. Run or fork a research session first, then return here to save it to a board.</p>
                  )}
                </div>
                {activeBoard.mode === 'shared' && isOwner && (
                  <div className="border border-my-border bg-my-callout/90 p-5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted mb-4 flex items-center gap-2"><Users size={13} /> Collaborators</h3>
                    <div className="grid gap-2 mb-3">
                      <input value={collaborator} onChange={e => setCollaborator(e.target.value)} placeholder="Username or email" className="bg-my-bg border border-my-border px-3 py-2.5 text-sm text-my-ink" />
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => addCollaborator(activeBoard)} className="px-4 py-2.5 bg-my-ink text-white dark:bg-my-accent dark:text-black text-[10px] font-black uppercase tracking-widest">Invite</button>
                        <button
                          onClick={() => navigator.clipboard?.writeText(`You have been invited to collaborate on "${activeBoard.title}" in Cognapse. Sign in with the invited username and open Intelligence Boards to accept. Board link: ${window.location.origin}/board/${activeBoard.id}`)}
                          className="px-4 py-2.5 border border-my-border text-my-muted text-[10px] font-black uppercase tracking-widest"
                        >
                          Copy Text
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {displayCollaborators(activeBoard, activeBoard.ownerId).map(item => (
                        <button key={item} onClick={() => removeCollaborator(activeBoard, item)} className="px-3 py-1.5 border border-my-border text-[10px] text-my-muted hover:text-red-500">
                          {item} x
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                </section>
                )}

                {activeBoard.mode === 'shared' && isOwner && (
                  <section className="hidden border border-my-border bg-my-callout p-5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted mb-4 flex items-center gap-2"><Users size={13} /> Collaborators</h3>
                    <p className="text-[11px] text-my-muted mb-3">
                      Role: Editor. Accepted collaborators can add or remove saved research and edit node notes. Owners control visibility, settings, and access.
                    </p>
                    <div className="flex gap-2 mb-3">
                      <input value={collaborator} onChange={e => setCollaborator(e.target.value)} placeholder="Collaborator username or email" className="flex-1 bg-my-bg border border-my-border px-3 py-2 text-sm text-my-ink" />
                      <button onClick={() => addCollaborator(activeBoard)} className="px-4 py-2 bg-my-ink text-white dark:bg-my-accent dark:text-black text-[10px] font-black uppercase tracking-widest">Invite</button>
                      <button
                        onClick={() => navigator.clipboard?.writeText(`You have been invited to collaborate on "${activeBoard.title}" in Cognapse. Sign in with the invited username and open Intelligence Boards to accept. Board link: ${window.location.origin}/board/${activeBoard.id}`)}
                        className="px-4 py-2 border border-my-border text-my-muted text-[10px] font-black uppercase tracking-widest"
                      >
                        Copy Invite Text
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {displayCollaborators(activeBoard, activeBoard.ownerId).map(item => (
                        <button key={item} onClick={() => removeCollaborator(activeBoard, item)} className="px-3 py-1.5 border border-my-border text-[10px] text-my-muted hover:text-red-500">
                          {item} ×
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {activeBoard.activity && activeBoard.activity.length > 0 && (
                  <section className="border border-my-border bg-my-callout p-5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted mb-4 flex items-center gap-2">
                      <History size={13} /> Board Activity
                    </h3>
                    <div className="grid gap-2">
                      {activeBoard.activity.slice(0, 8).map(item => (
                        <div key={item.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 border-b border-my-border last:border-b-0 py-2">
                          <span className="text-xs text-my-ink">{item.detail}</span>
                          <span className="text-[9px] uppercase tracking-widest text-my-muted">
                            {item.actorName} · {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="grid gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted">Saved Research</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-my-muted">{activeBoard.researches.length} items</span>
                  </div>
                  {activeBoard.researches.length === 0 && (
                    <div className="border border-dashed border-my-border bg-my-callout/70 p-8 text-center">
                      <Network size={22} className="mx-auto mb-3 text-my-accent" />
                      <h3 className="font-serif text-2xl text-my-ink">No research saved yet</h3>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-my-muted">Add current research or choose an archive item to turn this board into a persistent knowledge space.</p>
                    </div>
                  )}
                  {activeBoard.researches.map(item => {
                    const nodes = item.report.intelligence_map?.nodes || [];
                    const selectedNodeKey = selectedNodeNotes[item.researchId];
                    const selectedNode = nodes.find((node: any) => `${item.researchId}:${node.id}` === selectedNodeKey);
                    const selectedNote = selectedNodeKey ? noteContent(activeBoard.nodeNotes[selectedNodeKey]) : "";
                    const canShowSelectedNote = !!selectedNodeKey && !!selectedNode && (canManageBoard || !!selectedNote);
                    return (
                      <article key={item.researchId} className="border border-my-border bg-my-callout/90 p-5">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                          <button onClick={() => { setCurrentReport(item.report); setView('research'); }} className="text-left">
                            <h3 className="font-serif text-2xl text-my-ink hover:text-my-accent transition-colors">{item.title}</h3>
                            <p className="text-sm text-my-muted mt-1 line-clamp-2">{item.summary}</p>
                          </button>
                          {canManageBoard && (
                          <button onClick={() => removeResearch(activeBoard, item.researchId)} className="text-my-muted hover:text-red-500 p-2">
                            <Trash2 size={16} />
                          </button>
                          )}
                        </div>
                        <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
                        {item.report.intelligence_map && (
                          <div>
                            <PhysicsMap
                              mapData={item.report.intelligence_map}
                              onSubSearch={() => {}}
                              readOnly
                              onNodeSelect={(node) => setSelectedNodeNotes(prev => ({ ...prev, [item.researchId]: `${item.researchId}:${node.id}` }))}
                            />
                          </div>
                        )}
                        {nodes.length > 0 && (
                          <aside className="border border-my-border bg-my-bg p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted">Node Note</h4>
                              {!canManageBoard && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-my-muted">Read Only</span>
                              )}
                            </div>
                            {!selectedNodeKey ? (
                              <div className="border border-dashed border-my-border p-4 text-[11px] text-my-muted leading-relaxed">
                                Click a graph node to open its note.
                              </div>
                            ) : canShowSelectedNote ? (
                              <div>
                                <div className="text-sm font-bold text-my-accent mb-3">{selectedNode.label}</div>
                                {canManageBoard ? (
                                  <textarea
                                    value={noteDrafts[selectedNodeKey] ?? selectedNote}
                                    onChange={e => setNoteDrafts(prev => ({ ...prev, [selectedNodeKey]: e.target.value }))}
                                    className="w-full min-h-40 bg-my-callout border border-my-border px-3 py-3 text-xs text-my-ink focus:outline-none focus:border-my-accent leading-relaxed"
                                    placeholder="Add a knowledge note..."
                                  />
                                ) : (
                                  <p className="min-h-32 text-xs text-my-ink leading-relaxed whitespace-pre-wrap">{selectedNote}</p>
                                )}
                                {noteMeta(activeBoard.nodeNotes[selectedNodeKey]) && (
                                  <div className="mt-1 text-[9px] text-my-muted uppercase tracking-widest">
                                    Last updated by {noteMeta(activeBoard.nodeNotes[selectedNodeKey])}
                                  </div>
                                )}
                                {canManageBoard && (
                                  <button onClick={() => saveNodeNote(activeBoard, selectedNodeKey)} className="mt-3 bg-my-accent px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white dark:text-black">Save Note</button>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div className="text-sm font-bold text-my-accent mb-2">{selectedNode?.label || "Selected Node"}</div>
                                <p className="text-[11px] text-my-muted leading-relaxed">No note has been added to this node yet.</p>
                              </div>
                            )}
                          </aside>
                        )}
                        </div>
                      </article>
                    );
                  })}
                </section>
              </main>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
