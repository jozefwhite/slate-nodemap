'use client';

import { useEffect, useRef } from 'react';

/**
 * Subtle animated dot vortex background.
 * Dots arranged in concentric rings spiral slowly inward
 * toward a vanishing point, creating a portal/tunnel feel.
 */
export default function DotVortex() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;

    // Dot definition
    interface Dot {
      ring: number;      // which concentric ring (0 = center)
      angle: number;     // position on the ring (radians)
      baseRadius: number; // ring radius
      speed: number;      // rotation speed
      size: number;       // dot size
      opacity: number;    // dot opacity
    }

    const dots: Dot[] = [];
    const RING_COUNT = 14;
    const DOTS_PER_RING = 24;

    function initDots() {
      dots.length = 0;
      const maxRadius = Math.max(w, h) * 0.7;

      for (let r = 0; r < RING_COUNT; r++) {
        const ringFraction = (r + 1) / RING_COUNT;
        const baseRadius = ringFraction * maxRadius;
        // Outer rings rotate slower, inner rings faster
        const speed = (0.0003 + (1 - ringFraction) * 0.001) * (r % 2 === 0 ? 1 : -1);
        // Outer dots are larger and more visible
        const size = 0.6 + ringFraction * 1.0;
        const opacity = 0.06 + ringFraction * 0.1;

        for (let d = 0; d < DOTS_PER_RING; d++) {
          const angle = (d / DOTS_PER_RING) * Math.PI * 2;
          dots.push({ ring: r, angle, baseRadius, speed, size, opacity });
        }
      }
    }

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initDots();
    }

    function draw(time: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      // Vanishing point — matches perspective origin (50%, 25%)
      const cx = w * 0.5;
      const cy = h * 0.25;

      for (const dot of dots) {
        // Slowly rotate each dot around the vortex center
        const currentAngle = dot.angle + time * dot.speed;

        // Pulse the radius very subtly for organic feel
        const pulse = 1 + Math.sin(time * 0.0005 + dot.ring * 0.5) * 0.03;
        const radius = dot.baseRadius * pulse;

        const x = cx + Math.cos(currentAngle) * radius;
        const y = cy + Math.sin(currentAngle) * radius * 0.6; // Flatten vertically for perspective

        // Skip dots outside viewport
        if (x < -10 || x > w + 10 || y < -10 || y > h + 10) continue;

        ctx.beginPath();
        ctx.arc(x, y, dot.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(12, 10, 9, ${dot.opacity})`; // ink-0 color
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    resize();
    animRef.current = requestAnimationFrame(draw);

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
