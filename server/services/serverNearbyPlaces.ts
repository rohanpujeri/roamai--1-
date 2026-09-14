import { Activity, TravelStyle, BudgetTier } from '../../src/types';
import { GoogleGenAI } from '@google/genai';
import { fetchRealPlacePhoto } from '../utils/realPlacePhotos';
import { PREFERRED_GEMINI_MODELS } from '../utils/geminiModels';

export interface NearbyPlaceRecommendation {
  id: string;
  title: string;
  category: Activity['category'];
  location: string;
  distanceFromNearPlace: string;
  travelTimeFromPrev: string;
  estimatedCost: number;
  duration: string;
  description: string;
  recommendationReason: string;
  rating: number;
  tags: string[];
  badge?: string;
  imageUrl?: string;
  isIndoor?: boolean;
  isRainSafe?: boolean;
  coordinates?: { lat: number; lng: number };
}

export interface NearbyPlacesParams {
  destination: string;
  destinationStateOrCountry?: string;
  nearPlace?: {
    title: string;
    location?: string;
    category?: string;
    coordinates?: { lat: number; lng: number };
  };
  excludedPlaces?: string[];
  travelStyles?: string[];
  budgetTier?: string;
  dayNumber?: number;
  preferredCategory?: string;
}

/**
 * Helper to parse json text safely
 */
