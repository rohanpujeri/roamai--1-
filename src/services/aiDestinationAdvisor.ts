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
  transitHoursOneWay?: number;
  transitDaysRoundTrip?: number;
  minRequiredDaysForMode?: number;
}

export interface DestinationTravelIntelligence {
  destination: string;
  startCity: string;
  distanceKm: number;
  minimumRequiredDays: number;
  idealDays: number;
  durationReason: string;
  travelTransitReason?: string;
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
  startCity: string = 'Origin City',
  travelMode?: TravelMode
): DestinationTravelIntelligence {
  const modes: TravelModeViability[] = [
    {
      mode: 'Flight',
      label: 'Flight',
      icon: '✈️',
      isRecommended: true,
      durationEstimate: '2h - 4h Flight',
      estimatedCostRange: 'Flight airfare',
      suitabilityScore: 98,
      pros: `Fastest travel transit to go from ${startCity} to ${destination} and return.`,
      cons: 'Airport check-in and transit time.',
      hasSwitchOrTransfer: false,
      desc: `Flight from ${startCity} to ${destination}`,
      tag: 'Fast & Direct',
      transitHoursOneWay: 3,
      transitDaysRoundTrip: 2,
      minRequiredDaysForMode: 2 // 1 day to go + 1 day to return
    },
    {
      mode: 'Train',
      label: 'Train / Railway',
      icon: '🚆',
      isRecommended: false,
      durationEstimate: '10h - 16h Rail',
      estimatedCostRange: 'Budget friendly',
      suitabilityScore: 82,
      pros: 'Comfortable rail transit between cities.',
      cons: 'Requires 1 full day to go and 1 full day to return.',
      hasSwitchOrTransfer: false,
      desc: `Railway transit connecting ${startCity} towards ${destination}`,
      tag: 'Scenic Rail',
      transitHoursOneWay: 12,
      transitDaysRoundTrip: 2,
      minRequiredDaysForMode: 2 // 1 day to go + 1 day to return
    },
    {
      mode: 'Car / Road Trip',
      label: 'Car / Road Trip',
      icon: '🚗',
      isRecommended: false,
      durationEstimate: '10h - 14h Drive',
      estimatedCostRange: 'Fuel & tolls',
      suitabilityScore: 80,
      pros: 'Highway drive with direct door-to-door transit.',
      cons: 'Driving fatigue requiring 1 day to go and 1 day to return.',
      hasSwitchOrTransfer: false,
      desc: `Highway road trip from ${startCity} to ${destination}`,
      tag: 'High Flexibility',
      transitHoursOneWay: 12,
      transitDaysRoundTrip: 2,
      minRequiredDaysForMode: 2 // 1 day to go + 1 day to return
    },
    {
      mode: 'Bus',
      label: 'Bus / Sleeper Coach',
      icon: '🚌',
      isRecommended: false,
      durationEstimate: '12h - 16h Sleeper',
      estimatedCostRange: 'Most economical',
      suitabilityScore: 72,
      pros: 'Overnight sleeper coaches for intercity transit.',
      cons: 'Requires 1 day to go and 1 day to return.',
      hasSwitchOrTransfer: false,
      desc: `Intercity bus from ${startCity} to ${destination}`,
      tag: 'Budget Friendly',
      transitHoursOneWay: 14,
      transitDaysRoundTrip: 2,
      minRequiredDaysForMode: 2 // 1 day to go + 1 day to return
    }
  ];

  const selectedModeObj = travelMode ? modes.find(m => m.mode === travelMode) : modes[0];
  const exactTravelDays = selectedModeObj?.minRequiredDaysForMode || 2;

  return {
    destination,
    startCity,
    distanceKm: 800,
    minimumRequiredDays: exactTravelDays,
    idealDays: exactTravelDays + 3,
    durationReason: `Exact travel duration: ${exactTravelDays} day(s) required to go from ${startCity} to ${destination} and come back via ${selectedModeObj?.mode || 'travel'}.`,
    travelTransitReason: `Roundtrip travel transit accounts for ${exactTravelDays} day(s) (${Math.ceil(exactTravelDays / 2)} day to go + ${Math.ceil(exactTravelDays / 2)} day to return).`,
    recommendedTravelMode: 'Flight',
    recommendedTravelModeReason: `Air transit is the fastest way to travel between ${startCity} and ${destination}.`,
    transferAndSwitchTips: `Fly into the nearest airport serving ${destination}, then use local transit or car rentals to explore.`,
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
 * AI-powered destination intelligence fetching.
 * Fetches all travel modes, transit feasibility, and travel-based minimum days dynamically.
 */
export async function fetchAiDestinationTravelIntelligence(
  destination: string,
  startCity: string = 'Origin City',
  travelMode?: TravelMode
): Promise<DestinationTravelIntelligence> {
  const cacheKey = `${destination.toLowerCase().trim()}____${startCity.toLowerCase().trim()}____${(travelMode || 'all').toLowerCase()}`;
  if (intelligenceCache.has(cacheKey)) {
    return intelligenceCache.get(cacheKey)!;
  }

  const genericFallback = getGenericDynamicIntelligence(destination, startCity, travelMode);

  try {
    const response = await fetch('/api/ai/destination-advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, startCity, travelMode }),
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
