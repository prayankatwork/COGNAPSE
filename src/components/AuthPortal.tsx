import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { dbService } from '../services/dbService';
import { syncAuthSession } from '../services/authSession';
import { Shield, Fingerprint, Lock, User, Terminal, ArrowRight, Loader2, X } from 'lucide-react';
import clsx from 'clsx';
import BrandLogo from './BrandLogo';

export default function AuthPortal({ onClose }: { onClose: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const setUser = useStore(state => state.setUser);
  const setArchive = useStore(state => state.setArchive);
  const setStats = useStore(state => state.setStats);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const trimmedName = username.trim();
      const userRes = isRegister 
        ? await dbService.register(trimmedName, password)
        : await dbService.login(trimmedName, password);
      
      const loggedUser = userRes.user;

      // Restore Intelligence Data from Vault
      const [reports, stats, notes, premiumStatus] = await Promise.all([
        dbService.getAllReports(loggedUser.id),
        dbService.loadStats(loggedUser.id),
        dbService.getNotes(loggedUser.id),
        dbService.loadPremium(loggedUser.id)
      ]);

      const fullUser = {
        ...loggedUser,
        ...(premiumStatus || {})
      };
      setUser(fullUser);
      await syncAuthSession(fullUser);

      if (notes) {
        useStore.getState().setNotes(notes as any[]);
      }

      if (stats) {
        setStats({
          xp: stats.xp,
          searchCount: stats.search_count,
          rank: stats.rank
        });
      }

      if (reports && reports.length > 0) {
        const archiveEntries = reports.map((r: any) => ({
          id: r.id,
          query: r.query,
          timestamp: r.timestamp,
          topic_cluster: r.data.archive_entry?.topic_cluster || "General",
          tags: r.data.archive_entry?.tags || [],
          summary_snippet: r.data.archive_entry?.summary_snippet || "",
          report: r.data
        }));
        setArchive(archiveEntries);
      }

      onClose();
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError("Invalid credentials detected. Please check your password.");
      } else if (err.code === 'auth/user-not-found') {
        setError("User account not found. Please create a new profile.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Username already registered. Please login instead.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password too weak. Minimum 6 characters required.");
      } else {
        setError(err.message || "Database connection failure. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-white/80 dark:bg-my-bg/80 backdrop-blur-2xl flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-[#0A0F1A] border border-my-border shadow-2xl relative overflow-hidden"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-my-muted hover:text-my-accent transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.4em] text-[10px]">
              <div className="w-8 h-px bg-my-accent" /> Account Protocol
            </div>
            <BrandLogo size={32} />
          </div>

          <h2 className="text-5xl font-serif font-bold italic mb-2 text-white">
            {isRegister ? 'Registration.' : 'Login.'}
          </h2>
          <p className="text-[11px] text-white/40 uppercase tracking-widest mb-10 leading-relaxed">
            {isRegister ? 'Create your user account to secure your research.' : 'Authorize access to your archived research reports.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
             <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                   <User size={12} /> Username
                </label>
                <input 
                  required
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 p-4 text-sm text-white focus:border-my-accent outline-none transition-colors placeholder:text-white/20"
                  placeholder="USERNAME"
                />
             </div>

             <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                   <Lock size={12} /> Password
                </label>
                <input 
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 p-4 text-sm text-white focus:border-my-accent outline-none transition-colors placeholder:text-white/20"
                  placeholder="••••••••"
                />
             </div>

             {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest">
                   {error}
                </div>
             )}

             <button 
               disabled={loading}
               type="submit"
               className="w-full bg-my-ink text-my-bg dark:bg-my-accent dark:text-black p-5 text-[11px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-my-accent hover:text-white transition-all group"
             >
                {loading ? <Loader2 className="animate-spin" size={16} /> : (
                   <>
                      {isRegister ? 'Create Account' : 'Sign In'}
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                   </>
                )}
             </button>
          </form>

          <div className="mt-10 pt-10 border-t border-my-border text-center">
             <p className="text-[10px] text-my-muted uppercase tracking-widest mb-4">
                {isRegister ? 'Already have an active account?' : 'New user requiring access?'}
             </p>
             <button 
               onClick={() => setIsRegister(!isRegister)}
               className="text-[10px] font-black text-my-accent uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
             >
                {isRegister ? 'Switch to Login' : 'Create User Account'}
             </button>
          </div>
        </div>

        {/* Decorative corner */}
        <div className="absolute bottom-0 right-0 p-2 opacity-5 pointer-events-none">
           <Fingerprint size={120} />
        </div>
      </motion.div>
    </motion.div>
  );
}