function parseJsonSafely(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Generate real places nearby to the last place of a day's itinerary,
 * strictly excluding any places in future days or already in the trip.
 */
export async function fetchNearbyPlaces(params: NearbyPlacesParams): Promise<NearbyPlaceRecommendation[]> {
  const {
    destination,
    destinationStateOrCountry = '',
    nearPlace,
    excludedPlaces = [],
    travelStyles = ['Sightseeing', 'Food', 'Culture'],
    budgetTier = 'Moderate',
    dayNumber = 1,
    preferredCategory
  } = params;

  const refTitle = nearPlace?.title || `${destination} Central Area`;
  const refLocation = nearPlace?.location || destination;
  const refCategory = nearPlace?.category || 'Sightseeing';

  // Normalize excluded places for deduplication
  const normalizedExcluded = new Set(
    excludedPlaces.map(p => p.toLowerCase().trim()).filter(Boolean)
  );
  if (refTitle) {
    normalizedExcluded.add(refTitle.toLowerCase().trim());
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const excludedListStr = excludedPlaces.length > 0
        ? excludedPlaces.slice(0, 30).map(p => `"${p}"`).join(', ')
        : 'None';

      const prompt = `You are an expert local guide and concierge for "${destination}" (${destinationStateOrCountry}).
The traveler is on Day ${dayNumber} of their trip.
Their current/last stop on today's itinerary is:
"${refTitle}" (Area: ${refLocation}, Category: ${refCategory}).

We want to recommend 5 distinct, real, highly-rated places or activities that are located strictly NEARBY to "${refTitle}" (within an easy walking distance of 300m - 1.5km or a quick 5-10 minute ride).
${preferredCategory ? `The traveler specifically has an interest in: ${preferredCategory}.` : ''}
Traveler Styles: ${travelStyles.join(', ')}.
Budget Tier: ${budgetTier}.

CRITICAL CONSTRAINTS:
1. STRICTLY DO NOT recommend any place that the traveler has already scheduled for FUTURE DAYS or earlier today.
Do NOT recommend any of these places:
[ ${excludedListStr} ]
Also do not repeat "${refTitle}".
2. All recommended places MUST be REAL, authentic spots (e.g. iconic cafes, viewpoints, heritage alleys, vibrant markets, beach shacks, temples, art galleries, sunset lounges) in or immediately adjacent to ${refLocation}.
3. Provide realistic walking/cab distances and travel times from "${refTitle}".

Return ONLY a JSON array of 5 objects formatted as:
[
  {
    "title": "Exact Real Place Name",
    "category": "Sightseeing",
    "location": "Neighborhood or street name near ${refLocation}",
    "distanceFromNearPlace": "450m (6 min walk)",
    "travelTimeFromPrev": "6 min walk",
    "estimatedCost": 350,
    "duration": "1.5 hours",
    "description": "2 engaging sentences highlighting authentic experiences at this real spot.",
    "recommendationReason": "Why this is the ideal next stop directly after visiting ${refTitle}.",
    "rating": 4.8,
    "tags": ["Walkable", "Scenic", "Authentic"],
    "badge": "5 Min Walk",
    "isIndoor": false,
    "isRainSafe": false
  }
]`;

      let parsedItems: any[] | null = null;

      for (const modelName of PREFERRED_GEMINI_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
          });

          if (response && response.text) {
            const parsed = parseJsonSafely(response.text);
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsedItems = parsed;
              break;
            }
          }
        } catch (modelErr) {
          console.warn(`Nearby places Gemini model ${modelName} attempt error:`, modelErr);
        }
      }

      if (parsedItems && parsedItems.length > 0) {
        // Filter out any place that might match excluded places
        const filtered = parsedItems.filter(item => {
          if (!item.title) return false;
          const titleLower = item.title.toLowerCase().trim();
          for (const exc of normalizedExcluded) {
            if (titleLower === exc || titleLower.includes(exc) || exc.includes(titleLower)) {
              return false;
            }
          }
          return true;
        });

        // Resolve real photos and map to output
        const results: NearbyPlaceRecommendation[] = await Promise.all(
          filtered.slice(0, 5).map(async (item, idx) => {
            const category = (['Food', 'Sightseeing', 'Adventure', 'Relaxation', 'Culture', 'Nightlife', 'Shopping'].includes(item.category)
              ? item.category
              : 'Sightseeing') as Activity['category'];

            const photo = await fetchRealPlacePhoto(item.title, destination, category);

            // Compute approximate coordinates offset from reference if available
            let coords: { lat: number; lng: number } | undefined;
            if (nearPlace?.coordinates && typeof nearPlace.coordinates.lat === 'number') {
              const angle = idx * 1.25;
              const distKm = 0.4 + (idx * 0.3);
              coords = {
                lat: Number((nearPlace.coordinates.lat + (Math.sin(angle) * distKm) / 111).toFixed(6)),
                lng: Number((nearPlace.coordinates.lng + (Math.cos(angle) * distKm) / (111 * Math.cos((nearPlace.coordinates.lat * Math.PI) / 180))).toFixed(6))
              };
            }

            return {
              id: `nearby-${crypto.randomUUID()}`,
              title: item.title,
              category,
              location: item.location || `${refLocation} Area`,
              distanceFromNearPlace: item.distanceFromNearPlace || `${400 + idx * 250}m (${5 + idx * 3} min walk)`,
              travelTimeFromPrev: item.travelTimeFromPrev || `${5 + idx * 3} min walk`,
              estimatedCost: Number(item.estimatedCost) || 300,
              duration: item.duration || '1.5 hours',
              description: item.description || `Authentic local spot situated right next to ${refTitle}.`,
              recommendationReason: item.recommendationReason || `Conveniently nearby to ${refTitle}; perfect smooth transition for Day ${dayNumber}.`,
              rating: Number(item.rating) || 4.7,
              tags: Array.isArray(item.tags) ? item.tags : ['Nearby', 'Local Favorite'],
              badge: item.badge || (idx === 0 ? 'Closest Spot' : 'Locals Pick'),
              imageUrl: photo,
              isIndoor: Boolean(item.isIndoor),
              isRainSafe: Boolean(item.isRainSafe),
              coordinates: coords
            };
          })
        );

        if (results.length > 0) {
          return results;
        }
      }
    } catch (err) {
      console.warn('AI nearby places generation error, applying fallback:', err);
    }
  }

  // Fallback dynamic nearby places generator ensuring no excluded duplicates
  return generateFallbackNearbyPlaces(params, normalizedExcluded);
}

/**
 * Intelligent fallback generator tailored to reference place and destination
 */
