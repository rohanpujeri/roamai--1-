import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Calendar, ArrowRight, Compass, ChevronLeft, ChevronRight } from 'lucide-react';
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

// Destination-specific curated photos so EVERY destination has its own unique, iconic image
const DESTINATION_PHOTO_MAP: { [key: string]: string } = {
  ladakh: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=600&q=80',
  leh: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=600&q=80',
  jaipur: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80',
  rajasthan: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80',
  bali: '/images/bg_beach.jpg',
  beach: '/images/bg_beach.jpg',
  goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
  manali: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=600&q=80',
  kerala: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80',
  paris: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
  france: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
  kyoto: '/images/bg_basic_minimal.jpg',
  tokyo: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
  japan: '/images/bg_basic_minimal.jpg',
  swiss: '/images/bg_mountain.jpg',
  alps: '/images/bg_mountain.jpg',
  switzerland: '/images/bg_mountain.jpg',
  dolomites: '/images/bg_mountain.jpg',
  iceland: '/images/bg_waterfall.jpg',
  waterfall: '/images/bg_waterfall.jpg',
  norway: '/images/bg_waterfall.jpg',
  hokkaido: '/images/bg_snow.jpg',
  snow: '/images/bg_snow.jpg',
  patagonia: '/images/bg_trekking.jpg',
  trek: '/images/bg_trekking.jpg',
  rome: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80',
  italy: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80',
  santorini: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80',
  greece: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80',
  dubai: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80',
  uae: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80',
  london: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
  uk: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
  'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=600&q=80',
  maldives: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=600&q=80',
};

const DISTINCT_IMAGE_POOL = [
  'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=600&q=80', // Ladakh
  'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80', // Jaipur
  '/images/bg_beach.jpg', // Bali
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80', // Paris
  '/images/bg_basic_minimal.jpg', // Kyoto
  '/images/bg_mountain.jpg', // Swiss Alps
  '/images/bg_waterfall.jpg', // Iceland
  '/images/bg_snow.jpg', // Hokkaido
  '/images/bg_trekking.jpg', // Patagonia
  'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80', // Rome
  'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80', // Santorini
  'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80', // Dubai
];

function isGenericPlaceholder(url?: string): boolean {
  if (!url) return true;
  return (
    url.includes('1488646953014') || // Generic camera on map placeholder
    url.includes('regenerated_image') || // Generated placeholder
    url.includes('1787112827232') ||
    url.includes('placeholder')
  );
}

