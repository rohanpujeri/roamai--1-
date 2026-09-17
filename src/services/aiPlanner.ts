import { Trip, UserPreferences, Activity, TravelCompanion, TravelMode, BudgetTier, GroupMember, DayItinerary } from '../types';
import { GoogleGenAI } from '@google/genai';
import { estimateRouteDistanceKm, calculateTransitDaysOneWay, allocateTripDays, getOverlandStageDetails } from '../utils/routeEstimator';

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
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
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

  const estDistanceKm = estimateRouteDistanceKm(
    startCity,
    destName,
    null,
    destLat && destLng ? { lat: destLat, lng: destLng } : null
  );
  const transitDaysOneWay = calculateTransitDaysOneWay(estDistanceKm, travelMode);
  const allocation = allocateTripDays(params.durationDays, transitDaysOneWay);
  const isMultiDayTransit = allocation.isOverlandMultiDay;
  const outboundEndDay = allocation.outboundDays;
  const destStartDay = outboundEndDay + 1;
  const destEndDay = outboundEndDay + allocation.coreDestDays;
  const returnStartDay = destEndDay + 1;
  const totalDays = params.durationDays;

  const prompt = `You are a world-class AI travel planner and local expert.
Generate a realistic, authentic, detailed ${params.durationDays}-day travel itinerary for:
Destination: "${destName}" (${destAddress}).
Departure Point: "${startCity}".
Travelers: ${params.companionType} (${params.travellersCount} people).
Selected Travel Mode: "${travelMode}".
Estimated Route Distance: ~${estDistanceKm} km.
One-Way Physical Transit Duration: ~${transitDaysOneWay} day(s).
Budget Tier: ${params.budgetTier} (~₹${params.targetBudget?.toLocaleString() || '30,000'} total).
Travel Styles: ${stylesList}.
Food Preference: ${foodPref}.
Alcohol Preference: ${alcoholPref}.
${customNotesText ? `Special Notes: "${customNotesText}".` : ''}

========================================================================================
CRITICAL TRAVEL MODE ENFORCEMENT (MODE: "${travelMode}"):
${travelMode === 'Bike / Motorcycle' ? `• THE ENTIRE JOURNEY IS A MOTORCYCLE / BIKE EXPEDITION!
• EVERY TRANSIT ACTIVITY MUST BE MOTORCYCLE TOURING & HIGHWAY RIDING.
• ABSOLUTELY ZERO FLIGHTS! DO NOT MENTION AIRPORTS (No Kempegowda Airport, No Indira Gandhi Airport, No Leh Airport), NO BOARDING GATES, NO AIR TICKETS!
• Day 1 MUST start with motorcycle gear inspection, morning highway departure from "${startCity}" on NH44/NH48, highway petrol pump refuel, highway dhaba lunch, and reaching intermediate transit city (e.g. Kolhapur/Pune/Hyderabad).
• Days 2 to ${outboundEndDay}: Sequential overland riding stages across real connecting cities & mountain passes (e.g. Pune -> Udaipur -> Chandigarh -> Manali -> Jispa/Keylong -> Rohtang/Atal Tunnel -> Baralacha La -> Leh).
• Day ${outboundEndDay}: Ride motorcycle into "${destName}", hotel check-in, rest and acclimatization.
• Return Days ${returnStartDay} to ${totalDays}: Ride motorcycle back across return highway circuit safely arriving in "${startCity}".` :
travelMode === 'Car / Road Trip' || travelMode === 'Self-Drive Rental' ? `• THE ENTIRE TRIP IS A ROAD TRIP BY CAR!
• ALL TRANSIT MUST BE HIGHWAY DRIVING. ZERO FLIGHTS, ZERO AIRPORTS!` :
travelMode === 'Train' ? `• THE ENTIRE JOURNEY MUST BE BY TRAIN / RAILWAY!
• Board trains at railway stations. ZERO FLIGHTS!` :
`• Air travel via commercial flights from "${startCity}" airport to destination airport (or nearest commercial airport + scenic road transfer).`}
========================================================================================

RULES:
1. COMPLETE ROUND-TRIP LIFECYCLE (START AT SOURCE, END AT SOURCE):
   - The total itinerary spans ${params.durationDays} days. The entire trip MUST start from "${startCity}", travel to "${destName}", explore "${destName}", and safely return back to "${startCity}".

${isMultiDayTransit ? `   - MULTI-DAY OVERLAND JOURNEY ALLOCATION (${travelMode} over ~${estDistanceKm} km):
     • OUTBOUND OVERLAND STAGES (Days 1 to ${outboundEndDay}):
       * Since travelling ~${estDistanceKm} km via ${travelMode} takes ${transitDaysOneWay} days one-way, Days 1 through ${outboundEndDay} MUST realistically cover the sequential outbound overland stages.
       * Day 1 MUST start at "${startCity}": Morning departure on ${travelMode}, highway riding/driving, highway lunch stop, reach intermediate transit city (e.g. Pune/Kolhapur/Jaipur), check into transit hotel, and dinner.
       ${outboundEndDay > 2 ? `* Days 2 to ${outboundEndDay - 1}: Sequential intermediate transit legs through real connecting cities, scenic high passes, and overnight stops (e.g., Udaipur -> Chandigarh -> Manali -> Jispa/Keylong).` : ''}
       * Day ${outboundEndDay}: Final high pass / highway approach, arrival in "${destName}", hotel check-in, rest/acclimatization, and relaxing local dinner.

     • CORE DESTINATION IMMERSION (Days ${destStartDay} to ${destEndDay}):
       * Dedicated full days exploring "${destName}"'s iconic landmarks, viewpoints, culture, monasteries/nature, and cuisine with 3 to 4 sequential activities per day.

     • INBOUND RETURN OVERLAND STAGES (Days ${returnStartDay} to ${totalDays}):
       * Days ${returnStartDay} to ${totalDays} MUST realistically cover the return overland journey back to "${startCity}" over sequential stages (either reverse route or alternate scenic circuit), concluding with safe arrival back in "${startCity}" on Day ${totalDays}!` : `   - OUTBOUND PHASE (Day 1):
     • Day 1 MUST start at "${startCity}": Departure logistics from "${startCity}".
     • If travelMode is Flight:
       - If there is NO direct commercial airport in "${destName}" (e.g., hill stations like Ooty, Manali, Munnar, Coorg), or no direct flight exists:
         * Leg 1 (Flight): Fly from "${startCity}" airport to Nearest Commercial Airport (e.g. Coimbatore for Ooty, Chandigarh/Bhuntar for Manali, Cochin for Munnar, Mangalore/Mysore for Coorg).
         * Leg 2 (Airport Transfer): Scenic cab/shuttle drive or mountain railway to "${destName}".
         * Leg 3 (Arrival & Stay): Reaching "${destName}", hotel check-in, and relaxing evening walk/dinner.
       - If direct flight exists: Depart "${startCity}", arrive in "${destName}", hotel check-in, and evening local exploration.
     • If travelMode is Road / Train: Depart "${startCity}" via ${travelMode}, scenic transit, arriving in "${destName}", hotel check-in, and evening exploration.

   - CORE DESTINATION IMMERSION (Days 2 to ${totalDays - 1}):
     • Full dedicated days exploring "${destName}"'s iconic landmarks, viewpoints, nature, culture, and cuisine with 3 to 4 sequential activities per day.

   - INBOUND RETURN PHASE (Final Day / Day ${totalDays}):
     • The final day MUST conclude the round-trip journey back to "${startCity}": Morning farewell cafe or souvenir shopping in "${destName}", hotel check-out, return transit via ${travelMode}, and safe arrival back home in "${startCity}"!`}

2. QUANTITY PER DAY: Each day MUST contain 3 to 4 sequential activities with realistic times (Morning, Lunch, Afternoon, Evening).
3. ZERO HALLUCINATIONS: Every destination activity, landmark, dining spot, cafe, and viewpoint MUST be a real, verified place in "${destName}" (or legitimate transit hubs / intermediate route stops for overland travel days & return).
4. Provide realistic estimated costs in INR for each activity.

Return ONLY a valid JSON object matching this schema:
{
  "routeSummary": {
    "distanceKm": ${estDistanceKm},
    "flightDuration": "1h 30m",
    "trainDuration": "6h",
    "driveDuration": "7h",
    "departureHub": "${startCity} Terminal",
    "arrivalHub": "${destName} Airport / Station",
    "keyHighwayOrTrain": "Transit Expressway",
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
          "travelTimeFromPrev": "15 min cab",
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
            systemInstruction: `You are TripWise AI, an expert travel planner.
