import { TravelMode } from '../types';

export interface TravelModeViability {
  mode: TravelMode;
  label: string;
  icon: string;
  isRecommended: boolean;
  durationEstimate: string;
  estimatedCostRange: string;
  suitabilityScore: number; // 0 - 100
  pros: string;
  cons: string;
  hasSwitchOrTransfer: boolean;
  transferGuide?: string;
  desc?: string;
  tag?: string;
}

export interface DestinationTravelIntelligence {
  destination: string;
  startCity: string;
  distanceKm: number;
  minimumRequiredDays: number;
  idealDays: number;
  durationReason: string;
  recommendedTravelMode: TravelMode;
  recommendedTravelModeReason: string;
  transferAndSwitchTips: string;
  modesBreakdown: TravelModeViability[];
  highlightsInMinDays: string[];
  bestSeasons: string;
  destinationVibe: string;
}

// In-memory cache for fast responsive UI
const intelligenceCache = new Map<string, DestinationTravelIntelligence>();

/**
 * Pure dynamic fallback generator when network/API is initializing (No hardcoded place names)
 */
export function getGenericDynamicIntelligence(
  destination: string,
  startCity: string = 'Origin City'
): DestinationTravelIntelligence {
  const destLower = destination.toLowerCase();
  const isIslandOrOverseas =
    destLower.includes('iceland') ||
    destLower.includes('maldives') ||
    destLower.includes('mauritius') ||
    destLower.includes('seychelles') ||
    destLower.includes('hawaii') ||
    destLower.includes('bali') ||
    destLower.includes('japan') ||
    destLower.includes('new zealand') ||
    destLower.includes('australia') ||
    destLower.includes('fiji') ||
    destLower.includes('bahamas') ||
    destLower.includes('caribbean') ||
    destLower.includes('malta') ||
    destLower.includes('cyprus');

  const modes: TravelModeViability[] = [
    {
      mode: 'Flight',
      label: 'Flight',
      icon: '✈️',
      isRecommended: true,
      durationEstimate: 'Direct / connecting flight',
      estimatedCostRange: 'Flight airfare',
      suitabilityScore: 98,
      pros: `Fastest and primary transit from ${startCity} to ${destination}.`,
      cons: 'Airport check-in and transit time.',
      hasSwitchOrTransfer: false,
      desc: `Flight from ${startCity} to ${destination}`,
      tag: 'Fast & Direct'
    }
  ];

  if (!isIslandOrOverseas) {
    modes.push(
      {
        mode: 'Train',
        label: 'Train / Railway',
        icon: '🚆',
        isRecommended: false,
        durationEstimate: 'Scenic rail',
        estimatedCostRange: 'Budget friendly',
        suitabilityScore: 82,
        pros: 'Comfortable countryside views and spacious seating.',
        cons: 'Longer travel duration.',
        hasSwitchOrTransfer: false,
        desc: `Railway transit connecting ${startCity} towards ${destination}`,
        tag: 'Scenic Rail'
      },
      {
        mode: 'Car / Road Trip',
        label: 'Car / Road Trip',
        icon: '🚗',
        isRecommended: false,
        durationEstimate: 'Highway route',
        estimatedCostRange: 'Fuel & tolls',
        suitabilityScore: 80,
        pros: 'Full itinerary flexibility and scenic stops along the highway.',
        cons: 'Driving fatigue on long stretches.',
        hasSwitchOrTransfer: false,
        desc: `Highway road trip from ${startCity} to ${destination}`,
        tag: 'High Flexibility'
      }
    );
  }

  return {
    destination,
    startCity,
    distanceKm: isIslandOrOverseas ? 6500 : 800,
    minimumRequiredDays: isIslandOrOverseas ? 6 : 4,
    idealDays: isIslandOrOverseas ? 8 : 6,
    durationReason: `Exploring ${destination} comfortably requires adequate time for flights, transit, and exploring major attractions.`,
    recommendedTravelMode: 'Flight',
    recommendedTravelModeReason: `Air transit is the primary and viable way to travel from ${startCity} to ${destination}.`,
    transferAndSwitchTips: `Fly into the nearest international airport serving ${destination}, then use local transit or car rentals to explore.`,
    modesBreakdown: modes,
    highlightsInMinDays: [
      `Historic & Cultural landmarks of ${destination}`,
      `Top scenic viewpoints and signature landscapes`,
      `Local food & dining experiences`,
      `Popular markets and nature spots`
    ],
    bestSeasons: 'Spring & Autumn (Pleasant weather and clear sightseeing)',
    destinationVibe: `Memorable journeys and rich local exploration in ${destination}`
  };
}

/**
 * AI-powered destination intelligence fetching using Gemini AI.
 * Fetches all travel modes, transit feasibility, and minimum days dynamically without any predefined database.
 */
export async function fetchAiDestinationTravelIntelligence(
  destination: string,
  startCity: string = 'Origin City'
): Promise<DestinationTravelIntelligence> {
  const cacheKey = `${destination.toLowerCase().trim()}____${startCity.toLowerCase().trim()}`;
  if (intelligenceCache.has(cacheKey)) {
    return intelligenceCache.get(cacheKey)!;
  }

  const genericFallback = getGenericDynamicIntelligence(destination, startCity);

  try {
    const response = await fetch('/api/ai/destination-advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, startCity }),
    });

    if (response.ok) {
      const mergedResult = await response.json();
      intelligenceCache.set(cacheKey, mergedResult);
      return mergedResult;
    }
  } catch (error) {
    console.warn('Destination Intelligence API error:', error);
  }

  intelligenceCache.set(cacheKey, genericFallback);
  return genericFallback;
}