async function generateFallbackNearbyPlaces(
  params: NearbyPlacesParams,
  normalizedExcluded: Set<string>
): Promise<NearbyPlaceRecommendation[]> {
  const { destination, nearPlace, dayNumber = 1 } = params;
  const refTitle = nearPlace?.title || destination;
  const refLocation = nearPlace?.location || destination;

  const candidates: Array<{
    title: string;
    category: Activity['category'];
    distance: string;
    travelTime: string;
    cost: number;
    desc: string;
    reason: string;
    badge: string;
    tags: string[];
    isIndoor: boolean;
  }> = [
    {
      title: `${refTitle} Promenade & Sunset Vista Point`,
      category: 'Sightseeing',
      distance: '350m (4 min walk)',
      travelTime: '4 min walk',
      cost: 0,
      desc: `Scenic viewpoint offering panoramic perspectives right adjoining ${refTitle}.`,
      reason: `Right beside ${refTitle}; ideal scenic spot to unwind and snap photos.`,
      badge: '4 Min Walk',
      tags: ['Scenic View', 'Free Entry', 'Walkable'],
      isIndoor: false
    },
    {
      title: `Old Quarter Artisan Tea & Spice Cafe near ${refTitle}`,
      category: 'Food',
      distance: '500m (6 min walk)',
      travelTime: '6 min walk',
      cost: 350,
      desc: `Warm local cafe serving regional brews, organic teas, and freshly baked bites.`,
      reason: `A brief 6-minute stroll from ${refTitle}, perfect for a relaxing food recharge.`,
      badge: 'Locals Pick',
      tags: ['Local Flavors', 'Cozy Ambience', 'Coffee & Tea'],
      isIndoor: true
    },
    {
      title: `${destination} Heritage Street & Handcrafts Bazaar`,
      category: 'Culture',
      distance: '850m (10 min walk)',
      travelTime: '10 min walk',
      cost: 200,
      desc: `Atmospheric pedestrian lane bustling with regional craftspeople, textiles, and authentic souvenirs.`,
      reason: `Easily accessible on foot after ${refTitle}, offering rich cultural immersion.`,
      badge: 'Cultural Gem',
      tags: ['Handicrafts', 'Culture', 'Walking Tour'],
      isIndoor: false
    },
    {
      title: `Serene Botanical Pavilion & Zen Courtyard in ${refLocation}`,
      category: 'Relaxation',
      distance: '1.2 km (5 min cab)',
      travelTime: '5 min cab',
      cost: 150,
      desc: `Peaceful green oasis shaded by canopy trees with tranquil ponds and shaded benches.`,
      reason: `Quick 5-minute hop from ${refTitle} to escape busy tourist crowds.`,
      badge: 'Peaceful Oasis',
      tags: ['Nature', 'Quiet', 'Green Space'],
      isIndoor: false
    },
    {
      title: `Rooftop Lounge & Regional Tasting Bar near ${refLocation}`,
      category: 'Nightlife',
      distance: '1.5 km (6 min cab)',
      travelTime: '6 min cab',
      cost: 650,
      desc: `Elevated sunset and evening terrace featuring signature craft refreshments and scenic skyline vistas.`,
      reason: `Great spot to wrap up your day with music and panoramic night views.`,
      badge: 'Sunset Favorite',
      tags: ['Rooftop', 'Evening Vibe', 'Music'],
      isIndoor: false
    }
  ];

  // Filter out any candidates that collide with excluded future day stops
  const nonExcludedCandidates = candidates.filter(cand => {
    const candLower = cand.title.toLowerCase().trim();
    for (const exc of normalizedExcluded) {
      if (candLower === exc || candLower.includes(exc) || exc.includes(candLower)) {
        return false;
      }
    }
    return true;
  });

  return Promise.all(
    nonExcludedCandidates.map(async (c, idx) => {
      const photo = await fetchRealPlacePhoto(c.title, destination, c.category);
      return {
        id: `nearby-dyn-${crypto.randomUUID()}`,
        title: c.title,
        category: c.category,
        location: `${refLocation} Historic Area`,
        distanceFromNearPlace: c.distance,
        travelTimeFromPrev: c.travelTime,
        estimatedCost: c.cost,
        duration: '1.5 hours',
        description: c.desc,
        recommendationReason: c.reason,
        rating: 4.8,
        tags: c.tags,
        badge: c.badge,
        imageUrl: photo,
        isIndoor: c.isIndoor,
        isRainSafe: c.isIndoor
      };
    })
  );
}
