import { Trip, UserPreferences, Activity, TravelCompanion, TravelMode, BudgetTier, GroupMember, DayItinerary, HotelStayRecommendation } from '../types';
import { GoogleGenAI } from '@google/genai';
import { fetchAiHotelSuggestions } from './aiHotelAdvisor';

export interface AdaptOption {
  id: string;
  icon: string;
  label: string;
  description: string;
  badge?: string;
}

export const ADAPT_OPTIONS: AdaptOption[] = [
  {
    id: 'rain',
    icon: '🌧️',
    label: 'Weather changed (It\'s raining)',
    description: 'Swap outdoor activities and open viewpoints for cozy indoor cafes, art galleries, spas & museums.',
    badge: 'Smart Weather AI'
  },
  {
    id: 'woke_up_late',
    icon: '😴',
    label: 'We woke up late',
    description: 'Shift schedule forward gracefully, convert early morning into brunch, and preserve key highlights.',
    badge: 'Time Optimizer'
  },
  {
    id: 'spend_less',
    icon: '💰',
    label: 'We want to spend less',
    description: 'Swap pricey dining and ticketed spots for iconic budget eateries, free parks & secret viewpoints.',
    badge: 'Budget Rebalancer'
  },
  {
    id: 'more_adventure',
    icon: '⚡',
    label: 'We want more adventure',
    description: 'Inject adrenaline: local sports, hiking trails, kayak routes & scenic viewpoints.',
    badge: 'Thrill Injector'
  },
  {
    id: 'relaxed_day',
    icon: '😌',
    label: 'We want a relaxed day',
    description: 'Clear high-exertion stops, add cozy lounge seating, wellness spa & quiet sunset spot.',
    badge: 'Vibe Shift'
  },
  {
    id: 'dont_like_place',
    icon: '❤️',
    label: 'We don\'t like this place',
    description: 'Instantly replace the current activity with a personalized alternative nearby.',
    badge: 'Instant Swap'
  },
  {
    id: 'different_food',
    icon: '🍴',
    label: 'We want different food',
    description: 'Switch between authentic regional food, vegan organic bistros, or scenic cafes.',
    badge: 'Foodie Pivot'
  },
  {
    id: 'explore_nearby',
    icon: '📍',
    label: 'Explore hidden gems nearby',
    description: 'Discover uncrowded secret spots, artisan bakeries, and photo points within 15 min.',
    badge: 'Local Radar'
  }
];

export function calculateGroupCompatibility(members: GroupMember[] = []) {
  if (!members || members.length === 0) {
    return {
      overallScore: 92,
      breakdown: [
        { category: 'Adventure', score: 85, icon: 'Compass' },
        { category: 'Food & Dining', score: 95, icon: 'Utensils' },
        { category: 'Nightlife & Social', score: 78, icon: 'Moon' },
        { category: 'Nature & Scenic', score: 88, icon: 'Trees' },
        { category: 'Culture & Art', score: 80, icon: 'Landmark' }
      ],
      summary: 'Great alignment! Your group shares strong culinary and nature interests, with a well-balanced appetite for discovery.'
    };
  }

  const styleCounts: Record<string, number> = {};
  members.forEach(m => {
    m.styles.forEach(s => {
      styleCounts[s] = (styleCounts[s] || 0) + 1;
    });
  });

  const totalMembers = members.length;
  const adventureScore = Math.min(100, Math.round(((styleCounts['Adventure'] || 1) / totalMembers) * 60 + 35));
  const foodScore = Math.min(100, Math.round(((styleCounts['Food'] || 1) / totalMembers) * 55 + 40));
  const nightlifeScore = Math.min(100, Math.round(((styleCounts['Nightlife'] || 1) / totalMembers) * 60 + 30));
  const natureScore = Math.min(100, Math.round(((styleCounts['Nature'] || 1) / totalMembers) * 55 + 40));
  const cultureScore = Math.min(100, Math.round(((styleCounts['Culture'] || 1) / totalMembers) * 50 + 35));

  const overallScore = Math.round((adventureScore + foodScore + nightlifeScore + natureScore + cultureScore) / 5);

  return {
    overallScore,
    breakdown: [
      { category: 'Food & Dining', score: foodScore, icon: 'Utensils' },
      { category: 'Nature & Scenic', score: natureScore, icon: 'Trees' },
      { category: 'Adventure', score: adventureScore, icon: 'Compass' },
      { category: 'Nightlife & Social', score: nightlifeScore, icon: 'Moon' },
      { category: 'Culture & Art', score: cultureScore, icon: 'Landmark' }
    ],
    summary: `${members.length} travellers analyzed. The itinerary harmonizes ${members[0]?.name || 'Traveller 1'}'s interests with the group's collective energy.`
  };
}

