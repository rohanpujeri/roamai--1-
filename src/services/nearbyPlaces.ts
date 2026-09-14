import { Activity, TravelStyle, BudgetTier } from '../types';

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

export interface NearbyPlacesRequest {
  destination: string;
  destinationStateOrCountry?: string;
  nearPlace?: {
    title: string;
    location?: string;
    category?: string;
    coordinates?: { lat: number; lng: number };
  };
  excludedPlaces?: string[];
  travelStyles?: TravelStyle[];
  budgetTier?: BudgetTier;
  dayNumber?: number;
  preferredCategory?: string;
}

/**
 * Fetch AI nearby places recommendations for a specific day, anchored to the last activity
 * and strictly avoiding any places in future days or current itinerary.
 */
export async function fetchNearbyRecommendations(
  params: NearbyPlacesRequest
): Promise<NearbyPlaceRecommendation[]> {
  try {
    const response = await fetch('/api/ai/nearby-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        // Double-check client side filtering against excluded places
        const excludedSet = new Set(
          (params.excludedPlaces || []).map(p => p.toLowerCase().trim()).filter(Boolean)
        );
        const filtered = data.filter(item => {
          if (!item.title) return false;
          const lower = item.title.toLowerCase().trim();
          for (const exc of excludedSet) {
            if (lower === exc || lower.includes(exc) || exc.includes(lower)) {
              return false;
            }
          }
          return true;
        });

        if (filtered.length > 0) {
          return filtered;
        }
      }
    }
  } catch (err) {
    console.warn('Error calling /api/ai/nearby-places, falling back to local generator:', err);
  }

  // Client-side fallback generator
  return getClientFallbackNearbyPlaces(params);
}

function getClientFallbackNearbyPlaces(
  params: NearbyPlacesRequest
): NearbyPlaceRecommendation[] {
  const { destination, nearPlace, dayNumber = 1 } = params;
  const refTitle = nearPlace?.title || destination;
  const refLocation = nearPlace?.location || destination;

  const excludedSet = new Set(
    (params.excludedPlaces || []).map(p => p.toLowerCase().trim()).filter(Boolean)
  );
  if (refTitle) {
    excludedSet.add(refTitle.toLowerCase().trim());
  }

  const fallbacks: Array<{
    title: string;
    category: Activity['category'];
    distance: string;
    travelTime: string;
    cost: number;
    desc: string;
    reason: string;
    badge: string;
    tags: string[];
    img: string;
  }> = [
    {
      title: `${refTitle} Sunset Promenade & Vista Point`,
      category: 'Sightseeing',
      distance: '350m (4 min walk)',
      travelTime: '4 min walk',
      cost: 0,
      desc: `Scenic viewpoint offering open vistas and sea/landscape breeze right adjacent to ${refTitle}.`,
      reason: `Directly accessible from ${refTitle}, great relaxed spot to take in the view.`,
      badge: '4 Min Walk',
      tags: ['Scenic View', 'Free Entry', 'Walkable'],
      img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
    },
    {
      title: `Artisan Heritage Tea Lounge & Bakery near ${refTitle}`,
      category: 'Food',
      distance: '500m (6 min walk)',
      travelTime: '6 min walk',
      cost: 350,
      desc: `Cozy regional tea room and kitchen serving warm specialties, specialty coffee, and local desserts.`,
      reason: `Just 6 minutes on foot from ${refTitle}, ideal for refreshing and trying local delicacies.`,
      badge: 'Locals Pick',
      tags: ['Local Flavors', 'Cozy Ambience', 'Bakery'],
      img: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80'
    },
    {
      title: `${destination} Artisan Craft Quarter & Local Market`,
      category: 'Culture',
      distance: '800m (10 min walk)',
      travelTime: '10 min walk',
      cost: 200,
      desc: `Vibrant pedestrian street filled with traditional handcrafts, textiles, and independent artisan stalls.`,
      reason: `Short 10-minute stroll from ${refTitle}; lets you experience authentic regional crafts.`,
      badge: 'Cultural Gem',
      tags: ['Handicrafts', 'Culture', 'Walking Tour'],
      img: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=600&q=80'
    },
    {
      title: `Shaded Botanical Garden & Zen Walkway in ${refLocation}`,
      category: 'Relaxation',
      distance: '1.2 km (5 min cab)',
      travelTime: '5 min cab',
      cost: 150,
      desc: `Peaceful verdant garden sanctuary shaded by lush canopy trees with quiet pathways and ponds.`,
      reason: `Quick hop from ${refTitle} to unwind and escape the hustle and bustle.`,
      badge: 'Peaceful Oasis',
      tags: ['Nature', 'Tranquil', 'Greenery'],
      img: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80'
    },
    {
      title: `Panoramic Skyline & Sunset Lounge near ${refLocation}`,
      category: 'Nightlife',
      distance: '1.4 km (6 min cab)',
      travelTime: '6 min cab',
      cost: 600,
      desc: `Atmospheric rooftop deck offering regional beverage tastings, acoustic music, and golden hour views.`,
      reason: `Wonderful wrap-up to your day near ${refTitle} as evening sets in.`,
      badge: 'Sunset Favorite',
      tags: ['Rooftop', 'Sunset View', 'Vibe'],
      img: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80'
    }
  ];

  return fallbacks
    .filter(f => {
      const titleLower = f.title.toLowerCase().trim();
      for (const exc of excludedSet) {
        if (titleLower === exc || titleLower.includes(exc) || exc.includes(titleLower)) {
          return false;
        }
      }
      return true;
    })
    .map((f, idx) => ({
      id: `nearby-client-fallback-${idx}-${Date.now()}`,
      title: f.title,
      category: f.category,
      location: `${refLocation} Area`,
      distanceFromNearPlace: f.distance,
      travelTimeFromPrev: f.travelTime,
      estimatedCost: f.cost,
      duration: '1.5 hours',
      description: f.desc,
      recommendationReason: f.reason,
      rating: 4.8,
      tags: f.tags,
      badge: f.badge,
      imageUrl: f.img,
      isIndoor: f.category === 'Food',
      isRainSafe: f.category === 'Food'
    }));
}
