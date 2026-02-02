import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useThemeTransition, TransitionEffect } from '@/hooks/useThemeTransition';
import { MatrixRain } from './effects/MatrixRain';
import { LiquidMorph } from './effects/LiquidMorph';
import { PortalWarp } from './effects/PortalWarp';
import { GlitchEffect } from './effects/GlitchEffect';
import { ParticleExplosion } from './effects/ParticleExplosion';
import { cn } from '@/lib/utils';

const EFFECT_NAMES: Record<TransitionEffect, string> = {
  matrix: 'Matrix Rain',
  liquid: 'Liquid Morph',
  portal: 'Portal Warp',
  glitch: 'Glitch Effect',
  particles: 'Particle Explosion',
};

// Safety timeout to prevent button from getting stuck
const ANIMATION_SAFETY_TIMEOUT = 3000;

export function MatrixDarkModeToggle() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | undefined>();
  
  // Local state to track active animation
  const [animationState, setAnimationState] = useState<{
    isRunning: boolean;
    effect: TransitionEffect | null;
    startedAsDark: boolean;
  }>({
    isRunning: false,
    effect: null,
    startedAsDark: false,
  });
  
  // Theme switched flag - prevents double switching
  const themeSwitchedRef = useRef(false);
  
  const {
    currentEffect,
    isDark,
    getNextEffect,
    toggleTheme,
    advanceEffect,
    prefersReducedMotion,
  } = useThemeTransition();

  // Safety timeout - reset animation state if it gets stuck
  useEffect(() => {
    if (!animationState.isRunning) return;
    
    const timeout = setTimeout(() => {
      console.warn('Animation safety timeout triggered - resetting state');
      setAnimationState({
        isRunning: false,
        effect: null,
        startedAsDark: false,
      });
      themeSwitchedRef.current = false;
    }, ANIMATION_SAFETY_TIMEOUT);
    
    return () => clearTimeout(timeout);
  }, [animationState.isRunning]);

  const handleClick = useCallback(() => {
    // Prevent clicking while animation is running
    if (animationState.isRunning) return;

    // Get button position for effects that use it
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }

    // If user prefers reduced motion, just toggle instantly
    if (prefersReducedMotion) {
      toggleTheme();
      advanceEffect();
      return;
    }

    // Reset the theme switched flag
    themeSwitchedRef.current = false;

    // Lock in the current effect and start animation
    setAnimationState({
      isRunning: true,
      effect: currentEffect,
      startedAsDark: isDark,
    });
  }, [animationState.isRunning, prefersReducedMotion, toggleTheme, advanceEffect, currentEffect, isDark]);

  // Handle theme switch - called by effect component mid-animation
  const handleThemeSwitch = useCallback(() => {
    // Only switch once per animation
    if (themeSwitchedRef.current) return;
    themeSwitchedRef.current = true;
    toggleTheme();
  }, [toggleTheme]);

  // Handle animation complete - cleanup and advance to next effect
  const handleComplete = useCallback(() => {
    setAnimationState({
      isRunning: false,
      effect: null,
      startedAsDark: false,
    });
    themeSwitchedRef.current = false;
    // Advance to next effect for next click
    advanceEffect();
  }, [advanceEffect]);

  const nextEffect = getNextEffect();

  return (
    <>
      {/* The Toggle Button */}
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        disabled={animationState.isRunning}
        className={cn(
          "relative flex items-center justify-center",
          "w-10 h-10 rounded-full",
          "bg-background/80 backdrop-blur-md",
          "border border-border/50",
          "shadow-lg shadow-primary/10",
          "transition-all duration-300",
          "hover:scale-110 hover:shadow-xl hover:shadow-primary/20",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "group"
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label={`Toggle dark mode. Currently ${isDark ? 'dark' : 'light'} mode. Next effect: ${EFFECT_NAMES[nextEffect]}`}
        title={`Next: ${EFFECT_NAMES[nextEffect]}`}
      >
        {/* Pulsing ring on hover */}
        <motion.div
          className="absolute inset-0 rounded-full ring-2 ring-primary/30"
          initial={{ scale: 1, opacity: 0 }}
          whileHover={{ 
            scale: [1, 1.2, 1], 
            opacity: [0, 0.5, 0],
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Glassmorphism glow */}
        <div className={cn(
          "absolute inset-0 rounded-full",
          "bg-gradient-to-br",
          isDark 
            ? "from-yellow-500/10 to-orange-500/5" 
            : "from-blue-500/10 to-purple-500/5",
          "group-hover:from-primary/20 group-hover:to-primary/10",
          "transition-all duration-300"
        )} />

        {/* Icon with morph animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isDark ? 'moon' : 'sun'}
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="relative z-10"
          >
            {isDark ? (
              <Moon className="w-5 h-5 text-yellow-400" />
            ) : (
              <Sun className="w-5 h-5 text-orange-500" />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Subtle particle hints on hover */}
        <div className="absolute inset-0 overflow-hidden rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "absolute w-1 h-1 rounded-full",
                isDark ? "bg-yellow-400/60" : "bg-primary/60"
              )}
              style={{
                left: '50%',
                top: '50%',
              }}
              animate={{
                x: [0, Math.cos((i / 6) * Math.PI * 2) * 20],
                y: [0, Math.sin((i / 6) * Math.PI * 2) * 20],
                opacity: [0, 0.8, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      </motion.button>

      {/* Effect Overlays - use animationState.effect to lock in which effect plays */}
      {/* Pass startedAsDark instead of isDark to prevent mid-animation changes */}
      <AnimatePresence>
        {animationState.isRunning && animationState.effect === 'matrix' && (
          <MatrixRain
            isActive={true}
            onThemeSwitch={handleThemeSwitch}
            onComplete={handleComplete}
            startedAsDark={animationState.startedAsDark}
          />
        )}
        {animationState.isRunning && animationState.effect === 'liquid' && (
          <LiquidMorph
            isActive={true}
            onThemeSwitch={handleThemeSwitch}
            onComplete={handleComplete}
            startedAsDark={animationState.startedAsDark}
            buttonPosition={buttonPosition}
          />
        )}
        {animationState.isRunning && animationState.effect === 'portal' && (
          <PortalWarp
            isActive={true}
            onThemeSwitch={handleThemeSwitch}
            onComplete={handleComplete}
            startedAsDark={animationState.startedAsDark}
          />
        )}
        {animationState.isRunning && animationState.effect === 'glitch' && (
          <GlitchEffect
            isActive={true}
            onThemeSwitch={handleThemeSwitch}
            onComplete={handleComplete}
            startedAsDark={animationState.startedAsDark}
          />
        )}
        {animationState.isRunning && animationState.effect === 'particles' && (
          <ParticleExplosion
            isActive={true}
            onThemeSwitch={handleThemeSwitch}
            onComplete={handleComplete}
            startedAsDark={animationState.startedAsDark}
            buttonPosition={buttonPosition}
          />
        )}
      </AnimatePresence>
    </>
  );
}