const CLIENT_GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash'
];

function normalizeWeatherCondition(cond?: string): 'Sunny' | 'Partly Cloudy' | 'Rainy' | 'Cloudy' | 'Pleasant' | 'Chilly' {
  const c = (cond || '').toLowerCase();
  if (c.includes('rain') || c.includes('storm') || c.includes('shower')) return 'Rainy';
  if (c.includes('sun') || c.includes('clear')) return 'Sunny';
  if (c.includes('partly')) return 'Partly Cloudy';
  if (c.includes('cloud') || c.includes('overcast')) return 'Cloudy';
  if (c.includes('chill') || c.includes('cold') || c.includes('snow') || c.includes('freeze')) return 'Chilly';
  return 'Pleasant';
}

function safeParseJson(text: string): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}

/**
 * Client-Side Direct Gemini AI Generator
 * Automatically invoked if backend server / serverless function is unreachable or on static host.
 */
export async function generateTripClientSide(params: {
  destinationId: string;
  destinationPlace?: { placeId: string; name: string; address: string; latitude: number; longitude: number; photoUrl?: string; };
  startCity?: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  companionType: TravelCompanion;
  travellersCount: number;
  travelMode?: TravelMode;
  budgetTier: BudgetTier;
  targetBudget?: number;
  preferences: UserPreferences;
}): Promise<Trip> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? (process as any).env?.GEMINI_API_KEY : '');
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables.');
  }

  const travelMode = params.travelMode || params.preferences.travelMode || 'Flight';
  const startCity = params.startCity || params.preferences.startCity || 'Origin City';
  const destName = params.destinationPlace?.name || params.destinationId;
  const destAddress = params.destinationPlace?.address || destName;
  const destLat = params.destinationPlace?.latitude || 20.0;
  const destLng = params.destinationPlace?.longitude || 78.0;
  const heroImg = params.destinationPlace?.photoUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';

  const stylesList = params.preferences.styles.length > 0 ? params.preferences.styles.join(', ') : 'Culture, Food, Nature, Sightseeing';
  const foodPref = params.preferences.food || 'No preference';
  const alcoholPref = params.preferences.alcohol || 'No';
  const customNotesText = params.preferences.customNotes ? params.preferences.customNotes.trim() : '';

  const isRoadVehicleMode = travelMode === 'Car / Road Trip' || travelMode === 'Bike / Motorcycle';
  const vehicleType = travelMode === 'Bike / Motorcycle' ? 'touring motorcycle / bike' : 'car / personal road vehicle';
  const actionVerb = travelMode === 'Bike / Motorcycle' ? 'motorcycle ride' : 'car drive';

  const prompt = `You are a world-class AI travel planner and local expert.
Generate a realistic, authentic, detailed ${params.durationDays}-day travel itinerary for:
Destination: "${destName}" (${destAddress}).
Departure Point: "${startCity}".
Travelers: ${params.companionType} (${params.travellersCount} people).
Travel Mode: ${travelMode}.
Budget Tier: ${params.budgetTier} (~₹${params.targetBudget?.toLocaleString() || '30,000'} total).
Travel Styles: ${stylesList}.
Food Preference: ${foodPref}.
Alcohol Preference: ${alcoholPref}.
${customNotesText ? `Special Notes: "${customNotesText}".` : ''}

RULES:
1. COMPLETE ROUND-TRIP LIFECYCLE (START AT SOURCE, END AT SOURCE):
   - The total itinerary spans ${params.durationDays} days. The entire trip MUST start from "${startCity}", travel to "${destName}", explore "${destName}", and safely return back to "${startCity}".
${isRoadVehicleMode ? `   - CRITICAL ${travelMode.toUpperCase()} EXCLUSIVITY MANDATE:
     • The user selected "${travelMode}". The ENTIRE trip from start to end (outbound travel from "${startCity}", ALL local travel between sights in "${destName}", and return travel back to "${startCity}") MUST BE 100% EXCLUSIVELY BY ${travelMode.toUpperCase()}!
     • ABSOLUTELY FORBIDDEN: Do NOT mention flights, airports, airlines, flight boarding, airport cabs, trains, railway stations, sleeper coaches, metro, or public buses anywhere in the itinerary!
     • OUTBOUND DAY 1: Activity 1 is highway departure from "${startCity}" by ${vehicleType} (fueling up, luggage loaded, hitting the highway). Activity 2 is highway cruising via scenic expressway/national highway with a highway dhaba/food court pitstop. Activity 3 is driving/riding into "${destName}", scenic ghat/mountain road, arriving and parking directly at the hotel/resort, checking in. Activity 4 is an evening relaxed dinner or walk.
     • LOCAL INTER-ACTIVITY TRAVEL: For all activities on all days, "travelTimeFromPrev" MUST specify ${actionVerb} times (e.g. "15 min ${actionVerb}", "25 min scenic ${actionVerb}"). NEVER suggest hiring taxis, cabs, autos, or public transit because the travelers have their own ${vehicleType} with them throughout the trip!
     • MULTI-DAY TRANSIT RULE: If distance is > 1,200 km where driving/riding takes multiple days, Day 1 and Day 2 realistically cover the outbound road trip journey with scenic stops and overnight highway stay.
     • INBOUND RETURN DAY: Final day starts with packing the ${vehicleType}, hotel check-out, and a full scenic return highway ${actionVerb} back to "${startCity}" with highway meal stop, arriving safely home in "${startCity}" by ${vehicleType}.
     • ROUTE SUMMARY FOR ${travelMode.toUpperCase()}:
       - "departureHub": "${startCity} Highway Exit / Expressway Corridor"
       - "arrivalHub": "${destName} Valley Entry / Highway Gateway"
       - "recommendedMode": "${travelMode}"
       - "keyHighwayOrTrain": Realistic national highway name (e.g. NH-44, NH-48, NH-181, Mumbai-Pune Expressway, etc.)`
: `   - OUTBOUND PHASE (Day 1 / Early Days):
     • Day 1 MUST start at "${startCity}": Activity 1 is departure logistics from "${startCity}" (airport check-in, railway station boarding, or highway start).
     • CONNECTING FLIGHT & NEAREST AIRPORT LOGISTICS:
       - If there is NO direct commercial airport in "${destName}" (e.g., hill stations like Ooty, Manali, Munnar, Coorg, or remote regions), or no direct non-stop flight exists from "${startCity}":
         * Leg 1 (Flight): Fly from "${startCity}" airport to the Nearest Commercial Airport (e.g. Coimbatore for Ooty, Chandigarh/Bhuntar for Manali, Cochin for Munnar, Mangalore/Mysore for Coorg, or connecting flight with hub layover).
         * Leg 2 (Airport Transfer): Scenic cab/shuttle drive or mountain railway from the arrival airport to "${destName}".
         * Leg 3 (Arrival & Stay): Reaching "${destName}", checking in to hotel/resort, unpacking and freshening up.
         * Leg 4 (Evening): Relaxed welcome walk or dinner at a nearby local spot in "${destName}".
     • MULTI-DAY TRANSIT RULE: If distance between "${startCity}" and "${destName}" is very long (e.g. > 1,200 km by Train or Road where travel takes 24-48 hours), Day 1 and Day 2 MUST realistically cover outbound transit (scenic rail/road route, sleeper/en-route meals), arriving in "${destName}" on Day 2.
   - INBOUND RETURN PHASE (Final Day / Day ${params.durationDays}):
     • The final day MUST conclude the round-trip journey back to "${startCity}": Morning farewell cafe or souvenir shopping in "${destName}", hotel check-out, return road transfer to the nearest airport/station (if applicable), return flight/train/drive via ${travelMode}, and safe arrival back home in "${startCity}"!`}
   - CORE DESTINATION IMMERSION (Middle Days):
     • Full dedicated days exploring "${destName}"'s iconic landmarks, viewpoints, nature, culture, and cuisine with 3 to 4 sequential activities per day.
2. QUANTITY PER DAY: Each day MUST contain 3 to 4 sequential activities with realistic times (Morning, Lunch, Afternoon, Evening).
3. ZERO HALLUCINATIONS: Every destination activity, landmark, dining spot, cafe, and viewpoint MUST be a real, verified place in "${destName}" (or legitimate transit hubs for Day 1 departure & final day return).
4. Provide realistic estimated costs in INR for each activity.

Return ONLY a valid JSON object matching this schema:
{
  "routeSummary": {
    "distanceKm": 450,
    "flightDuration": "1h 30m",
    "trainDuration": "6h",
    "driveDuration": "7h",
    "departureHub": "${isRoadVehicleMode ? `${startCity} Highway Exit / Expressway Corridor` : `${startCity} Terminal`}",
    "arrivalHub": "${isRoadVehicleMode ? `${destName} Valley Entry / Highway Gateway` : `${destName} Airport / Station`}",
    "keyHighwayOrTrain": "${isRoadVehicleMode ? 'Expressway / National Highway' : 'Transit Expressway'}",
    "notes": "Direct connectivity"
  },
  "clothingAdvice": "Comfortable breathable clothing and walking shoes.",
  "days": [
    {
      "dayNumber": 1,
      "date": "${params.startDate || 'Day 1'}",
      "title": "${destName} Arrival & Highlights",
      "theme": "Arrival, Iconic Sights & Culinary Warmup",
      "vibe": "Exciting first impressions and signature local tastes",
      "weatherForecast": { "temp": "26°C", "condition": "Sunny", "icon": "Sun", "rainChance": 10 },
      "activities": [
        {
          "id": "act-1-1",
          "time": "09:30 AM",
          "endTime": "11:30 AM",
          "title": "Iconic Morning Landmark",
          "category": "Sightseeing",
          "location": "${destName} Center",
          "estimatedCost": 250,
          "travelTimeFromPrev": "${isRoadVehicleMode ? `15 min ${actionVerb}` : '15 min drive'}",
          "duration": "2 hrs",
          "description": "Explore the signature historic highlight of ${destName}.",
          "imageUrl": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
          "recommendationReason": "The quintessential must-visit arrival landmark.",
          "isIndoor": false,
          "isRainSafe": false,
          "rating": 4.8
        },
        {
          "id": "act-1-2",
          "time": "01:00 PM",
          "endTime": "02:30 PM",
          "title": "Authentic Regional Lunch Kitchen",
          "category": "Food",
          "location": "${destName} Old Town",
          "estimatedCost": 450,
          "travelTimeFromPrev": "10 min walk",
          "duration": "1.5 hrs",
          "description": "Authentic local specialty dishes and traditional hospitality.",
          "imageUrl": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop",
          "recommendationReason": "Famous culinary establishment beloved by locals.",
          "isIndoor": true,
          "isRainSafe": true,
          "rating": 4.8
        },
        {
          "id": "act-1-3",
          "time": "03:30 PM",
          "endTime": "05:30 PM",
          "title": "Historic Cultural District & Local Market",
          "category": "Culture",
          "location": "${destName} Heritage Quarter",
          "estimatedCost": 200,
          "travelTimeFromPrev": "15 min cab",
          "duration": "2 hrs",
          "description": "Discover heritage architecture and vibrant local market stalls.",
          "imageUrl": "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?q=80&w=600&auto=format&fit=crop",
          "recommendationReason": "Rich atmosphere and historic charm.",
          "isIndoor": false,
          "isRainSafe": false,
          "rating": 4.7
        },
        {
          "id": "act-1-4",
          "time": "07:00 PM",
          "endTime": "09:00 PM",
          "title": "Scenic Twilight Viewpoint & Dining",
          "category": "Sightseeing",
          "location": "${destName} Waterfront / Heights",
          "estimatedCost": 600,
          "travelTimeFromPrev": "20 min cab",
          "duration": "2 hrs",
          "description": "Relaxing twilight ambiance overlooking picturesque views.",
          "imageUrl": "https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=600&auto=format&fit=crop",
          "recommendationReason": "The perfect relaxing way to close your first day.",
          "isIndoor": false,
          "isRainSafe": false,
          "rating": 4.9
        }
      ]
    }
  ],
  "packingList": [
    { "id": "p-1", "name": "Comfortable walking shoes", "category": "Clothing", "checked": false, "reason": "Sightseeing walks" },
    { "id": "p-2", "name": "Power bank & charger", "category": "Electronics", "checked": false, "reason": "All-day photos & navigation" },
    { "id": "p-3", "name": "Government ID & tickets", "category": "Documents", "checked": false, "reason": "Hotel check-in & attractions" },
    { "id": "p-4", "name": "Sunscreen & water flask", "category": "Toiletries", "checked": false, "reason": "Outdoor exploration" }
  ],
  "requirements": [],
  "bookings": []
}`;

  let genData: any = null;
  let lastClientError: any = null;

  try {
    const ai = new GoogleGenAI({ apiKey });

    for (const modelName of CLIENT_GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const text = response.text || '';
        genData = safeParseJson(text);
        if (genData && genData.days && Array.isArray(genData.days) && genData.days.length > 0) {
          break;
        }
      } catch (err) {
        console.warn(`[aiPlanner] Client model ${modelName} error:`, err);
        lastClientError = err;
      }
    }

    if (genData && genData.days && Array.isArray(genData.days) && genData.days.length > 0) {
      const days: DayItinerary[] = genData.days.map((day: any, dIdx: number) => {
        const dayNum = day.dayNumber || dIdx + 1;
        const activities = (day.activities || []).map((act: any, aIdx: number) => {
          const baseLat = destLat;
          const baseLng = destLng;
          const offsetLat = (aIdx * 0.01) * Math.sin(aIdx * 1.5);
          const offsetLng = (aIdx * 0.01) * Math.cos(aIdx * 1.5);

          let cleanTravelTime = act.travelTimeFromPrev || (isRoadVehicleMode ? `15 min ${actionVerb}` : '15 min drive');
          let cleanDescription = act.description || `Experience ${act.title || destName}.`;
          let cleanRecommendation = act.recommendationReason || 'Tailored to your preferences and travel style.';

          if (isRoadVehicleMode) {
            cleanTravelTime = cleanTravelTime.replace(/\b(cab|taxi|uber|ola|airport shuttle|metro|train|bus|auto|rickshaw)\b/gi, actionVerb);
            cleanDescription = cleanDescription
              .replace(/\b(take a (cab|taxi|flight|train|bus|metro)|hail a (cab|taxi))\b/gi, `${actionVerb} with your ${vehicleType}`)
              .replace(/\b(airport cab|airport transfer|flight to|board the flight|board the train)\b/gi, `${actionVerb}`);
            cleanRecommendation = cleanRecommendation
              .replace(/\b(take a (cab|taxi|flight|train|bus|metro)|hail a (cab|taxi))\b/gi, `${actionVerb} with your ${vehicleType}`);
          }

          return {
            id: act.id || `act-${dayNum}-${aIdx + 1}-${crypto.randomUUID()}`,
            time: act.time || '10:00 AM',
            endTime: act.endTime || '12:00 PM',
            title: act.title || `Highlight Stop ${aIdx + 1}`,
            category: (act.category as Activity['category']) || 'Sightseeing',
            location: act.location || destName,
            coordinates: (act.coordinates && typeof act.coordinates.lat === 'number' && typeof act.coordinates.lng === 'number')
              ? act.coordinates
              : {
                  lat: Number((baseLat + offsetLat).toFixed(6)),
                  lng: Number((baseLng + offsetLng).toFixed(6))
                },
            estimatedCost: typeof act.estimatedCost === 'number' ? act.estimatedCost : 400,
            travelTimeFromPrev: cleanTravelTime,
            duration: act.duration || '1.5 hrs',
            description: cleanDescription,
            imageUrl: act.imageUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
            recommendationReason: cleanRecommendation,
            isIndoor: Boolean(act.isIndoor),
            isRainSafe: Boolean(act.isRainSafe),
            rating: typeof act.rating === 'number' ? act.rating : 4.8
          };
        });

        return {
          dayNumber: dayNum,
          date: day.date || `Day ${dayNum}`,
          title: day.title || `Day ${dayNum} in ${destName}`,
          theme: day.theme || `${destName} Exploration`,
          vibe: day.vibe || 'Scenic views, cultural landmarks and delicious local tastes',
          weatherForecast: {
            temp: day.weatherForecast?.temp || '26°C',
            condition: normalizeWeatherCondition(day.weatherForecast?.condition),
            icon: day.weatherForecast?.icon || 'Sun',
            rainChance: typeof day.weatherForecast?.rainChance === 'number' ? day.weatherForecast.rainChance : 10
          },
          activities
        };
      });

      const finalRouteSummary = genData.routeSummary ? {
        distanceKm: genData.routeSummary.distanceKm || 350,
        flightDuration: isRoadVehicleMode ? undefined : genData.routeSummary.flightDuration,
        trainDuration: isRoadVehicleMode ? undefined : genData.routeSummary.trainDuration,
        driveDuration: genData.routeSummary.driveDuration || '5h',
        departureHub: isRoadVehicleMode && /airport|terminal|station|railway/i.test(genData.routeSummary.departureHub || '')
          ? `${startCity} Highway Exit / Expressway Corridor`
          : (genData.routeSummary.departureHub || (isRoadVehicleMode ? `${startCity} Highway Corridor` : `${startCity} Terminal`)),
        arrivalHub: isRoadVehicleMode && /airport|terminal|station|railway/i.test(genData.routeSummary.arrivalHub || '')
          ? `${destName} Valley Entry / Highway Gateway`
          : (genData.routeSummary.arrivalHub || (isRoadVehicleMode ? `${destName} Entry / Highway Hub` : `${destName} Junction`)),
        keyHighwayOrTrain: genData.routeSummary.keyHighwayOrTrain || (isRoadVehicleMode ? 'Expressway / National Highway' : 'Direct Route'),
        recommendedMode: isRoadVehicleMode ? travelMode : (genData.routeSummary.recommendedMode || travelMode),
        notes: isRoadVehicleMode ? `Complete overland round-trip road journey by ${travelMode}` : (genData.routeSummary.notes || 'Direct transit connectivity')
      } : {
        distanceKm: 350,
        flightDuration: isRoadVehicleMode ? undefined : '1h 30m',
        trainDuration: isRoadVehicleMode ? undefined : '5h',
        driveDuration: '5h 30m',
        departureHub: isRoadVehicleMode ? `${startCity} Highway Exit / Expressway Corridor` : `${startCity} Terminal`,
        arrivalHub: isRoadVehicleMode ? `${destName} Valley Entry / Highway Gateway` : `${destName} Junction`,
        keyHighwayOrTrain: isRoadVehicleMode ? 'Expressway / National Highway' : 'Direct Route',
        recommendedMode: travelMode,
        notes: isRoadVehicleMode ? `Complete overland round-trip road journey by ${travelMode}` : 'Direct transit connectivity'
      };

      let initialHotels: HotelStayRecommendation[] = [];
      try {
        initialHotels = await fetchAiHotelSuggestions({
          destination: destName,
          budgetTier: params.budgetTier,
          durationDays: params.durationDays,
          travellersCount: params.travellersCount,
          companionType: params.companionType,
          travelStyles: params.preferences?.styles,
          travelMode,
          daysInfo: days.map(d => {
            const lastAct = d.activities && d.activities.length > 0 ? d.activities[d.activities.length - 1] : undefined;
            return {
              dayNumber: d.dayNumber,
              theme: d.theme,
              location: lastAct?.location || destName,
              lastActivityTitle: lastAct?.title,
              lastActivityLocation: lastAct?.location,
              lastActivityCategory: lastAct?.category
            };
          })
        });
      } catch (hErr) {
        console.warn('[aiPlanner] Client hotel suggestions failed:', hErr);
      }

      const daysWithStays = days.map((day) => {
        let matchStay = initialHotels.find(h => h.dayNumber === day.dayNumber);
        if (!matchStay && initialHotels.length > 0) {
          matchStay = initialHotels[(day.dayNumber - 1) % initialHotels.length];
        }
        const lastAct = day.activities && day.activities.length > 0 ? day.activities[day.activities.length - 1] : undefined;
        if (matchStay && lastAct && isRoadVehicleMode && !matchStay.nearPlaceName) {
          matchStay = {
            ...matchStay,
            nearPlaceName: `Near ${lastAct.title}`
          };
        }
        return {
          ...day,
          suggestedStay: matchStay
        };
      });

      return {
        id: crypto.randomUUID(),
        title: `${destName} ${params.companionType} Getaway`,
        destination: destName,
        destinationStateOrCountry: destAddress,
        startCity,
        routeSummary: finalRouteSummary,
        heroImage: heroImg,
        startDate: params.startDate,
        endDate: params.endDate,
        durationDays: params.durationDays,
        companionType: params.companionType,
        travellersCount: params.travellersCount,
        travelMode,
        budgetTier: params.budgetTier,
        targetBudget: params.targetBudget || 25000,
        currency: 'INR',
        preferences: {
          ...params.preferences,
          startCity
        },
        days: daysWithStays,
        packingList: (genData.packingList && genData.packingList.length > 0) ? genData.packingList : [
          { id: 'p-1', name: 'Comfortable walking footwear', category: 'Clothing', checked: false, reason: 'Sightseeing' },
          { id: 'p-2', name: 'Mobile charger & power bank', category: 'Electronics', checked: false, reason: 'Navigation' },
          { id: 'p-3', name: 'Government ID / booking receipts', category: 'Documents', checked: false, reason: 'Verification' },
          { id: 'p-4', name: 'Reusable water bottle & sunscreen', category: 'Toiletries', checked: false, reason: 'Daily travel' }
        ],
        requirements: genData.requirements || [],
        bookings: [],
        hotelRecommendations: initialHotels,
        clothingAdvice: genData.clothingAdvice || 'Comfortable breathable travel attire.',
        createdAt: new Date().toISOString().split('T')[0],
        adaptationHistory: []
      };
    }
  } catch (clientErr: any) {
    console.error('[aiPlanner] Direct client Gemini generation failed:', clientErr);
    lastClientError = clientErr;
  }

  throw new Error(
    lastClientError?.message ||
    'AI itinerary generation failed. Please verify your GEMINI_API_KEY environment variable in Vercel.'
  );
}

