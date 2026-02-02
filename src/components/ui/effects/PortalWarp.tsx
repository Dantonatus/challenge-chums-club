import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface PortalWarpProps {
  isActive: boolean;
  onThemeSwitch: () => void;
  onComplete: () => void;
  isDark: boolean;
}

const DURATION = 1800;
const THEME_SWITCH_DELAY = 900;

export function PortalWarp({ isActive, onThemeSwitch, onComplete, isDark }: PortalWarpProps) {
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

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY) * 1.2;

    startTimeRef.current = performance.now();
    themeSwitchedRef.current = false;
    completedRef.current = false;

    // Speed lines
    const lines: { angle: number; speed: number; length: number; width: number }[] = [];
    for (let i = 0; i < 60; i++) {
      lines.push({
        angle: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5,
        length: 50 + Math.random() * 200,
        width: 1 + Math.random() * 3,
      });
    }

    const animate = (currentTime: number) => {
      if (!isActive || completedRef.current) return;
      
      const elapsed = currentTime - startTimeRef.current;
      const normalizedTime = elapsed / DURATION;

      if (!themeSwitchedRef.current && elapsed >= THEME_SWITCH_DELAY) {
        themeSwitchedRef.current = true;
        callbacksRef.current.onThemeSwitch();
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate progress and phase
      let portalRadius: number;
      let rotation: number;
      let intensity: number;
      
      if (normalizedTime < 0.5) {
        // Opening phase
        const t = normalizedTime * 2;
        portalRadius = maxRadius * t * t;
        rotation = t * 720;
        intensity = t;
      } else if (normalizedTime < 0.8) {
        // Closing phase
        const t = (normalizedTime - 0.5) / 0.3;
        portalRadius = maxRadius * (1 - t * t);
        rotation = 720 + t * 360;
        intensity = 1 - t;
      } else {
        // Settle phase
        portalRadius = 0;
        rotation = 1080;
        intensity = 0;
      }

      // Draw speed lines
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);

      lines.forEach((line) => {
        const lineProgress = ((elapsed * line.speed * 0.01) % 1);
        const startDist = lineProgress * maxRadius;
        const endDist = startDist + line.length * intensity;

        const gradient = ctx.createLinearGradient(
          Math.cos(line.angle) * startDist,
          Math.sin(line.angle) * startDist,
          Math.cos(line.angle) * endDist,
          Math.sin(line.angle) * endDist
        );

        const lineColor = isDark ? 'hsl(45, 100%, 70%)' : 'hsl(270, 80%, 50%)';
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, lineColor);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.moveTo(
          Math.cos(line.angle) * startDist,
          Math.sin(line.angle) * startDist
        );
        ctx.lineTo(
          Math.cos(line.angle) * endDist,
          Math.sin(line.angle) * endDist
        );
        ctx.strokeStyle = gradient;
        ctx.lineWidth = line.width * intensity;
        ctx.globalAlpha = intensity * 0.6;
        ctx.stroke();
      });

      ctx.restore();

      // Draw portal
      if (portalRadius > 0) {
        // Outer glow rings
        for (let i = 3; i >= 0; i--) {
          const ringRadius = portalRadius * (1 + i * 0.1);
          const gradient = ctx.createRadialGradient(
            centerX, centerY, ringRadius * 0.9,
            centerX, centerY, ringRadius
          );
          
          const glowColor = isDark 
            ? `hsla(45, 100%, 70%, ${0.3 - i * 0.07})`
            : `hsla(270, 80%, 50%, ${0.3 - i * 0.07})`;
          
          gradient.addColorStop(0, 'transparent');
          gradient.addColorStop(0.5, glowColor);
          gradient.addColorStop(1, 'transparent');

          ctx.beginPath();
          ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.globalAlpha = intensity;
          ctx.fill();
        }

        // Main portal
        const portalGradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, portalRadius
        );
        
        if (isDark) {
          portalGradient.addColorStop(0, 'hsl(0, 0%, 100%)');
          portalGradient.addColorStop(0.3, 'hsl(45, 100%, 95%)');
          portalGradient.addColorStop(0.7, 'hsl(45, 80%, 85%)');
          portalGradient.addColorStop(1, 'hsl(45, 60%, 75%)');
        } else {
          portalGradient.addColorStop(0, 'hsl(0, 0%, 0%)');
          portalGradient.addColorStop(0.3, 'hsl(270, 50%, 10%)');
          portalGradient.addColorStop(0.7, 'hsl(270, 40%, 20%)');
          portalGradient.addColorStop(1, 'hsl(270, 30%, 30%)');
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, portalRadius, 0, Math.PI * 2);
        ctx.fillStyle = portalGradient;
        ctx.globalAlpha = 1;
        ctx.fill();
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
