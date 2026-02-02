import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiquidMorphProps {
  isActive: boolean;
  onThemeSwitch: () => void;
  onComplete: () => void;
  isDark: boolean;
  buttonPosition?: { x: number; y: number };
}

const DURATION = 1200;
const THEME_SWITCH_DELAY = 600;

// Generate blob path with organic wobble
function generateBlobPath(progress: number, wobbleOffset: number): string {
  const baseRadius = 50;
  const points = 8;
  const pathPoints: string[] = [];
  
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const wobble = Math.sin(angle * 3 + wobbleOffset) * 10 + Math.sin(angle * 5 + wobbleOffset * 1.5) * 5;
    const radius = baseRadius + wobble;
    const x = 50 + Math.cos(angle) * radius * (progress * 3);
    const y = 50 + Math.sin(angle) * radius * (progress * 3);
    
    if (i === 0) {
      pathPoints.push(`M ${x} ${y}`);
    } else {
      // Use quadratic curves for smoother blob
      const prevAngle = ((i - 0.5) / points) * Math.PI * 2;
      const prevWobble = Math.sin(prevAngle * 3 + wobbleOffset) * 10;
      const cpRadius = baseRadius + prevWobble;
      const cpX = 50 + Math.cos(prevAngle) * cpRadius * (progress * 3);
      const cpY = 50 + Math.sin(prevAngle) * cpRadius * (progress * 3);
      pathPoints.push(`Q ${cpX} ${cpY} ${x} ${y}`);
    }
  }
  
  pathPoints.push('Z');
  return pathPoints.join(' ');
}

export function LiquidMorph({ isActive, onThemeSwitch, onComplete, isDark, buttonPosition }: LiquidMorphProps) {
  const [progress, setProgress] = useState(0);
  const [wobbleOffset, setWobbleOffset] = useState(0);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number>();
  const themeSwitchedRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      setWobbleOffset(0);
      themeSwitchedRef.current = false;
      return;
    }

    startTimeRef.current = performance.now();
    themeSwitchedRef.current = false;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      
      // Trigger theme switch
      if (!themeSwitchedRef.current && elapsed >= THEME_SWITCH_DELAY) {
        themeSwitchedRef.current = true;
        onThemeSwitch();
      }

      // Progress: 0 -> 1 (expand) -> 0 (contract)
      let newProgress: number;
      if (elapsed < DURATION * 0.6) {
        // Expand phase
        newProgress = Math.min(1, elapsed / (DURATION * 0.6));
        newProgress = 1 - Math.pow(1 - newProgress, 3); // Ease out
      } else {
        // Contract phase
        const contractProgress = (elapsed - DURATION * 0.6) / (DURATION * 0.4);
        newProgress = 1 - Math.min(1, contractProgress);
        newProgress = Math.pow(newProgress, 2); // Ease in
      }

      setProgress(newProgress);
      setWobbleOffset(elapsed * 0.005);

      if (elapsed < DURATION) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, onThemeSwitch, onComplete]);

  if (!isActive) return null;

  const centerX = buttonPosition?.x ?? (typeof window !== 'undefined' ? window.innerWidth - 100 : 0);
  const centerY = buttonPosition?.y ?? 40;

  const blobColor = isDark 
    ? 'hsl(200, 100%, 95%)' // Light mint for dark->light
    : 'hsl(250, 50%, 15%)'; // Dark violet for light->dark

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <defs>
          <filter id="liquid-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="liquid-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={blobColor} stopOpacity="1" />
            <stop offset="70%" stopColor={blobColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor={blobColor} stopOpacity="0.9" />
          </radialGradient>
        </defs>
        <g
          style={{
            transform: `translate(${(centerX / window.innerWidth) * 100 - 50}%, ${(centerY / window.innerHeight) * 100 - 50}%)`,
          }}
        >
          <path
            d={generateBlobPath(progress, wobbleOffset)}
            fill="url(#liquid-gradient)"
            filter="url(#liquid-glow)"
            style={{
              transformOrigin: 'center',
            }}
          />
        </g>
      </svg>
    </motion.div>
  );
}
