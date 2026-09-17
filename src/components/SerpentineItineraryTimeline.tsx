import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  MapPin,
  Zap,
  Sparkles,
  CheckCircle2,
  Circle,
  ExternalLink,
  MoreVertical,
  RefreshCw,
  Trash2,
  ChevronUp,
  ChevronDown,
  Info,
  Plus,
  ArrowRight,
  Compass
} from 'lucide-react';
import { Activity, Trip, TravelMode } from '../types';
import { resolvePlaceImage, handleImageError } from '../utils/placeImages';

interface SerpentineItineraryTimelineProps {
  activities: Activity[];
  trip: Trip;
  currency: string;
  onOpenDetails: (activity: Activity) => void;
  onReplaceActivity: (activityId: string) => void;
  onMoveActivityUp: (activityId: string) => void;
  onMoveActivityDown: (activityId: string) => void;
  onRemoveActivity: (activityId: string) => void;
  onToggleActivityComplete?: (activityId: string) => void;
  onAddPlace?: () => void;
}

// Preset color themes for the anchor tiles matching the screenshot
const TILE_THEMES = [
  {
    bg: 'bg-[#0a3a2a]',
    border: 'border-emerald-500/40',
    ring: 'ring-emerald-400',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.35)]',
    defaultIcon: '🏍️'
  },
  {
    bg: 'bg-[#3d2e0a]',
    border: 'border-amber-500/40',
    ring: 'ring-amber-400',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.35)]',
    defaultIcon: '💨'
  },
  {
    bg: 'bg-[#3b121e]',
    border: 'border-rose-500/40',
    ring: 'ring-rose-400',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.35)]',
    defaultIcon: '🍴'
  },
  {
    bg: 'bg-[#083344]',
    border: 'border-cyan-500/40',
    ring: 'ring-cyan-400',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.35)]',
    defaultIcon: '🏔️'
  },
  {
    bg: 'bg-[#2e1065]',
    border: 'border-purple-500/40',
    ring: 'ring-purple-400',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.35)]',
    defaultIcon: '🌅'
  },
  {
    bg: 'bg-[#1e293b]',
    border: 'border-indigo-500/40',
    ring: 'ring-indigo-400',
    glow: 'shadow-[0_0_20px_rgba(99,102,241,0.35)]',
    defaultIcon: '🛏️'
  }
];

