import React, { useEffect, useRef } from 'react';

export default function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width: number;
    let height: number;
    
    const particles: Particle[] = [];
    const gridSize = 40;
    const mouse = { x: -1000, y: -1000 };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      color: string;

      constructor(x: number, y: number, vx: number, vy: number) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.maxLife = Math.random() * 100 + 50;
        this.life = this.maxLife;
        this.color = Math.random() > 0.5 ? '#F27D26' : '#2A4365';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
      }

      draw(ctx: CanvasRenderingContext2D) {
        const opacity = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = opacity * 0.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const createPulse = () => {
      if (Math.random() > 0.9) {
        const x = Math.floor(Math.random() * (width / gridSize)) * gridSize;
        const y = Math.floor(Math.random() * (height / gridSize)) * gridSize;
        const dir = Math.floor(Math.random() * 4);
        let vx = 0, vy = 0;
        if (dir === 0) vx = 2;
        else if (dir === 1) vx = -2;
        else if (dir === 2) vy = 2;
        else vy = -2;
        particles.push(new Particle(x, y, vx, vy));
      }
    };

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.lineWidth = 1;
      
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    const drawMouseWake = () => {
      const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 150);
      gradient.addColorStop(0, 'rgba(242, 125, 38, 0.08)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      drawGrid();
      drawMouseWake();
      
      createPulse();
      
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) particles.splice(i, 1);
      }
      
      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    resize();
    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'multiply' }}
    />
  );
}
