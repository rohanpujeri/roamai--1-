import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Calendar, ArrowRight, Compass } from 'lucide-react';
import { Trip, ThemeConfig } from '../types';

interface RotatingTripsCarouselProps {
  trips?: Trip[];
  currentTheme?: ThemeConfig;
  onOpenTrip?: (tripId: string) => void;
  onStartPlanning: (destinationId?: string) => void;
}

interface DisplayTripItem {
  id?: string;
  isUserTrip: boolean;
  destination: string;
  title: string;
  durationDays: number;
  budget: string;
  weather: string;
  heroImage: string;
  colorCardRgb: string;
}

const DEFAULT_SHOWCASE_TRIPS: DisplayTripItem[] = [
  {
    destination: 'Bali',
    title: 'Coastal Surf & Coral Reefs',
    durationDays: 5,
    budget: '₹42,000',
    weather: '30°C ☀️',
    heroImage: '/images/bg_beach.jpg',
    colorCardRgb: '2, 132, 199', // sky blue
    isUserTrip: false,
  },
  {
    destination: 'Kyoto',
    title: 'Historic Temples & Zen Gardens',
    durationDays: 6,
    budget: '₹58,000',
    weather: '22°C 🌸',
    heroImage: '/images/bg_basic_minimal.jpg',
    colorCardRgb: '13, 148, 136', // teal
    isUserTrip: false,
  },
  {
    destination: 'Swiss Alps',
    title: 'Alpine Peaks & Panoramic Trains',
    durationDays: 7,
    budget: '₹95,000',
    weather: '16°C 🏔️',
    heroImage: '/images/bg_mountain.jpg',
    colorCardRgb: '99, 102, 241', // indigo
    isUserTrip: false,
  },
  {
    destination: 'Iceland',
    title: 'Cascading Falls & Volcanic Trails',
    durationDays: 5,
    budget: '₹82,000',
    weather: '12°C 🌊',
    heroImage: '/images/bg_waterfall.jpg',
    colorCardRgb: '16, 185, 129', // emerald
    isUserTrip: false,
  },
  {
    destination: 'Hokkaido',
    title: 'Powder Slopes & Hot Springs',
    durationDays: 6,
    budget: '₹68,000',
    weather: '-2°C ❄️',
    heroImage: '/images/bg_snow.jpg',
    colorCardRgb: '14, 165, 233', // sky
    isUserTrip: false,
  },
  {
    destination: 'Patagonia',
    title: 'Glacial Fjords & Wild Ridges',
    durationDays: 8,
    budget: '₹1,15,000',
    weather: '14°C 🏕️',
    heroImage: '/images/bg_trekking.jpg',
    colorCardRgb: '245, 158, 11', // amber
    isUserTrip: false,
  },
];