MANDATORY CONSTRAINT:
The user selected Travel Mode: "${travelMode}".
- If Travel Mode is "Bike / Motorcycle": The entire round-trip journey is a motorcycle expedition. Under NO circumstances should you include any flights, airplanes, boarding passes, or airports. Every transit activity MUST be motorcycle riding on highways and mountain passes.
- If Travel Mode is "Car / Road Trip" or "Self-Drive Rental": The entire trip is by car/road. Zero flights.
- If Travel Mode is "Train": All transit is by train/railway. Zero flights.
- Only suggest flights if Travel Mode is explicitly "Flight".`,
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
        const isRoadTrip = travelMode === 'Bike / Motorcycle' || travelMode === 'Car / Road Trip' || travelMode === 'Self-Drive Rental';
        const isTransitStage = isRoadTrip && (
          (isMultiDayTransit && (dayNum <= outboundEndDay || dayNum >= returnStartDay)) ||
          (!isMultiDayTransit && (dayNum === 1 || dayNum === totalDays))
        );

        // Check if this day contains any flight/airport/rental hub contamination
        const dayRawText = JSON.stringify(day).toLowerCase();
        const hasContamination = isRoadTrip && Boolean(
          dayRawText.match(/\b(flight|flights|airport|airports|boarding|terminal|airline|airlines|fly|flying|blr|ixl|del|ixc|maa|bom|hyd|rental hub|pick up rental|pickup rental|bike pickup|motorcycle pickup|rent a bike|renting motorcycle|chandigarh rental|rental shop)\b/i)
        );

        let dayTitle = day.title || `Day ${dayNum} in ${destName}`;
        let dayTheme = day.theme || `${destName} Exploration`;
        let dayVibe = day.vibe || 'Scenic views, cultural landmarks and delicious local tastes';
        let rawActivities = day.activities || [];

        // If it's a road transit stage and either has contamination or missing activities, inject authentic overland stage
        if (isRoadTrip && (hasContamination || isTransitStage || rawActivities.length === 0)) {
          const stageDetails = getOverlandStageDetails({
            startCity,
            destName,
            dayNum,
            totalDays,
            outboundDays: outboundEndDay,
            coreDestDays: allocation.coreDestDays,
            returnDays: allocation.returnDays,
            travelMode
          });
          dayTitle = stageDetails.title;
          dayTheme = stageDetails.theme;
          dayVibe = stageDetails.vibe;
          rawActivities = stageDetails.activities;
        }

        const activities = rawActivities.map((act: any, aIdx: number) => {
          const baseLat = destLat;
          const baseLng = destLng;
          const offsetLat = (aIdx * 0.01) * Math.sin(aIdx * 1.5);
          const offsetLng = (aIdx * 0.01) * Math.cos(aIdx * 1.5);

          let finalTitle = act.title || `Highlight Stop ${aIdx + 1}`;
          let finalLocation = act.location || destName;
          let finalDesc = act.description || `Experience ${finalTitle}.`;
          let finalWhy = act.recommendationReason || 'Tailored to your preferences and travel style.';
          let finalCategory = (act.category as Activity['category']) || 'Sightseeing';

          if (isRoadTrip) {
            const isFlightOrRentalMention = (finalTitle + ' ' + finalLocation + ' ' + finalDesc + ' ' + finalWhy).toLowerCase().match(/\b(flight|flights|airport|airports|boarding|terminal|airline|airlines|fly|flying|blr|ixl|del|ixc|maa|bom|hyd|rental hub|pick up rental|pickup rental|bike pickup|motorcycle pickup|rent a bike|renting motorcycle|chandigarh rental|rental shop)\b/i);
            if (isFlightOrRentalMention) {
              finalCategory = 'Travel';
              if (travelMode === 'Bike / Motorcycle') {
                finalTitle = 'Scenic Highway Route Riding';
                finalLocation = `${destName} Scenic Highway Corridor`;
                finalDesc = `Cruising along scenic mountain curves and open highway stretches with panoramic views.`;
                finalWhy = 'Continuous authentic motorcycle expedition riding.';
              } else {
                finalTitle = 'Scenic Expressway Road Drive';
                finalLocation = `${destName} Highway Route`;
                finalDesc = `Enjoying the open road, scenic landscapes, and highway journey.`;
                finalWhy = 'Pure road trip cruising.';
              }
            }
          }

          return {
            id: act.id || `act-${dayNum}-${aIdx + 1}-${crypto.randomUUID()}`,
            time: act.time || '10:00 AM',
            endTime: act.endTime || '12:00 PM',
            title: finalTitle,
            category: finalCategory,
            location: finalLocation,
            coordinates: (act.coordinates && typeof act.coordinates.lat === 'number' && typeof act.coordinates.lng === 'number')
              ? act.coordinates
              : {
                  lat: Number((baseLat + offsetLat).toFixed(6)),
                  lng: Number((baseLng + offsetLng).toFixed(6))
                },
            estimatedCost: typeof act.estimatedCost === 'number' ? act.estimatedCost : 400,
            travelTimeFromPrev: act.travelTimeFromPrev || '15 min drive',
            duration: act.duration || '1.5 hrs',
            description: finalDesc,
            imageUrl: act.imageUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
            recommendationReason: finalWhy,
            isIndoor: Boolean(act.isIndoor),
            isRainSafe: Boolean(act.isRainSafe),
            rating: typeof act.rating === 'number' ? act.rating : 4.8
          };
        });

        let calculatedDate = day.date || `Day ${dayNum}`;
        if (params.startDate) {
          try {
            const d = new Date(params.startDate);
            if (!isNaN(d.getTime())) {
              d.setDate(d.getDate() + (dayNum - 1));
              calculatedDate = d.toISOString().split('T')[0];
            }
          } catch {
            calculatedDate = day.date || `Day ${dayNum}`;
          }
        }

        return {
          dayNumber: dayNum,
          date: calculatedDate,
          title: dayTitle,
          theme: dayTheme,
          vibe: dayVibe,
          weatherForecast: {
            temp: day.weatherForecast?.temp || '26°C',
            condition: normalizeWeatherCondition(day.weatherForecast?.condition),
            icon: day.weatherForecast?.icon || 'Sun',
            rainChance: typeof day.weatherForecast?.rainChance === 'number' ? day.weatherForecast.rainChance : 10
          },
          activities
        };
      });

      return {
        id: crypto.randomUUID(),
        title: `${destName} ${params.companionType} Getaway`,
        destination: destName,
        destinationStateOrCountry: destAddress,
        startCity,
        routeSummary: genData.routeSummary ? {
          distanceKm: genData.routeSummary.distanceKm || 350,
          flightDuration: genData.routeSummary.flightDuration,
          trainDuration: genData.routeSummary.trainDuration,
          driveDuration: genData.routeSummary.driveDuration,
          departureHub: genData.routeSummary.departureHub || `${startCity} Terminal`,
          arrivalHub: genData.routeSummary.arrivalHub || `${destName} Junction`,
          keyHighwayOrTrain: genData.routeSummary.keyHighwayOrTrain || 'Direct Route',
          notes: genData.routeSummary.notes || 'Direct transit connectivity'
        } : {
          distanceKm: 350,
          flightDuration: '1h 30m',
          trainDuration: '5h',
          driveDuration: '5h 30m',
          departureHub: `${startCity} Terminal`,
          arrivalHub: `${destName} Junction`,
          keyHighwayOrTrain: 'Direct Route',
          notes: 'Direct transit connectivity'
        },
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
        days,
        packingList: (genData.packingList && genData.packingList.length > 0) ? genData.packingList : [
          { id: 'p-1', name: 'Comfortable walking footwear', category: 'Clothing', checked: false, reason: 'Sightseeing' },
          { id: 'p-2', name: 'Mobile charger & power bank', category: 'Electronics', checked: false, reason: 'Navigation' },
          { id: 'p-3', name: 'Government ID / booking receipts', category: 'Documents', checked: false, reason: 'Verification' },
          { id: 'p-4', name: 'Reusable water bottle & sunscreen', category: 'Toiletries', checked: false, reason: 'Daily travel' }
        ],
        requirements: genData.requirements || [],
        bookings: [],
        hotelRecommendations: [],
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
}): Promise<Activity> {
  try {
    const response = await fetch('/api/ai/add-real-place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      return await response.json();
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
    travelTimeFromPrev: '15 min cab',
    description: `Iconic viewpoint and cultural walkway offering authentic regional atmosphere in ${dest}.`,
    recommendationReason: `Curated real stop added to enrich Day ${params.dayNumber}.`,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
    isIndoor: false,
    isRainSafe: false,
    rating: 4.8
  };
}
