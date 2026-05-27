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
    let targetOpacity = isLoading ? 0.4 : 1;
    let currentOpacity = targetOpacity;

    // ── NeuralBackground state ──
    const dots: { x: number; y: number; isSignal: boolean }[] = [];
    const rings: { x: number; y: number; radius: number; maxRadius: number; speed: number; isSignal: boolean }[] = [];
    const mouse = { x: -1000, y: -1000, active: false };
    const spacing = 40;

    // ── Ambient pulse state ──
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

    // Smooth dim/brighten based on loading state
    const unsubscribeLoading = useStore.subscribe((state, prev) => {
      if (state.isLoading !== prev.isLoading) {
        targetOpacity = state.isLoading ? 0.4 : 1;
      }
    });

    const render = () => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Ambient pulse — keeps canvas feeling alive even when dimmed
      time += 0.02;
      pulse = Math.sin(time) * 0.5 + 0.5;

      // Lerp opacity toward target for smooth transition
      currentOpacity += (targetOpacity - currentOpacity) * 0.03;

      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = currentOpacity;

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
          const breath = 0.6 + 0.4 * pulse;
          ctx.globalAlpha = finalAlpha * breath;
          ctx.strokeStyle = getSignalColor();
          ctx.lineWidth = 1.5;

          if (intensity > 0.1) {
            ctx.shadowBlur = 15 * intensity * breath;
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

      // Music visualizer waves removed — no Spotify bg animations

      ctx.globalAlpha = 1;
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
  }, [theme, isMobile]);

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
