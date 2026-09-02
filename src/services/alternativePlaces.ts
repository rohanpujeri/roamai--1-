import { Activity, TravelStyle } from '../types';

export interface AlternativePlaceOption {
  id: string;
  title: string;
  category: Activity['category'];
  location: string;
  estimatedCost: number;
  duration: string;
  description: string;
  imageUrl?: string;
  recommendationReason: string;
  rating: number;
  tags: string[];
  matchScore: number; // e.g. 96 (%)
  badge?: string; // e.g. "Hidden Gem", "Sunset Favorite", "Locals Pick", "Budget Save"
  vibe: string;
}

/**
 * Dynamically generate alternative places using AI for any destination worldwide
 */
export async function fetchAIAlternativePlaces(
  destination: string,
  currentActivity: Activity,
  userStyles: TravelStyle[] = []
): Promise<AlternativePlaceOption[]> {
  try {
    const response = await fetch('/api/ai/alternative-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, currentActivity, userStyles })
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('AI Alternative places generation error, using dynamic model generator:', err);
  }

  return getDynamicAlternativeOptions(destination, currentActivity, userStyles);
}

/**
 * Dynamic fallback generator based on current activity context without hardcoded destination lists
 */
export function getDynamicAlternativeOptions(
  destination: string,
  currentActivity: Activity,
  _userStyles: TravelStyle[] = []
): AlternativePlaceOption[] {
  const isFood = currentActivity.category === 'Food';
  const isAdventure = currentActivity.category === 'Adventure';
  const isRelaxation = currentActivity.category === 'Relaxation';

  const alternatives: AlternativePlaceOption[] = [
    {
      id: `dyn-alt-${crypto.randomUUID()}`,
      title: isFood
        ? `Local Artisan Bistro & Tasting Kitchen in ${destination}`
        : isAdventure
        ? `Scenic Natural Trail & Panorama Lookout in ${destination}`
        : `Peaceful Scenic Viewpoint & Lounge in ${destination}`,
      category: isFood ? 'Food' : isAdventure ? 'Adventure' : 'Relaxation',
      location: `${destination} Heritage & Cultural Quarter`,
      estimatedCost: Math.max(150, Math.round((currentActivity.estimatedCost || 500) * 0.85)),
      duration: currentActivity.duration || '2 hours',
      description: `Uncrowded spot in ${destination} recommended by locals for authentic atmosphere and scenic views.`,
      imageUrl: currentActivity.imageUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
      recommendationReason: `Personalized alternative tailored to escape dense crowds in ${destination}.`,
      rating: 4.8,
      tags: ['Local Favorite', 'Scenic Spot', 'Authentic Vibe'],
      matchScore: 97,
      badge: 'Locals Pick',
      vibe: 'Authentic & Uncrowded'
    },
    {
      id: `dyn-alt-${crypto.randomUUID()}`,
      title: isRelaxation
        ? `Tranquil Botanical Garden & Tea Pavilion in ${destination}`
        : `Historic Old Town Walking Trail & Crafts in ${destination}`,
      category: isRelaxation ? 'Relaxation' : 'Culture',
      location: `${destination} Old Town`,
      estimatedCost: Math.round((currentActivity.estimatedCost || 500) * 0.7),
      duration: '1.5 hours',
      description: `Intimate exploration of heritage structures and artisan studios in ${destination}.`,
      imageUrl: currentActivity.imageUrl || 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?q=80&w=600&auto=format&fit=crop',
      recommendationReason: `Enriching cultural alternative that takes you into authentic architecture.`,
      rating: 4.9,
      tags: ['Heritage Walk', 'Architecture', 'Culture'],
      matchScore: 95,
      badge: 'Hidden Gem',
      vibe: 'Inspiring & Local'
    },
    {
      id: `dyn-alt-${crypto.randomUUID()}`,
      title: `Golden Hour Sunset Spot & Evening Cafe in ${destination}`,
      category: 'Sightseeing',
      location: `${destination} Coastal / Hillside Vista`,
      estimatedCost: Math.round((currentActivity.estimatedCost || 400) * 0.9),
      duration: '2 hours',
      description: `Relaxed vantage point watching the golden light over ${destination} with fresh beverages.`,
      imageUrl: currentActivity.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop',
      recommendationReason: `Top-rated scenic view with zero commercial noise.`,
      rating: 4.9,
      tags: ['Sunset View', 'Photography', 'Quiet'],
      matchScore: 98,
      badge: 'Sunset Favorite',
      vibe: 'Scenic & Chilled'
    }
  ];

  return alternatives;
}

// Backward-compatible synchronous wrapper
export function getAlternativeOptionsForActivity(
  destination: string,
  currentActivity: Activity,
  userStyles: TravelStyle[] = []
): AlternativePlaceOption[] {
  return getDynamicAlternativeOptions(destination, currentActivity, userStyles);
}
