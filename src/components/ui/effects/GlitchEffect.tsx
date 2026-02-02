import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface GlitchEffectProps {
  isActive: boolean;
  onThemeSwitch: () => void;
  onComplete: () => void;
  startedAsDark: boolean;
}

const DURATION = 800;
const THEME_SWITCH_DELAY = 400;

export function GlitchEffect({ isActive, onThemeSwitch, onComplete, startedAsDark }: GlitchEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const themeSwitchedRef = useRef(false);
  const completedRef = useRef(false);
  
  // Freeze the dark state at animation start
  const frozenDarkRef = useRef(startedAsDark);
  
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

    // Freeze the dark state when animation starts
    frozenDarkRef.current = startedAsDark;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    startTimeRef.current = performance.now();
    themeSwitchedRef.current = false;
    completedRef.current = false;

    // Use the frozen value for the entire animation
    const wasDark = frozenDarkRef.current;

    const animate = (currentTime: number) => {
      if (!isActive || completedRef.current) return;
      
      const elapsed = currentTime - startTimeRef.current;
      const normalizedTime = elapsed / DURATION;

      if (!themeSwitchedRef.current && elapsed >= THEME_SWITCH_DELAY) {
        themeSwitchedRef.current = true;
        callbacksRef.current.onThemeSwitch();
      }

      // Intensity curve: quick ramp up, peak at 40%, then fade
      let intensity: number;
      if (normalizedTime < 0.4) {
        intensity = normalizedTime / 0.4;
      } else {
        intensity = 1 - ((normalizedTime - 0.4) / 0.6);
      }
      intensity = Math.max(0, Math.pow(intensity, 0.5));

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Scan lines
      ctx.fillStyle = `rgba(0, 0, 0, ${0.1 * intensity})`;
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 2);
      }

      // Horizontal slice distortions
      const sliceCount = Math.floor(intensity * 15);
      for (let i = 0; i < sliceCount; i++) {
        const y = Math.random() * canvas.height;
        const height = 2 + Math.random() * 8;
        const offset = (Math.random() - 0.5) * 30 * intensity;

        const gradient = ctx.createLinearGradient(0, y, canvas.width, y);
        const color1 = wasDark 
          ? `rgba(0, 255, 255, ${0.3 * intensity})`
          : `rgba(255, 0, 255, ${0.3 * intensity})`;
        const color2 = wasDark 
          ? `rgba(255, 0, 255, ${0.2 * intensity})`
          : `rgba(0, 255, 255, ${0.2 * intensity})`;
        
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.3, color1);
        gradient.addColorStop(0.7, color2);
        gradient.addColorStop(1, 'transparent');

        ctx.save();
        ctx.translate(offset, 0);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, y, canvas.width, height);
        ctx.restore();
      }

      // RGB channel overlays
      const rgbOffset = 5 * intensity;
      
      // Red channel
      ctx.fillStyle = `rgba(255, 0, 0, ${0.1 * intensity})`;
      ctx.fillRect(-rgbOffset + (Math.random() - 0.5) * 4, 0, canvas.width, canvas.height);
      
      // Blue channel
      ctx.fillStyle = `rgba(0, 0, 255, ${0.1 * intensity})`;
      ctx.fillRect(rgbOffset + (Math.random() - 0.5) * 4, 0, canvas.width, canvas.height);

      // Random flash blocks
      if (intensity > 0.5) {
        const blockCount = Math.floor(intensity * 8);
        for (let i = 0; i < blockCount; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const w = 10 + Math.random() * 50;
          const h = 5 + Math.random() * 20;
          
          ctx.fillStyle = Math.random() > 0.5 
            ? (wasDark ? `rgba(255, 255, 255, ${Math.random() * intensity})` : `rgba(0, 0, 0, ${Math.random() * intensity})`)
            : `hsla(${Math.random() * 360}, 100%, 50%, ${Math.random() * intensity})`;
          ctx.fillRect(x, y, w, h);
        }
      }

      // Noise texture (optimized - only process a sample of pixels)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const noiseIntensity = intensity * 0.15;
      const step = 16; // Process every 16th pixel for performance
      
      for (let i = 0; i < data.length; i += 4 * step) {
        if (Math.random() < noiseIntensity * 0.3) {
          const noise = (Math.random() - 0.5) * 255 * noiseIntensity;
          data[i] = Math.min(255, Math.max(0, data[i] + noise));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }
      }
      ctx.putImageData(imageData, 0, 0);

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
      transition={{ duration: 0.05 }}
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
