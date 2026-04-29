import React, { useState, useEffect } from 'react';

const CHARS = '!<>-_\\/[]{}—=+*^?#________';

export default function ScrambleText({ text, duration = 1.0, className = "" }: { text: string, duration?: number, className?: string }) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    let frame = 0;
    const totalFrames = duration * 60;
    const queue: { from: string, to: string, start: number, end: number, char?: string }[] = [];

    for (let i = 0; i < text.length; i++) {
      const from = CHARS[Math.floor(Math.random() * CHARS.length)];
      const to = text[i];
      const start = Math.floor(Math.random() * 40);
      const end = start + Math.floor(Math.random() * 40);
      queue.push({ from, to, start, end });
    }

    const interval = setInterval(() => {
      frame++;
      let complete = 0;
      let output = '';

      for (let i = 0; i < queue.length; i++) {
        let { from, to, start, end, char } = queue[i];
        if (frame >= end) {
          complete++;
          output += to;
        } else if (frame >= start) {
          if (!char || Math.random() < 0.28) {
            char = CHARS[Math.floor(Math.random() * CHARS.length)];
            queue[i].char = char;
          }
          output += char;
        } else {
          output += ' ';
        }
      }

      setDisplayText(output);

      if (complete === queue.length) {
        clearInterval(interval);
      }
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, [text, duration]);

  return <span className={className}>{displayText}</span>;
}
