import React, { useRef, useEffect } from 'react';
import { useStore } from '../store';

export default function MusicVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vibe = useStore((s) => s.vibe);
  const consensus = useStore((s) => s.currentReport?.scores?.evidence_consensus || 'insufficient');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    let pulse = 0;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isHighEnergy = vibe === 'energy';
      const isConflicted = consensus === 'mixed' || consensus === 'contested';

      // Speed up time and calculate BPM-based pulse
      time += isHighEnergy ? 0.04 : 0.01;
      const bpm = isHighEnergy ? 128 : 60;
      pulse = Math.abs(Math.sin(time * (bpm / 60) * Math.PI));

      if (isHighEnergy && isConflicted) {
        // --- JAGGED GLITCHY SPIKES ---
        ctx.strokeStyle = 'rgba(242, 125, 38, 0.2)'; // Orange accent
        ctx.lineWidth = 1;

        for (let j = 0; j < 2; j++) {
          ctx.beginPath();
          for (let x = 0; x < canvas.width; x += 4) {
            const glitchOffset = Math.random() > 0.98 ? (Math.random() - 0.5) * 100 : 0;
            const noise = (Math.random() - 0.5) * 20;
            const y = canvas.height * 0.75 + Math.sin(x * 0.01 + time * 2) * 50 + glitchOffset + noise;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        // Sudden scanlines
        if (Math.random() > 0.95) {
          ctx.fillStyle = 'rgba(242, 125, 38, 0.05)';
          ctx.fillRect(0, Math.random() * canvas.height, canvas.width, Math.random() * 4);
        }
      } else {
        // --- SLOW CALMING WAVES ---
        // Color shifts based on vibe
        const waveColor = vibe === 'focus'
          ? 'rgba(42, 67, 101, 0.12)' // Deep ink/blue
          : 'rgba(242, 125, 38, 0.15)'; // Soft orange

        ctx.fillStyle = waveColor;

        const waveCount = isMobile ? 1 : 3;
        for (let i = 0; i < waveCount; i++) {
          ctx.beginPath();
          ctx.moveTo(0, canvas.height);
          for (let x = 0; x <= canvas.width; x += 20) {
            // Lower base amplitude for less distraction
            const amplitude = (12 + i * 8) * (1 + pulse * 0.25);
            const y = canvas.height * 0.90 + Math.sin(x * 0.003 + time + i * 0.5) * amplitude;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(canvas.width, canvas.height);
          ctx.fill();
        }
      }

      animationFrameId = window.requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [vibe, consensus]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
