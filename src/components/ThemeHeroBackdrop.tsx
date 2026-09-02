import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeConfig } from '../types';
import { MapPin, Sparkles, Compass, Eye, Image as ImageIcon } from 'lucide-react';
import { SnowfallEffect } from './SnowfallAtmosphere';
import { BeachWavesEffect } from './BeachWavesEffect';

interface ThemeHeroBackdropProps {
  currentTheme?: ThemeConfig;
  isDark?: boolean;
}

interface ColorGradePreset {
  filter: string;
  sunFlare: string;
  shadowTint: string;
  highlightTint: string;
}

const COLOR_GRADE_PRESETS: Record<string, ColorGradePreset> = {
  beach: {
    // Vibrant tropical grading: warm golden highlights, vivid turquoise oceans, deep palm greens
    filter: 'brightness(1.03) contrast(1.14) saturate(1.28) hue-rotate(-2deg)',
    sunFlare: 'radial-gradient(circle at 85% 15%, rgba(254, 240, 138, 0.35) 0%, rgba(245, 158, 11, 0.15) 30%, transparent 60%)',
    shadowTint: 'linear-gradient(to top right, rgba(13, 148, 136, 0.14) 0%, transparent 55%)',
    highlightTint: 'radial-gradient(ellipse at 60% 30%, rgba(2, 132, 199, 0.18) 0%, rgba(13, 148, 136, 0.10) 50%, transparent 80%)'
  },
  snow: {
    // Cinematic alpine snow mountain grading: deep sapphire sky, crisp diamond peaks, rich shadow depth
    filter: 'brightness(0.98) contrast(1.12) saturate(1.18)',
    sunFlare: 'radial-gradient(circle at 80% 12%, rgba(224, 242, 254, 0.35) 0%, rgba(56, 189, 248, 0.15) 35%, transparent 65%)',
    shadowTint: 'linear-gradient(to top right, rgba(15, 23, 42, 0.30) 0%, transparent 60%)',
    highlightTint: 'radial-gradient(ellipse at 65% 20%, rgba(14, 165, 233, 0.20) 0%, transparent 70%)'
  },
  mountain: {
    // 100% Lush Green Mountain in Ultra HD: crystal-clear clarity, vibrant green pine forest, crisp sky
    filter: 'contrast(1.05) brightness(1.02) saturate(1.15)',
    sunFlare: 'radial-gradient(circle at 75% 15%, rgba(254, 240, 138, 0.15) 0%, transparent 50%)',
    shadowTint: 'transparent',
    highlightTint: 'transparent'
  },
  waterfall: {
    // Lush emerald rainforest grading: deep jungle canopy greens, iridescent spray
    filter: 'brightness(1.02) contrast(1.14) saturate(1.32) hue-rotate(2deg)',
    sunFlare: 'radial-gradient(circle at 80% 20%, rgba(204, 251, 241, 0.45) 0%, rgba(20, 184, 166, 0.22) 35%, transparent 68%)',
    shadowTint: 'linear-gradient(to top right, rgba(6, 78, 59, 0.25) 0%, transparent 60%)',
    highlightTint: 'radial-gradient(ellipse at 60% 35%, rgba(13, 148, 136, 0.30) 0%, rgba(16, 185, 129, 0.18) 55%, transparent 80%)'
  },
  trekking: {
    // Warm wilderness grading: golden hour forest beams, rich terracotta trail tones
    filter: 'brightness(1.03) contrast(1.12) saturate(1.26) hue-rotate(-4deg)',
    sunFlare: 'radial-gradient(circle at 82% 18%, rgba(254, 240, 138, 0.42) 0%, rgba(217, 119, 6, 0.22) 32%, transparent 65%)',
    shadowTint: 'linear-gradient(to top right, rgba(120, 53, 15, 0.22) 0%, transparent 60%)',
    highlightTint: 'radial-gradient(ellipse at 60% 35%, rgba(245, 158, 11, 0.26) 0%, rgba(132, 204, 22, 0.18) 50%, transparent 80%)'
  }
};

