import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const updateGameScore = useStore(state => state.updateGameScore);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let snake = [{ x: 10, y: 5 }, { x: 9, y: 5 }, { x: 8, y: 5 }];
    let food = { x: 15, y: 5 };
    let dx = 1;
    let dy = 0;
    let gameLoop: number;
    const gridSize = 20; // Bigger for the playground
    const tileCountX = canvas.width / gridSize;
    const tileCountY = canvas.height / gridSize;

    const drawGame = () => {
      // clear
      ctx.fillStyle = '#f8fafc'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // move snake
      const head = { x: snake[0].x + dx, y: snake[0].y + dy };
      
      // wrap around
      if (head.x < 0) head.x = tileCountX - 1;
      if (head.x >= tileCountX) head.x = 0;
      if (head.y < 0) head.y = tileCountY - 1;
      if (head.y >= tileCountY) head.y = 0;

      // collision with self
      let collided = false;
      for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
          collided = true;
          break;
        }
      }

      if (collided) {
        snake = [{ x: 10, y: 5 }, { x: 9, y: 5 }, { x: 8, y: 5 }];
        dx = 1;
        dy = 0;
        setScore(0);
      } else {
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          const newScore = score + 10;
          setScore(newScore);
          updateGameScore('snake', newScore);
          food = {
            x: Math.floor(Math.random() * tileCountX),
            y: Math.floor(Math.random() * tileCountY)
          };
        } else {
          snake.pop();
        }
      }

      // draw food
      ctx.fillStyle = '#F27D26';
      ctx.beginPath();
      ctx.arc(food.x * gridSize + gridSize/2, food.y * gridSize + gridSize/2, gridSize/2 - 2, 0, 2 * Math.PI);
      ctx.fill();

      // draw snake
      snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#1a2a40' : '#2A4365';
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 1, gridSize - 1);
      });

      gameLoop = window.setTimeout(drawGame, 100);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
      switch (e.key) {
        case 'ArrowUp': if (dy !== 1) { dx = 0; dy = -1; } break;
        case 'ArrowDown': if (dy !== -1) { dx = 0; dy = 1; } break;
        case 'ArrowLeft': if (dx !== 1) { dx = -1; dy = 0; } break;
        case 'ArrowRight': if (dx !== -1) { dx = 1; dy = 0; } break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    drawGame();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(gameLoop);
    };
  }, [score]); // Add score to deps for updateGameScore consistency if needed, though better handled inside

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-[10px] uppercase tracking-widest text-my-muted font-bold flex justify-between w-full max-w-[400px]">
        <span>Neural Calibration</span>
        <span className="text-my-accent">Anomalies Intercepted: {score}</span>
      </div>
      <div className="p-2 bg-white border border-my-border shadow-2xl">
        <canvas ref={canvasRef} width={400} height={300} />
      </div>
      <p className="text-[10px] text-my-muted uppercase tracking-widest italic">Use Arrow Keys to navigate the neural grid.</p>
    </div>
  );
}
