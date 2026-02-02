import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface MatrixRainProps {
  isActive: boolean;
  onThemeSwitch: () => void;
  onComplete: () => void;
  isDark: boolean;
}

const CHARACTERS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DURATION = 1500;
const THEME_SWITCH_DELAY = 500;

export function MatrixRain({ isActive, onThemeSwitch, onComplete, isDark }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const themeSwitchedRef = useRef(false);
  const completedRef = useRef(false);
  
  // Store callbacks in ref to avoid stale closures
  const callbacksRef = useRef({ onThemeSwitch, onComplete });
  useEffect(() => {
    callbacksRef.current = { onThemeSwitch, onComplete };
  }, [onThemeSwitch, onComplete]);

  useEffect(() => {
    if (!isActive) {
      themeSwitchedRef.current = false;
      completedRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const fontSize = 16;
    const columns = Math.ceil(canvas.width / fontSize);
    
    // Initialize drops at random positions above viewport
    const drops: number[] = Array(columns).fill(0).map(() => Math.random() * -50);
    const speeds: number[] = Array(columns).fill(0).map(() => 3 + Math.random() * 5);
    
    startTimeRef.current = performance.now();
    themeSwitchedRef.current = false;
    completedRef.current = false;

    const animate = (currentTime: number) => {
      if (!isActive || completedRef.current) return;
      
      const elapsed = currentTime - startTimeRef.current;
      
      // Trigger theme switch at the right moment (only once)
      if (!themeSwitchedRef.current && elapsed >= THEME_SWITCH_DELAY) {
        themeSwitchedRef.current = true;
        callbacksRef.current.onThemeSwitch();
      }

      // Calculate fade out
      const fadeProgress = Math.max(0, (elapsed - DURATION * 0.6) / (DURATION * 0.4));
      const globalAlpha = 1 - fadeProgress;

      // Clear with semi-transparent black for trail effect
      ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns; i++) {
        // Get random character
        const char = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Gradient effect - brighter at the head
        const gradient = ctx.createLinearGradient(x, y - fontSize * 10, x, y);
        gradient.addColorStop(0, `rgba(0, 255, 136, ${0.1 * globalAlpha})`);
        gradient.addColorStop(0.8, `rgba(0, 255, 200, ${0.8 * globalAlpha})`);
        gradient.addColorStop(1, `rgba(0, 255, 255, ${globalAlpha})`);
        
        ctx.fillStyle = gradient;
        ctx.fillText(char, x, y);

        // Add glow effect for head character
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 10;
        ctx.fillStyle = `rgba(0, 255, 204, ${globalAlpha})`;
        ctx.fillText(char, x, y);
        ctx.shadowBlur = 0;

        // Move drop down
        drops[i] += speeds[i] * 0.1;

        // Reset drop when it goes off screen
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
      }

      if (elapsed < DURATION) {
        animationRef.current = requestAnimationFrame(animate);
      } else if (!completedRef.current) {
        completedRef.current = true;
        callbacksRef.current.onComplete();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isActive, isDark]);

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="fixed inset-0 z-[9999] pointer-events-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: 'transparent' }}
      />
    </motion.div>
  );
}
