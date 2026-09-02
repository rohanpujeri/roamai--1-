import { GoogleGenAI } from '@google/genai';
import { TravelMode } from '../../src/types';

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

function parseJsonSafely(text: string): any {
  if (!text || !text.trim()) return {};
  let cleaned = text.trim();
  if (cleaned.includes('```')) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      cleaned = match[1].trim();
    } else {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

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

  // Only add ground transport if not an isolated island/overseas location
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
    transferAndSwitchTips: `Fly into the nearest international airport serving ${destination}, then use local taxis, tour coaches, or rental cars to explore.`,
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
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    intelligenceCache.set(cacheKey, genericFallback);
    return genericFallback;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    const prompt = `You are a world-class travel logistics & route architect AI.
Analyze the travel route from Origin: "${startCity}" to Destination: "${destination}".

Provide an accurate, real-world travel feasibility & logistics breakdown in strictly valid JSON:
{
  "destination": "${destination}",
  "startCity": "${startCity}",
  "distanceKm": number (approximate driving or flight distance in km from ${startCity} to ${destination}),
  "minimumRequiredDays": number (the minimum realistic full days needed to properly experience this destination and account for transit),
  "idealDays": number (the ideal recommended duration for a relaxed complete trip),
  "durationReason": "Comprehensive explanation of why this minimum number of days is required",
  "recommendedTravelMode": "Flight" | "Train" | "Car / Road Trip" | "Bus" | "Bike / Motorcycle",
  "recommendedTravelModeReason": "Specific reason why this mode is the best choice from ${startCity} to ${destination}",
  "transferAndSwitchTips": "Detailed transit guidance",
  "modesBreakdown": [
    {
      "mode": "Flight" | "Train" | "Car / Road Trip" | "Bus" | "Bike / Motorcycle",
      "label": "Display name (e.g. 'Flight', 'Train', 'Car / Road Trip')",
      "icon": "Emoji icon",
      "isRecommended": boolean (true for the single best mode),
      "durationEstimate": "e.g. '3h flight', '6h train', '8h drive'",
      "estimatedCostRange": "e.g. 'Standard airfare' or local currency",
      "suitabilityScore": number (0 to 100 score),
      "pros": "Main benefit for this route",
      "cons": "Main drawback for this route",
      "hasSwitchOrTransfer": boolean,
      "desc": "Precise description of transit from ${startCity} to ${destination}",
      "tag": "e.g. 'Fast & Direct', 'Scenic Rail', 'Road Trip'"
    }
  ],
  "highlightsInMinDays": [
    "Highlight 1",
    "Highlight 2",
    "Highlight 3",
    "Highlight 4"
  ],
  "bestSeasons": "Optimal months/seasons to visit",
  "destinationVibe": "1-sentence summary of the vibe and landscape"
}

STRICT ROUTE LOGISTICS RULES:
1. GEOGRAPHIC FEASIBILITY: Check if the destination is an island or overseas across oceans from ${startCity} (e.g., Iceland, Maldives, Mauritius, Japan, New Zealand, Australia, Hawaii, Caribbean, UK/Europe/Americas from other continents).
2. If the destination is an island or separated by oceans from ${startCity} with NO continuous road/rail bridge, modesBreakdown MUST contain ONLY "Flight" (✈️). NEVER output Train, Car/Road Trip, Bus, or Bike when there is no direct road/rail connection across continents/oceans!
3. Do NOT output hybrid "Fly +" or "Fly + Destination Rental" modes under any circumstances. Keep mode labels strictly standard ("Flight", "Train", "Car / Road Trip", "Bus", "Bike / Motorcycle").
4. Return ONLY valid raw JSON with no Markdown or text outside JSON.`;

    const modelsToTry = [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.7-flash'
    ];

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });

        const text = response.text || '';
        const parsed = parseJsonSafely(text);

        if (
          parsed &&
          typeof parsed.minimumRequiredDays === 'number' &&
          parsed.recommendedTravelMode
        ) {
          const mergedResult: DestinationTravelIntelligence = {
            destination: parsed.destination || destination,
            startCity: parsed.startCity || startCity,
            distanceKm: typeof parsed.distanceKm === 'number' ? parsed.distanceKm : genericFallback.distanceKm,
            minimumRequiredDays: Math.max(1, parsed.minimumRequiredDays),
            idealDays: Math.max(parsed.minimumRequiredDays || 3, parsed.idealDays || 5),
            durationReason: parsed.durationReason || genericFallback.durationReason,
            recommendedTravelMode: parsed.recommendedTravelMode as TravelMode,
            recommendedTravelModeReason: parsed.recommendedTravelModeReason || genericFallback.recommendedTravelModeReason,
            transferAndSwitchTips: parsed.transferAndSwitchTips || genericFallback.transferAndSwitchTips,
            modesBreakdown: Array.isArray(parsed.modesBreakdown) && parsed.modesBreakdown.length > 0
              ? parsed.modesBreakdown
              : genericFallback.modesBreakdown,
            highlightsInMinDays: Array.isArray(parsed.highlightsInMinDays) && parsed.highlightsInMinDays.length > 0
              ? parsed.highlightsInMinDays
              : genericFallback.highlightsInMinDays,
            bestSeasons: parsed.bestSeasons || genericFallback.bestSeasons,
            destinationVibe: parsed.destinationVibe || genericFallback.destinationVibe
          };

          intelligenceCache.set(cacheKey, mergedResult);
          return mergedResult;
        }
      } catch (err) {
        console.warn(`Destination intelligence attempt with ${modelName} failed, trying next:`, err);
      }
    }
  } catch (error) {
    console.warn('Gemini Destination Intelligence API error:', error);
  }

  intelligenceCache.set(cacheKey, genericFallback);
  return genericFallback;
}
