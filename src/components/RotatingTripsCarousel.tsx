import React, { useState, useRef, useEffect } from 'react';
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

// Destination-specific curated photos so every destination has its own unique, iconic image
const DESTINATION_PHOTO_MAP: { [key: string]: string } = {
  bali: '/images/bg_beach.jpg',
  beach: '/images/bg_beach.jpg',
  goa: '/images/bg_beach.jpg',
  maldives: '/images/bg_beach.jpg',
  hawaii: '/images/bg_beach.jpg',
  kyoto: '/images/bg_basic_minimal.jpg',
  tokyo: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
  japan: '/images/bg_basic_minimal.jpg',
  swiss: '/images/bg_mountain.jpg',
  alps: '/images/bg_mountain.jpg',
  switzerland: '/images/bg_mountain.jpg',
  manali: '/images/bg_mountain.jpg',
  dolomites: '/images/bg_mountain.jpg',
  iceland: '/images/bg_waterfall.jpg',
  waterfall: '/images/bg_waterfall.jpg',
  norway: '/images/bg_waterfall.jpg',
  kerala: '/images/bg_waterfall.jpg',
  hokkaido: '/images/bg_snow.jpg',
  snow: '/images/bg_snow.jpg',
  arctic: '/images/bg_snow.jpg',
  patagonia: '/images/bg_trekking.jpg',
  trek: '/images/bg_trekking.jpg',
  ladakh: '/images/bg_trekking.jpg',
  paris: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
  france: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
  rome: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80',
  italy: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80',
  santorini: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80',
  greece: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80',
  dubai: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80',
  uae: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80',
  london: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
  uk: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
  'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=600&q=80',
};

const DISTINCT_IMAGE_POOL = [
  '/images/bg_beach.jpg',
  '/images/bg_basic_minimal.jpg',
  '/images/bg_mountain.jpg',
  '/images/bg_waterfall.jpg',
  '/images/bg_snow.jpg',
  '/images/bg_trekking.jpg',
];

function resolveDestinationPhoto(destination: string, index: number, existingHero?: string): string {
  // If user provided a custom image and it's NOT the generic camera placeholder
  if (existingHero && !existingHero.includes('regenerated_image_') && !existingHero.includes('1787112827232')) {
    return existingHero;
  }
  const clean = (destination || '').toLowerCase().trim();
  for (const [key, url] of Object.entries(DESTINATION_PHOTO_MAP)) {
    if (clean.includes(key)) {
      return url;
    }
  }
  // Guarantee unique distinct photo by index so no two cards ever look the same
  return DISTINCT_IMAGE_POOL[index % DISTINCT_IMAGE_POOL.length];
}