export const RotatingTripsCarousel: React.FC<RotatingTripsCarouselProps> = ({
  trips = [],
  currentTheme,
  onOpenTrip,
  onStartPlanning,
}) => {
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startAngleRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const angleRef = useRef(0);

  // Sync ref
  useEffect(() => {
    angleRef.current = rotationAngle;
  }, [rotationAngle]);

  // Convert theme primary hex to RGB
  const themeHexToRgb = (hex: string): string => {
    const clean = hex.replace('#', '');
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return `${r}, ${g}, ${b}`;
    }
    return '2, 132, 199';
  };

  const themeRgb = currentTheme?.primaryColor ? themeHexToRgb(currentTheme.primaryColor) : '2, 132, 199';

  // Merge user's actual trips with default showcase trips to always guarantee 6 cards
  const userDisplayTrips: DisplayTripItem[] = (trips || []).slice(0, 6).map((t, idx) => ({
    id: t.id,
    isUserTrip: true,
    destination: t.destination?.split(',')?.[0]?.trim() || 'My Journey',
    title: t.title || `${t.destination} Itinerary`,
    durationDays: t.durationDays || 4,
    budget: `${t.currency || '₹'}${t.targetBudget?.toLocaleString() || '35,000'}`,
    weather: t.days?.[0]?.weatherForecast ? `${t.days[0].weatherForecast.temp} ${t.days[0].weatherForecast.icon}` : '26°C ☀️',
    heroImage: t.heroImage || DEFAULT_SHOWCASE_TRIPS[idx % DEFAULT_SHOWCASE_TRIPS.length].heroImage,
    colorCardRgb: themeRgb,
  }));

  const combinedTrips: DisplayTripItem[] = [...userDisplayTrips];
  for (let i = 0; combinedTrips.length < 6; i++) {
    combinedTrips.push(DEFAULT_SHOWCASE_TRIPS[i % DEFAULT_SHOWCASE_TRIPS.length]);
  }
  const finalSixTrips = combinedTrips.slice(0, 6);

  // Auto-rotation loop when not dragging or hovering
  useEffect(() => {
    let active = true;

    const tick = (time: number) => {
      if (!active) return;
      const deltaSec = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (!isDraggingRef.current && !isInteracting) {
        // Rotate ~15 degrees per second
        const newAngle = (angleRef.current + 15 * deltaSec) % 360;
        angleRef.current = newAngle;
        setRotationAngle(newAngle);
      }

      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    animFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isInteracting]);

  // Interactive mouse drag and touch swipe handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startAngleRef.current = angleRef.current;
    dragDistanceRef.current = 0;
    setIsInteracting(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - startXRef.current;
    dragDistanceRef.current += Math.abs(deltaX);
    // Smooth angle update based on drag distance
    const newAngle = startAngleRef.current + deltaX * 0.45;
    angleRef.current = newAngle;
    setRotationAngle(newAngle);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    setTimeout(() => {
      setIsInteracting(false);
    }, 400);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleCardClick = (item: DisplayTripItem) => {
    // Only trigger if user wasn't dragging
    if (dragDistanceRef.current > 8) return;

    if (item.isUserTrip && item.id && onOpenTrip) {
      onOpenTrip(item.id);
    } else {
      onStartPlanning(item.destination);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center relative select-none">
      {/* Top Header Tag */}
      <div className="flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold shadow-md">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
        <span>Recently Planned Journeys • 3D Carousel</span>
      </div>

      {/* 3D Rotating Carousel Container with Pointer Drag and Swipe */}
      <div 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => {
          if (!isDraggingRef.current) setIsInteracting(false);
        }}
        className="rotating-carousel-wrapper"
        style={{
          // @ts-ignore
          '--quantity': 6,
          '--color-card': themeRgb,
        }}
      >
        <div 
          className="rotating-carousel-inner"
          style={{
            transform: `perspective(var(--perspective)) rotateX(var(--rotateX)) rotateY(${rotationAngle}deg)`,
          }}
        >
          {finalSixTrips.map((item, index) => {
            const isHovered = hoveredCardIdx === index;
            // Angle around the circle
            const cardDegree = (360 / 6) * index;

            return (
              <div
                key={item.id || item.destination + index}
                onClick={() => handleCardClick(item)}
                onMouseEnter={() => setHoveredCardIdx(index)}
                onMouseLeave={() => setHoveredCardIdx(null)}
                className="rotating-carousel-card group"
                style={{
                  transform: `rotateY(${cardDegree}deg) translateZ(var(--translateZ))`,
                  // @ts-ignore
                  '--color-card': item.colorCardRgb || themeRgb,
                  zIndex: isHovered ? 10 : 2,
                }}
                title={`Click to open ${item.destination} itinerary`}
              >
                {/* Background Hero Image */}
                <img
                  src={item.heroImage}
                  alt={item.destination}
                  referrerPolicy="no-referrer"
                  className="rotating-carousel-img group-hover:scale-110 transition-transform duration-500 pointer-events-none"
                />

                {/* Dark Gradient Overlay for Maximum Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-transparent pointer-events-none" />

                {/* Top Badges */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-black/65 backdrop-blur-md text-white border border-white/20 flex items-center gap-1 shadow-sm">
                    {item.isUserTrip ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    ) : (
                      <Calendar className="w-2.5 h-2.5 text-amber-300" />
                    )}
                    <span>{item.durationDays}D</span>
                  </span>

                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/65 backdrop-blur-md text-white border border-white/20 shadow-sm">
                    {item.weather}
                  </span>
                </div>

                {/* Bottom Trip Info */}
                <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col justify-end text-left pointer-events-none">
                  {item.isUserTrip && (
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Your Trip
                    </span>
                  )}
                  <h4 className="text-base sm:text-lg font-black text-white leading-tight drop-shadow-md truncate">
                    {item.destination}
                  </h4>
                  <p className="text-[10px] text-slate-300 line-clamp-1 font-medium mt-0.5 opacity-90">
                    {item.title}
                  </p>

                  <div className="mt-2 pt-2 border-t border-white/15 flex items-center justify-between">
                    <span className="text-[11px] font-black text-white drop-shadow-xs">
                      {item.budget}
                    </span>
                    <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-white group-hover:bg-white group-hover:text-slate-950 transition-colors shadow-xs">
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Helper Text */}
      <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 text-[11px] text-white/80 font-medium">
        <Compass className="w-3.5 h-3.5 text-sky-400 animate-spin" style={{ animationDuration: '8s' }} />
        <span>Drag or swipe to rotate • Tap any card to open</span>
      </div>
    </div>
  );
};
