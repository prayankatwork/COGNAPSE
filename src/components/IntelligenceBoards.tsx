import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, Copy, ExternalLink, FilePlus2, FlaskConical, GitBranch, Loader2, Lock, MailCheck, Network, Plus, Share2, Trash2, Users, X } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store';
import { dbService } from '../services/dbService';
import type { BoardInvite, BoardMode, IntelligenceBoard } from '../types';
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

export default function IntelligenceBoards({ routeBoardId }: { routeBoardId?: string }) {
  const { user, setAuthOpen, archive, currentReport, setCurrentReport, setView } = useStore();
  const [boards, setBoards] = useState<IntelligenceBoard[]>([]);
  const [pendingInvites, setPendingInvites] = useState<BoardInvite[]>([]);
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

  const activeBoard = useMemo(
    () => boards.find(board => board.id === activeId) || boards[0] || null,
    [boards, activeId]
  );
  const isOwner = !!activeBoard && activeBoard.ownerId === user?.id;
  const isCollaborator = !!activeBoard && matchesCollaborator(activeBoard, user);
  const canManageBoard = !!activeBoard && (isOwner || (activeBoard.mode === 'shared' && isCollaborator));
  const canViewBoard = !!activeBoard && (activeBoard.mode === 'public' || isOwner || (activeBoard.mode === 'shared' && isCollaborator));

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
      if (mounted) {
        const visible = data.filter(board =>
          board.mode === 'public' ||
          board.ownerId === user?.id ||
          (board.mode === 'shared' && matchesCollaborator(board, user))
        );
        setBoards(visible);
        setPendingInvites(invites);
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

  const replaceBoard = (board: IntelligenceBoard) => {
    setBoards(prev => [board, ...prev.filter(item => item.id !== board.id)]);
    setActiveId(board.id);
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
  };

  const addCurrentResearch = async (board: IntelligenceBoard) => {
    if (!canManageBoard || !currentReport) return;
    replaceBoard(await dbService.addResearchToBoard(board, currentReport));
  };

  const addArchivedResearch = async (board: IntelligenceBoard, reportId: string) => {
    if (!canManageBoard) return;
    const entry = archive.find(item => item.id === reportId);
    if (!entry) return;
    replaceBoard(await dbService.addResearchToBoard(board, entry.report));
  };

  const removeResearch = async (board: IntelligenceBoard, researchId: string) => {
    if (!canManageBoard) return;
    replaceBoard(await dbService.removeResearchFromBoard(board, researchId));
  };

  const updateMode = async (board: IntelligenceBoard, nextMode: BoardMode) => {
    if (!isOwner) return;
    replaceBoard(await dbService.updateBoardMode(board, nextMode));
  };

  const addCollaborator = async (board: IntelligenceBoard) => {
    if (!isOwner) return;
    const clean = collaborator.trim();
    if (!clean) return;
    setCollaborator("");
    setInviteStatus("");
    await dbService.createBoardInvite(board, clean, { id: user!.id, username: user!.username });
    setInviteStatus(`Invitation sent to ${clean}. They will see it in Intelligence Boards and must accept before access is enabled.`);
  };

  const removeCollaborator = async (board: IntelligenceBoard, value: string) => {
    if (!isOwner) return;
    const normalized = value.toLowerCase();
    replaceBoard(await dbService.updateBoardCollaborators(board, board.collaborators.filter(item => item.toLowerCase() !== normalized)));
  };

  const saveNodeNote = async (board: IntelligenceBoard, key: string) => {
    if (!canManageBoard) return;
    replaceBoard(await dbService.updateBoardNodeNote(board, key, noteDrafts[key] || ""));
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
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-5 border border-my-border bg-my-callout/70 px-4 py-3 flex items-start gap-3 text-my-muted">
          <FlaskConical size={14} className="text-my-accent mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            Intelligence Boards, public board links, and collaborative board management are in preview testing. Core saving and sharing workflows are active, while polish and permissions UX may still evolve.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-my-accent mb-2">
              <Network size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Persistent Knowledge Spaces</span>
            </div>
            <h1 className="font-serif text-4xl text-my-ink">Intelligence Boards</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-2 bg-my-callout border border-my-border p-2">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Board title" className="bg-my-bg border border-my-border px-3 py-2 text-sm text-my-ink focus:outline-none focus:border-my-accent" />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="bg-my-bg border border-my-border px-3 py-2 text-sm text-my-ink focus:outline-none focus:border-my-accent" />
            <select value={mode} onChange={e => setMode(e.target.value as BoardMode)} className="bg-my-bg border border-my-border px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-my-ink">
              <option value="private">Private</option>
              <option value="shared">Shared</option>
              <option value="public">Public</option>
            </select>
            <button onClick={createBoard} className="px-4 py-2 bg-my-ink text-white dark:bg-my-accent dark:text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 justify-center">
              <Plus size={13} /> Create
            </button>
          </div>
        </div>

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

        {loading ? (
          <div className="flex items-center gap-3 text-my-muted text-[10px] font-black uppercase tracking-[0.3em]">
            <Loader2 size={16} className="animate-spin text-my-accent" /> Loading Boards
          </div>
        ) : (
          <div className="grid lg:grid-cols-[280px_1fr] gap-6">
            <aside className="border border-my-border bg-my-callout p-3 h-fit">
              {boards.length === 0 ? (
                <p className="text-xs text-my-muted p-4">Create your first board to collect research over time.</p>
              ) : boards.map(board => (
                <button
                  key={board.id}
                  onClick={() => setActiveId(board.id)}
                  className={clsx("w-full text-left p-4 border-b border-my-border last:border-b-0 transition-colors", activeBoard?.id === board.id ? "bg-my-accent/10" : "hover:bg-my-bg")}
                >
                  <div className="text-sm font-bold text-my-ink mb-1">{board.title}</div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-my-muted">{board.mode} · {board.researches.length} researches</div>
                </button>
              ))}
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
              <main className="space-y-6">
                <section className="border border-my-border bg-my-callout p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <h2 className="font-serif text-3xl text-my-ink mb-2">{activeBoard.title}</h2>
                      <p className="text-sm text-my-muted max-w-2xl">{activeBoard.description || "No description yet."}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-4 text-[10px] uppercase tracking-widest font-bold text-my-muted">
                        <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(activeBoard.updatedAt).toLocaleString()}</span>
                        <span className="flex items-center gap-1.5"><GitBranch size={12} /> {activeBoard.researches.length} saved</span>
                        {!isOwner && isCollaborator && <span className="flex items-center gap-1.5"><Users size={12} /> Collaborator</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => copyBoardLink(activeBoard)} className="px-3 py-2 text-[9px] font-black uppercase tracking-widest border border-my-border text-my-muted flex items-center gap-2">
                        {copiedBoardId === activeBoard.id ? <Copy size={12} /> : <Share2 size={12} />}
                        {copiedBoardId === activeBoard.id ? "Copied" : "Board Link"}
                      </button>
                      <a href={`/board/${activeBoard.id}`} className="px-3 py-2 text-[9px] font-black uppercase tracking-widest border border-my-border text-my-muted flex items-center gap-2">
                        <ExternalLink size={12} /> Open
                      </a>
                      {(['private', 'shared', 'public'] as BoardMode[]).map(item => (
                        <button key={item} disabled={!isOwner} onClick={() => updateMode(activeBoard, item)} className={clsx("px-3 py-2 text-[9px] font-black uppercase tracking-widest border disabled:opacity-40", activeBoard.mode === item ? "bg-my-accent text-white dark:text-black border-my-accent" : "border-my-border text-my-muted")}>
                          {item}
                        </button>
                      ))}
                      {inviteStatus && (
                        <span className="w-full text-[10px] text-my-muted leading-relaxed">
                          {inviteStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </section>

                {canManageBoard && (
                <section className="border border-my-border bg-my-callout p-5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted mb-4">Add Research</h3>
                  <div className="flex flex-col md:flex-row gap-2">
                    <button disabled={!currentReport} onClick={() => addCurrentResearch(activeBoard)} className="px-4 py-3 bg-my-ink text-white dark:bg-my-accent dark:text-black disabled:opacity-40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 justify-center">
                      <FilePlus2 size={13} /> Current Research
                    </button>
                    <select onChange={e => e.target.value && addArchivedResearch(activeBoard, e.target.value)} value="" className="flex-1 bg-my-bg border border-my-border px-3 py-3 text-sm text-my-ink">
                      <option value="">Add from archive...</option>
                      {archive.map(item => <option key={item.id} value={item.id}>{item.report?.query_understood || item.query}</option>)}
                    </select>
                  </div>
                </section>
                )}

                {activeBoard.mode === 'shared' && isOwner && (
                  <section className="border border-my-border bg-my-callout p-5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted mb-4 flex items-center gap-2"><Users size={13} /> Collaborators</h3>
                    <div className="flex gap-2 mb-3">
                      <input value={collaborator} onChange={e => setCollaborator(e.target.value)} placeholder="Collaborator username or email" className="flex-1 bg-my-bg border border-my-border px-3 py-2 text-sm text-my-ink" />
                      <button onClick={() => addCollaborator(activeBoard)} className="px-4 py-2 bg-my-ink text-white dark:bg-my-accent dark:text-black text-[10px] font-black uppercase tracking-widest">Invite</button>
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

                <section className="grid gap-4">
                  {activeBoard.researches.map(item => {
                    const nodes = item.report.intelligence_map?.nodes || [];
                    return (
                      <article key={item.researchId} className="border border-my-border bg-my-callout p-5">
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
                        {item.report.intelligence_map && (
                          <div className="mb-4">
                            <PhysicsMap mapData={item.report.intelligence_map} onSubSearch={() => {}} readOnly />
                          </div>
                        )}
                        {activeBoard.mode === 'shared' && nodes.length > 0 && canManageBoard && (
                          <div className="border-t border-my-border pt-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-my-muted mb-3">Node Notes</h4>
                            <div className="grid md:grid-cols-2 gap-3">
                              {nodes.slice(0, 4).map((node: any) => {
                                const key = `${item.researchId}:${node.id}`;
                                return (
                                  <div key={key} className="bg-my-bg border border-my-border p-3">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-my-accent mb-2">{node.label}</div>
                                    <textarea
                                      value={noteDrafts[key] ?? activeBoard.nodeNotes[key] ?? ""}
                                      onChange={e => setNoteDrafts(prev => ({ ...prev, [key]: e.target.value }))}
                                      className="w-full min-h-20 bg-transparent text-xs text-my-ink focus:outline-none"
                                      placeholder="Add a knowledge note..."
                                    />
                                    <button onClick={() => saveNodeNote(activeBoard, key)} className="mt-2 text-[9px] font-black uppercase tracking-widest text-my-accent">Save Note</button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
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