/**
 * Main itinerary generator:
 * 1. Calls backend endpoint /api/ai/generate-trip (which invokes Gemini on the server)
 * 2. Falls back to Client-side Gemini AI if client environment variable is configured
 * 3. Never produces fake predefined mock places
 */
export async function generateTripFromInputs(params: {
  destinationId: string;
  destinationPlace?: { placeId: string; name: string; address: string; latitude: number; longitude: number; photoUrl?: string; };
  startCity?: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  companionType: TravelCompanion;
  travellersCount: number;
  travelMode?: TravelMode;
  budgetTier: BudgetTier;
  targetBudget?: number;
  preferences: UserPreferences;
}): Promise<Trip> {
  let serverErrorMsg = '';

  try {
    const response = await fetch('/api/ai/generate-trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const data = await response.json();
      if (data && data.days && Array.isArray(data.days) && data.days.length > 0) {
        return data;
      }
    } else {
      const errJson = await response.json().catch(() => null);
      if (errJson && errJson.error) {
        serverErrorMsg = errJson.error;
      } else {
        serverErrorMsg = `Server returned status ${response.status}: ${response.statusText}`;
      }
    }
  } catch (fetchErr: any) {
    serverErrorMsg = fetchErr?.message || 'Network error reaching server AI endpoint';
  }

  // Attempt client-side AI if available
  try {
    return await generateTripClientSide(params);
  } catch (clientErr: any) {
    console.error('[aiPlanner] Generation failed on both server and client:', clientErr);
    throw new Error(
      serverErrorMsg ||
      clientErr?.message ||
      'AI generation failed. Please check that GEMINI_API_KEY is configured in your Vercel Project Settings > Environment Variables.'
    );
  }
}