export const SerpentineItineraryTimeline: React.FC<SerpentineItineraryTimelineProps> = ({
  activities,
  trip,
  currency,
  onOpenDetails,
  onReplaceActivity,
  onMoveActivityUp,
  onMoveActivityDown,
  onRemoveActivity,
  onToggleActivityComplete,
  onAddPlace
}) => {
  const travelMode: TravelMode = trip?.travelMode || 'Flight';

  // Mode-specific vehicle graphic and travel configuration
  const vehicleConfig = useMemo(() => {
    switch (travelMode) {
      case 'Bike / Motorcycle':
        return {
          label: 'Motorcycle Tour',
          vehicleIcon: '🏍️',
          speedText: 'Ride Sprint',
          freeCostLabel: 'FREE RIDE',
          tipIcon: <Zap className="w-3.5 h-3.5 text-emerald-400" />,
          duration: '9s'
        };
      case 'Car / Road Trip':
        return {
          label: 'Road Trip Cruiser',
          vehicleIcon: '🚗',
          speedText: 'Expressway Run',
          freeCostLabel: 'FREE CRUISE',
          tipIcon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
          duration: '10s'
        };
      case 'Train':
        return {
          label: 'Express Rail',
          vehicleIcon: '🚆',
          speedText: 'Railway Track',
          freeCostLabel: 'INCLUDED',
          tipIcon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" />,
          duration: '8s'
        };
      case 'Bus':
        return {
          label: 'Transit Coach',
          vehicleIcon: '🚌',
          speedText: 'Highway Transit',
          freeCostLabel: 'INCLUDED',
          tipIcon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />,
          duration: '11s'
        };
      case 'Self-Drive Rental':
        return {
          label: 'Rental Adventure',
          vehicleIcon: '🚙',
          speedText: 'Scenic Trail',
          freeCostLabel: 'SELF DRIVE',
          tipIcon: <Zap className="w-3.5 h-3.5 text-sky-400" />,
          duration: '9.5s'
        };
      case 'Flight':
      default:
        return {
          label: 'Flight Corridors',
          vehicleIcon: '✈️',
          speedText: 'Air Corridor',
          freeCostLabel: 'FREE EXPLORE',
          tipIcon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
          duration: '8.5s'
        };
    }
  }, [travelMode]);

  // Generate SVG Serpentine Path Coordinates for Desktop View
  // Each node is spaced by approx ROW_HEIGHT
  const ROW_HEIGHT = 380;
  const totalRows = Math.max(1, activities.length);
  const totalSvgHeight = totalRows * ROW_HEIGHT + 100;

  const serpentinePathD = useMemo(() => {
    if (activities.length === 0) return '';
    if (activities.length === 1) {
      return `M 500 120 L 500 280`;
    }

    // Points array:
    // Even rows: anchor at x=500
    // Odd rows: anchor at x=80 (far left next to card)
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < activities.length; i++) {
      const y = i * ROW_HEIGHT + 160;
      const isEven = i % 2 === 0;
      const x = isEven ? 515 : 95;
      points.push({ x, y });
    }

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const dy = p1.y - p0.y;

      if (i % 2 === 0) {
        // Even to Odd: From Center (515) -> Swings out Right -> Inward to Left (95)
        const cp1x = p0.x + 90; // ~605
        const cp1y = p0.y + dy * 0.35;
        const cp2x = p1.x + 360; // sweeps around card edge
        const cp2y = p1.y - dy * 0.25;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
      } else {
        // Odd to Even: From Left (95) -> Curves Down and sweeps Right into Center (515)
        const cp1x = p0.x - 30;
        const cp1y = p0.y + dy * 0.4;
        const cp2x = p1.x - 120;
        const cp2y = p1.y - dy * 0.3;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
      }
    }

    // Add trailing tail below last node
    const lastP = points[points.length - 1];
    d += ` Q ${lastP.x + 20} ${lastP.y + 60} ${lastP.x} ${lastP.y + 110}`;

    return d;
  }, [activities.length]);

  // Mobile Serpentine Route Path dynamic tracker
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const [mobilePathD, setMobilePathD] = useState<string>('');
  const [mobileSvgSize, setMobileSvgSize] = useState<{ width: number; height: number }>({ width: 360, height: 1200 });

  // Initial fallback path so there is zero flash on first render
  const mobileInitialFallbackPath = useMemo(() => {
    if (activities.length === 0) return '';
    if (activities.length === 1) return 'M 24 35 L 24 220';
    let d = 'M 24 35';
    for (let i = 0; i < activities.length - 1; i++) {
      const isCurrentEven = i % 2 === 0;
      const x0 = isCurrentEven ? 24 : 330;
      const x1 = isCurrentEven ? 330 : 24;
      const y0 = i * 420 + 35;
      const y1 = (i + 1) * 420 + 35;
      const dy = y1 - y0;
      d += ` C ${x0 + (isCurrentEven ? 40 : -40)} ${y0 + dy * 0.45}, ${x1 - (isCurrentEven ? 40 : -40)} ${y1 - dy * 0.45}, ${x1} ${y1}`;
    }
    return d;
  }, [activities.length]);

  useEffect(() => {
    const calculateMobileCurve = () => {
      if (!mobileContainerRef.current) return;
      const container = mobileContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const nodes = container.querySelectorAll<HTMLElement>('.mobile-anchor-node');
      if (nodes.length === 0) return;

      const pts: { x: number; y: number }[] = [];
      nodes.forEach((node) => {
        const nodeRect = node.getBoundingClientRect();
        pts.push({
          x: nodeRect.left - containerRect.left + nodeRect.width / 2,
          y: nodeRect.top - containerRect.top + nodeRect.height / 2,
        });
      });

      const w = Math.max(300, containerRect.width || 360);
      const h = Math.max(400, containerRect.height || 1200);
      setMobileSvgSize({ width: w, height: h });

      if (pts.length === 1) {
        setMobilePathD(`M ${pts[0].x} 10 L ${pts[0].x} ${pts[0].y + 120}`);
        return;
      }

      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const dy = p1.y - p0.y;
        const dx = p1.x - p0.x;

        // Serpentine S-curve bowing outward before sweeping into destination
        const cp1x = p0.x + (dx > 0 ? 45 : -45);
        const cp1y = p0.y + dy * 0.45;
        const cp2x = p1.x - (dx > 0 ? 45 : -45);
        const cp2y = p1.y - dy * 0.45;

        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
      }

      // Add a smooth trailing tail at bottom
      const lastP = pts[pts.length - 1];
      d += ` Q ${lastP.x} ${lastP.y + 45} ${lastP.x} ${lastP.y + 85}`;

      setMobilePathD(d);
    };

    calculateMobileCurve();
    const t1 = setTimeout(calculateMobileCurve, 100);
    const t2 = setTimeout(calculateMobileCurve, 400);

    window.addEventListener('resize', calculateMobileCurve);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', calculateMobileCurve);
    };
  }, [activities]);

  const effectiveMobilePath = mobilePathD || mobileInitialFallbackPath;

  return (
    <div className="relative w-full bg-[#050507] text-white rounded-3xl p-3 sm:p-8 lg:p-12 overflow-hidden shadow-2xl border border-zinc-900/90 select-none">
      {/* Background Starry Dust & Subtle Neon Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[8%] left-[30%] w-1.5 h-1.5 bg-emerald-400/80 rounded-full animate-pulse" />
        <div className="absolute top-[24%] left-[25%] w-1.5 h-1.5 bg-emerald-400/60 rounded-full" />
        <div className="absolute top-[42%] left-[45%] w-1 h-1 bg-emerald-400/50 rounded-full" />
        <div className="absolute top-[65%] left-[35%] w-1.5 h-1.5 bg-emerald-400/70 rounded-full animate-ping" />
        <div className="absolute top-[82%] left-[60%] w-1 h-1 bg-emerald-300/40 rounded-full" />
        
        {/* Soft Radial Backlight */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-emerald-950/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Mode of Travel Header Pill Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 mb-10 sm:mb-14 pb-4 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0a3a2a] border border-emerald-500/40 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            {vehicleConfig.vehicleIcon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-400">
                {travelMode} Journey Flow
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Animated Route
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Curved serpentine timeline synced with your itinerary milestones & stops
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
          <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">
            {activities.length} {activities.length === 1 ? 'Stop' : 'Stops'}
          </span>
          {trip.routeSummary?.distanceKm && (
            <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400">
              ≈ {trip.routeSummary.distanceKm} km Corridor
            </span>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* DESKTOP SERPENTINE TIMELINE (Hidden on mobile < md)          */}
      {/* ============================================================ */}
      <div
        className="hidden md:block relative w-full"
        style={{ height: `${totalSvgHeight}px` }}
      >
        {/* Continuous Serpentine SVG Curve & Vehicle */}
        <svg
          viewBox={`0 0 1000 ${totalSvgHeight}`}
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10"
        >
          <defs>
            {/* Luminous Neon Green Road Gradient */}
            <linearGradient id="neonGreenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="40%" stopColor="#34d399" />
              <stop offset="80%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Road Glow Filters */}
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur1" />
              <feGaussianBlur stdDeviation="14" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="headlightBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* Underlay Ambient Glow Path */}
          <path
            d={serpentinePathD}
            fill="none"
            stroke="#10b981"
            strokeWidth="16"
            strokeOpacity="0.12"
            strokeLinecap="round"
          />

          {/* Crisp Neon Curved Route Line matching mockup */}
          <path
            id="serpentineMotionPath"
            d={serpentinePathD}
            fill="none"
            stroke="url(#neonGreenGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#neonGlow)"
          />

          {/* Dash Pulse Animation along the curve */}
          <path
            d={serpentinePathD}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeDasharray="10 40"
            strokeLinecap="round"
            opacity="0.8"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="1000; 0"
              dur="6s"
              repeatCount="indefinite"
            />
          </path>

          {/* Moving Vehicle along the Serpentine Path */}
          <g>
            <animateMotion
              dur={vehicleConfig.duration}
              repeatCount="indefinite"
              rotate="auto"
            >
              <mpath href="#serpentineMotionPath" />
            </animateMotion>

            {/* Travel Mode Vehicle Graphic with Headlight Beam */}
            {travelMode === 'Bike / Motorcycle' && (
              <g transform="translate(0, 0)">
                {/* Yellow/white headlight cone illuminating forward */}
                <polygon
                  points="14,-4 48,-16 48,16 14,4"
                  fill="rgba(250, 204, 21, 0.28)"
                  filter="url(#headlightBlur)"
                />
                {/* Green vehicle aura */}
                <circle cx="0" cy="0" r="14" fill="rgba(52, 211, 153, 0.35)" filter="url(#headlightBlur)" />
                {/* Motorcycle Silhouette */}
                <g transform="scale(0.95) translate(-14, -12)">
                  <circle cx="5" cy="18" r="4.5" fill="#09090b" stroke="#34d399" strokeWidth="1.6" />
                  <circle cx="23" cy="18" r="4.5" fill="#09090b" stroke="#34d399" strokeWidth="1.6" />
                  <path d="M 6 18 L 13 13 L 19 13 L 22 18" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 12 13 L 16 10 L 20 13 Z" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                  <path d="M 19 10 L 21 6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="13" cy="6" r="3.2" fill="#34d399" />
                  <path d="M 13 9.2 L 16 14" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="23" cy="11" r="2" fill="#facc15" />
                </g>
              </g>
            )}

            {travelMode === 'Car / Road Trip' && (
              <g transform="translate(0, 0)">
                <polygon
                  points="16,-5 52,-18 52,18 16,5"
                  fill="rgba(250, 204, 21, 0.25)"
                  filter="url(#headlightBlur)"
                />
                <circle cx="0" cy="0" r="14" fill="rgba(52, 211, 153, 0.3)" />
                <g transform="scale(0.9) translate(-16, -10)">
                  <path d="M 3 13 C 3 10, 6 9, 10 9 L 14 4 C 16 3, 18 3, 22 3 L 26 8 L 30 9 C 32 9, 33 11, 33 13 L 33 16 L 3 16 Z" fill="#ffffff" />
                  <path d="M 14 8 L 18 5 L 23 5 L 25 8 Z" fill="#09090b" />
                  <circle cx="9" cy="16" r="3.2" fill="#09090b" stroke="#34d399" strokeWidth="1.2" />
                  <circle cx="26" cy="16" r="3.2" fill="#09090b" stroke="#34d399" strokeWidth="1.2" />
                  <circle cx="32" cy="11" r="1.8" fill="#facc15" />
                </g>
              </g>
            )}

            {travelMode === 'Train' && (
              <g transform="translate(0, 0)">
                <circle cx="0" cy="0" r="12" fill="rgba(56, 189, 248, 0.35)" />
                <g transform="scale(0.85) translate(-16, -8)">
                  <path d="M 2 13 L 2 5 C 2 3, 4 3, 8 3 L 24 3 C 28 3, 31 7, 32 10 L 32 13 Z" fill="#ffffff" />
                  <path d="M 22 5 L 28 8 L 22 8 Z" fill="#09090b" />
                  <circle cx="6" cy="14" r="2.5" fill="#09090b" stroke="#ffffff" strokeWidth="1" />
                  <circle cx="14" cy="14" r="2.5" fill="#09090b" stroke="#ffffff" strokeWidth="1" />
                  <circle cx="26" cy="14" r="2.5" fill="#09090b" stroke="#ffffff" strokeWidth="1" />
                  <circle cx="30" cy="11" r="1.5" fill="#38bdf8" />
                </g>
              </g>
            )}

            {travelMode === 'Bus' && (
              <g transform="translate(0, 0)">
                <circle cx="0" cy="0" r="12" fill="rgba(250, 204, 21, 0.35)" />
                <g transform="scale(0.85) translate(-16, -9)">
                  <rect x="2" y="3" width="29" height="11" rx="2.5" fill="#ffffff" />
                  <rect x="6" y="5" width="5" height="3.5" rx="0.5" fill="#09090b" />
                  <rect x="13" y="5" width="5" height="3.5" rx="0.5" fill="#09090b" />
                  <rect x="20" y="5" width="5" height="3.5" rx="0.5" fill="#09090b" />
                  <circle cx="7" cy="14.5" r="3" fill="#09090b" stroke="#ffffff" strokeWidth="1" />
                  <circle cx="24" cy="14.5" r="3" fill="#09090b" stroke="#ffffff" strokeWidth="1" />
                </g>
              </g>
            )}

            {travelMode === 'Self-Drive Rental' && (
              <g transform="translate(0, 0)">
                <polygon points="16,-5 50,-18 50,18 16,5" fill="rgba(56, 189, 248, 0.25)" filter="url(#headlightBlur)" />
                <circle cx="0" cy="0" r="13" fill="rgba(56, 189, 248, 0.35)" />
                <g transform="scale(0.85) translate(-14, -8)">
                  <path d="M 3 11 C 3 9, 5 7, 8 7 L 11 4 C 12 3, 14 3, 21 3 L 26 7 L 29 8 C 30 9, 31 10, 31 12 L 31 14 L 3 14 Z" fill="#ffffff" />
                  <path d="M 12 6 L 19 5 L 23 7 L 12 7 Z" fill="#09090b" />
                  <circle cx="8" cy="14" r="3.5" fill="#09090b" stroke="#ffffff" strokeWidth="1.2" />
                  <circle cx="25" cy="14" r="3.5" fill="#09090b" stroke="#ffffff" strokeWidth="1.2" />
                </g>
              </g>
            )}

            {travelMode === 'Flight' && (
              <g transform="translate(0, 0)">
                <circle cx="0" cy="0" r="12" fill="rgba(255, 255, 255, 0.35)" filter="url(#headlightBlur)" />
                <path
                  d="M 15 0 L -8 -12 L -4 -2 L -14 -4 L -11 0 L -14 4 L -4 2 L -8 12 Z"
                  fill="#ffffff"
                  stroke="#09090b"
                  strokeWidth="0.8"
                />
              </g>
            )}
          </g>
        </svg>

        {/* Serpentine Stop Rows */}
        <div className="relative z-20 space-y-0">
          {activities.map((activity, index) => {
            const isEven = index % 2 === 0;
            const theme = TILE_THEMES[index % TILE_THEMES.length];
            const costText =
              activity.estimatedCost === 0
                ? vehicleConfig.freeCostLabel
                : `${currency} ${activity.estimatedCost.toLocaleString()}`;

            const placeImg =
              activity.imageUrl &&
              activity.imageUrl.startsWith('http') &&
              !activity.imageUrl.includes('example.com')
                ? activity.imageUrl
                : resolvePlaceImage(activity.title, activity.category, activity.location);

            const proTipText =
              activity.recommendationReason ||
              activity.tips ||
              'Optimal timing for high visibility, lower traffic & authentic atmosphere.';

            return (
              <div
                key={activity.id}
                className="relative flex items-center justify-between"
                style={{ height: `${ROW_HEIGHT}px` }}
              >
                {/* -------------------------------------------------------- */}
                {/* ROW TYPE A (EVEN INDEX: 0, 2, 4...)                      */}
                {/* Left: Photo | Center: Anchor Tile | Right: Activity Card */}
                {/* -------------------------------------------------------- */}
                {isEven ? (
                  <>
                    {/* Left Column: Photo (Circular or Rounded) */}
                    <div className="w-[42%] flex items-center justify-center pl-4 lg:pl-10">
                      <motion.div
                        whileHover={{ scale: 1.04 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => onOpenDetails(activity)}
                        className={`overflow-hidden shadow-2xl relative group cursor-pointer border-2 ${theme.border} ${
                          index === 0
                            ? 'w-48 h-48 lg:w-56 lg:h-56 rounded-full'
                            : 'w-52 h-44 lg:w-64 lg:h-52 rounded-3xl'
                        }`}
                      >
                        <img
                          src={placeImg}
                          alt={activity.title}
                          onError={(e) => handleImageError(e, activity.category)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity" />
                        <div className="absolute bottom-2.5 left-3 right-3 text-center">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-emerald-300 border border-emerald-500/40">
                            {activity.location || activity.category}
                          </span>
                        </div>
                      </motion.div>
                    </div>

                    {/* Center Column: Anchor Tile */}
                    <div className="w-[16%] flex items-center justify-center relative z-20">
                      <div
                        className={`w-18 h-18 lg:w-20 lg:h-20 rounded-2xl ${theme.bg} ${theme.border} border flex items-center justify-center shadow-2xl relative ${theme.glow}`}
                      >
                        <div
                          className={`w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-[#050507] ${theme.ring} ring-2 flex items-center justify-center text-xl sm:text-2xl shadow-inner`}
                        >
                          {index === 0 ? vehicleConfig.vehicleIcon : theme.defaultIcon}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Activity Card */}
                    <div className="w-[42%] pr-2 lg:pr-8">
                      <div className="bg-[#121316]/95 backdrop-blur-2xl rounded-3xl p-5 lg:p-6 border border-zinc-800/80 hover:border-zinc-700 shadow-2xl shadow-black/80 transition-all text-left space-y-3.5 relative group overflow-hidden">
                        {/* Header: Time Pill + Line + Cost */}
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black tracking-wide flex items-center gap-1.5 shadow-sm">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            {activity.time}
                          </span>
                          <div className="h-[1px] bg-zinc-800 flex-1 mx-3" />
                          <span className="text-xs font-bold text-zinc-400 tracking-wider font-mono shrink-0">
                            {costText}
                          </span>
                        </div>

                        {/* Title */}
                        <h3
                          onClick={() => onOpenDetails(activity)}
                          className="text-lg lg:text-xl font-black text-white group-hover:text-emerald-400 transition-colors tracking-tight leading-snug cursor-pointer line-clamp-2"
                        >
                          {activity.title}
                        </h3>

                        {/* Description */}
                        <p className="text-xs lg:text-sm text-zinc-300 font-normal leading-relaxed line-clamp-3">
                          {activity.description}
                        </p>

                        {/* Pro-Tip Capsule matching mockup */}
                        <div className="p-3 rounded-2xl bg-[#18191d] border border-white/5 flex items-center gap-2.5 shadow-inner">
                          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            {vehicleConfig.tipIcon}
                          </div>
                          <p className="text-xs text-zinc-300 italic font-medium leading-snug line-clamp-2">
                            “{proTipText}”
                          </p>
                        </div>

                        {/* Action Bar */}
                        <div className="pt-2 border-t border-zinc-800/70 flex items-center justify-between">
                          {onToggleActivityComplete && (
                            <button
                              type="button"
                              onClick={() => onToggleActivityComplete(activity.id)}
                              className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                                activity.completed
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                              }`}
                            >
                              {activity.completed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-zinc-500" />
                              )}
                              <span>{activity.completed ? 'Visited' : 'Check-in'}</span>
                            </button>
                          )}

                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => onOpenDetails(activity)}
                              className="px-2.5 py-1 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Info className="w-3 h-3 text-emerald-400" />
                              <span>Details</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onMoveActivityUp(activity.id)}
                              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="Move up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onMoveActivityDown(activity.id)}
                              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="Move down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onReplaceActivity(activity.id)}
                              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                              title="Replace activity"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* -------------------------------------------------------- */
                  /* ROW TYPE B (ODD INDEX: 1, 3, 5...)                       */
                  /* Left: Anchor + Activity Card | Right: Photo              */
                  /* -------------------------------------------------------- */
                  <>
                    {/* Left Column: Anchor Tile + Activity Card */}
                    <div className="w-[50%] flex items-center gap-3.5 pl-2 lg:pl-6 relative z-20">
                      {/* Left Anchor Tile */}
                      <div
                        className={`w-18 h-18 lg:w-20 lg:h-20 rounded-2xl ${theme.bg} ${theme.border} border flex items-center justify-center shadow-2xl relative shrink-0 ${theme.glow}`}
                      >
                        <div
                          className={`w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-[#050507] ${theme.ring} ring-2 flex items-center justify-center text-xl sm:text-2xl shadow-inner`}
                        >
                          {theme.defaultIcon}
                        </div>
                      </div>

                      {/* Attached Activity Card */}
                      <div className="flex-1 bg-[#121316]/95 backdrop-blur-2xl rounded-3xl p-5 lg:p-6 border border-zinc-800/80 hover:border-zinc-700 shadow-2xl shadow-black/80 transition-all text-left space-y-3.5 relative group overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black tracking-wide flex items-center gap-1.5 shadow-sm">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            {activity.time}
                          </span>
                          <div className="h-[1px] bg-zinc-800 flex-1 mx-3" />
                          <span className="text-xs font-bold text-zinc-400 tracking-wider font-mono shrink-0">
                            {costText}
                          </span>
                        </div>

                        {/* Title */}
                        <h3
                          onClick={() => onOpenDetails(activity)}
                          className="text-lg lg:text-xl font-black text-white group-hover:text-amber-400 transition-colors tracking-tight leading-snug cursor-pointer line-clamp-2"
                        >
                          {activity.title}
                        </h3>

                        {/* Description */}
                        <p className="text-xs lg:text-sm text-zinc-300 font-normal leading-relaxed line-clamp-3">
                          {activity.description}
                        </p>

                        {/* Pro-Tip Capsule */}
                        <div className="p-3 rounded-2xl bg-[#18191d] border border-white/5 flex items-center gap-2.5 shadow-inner">
                          <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                            {vehicleConfig.tipIcon}
                          </div>
                          <p className="text-xs text-zinc-300 italic font-medium leading-snug line-clamp-2">
                            “{proTipText}”
                          </p>
                        </div>

                        {/* Action Bar */}
                        <div className="pt-2 border-t border-zinc-800/70 flex items-center justify-between">
                          {onToggleActivityComplete && (
                            <button
                              type="button"
                              onClick={() => onToggleActivityComplete(activity.id)}
                              className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                                activity.completed
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                              }`}
                            >
                              {activity.completed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-zinc-500" />
                              )}
                              <span>{activity.completed ? 'Visited' : 'Check-in'}</span>
                            </button>
                          )}

                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => onOpenDetails(activity)}
                              className="px-2.5 py-1 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Info className="w-3 h-3 text-emerald-400" />
                              <span>Details</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onMoveActivityUp(activity.id)}
                              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="Move up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onMoveActivityDown(activity.id)}
                              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="Move down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onReplaceActivity(activity.id)}
                              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                              title="Replace activity"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Square Photo */}
                    <div className="w-[45%] flex items-center justify-center pr-4 lg:pr-10">
                      <motion.div
                        whileHover={{ scale: 1.04 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => onOpenDetails(activity)}
                        className={`w-52 h-44 lg:w-64 lg:h-52 rounded-3xl overflow-hidden shadow-2xl relative group cursor-pointer border-2 ${theme.border}`}
                      >
                        <img
                          src={placeImg}
                          alt={activity.title}
                          onError={(e) => handleImageError(e, activity.category)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity" />
                        <div className="absolute bottom-2.5 left-3 right-3 text-center">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-amber-300 border border-amber-500/40">
                            {activity.location || activity.category}
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MOBILE TIMELINE (< md screens) WITH ANIMATED SERPENTINE FLOW */}
      {/* ============================================================ */}
      <div
        ref={mobileContainerRef}
        className="md:hidden relative space-y-8 overflow-visible"
      >
        {/* Mobile SVG Serpentine Route with Live Animated Vehicle */}
        <svg
          viewBox={`0 0 ${mobileSvgSize.width} ${mobileSvgSize.height}`}
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10"
        >
          <defs>
            <linearGradient id="mobileNeonGreenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="40%" stopColor="#34d399" />
              <stop offset="80%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            <filter id="mobileNeonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur1" />
              <feGaussianBlur stdDeviation="10" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="mobileHeadlightBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* Underlay Ambient Glow Path */}
          <path
            d={effectiveMobilePath}
            fill="none"
            stroke="#10b981"
            strokeWidth="12"
            strokeOpacity="0.16"
            strokeLinecap="round"
          />

          {/* Crisp Neon Curved Route Line */}
          <path
            id="mobileSerpentineMotionPath"
            d={effectiveMobilePath}
            fill="none"
            stroke="url(#mobileNeonGreenGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#mobileNeonGlow)"
          />

          {/* Dash Pulse Animation along the curve */}
          <path
            d={effectiveMobilePath}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeDasharray="8 32"
            strokeLinecap="round"
            opacity="0.85"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="500; 0"
              dur="5s"
              repeatCount="indefinite"
            />
          </path>

          {/* Moving Vehicle along the Mobile Serpentine Path */}
          <g>
            <animateMotion
              dur={vehicleConfig.duration}
              repeatCount="indefinite"
              rotate="auto"
            >
              <mpath href="#mobileSerpentineMotionPath" />
            </animateMotion>

            {/* Travel Mode Vehicle Graphic on Mobile */}
            {travelMode === 'Bike / Motorcycle' && (
              <g transform="translate(0, 0)">
                <polygon
                  points="14,-4 42,-14 42,14 14,4"
                  fill="rgba(250, 204, 21, 0.32)"
                  filter="url(#mobileHeadlightBlur)"
                />
                <circle cx="0" cy="0" r="13" fill="rgba(52, 211, 153, 0.35)" filter="url(#mobileHeadlightBlur)" />
                <g transform="scale(0.9) translate(-14, -12)">
                  <circle cx="5" cy="18" r="4.5" fill="#09090b" stroke="#34d399" strokeWidth="1.6" />
                  <circle cx="23" cy="18" r="4.5" fill="#09090b" stroke="#34d399" strokeWidth="1.6" />
                  <path d="M 6 18 L 13 13 L 19 13 L 22 18" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M 12 13 L 16 10 L 20 13 Z" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
                  <path d="M 19 10 L 21 6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="13" cy="6" r="3.2" fill="#34d399" />
                  <path d="M 13 9.2 L 16 14" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="23" cy="11" r="2" fill="#facc15" />
                </g>
              </g>
            )}

            {travelMode === 'Car / Road Trip' && (
              <g transform="translate(0, 0)">
                <polygon
                  points="16,-5 46,-16 46,16 16,5"
                  fill="rgba(250, 204, 21, 0.28)"
                  filter="url(#mobileHeadlightBlur)"
                />
                <circle cx="0" cy="0" r="13" fill="rgba(52, 211, 153, 0.3)" />
                <g transform="scale(0.85) translate(-16, -10)">
                  <path d="M 3 13 C 3 10, 6 9, 10 9 L 14 4 C 16 3, 18 3, 22 3 L 26 8 L 30 9 C 32 9, 33 11, 33 13 L 33 16 L 3 16 Z" fill="#ffffff" />
                  <path d="M 14 8 L 18 5 L 23 5 L 25 8 Z" fill="#09090b" />
                  <circle cx="9" cy="16" r="3.2" fill="#09090b" stroke="#34d399" strokeWidth="1.2" />
                  <circle cx="26" cy="16" r="3.2" fill="#09090b" stroke="#34d399" strokeWidth="1.2" />
                  <circle cx="32" cy="11" r="1.8" fill="#facc15" />
                </g>
              </g>
            )}

            {travelMode === 'Train' && (
              <g transform="translate(0, 0)">
                <circle cx="0" cy="0" r="12" fill="rgba(56, 189, 248, 0.35)" />
                <g transform="scale(0.8) translate(-16, -8)">
                  <path d="M 2 13 L 2 5 C 2 3, 4 3, 8 3 L 24 3 C 28 3, 31 7, 32 10 L 32 13 Z" fill="#ffffff" />
                  <path d="M 22 5 L 28 8 L 22 8 Z" fill="#09090b" />
                  <circle cx="6" cy="14" r="2.5" fill="#09090b" stroke="#ffffff" strokeWidth="1" />
                  <circle cx="14" cy="14" r="2.5" fill="#09090b" stroke="#ffffff" strokeWidth="1" />
                  <circle cx="26" cy="14" r="2.5" fill="#09090b" stroke="#ffffff" strokeWidth="1" />
                  <circle cx="30" cy="11" r="1.5" fill="#38bdf8" />
                </g>
              </g>
            )}

            {travelMode === 'Bus' && (
              <g transform="translate(0, 0)">
                <circle cx="0" cy="0" r="12" fill="rgba(250, 204, 21, 0.35)" />
                <g transform="scale(0.8) translate(-16, -9)">
                  <rect x="2" y="3" width="29" height="11" rx="2.5" fill="#ffffff" />
                  <rect x="6" y="5" width="5" height="3.5" rx="0.5" fill="#09090b" />
                  <rect x="13" y="5" width="5" height="3.5" rx="0.5" fill="#09090b" />
                  <rect x="20" y="5" width="5" height="3.5" rx="0.5" fill="#09090b" />
                  <circle cx="7" cy="14.5" r="3" fill="#09090b" stroke="#ffffff" strokeWidth="1" />
                  <circle cx="24" cy="14.5" r="3" fill="#09090b" stroke="#ffffff" strokeWidth="1" />
                </g>
              </g>
            )}

            {travelMode === 'Self-Drive Rental' && (
              <g transform="translate(0, 0)">
                <polygon points="14,-4 44,-16 44,16 14,4" fill="rgba(56, 189, 248, 0.25)" filter="url(#mobileHeadlightBlur)" />
                <circle cx="0" cy="0" r="12" fill="rgba(56, 189, 248, 0.35)" />
                <g transform="scale(0.8) translate(-14, -8)">
                  <path d="M 3 11 C 3 9, 5 7, 8 7 L 11 4 C 12 3, 14 3, 21 3 L 26 7 L 29 8 C 30 9, 31 10, 31 12 L 31 14 L 3 14 Z" fill="#ffffff" />
                  <path d="M 12 6 L 19 5 L 23 7 L 12 7 Z" fill="#09090b" />
                  <circle cx="8" cy="14" r="3.5" fill="#09090b" stroke="#ffffff" strokeWidth="1.2" />
                  <circle cx="25" cy="14" r="3.5" fill="#09090b" stroke="#ffffff" strokeWidth="1.2" />
                </g>
              </g>
            )}

            {travelMode === 'Flight' && (
              <g transform="translate(0, 0)">
                <circle cx="0" cy="0" r="12" fill="rgba(255, 255, 255, 0.35)" filter="url(#mobileHeadlightBlur)" />
                <path
                  d="M 14 0 L -8 -11 L -4 -2 L -14 -4 L -11 0 L -14 4 L -4 2 L -8 11 Z"
                  fill="#ffffff"
                  stroke="#09090b"
                  strokeWidth="0.8"
                />
              </g>
            )}
          </g>
        </svg>

        {/* Mobile Alternating Serpentine Activity Nodes */}
        {activities.map((activity, index) => {
          const isEven = index % 2 === 0;
          const theme = TILE_THEMES[index % TILE_THEMES.length];
          const costText =
            activity.estimatedCost === 0
              ? vehicleConfig.freeCostLabel
              : `${currency} ${activity.estimatedCost.toLocaleString()}`;

          const placeImg =
            activity.imageUrl &&
            activity.imageUrl.startsWith('http') &&
            !activity.imageUrl.includes('example.com')
              ? activity.imageUrl
              : resolvePlaceImage(activity.title, activity.category, activity.location);

          const proTipText =
            activity.recommendationReason ||
            activity.tips ||
            'Optimal timing for high visibility and authentic local vibes.';

          return (
            <div
              key={activity.id}
              className={`relative z-20 flex items-start ${
                isEven ? 'flex-row pl-1.5' : 'flex-row-reverse pr-1.5'
              }`}
            >
              {/* Anchor Node with icon - targeted by .mobile-anchor-node */}
              <div
                className={`mobile-anchor-node w-9 h-9 rounded-xl ${theme.bg} ${theme.border} border flex items-center justify-center text-sm shadow-xl z-20 shrink-0 mt-3 ${
                  isEven ? 'mr-3' : 'ml-3'
                } ${theme.glow}`}
              >
                <div className={`w-6 h-6 rounded-full bg-[#050507] ${theme.ring} ring-2 flex items-center justify-center text-xs`}>
                  {index === 0 ? vehicleConfig.vehicleIcon : theme.defaultIcon}
                </div>
              </div>

              {/* Card Container */}
              <div className="flex-1 bg-[#121316]/95 backdrop-blur-xl rounded-2xl border border-zinc-800 p-3.5 sm:p-4 space-y-3 shadow-2xl relative overflow-hidden">
                {/* Embedded Photo Banner */}
                <div
                  onClick={() => onOpenDetails(activity)}
                  className="w-full h-36 rounded-xl overflow-hidden relative cursor-pointer group"
                >
                  <img
                    src={placeImg}
                    alt={activity.title}
                    onError={(e) => handleImageError(e, activity.category)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    {activity.category}
                  </div>
                  <div className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-semibold text-zinc-300">
                    {activity.location || trip.destination}
                  </div>
                </div>

                {/* Header Time & Cost */}
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    {activity.time}
                  </span>
                  <div className="h-[1px] bg-zinc-800 flex-1 mx-2" />
                  <span className="font-bold text-zinc-400 font-mono text-xs">
                    {costText}
                  </span>
                </div>

                {/* Title */}
                <h4
                  onClick={() => onOpenDetails(activity)}
                  className="text-base font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer leading-tight"
                >
                  {activity.title}
                </h4>

                {/* Description */}
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                  {activity.description}
                </p>

                {/* Pro-Tip Capsule */}
                <div className="p-2.5 rounded-xl bg-[#18191d] border border-white/5 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs">
                    ⚡
                  </div>
                  <p className="text-[11px] text-zinc-300 italic font-medium leading-tight truncate">
                    “{proTipText}”
                  </p>
                </div>

                {/* Action Bar */}
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                  {onToggleActivityComplete && (
                    <button
                      type="button"
                      onClick={() => onToggleActivityComplete(activity.id)}
                      className={`flex items-center gap-1 font-bold cursor-pointer ${
                        activity.completed ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {activity.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                      <span>{activity.completed ? 'Visited' : 'Check-in'}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => onOpenDetails(activity)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-bold hover:bg-zinc-700 cursor-pointer"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveActivityUp(activity.id)}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                      title="Move up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveActivityDown(activity.id)}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                      title="Move down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onReplaceActivity(activity.id)}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 cursor-pointer"
                      title="Replace"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add a Place at the End of Journey matching mockup */}
      {onAddPlace && (
        <div className="relative z-20 pt-8 sm:pt-12">
          <button
            id="btn-add-place-serpentine"
            type="button"
            onClick={onAddPlace}
            className="w-full group py-4 px-6 rounded-3xl border-2 border-dashed border-emerald-500/70 hover:border-emerald-400 bg-black/90 hover:bg-[#071610] backdrop-blur-2xl transition-all duration-300 flex items-center justify-between text-left shadow-2xl cursor-pointer ring-1 ring-emerald-500/30 hover:ring-emerald-500/60"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 group-hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-colors shrink-0">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white group-hover:text-emerald-400 transition-colors">
                    Add Next Waypoint / Place
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 border border-emerald-800">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Curated Spots
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                  Extend your {travelMode.toLowerCase()} corridor with scenic stops, food joints or stays
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0 bg-emerald-950/70 px-3 py-1.5 rounded-xl border border-emerald-800">
              <span>Explore Nearby</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
