import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { 
  Gamepad2, Zap, Brain, Box, 
  RotateCcw, Trophy, Activity, 
  Target, Layers, Play, Pause, X,
  Shield, Database, Globe2, Compass, Cpu, Network
} from 'lucide-react';
import clsx from 'clsx';
import LoadingGame from './LoadingGame';
import SnakeGame from './SnakeGame';

type GameType = 'snake' | 'memory' | 'reflex' | 'brick' | 'path';

export default function GamesPage() {
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const gameScores = useStore((state) => state.gameScores);

  const games = [
    { id: 'snake', title: 'Neural Snake', icon: <Activity />, desc: 'Intercept data anomalies in the neural grid.', color: 'from-orange-500 to-red-500' },
    { id: 'memory', title: 'Logic Matrix', icon: <Layers />, desc: 'Match forensic icon pairs to decrypt memory.', color: 'from-blue-500 to-indigo-500' },
    { id: 'reflex', title: 'Signal Pulse', icon: <Target />, desc: 'Capture the pulse before it fades into noise.', color: 'from-emerald-500 to-teal-500' },
    { id: 'brick', title: 'Brick Decryptor', icon: <Box />, desc: 'Shatter encryption layers with the kinetic node.', color: 'from-purple-500 to-pink-500' },
    { id: 'path', title: 'Neural Link', icon: <Network />, desc: 'Establish critical connections between distant data nodes.', color: 'from-cyan-500 to-blue-600' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-20 relative z-10">
      <div className="mb-16">
         <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.4em] text-[10px] mb-4">
            <div className="w-10 h-px bg-my-accent" /> Intelligence Training
         </div>
         <h1 className="text-6xl font-serif font-bold italic mb-4">The Playground.</h1>
         <p className="text-my-muted max-w-xl font-light italic">Refine your cognitive reflexes while the COGNAPSE engine synthesizes the world for you.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
         {games.map((game) => (
           <motion.button
             key={game.id}
             whileHover={{ y: -10 }}
             onClick={() => setActiveGame(game.id as GameType)}
             className="text-left group relative p-10 border border-white/10 bg-[#0A0F1A] overflow-hidden shadow-2xl transition-all flex flex-col min-h-[340px]"
           >
              <div className={clsx("absolute top-0 left-0 w-full h-1 bg-gradient-to-r", game.color)} />
              <div className="mb-6 p-3 rounded-none bg-black/5 text-my-ink dark:text-white group-hover:bg-my-accent group-hover:text-white transition-all inline-block w-fit">
                 {React.cloneElement(game.icon as React.ReactElement, { size: 24 })}
              </div>
              <h3 className="text-lg font-bold uppercase tracking-widest mb-3 text-white">{game.title}</h3>
              <p className="text-[10px] text-white/50 leading-relaxed uppercase tracking-widest mb-6">{game.desc}</p>
              
              <div className="flex items-center justify-between mt-auto">
                 <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em]">Best Record</span>
                    <span className="text-sm font-black text-white">{gameScores[game.id] || 0}</span>
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-black text-my-accent opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-2 uppercase tracking-widest">
                    Initialize <Zap size={12} />
                 </div>
              </div>
           </motion.button>
         ))}
      </div>

      {/* Fullscreen Game Overlay */}
      <AnimatePresence>
         {activeGame && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-white/95 dark:bg-my-bg/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
            >
               <button 
                 onClick={() => setActiveGame(null)}
                 className="absolute top-10 right-10 p-4 text-my-muted hover:text-my-accent transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-[10px]"
               >
                  Close Playground <X size={20} />
               </button>

               <div className="w-full max-w-4xl flex flex-col items-center">
                  {activeGame === 'snake' && <SnakeGame />}
                  {activeGame === 'memory' && <MemoryGame />}
                  {activeGame === 'reflex' && <ReflexGame />}
                  {activeGame === 'brick' && <BrickGame />}
                  {activeGame === 'path' && <PathGame />}
               </div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}

// --- NEW GAMES ---

function MemoryGame() {
  const updateGameScore = useStore(state => state.updateGameScore);
  const iconMap: Record<string, any> = {
    brain: <Brain />, 
    zap: <Zap />, 
    shield: <Shield />, 
    database: <Database />, 
    globe: <Globe2 />, 
    activity: <Activity />, 
    compass: <Compass />, 
    cpu: <Cpu />
  };
  const iconKeys = Object.keys(iconMap);
  const [cards, setCards] = useState(() => [...iconKeys, ...iconKeys].sort(() => Math.random() - 0.5));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [solved, setSolved] = useState<number[]>([]);
  const [score, setScore] = useState(0);

  const handleFlip = (idx: number) => {
    if (flipped.length === 2 || solved.includes(idx) || flipped.includes(idx)) return;
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
        setSolved([...solved, ...newFlipped]);
        const newScore = score + 50;
        setScore(newScore);
        updateGameScore('memory', newScore);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-10">
       <div className="text-center">
          <h2 className="text-4xl font-serif italic mb-2">Logic Matrix</h2>
          <p className="text-[10px] uppercase tracking-widest text-my-accent font-bold">Current IQ Score: {score}</p>
       </div>
       <div className="grid grid-cols-4 gap-4">
          {cards.map((key, idx) => (
             <button
               key={idx}
               onClick={() => handleFlip(idx)}
               className={clsx(
                 "w-20 h-20 border border-my-border flex items-center justify-center transition-all duration-500 transform",
                 flipped.includes(idx) || solved.includes(idx) ? "bg-my-accent text-white rotate-y-180 scale-105 shadow-xl" : "bg-white hover:bg-black/5"
               )}
             >
                {(flipped.includes(idx) || solved.includes(idx)) ? iconMap[key] : <div className="w-2 h-2 bg-my-muted/20 rounded-full" />}
             </button>
          ))}
       </div>
       <button onClick={() => { setCards([...iconKeys, ...iconKeys].sort(() => Math.random() - 0.5)); setSolved([]); setScore(0); }} className="px-6 py-2 border border-my-border text-[10px] font-bold uppercase tracking-widest hover:text-my-accent transition-colors">Restart Decryption</button>
    </div>
  );
}

function ReflexGame() {
  const updateGameScore = useStore(state => state.updateGameScore);
  const [targetPos, setTargetPos] = useState({ top: '50%', left: '50%' });
  const [score, setScore] = useState(0);
  const [active, setActive] = useState(false);

  const moveTarget = () => {
    setTargetPos({
      top: `${Math.random() * 80 + 10}%`,
      left: `${Math.random() * 80 + 10}%`,
    });
  };

  const handleClick = () => {
    const newScore = score + 1;
    setScore(newScore);
    updateGameScore('reflex', newScore);
    moveTarget();
  };

  useEffect(() => {
    if (active) {
       const timer = setInterval(() => {
          moveTarget();
       }, 800);
       return () => clearInterval(timer);
    }
  }, [active]);

  return (
    <div className="w-full h-[400px] border border-my-border relative bg-black/5 overflow-hidden flex flex-col items-center justify-center">
       {!active ? (
          <button onClick={() => setActive(true)} className="px-10 py-5 bg-my-accent text-white font-bold uppercase tracking-[0.4em] shadow-xl hover:scale-105 transition-transform">Initialize Signal Trace</button>
       ) : (
          <>
            <div className="absolute top-4 left-6 text-[10px] font-bold uppercase tracking-widest text-my-accent">Signal Pulses Captured: {score}</div>
            <motion.button
              animate={{ 
                scale: [1, 1.2, 1],
                boxShadow: ["0 0 20px rgba(242,125,38,0.3)", "0 0 60px rgba(242,125,38,0.8)", "0 0 20px rgba(242,125,38,0.3)"]
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
              onClick={handleClick}
              className="absolute w-16 h-16 bg-my-accent rounded-full flex items-center justify-center text-white cursor-crosshair active:scale-90 transition-transform"
              style={{ top: targetPos.top, left: targetPos.left }}
            >
               <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping" />
               <Target size={24} />
            </motion.button>
          </>
       )}
    </div>
  );
}

function BrickGame() {
  const updateGameScore = useStore(state => state.updateGameScore);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let ballX = canvas.width / 2;
    let ballY = canvas.height - 30;
    let dx = 2;
    let dy = -2;
    const ballRadius = 6;
    const paddleHeight = 8;
    const paddleWidth = 75;
    let paddleX = (canvas.width - paddleWidth) / 2;
    let rightPressed = false;
    let leftPressed = false;

    const brickRowCount = 3;
    const brickColumnCount = 5;
    const brickWidth = 50;
    const brickHeight = 15;
    const brickPadding = 10;
    const brickOffsetTop = 30;
    const brickOffsetLeft = 30;

    let bricks: any[] = [];
    for (let c = 0; c < brickColumnCount; c++) {
      bricks[c] = [];
      for (let r = 0; r < brickRowCount; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 };
      }
    }

    const keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
      else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
    };

    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
      else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
    };

    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // draw bricks
      for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
          if (bricks[c][r].status === 1) {
            const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
            const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
            bricks[c][r].x = brickX;
            bricks[c][r].y = brickY;
            ctx.beginPath();
            ctx.rect(brickX, brickY, brickWidth, brickHeight);
            ctx.fillStyle = "#2A4365";
            ctx.fill();
            ctx.closePath();
          }
        }
      }

      // draw ball
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#F27D26";
      ctx.fill();
      ctx.closePath();

      // draw paddle
      ctx.beginPath();
      ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
      ctx.fillStyle = "#2A4365";
      ctx.fill();
      ctx.closePath();

      // collision detection
      for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
          const b = bricks[c][r];
          if (b.status === 1) {
            if (ballX > b.x && ballX < b.x + brickWidth && ballY > b.y && ballY < b.y + brickHeight) {
              dy = -dy;
              b.status = 0;
              const newScore = score + 10;
              setScore(newScore);
              updateGameScore('brick', newScore);
            }
          }
        }
      }

      if (ballX + dx > canvas.width - ballRadius || ballX + dx < ballRadius) dx = -dx;
      if (ballY + dy < ballRadius) dy = -dy;
      else if (ballY + dy > canvas.height - ballRadius) {
        if (ballX > paddleX && ballX < paddleX + paddleWidth) dy = -dy;
        else {
           ballX = canvas.width/2;
           ballY = canvas.height - 30;
           dx = 2;
           dy = -2;
           setScore(0);
           for (let c = 0; c < brickColumnCount; c++) {
             for (let r = 0; r < brickRowCount; r++) bricks[c][r].status = 1;
           }
        }
      }

      if (rightPressed && paddleX < canvas.width - paddleWidth) paddleX += 7;
      else if (leftPressed && paddleX > 0) paddleX -= 7;

      ballX += dx;
      ballY += dy;
      requestAnimationFrame(draw);
    };

    const animId = requestAnimationFrame(draw);
    return () => {
      document.removeEventListener("keydown", keyDownHandler);
      document.removeEventListener("keyup", keyUpHandler);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-8">
       <div className="flex justify-between w-full max-w-[400px] text-[10px] font-bold uppercase tracking-widest text-my-muted">
          <span>Brick Decryptor</span>
          <span className="text-my-accent">Layers Decrypted: {score}</span>
       </div>
       <canvas ref={canvasRef} width={400} height={300} className="border border-my-border bg-white shadow-xl" />
    </div>
  );
}

