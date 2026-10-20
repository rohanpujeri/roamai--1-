import { TrailReel } from './sharedTrailsService';
import { resolvePlaceImage } from '../utils/placeImages';

export interface TrendingItinerary {
  id: string;
  title: string;
  destination: string;
  destinationSubtitle?: string;
  durationDays: number;
  estimatedBudget: string;
  heroImage: string;
  tags: string[];
  vibe: string;
  highlights: string[];
  description: string;
  sourceBadge?: 'Trending on Trails' | 'AI Trending' | 'My Trip';
  trailCount?: number;
}

const CACHE_KEY = 'roamai_ai_trending_itineraries_v2';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

interface CachePayload {
  timestamp: number;
  itineraries: TrendingItinerary[];
}

/**
 * Extract active destinations from the user/community trails
 */
export function extractActiveTrailDestinations(trails: TrailReel[]): { destination: string; count: number; heroImage?: string }[] {
  const map = new Map<string, { count: number; heroImage?: string }>();

  trails.forEach((t) => {
    const raw = (t.destination || '').trim();
    if (!raw || raw.toLowerCase() === 'everywhere' || raw.toLowerCase() === 'travel destination') {
      return;
    }
    const key = raw.toLowerCase();
    const hero = t.mediaUrl || t.posterUrl;
    if (map.has(key)) {
      const item = map.get(key)!;
      item.count += 1;
      if (!item.heroImage && hero) item.heroImage = hero;
    } else {
      map.set(key, { count: 1, heroImage: hero });
    }
  });

  return Array.from(map.entries())
    .map(([d, val]) => ({
      destination: d.replace(/\b\w/g, (c) => c.toUpperCase()),
      count: val.count,
      heroImage: val.heroImage
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get cached trending itineraries if available and valid
 */
export function getCachedTrendingItineraries(): TrendingItinerary[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachePayload = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.itineraries) && parsed.itineraries.length > 0) {
      if (Date.now() - (parsed.timestamp || 0) < CACHE_TTL_MS) {
        return parsed.itineraries;
      }
    }
  } catch {}
  return null;
}

/**
 * Save trending itineraries to cache
 */
function saveTrendingItinerariesToCache(itineraries: TrendingItinerary[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachePayload = {
      timestamp: Date.now(),
      itineraries
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

/**
 * Fetch dynamic AI-driven and Trails-driven trending itineraries
 */
export async function fetchDynamicTrendingItineraries(
  trails: TrailReel[],
  forceRefresh = false
): Promise<TrendingItinerary[]> {
  // 1. Check local cache first unless forceRefresh is requested
  if (!forceRefresh) {
    const cached = getCachedTrendingItineraries();
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  const activeTrails = extractActiveTrailDestinations(trails);
  const trailDestinations = activeTrails.map((t) => t.destination);

  // 2. Call backend AI endpoint
  try {
    const res = await fetch('/api/ai/trending-itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trailDestinations,
        forceRefresh
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const enriched: TrendingItinerary[] = data.map((item: any, idx: number) => {
          const dest = item.destination || 'Scenic Travel';
          const matchedTrail = activeTrails.find(
            (t) => t.destination.toLowerCase() === dest.toLowerCase() || dest.toLowerCase().includes(t.destination.toLowerCase())
          );
          const validTrailHero = matchedTrail?.heroImage && !matchedTrail.heroImage.startsWith('blob:') ? matchedTrail.heroImage : null;
          const validItemHero = item.heroImage && !item.heroImage.startsWith('blob:') ? item.heroImage : null;
          const hero = validItemHero || validTrailHero || resolvePlaceImage(dest, item.tags?.[0] || 'Nature', '', dest);

          return {
            id: item.id || `trend-ai-${Date.now()}-${idx}`,
            title: item.title || `${dest} Journey`,
            destination: dest,
            destinationSubtitle: item.destinationSubtitle || (matchedTrail ? 'Trending on Trails' : 'AI Discovered Trend'),
            durationDays: Number(item.durationDays) || 5,
            estimatedBudget: item.estimatedBudget || '₹34,000',
            heroImage: hero,
            tags: Array.isArray(item.tags) ? item.tags : ['Trending', 'Explore'],
            vibe: item.vibe || 'Scenic & Inspiring',
            highlights: Array.isArray(item.highlights) ? item.highlights : ['Iconic viewpoints', 'Local food & culture', 'Scenic exploration'],
            description: item.description || `Discover the trending allure of ${dest} with curated AI itineraries.`,
            sourceBadge: item.sourceBadge || (matchedTrail ? 'Trending on Trails' : 'AI Trending'),
            trailCount: matchedTrail?.count
          };
        });

        saveTrendingItinerariesToCache(enriched);
        return enriched;
      }
    }
  } catch (err) {
    console.warn('[trendingItinerariesService] Server API error, falling back to dynamic generation:', err);
  }

  // 3. Fallback: dynamically generate smart itineraries anchored to active trails & viral travel trends
  const targetDests = activeTrails.length > 0
    ? activeTrails.slice(0, 6)
    : [
        { destination: 'Goa, India', count: 0, heroImage: undefined },
        { destination: 'Manali, Himachal Pradesh', count: 0, heroImage: undefined },
        { destination: 'Kyoto, Japan', count: 0, heroImage: undefined },
        { destination: 'Bali, Indonesia', count: 0, heroImage: undefined },
        { destination: 'Swiss Alps, Switzerland', count: 0, heroImage: undefined },
        { destination: 'Amalfi Coast, Italy', count: 0, heroImage: undefined }
      ];

  const dynamicFallback: TrendingItinerary[] = targetDests.map((t, idx) => {
    const isTrail = t.count > 0;
    const dest = t.destination;
    const hero = t.heroImage || resolvePlaceImage(dest, 'Nature', '', dest);

    return {
      id: `dynamic-trend-${Date.now()}-${idx}`,
      title: `${dest.split(',')[0]} Scenic Discovery`,
      destination: dest,
      destinationSubtitle: isTrail ? 'Community Trail Hotspot' : 'AI Curated Escape',
      durationDays: 4 + (idx % 3),
      estimatedBudget: `₹${(26000 + (idx * 8500)).toLocaleString()}`,
      heroImage: hero,
      tags: isTrail ? ['Trails Hotspot', 'Community', 'Viral'] : ['AI Trending', 'Scenic', 'Wanderlust'],
      vibe: isTrail ? 'Community Spotlight' : 'Seasonal Trend',
      highlights: [
        `Explore iconic vistas & viewpoints around ${dest.split(',')[0]}`,
        `Experience authentic regional cuisine & lively local markets`,
        `Hidden spots highlighted by travel creators`
      ],
      description: `Currently trending ${isTrail ? `on Roamai Trails with ${t.count} shared reels` : 'across travel feeds'} with curated dynamic routes.`,
      sourceBadge: isTrail ? 'Trending on Trails' : 'AI Trending',
      trailCount: t.count > 0 ? t.count : undefined
    };
  });

  saveTrendingItinerariesToCache(dynamicFallback);
  return dynamicFallback;
}
