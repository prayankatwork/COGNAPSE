import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { getSignalColor } from '../utils/brandColors';

function detectMobileViewport() {
  if (typeof window === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
}

export default function UnifiedCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useStore((state) => state.theme);
  const vibe = useStore((s) => s.vibe);
  const consensus = useStore((s) => s.currentReport?.scores?.evidence_consensus || 'insufficient');
  const isLoading = useStore((s) => s.isLoading);
  const [isMobile, setIsMobile] = useState(detectMobileViewport);

  useEffect(() => {
    const onResize = () => setIsMobile(detectMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width: number;
    let height: number;
    let isPaused = isLoading;

    // ── NeuralBackground state ──
    const dots: { x: number; y: number; isSignal: boolean }[] = [];
    const rings: { x: number; y: number; radius: number; maxRadius: number; speed: number; isSignal: boolean }[] = [];
    const mouse = { x: -1000, y: -1000, active: false };
    const spacing = 40;

    // ── MusicVisualizer state ──
    let time = 0;
    let pulse = 0;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      dots.length = 0;
      const offsetX = (width % spacing) / 2;
      const offsetY = (height % spacing) / 2;

      for (let x = offsetX; x < width; x += spacing) {
        for (let y = offsetY; y < height; y += spacing) {
          dots.push({
            x, y,
            isSignal: Math.random() > 0.96,
          });
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    // Pause/resume based on loading state
    const unsubscribeLoading = useStore.subscribe((state, prev) => {
      if (state.isLoading !== prev.isLoading) {
        isPaused = state.isLoading;
      }
    });

    const render = () => {
      // Pause during loading to free GPU for research computation
      if (document.hidden || isPaused) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // ══════════════════════════════════════
      // NEURAL BACKGROUND LAYER
      // ══════════════════════════════════════

      // Randomly spawn sonar rings
      if (Math.random() > 0.985 && rings.length < 6) {
        rings.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 0,
          maxRadius: Math.random() * 400 + 200,
          speed: Math.random() * 1.5 + 1.0,
          isSignal: Math.random() > 0.8,
        });
      }

      // Update and draw sonar rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.radius += ring.speed;

        if (ring.radius > ring.maxRadius) {
          rings.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        const ringAlpha = Math.max(0, 1 - (ring.radius / ring.maxRadius));
        ctx.strokeStyle = ring.isSignal ? getSignalColor() : (theme === 'dark' ? '#ffffff' : '#2A4365');
        ctx.globalAlpha = ringAlpha * (ring.isSignal ? 0.15 : 0.05);
        ctx.lineWidth = 1;
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Draw grid dots
      dots.forEach(dot => {
        let intensity = 0;

        // Scanner interaction from mouse
        if (mouse.active) {
          const dx = mouse.x - dot.x;
          const dy = mouse.y - dot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 250) {
            intensity += (250 - dist) / 250 * 0.9;
          }
        }

        // Scanner interactions from sonar rings
        rings.forEach(ring => {
          const dx = ring.x - dot.x;
          const dy = ring.y - dot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const ringDist = Math.abs(dist - ring.radius);

          if (ringDist < 60) {
            const ringIllumination = (1 - ringDist / 60) * (1 - ring.radius / ring.maxRadius);
            intensity += ringIllumination * (ring.isSignal ? 1.5 : 1.0);
          }
        });

        const baseAlpha = theme === 'dark' ? 0.04 : 0.03;
        const finalAlpha = Math.min(1, baseAlpha + intensity);

        if (dot.isSignal) {
          ctx.globalAlpha = finalAlpha;
          ctx.strokeStyle = getSignalColor();
          ctx.lineWidth = 1.5;

          if (intensity > 0.1) {
            ctx.shadowBlur = 15 * intensity;
            ctx.shadowColor = getSignalColor();
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.beginPath();
          ctx.moveTo(dot.x - 4, dot.y);
          ctx.lineTo(dot.x + 4, dot.y);
          ctx.moveTo(dot.x, dot.y - 4);
          ctx.lineTo(dot.x, dot.y + 4);
          ctx.stroke();

          ctx.globalAlpha = 1.0;
          ctx.shadowBlur = 0;
        } else {
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = theme === 'dark' ? `rgba(255,255,255,${finalAlpha})` : `rgba(42,67,101,${finalAlpha})`;
          ctx.fill();
        }
      });

      // ══════════════════════════════════════
      // MUSIC VISUALIZER LAYER (at the bottom)
      // ══════════════════════════════════════

      const isHighEnergy = vibe === 'energy';
      const isConflicted = consensus === 'mixed' || consensus === 'contested';

      time += isHighEnergy ? 0.04 : 0.01;
      const bpm = isHighEnergy ? 128 : 60;
      pulse = Math.abs(Math.sin(time * (bpm / 60) * Math.PI));

      if (isHighEnergy && isConflicted) {
        // Jagged glitchy spikes
        ctx.strokeStyle = 'rgba(242, 125, 38, 0.2)';
        ctx.lineWidth = 1;

        for (let j = 0; j < 2; j++) {
          ctx.beginPath();
          for (let x = 0; x < width; x += 4) {
            const glitchOffset = Math.random() > 0.98 ? (Math.random() - 0.5) * 100 : 0;
            const noise = (Math.random() - 0.5) * 20;
            const y = height * 0.75 + Math.sin(x * 0.01 + time * 2) * 50 + glitchOffset + noise;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        // Sudden scanlines
        if (Math.random() > 0.95) {
          ctx.fillStyle = 'rgba(242, 125, 38, 0.05)';
          ctx.fillRect(0, Math.random() * height, width, Math.random() * 4);
        }
      } else {
        // Slow calming waves
        const waveColor = vibe === 'focus'
          ? 'rgba(42, 67, 101, 0.12)'
          : 'rgba(242, 125, 38, 0.15)';

        ctx.fillStyle = waveColor;
        const waveCount = 3;

        for (let i = 0; i < waveCount; i++) {
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let x = 0; x <= width; x += 20) {
            const amplitude = (12 + i * 8) * (1 + pulse * 0.25);
            const y = height * 0.90 + Math.sin(x * 0.003 + time + i * 0.5) * amplitude;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(width, height);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    resize();
    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
      unsubscribeLoading();
    };
  }, [theme, vibe, consensus, isMobile, isLoading]);

  if (isMobile) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: theme === 'dark' ? 'screen' : 'multiply' }}
      aria-hidden="true"
    />
  );
}
