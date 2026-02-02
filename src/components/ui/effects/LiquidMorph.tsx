import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface LiquidMorphProps {
  isActive: boolean;
  onThemeSwitch: () => void;
  onComplete: () => void;
  isDark: boolean;
  buttonPosition?: { x: number; y: number };
}

const DURATION = 1200;
const THEME_SWITCH_DELAY = 600;

export function LiquidMorph({ isActive, onThemeSwitch, onComplete, isDark, buttonPosition }: LiquidMorphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const themeSwitchedRef = useRef(false);
  const completedRef = useRef(false);
  
  // Store callbacks in ref
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

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const centerX = buttonPosition?.x ?? canvas.width - 100;
    const centerY = buttonPosition?.y ?? 40;

    startTimeRef.current = performance.now();
    themeSwitchedRef.current = false;
    completedRef.current = false;

    const animate = (currentTime: number) => {
      if (!isActive || completedRef.current) return;
      
      const elapsed = currentTime - startTimeRef.current;
      
      if (!themeSwitchedRef.current && elapsed >= THEME_SWITCH_DELAY) {
        themeSwitchedRef.current = true;
        callbacksRef.current.onThemeSwitch();
      }

      // Progress: expand then contract
      let progress: number;
      if (elapsed < DURATION * 0.6) {
        progress = elapsed / (DURATION * 0.6);
        progress = 1 - Math.pow(1 - progress, 3); // Ease out
      } else {
        const contractProgress = (elapsed - DURATION * 0.6) / (DURATION * 0.4);
        progress = 1 - Math.min(1, contractProgress);
        progress = Math.pow(progress, 2); // Ease in
      }

      const wobbleOffset = elapsed * 0.005;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate max radius to cover screen
      const maxRadius = Math.sqrt(
        Math.pow(Math.max(centerX, canvas.width - centerX), 2) +
        Math.pow(Math.max(centerY, canvas.height - centerY), 2)
      ) * 1.5;

      const radius = maxRadius * progress;

      // Create blob path with wobble
      ctx.beginPath();
      const points = 64;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const wobble = 
          Math.sin(angle * 3 + wobbleOffset) * 15 +
          Math.sin(angle * 5 + wobbleOffset * 1.5) * 8 +
          Math.sin(angle * 7 + wobbleOffset * 0.8) * 4;
        
        const r = radius + wobble * progress;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      // Create gradient fill
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius
      );
      
      if (isDark) {
        // Dark -> Light: light colors
        gradient.addColorStop(0, 'hsl(200, 100%, 98%)');
        gradient.addColorStop(0.5, 'hsl(180, 80%, 95%)');
        gradient.addColorStop(1, 'hsl(160, 60%, 90%)');
      } else {
        // Light -> Dark: dark colors
        gradient.addColorStop(0, 'hsl(250, 50%, 10%)');
        gradient.addColorStop(0.5, 'hsl(260, 40%, 15%)');
        gradient.addColorStop(1, 'hsl(270, 30%, 20%)');
      }

      ctx.fillStyle = gradient;
      ctx.fill();

      // Add glow
      ctx.shadowColor = isDark ? 'hsl(180, 100%, 80%)' : 'hsl(270, 80%, 50%)';
      ctx.shadowBlur = 30;
      ctx.fill();
      ctx.shadowBlur = 0;

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
  }, [isActive, isDark, buttonPosition]);

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
