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
 * Minimal dynamic fallback while AI evaluates the route (No hardcoded places or lists)
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
      pros: `Fastest air connection from ${startCity} to ${destination}.`,
      cons: 'Airport check-in and transit time.',
      hasSwitchOrTransfer: false,
      desc: `Direct or connecting flight from ${startCity} to ${destination}`,
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
      pros: 'Comfortable, scenic rail journey.',
      cons: 'Station transfers if applicable.',
      hasSwitchOrTransfer: false,
      desc: `Train route from ${startCity} to ${destination} or nearest railhead`,
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
      pros: 'Total flexibility and freedom to stop along the way.',
      cons: 'Driving fatigue on long stretches.',
      hasSwitchOrTransfer: false,
      desc: `Overland highway drive from ${startCity} to ${destination}`,
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
      pros: 'Budget-friendly overnight or daytime transit.',
      cons: 'Fixed schedules and longer journey time.',
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
    durationReason: `Route logistics from ${startCity} to ${destination}.`,
    travelTransitReason: `Roundtrip travel transit accounts for approximately 2 days.`,
    recommendedTravelMode: 'Flight',
    recommendedTravelModeReason: `Available travel modes from ${startCity} to ${destination}.`,
    transferAndSwitchTips: `Check direct transit connections between ${startCity} and ${destination}.`,
    modesBreakdown: modes,
    highlightsInMinDays: [
      `Historic & Cultural landmarks of ${destination}`,
      `Top scenic viewpoints and signature landscapes`,
      `Local food & dining experiences`,
      `Popular markets and nature spots`
    ],
    bestSeasons: 'Year-round / Seasonal',
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
Analyze the travel route from Origin: "${startCity}" to Destination: "${destination}".

CRITICAL MANDATE:
YOUR GOAL IS TO FETCH ALL MODES OF TRAVEL THAT ARE PHYSICALLY AND LOGISTICALLY POSSIBLE TO REACH THE DESTINATION FROM "${startCity}".
DO NOT PICK OR FORCE THE "BEST MODE" FOR THE USER. The user will choose their preferred travel mode from the list of all viable options you provide.
Discover and evaluate all viable transportation modes (Flight, Train, Car / Road Trip, Bus, Bike / Motorcycle) indicating realistic transit durations, roundtrip days needed, and transit logistics.

CRITICAL REQUIREMENT:
The minimum days ('minimumRequiredDays' and 'minRequiredDaysForMode' for each mode) MUST BE EQUAL TO THE EXACT NUMBER OF DAYS REQUIRED TO GO AND COME BACK TO THE PLACE based on that mode of travel:
1. Exact Roundtrip Travel Formula:
   minimumRequiredDays = (Exact calendar days needed to travel from "${startCity}" to "${destination}") + (Exact calendar days needed to travel back from "${destination}" to "${startCity}").
2. Rules based on realistic transit time and distance:
   - Short-haul (< 4-5 hours one-way transit, e.g. short drive < 250 km or short flight): If same-day return is realistic, 1 day; otherwise 2 days (1 day to go + 1 day to return).
   - Medium-haul (6 to 18 hours one-way transit, e.g. 300 - 1000 km road drive, overnight train, sleeper bus, or flight with airport transfers): EXACTLY 2 DAYS (1 full day to go + 1 full day to return).
   - Long-haul / multi-day transit (1000 - 2000 km road drive, or 24-36h train journey): EXACTLY 4 DAYS (2 days driving/transit to go + 2 days driving/transit to return).
   - Extreme long-haul (> 2000 km road trip, or multi-layover cross-continent travel): EXACTLY 4 to 6 DAYS.
3. For EVERY possible mode in 'modesBreakdown', calculate:
   - 'durationEstimate': Estimated one-way transit time (e.g. '2h 15m Flight', '12h Train', '14h Drive')
   - 'transitDaysRoundTrip': Approximate full calendar days spent in transit roundtrip (e.g. 2 days)
   - 'minRequiredDaysForMode': EXACT roundtrip days required to go and come back via this mode (e.g. 2 for 1 day go + 1 day return).

Provide the output in strictly valid JSON matching this schema:
{
  "destination": "${destination}",
  "startCity": "${startCity}",
  "distanceKm": number (approximate driving or flight distance in km from ${startCity} to ${destination}),
  "minimumRequiredDays": number (the minimum roundtrip travel days required to go and come back),
  "idealDays": number (recommended duration including on-ground stay, e.g. travel days + 2-3 days stay),
  "durationReason": "Summary of transit times from ${startCity} to ${destination}",
  "travelTransitReason": "Detailed breakdown of outbound travel time + return travel time",
  "recommendedTravelMode": "Flight" | "Train" | "Car / Road Trip" | "Bus" | "Bike / Motorcycle",
  "recommendedTravelModeReason": "Transit logistics overview from ${startCity} to ${destination}",
  "transferAndSwitchTips": "Detailed transit guidance",
  "modesBreakdown": [
    {
      "mode": "Flight" | "Train" | "Car / Road Trip" | "Bus" | "Bike / Motorcycle",
      "label": "Display name (e.g. 'Flight', 'Train / Railway', 'Car / Road Trip', 'Bus / Coach', 'Bike / Motorcycle')",
      "icon": "Emoji icon (✈️, 🚆, 🚗, 🚌, 🏍️)",
      "isRecommended": false,
      "durationEstimate": "e.g. '2h 15m Flight', '12h Train', '14h Drive'",
      "transitDaysRoundTrip": number (approximate calendar days spent in transit roundtrip),
      "minRequiredDaysForMode": number (exact roundtrip days required to go and return via this mode),
      "estimatedCostRange": "e.g. 'Standard airfare' or estimated price range",
      "suitabilityScore": number (0 to 100 score),
      "pros": "Main benefit for this route",
      "cons": "Main drawback for this route",
      "hasSwitchOrTransfer": boolean,
      "desc": "Precise description of transit from ${startCity} to ${destination}",
      "tag": "e.g. 'Air Route', 'Scenic Rail', 'Road Trip', 'Bus Route'"
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
3. For ALL overland and continental destinations (especially within the same country or landmass, e.g. within India):
   YOU MUST ALWAYS INCLUDE ALL POSSIBLE MODES:
   - "Flight" (✈️)
   - "Train" (🚆 - Train / Railway)
   - "Car / Road Trip" (🚗)
   - "Bus" (🚌 - Bus / Coach, if road-connected)
   Even if the destination is a hill station or rural town without its own tracks (e.g., Munnar, Wayanad, Coorg, Ooty, Manali, Shimla), train transit via the nearest major railhead (e.g. Aluva/Ernakulam for Munnar, Kozhikode for Wayanad, Mysore for Coorg, Kalka/Chandigarh for Shimla/Manali) is a standard, essential travel option. Mention the nearest railhead in the description.
4. Do NOT output hybrid "Fly +" or "Fly + Destination Rental" modes under any circumstances. Keep mode labels strictly standard ("Flight", "Train", "Car / Road Trip", "Bus", "Bike / Motorcycle").
5. Return ONLY valid raw JSON with no Markdown or text outside JSON.`;

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