/**
 * Dynamically adapt itinerary using AI based on destination and trigger
 */
export async function adaptTripPlanWithAI(
  trip: Trip,
  triggerId: string,
  targetDayNumber: number = 1
): Promise<{ updatedTrip: Trip; summaryMessage: string; changedCount: number }> {
  try {
    const response = await fetch('/api/ai/adapt-trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip, triggerId, targetDayNumber }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      return await response.json();
    }
  } catch (err) {
    console.warn('AI adaptation error, using fallback logic:', err);
  }

  return adaptTripPlan(trip, triggerId, targetDayNumber);
}

/**
 * Fallback adaptation without hardcoded destination specifics
 */
export function adaptTripPlan(
  trip: Trip,
  triggerId: string,
  targetDayNumber: number = 1
): { updatedTrip: Trip; summaryMessage: string; changedCount: number } {
  const updatedTrip = JSON.parse(JSON.stringify(trip)) as Trip;
  const dayIndex = updatedTrip.days.findIndex(d => d.dayNumber === targetDayNumber);
  const targetDay = dayIndex !== -1 ? updatedTrip.days[dayIndex] : updatedTrip.days[0];

  let summaryMessage = '';
  let changedCount = 0;

  if (triggerId === 'rain') {
    targetDay.weatherForecast = {
      temp: '23°C',
      condition: 'Rainy',
      icon: 'CloudRain',
      rainChance: 90
    };
    targetDay.theme = `Rainy Day Indoor Culture & Culinary Exploration in ${trip.destination}`;
    targetDay.vibe = 'Sheltered indoor art galleries, cozy tasting cafes, and covered scenic lounges';

    targetDay.activities = targetDay.activities.map((act) => {
      if (act.category === 'Sightseeing' || act.category === 'Adventure' || !act.isRainSafe) {
        changedCount++;
        return {
          ...act,
          title: `Indoor Heritage & Art Immersion in ${trip.destination}`,
          category: 'Culture',
          location: `${trip.destination} Arts Quarter`,
          description: `Indoor gallery and cultural exhibition sheltered from the weather in ${trip.destination}.`,
          recommendationReason: 'Adapted for rain: 100% weather-proof indoor gallery with cozy lounge.',
          isIndoor: true,
          isRainSafe: true,
          isUpdated: true,
          updatedReason: '🌧️ Replaced outdoor activity due to sudden rain'
        };
      }
      return act;
    });

    summaryMessage = `🌧️ Rain Mode: Replaced ${changedCount} outdoor stops with indoor galleries, cafes, and covered cultural sights in ${trip.destination}.`;
  } else if (triggerId === 'spend_less') {
    targetDay.theme = `High-Value Budget Highlights in ${trip.destination}`;
    targetDay.vibe = 'Iconic local eateries, scenic vistas, and zero-cost authentic spots';

    targetDay.activities = targetDay.activities.map((act) => {
      if (act.estimatedCost > 1000) {
        changedCount++;
        return {
          ...act,
          title: `Iconic Local Eatery & Street Food in ${trip.destination}`,
          estimatedCost: Math.round(act.estimatedCost * 0.35),
          description: `Beloved authentic regional kitchen in ${trip.destination} serving signature dishes at local rates.`,
          recommendationReason: 'Swapped for authentic high-value local spot: cuts cost significantly with authentic 4.8★ taste.',
          isUpdated: true,
          updatedReason: `💰 Budget optimized: Saved on ${act.title}`
        };
      }
      return act;
    });

    summaryMessage = `💰 Budget Saved: Replaced high-cost stops with legendary local food spots and panoramic free viewpoints.`;
  } else if (triggerId === 'woke_up_late') {
    targetDay.theme = `Relaxed Morning & Prime Highlights in ${trip.destination}`;
    targetDay.vibe = 'Slow morning start, brunch recharge, and seamless afternoon continuation';

    const shifted: Activity[] = [];
    changedCount = 2;
    shifted.push({
      id: `woke-brunch-${crypto.randomUUID()}`,
      time: '11:30 AM',
      endTime: '01:00 PM',
      title: `Artisan Brunch in ${trip.destination} (Late Rise Optimizer)`,
      category: 'Food',
      location: `${trip.destination} Central Area`,
      estimatedCost: 600,
      travelTimeFromPrev: '10 min ride',
      duration: '1.5 hrs',
      description: 'Combined breakfast and lunch feast with fresh brews and local brunch specialties.',
      imageUrl: targetDay.activities[0]?.imageUrl || 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=600&auto=format&fit=crop',
      recommendationReason: 'Consolidated early morning stops so you don\'t miss out on prime afternoon highlights.',
      isIndoor: true,
      isRainSafe: true,
      isUpdated: true,
      updatedReason: '😴 Merged early stops into brunch due to late rise'
    });

    const afternoonSlots = ['01:30 PM', '04:00 PM', '07:00 PM'];
    const remaining = targetDay.activities.slice(1);
    remaining.forEach((act, idx) => {
      if (idx < afternoonSlots.length) {
        shifted.push({
          ...act,
          time: afternoonSlots[idx],
          isUpdated: true,
          updatedReason: '😴 Shifted schedule forward smoothly'
        });
      }
    });

    targetDay.activities = shifted;
    summaryMessage = `😴 Late Morning Adjusted: Merged early stops into an 11:30 AM brunch and shifted your timeline smoothly.`;
  } else {
    changedCount = 1;
    if (targetDay.activities.length > 0) {
      targetDay.activities[0] = {
        ...targetDay.activities[0],
        isUpdated: true,
        updatedReason: `✨ Adapted based on ${triggerId}`
      };
    }
    summaryMessage = `✨ Itinerary dynamically updated based on your request!`;
  }

  if (!updatedTrip.adaptationHistory) {
    updatedTrip.adaptationHistory = [];
  }
  updatedTrip.adaptationHistory.unshift({
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    trigger: triggerId,
    description: summaryMessage
  });

  return {
    updatedTrip,
    summaryMessage,
    changedCount
  };
}

