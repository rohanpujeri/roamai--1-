import React, { useMemo } from 'react';

interface FlakeData {
  id: number;
  left: number; // 0 - 100%
  size: number; // px
  duration: number; // s
  delay: number; // s (negative for instant start)
  swayDuration: number; // s
  swayDistance: number; // px
  opacity: number;
  blur: number; // px
  type: 'crystal' | 'dot' | 'large' | 'powder';
  rotationSpeed: number; // s
  rotationDirection: number; // 1 or -1
}

interface SnowfallEffectProps {
  density?: 'gentle' | 'normal' | 'blizzard';
  className?: string;
  speedMultiplier?: number;
  fullScreen?: boolean;
}

export const SnowfallEffect: React.FC<SnowfallEffectProps> = ({
  density = 'normal',
  className = '',
  speedMultiplier = 1,
  fullScreen = false,
}) => {
  const flakeCount = useMemo(() => {
    switch (density) {
      case 'gentle':
        return 30;
      case 'blizzard':
        return 75;
      case 'normal':
      default:
        return 50;
    }
  }, [density]);

  // Deterministic yet random-looking flakes to avoid hydration/render re-calculations
  const flakes = useMemo<FlakeData[]>(() => {
    const list: FlakeData[] = [];
    for (let i = 0; i < flakeCount; i++) {
      const seed = (i * 9301 + 49297) % 233280;
      const rnd1 = seed / 233280;
      const rnd2 = ((i * 12345 + 6789) % 233280) / 233280;
      const rnd3 = ((i * 54321 + 9876) % 233280) / 233280;
      const rnd4 = ((i * 24680 + 13579) % 233280) / 233280;

      let type: 'crystal' | 'dot' | 'large' | 'powder' = 'dot';
      let size = 5;
      let blur = 0;
      let opacity = 0.8;
      let duration = 6;

      if (i % 6 === 0) {
        // Crisp snowflake crystal
        type = 'crystal';
        size = 12 + rnd1 * 10; // 12px - 22px
        opacity = 0.85 + rnd2 * 0.15;
        duration = (8 + rnd3 * 6) / speedMultiplier;
        blur = 0;
      } else if (i % 7 === 1) {
        // Large blurry foreground flake
        type = 'large';
        size = 14 + rnd1 * 14; // 14px - 28px
        opacity = 0.4 + rnd2 * 0.3;
        duration = (4 + rnd3 * 3.5) / speedMultiplier; // Falls faster
        blur = 1.8;
      } else if (i % 3 === 0) {
        // Tiny drifting powder
        type = 'powder';
        size = 2 + rnd1 * 3; // 2px - 5px
        opacity = 0.5 + rnd2 * 0.4;
        duration = (9 + rnd3 * 7) / speedMultiplier;
        blur = 0;
      } else {
        // Standard fluffy snow dot
        type = 'dot';
        size = 4 + rnd1 * 6; // 4px - 10px
        opacity = 0.7 + rnd2 * 0.3;
        duration = (6 + rnd3 * 5) / speedMultiplier;
        blur = 0.4;
      }

      list.push({
        id: i,
        left: (i / flakeCount) * 100 + (rnd1 * 8 - 4),
        size,
        duration,
        delay: -(rnd2 * 12), // Start immediately at various points in fall cycle
        swayDuration: 3 + rnd3 * 3.5,
        swayDistance: (i % 2 === 0 ? 1 : -1) * (15 + rnd4 * 30),
        opacity,
        blur,
        type,
        rotationSpeed: 6 + rnd4 * 10,
        rotationDirection: i % 2 === 0 ? 1 : -1,
      });
    }
    return list;
  }, [flakeCount, speedMultiplier]);

  return (
    <div
      className={`pointer-events-none overflow-hidden select-none ${
        fullScreen ? 'fixed inset-0 z-20' : 'absolute inset-0 z-0'
      } ${className}`}
      aria-hidden="true"
    >
      {/* Glacial Frost Ambient Atmosphere Gradient at the top and bottom */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-sky-200/20 dark:from-sky-900/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-sky-100/30 dark:from-slate-900/40 via-sky-50/15 to-transparent pointer-events-none" />

      {/* Floating Snowflakes */}
      {flakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute top-0 will-change-transform"
          style={{
            left: `${Math.max(0, Math.min(100, flake.left))}%`,
            animation: `snowfallFall ${flake.duration}s linear infinite`,
            animationDelay: `${flake.delay}s`,
          }}
        >
          <div
            style={{
              animation: `snowfallSway ${flake.swayDuration}s ease-in-out infinite alternate`,
              transform: `translateX(${flake.swayDistance}px)`,
            }}
          >
            {flake.type === 'crystal' ? (
              <div
                style={{
                  width: `${flake.size}px`,
                  height: `${flake.size}px`,
                  opacity: flake.opacity,
                  filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))',
                  animation: `snowfallSpin ${flake.rotationSpeed}s linear infinite ${
                    flake.rotationDirection < 0 ? 'reverse' : 'normal'
                  }`,
                }}
                className="text-white flex items-center justify-center"
              >
                <SnowflakeSvg size={flake.size} />
              </div>
            ) : (
              <div
                className="rounded-full bg-white"
                style={{
                  width: `${flake.size}px`,
                  height: `${flake.size}px`,
                  opacity: flake.opacity,
                  filter:
                    flake.blur > 0
                      ? `blur(${flake.blur}px) drop-shadow(0 0 3px rgba(255, 255, 255, 0.9))`
                      : 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.85))',
                }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * 6-pointed symmetrical SVG Snowflake Crystal
 */
const SnowflakeSvg: React.FC<{ size: number }> = ({ size }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-sky-100 dark:text-sky-200"
    >
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="3.34" y1="7" x2="20.66" y2="17" />
      <line x1="3.34" y1="17" x2="20.66" y2="7" />
      {/* V-branches */}
      <polyline points="9 4 12 7 15 4" />
      <polyline points="9 20 12 17 15 20" />
      <polyline points="4.5 9.5 7.5 11 9 8" />
      <polyline points="19.5 14.5 16.5 13 15 16" />
      <polyline points="4.5 14.5 7.5 13 9 16" />
      <polyline points="19.5 9.5 16.5 11 15 8" />
    </svg>
  );
};
