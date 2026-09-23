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

const memoryPhotoCache = new Map<string, string>();

function isGenericPlaceholder(url?: string): boolean {
  if (!url) return true;
  return (
    url.includes('1488646953014') || // Generic camera on map placeholder
    url.includes('regenerated_image') ||
    url.includes('1787112827232') ||
    url.includes('placeholder')
  );
}

function cleanDestinationName(destination: string): string {
  return (destination || '')
    .split(',')[0]
    .replace(/\(.*?\)/g, '')
    .replace(/["'’]/g, '')
    .trim();
}

export function getInitialPhotoFallback(destination: string): string {
  const clean = cleanDestinationName(destination);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(`${clean} travel landmark scenic photograph cinematic 4k`)}?width=600&height=800&nologo=true`;
}

/**
 * Dynamically fetches authentic high-res photos for any destination using
 * Wikipedia REST APIs, Wikimedia Commons, and AI image generation fallback.
 * Results are cached in memory and localStorage for zero-latency instant display.
 */
export async function fetchDestinationPhoto(destination: string): Promise<string> {
  const clean = cleanDestinationName(destination);
  if (!clean) return '/images/bg_beach.jpg';

  const cacheKey = `tripwise_ai_photo_${clean.toLowerCase().replace(/\s+/g, '_')}`;

  if (memoryPhotoCache.has(cacheKey)) {
    return memoryPhotoCache.get(cacheKey)!;
  }

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached && !isGenericPlaceholder(cached)) {
      memoryPhotoCache.set(cacheKey, cached);
      return cached;
    }
  } catch {}

  // 1. Wikipedia Summary REST API (unthrottled, public CORS enabled)
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean.replace(/\s+/g, '_'))}`);
    if (res.ok) {
      const data = await res.json();
      const img = data.originalimage?.source || data.thumbnail?.source;
      if (img && typeof img === 'string' && img.startsWith('http') && !img.endsWith('.svg')) {
        memoryPhotoCache.set(cacheKey, img);
        try { localStorage.setItem(cacheKey, img); } catch {}
        return img;
      }
    }
  } catch {}

  // 2. Wikipedia Search Generator API for multi-word or compound queries
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(clean + ' tourism')}&gsrlimit=2&prop=pageimages&pithumbsize=1000&format=json&origin=*`;
    const res = await fetch(searchUrl);
    if (res.ok) {
      const data = await res.json();
      const pages = data.query?.pages;
      if (pages) {
        for (const page of Object.values(pages) as any[]) {
          const src = page.thumbnail?.source;
          if (src && typeof src === 'string' && src.startsWith('http') && !src.endsWith('.svg')) {
            memoryPhotoCache.set(cacheKey, src);
            try { localStorage.setItem(cacheKey, src); } catch {}
            return src;
          }
        }
      }
    }
  } catch {}

  // 3. Backend Real Photo API
  try {
    const res = await fetch(`/api/places/real-photo?title=${encodeURIComponent(clean)}&destination=${encodeURIComponent(clean)}&category=landmark`);
    if (res.ok) {
      const data = await res.json();
      if (data.photoUrl && !isGenericPlaceholder(data.photoUrl)) {
        memoryPhotoCache.set(cacheKey, data.photoUrl);
        try { localStorage.setItem(cacheKey, data.photoUrl); } catch {}
        return data.photoUrl;
      }
    }
  } catch {}

  // 4. Dynamic AI-Generated Travel Photography (Pollinations AI)
  const aiImageUrl = getInitialPhotoFallback(clean);
  memoryPhotoCache.set(cacheKey, aiImageUrl);
  try { localStorage.setItem(cacheKey, aiImageUrl); } catch {}
  return aiImageUrl;
}

const DEFAULT_SHOWCASE_TRIPS: DisplayTripItem[] = [
  {
    destination: 'Bali',
    title: 'Coastal Surf & Coral Reefs',
    durationDays: 5,
    budget: '₹42,000',
    weather: '30°C ☀️',
    heroImage: '',
    colorCardRgb: '2, 132, 199',
    isUserTrip: false,
  },
  {
    destination: 'Kyoto',
    title: 'Historic Temples & Zen Gardens',
    durationDays: 6,
    budget: '₹58,000',
    weather: '22°C 🌸',
    heroImage: '',
    colorCardRgb: '13, 148, 136',
    isUserTrip: false,
  },
  {
    destination: 'Swiss Alps',
    title: 'Alpine Peaks & Panoramic Trains',
    durationDays: 7,
    budget: '₹95,000',
    weather: '16°C 🏔️',
    heroImage: '',
    colorCardRgb: '99, 102, 241',
    isUserTrip: false,
  },
  {
    destination: 'Iceland',
    title: 'Cascading Falls & Volcanic Trails',
    durationDays: 5,
    budget: '₹82,000',
    weather: '12°C 🌊',
    heroImage: '',
    colorCardRgb: '16, 185, 129',
    isUserTrip: false,
  },
  {
    destination: 'Hokkaido',
    title: 'Powder Slopes & Hot Springs',
    durationDays: 6,
    budget: '₹68,000',
    weather: '-2°C ❄️',
    heroImage: '',
    colorCardRgb: '14, 165, 233',
    isUserTrip: false,
  },
  {
    destination: 'Patagonia',
    title: 'Glacial Fjords & Wild Ridges',
    durationDays: 8,
    budget: '₹1,15,000',
    weather: '14°C 🏕️',
    heroImage: '',
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

  // Dynamic AI & API photo storage per destination
  const [dynamicPhotos, setDynamicPhotos] = useState<Record<string, string>>({});

  // Build the 6 trips dynamically
  const userDisplayTrips: DisplayTripItem[] = (trips || []).slice(0, 6).map((t) => {
    const dest = cleanDestinationName(t.destination || 'My Journey');
    return {
      id: t.id,
      isUserTrip: true,
      destination: dest,
      title: t.title || `${dest} Itinerary`,
      durationDays: t.durationDays || 4,
      budget: `${t.currency || '₹'}${t.targetBudget?.toLocaleString() || '35,000'}`,
      weather: t.days?.[0]?.weatherForecast ? `${t.days[0].weatherForecast.temp} ${t.days[0].weatherForecast.icon}` : '26°C ☀️',
      heroImage: t.heroImage && !isGenericPlaceholder(t.heroImage) ? t.heroImage : '',
      colorCardRgb: themeRgb,
    };
  });

  const combinedTrips: DisplayTripItem[] = [...userDisplayTrips];
  for (let i = 0; combinedTrips.length < 6; i++) {
    const defaultItem = DEFAULT_SHOWCASE_TRIPS[i % DEFAULT_SHOWCASE_TRIPS.length];
    combinedTrips.push({
      ...defaultItem,
    });
  }
  const finalSixTrips = combinedTrips.slice(0, 6);

  // Dynamically fetch authentic AI / Wikimedia photos for each destination
  useEffect(() => {
    let isCancelled = false;

    finalSixTrips.forEach((item) => {
      const dest = item.destination;
      if (!dest) return;

      // If user provided a genuine heroImage, use it directly
      if (item.heroImage && !isGenericPlaceholder(item.heroImage)) {
        if (!dynamicPhotos[dest]) {
          setDynamicPhotos((prev) => ({ ...prev, [dest]: item.heroImage }));
        }
        return;
      }

      // Fetch authentic destination photo
      fetchDestinationPhoto(dest).then((url) => {
        if (!isCancelled && url) {
          setDynamicPhotos((prev) => {
            if (prev[dest] === url) return prev;
            return { ...prev, [dest]: url };
          });
        }
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [trips]);

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
            const cardPhoto = dynamicPhotos[item.destination] || (item.heroImage && !isGenericPlaceholder(item.heroImage) ? item.heroImage : getInitialPhotoFallback(item.destination));

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
                    src={cardPhoto}
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
                    src={cardPhoto}
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