function resolveDestinationPhoto(destination: string, index: number, existingHero?: string): string {
  const clean = (destination || '').toLowerCase().trim();

  // First: Check if the destination matches a known world/Indian destination
  for (const [key, url] of Object.entries(DESTINATION_PHOTO_MAP)) {
    if (clean.includes(key)) {
      return url;
    }
  }

  // Second: If user provided a custom image that is NOT the generic camera placeholder
  if (existingHero && !isGenericPlaceholder(existingHero)) {
    return existingHero;
  }

  // Third: Guarantee unique distinct photo by index so no two cards ever look the same
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
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const angleRef = useRef<number>(0);
  const velocityRef = useRef<number>(18); // Default ambient rotation speed (~18 deg/s)
  const isDraggingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const lastXRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dragDistanceRef = useRef<number>(0);
  const ambientSteerRef = useRef<number>(0);
  const isHoveredCardRef = useRef<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);

  const renderTransform = (angle: number) => {
    if (innerRef.current) {
      innerRef.current.style.transform = `perspective(var(--perspective)) rotateX(var(--rotateX)) rotateY(${angle}deg)`;
    }
  };

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

  // Silky-Smooth GPU Animation Loop with Inertia Physics (Zero React Re-renders!)
  useEffect(() => {
    let active = true;
    let lastFrameTime = performance.now();

    const tick = (now: number) => {
      if (!active) return;
      const deltaSec = Math.min((now - lastFrameTime) / 1000, 0.06);
      lastFrameTime = now;

      if (!isDraggingRef.current) {
        // Target ambient rotation speed
        const baseAmbient = isHoveredCardRef.current ? 4 : (18 + ambientSteerRef.current);

        // Coasting with friction towards base ambient speed
        if (Math.abs(velocityRef.current) > Math.abs(baseAmbient) + 1) {
          velocityRef.current *= 0.94; // Smooth coasting decay
        } else {
          velocityRef.current = velocityRef.current * 0.85 + baseAmbient * 0.15;
        }

        angleRef.current = (angleRef.current + velocityRef.current * deltaSec) % 360;
        renderTransform(angleRef.current);
      }

      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    renderTransform(angleRef.current);
    animFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  // Mouse hover steering on desktop
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const offset = (e.clientX - centerX) / (rect.width / 2); // -1.0 to +1.0
    ambientSteerRef.current = offset * 24;
  };

  // High-performance pointer / drag / touch handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    dragDistanceRef.current = 0;
    velocityRef.current = 0; // Hold rotation firmly during grab

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const now = performance.now();
    const dt = Math.max((now - lastTimeRef.current) / 1000, 0.003);
    const dx = e.clientX - lastXRef.current;
    dragDistanceRef.current += Math.abs(dx);

    // Effortless 1:1 rotation (0.75 deg per px)
    angleRef.current = (angleRef.current + dx * 0.75) % 360;
    renderTransform(angleRef.current);

    // Track instantaneous throw velocity
    const instantVelocity = (dx * 0.75) / dt;
    velocityRef.current = velocityRef.current * 0.3 + instantVelocity * 0.7;

    lastXRef.current = e.clientX;
    lastTimeRef.current = now;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // Clamp flick velocity to prevent disorienting hyper-spin
    if (Math.abs(velocityRef.current) > 320) {
      velocityRef.current = Math.sign(velocityRef.current) * 320;
    }
  };

  // Nudge carousel by 60° (one full card orbit)
  const nudgeRotation = (direction: -1 | 1) => {
    velocityRef.current = direction * 150;
  };

  const handleCardClick = (item: DisplayTripItem, e: React.MouseEvent) => {
    e.stopPropagation();
    // Only open if user tapped/clicked rather than dragged/swiped
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
      <div className="flex items-center gap-1.5 mb-1 px-2.5 py-0.5 rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold shadow-md">
        <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300 animate-pulse" />
        <span>Recently Planned Journeys • 3D Orbit</span>
      </div>

      {/* 3D Rotating Carousel Container with Hover Steering & Touch Swipe */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseLeave={() => {
          ambientSteerRef.current = 0;
        }}
        className="rotating-carousel-wrapper"
        style={{
          // @ts-ignore
          '--quantity': 6,
          '--color-card': themeRgb,
        }}
      >
        <div 
          ref={innerRef}
          className="rotating-carousel-inner"
        >
          {finalSixTrips.map((item, index) => {
            const isHovered = hoveredCardIdx === index;
            const cardDegree = (360 / 6) * index;

            return (
              <div
                key={item.id || item.destination + index}
                onClick={(e) => handleCardClick(item, e)}
                onMouseEnter={() => {
                  setHoveredCardIdx(index);
                  isHoveredCardRef.current = true;
                }}
                onMouseLeave={() => {
                  setHoveredCardIdx(null);
                  isHoveredCardRef.current = false;
                }}
                className="rotating-carousel-card group"
                style={{
                  transform: `rotateY(${cardDegree}deg) translateZ(var(--translateZ))`,
                  // @ts-ignore
                  '--color-card': item.colorCardRgb || themeRgb,
                  zIndex: isHovered ? 15 : 2,
                }}
                title={`Click to open ${item.destination} itinerary`}
              >
                {/* 1. FRONT FACE (Facing Outwards towards Viewer) */}
                <div className="rotating-carousel-card-face rotating-carousel-card-front">
                  {/* Destination Hero Image */}
                  <img
                    src={item.heroImage}
                    alt={item.destination}
                    referrerPolicy="no-referrer"
                    className="rotating-carousel-img group-hover:scale-108 transition-transform duration-500 pointer-events-none"
                  />

                  {/* High-Contrast Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/25 to-black/25 pointer-events-none" />

                  {/* Top Badges (Reduced Font Size) */}
                  <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
                    <span className="px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-black/75 backdrop-blur-md text-white border border-white/20 flex items-center gap-1 shadow-xs">
                      {item.isUserTrip ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      ) : (
                        <Calendar className="w-2.5 h-2.5 text-amber-300" />
                      )}
                      <span>{item.durationDays}D</span>
                    </span>

                    <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-black/75 backdrop-blur-md text-white border border-white/20 shadow-xs">
                      {item.weather}
                    </span>
                  </div>

                  {/* Bottom Info (Reduced Font Size & Tight Clean Layout) */}
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

                {/* 2. BACK FACE (Facing Inwards - Displays Upright with 180deg so the FULL 360 circle is always visible!) */}
                <div className="rotating-carousel-card-face rotating-carousel-card-back">
                  <img
                    src={item.heroImage}
                    alt={item.destination}
                    referrerPolicy="no-referrer"
                    className="rotating-carousel-img pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[0.5px] pointer-events-none" />

                  {/* Upright Center Badge for cards on the back of the cylinder */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                    <span className="text-[8px] font-bold text-white/90 uppercase tracking-widest mb-1 flex items-center gap-1 drop-shadow">
                      <Compass className="w-2.5 h-2.5 text-sky-400" /> {item.durationDays} Days
                    </span>
                    <h5 className="text-xs font-black text-white drop-shadow-md truncate max-w-full">
                      {item.destination}
                    </h5>
                    <span className="text-[8px] font-bold text-sky-300 mt-1 drop-shadow">
                      {item.budget}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Helper Text & Quick-Rotate Arrows */}
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            nudgeRotation(-1);
          }}
          className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 active:scale-90 text-white/90 border border-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-md"
          title="Rotate previous card"
          aria-label="Previous trip"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-[10px] text-white/95 font-medium shadow-sm">
          <Compass className="w-3 h-3 text-sky-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span>Swipe or tap arrows to rotate • Tap card to view</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            nudgeRotation(1);
          }}
          className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 active:scale-90 text-white/90 border border-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-md"
          title="Rotate next card"
          aria-label="Next trip"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