function PathGame() {
  const [score, setScore] = useState(0);
  const [path, setPath] = useState<{x: number, y: number}[]>([]);
  const updateGameScore = useStore(state => state.updateGameScore);
  
  const gridSize = 6;
  const [target, setTarget] = useState({x: 5, y: 5});

  const handleCellClick = (x: number, y: number) => {
    if (path.length === 0) {
      setPath([{x, y}]);
      return;
    }
    const last = path[path.length - 1];
    if (Math.abs(last.x - x) + Math.abs(last.y - y) === 1) {
       const newPath = [...path, {x, y}];
       setPath(newPath);
       if (x === target.x && y === target.y) {
          const finalScore = score + 100;
          setScore(finalScore);
          updateGameScore('path', finalScore);
          setPath([]);
          setTarget({
             x: Math.floor(Math.random() * gridSize),
             y: Math.floor(Math.random() * gridSize)
          });
       }
    } else {
       setPath([{x, y}]);
    }
  };

  return (
    <div className="flex flex-col items-center gap-10">
       <div className="text-center">
          <h2 className="text-4xl font-serif italic mb-2">Neural Link</h2>
          <p className="text-[10px] uppercase tracking-widest text-my-accent font-bold">Connections Established: {score}</p>
       </div>
       <div className="grid grid-cols-6 gap-2 p-4 bg-black/5 border border-my-border">
          {Array.from({length: gridSize * gridSize}).map((_, i) => {
             const x = i % gridSize;
             const y = Math.floor(i / gridSize);
             const isPath = path.some(p => p.x === x && p.y === y);
             const isTarget = target.x === x && target.y === y;
             return (
                <button
                  key={i}
                  onClick={() => handleCellClick(x, y)}
                  className={clsx(
                    "w-12 h-12 border transition-all duration-300",
                    isTarget ? "bg-my-accent border-my-accent animate-pulse shadow-[0_0_20px_rgba(242,125,38,0.5)]" : 
                    isPath ? "bg-my-ink border-my-ink text-white" : "bg-white border-my-border hover:bg-black/5"
                  )}
                >
                   {isTarget && <Zap size={14} className="text-white mx-auto" />}
                </button>
             );
          })}
       </div>
       <p className="text-[10px] text-my-muted uppercase tracking-widest italic">Connect nodes sequentially to establish the link.</p>
    </div>
  );
}
