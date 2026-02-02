import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface MatrixRainProps {
  isActive: boolean;
  onThemeSwitch: () => void;
  onComplete: () => void;
  startedAsDark: boolean;
}

const CHARACTERS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DURATION = 1500;
const THEME_SWITCH_DELAY = 500;

interface TrailChar {
  x: number;
  y: number;
  char: string;
  age: number;
}

export function MatrixRain({ isActive, onThemeSwitch, onComplete, startedAsDark }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const themeSwitchedRef = useRef(false);
  const completedRef = useRef(false);
  
  // Freeze the dark state at animation start
  const frozenDarkRef = useRef(startedAsDark);
  
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

    // Freeze the dark state when animation starts
    frozenDarkRef.current = startedAsDark;

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
    
    // Trail buffer for smooth rendering
    const trailBuffer: TrailChar[][] = Array(columns).fill(null).map(() => []);
    const MAX_TRAIL_AGE = 12;
    
    startTimeRef.current = performance.now();
    themeSwitchedRef.current = false;
    completedRef.current = false;

    // Use the frozen value for the entire animation
    const wasDark = frozenDarkRef.current;

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

      // Full clear for consistent rendering
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      // Draw trail characters with fading
      for (let col = 0; col < columns; col++) {
        // Age existing trail characters and draw them
        trailBuffer[col] = trailBuffer[col].filter(item => {
          item.age++;
          if (item.age >= MAX_TRAIL_AGE) return false;
          
          const trailOpacity = (1 - item.age / MAX_TRAIL_AGE) * globalAlpha * 0.6;
          ctx.fillStyle = `rgba(0, 255, 136, ${trailOpacity})`;
          ctx.fillText(item.char, item.x, item.y);
          return true;
        });
      }

      // Draw new head characters
      for (let i = 0; i < columns; i++) {
        const char = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Only draw if on screen
        if (y > 0 && y < canvas.height + fontSize) {
          // Add to trail buffer
          trailBuffer[i].push({ x, y, char, age: 0 });

          // Draw head character with glow
          ctx.shadowColor = '#00ffcc';
          ctx.shadowBlur = 15;
          ctx.fillStyle = `rgba(0, 255, 255, ${globalAlpha})`;
          ctx.fillText(char, x, y);
          ctx.shadowBlur = 0;
        }

        // Move drop down
        drops[i] += speeds[i] * 0.15;

        // Reset drop when it goes off screen
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.98) {
          drops[i] = Math.random() * -10;
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
  }, [isActive]); // Only isActive as dependency - startedAsDark is frozen at start

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
