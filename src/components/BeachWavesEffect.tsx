import React, { useEffect, useRef } from 'react';

interface BeachWavesEffectProps {
  className?: string;
  height?: number | string;
  showFoam?: boolean;
  showSparkles?: boolean;
}

interface FoamParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
  layer: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export const BeachWavesEffect: React.FC<BeachWavesEffectProps> = ({
  className = '',
  height = '180px',
  showFoam = true,
  showSparkles = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let heightPx = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Particle arrays
    const foamParticles: FoamParticle[] = [];
    const ripples: Ripple[] = [];
    let time = 0;

    const resize = () => {
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      width = rect.width;
      heightPx = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(heightPx * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${heightPx}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    // Mouse interaction for gentle ripples
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= 0 && x <= width && y >= 0 && y <= heightPx && Math.random() < 0.25) {
        if (ripples.length < 15) {
          ripples.push({
            x,
            y,
            radius: 4,
            maxRadius: 35 + Math.random() * 25,
            alpha: 0.6
          });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Multi-octave Trochoidal / Gerstner Wave Calculator
    // Computes realistic sharp-crested, broad-troughed wave displacement
    const getTrochoidalWaveY = (
      x: number,
      baseY: number,
      amplitude: number,
      wavelength: number,
      speed: number,
      t: number,
      steepness = 0.5
    ) => {
      const k = (Math.PI * 2) / wavelength;
      const phase = k * x - t * speed;
      // Gerstner height component + secondary harmonic for organic swell texture
      const harmonic1 = Math.cos(phase);
      const harmonic2 = Math.cos(phase * 2.1 + 0.4) * 0.35;
      const harmonic3 = Math.sin(phase * 0.45 - t * 0.3) * 0.25;

      const yOffset = (harmonic1 + harmonic2 + harmonic3) * amplitude;
      return baseY + yOffset;
    };

    // Main 60fps render loop
    const render = () => {
      time += 0.016; // ~60fps time step
      ctx.clearRect(0, 0, width, heightPx);

      // 1. Render interactive surface ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 0.8;
        r.alpha *= 0.96;

        if (r.alpha < 0.02 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${r.alpha * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // 2. LAYER 1: Deep Ocean Swell (Back Wave - Navy to Deep Sapphire)
      {
        const baseY = heightPx * 0.38;
        const amp = 14;
        const wl = 320;
        const sp = 1.1;

        ctx.beginPath();
        ctx.moveTo(0, heightPx);
        ctx.lineTo(0, getTrochoidalWaveY(0, baseY, amp, wl, sp, time));

        const step = 6;
        for (let x = step; x <= width + step; x += step) {
          const y = getTrochoidalWaveY(x, baseY, amp, wl, sp, time);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, heightPx);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, baseY - amp, 0, heightPx);
        grad.addColorStop(0, 'rgba(2, 132, 199, 0.35)'); // Cerulean
        grad.addColorStop(0.5, 'rgba(3, 105, 161, 0.55)'); // Ocean blue
        grad.addColorStop(1, 'rgba(12, 74, 110, 0.80)'); // Deep navy
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // 3. LAYER 2: Mid Tropical Swell (Aquamarine / Turquoise swell with translucent body)
      {
        const baseY = heightPx * 0.52;
        const amp = 16;
        const wl = 260;
        const sp = 1.45;

        ctx.beginPath();
        ctx.moveTo(0, heightPx);
        ctx.lineTo(0, getTrochoidalWaveY(0, baseY, amp, wl, sp, time + 2.5));

        const step = 5;
        for (let x = step; x <= width + step; x += step) {
          const y = getTrochoidalWaveY(x, baseY, amp, wl, sp, time + 2.5);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, heightPx);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, baseY - amp, 0, heightPx);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.45)'); // Sky blue
        grad.addColorStop(0.4, 'rgba(6, 182, 212, 0.55)'); // Turquoise
        grad.addColorStop(1, 'rgba(2, 132, 199, 0.75)'); // Azure
        ctx.fillStyle = grad;
        ctx.fill();

        // Subtle crest line on mid wave
        ctx.beginPath();
        for (let x = 0; x <= width; x += step) {
          const y = getTrochoidalWaveY(x, baseY, amp, wl, sp, time + 2.5);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 4. LAYER 3: Foreground Shoreline Breaker Wave with Dynamic Seafoam Crest & Swash
      {
        // Add periodic surging tide effect (swash and backwash cycle)
        const surgeTide = Math.sin(time * 0.7) * 8;
        const baseY = heightPx * 0.65 + surgeTide;
        const amp = 18;
        const wl = 220;
        const sp = 1.9;

        const wavePoints: { x: number; y: number }[] = [];
        ctx.beginPath();
        ctx.moveTo(0, heightPx);

        const step = 4;
        for (let x = 0; x <= width + step; x += step) {
          // Complex shoreline wave with localized rolling crests
          const mainY = getTrochoidalWaveY(x, baseY, amp, wl, sp, time + 1.2);
          const microChop = Math.sin(x * 0.08 - time * 3.2) * 2.5;
          const y = mainY + microChop;
          wavePoints.push({ x, y });

          if (x === 0) {
            ctx.lineTo(0, y);
          } else {
            ctx.lineTo(x, y);
          }

          // Spawn foam particles on steep peaks/crests of front wave
          if (showFoam && Math.random() < 0.22) {
            const isPeak = Math.cos((Math.PI * 2 * x) / wl - (time + 1.2) * sp) > 0.45;
            if (isPeak && foamParticles.length < 180) {
              foamParticles.push({
                x: x + (Math.random() - 0.5) * 12,
                y: y + Math.random() * 8 - 2,
                vx: (Math.random() - 0.5) * 0.6 + 0.4,
                vy: Math.random() * 0.8 - 0.1,
                radius: Math.random() * 2.5 + 1.2,
                alpha: Math.random() * 0.6 + 0.35,
                decay: Math.random() * 0.015 + 0.008,
                layer: 3
              });
            }
          }
        }

        ctx.lineTo(width, heightPx);
        ctx.closePath();

        // Crystal clear azure to seafoam gradient
        const grad = ctx.createLinearGradient(0, baseY - amp, 0, heightPx);
        grad.addColorStop(0, 'rgba(186, 230, 253, 0.70)'); // Bright crystal water
        grad.addColorStop(0.2, 'rgba(56, 189, 248, 0.60)'); // Aquamarine
        grad.addColorStop(0.7, 'rgba(2, 132, 199, 0.75)'); // Deep aqua
        grad.addColorStop(1, 'rgba(7, 89, 133, 0.90)'); // Base depth
        ctx.fillStyle = grad;
        ctx.fill();

        // Dynamic multi-stroke frothy crest line (whitecaps & seafoam lattice)
        if (showFoam) {
          // Layer 1: Soft glowing foam aura
          ctx.beginPath();
          wavePoints.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Layer 2: Crisp brilliant white breaking crest with foam texture dashes
          ctx.beginPath();
          wavePoints.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.lineWidth = 2.2;
          ctx.setLineDash([14, 3, 24, 4, 8, 3]);
          ctx.stroke();
          ctx.setLineDash([]); // Reset dash
        }
      }

      // 5. RENDER DYNAMIC FOAM & BUBBLE PARTICLES (Shoreline froth & seafoam clusters)
      if (showFoam && foamParticles.length > 0) {
        for (let i = foamParticles.length - 1; i >= 0; i--) {
          const p = foamParticles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;
          p.radius += 0.02; // Slowly expand like real bubbles

          if (p.alpha <= 0.01 || p.y > heightPx + 10 || p.x > width + 20) {
            foamParticles.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.fill();

          // Outer delicate bubble rim
          if (p.radius > 1.8) {
            ctx.strokeStyle = `rgba(224, 242, 254, ${p.alpha * 0.7})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // 6. SUNLIGHT WATER CAUSTICS & SPECULAR GLINTS (Sun sparkling on water surface)
      if (showSparkles) {
        const glintCount = 10;
        for (let i = 0; i < glintCount; i++) {
          const seed = i * 137.5;
          const glintX = (Math.sin(time * 0.4 + seed) * 0.45 + 0.5) * width;
          const glintY = (Math.cos(time * 0.6 + seed * 1.5) * 0.25 + 0.62) * heightPx;
          const intensity = Math.max(0, Math.sin(time * 2.2 + seed * 2.0));

          if (intensity > 0.35) {
            const glow = (intensity - 0.35) * 1.5;
            ctx.save();
            ctx.beginPath();
            ctx.arc(glintX, glintY, 1.8 * glow, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${glow * 0.9})`;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 6 * glow;
            ctx.fill();

            // Diamond star sparkle cross
            if (glow > 0.7) {
              ctx.strokeStyle = `rgba(255, 255, 255, ${glow * 0.8})`;
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(glintX - 4 * glow, glintY);
              ctx.lineTo(glintX + 4 * glow, glintY);
              ctx.moveTo(glintX, glintY - 4 * glow);
              ctx.lineTo(glintX, glintY + 4 * glow);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showFoam, showSparkles]);

  return (
    <div
      ref={containerRef}
      className={`absolute bottom-0 left-0 right-0 w-full overflow-hidden pointer-events-none select-none z-10 ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
};