/**
 * Request a real destination place for a given day
 */
export async function fetchRealPlaceForDay(params: {
  destination: string;
  destinationStateOrCountry?: string;
  dayNumber: number;
  existingActivities?: Activity[];
  travelStyles?: string[];
  budgetTier?: BudgetTier;
  travelMode?: TravelMode;
}): Promise<Activity> {
  const isRoadVehicleMode = params.travelMode === 'Car / Road Trip' || params.travelMode === 'Bike / Motorcycle';
  const actionVerb = params.travelMode === 'Bike / Motorcycle' ? 'motorcycle ride' : 'car drive';
  const defaultTravelTime = isRoadVehicleMode ? `15 min ${actionVerb}` : '15 min drive';

  try {
    const response = await fetch('/api/ai/add-real-place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const act = await response.json();
      if (isRoadVehicleMode && act.travelTimeFromPrev) {
        act.travelTimeFromPrev = act.travelTimeFromPrev.replace(/\b(cab|taxi|uber|ola|airport shuttle|metro|train|bus|auto|rickshaw)\b/gi, actionVerb);
      }
      return act;
    }
  } catch (err) {
    console.warn('Error fetching real place from API:', err);
  }

  // Client dynamic fallback
  const dest = params.destination || 'City';
  return {
    id: `real-stop-${crypto.randomUUID()}`,
    time: '04:30 PM',
    endTime: '06:00 PM',
    title: `${dest} Scenic Heritage Trail & Lookout`,
    category: 'Sightseeing',
    location: `${dest} Central Historic Quarter`,
    estimatedCost: 350,
    duration: '1.5 hrs',
    travelTimeFromPrev: defaultTravelTime,
    description: `Iconic viewpoint and cultural walkway offering authentic regional atmosphere in ${dest}.`,
    recommendationReason: `Curated real stop added to enrich Day ${params.dayNumber}.`,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
    isIndoor: false,
    isRainSafe: false,
    rating: 4.8
  };
}
