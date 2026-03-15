'use client';

import { useEffect, useRef } from 'react';

/**
 * Subtle animated dot vortex background.
 * Dots arranged in concentric elliptical rings drift very slowly,
 * creating a barely-perceptible portal/tunnel feel.
 */
export default function DotVortex() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;

    interface Dot {
      ring: number;
      angle: number;
      baseRadius: number;
      speed: number;
      size: number;
      opacity: number;
    }

    const dots: Dot[] = [];
    const RING_COUNT = 18;
    const DOTS_PER_RING = 20;

    function initDots() {
      dots.length = 0;
      const maxRadius = Math.max(w, h) * 0.5;

      for (let r = 0; r < RING_COUNT; r++) {
        const ringFraction = (r + 1) / RING_COUNT;
        const baseRadius = ringFraction * maxRadius;

        // VERY slow rotation — barely perceptible
        const speed = (0.00004 + (1 - ringFraction) * 0.00012) * (r % 2 === 0 ? 1 : -1);

        // Inner dots smaller and more transparent, outer dots slightly bigger
        const size = 0.5 + ringFraction * 0.8;
        const opacity = 0.04 + ringFraction * 0.08;

        for (let d = 0; d < DOTS_PER_RING; d++) {
          const angle = (d / DOTS_PER_RING) * Math.PI * 2;
          dots.push({ ring: r, angle, baseRadius, speed, size, opacity });
        }
      }
    }

    function resize() {
      if (!canvas || !ctx || !container) return;
      const dpr = window.devicePixelRatio || 1;
      w = container.clientWidth;
      h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initDots();
    }

    function draw(time: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      // Center the vortex in the viewport
      const cx = w * 0.5;
      const cy = h * 0.45;

      for (const dot of dots) {
        const currentAngle = dot.angle + time * dot.speed;

        // Very gentle pulse
        const pulse = 1 + Math.sin(time * 0.0002 + dot.ring * 0.4) * 0.02;
        const radius = dot.baseRadius * pulse;

        const x = cx + Math.cos(currentAngle) * radius;
        const y = cy + Math.sin(currentAngle) * radius * 0.55; // Flatten for perspective

        if (x < -10 || x > w + 10 || y < -10 || y > h + 10) continue;

        ctx.beginPath();
        ctx.arc(x, y, dot.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(12, 10, 9, ${dot.opacity})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    // Use ResizeObserver for reliable element-level sizing
    const ro = new ResizeObserver(() => resize());
    ro.observe(container);

    resize();
    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
