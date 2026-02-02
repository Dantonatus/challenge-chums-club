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
  life: number;
  maxLife: number;
  trail: { x: number; y: number }[];
}

function createParticle(centerX: number, centerY: number, isDark: boolean): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 5 + Math.random() * 15;
  const type = Math.random() < 0.6 ? 'circle' : Math.random() < 0.5 ? 'star' : 'line';
  
  // Colors based on theme direction
  const colors = isDark 
    ? ['#FFD700', '#FFA500', '#FF69B4', '#FF6B6B', '#FFEAA7'] // Warm colors for dark->light
    : ['#9B59B6', '#3498DB', '#00CED1', '#1ABC9C', '#00FF88']; // Cool colors for light->dark

  return {
    x: centerX,
    y: centerY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: type === 'circle' ? 2 + Math.random() * 6 : 5 + Math.random() * 10,
    type,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 20,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 1,
    maxLife: 0.7 + Math.random() * 0.3,
    trail: [],
  };
}

export function ParticleExplosion({ isActive, onThemeSwitch, onComplete, isDark, buttonPosition }: ParticleExplosionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const themeSwitchedRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!isActive) {
      themeSwitchedRef.current = false;
      particlesRef.current = [];
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const centerX = buttonPosition?.x ?? canvas.width - 100;
    const centerY = buttonPosition?.y ?? 40;

    // Create particles
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => 
      createParticle(centerX, centerY, isDark)
    );

    startTimeRef.current = performance.now();
    themeSwitchedRef.current = false;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = elapsed / DURATION;

      // Trigger theme switch
      if (!themeSwitchedRef.current && elapsed >= THEME_SWITCH_DELAY) {
        themeSwitchedRef.current = true;
        onThemeSwitch();
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Apply physics
        particle.vy += -0.1; // Slight upward drift
        particle.vx *= 0.98; // Friction
        particle.vy *= 0.98;

        // Update rotation
        particle.rotation += particle.rotationSpeed;

        // Update life
        particle.life = Math.max(0, 1 - progress / particle.maxLife);

        // Update trail
        particle.trail.push({ x: particle.x, y: particle.y });
        if (particle.trail.length > 5) {
          particle.trail.shift();
        }

        // Skip if dead
        if (particle.life <= 0) return;

        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation * Math.PI) / 180);
        ctx.globalAlpha = particle.life;

        // Draw trail
        if (particle.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(particle.trail[0].x - particle.x, particle.trail[0].y - particle.y);
          particle.trail.forEach((point, i) => {
            ctx.lineTo(point.x - particle.x, point.y - particle.y);
          });
          ctx.strokeStyle = particle.color;
          ctx.lineWidth = particle.size * 0.3;
          ctx.globalAlpha = particle.life * 0.3;
          ctx.stroke();
          ctx.globalAlpha = particle.life;
        }

        // Draw particle based on type
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
          // Line
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
  }, [isActive, onThemeSwitch, onComplete, isDark, buttonPosition]);

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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

// Helper function to draw a star
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
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
