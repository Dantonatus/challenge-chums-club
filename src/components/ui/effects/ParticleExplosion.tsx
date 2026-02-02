import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ParticleExplosionProps {
  isActive: boolean;
  onThemeSwitch: () => void;
  onComplete: () => void;
  isDark: boolean;
  buttonPosition?: { x: number; y: number };
}

const DURATION = 1500;
const THEME_SWITCH_DELAY = 700;
const PARTICLE_COUNT = 400;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  type: 'circle' | 'star' | 'line';
  rotation: number;
  rotationSpeed: number;
  color: string;
  maxLife: number;
  trail: { x: number; y: number }[];
}

function createParticles(centerX: number, centerY: number, isDark: boolean): Particle[] {
  const colors = isDark 
    ? ['#FFD700', '#FFA500', '#FF69B4', '#FF6B6B', '#FFEAA7']
    : ['#9B59B6', '#3498DB', '#00CED1', '#1ABC9C', '#00FF88'];

  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 5 + Math.random() * 15;
    const type = Math.random() < 0.6 ? 'circle' : Math.random() < 0.5 ? 'star' : 'line';

    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: type === 'circle' ? 2 + Math.random() * 6 : 5 + Math.random() * 10,
      type,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      maxLife: 0.7 + Math.random() * 0.3,
      trail: [],
    });
  }
  return particles;
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerRadius;
    let y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }

  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

export function ParticleExplosion({ isActive, onThemeSwitch, onComplete, isDark, buttonPosition }: ParticleExplosionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const themeSwitchedRef = useRef(false);
  const completedRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  
  // Store callbacks in ref to avoid stale closures
  const callbacksRef = useRef({ onThemeSwitch, onComplete });
  useEffect(() => {
    callbacksRef.current = { onThemeSwitch, onComplete };
  }, [onThemeSwitch, onComplete]);

  useEffect(() => {
    if (!isActive) {
      themeSwitchedRef.current = false;
      completedRef.current = false;
      particlesRef.current = [];
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

    particlesRef.current = createParticles(centerX, centerY, isDark);
    startTimeRef.current = performance.now();
    themeSwitchedRef.current = false;
    completedRef.current = false;

    const animate = (currentTime: number) => {
      if (!isActive || completedRef.current) return;
      
      const elapsed = currentTime - startTimeRef.current;
      const progress = elapsed / DURATION;

      if (!themeSwitchedRef.current && elapsed >= THEME_SWITCH_DELAY) {
        themeSwitchedRef.current = true;
        callbacksRef.current.onThemeSwitch();
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Apply physics
        particle.vy += -0.1;
        particle.vx *= 0.98;
        particle.vy *= 0.98;

        // Update rotation
        particle.rotation += particle.rotationSpeed;

        // Calculate life
        const life = Math.max(0, 1 - progress / particle.maxLife);

        // Update trail
        particle.trail.push({ x: particle.x, y: particle.y });
        if (particle.trail.length > 5) {
          particle.trail.shift();
        }

        if (life <= 0) return;

        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation * Math.PI) / 180);
        ctx.globalAlpha = life;

        // Draw trail
        if (particle.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(particle.trail[0].x - particle.x, particle.trail[0].y - particle.y);
          particle.trail.forEach((point) => {
            ctx.lineTo(point.x - particle.x, point.y - particle.y);
          });
          ctx.strokeStyle = particle.color;
          ctx.lineWidth = particle.size * 0.3;
          ctx.globalAlpha = life * 0.3;
          ctx.stroke();
          ctx.globalAlpha = life;
        }

        // Draw particle
        ctx.fillStyle = particle.color;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 10;

        if (particle.type === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (particle.type === 'star') {
          drawStar(ctx, 0, 0, 4, particle.size, particle.size * 0.5);
        } else {
          ctx.beginPath();
          ctx.moveTo(-particle.size / 2, 0);
          ctx.lineTo(particle.size / 2, 0);
          ctx.strokeStyle = particle.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.restore();
      });

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
