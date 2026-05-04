import React, { useState } from 'react';
import { Music, X, PlayCircle, Minus, Zap, Coffee, Maximize2, Move } from 'lucide-react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function SpotifyWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [playlistUri, setPlaylistUri] = useState('');
  const [activeEmbed, setActiveEmbed] = useState('');
  const { vibe, setVibe } = useStore();

  const handleEmbed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistUri) return;
    
    let embedUrl = '';
    const playlistMatch = playlistUri.match(/playlist[\/:]([a-zA-Z0-9]+)/);
    const albumMatch = playlistUri.match(/album[\/:]([a-zA-Z0-9]+)/);
    const trackMatch = playlistUri.match(/track[\/:]([a-zA-Z0-9]+)/);
    
    if (playlistMatch) {
       embedUrl = `https://open.spotify.com/embed/playlist/${playlistMatch[1]}?utm_source=generator&theme=0`;
    } else if (albumMatch) {
       embedUrl = `https://open.spotify.com/embed/album/${albumMatch[1]}?utm_source=generator&theme=0`;
    } else if (trackMatch) {
       embedUrl = `https://open.spotify.com/embed/track/${trackMatch[1]}?utm_source=generator&theme=0`;
    }

    if (embedUrl) {
      setActiveEmbed(embedUrl);
      setPlaylistUri('');
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && !activeEmbed && (
          <motion.button 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 left-6 w-14 h-14 bg-[#1DB954] text-black rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(29,185,84,0.4)] z-50 group"
          >
            <Music size={24} className="fill-black" />
            <div className="absolute left-16 bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-white/10 tracking-wide uppercase">
              Neural Audio
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isOpen || activeEmbed) && (
          <motion.div 
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              width: isMinimized ? 56 : 340,
              height: isMinimized ? 56 : 420,
              borderRadius: isMinimized ? 28 : 20
            }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{ 
              position: 'fixed',
              left: 24,
              top: window.innerHeight - 450,
              touchAction: 'none'
            }}
            className={clsx(
              "z-[200] overflow-hidden flex flex-col shadow-2xl",
              isMinimized ? "bg-[#1DB954] text-black shadow-[0_8px_30px_rgba(29,185,84,0.4)]" : "bg-black/80 backdrop-blur-2xl border border-white/10"
            )}
          >
             {/* Minimized Overlay */}
             <AnimatePresence>
               {isMinimized && (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer hover:bg-black/10 transition-colors group"
                   onClick={() => setIsMinimized(false)}
                 >
                   <Music size={24} className="animate-pulse fill-black text-black" />
                   <div className="absolute left-16 bg-black text-white border border-white/10 text-[10px] px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none tracking-wide uppercase font-bold shadow-2xl">
                     Expand Player
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>

             {/* Maximize Container */}
             <motion.div 
               animate={{ opacity: isMinimized ? 0 : 1 }}
               style={{ pointerEvents: isMinimized ? 'none' : 'auto' }}
               className="w-full h-full flex flex-col absolute inset-0 z-10"
             >
                 {/* Drag Handle / Header */}
                 <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/5 cursor-grab active:cursor-grabbing group">
                    <div className="flex items-center gap-2 text-white/70">
                      <Move size={14} className="group-hover:text-white transition-colors" />
                      <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/90">Focus Stream</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setVibe(vibe === 'focus' ? 'energy' : 'focus')}
                        className={clsx(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border",
                          vibe === 'focus' ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-orange-500/20 text-orange-300 border-orange-500/30"
                        )}
                        title="Toggle Visual Vibe"
                      >
                        {vibe === 'focus' ? <Coffee size={10} /> : <Zap size={10} />}
                        {vibe}
                      </button>
                      <button onClick={() => setIsMinimized(true)} className="p-1 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full">
                        <Minus size={14} />
                      </button>
                      <button onClick={() => { setIsOpen(false); setActiveEmbed(''); setIsMinimized(false); }} className="p-1 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full">
                        <X size={14} />
                      </button>
                    </div>
                 </div>
                 
                 <div className="flex-1 flex flex-col relative bg-gradient-to-b from-white/[0.02] to-transparent">
                   {!activeEmbed ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 rounded-full bg-[#1DB954]/20 flex items-center justify-center mb-6 relative">
                          <div className="absolute inset-0 rounded-full bg-[#1DB954]/20 animate-ping" />
                          <Music size={28} className="text-[#1DB954] fill-[#1DB954]" />
                        </div>
                        <h3 className="text-white font-bold text-sm mb-2">Connect Spotify</h3>
                        <p className="text-white/50 text-[11px] mb-8 leading-relaxed">Paste any Spotify Playlist, Album, or Track link to inject neural audio into your session.</p>
                        
                        <form onSubmit={handleEmbed} className="w-full relative">
                          <input 
                            type="text" 
                            value={playlistUri}
                            onChange={e => setPlaylistUri(e.target.value)}
                            placeholder="https://open.spotify.com/..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#1DB954]/50 focus:bg-white/10 transition-all"
                          />
                          <button type="submit" disabled={!playlistUri} className="absolute right-2 top-2 bottom-2 aspect-square bg-[#1DB954] disabled:opacity-50 text-black rounded-lg flex items-center justify-center hover:bg-[#1ed760] transition-colors active:scale-95">
                            <PlayCircle size={18} className="fill-black text-[#1DB954]" />
                          </button>
                        </form>
                      </div>
                   ) : (
                      <div className="w-full h-full flex-1 p-2">
                         <iframe 
                           src={activeEmbed} 
                           width="100%" 
                           height="100%" 
                           frameBorder="0" 
                           allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                           loading="lazy"
                           className="rounded-xl"
                         ></iframe>
                      </div>
                   )}
                 </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
