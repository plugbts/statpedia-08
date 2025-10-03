import React, { useEffect, useRef, useCallback } from 'react';

export const MatrixBackground: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const dropsRef = useRef<number[]>([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fade effect
    ctx.fillStyle = 'rgba(8, 12, 20, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Matrix text
    ctx.fillStyle = 'rgba(191, 255, 255, 0.1)';
    ctx.font = '14px monospace';

    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    
    // Ensure drops array is correct size
    if (dropsRef.current.length !== columns) {
      dropsRef.current = new Array(columns).fill(1);
    }

    // Use a smaller character set for better performance
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    
    for (let i = 0; i < columns; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(text, i * fontSize, dropsRef.current[i] * fontSize);

      // Reset drop occasionally
      if (dropsRef.current[i] * fontSize > canvas.height && Math.random() > 0.975) {
        dropsRef.current[i] = 0;
      }
      dropsRef.current[i]++;
    }

    animationRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start animation
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-20"
      style={{ background: 'transparent' }}
    />
  );
});