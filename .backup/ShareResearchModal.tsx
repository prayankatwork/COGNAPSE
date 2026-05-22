import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { X, Link2, Check, Copy, Share2, Globe, EyeOff, Lock, Trash2, Loader2 } from 'lucide-react';
import { dbService } from '../services/dbService';
import confetti from 'canvas-confetti';

interface ShareResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: any;
}

export default function ShareResearchModal({ isOpen, onClose, report }: ShareResearchModalProps) {
  const { user } = useStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'unlisted' | 'public'>('unlisted');
  const [shareId, setShareId] = useState<string>('');
  const [isShared, setIsShared] = useState(false);
  const [copied, setCopied] = useState(false);

  const reportId = report?.id || report?.query_understood;

  useEffect(() => {
    if (isOpen && reportId && user?.id) {
      checkExistingShare();
    }
  }, [isOpen, reportId, user?.id]);

  const checkExistingShare = async () => {
    if (!user?.id || !reportId) return;
    setFetching(true);
    try {
      const existing = await dbService.getSharedReportByResearchId(reportId, user.id);
      if (existing) {
        setShareId(existing.id);
        setVisibility(existing.visibility);
        setIsShared(true);
      } else {
        setShareId(crypto.randomUUID());
        setVisibility('unlisted');
        setIsShared(false);
      }
    } catch (err) {
      console.error('Error checking shared report state:', err);
    } finally {
      setFetching(false);
    }
  };

  if (!isOpen) return null;

  const handleShare = async () => {
    if (!user?.id || !reportId || !shareId) return;
    setLoading(true);
    try {
      await dbService.createOrUpdateSharedReport(
        shareId,
        reportId,
        report.query_understood,
        JSON.stringify(report),
        visibility,
        user.id,
        user.username
      );
      setIsShared(true);
      
      confetti({
        particleCount: 80,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#F27D26', '#2A4365', '#E2E8F0']
      });
    } catch (err) {
      console.error('Failed to create/update share record:', err);
      alert('Error sharing research. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShare = async () => {
    if (!shareId) return;
    if (!confirm('Are you sure you want to disable sharing for this research? The current link will stop working.')) return;
    setLoading(true);
    try {
      await dbService.deleteSharedReport(shareId);
      setIsShared(false);
      setShareId(crypto.randomUUID());
      setVisibility('unlisted');
    } catch (err) {
      console.error('Failed to delete share record:', err);
      alert('Error removing share link.');
    } finally {
      setLoading(false);
    }
  };

  const shareLink = `${window.location.origin}?share=${shareId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 md:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ scale: 0.95, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 30, opacity: 0 }}
          className="relative w-full max-w-md bg-white dark:bg-[#0A0F1A] border border-my-border shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="h-1 w-full bg-gradient-to-r from-my-accent via-amber-500 to-my-accent" />

          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-my-muted hover:text-my-ink transition-colors z-50"
          >
            <X size={18} />
          </button>

          <div className="p-6 md:p-8 overflow-y-auto no-scrollbar">
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 bg-my-accent/10 rounded-full flex items-center justify-center text-my-accent mb-4">
                <Share2 size={24} />
              </div>
              <h2 className="text-xl font-serif font-bold text-my-ink italic">Share Intel Dossier</h2>
              <p className="text-xs text-my-muted uppercase tracking-widest mt-1">Configure sharing protocols for this research session</p>
            </div>

            {fetching ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Loader2 size={24} className="animate-spin text-my-accent" />
                <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse text-my-muted">Retrieving Sharing State...</span>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Visibility Selector */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-my-muted uppercase tracking-wider block">Visibility Settings</span>
                  <div className="flex flex-col gap-2">
                    
                    {/* Private Choice */}
                    <label 
                      className={`flex items-start gap-3 p-3 border cursor-pointer transition-all ${
                        visibility === 'private' 
                          ? 'border-my-accent bg-my-accent/5' 
                          : 'border-my-border hover:border-my-accent/30'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="visibility" 
                        value="private"
                        checked={visibility === 'private'}
                        onChange={() => setVisibility('private')}
                        className="mt-1 accent-my-accent"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Lock size={12} className="text-red-500" />
                          <span className="text-[11px] font-bold text-my-ink uppercase tracking-wider">Private</span>
                        </div>
                        <p className="text-[10px] text-my-muted mt-0.5 leading-normal">
                          Only you can view this report. Anyone else visiting the link will be blocked.
                        </p>
                      </div>
                    </label>

                    {/* Unlisted Choice */}
                    <label 
                      className={`flex items-start gap-3 p-3 border cursor-pointer transition-all ${
                        visibility === 'unlisted' 
                          ? 'border-my-accent bg-my-accent/5' 
                          : 'border-my-border hover:border-my-accent/30'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="visibility" 
                        value="unlisted"
                        checked={visibility === 'unlisted'}
                        onChange={() => setVisibility('unlisted')}
                        className="mt-1 accent-my-accent"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <EyeOff size={12} className="text-amber-500" />
                          <span className="text-[11px] font-bold text-my-ink uppercase tracking-wider">Unlisted (Recommended)</span>
                        </div>
                        <p className="text-[10px] text-my-muted mt-0.5 leading-normal">
                          Anyone with the secret link can view. It won't appear in feed search results.
                        </p>
                      </div>
                    </label>

                    {/* Public Choice */}
                    <label 
                      className={`flex items-start gap-3 p-3 border cursor-pointer transition-all ${
                        visibility === 'public' 
                          ? 'border-my-accent bg-my-accent/5' 
                          : 'border-my-border hover:border-my-accent/30'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="visibility" 
                        value="public"
                        checked={visibility === 'public'}
                        onChange={() => setVisibility('public')}
                        className="mt-1 accent-my-accent"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Globe size={12} className="text-green-500" />
                          <span className="text-[11px] font-bold text-my-ink uppercase tracking-wider">Public</span>
                        </div>
                        <p className="text-[10px] text-my-muted mt-0.5 leading-normal">
                          Anyone with the link can view. The dossier can be listed in community directories.
                        </p>
                      </div>
                    </label>

                  </div>
                </div>

                {/* Shared Link Output / Status */}
                {isShared && (
                  <div className="space-y-2 border border-my-border bg-slate-50 dark:bg-black/30 p-4 rounded-md">
                    <span className="text-[10px] font-bold text-my-muted uppercase tracking-wider block">Secret Share Link</span>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={shareLink}
                        className="flex-1 bg-my-bg border border-my-border text-my-ink text-[11px] px-3 py-2 outline-none font-mono select-all rounded-[2px]"
                      />
                      <button 
                        onClick={copyToClipboard}
                        className="px-3 bg-my-accent text-white dark:text-black hover:scale-105 transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 rounded-[2px]"
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  <button 
                    onClick={handleShare}
                    disabled={loading}
                    className="w-full py-3 bg-my-accent hover:scale-[101%] transition-all text-white dark:text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> Persisting Shared Intel...
                      </>
                    ) : isShared ? (
                      <>
                        <Link2 size={12} /> Update Share Protocol
                      </>
                    ) : (
                      <>
                        <Share2 size={12} /> Generate Public Share Link
                      </>
                    )}
                  </button>

                  {isShared && (
                    <button 
                      onClick={handleDeleteShare}
                      disabled={loading}
                      className="w-full py-2 bg-transparent text-red-500 hover:text-red-600 transition-colors text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={12} /> Revoke Shared Access
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
