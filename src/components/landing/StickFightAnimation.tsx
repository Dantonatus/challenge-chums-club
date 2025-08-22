import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Weapon {
  name: string;
  emoji: string;
  color: string;
}

const weapons: Weapon[] = [
  { name: "sword", emoji: "⚔️", color: "hsl(var(--chart-pastel-1))" },
  { name: "frying pan", emoji: "🍳", color: "hsl(var(--chart-pastel-2))" },
  { name: "lightsaber", emoji: "⚡", color: "hsl(var(--chart-pastel-3))" },
  { name: "pencil", emoji: "✏️", color: "hsl(var(--chart-pastel-4))" },
  { name: "hammer", emoji: "🔨", color: "hsl(var(--chart-pastel-5))" },
  { name: "magic wand", emoji: "✨", color: "hsl(var(--chart-pastel-6))" }
];

interface StickFightAnimationProps {
  onComplete: () => void;
  reduceMotion?: boolean;
}

export function StickFightAnimation({ onComplete, reduceMotion = false }: StickFightAnimationProps) {
  const [leftWeapon, setLeftWeapon] = useState<Weapon>(weapons[0]);
  const [rightWeapon, setRightWeapon] = useState<Weapon>(weapons[1]);
  const [showSparks, setShowSparks] = useState(false);
  const [fightPhase, setFightPhase] = useState<'entering' | 'fighting' | 'dissolving'>('entering');

  useEffect(() => {
    // Randomize weapons on mount
    const randomLeft = weapons[Math.floor(Math.random() * weapons.length)];
    let randomRight = weapons[Math.floor(Math.random() * weapons.length)];
    while (randomRight === randomLeft) {
      randomRight = weapons[Math.floor(Math.random() * weapons.length)];
    }
    setLeftWeapon(randomLeft);
    setRightWeapon(randomRight);

    if (reduceMotion) {
      // Skip animation for reduced motion preference
      setTimeout(onComplete, 500);
      return;
    }

    // Animation sequence
    const timeline = [
      { phase: 'entering', delay: 0 },
      { phase: 'fighting', delay: 1000 },
      { phase: 'dissolving', delay: 3000 }
    ];

    timeline.forEach(({ phase, delay }) => {
      setTimeout(() => {
        setFightPhase(phase as any);
        if (phase === 'fighting') {
          setShowSparks(true);
        }
        if (phase === 'dissolving') {
          setTimeout(onComplete, 800);
        }
      }, delay);
    });

    // Spark effects during fighting
    const sparkInterval = setInterval(() => {
      if (fightPhase === 'fighting') {
        setShowSparks(false);
        setTimeout(() => setShowSparks(true), 100);
      }
    }, 600);

    return () => clearInterval(sparkInterval);
  }, [onComplete, reduceMotion]);

  if (reduceMotion) {
    return (
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="text-6xl">🤝</div>
      </motion.div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Left Fighter */}
      <motion.div
        className="relative z-10"
        initial={{ x: -200, opacity: 0 }}
        animate={{
          x: fightPhase === 'entering' ? -80 : fightPhase === 'fighting' ? [-80, -60, -80] : -80,
          opacity: fightPhase === 'dissolving' ? 0 : 1,
          rotate: fightPhase === 'fighting' ? [0, -10, 10, 0] : 0
        }}
        transition={{
          duration: fightPhase === 'fighting' ? 0.4 : 0.8,
          repeat: fightPhase === 'fighting' ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        {/* Stick Figure Left */}
        <svg width="60" height="80" viewBox="0 0 60 80" className="text-primary">
          {/* Head */}
          <circle cx="30" cy="15" r="8" fill="currentColor" />
          {/* Body */}
          <line x1="30" y1="23" x2="30" y2="50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          {/* Arms */}
          <line x1="30" y1="35" x2="45" y2="25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <line x1="30" y1="35" x2="15" y2="45" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          {/* Legs */}
          <line x1="30" y1="50" x2="20" y2="70" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <line x1="30" y1="50" x2="40" y2="70" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        
        {/* Weapon */}
        <motion.div
          className="absolute -top-2 -right-4 text-2xl"
          animate={fightPhase === 'fighting' ? { 
            rotate: [0, 45, -45, 0],
            scale: [1, 1.2, 1] 
          } : {}}
          transition={{ duration: 0.4, repeat: fightPhase === 'fighting' ? Infinity : 0 }}
          style={{ color: leftWeapon.color }}
        >
          {leftWeapon.emoji}
        </motion.div>
      </motion.div>

      {/* Right Fighter */}
      <motion.div
        className="relative z-10"
        initial={{ x: 200, opacity: 0 }}
        animate={{
          x: fightPhase === 'entering' ? 80 : fightPhase === 'fighting' ? [80, 60, 80] : 80,
          opacity: fightPhase === 'dissolving' ? 0 : 1,
          rotate: fightPhase === 'fighting' ? [0, 10, -10, 0] : 0
        }}
        transition={{
          duration: fightPhase === 'fighting' ? 0.4 : 0.8,
          repeat: fightPhase === 'fighting' ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        {/* Stick Figure Right */}
        <svg width="60" height="80" viewBox="0 0 60 80" className="text-accent">
          {/* Head */}
          <circle cx="30" cy="15" r="8" fill="currentColor" />
          {/* Body */}
          <line x1="30" y1="23" x2="30" y2="50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          {/* Arms */}
          <line x1="30" y1="35" x2="15" y2="25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <line x1="30" y1="35" x2="45" y2="45" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          {/* Legs */}
          <line x1="30" y1="50" x2="20" y2="70" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <line x1="30" y1="50" x2="40" y2="70" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>

        {/* Weapon */}
        <motion.div
          className="absolute -top-2 -left-4 text-2xl"
          animate={fightPhase === 'fighting' ? { 
            rotate: [0, -45, 45, 0],
            scale: [1, 1.2, 1] 
          } : {}}
          transition={{ duration: 0.4, repeat: fightPhase === 'fighting' ? Infinity : 0 }}
          style={{ color: rightWeapon.color }}
        >
          {rightWeapon.emoji}
        </motion.div>
      </motion.div>

      {/* Spark Effects */}
      <AnimatePresence>
        {showSparks && fightPhase === 'fighting' && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-yellow-400 text-sm"
                initial={{ 
                  x: Math.random() * 40 - 20,
                  y: Math.random() * 40 - 20,
                  opacity: 1,
                  scale: 0
                }}
                animate={{ 
                  x: (Math.random() - 0.5) * 100,
                  y: (Math.random() - 0.5) * 100,
                  opacity: 0,
                  scale: 1
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                  left: '50%',
                  top: '50%'
                }}
              >
                ✨
              </motion.div>
            ))}
            
            {/* Swoosh lines */}
            <motion.div
              className="absolute left-1/2 top-1/2 w-20 h-1 bg-gradient-to-r from-primary to-transparent rounded-full"
              initial={{ scaleX: 0, rotate: 45 }}
              animate={{ scaleX: 1, rotate: 45 }}
              exit={{ scaleX: 0 }}
              transition={{ duration: 0.3 }}
            />
            <motion.div
              className="absolute left-1/2 top-1/2 w-20 h-1 bg-gradient-to-l from-accent to-transparent rounded-full"
              initial={{ scaleX: 0, rotate: -45 }}
              animate={{ scaleX: 1, rotate: -45 }}
              exit={{ scaleX: 0 }}
              transition={{ duration: 0.3 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Dissolve particles effect */}
      <AnimatePresence>
        {fightPhase === 'dissolving' && (
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-primary rounded-full"
                initial={{
                  x: Math.random() * 200 - 100,
                  y: Math.random() * 100 - 50,
                  opacity: 1
                }}
                animate={{
                  x: (Math.random() - 0.5) * 400,
                  y: (Math.random() - 0.5) * 400,
                  opacity: 0
                }}
                transition={{ duration: 0.8 }}
                style={{
                  left: '50%',
                  top: '50%'
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}