import { useEffect, useState, useRef } from 'react';
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
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'sucking' | 'expanding' | 'settling'>('sucking');
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number>();
  const themeSwitchedRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      setPhase('sucking');
      themeSwitchedRef.current = false;
      return;
    }

    startTimeRef.current = performance.now();
    themeSwitchedRef.current = false;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const normalizedTime = elapsed / DURATION;

      // Trigger theme switch
      if (!themeSwitchedRef.current && elapsed >= THEME_SWITCH_DELAY) {
        themeSwitchedRef.current = true;
        onThemeSwitch();
      }

      // Phase transitions
      if (normalizedTime < 0.5) {
        setPhase('sucking');
        setProgress(normalizedTime * 2); // 0 -> 1
      } else if (normalizedTime < 0.8) {
        setPhase('expanding');
        setProgress(1 - ((normalizedTime - 0.5) / 0.3)); // 1 -> 0
      } else {
        setPhase('settling');
        const settleProgress = (normalizedTime - 0.8) / 0.2;
        // Overshoot and settle
        setProgress(Math.sin(settleProgress * Math.PI) * 0.05);
      }

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

  // Calculate warp effects based on phase and progress
  const rotation = phase === 'sucking' ? progress * 720 : phase === 'expanding' ? 720 - progress * 360 : 0;
  const scale = phase === 'sucking' ? 1 - progress * 0.2 : phase === 'expanding' ? 0.8 + progress * 0.25 : 1 + progress;
  const blur = phase === 'sucking' ? progress * 20 : phase === 'expanding' ? (1 - progress) * 20 : 0;
  const portalSize = phase === 'sucking' ? progress * 150 : phase === 'expanding' ? 150 - progress * 150 : 0;

  const portalColor = isDark 
    ? 'hsl(45, 100%, 70%)' // Golden for dark->light
    : 'hsl(270, 80%, 30%)'; // Purple for light->dark

  const glowColor = isDark 
    ? 'rgba(255, 215, 100, 0.6)'
    : 'rgba(138, 43, 226, 0.6)';

  return (
    <>
      {/* Warp effect on body content */}
      <style>
        {`
          .portal-warp-active {
            transform: scale(${scale}) rotate(${rotation}deg) !important;
            filter: blur(${blur}px) !important;
            transition: none !important;
          }
        `}
      </style>

      {/* Portal center */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
      >
        {/* Speed lines */}
        {phase === 'sucking' && (
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute bg-current"
                style={{
                  width: 2,
                  height: '100vh',
                  left: `${5 + i * 5}%`,
                  transformOrigin: 'center',
                  opacity: progress * 0.3,
                  background: `linear-gradient(to bottom, transparent, ${portalColor}, transparent)`,
                  transform: `rotate(${(i - 10) * 5}deg) translateY(${-progress * 50}%)`,
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: progress }}
              />
            ))}
          </div>
        )}

        {/* Central portal */}
        <motion.div
          className="rounded-full"
          style={{
            width: `${portalSize}vmax`,
            height: `${portalSize}vmax`,
            background: isDark 
              ? 'radial-gradient(circle, hsl(0, 0%, 100%) 0%, hsl(45, 100%, 90%) 50%, transparent 100%)'
              : 'radial-gradient(circle, hsl(0, 0%, 0%) 0%, hsl(270, 80%, 20%) 50%, transparent 100%)',
            boxShadow: `
              0 0 ${portalSize * 0.5}px ${glowColor},
              0 0 ${portalSize}px ${glowColor},
              inset 0 0 ${portalSize * 0.3}px ${glowColor}
            `,
          }}
          animate={{
            rotate: rotation,
          }}
          transition={{ duration: 0 }}
        />

        {/* Spiral rings */}
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border-2"
            style={{
              width: `${portalSize * (1 + ring * 0.3)}vmax`,
              height: `${portalSize * (1 + ring * 0.3)}vmax`,
              borderColor: portalColor,
              opacity: (1 - ring * 0.25) * progress,
            }}
            animate={{
              rotate: rotation * (1 - ring * 0.2),
              scale: 1 + Math.sin(progress * Math.PI * 2) * 0.1,
            }}
            transition={{ duration: 0 }}
          />
        ))}
      </motion.div>
    </>
  );
}
