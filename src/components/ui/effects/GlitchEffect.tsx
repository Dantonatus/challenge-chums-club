import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface GlitchEffectProps {
  isActive: boolean;
  onThemeSwitch: () => void;
  onComplete: () => void;
  isDark: boolean;
}

const DURATION = 800;
const THEME_SWITCH_DELAY = 400;

// Generate random glitch slices
function generateSlices(count: number): { top: number; height: number; offset: number }[] {
  const slices = [];
  for (let i = 0; i < count; i++) {
    slices.push({
      top: Math.random() * 100,
      height: 2 + Math.random() * 8,
      offset: (Math.random() - 0.5) * 30,
    });
  }
  return slices;
}

export function GlitchEffect({ isActive, onThemeSwitch, onComplete, isDark }: GlitchEffectProps) {
  const [intensity, setIntensity] = useState(0);
  const [slices, setSlices] = useState<{ top: number; height: number; offset: number }[]>([]);
  const [rgbOffset, setRgbOffset] = useState({ r: 0, g: 0, b: 0 });
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number>();
  const themeSwitchedRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      setIntensity(0);
      setSlices([]);
      setRgbOffset({ r: 0, g: 0, b: 0 });
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

      // Intensity curve: quick ramp up, peak at 40%, then fade
      let newIntensity: number;
      if (normalizedTime < 0.4) {
        newIntensity = normalizedTime / 0.4;
      } else {
        newIntensity = 1 - ((normalizedTime - 0.4) / 0.6);
      }
      newIntensity = Math.pow(newIntensity, 0.5); // Sharper curve

      setIntensity(newIntensity);

      // Update slices randomly during peak
      if (normalizedTime < 0.7 && Math.random() > 0.5) {
        setSlices(generateSlices(Math.floor(newIntensity * 15)));
      }

      // RGB offset
      const maxOffset = 5 * newIntensity;
      setRgbOffset({
        r: (Math.random() - 0.5) * maxOffset * 2,
        g: 0,
        b: (Math.random() - 0.5) * maxOffset * 2,
      });

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

  const jitter = {
    x: (Math.random() - 0.5) * intensity * 4,
    y: (Math.random() - 0.5) * intensity * 4,
  };

  return (
    <>
      {/* Inject glitch styles into body */}
      <style>
        {`
          .glitch-active {
            transform: translate(${jitter.x}px, ${jitter.y}px) !important;
          }
        `}
      </style>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] pointer-events-none"
      >
        {/* Scan lines overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, ${0.1 * intensity}) 2px,
              rgba(0, 0, 0, ${0.1 * intensity}) 4px
            )`,
            opacity: intensity,
          }}
        />

        {/* RGB channel overlays */}
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(255, 0, 0, 0.1)',
            mixBlendMode: 'multiply',
            transform: `translateX(${rgbOffset.r}px)`,
            opacity: intensity * 0.5,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(0, 0, 255, 0.1)',
            mixBlendMode: 'multiply',
            transform: `translateX(${rgbOffset.b}px)`,
            opacity: intensity * 0.5,
          }}
        />

        {/* Horizontal slice distortions */}
        {slices.map((slice, i) => (
          <div
            key={i}
            className="absolute left-0 right-0"
            style={{
              top: `${slice.top}%`,
              height: `${slice.height}px`,
              background: isDark 
                ? `linear-gradient(90deg, transparent, rgba(0, 255, 255, ${0.3 * intensity}), rgba(255, 0, 255, ${0.2 * intensity}), transparent)`
                : `linear-gradient(90deg, transparent, rgba(255, 0, 255, ${0.3 * intensity}), rgba(0, 255, 255, ${0.2 * intensity}), transparent)`,
              transform: `translateX(${slice.offset * intensity}px)`,
              mixBlendMode: 'screen',
            }}
          />
        ))}

        {/* Random flash blocks */}
        {intensity > 0.5 && (
          <>
            {Array.from({ length: Math.floor(intensity * 5) }).map((_, i) => (
              <div
                key={`block-${i}`}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${10 + Math.random() * 50}px`,
                  height: `${5 + Math.random() * 20}px`,
                  background: Math.random() > 0.5 
                    ? (isDark ? 'white' : 'black')
                    : `hsl(${Math.random() * 360}, 100%, 50%)`,
                  opacity: Math.random() * intensity,
                }}
              />
            ))}
          </>
        )}

        {/* Noise texture */}
        <svg className="absolute inset-0 w-full h-full opacity-20" style={{ opacity: intensity * 0.2 }}>
          <filter id="glitch-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="4"
              seed={Date.now()}
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#glitch-noise)" />
        </svg>
      </motion.div>
    </>
  );
}
