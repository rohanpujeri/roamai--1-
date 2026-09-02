import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  Zap,
  CheckCircle2,
  Calendar,
  Users,
  Compass
} from 'lucide-react';

import { ThemeConfig, Trip } from '../types';
import { ThemeHeroBackdrop } from './ThemeHeroBackdrop';
import heroCardImage from '../assets/images/regenerated_image_1787112827232.png';

interface LandingPageProps {
  currentTheme?: ThemeConfig;
  recentTrip?: Trip | null;
  onOpenTrip?: (tripId: string) => void;
  onStartPlanning: (destinationId?: string) => void;
  onOpenThemeModal?: () => void;
  onOpenMapSearch?: () => void;
  onNavigateToWhyRoamAI?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  currentTheme,
  recentTrip,
  onOpenTrip,
  onStartPlanning,
  onOpenThemeModal,
  onOpenMapSearch,
  onNavigateToWhyRoamAI
}) => {
  const isDark = currentTheme?.isDark ?? false;
  const isBeachTheme = currentTheme?.id === 'beach';
  const primaryColor = currentTheme?.primaryColor || 'var(--color-primary)';
  const secondaryColor = currentTheme?.secondaryColor || 'var(--color-secondary)';
  const heroGradient = currentTheme?.heroGradient || 'var(--gradient-hero)';
  const heroBannerBg = currentTheme?.heroBannerBg || 'var(--hero-banner-bg)';
  const heroAtmosphereGlow = currentTheme?.heroAtmosphereGlow || 'var(--hero-atmosphere-glow)';
  const vibeTextGradient = currentTheme?.vibeTextGradient || 'var(--vibe-text-gradient)';
  const heroBadgeBg = currentTheme?.heroBadgeBg || 'var(--hero-badge-bg)';
  const heroBadgeBorder = currentTheme?.heroBadgeBorder || 'var(--hero-badge-border)';
  const heroBadgeText = currentTheme?.heroBadgeText || 'var(--hero-badge-text)';

  const preview = currentTheme?.previewTrip || {
    title: 'Personalized AI Journey',
    image: heroCardImage,
    subtitle: 'Tailored Itinerary • Real Coordinates • Live Weather',
    budget: 'Smart Calibrated Budget',
    temp: '26°C ☀️',
    day1Title: 'Day 1 • Arrival & Highlights',
    activity1: { time: '10:00 AM', title: 'Local Heritage Immersion', category: 'Culture', cost: '₹500' },
    activity2: { time: '05:30 PM', title: 'Golden Hour Sunset Vista', category: 'Relaxation', cost: '₹300' }
  };

  const displayTrip = recentTrip;
  const hasUserRecentTrip = Boolean(recentTrip);
  const isUserTrip = hasUserRecentTrip;

  return (
    <div className="transition-colors duration-300 relative bg-transparent">
      {/* Hero Section */}
      <section 
        className="relative overflow-hidden pt-6 pb-10 lg:pt-10 lg:pb-12 transition-colors duration-300 z-10 bg-transparent"
      >
        {/* Dynamic atmospheric ambient glow behind the headline */}
        <div 
          className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] blur-3xl pointer-events-none rounded-full transition-all duration-500 opacity-40"
          style={{ background: heroAtmosphereGlow }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Copy & Actions */}
            <div className="lg:col-span-7 text-left space-y-6">
              <h1 
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12] transition-colors duration-300"
                style={{ 
                  color: isDark ? '#f8fafc' : '#0f172a',
                  textShadow: isDark 
                    ? '0 2px 12px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9)' 
                    : '0 1px 10px rgba(255,255,255,0.95), 0 1px 3px rgba(255,255,255,0.9)'
                }}
              >
                <span>Your trip.</span> <br />
                <span 
                  className="bg-clip-text text-transparent font-black transition-all duration-300 inline-block"
                  style={{
                    backgroundImage: vibeTextGradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  Your vibe.
                </span> <br />
                <span>Your itinerary.</span>
              </h1>

              <p 
                className="text-lg sm:text-xl max-w-xl leading-relaxed font-semibold transition-colors duration-300"
                style={{ 
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  textShadow: isDark 
                    ? '0 2px 10px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.8)' 
                    : '0 1px 8px rgba(255,255,255,0.9), 0 1px 2px rgba(255,255,255,0.8)'
                }}
              >
                {currentTheme?.tagline || 'Travel that adapts dynamically.'}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <button
                  id="hero-plan-btn"
                  onClick={() => onStartPlanning()}
                  className="px-7 py-3.5 rounded-2xl font-semibold text-base shadow-lg transition-all flex items-center justify-center gap-2.5 active:scale-98 group cursor-pointer hover:brightness-105"
                  style={{
                    backgroundColor: primaryColor,
                    color: '#ffffff',
                    boxShadow: `0 10px 25px -5px ${primaryColor}40`
                  }}
                >
                  <span className="font-semibold">Plan My Trip</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              {/* Real-time Adaptation Highlight Micro-badge */}
              <div 
                className="flex flex-wrap items-center gap-3 pt-4 border-t text-xs"
                style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.4)' }}
              >
                <div 
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl backdrop-blur-xl border shadow-xs"
                  style={{
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.45)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.5)',
                    color: isDark ? '#f8fafc' : '#0f172a'
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                  <span className="font-bold">Dynamic Real-Time Re-routing</span>
                </div>

                <div 
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl backdrop-blur-xl border shadow-xs"
                  style={{
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.45)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.5)',
                    color: isDark ? '#f8fafc' : '#0f172a'
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                  <span className="font-bold">Budget & Route Optimizer</span>
                </div>

                <div 
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl backdrop-blur-xl border shadow-xs"
                  style={{
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.45)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.5)',
                    color: isDark ? '#f8fafc' : '#0f172a'
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                  <span className="font-bold">Weather-Adaptive</span>
                </div>
              </div>
            </div>

            {/* Right Column: User's Recently Planned or Demo Itinerary Card */}
            <div className="lg:col-span-5 relative">
              <motion.div
                key={currentTheme?.id || 'beach'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="rounded-3xl p-5 shadow-2xl relative z-10 text-left transition-colors duration-300 bg-white/35 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/15"
              >
                {/* Destination Hero Header */}
                <div className="relative rounded-2xl overflow-hidden mb-4 h-52 group">
                  <img
                    src={displayTrip?.heroImage || heroCardImage || preview.image}
                    alt={displayTrip?.destination || preview.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter contrast-[1.08] saturate-[1.16]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span 
                      className="px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md shadow-xs flex items-center gap-1.5"
                      style={{
                        backgroundColor: hasUserRecentTrip ? primaryColor : 'rgba(15, 23, 42, 0.85)',
                        color: '#ffffff',
                        border: hasUserRecentTrip ? 'none' : '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                    >
                      {hasUserRecentTrip ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                          <span>Recently Planned Itinerary</span>
                        </>
                      ) : (
                        <>
                          <Compass className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                          <span>Curated Demo Itinerary</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-300 font-medium truncate mb-0.5">
                          {displayTrip?.title || preview.title}
                        </p>
                        <h3 className="text-2xl sm:text-3xl font-black tracking-tight truncate">
                          {displayTrip?.destination || 'Goa, India'}
                        </h3>
                      </div>
                      <span className="shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/10 text-white">
                        {displayTrip?.days?.[0]?.weatherForecast ? `${displayTrip.days[0].weatherForecast.temp} ${displayTrip.days[0].weatherForecast.icon}` : preview.temp}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Trip Metric Badges */}
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  <div 
                    className="p-3 rounded-2xl border flex flex-col items-center text-center transition-colors bg-white/40 dark:bg-black/30 backdrop-blur-md border-white/40 dark:border-white/10"
                  >
                    <div className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300 font-semibold mb-0.5">
                      <Calendar className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                      <span>Duration</span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {displayTrip?.durationDays || 4} Days
                    </p>
                  </div>

                  <div 
                    className="p-3 rounded-2xl border flex flex-col items-center text-center transition-colors bg-white/40 dark:bg-black/30 backdrop-blur-md border-white/40 dark:border-white/10"
                  >
                    <div className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300 font-semibold mb-0.5">
                      <Users className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                      <span>Travelers</span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-full">
                      {displayTrip?.companionType || 'Friends'} ({displayTrip?.travellersCount || 3})
                    </p>
                  </div>

                  <div 
                    className="p-3 rounded-2xl border flex flex-col items-center text-center transition-colors bg-white/40 dark:bg-black/30 backdrop-blur-md border-white/40 dark:border-white/10"
                  >
                    <div className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300 font-semibold mb-0.5">
                      <Zap className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                      <span>Budget</span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {displayTrip?.currency || '₹'}{displayTrip?.targetBudget?.toLocaleString() || '30,000'}
                    </p>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={() => {
                    if (hasUserRecentTrip && displayTrip?.id && onOpenTrip) {
                      onOpenTrip(displayTrip.id);
                    } else {
                      onStartPlanning();
                    }
                  }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 text-white cursor-pointer shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.99]"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>
                    {hasUserRecentTrip && displayTrip?.destination 
                      ? `Open ${displayTrip.destination.split(',')[0]} Itinerary` 
                      : 'Create Your Itinerary'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