const DEFAULT_SHOWCASE_TRIPS: DisplayTripItem[] = [
  {
    destination: 'Bali',
    title: 'Coastal Surf & Coral Reefs',
    durationDays: 5,
    budget: '₹42,000',
    weather: '30°C ☀️',
    heroImage: '/images/bg_beach.jpg',
    colorCardRgb: '2, 132, 199',
    isUserTrip: false,
  },
  {
    destination: 'Kyoto',
    title: 'Historic Temples & Zen Gardens',
    durationDays: 6,
    budget: '₹58,000',
    weather: '22°C 🌸',
    heroImage: '/images/bg_basic_minimal.jpg',
    colorCardRgb: '13, 148, 136',
    isUserTrip: false,
  },
  {
    destination: 'Swiss Alps',
    title: 'Alpine Peaks & Panoramic Trains',
    durationDays: 7,
    budget: '₹95,000',
    weather: '16°C 🏔️',
    heroImage: '/images/bg_mountain.jpg',
    colorCardRgb: '99, 102, 241',
    isUserTrip: false,
  },
  {
    destination: 'Iceland',
    title: 'Cascading Falls & Volcanic Trails',
    durationDays: 5,
    budget: '₹82,000',
    weather: '12°C 🌊',
    heroImage: '/images/bg_waterfall.jpg',
    colorCardRgb: '16, 185, 129',
    isUserTrip: false,
  },
  {
    destination: 'Hokkaido',
    title: 'Powder Slopes & Hot Springs',
    durationDays: 6,
    budget: '₹68,000',
    weather: '-2°C ❄️',
    heroImage: '/images/bg_snow.jpg',
    colorCardRgb: '14, 165, 233',
    isUserTrip: false,
  },
  {
    destination: 'Patagonia',
    title: 'Glacial Fjords & Wild Ridges',
    durationDays: 8,
    budget: '₹1,15,000',
    weather: '14°C 🏕️',
    heroImage: '/images/bg_trekking.jpg',
    colorCardRgb: '245, 158, 11',
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
  const hoverVelocityRef = useRef(0);

  useEffect(() => {
    angleRef.current = rotationAngle;
  }, [rotationAngle]);

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

  // Build the 6 trips with destination-specific unique photos
  const userDisplayTrips: DisplayTripItem[] = (trips || []).slice(0, 6).map((t, idx) => {
    const dest = t.destination?.split(',')?.[0]?.trim() || 'My Journey';
    return {
      id: t.id,
      isUserTrip: true,
      destination: dest,
      title: t.title || `${dest} Itinerary`,
      durationDays: t.durationDays || 4,
      budget: `${t.currency || '₹'}${t.targetBudget?.toLocaleString() || '35,000'}`,
      weather: t.days?.[0]?.weatherForecast ? `${t.days[0].weatherForecast.temp} ${t.days[0].weatherForecast.icon}` : '26°C ☀️',
      heroImage: resolveDestinationPhoto(dest, idx, t.heroImage),
      colorCardRgb: themeRgb,
    };
  });

  const combinedTrips: DisplayTripItem[] = [...userDisplayTrips];
  for (let i = 0; combinedTrips.length < 6; i++) {
    const defaultItem = DEFAULT_SHOWCASE_TRIPS[i % DEFAULT_SHOWCASE_TRIPS.length];
    combinedTrips.push({
      ...defaultItem,
      heroImage: resolveDestinationPhoto(defaultItem.destination, combinedTrips.length, defaultItem.heroImage),
    });
  }
  const finalSixTrips = combinedTrips.slice(0, 6);

  // Auto-rotation & hover momentum loop
  useEffect(() => {
    let active = true;

    const tick = (time: number) => {
      if (!active) return;
      const deltaSec = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (!isDraggingRef.current) {
        // If hovered and mouse velocity exists, rotate accordingly
        if (Math.abs(hoverVelocityRef.current) > 0.05) {
          const newAngle = angleRef.current + hoverVelocityRef.current;
          angleRef.current = newAngle;
          setRotationAngle(newAngle);
          // Gently decay hover velocity
          hoverVelocityRef.current *= 0.92;
        } else if (!isInteracting) {
          // Normal ambient smooth rotation (~16 degrees per sec)
          const newAngle = (angleRef.current + 16 * deltaSec) % 360;
          angleRef.current = newAngle;
          setRotationAngle(newAngle);
        }
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

  // Mouse hover movement rotates carousel accordingly
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const diff = (e.clientX - centerX) / (rect.width / 2); // -1.0 to +1.0
    // Rotate smoothly in direction of cursor position
    hoverVelocityRef.current = diff * 0.9;
  };

  // Drag & touch swipe handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startAngleRef.current = angleRef.current;
    dragDistanceRef.current = 0;
    hoverVelocityRef.current = 0;
    setIsInteracting(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - startXRef.current;
    dragDistanceRef.current += Math.abs(deltaX);
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

  const handleCardClick = (item: DisplayTripItem, e: React.MouseEvent) => {
    e.stopPropagation();
    // Only open if user tapped/clicked rather than dragged
    if (dragDistanceRef.current > 7) return;

    if (item.isUserTrip && item.id && onOpenTrip) {
      onOpenTrip(item.id);
    } else {
      onStartPlanning(item.destination);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center relative select-none">
      {/* Top Header Tag */}
      <div className="flex items-center gap-1.5 mb-1 px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold shadow-md">
        <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300 animate-pulse" />
        <span>Recently Planned Journeys • 3D Carousel</span>
      </div>

      {/* 3D Rotating Carousel Container */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => {
          hoverVelocityRef.current = 0;
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
            const cardDegree = (360 / 6) * index;

            return (
              <div
                key={item.id || item.destination + index}
                onClick={(e) => handleCardClick(item, e)}
                onMouseEnter={() => setHoveredCardIdx(index)}
                onMouseLeave={() => setHoveredCardIdx(null)}
                className="rotating-carousel-card group"
                style={{
                  transform: `rotateY(${cardDegree}deg) translateZ(var(--translateZ))`,
                  // @ts-ignore
                  '--color-card': item.colorCardRgb || themeRgb,
                  zIndex: isHovered ? 12 : 2,
                }}
                title={`Click to open ${item.destination} itinerary`}
              >
                {/* 1. FRONT FACE (Facing Outwards) */}
                <div className="rotating-carousel-card-face rotating-carousel-card-front">
                  {/* Destination Hero Image */}
                  <img
                    src={item.heroImage}
                    alt={item.destination}
                    referrerPolicy="no-referrer"
                    className="rotating-carousel-img group-hover:scale-108 transition-transform duration-500 pointer-events-none"
                  />

                  {/* High-Contrast Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-black/20 pointer-events-none" />

                  {/* Top Badges (Compact Font Sizes) */}
                  <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
                    <span className="px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-black/70 backdrop-blur-md text-white border border-white/20 flex items-center gap-1 shadow-xs">
                      {item.isUserTrip ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      ) : (
                        <Calendar className="w-2.5 h-2.5 text-amber-300" />
                      )}
                      <span>{item.durationDays}D</span>
                    </span>

                    <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-black/70 backdrop-blur-md text-white border border-white/20 shadow-xs">
                      {item.weather}
                    </span>
                  </div>

                  {/* Bottom Info (Reduced Font Size & Crisp Layout) */}
                  <div className="absolute inset-x-0 bottom-0 p-2 sm:p-2.5 flex flex-col justify-end text-left pointer-events-none">
                    {item.isUserTrip && (
                      <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-0.5 mb-0.5">
                        <Sparkles className="w-2 h-2" /> Your Trip
                      </span>
                    )}
                    <h4 className="text-xs sm:text-sm font-extrabold text-white leading-tight drop-shadow-md truncate">
                      {item.destination}
                    </h4>
                    <p className="text-[8px] sm:text-[9px] text-slate-300 line-clamp-1 font-medium mt-0.5 opacity-90">
                      {item.title}
                    </p>

                    <div className="mt-1.5 pt-1.5 border-t border-white/15 flex items-center justify-between">
                      <span className="text-[9px] sm:text-[10px] font-extrabold text-white drop-shadow-xs">
                        {item.budget}
                      </span>
                      <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-white group-hover:bg-white group-hover:text-slate-950 transition-colors shadow-xs">
                        <ArrowRight className="w-2 h-2" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. BACK FACE (Facing Inwards - Displays Upright with 180deg so full rotation is always visible without mirrored text!) */}
                <div className="rotating-carousel-card-face rotating-carousel-card-back">
                  <img
                    src={item.heroImage}
                    alt={item.destination}
                    referrerPolicy="no-referrer"
                    className="rotating-carousel-img pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[0.5px] pointer-events-none" />

                  {/* Upright Center Badge for cards on the back of the cylinder */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                    <span className="text-[8px] font-bold text-white/80 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Compass className="w-2.5 h-2.5 text-sky-400" /> {item.durationDays} Days
                    </span>
                    <h5 className="text-xs font-black text-white drop-shadow-sm truncate max-w-full">
                      {item.destination}
                    </h5>
                    <span className="text-[8px] font-semibold text-sky-300 mt-1">
                      {item.budget}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Helper Text */}
      <div className="flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 text-[10px] text-white/80 font-medium">
        <Compass className="w-3 h-3 text-sky-400 animate-spin" style={{ animationDuration: '8s' }} />
        <span>Move cursor or drag to rotate • Click any card to open</span>
      </div>
    </div>
  );
};
