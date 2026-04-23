import React, { useState, useRef, useEffect } from 'react';
import { Music, X, PlayCircle, Minus, Zap, Coffee, Move } from 'lucide-react';
import { useStore } from '../store';
import clsx from 'clsx';

export default function SpotifyWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [playlistUri, setPlaylistUri] = useState('');
  const [activeEmbed, setActiveEmbed] = useState('');
  const { vibe, setVibe } = useStore();

  const [pos, setPos] = useState({ x: 24, y: window.innerHeight - 400 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ offsetX: number, offsetY: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      setPos({
        x: e.clientX - dragRef.current.offsetX,
        y: e.clientY - dragRef.current.offsetY
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

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

  if (!isOpen && !activeEmbed) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 w-12 h-12 bg-my-ink text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform z-50 group"
      >
        <Music size={20} />
        <div className="absolute left-14 bg-my-ink text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
          Open Focus Player
        </div>
      </button>
    );
  }

  return (
    <div 
      style={{ left: pos.x, top: pos.y }}
      className={clsx(
        "fixed bg-my-ink shadow-2xl z-50 transition-shadow overflow-hidden flex flex-col border border-white/10",
        isMinimized ? "w-12 h-12 rounded-full cursor-pointer items-center justify-center" : "w-80 h-[380px] rounded-[12px]",
        isDragging ? "shadow-blue-500/20 shadow-[0_0_40px_rgba(0,0,0,0.5)] scale-[1.02] cursor-grabbing" : "cursor-default"
      )}
      onMouseDown={handleMouseDown}
    >
       {/* Minimized Hitbox overlay */}
       {isMinimized && (
          <div 
            className="absolute inset-0 z-20 flex items-center justify-center bg-my-ink hover:bg-white/10 transition-colors group"
            onClick={() => setIsMinimized(false)}
          >
            <Music size={20} className="animate-pulse text-[#1DB954]" />
            <div className="absolute left-14 bg-my-ink text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
              Show Player
            </div>
          </div>
       )}

       {/* Maximize Container (Always Mounted to keep iframe alive) */}
       <div className={clsx("w-full h-full flex flex-col absolute inset-0 z-10 transition-opacity duration-300", isMinimized ? "opacity-0 pointer-events-none" : "opacity-100")}>
           <div className="flex items-center justify-between p-3 bg-black/20 border-b border-white/5 cursor-grab group">
              <div className="flex items-center gap-2 text-white">
                <Move size={12} className="text-white/30 group-hover:text-white transition-colors" />
                <span className="text-[11px] font-bold tracking-wider uppercase">Focus Playlist</span>
                <div className="absolute top-10 left-0 bg-my-ink text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
                   Drag header to move
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setVibe(vibe === 'focus' ? 'energy' : 'focus')}
                  className={clsx(
                    "flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors mr-2 border border-white/5",
                    vibe === 'focus' ? "bg-blue-500/20 text-blue-300" : "bg-orange-500/20 text-orange-300"
                  )}
                  title="Toggle Visual Vibe"
                >
                  {vibe === 'focus' ? <Coffee size={10} /> : <Zap size={10} />}
                  {vibe}
                </button>
                <button onClick={() => setIsMinimized(true)} className="text-white/50 hover:text-white transition-colors">
                  <Minus size={14} />
                </button>
                <button onClick={() => { setIsOpen(false); setActiveEmbed(''); }} className="text-white/50 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>
           </div>
           
           <div className="flex-1 flex flex-col relative bg-my-ink">
             {!activeEmbed ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <PlayCircle size={32} className="text-[#1DB954] mb-3 opacity-80" />
                  <p className="text-white/80 text-xs mb-4">Paste a Spotify Playlist, Album, or Track link to focus.</p>
                  <form onSubmit={handleEmbed} className="w-full">
                    <input 
                      type="text" 
                      value={playlistUri}
                      onChange={e => setPlaylistUri(e.target.value)}
                      placeholder="https://open.spotify.com/playlist/..."
                      className="w-full bg-white/10 border border-white/20 rounded p-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#1DB954]"
                    />
                    <button type="submit" className="w-full mt-2 bg-[#1DB954] text-black font-bold text-[11px] py-2 rounded uppercase tracking-wider hover:bg-[#1ed760] transition-colors">
                      Load Player
                    </button>
                  </form>
                </div>
             ) : (
                <div className="w-full h-full flex-1">
                   <iframe 
                     src={activeEmbed} 
                     width="100%" 
                     height="100%" 
                     frameBorder="0" 
                     allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                     loading="lazy"
                   ></iframe>
                </div>
             )}
           </div>
       </div>
    </div>
  );
}
