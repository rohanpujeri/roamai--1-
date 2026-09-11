import { GoogleGenAI } from '@google/genai';
import { TravelMode } from '../../src/types';
import { PREFERRED_GEMINI_MODELS, formatGenAiError } from '../utils/geminiModels';

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
 * AI-powered destination intelligence fetching using Gemini AI.
 * Fetches travel modes, transit feasibility, and travel-based minimum days dynamically.
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
Analyze the travel route from Origin: "${startCity}" to Destination: "${destination}"${travelMode ? ` with selected travel mode: "${travelMode}"` : ''}.

CRITICAL REQUIREMENT:
The minimum days ('minimumRequiredDays' and 'minRequiredDaysForMode' for each mode) MUST BE EQUAL TO THE EXACT NUMBER OF DAYS REQUIRED TO GO AND COME BACK TO THE PLACE based on that mode of travel:
1. Exact Roundtrip Travel Formula:
   minimumRequiredDays = (Exact calendar days needed to travel from "${startCity}" to "${destination}") + (Exact calendar days needed to travel back from "${destination}" to "${startCity}").
2. Rules based on realistic transit time and distance:
   - Short-haul (< 4-5 hours one-way transit, e.g. short drive < 250 km or short flight): If same-day return is realistic, 1 day; otherwise 2 days (1 day to go + 1 day to return).
   - Medium-haul (6 to 18 hours one-way transit, e.g. 300 - 1000 km road drive, overnight train, sleeper bus, or flight with airport transfers): EXACTLY 2 DAYS (1 full day to go + 1 full day to return).
   - Long-haul / multi-day transit (1000 - 2000 km road drive, or 24-36h train journey): EXACTLY 4 DAYS (2 days driving/transit to go + 2 days driving/transit to return).
   - Extreme long-haul (> 2000 km road trip, or multi-layover cross-continent travel): EXACTLY 4 to 6 DAYS.
3. For EVERY mode in 'modesBreakdown', calculate:
   - 'durationEstimate': Estimated one-way transit time (e.g. '2h 15m Flight', '12h Train', '14h Drive')
   - 'transitDaysRoundTrip': Approximate full calendar days spent in transit roundtrip (e.g. 2 days)
   - 'minRequiredDaysForMode': EXACT roundtrip days required to go and come back via this mode (e.g. 2 for 1 day go + 1 day return).

Provide the output in strictly valid JSON matching this schema:
{
  "destination": "${destination}",
  "startCity": "${startCity}",
  "distanceKm": number (approximate driving or flight distance in km from ${startCity} to ${destination}),
  "minimumRequiredDays": number (the EXACT roundtrip travel days required to go and come back),
  "idealDays": number (recommended duration including on-ground stay, e.g. travel days + 2-3 days stay),
  "durationReason": "Explanation stating: 'Exact travel time: X days required to go from ${startCity} to ${destination} and come back via [Mode]'",
  "travelTransitReason": "Detailed breakdown of outbound travel time + return travel time",
  "recommendedTravelMode": "Flight" | "Train" | "Car / Road Trip" | "Bus" | "Bike / Motorcycle",
  "recommendedTravelModeReason": "Specific reason why this mode is the best choice from ${startCity} to ${destination}",
  "transferAndSwitchTips": "Detailed transit guidance",
  "modesBreakdown": [
    {
      "mode": "Flight" | "Train" | "Car / Road Trip" | "Bus" | "Bike / Motorcycle",
      "label": "Display name (e.g. 'Flight', 'Train / Railway', 'Car / Road Trip', 'Bus / Coach', 'Bike / Motorcycle')",
      "icon": "Emoji icon (✈️, 🚆, 🚗, 🚌, 🏍️)",
      "isRecommended": boolean (true for the single best mode),
      "durationEstimate": "e.g. '2h 15m Flight', '12h Train', '14h Drive'",
      "transitDaysRoundTrip": number (approximate calendar days spent in transit roundtrip),
      "minRequiredDaysForMode": number (exact roundtrip days required to go and return via this mode),
      "estimatedCostRange": "e.g. 'Standard airfare' or estimated price range",
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

    for (const modelName of PREFERRED_GEMINI_MODELS) {
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
          const rawMinDays = Math.max(1, Math.ceil(parsed.minimumRequiredDays));
          const rawIdealDays = Math.max(rawMinDays, Math.ceil(parsed.idealDays || rawMinDays + 2));

          const mergedResult: DestinationTravelIntelligence = {
            destination: parsed.destination || destination,
            startCity: parsed.startCity || startCity,
            distanceKm: typeof parsed.distanceKm === 'number' ? parsed.distanceKm : genericFallback.distanceKm,
            minimumRequiredDays: rawMinDays,
            idealDays: rawIdealDays,
            durationReason: parsed.durationReason || genericFallback.durationReason,
            travelTransitReason: parsed.travelTransitReason || genericFallback.travelTransitReason,
            recommendedTravelMode: parsed.recommendedTravelMode as TravelMode,
            recommendedTravelModeReason: parsed.recommendedTravelModeReason || genericFallback.recommendedTravelModeReason,
            transferAndSwitchTips: parsed.transferAndSwitchTips || genericFallback.transferAndSwitchTips,
            modesBreakdown: Array.isArray(parsed.modesBreakdown) && parsed.modesBreakdown.length > 0
              ? parsed.modesBreakdown.map((m: any) => ({
                  ...m,
                  minRequiredDaysForMode: typeof m.minRequiredDaysForMode === 'number' ? Math.max(1, Math.ceil(m.minRequiredDaysForMode)) : rawMinDays,
                  transitDaysRoundTrip: typeof m.transitDaysRoundTrip === 'number' ? m.transitDaysRoundTrip : 1
                }))
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
      } catch (err: any) {
        const errMsg = formatGenAiError(err);
        console.warn(`Destination intelligence attempt with ${modelName} encountered: ${errMsg}`);
        if (errMsg.includes('429') || errMsg.includes('Quota exceeded') || errMsg.includes('ResourceExhausted')) {
          break; // Stop immediately to avoid lag and serve fallback
        }
      }
    }
  } catch (error) {
    console.warn('Gemini Destination Intelligence API error:', error);
  }

  intelligenceCache.set(cacheKey, genericFallback);
  return genericFallback;
}
