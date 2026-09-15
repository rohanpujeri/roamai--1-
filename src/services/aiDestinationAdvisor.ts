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
      isRecommended: false,
      durationEstimate: 'Direct or connecting flight',
      estimatedCostRange: 'Airfare',
      suitabilityScore: 90,
      pros: `Air travel connection from ${startCity} to ${destination}.`,
      cons: 'Airport check-in and transit time.',
      hasSwitchOrTransfer: false,
      desc: `Direct or connecting flight connecting ${startCity} to ${destination}`,
      tag: 'Air Route',
      transitHoursOneWay: 3,
      transitDaysRoundTrip: 2,
      minRequiredDaysForMode: 2
    },
    {
      mode: 'Train',
      label: 'Train / Railway',
      icon: '🚆',
      isRecommended: false,
      durationEstimate: 'Rail transit',
      estimatedCostRange: 'Train ticket',
      suitabilityScore: 85,
      pros: `Scenic and comfortable railway route from ${startCity}.`,
      cons: 'Fixed railway timetables.',
      hasSwitchOrTransfer: false,
      desc: `Train route connecting ${startCity} to ${destination} or nearest railhead`,
      tag: 'Rail Route',
      transitHoursOneWay: 10,
      transitDaysRoundTrip: 2,
      minRequiredDaysForMode: 2
    },
    {
      mode: 'Car / Road Trip',
      label: 'Car / Road Trip',
      icon: '🚗',
      isRecommended: false,
      durationEstimate: 'Highway drive',
      estimatedCostRange: 'Fuel & tolls',
      suitabilityScore: 80,
      pros: 'Maximum flexibility with freedom to stop anywhere along the journey.',
      cons: 'Driving fatigue on long highway stretches.',
      hasSwitchOrTransfer: false,
      desc: `Overland road trip driving from ${startCity} to ${destination}`,
      tag: 'Road Highway',
      transitHoursOneWay: 8,
      transitDaysRoundTrip: 2,
      minRequiredDaysForMode: 2
    },
    {
      mode: 'Bus',
      label: 'Bus / Coach',
      icon: '🚌',
      isRecommended: false,
      durationEstimate: 'Intercity bus',
      estimatedCostRange: 'Bus fare',
      suitabilityScore: 75,
      pros: 'Budget-friendly overnight or daytime intercity transit.',
      cons: 'Longer transit time compared to flights.',
      hasSwitchOrTransfer: false,
      desc: `Intercity bus or sleeper coach from ${startCity} to ${destination}`,
      tag: 'Bus Transit',
      transitHoursOneWay: 11,
      transitDaysRoundTrip: 2,
      minRequiredDaysForMode: 2
    }
  ];

  return {
    destination,
    startCity,
    distanceKm: 800,
    minimumRequiredDays: 2,
    idealDays: 5,
    durationReason: `Analyzing route logistics from ${startCity} to ${destination}...`,
    travelTransitReason: `Roundtrip travel transit accounts for approximately 2 days.`,
    recommendedTravelMode: travelMode || 'Flight',
    recommendedTravelModeReason: `Possible travel routes available between ${startCity} and ${destination}.`,
    transferAndSwitchTips: `Check direct transit connections between ${startCity} and ${destination}.`,
    modesBreakdown: modes,
    highlightsInMinDays: [
      `Signature attractions of ${destination}`,
      `Top scenic viewpoints and signature landscapes`,
      `Local food & dining experiences`,
      `Popular markets and cultural spots`
    ],
    bestSeasons: 'Year-round / Seasonal',
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

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const mergedResult = await response.json();
      if (mergedResult && mergedResult.modesBreakdown && mergedResult.modesBreakdown.length > 0) {
        intelligenceCache.set(cacheKey, mergedResult);
        return mergedResult;
      }
    }
  } catch (error) {
    console.warn('Destination Intelligence API error:', error);
  }

  return genericFallback;
}