export const ThemeHeroBackdrop: React.FC<ThemeHeroBackdropProps> = ({
  currentTheme,
  isDark = false
}) => {
  const themeId = currentTheme?.id || 'waterfall';
  const photoUrl = currentTheme?.heroPhotoUrl || 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=90&w=2560&auto=format&fit=crop';
  const photoPosition = currentTheme?.heroPhotoPosition || 'center 35%';
  const primaryColor = currentTheme?.primaryColor || '#06b6d4';
  const secondaryColor = currentTheme?.secondaryColor || '#059669';

  const grade = COLOR_GRADE_PRESETS[themeId] || COLOR_GRADE_PRESETS.beach;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 select-none" aria-hidden="true">
      {/* 1. Theme Scenic Landscape Photographic Background Layer with Smooth Transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={themeId + photoUrl}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Ultra High Quality Landscape Photo with Tailored Color Grading Filters */}
          <img
            src={photoUrl}
            alt={currentTheme?.name || 'Theme Scenic Scenery'}
            referrerPolicy="no-referrer"
            decoding="async"
            loading="eager"
            style={{
              objectPosition: photoPosition,
              filter: grade.filter,
              imageRendering: 'auto'
            }}
            className="w-full h-full object-cover transition-all duration-700 select-none"
          />

          {/* Cinematic Optical Sun Flare / Key Light Accent */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-screen opacity-70 transition-all duration-700"
            style={{ background: grade.sunFlare }}
          />

          {/* Soft Natural Atmospheric Light Tint */}
          <div 
            className="absolute inset-0 mix-blend-soft-light opacity-25 pointer-events-none transition-all duration-700"
            style={{ background: grade.highlightTint }}
          />

          {/* Transparent Vignette & Subtle Legibility Tint across full page */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.35) 0%, rgba(15, 23, 42, 0.15) 40%, rgba(15, 23, 42, 0.35) 100%)'
                : 'linear-gradient(180deg, rgba(255, 255, 255, 0.20) 0%, rgba(255, 255, 255, 0.05) 40%, rgba(255, 255, 255, 0.20) 100%)'
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* 2. Theme-Specific Particle & Atmospheric Overlays */}
      {themeId === 'beach' && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Beach Sun Sparkles */}
          <div className="absolute top-12 left-[18%] w-2 h-2 rounded-full bg-amber-300/60 blur-[0.5px] animate-pulse" style={{ animationDuration: '3.5s' }} />
          <div className="absolute top-28 right-[24%] w-1.5 h-1.5 rounded-full bg-cyan-300/70 blur-[0.5px] animate-ping" style={{ animationDuration: '5.5s' }} />
          <div className="absolute top-[45%] left-[12%] w-2.5 h-2.5 rounded-full bg-teal-300/40 blur-[1px] animate-pulse" style={{ animationDuration: '4.8s' }} />
          
          {/* Continuous Multi-layered Flowing Ocean Waves */}
          <BeachWavesEffect height="175px" showFoam={true} showSparkles={true} />
        </div>
      )}

      {themeId === 'waterfall' && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Waterfall Mist Droplets */}
          <div className="absolute top-10 left-[22%] w-2 h-2 rounded-full bg-cyan-300/70 blur-[0.5px] animate-pulse" style={{ animationDuration: '2.5s' }} />
          <div className="absolute top-36 left-[35%] w-1.5 h-1.5 rounded-full bg-emerald-300/60 blur-[0.5px] animate-ping" style={{ animationDuration: '4s' }} />
          <div className="absolute top-[50%] left-[8%] w-3 h-3 rounded-full bg-cyan-400/40 blur-[1px] animate-pulse" style={{ animationDuration: '3.2s' }} />
          <div className="absolute top-24 right-[28%] w-2 h-2 rounded-full bg-teal-200/70 blur-[0.5px] animate-ping" style={{ animationDuration: '4.5s' }} />
        </div>
      )}

      {themeId === 'trekking' && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Trekking Forest Canopy Atmosphere & Trail Specks */}
          <div className="absolute top-14 left-[15%] w-2 h-2 rounded-full bg-amber-400/60 blur-[0.5px] animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute top-32 right-[20%] w-1.5 h-1.5 rounded-full bg-emerald-400/70 blur-[0.5px] animate-ping" style={{ animationDuration: '5s' }} />
          <div className="absolute top-[40%] left-[30%] w-2 h-2 rounded-full bg-lime-400/40 blur-[0.5px] animate-pulse" style={{ animationDuration: '4.2s' }} />
        </div>
      )}

      {themeId === 'snow' && (
        <SnowfallEffect density="normal" />
      )}
    </div>
  );
};

