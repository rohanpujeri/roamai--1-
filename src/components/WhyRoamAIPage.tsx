import React from 'react';
import { 
  Compass, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Users, 
  Navigation, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Globe2,
  Luggage,
  Palette,
  DollarSign,
  Info,
  Check
} from 'lucide-react';
import { ThemeConfig } from '../types';

interface WhyRoamAIPageProps {
  currentTheme?: ThemeConfig;
  onStartPlanning: () => void;
  onOpenMapSearch: () => void;
}

export const WhyRoamAIPage: React.FC<WhyRoamAIPageProps> = ({
  currentTheme,
  onStartPlanning,
  onOpenMapSearch
}) => {
  const heroGradient = currentTheme?.heroGradient || 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%)';

  const platformFeatures = [
    {
      icon: Sparkles,
      title: 'Context-Aware AI Itinerary Engine',
      description: 'Synthesizes custom multi-day travel itineraries based on your companions, budget tier, preferred pace, and real travel dates.',
      tag: 'AI Intelligence'
    },
    {
      icon: Navigation,
      title: 'Google Maps Place Grounding',
      description: 'Activities are mapped with verified coordinates, realistic transit times, neighborhood clustering, and live GPS links.',
      tag: 'Geographic Precision'
    },
    {
      icon: RefreshCw,
      title: 'Live On-the-Ground Trip Companion',
      description: 'Instantly adapt your daily plan for sudden rain, exhaustion, late starts, or swap activities with curated alternatives.',
      tag: 'Dynamic Adaptation'
    },
    {
      icon: DollarSign,
      title: 'Realistic Category Budget Tracking',
      description: 'Accurate estimates for lodging, dining, transit, and entry tickets tailored to solo travelers, couples, or large groups.',
      tag: 'Budget Transparency'
    },
    {
      icon: Luggage,
      title: 'Weather-Synced Packing Assistant',
      description: 'Interactive checklists automatically calibrated to destination forecast, planned activities, and local cultural norms.',
      tag: 'Readiness'
    },
    {
      icon: Palette,
      title: 'Dynamic Atmospheric Themes',
      description: 'Personalize your workspace with ambient vibes including Tropical Beach, Alpine Snowfall, Forest Canopy, and Midnight Oasis.',
      tag: 'Personalization'
    }
  ];

  const lifecycleStages = [
    {
      stage: '01',
      title: 'Daydreaming & Inspiration',
      subtitle: 'Where curiosity meets tailored AI intelligence',
      description: 'Explore verified hidden gems, seasonal advice, and intelligent itinerary ideas crafted for your travel style and preferred vibe.',
      icon: Sparkles,
      color: 'bg-emerald-500 text-white',
      badge: 'Inspiration Phase',
      features: [
        'Curated hidden gems & landmark discovery',
        'Vibe-based smart theme personalization',
        'Direct map exploration & place previews'
      ]
    },
    {
      stage: '02',
      title: 'Route & Budget Planning',
      subtitle: 'Feasible day-by-day itineraries with exact expenses',
      description: 'AI generates realistic timeframes, verified transit routes, exact ticket prices, and real crowdsourced category expense breakdowns.',
      icon: Navigation,
      color: 'bg-teal-600 text-white',
      badge: 'Planning Phase',
      features: [
        'Geographic route clustering to avoid backtracking',
        'Real-world budget breakdown (Food, Stay, Transit, Entry)',
        'Multi-traveler & group cost splitting options'
      ]
    },
    {
      stage: '03',
      title: 'Pre-Trip Preparation',
      subtitle: 'Zero-surprise checklists tailored to your destination',
      description: 'Dynamic packing lists adjusted for current destination forecasts, local customs, visa requirements, and cultural insights.',
      icon: Luggage,
      color: 'bg-cyan-600 text-white',
      badge: 'Preparation Phase',
      features: [
        'Weather-adaptive packing checklist',
        'Document and emergency contact tracker',
        'Local cultural etiquettes & currency notes'
      ]
    },
    {
      stage: '04',
      title: 'On-the-Ground Trip Companion',
      subtitle: 'Real-time live trip mode with instant adaptations',
      description: 'Weather changed? Running late? Feeling exhausted? Instantly adapt your plan with AI to regenerate relevant indoor spots or relaxed alternatives.',
      icon: RefreshCw,
      color: 'bg-blue-600 text-white',
      badge: 'Live Experience Phase',
      features: [
        'Active Live Trip Mode with step-by-step progress',
        'Rain & fatigue instant AI plan adaptability',
        'Seamless activity swapping with verified alternatives'
      ]
    }
  ];

  const techHighlights = [
    {
      title: 'Gemini AI Intelligence',
      description: 'Generates deep, contextually relevant travel plans with real-time natural language adaptation.'
    },
    {
      title: 'Interactive Google Maps',
      description: 'Full geographic pin mapping, realistic distance calculation, and visual route overviews.'
    },
    {
      title: 'Cross-Device Persistence',
      description: 'Automatic synchronization across sessions with reliable cloud-backed storage.'
    },
    {
      title: '100% Dynamic Synthesis',
      description: 'Every single itinerary is generated uniquely for your exact dates and personal style.'
    }
  ];

  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      
      {/* Top Hero Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl text-left">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide backdrop-blur-md shadow-xs"
              style={{
                backgroundColor: 'var(--color-bg-light)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-brand)'
              }}
            >
              <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '12s' }} />
              <span>About RoamAI Travel Platform</span>
            </div>

            <h1 
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white"
              style={{ color: 'var(--color-tagline-text)' }}
            >
              Smart, Adaptive Travel Made Simple
            </h1>
            
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-2xl">
              RoamAI is an all-in-one AI travel companion designed to eliminate the hours spent juggling travel blogs, spreadsheets, map pins, and unpredictable schedules with live Google Maps grounding and Gemini AI.
            </p>
          </div>

          {/* Quick Action & Stat Pills */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 justify-center">
            <button
              onClick={onStartPlanning}
              className="px-5 py-3 rounded-xl text-sm font-semibold text-white shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              style={{ background: heroGradient }}
            >
              <Sparkles className="w-4 h-4" />
              <span>Create AI Itinerary</span>
            </button>
            <button
              onClick={onOpenMapSearch}
              className="px-5 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4 text-emerald-500" />
              <span>Explore Places & Maps</span>
            </button>
          </div>
        </div>
      </div>

      {/* Platform Core Capabilities & Features Section */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div className="space-y-1 text-left">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <Info className="w-4 h-4" />
              <span>Built for Modern Explorers</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Core Capabilities & What Makes RoamAI Unique
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
              Explore the key intelligent modules powering your personalized travel itineraries.
            </p>
          </div>
        </div>

        {/* Platform Core Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {platformFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div 
                key={idx}
                className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all space-y-2.5 shadow-xs hover:shadow-md text-left"
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs"
                    style={{
                      backgroundColor: 'var(--color-bg-light)',
                      color: 'var(--color-text-brand)'
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    {feat.tag}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Technology Highlights Row */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {techHighlights.map((tech, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-left">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {tech.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                    {tech.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lifecycle Stages */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4 text-left">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Complete Travel Lifecycle</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              From Daydreaming to On-the-Ground Reality
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Unlike static itinerary generators, RoamAI stays with you across every stage of your journey.
            </p>
          </div>
          <button
            onClick={onStartPlanning}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            style={{ background: heroGradient }}
          >
            <span>Plan a Trip</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {lifecycleStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div 
                key={stage.stage}
                className="rounded-2xl p-5 sm:p-6 bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all space-y-4 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs ${stage.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Stage {stage.stage}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {stage.title}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shrink-0">
                    {stage.badge}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {stage.subtitle}
                </p>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {stage.description}
                </p>

                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
                  {stage.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Call to Action Bar */}
      <div 
        className="rounded-3xl p-8 sm:p-10 text-white text-center space-y-5 shadow-xl relative overflow-hidden"
        style={{ background: heroGradient }}
      >
        <div className="relative z-10 max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            Ready to Experience the RoamAI Difference?
          </h2>
          <p className="text-white/90 text-sm sm:text-base leading-relaxed">
            Generate your personalized, fully adaptive itinerary in seconds with verified places, smart budgeting, and live navigation.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onStartPlanning}
              className="px-6 py-3 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Create AI Itinerary</span>
            </button>
            <button
              onClick={onOpenMapSearch}
              className="px-6 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-sm backdrop-blur-md border border-white/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              <span>Search Map & Places</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

