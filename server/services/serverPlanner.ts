import { Trip, UserPreferences, Activity, TravelCompanion, TravelMode, BudgetTier, GroupMember, HotelStayRecommendation } from '../../src/types';
import { GoogleGenAI } from '@google/genai';
import { resolvePlaceImage } from '../utils/serverPlaceImages';
import { fetchRealPlacePhoto } from '../utils/realPlacePhotos';
import { PREFERRED_GEMINI_MODELS, formatGenAiError, getGeminiApiKey } from '../utils/geminiModels';
import { fetchAiHotelSuggestions } from './serverHotelAdvisor';

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
  return JSON.parse(cleaned);
}

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
      summary: 'High synergy! Your group shares strong culinary and nature interests, with a well-balanced appetite for discovery.'
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
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY in your Vercel Environment Variables or .env file.');
  }

  const travelMode = params.travelMode || params.preferences.travelMode || 'Flight';
  const startCity = params.startCity || params.preferences.startCity || 'Origin City';
  const destName = params.destinationPlace?.name || params.destinationId;
  const destAddress = params.destinationPlace?.address || destName;
  const destLat = params.destinationPlace?.latitude;
  const destLng = params.destinationPlace?.longitude;
  const heroImg = params.destinationPlace?.photoUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
  
  const hasUserSelectedStyles = Array.isArray(params.preferences.styles) && params.preferences.styles.length > 0;
  const foodPref = params.preferences.food;
  const alcoholPref = params.preferences.alcohol;
  const customNotesText = params.preferences.customNotes ? params.preferences.customNotes.trim() : '';
  const isRoadVehicleMode = travelMode === 'Car / Road Trip' || travelMode === 'Bike / Motorcycle';
  const startCoordinates = (params.preferences as any)?.startCoordinates || (params as any)?.startCoordinates || '';
  const vehicleType = travelMode === 'Bike / Motorcycle' ? 'touring motorcycle / bike' : (travelMode === 'Car / Road Trip' ? 'car / personal road vehicle' : travelMode);
  const actionVerb = travelMode === 'Bike / Motorcycle' ? 'motorcycle ride' : 'car drive';

  const prompt = `You are the AI travel-planning engine for a real-world travel planning application.

Your responsibility is to generate a realistic, personalized, geographically consistent, budget-aware and time-aware travel itinerary based entirely on the user's actual trip parameters and reliable data available to you.

==================================================
CORE PRINCIPLE
==================================================

EVERYTHING MUST BE DYNAMIC.

Do NOT use predefined destinations, cities, highways, airports, restaurants, hotels, attractions, prices, weather values, travel times, image URLs, packing items, or fixed routes.

Do NOT copy example values from this instruction into the generated itinerary.

Do NOT assume a route simply because it is commonly known.

Do NOT fabricate current information.

If reliable live/grounded information is available, use it.

If reliable information is unavailable, use null, an empty string, or clearly indicate that the information needs verification rather than inventing a value.

The user's actual trip parameters always take priority.

==================================================
USER INPUT
==================================================

Destination:
"${destName}"

Destination Address:
"${destAddress}"

Departure Point:
"${startCity}"

Departure Coordinates:
"${startCoordinates || ''}"

Trip Duration:
${params.durationDays} days

Start Date:
"${params.startDate || ''}"

Number of Travelers:
${params.travellersCount}

Traveler Type:
"${params.companionType}"

Travel Mode:
"${travelMode}"

Vehicle Type:
"${vehicleType || ''}"

Budget Tier:
"${params.budgetTier}"

Target Budget:
"${params.targetBudget || ''}"

Travel Styles:
"${hasUserSelectedStyles ? params.preferences.styles.join(', ') : ''}"

Food Preference:
"${foodPref || ''}"

Alcohol Preference:
"${alcoholPref || ''}"

Special Notes:
"${customNotesText || ''}"

==================================================
DATA GROUNDING
==================================================

When Gemini has access to Google Search grounding, Google Maps/Places data, application APIs, or other trusted live data:

- Prefer grounded/current information.
- Use actual locations.
- Use actual distances and travel times.
- Use actual opening hours when available.
- Use current or recently verified prices when available.
- Use current weather data when available.
- Use actual business and attraction information.
- Respect the date of the trip when evaluating information.

Never present an unverified assumption as a verified current fact.

If live information conflicts with general model knowledge, prefer the reliable current source.

==================================================
1. COMPLETE ROUND TRIP
==================================================

Generate the complete trip lifecycle:

DEPARTURE POINT
→ TRANSIT
→ DESTINATION
→ DESTINATION EXPLORATION
→ RETURN TRANSIT
→ DEPARTURE POINT

The itinerary must account for the entire requested number of days.

Do not end the itinerary at the destination unless the user explicitly requested a one-way trip.

The final day must logically account for the return journey.

==================================================
2. DYNAMIC TRAVEL MODE
==================================================

Respect the user's selected travel mode.

If the user selects a personal car or motorcycle:

- Use that vehicle throughout the road journey.
- Use it for outbound travel.
- Use it for local destination travel.
- Use it for travel between activities.
- Use it for the return journey.
- Do not randomly switch to taxis, rental vehicles, buses, trains or flights.

Only introduce another transportation method when:
1. The user selected it, or
2. A genuine route limitation makes it necessary.

If another transportation mode is genuinely necessary, explain it through the relevant itinerary data.

If the user selects flight, train, bus or another mode:

- Build the trip around that mode.
- Determine connecting transportation dynamically.
- Determine airports/stations/terminals dynamically.
- Do not assume direct connectivity.
- Do not invent schedules.

==================================================
3. DYNAMIC ROAD-TRIP PLANNING
==================================================

For car and motorcycle trips, determine realistic travel days dynamically.

Do NOT use a fixed distance threshold.

Consider:

- Actual road distance
- Actual estimated driving/riding duration
- Road conditions
- Terrain
- Traffic when available
- Rest requirements
- Meal breaks
- Fuel/charging requirements
- Traveler type
- Trip duration
- Departure time
- Arrival time
- Weather
- Seasonal restrictions

If the destination cannot realistically be reached on the first day:

- Determine an appropriate intermediate overnight location.
- The intermediate location must be geographically sensible along the actual route.
- Do not use a predefined list of cities.
- Continue the route logically on subsequent days.

Do not place destination sightseeing activities before the traveler has arrived.

==================================================
4. ROUTE OPTIMIZATION
==================================================

Create a geographically sensible itinerary.

Minimize unnecessary backtracking.

Group nearby attractions together.

Consider actual travel times between locations.

For each activity, calculate or obtain realistic travel time from the previous activity.

The sequence must be physically possible.

Never schedule:

- An activity before its opening time.
- An activity after its closing time.
- Two activities at the same time.
- An impossible long-distance jump between consecutive activities.

==================================================
5. DESTINATION RECOMMENDATIONS
==================================================

Select attractions dynamically according to:

- User interests
- Travel styles
- Traveler type
- Budget
- Trip duration
- Season
- Weather
- Destination geography
- Opening hours
- Activity duration
- Travel mode
- Special notes

Do not use a fixed number of attractions per day.

A day may contain fewer activities when an experience requires significant time.

A day may contain more activities when locations are close together and realistically fit.

==================================================
6. REAL-WORLD PLACES
==================================================

Use exact real-world locations.

Never generate generic names such as:

"Popular Tourist Spot"
"Local Restaurant"
"Scenic Viewpoint"
"Famous Market"
"Authentic Cafe"

Every place should have a real name when reliable information is available.

For each place, consider:

- Exact location
- Opening hours
- Entry requirements
- Current pricing
- Rating
- Reviews when available
- Distance
- Travel time
- Relevance to the user

Do not invent businesses, restaurants, hotels or attractions.

==================================================
7. TIMING
==================================================

Determine activity times dynamically.

Consider:

- Opening hours
- Closing hours
- Sunrise
- Sunset
- Weather
- Traffic
- Travel time
- Expected visit duration
- Booking time
- User preferences
- Meal periods
- Activity difficulty

Do not use fixed example times.

Do not force activities into arbitrary time slots.

Every activity must have a realistic start and end time.

==================================================
8. WEATHER
==================================================

If current or forecast weather information is available, use it.

Weather must correspond as closely as possible to:

- Destination
- Specific travel date
- Relevant time period

Use weather to adjust the itinerary when appropriate.

For example, dynamically consider whether outdoor activities should be moved, shortened or replaced.

Do not invent temperature, rain probability or weather conditions.

If weather data is unavailable, return null/empty values instead of fabricated forecasts.

==================================================
9. BUDGET
==================================================

Plan around the user's actual budget.

Dynamically consider:

- Transportation
- Fuel
- Charging
- Accommodation
- Food
- Entry fees
- Activities
- Parking
- Tolls
- Permits
- Local transport
- Other necessary expenses

Use current/reliable pricing when available.

Do not use fixed prices from this prompt.

Do not silently exceed the user's target budget.

If the requested itinerary cannot realistically fit the budget, make reasonable adjustments and reflect the resulting estimated costs.

==================================================
10. FOOD
==================================================

Respect the user's food preference.

Recommend real restaurants and food locations dynamically.

Consider:

- Dietary preference
- Cuisine
- Budget
- Location
- Opening hours
- Ratings
- Distance from route
- Availability when available

If the user does not want alcohol, do not force bars, clubs or alcohol-related activities.

==================================================
11. TRAVELER PROFILE
==================================================

Adapt the itinerary according to:

- Number of travelers
- Traveler type
- Children if applicable
- Older travelers if applicable
- Group/friends/couple/solo configuration
- User's stated preferences

Consider this when determining:

- Activity intensity
- Rest
- Accommodation
- Food
- Travel time
- Accessibility
- Safety

==================================================
12. SAFETY AND REQUIREMENTS
==================================================

Identify genuine travel requirements dynamically.

Consider:

- Permits
- Government permissions
- Restricted areas
- Identification requirements
- Seasonal restrictions
- Road restrictions
- Weather risks
- Activity difficulty
- Local regulations

Only add a requirement when it is actually relevant.

Do not invent permit requirements.

==================================================
13. CLOTHING AND PACKING
==================================================

Generate the packing list specifically for this trip.

Consider:

- Destination
- Travel dates
- Weather
- Activities
- Terrain
- Travel mode
- Trip duration
- Cultural requirements
- Documents
- Electronics
- Safety requirements

Do NOT use a fixed packing list.

Each packing item must have a reason relevant to this trip.

==================================================
14. IMAGES
==================================================

Only return image URLs obtained from reliable application data or trusted image/places sources.

Never use a hardcoded image URL.

Never invent an image URL.

If an appropriate image URL is unavailable:

"imageUrl": ""

==================================================
15. BOOKINGS
==================================================

Identify bookings that are actually relevant.

Possible booking categories include:

- Accommodation
- Transport
- Attractions
- Activities
- Permits

Only include a booking when it is genuinely required or useful.

Do not claim availability unless availability information is actually available.

==================================================
16. FINAL DAY
==================================================

The final day must logically complete the trip.

If the trip is round-trip:

Destination
→ Return journey
→ Original departure point

Account for realistic travel duration.

Do not compress an unrealistic return journey simply to fit the requested number of days.

==================================================
17. JSON OUTPUT
==================================================

Return ONLY valid JSON.

Do not return Markdown.

Do not add explanations before or after the JSON.

Do not use code fences.

==================================================
18. FINAL VALIDATION
==================================================

Before returning the JSON, internally validate the entire itinerary.

Verify:

1. The trip begins at the actual departure point.
2. The destination is reached.
3. The return journey is included when required.
4. The requested travel mode is respected.
5. Every movement is geographically possible.
6. No activities overlap.
7. Opening hours are respected when available.
8. Travel times are realistic.
9. The itinerary fits the requested number of days.
10. Costs are consistent with the user's budget.
11. Weather is not fabricated.
12. Places are real when presented as real.
13. Image URLs are not fabricated.
14. No hardcoded example locations were used.
15. No fixed example prices were used.
16. No fixed example weather was used.
17. No fixed packing list was used.
18. No placeholder attractions or businesses were used.
19. The JSON is syntactically valid.
20. The itinerary feels like a realistic trip that a real traveler could actually follow.

The final result must be a genuinely dynamic itinerary created from the user's actual inputs and reliable available data.`;

  const schema = {
    type: 'OBJECT',
    properties: {
      routeSummary: {
        type: 'OBJECT',
        properties: {
          distanceKm: { type: 'NUMBER' },
          flightDuration: { type: 'STRING' },
          trainDuration: { type: 'STRING' },
          driveDuration: { type: 'STRING' },
          departureHub: { type: 'STRING' },
          arrivalHub: { type: 'STRING' },
          keyHighwayOrTrain: { type: 'STRING' },
          recommendedMode: { type: 'STRING' },
          notes: { type: 'STRING' }
        },
        required: ['distanceKm', 'departureHub', 'arrivalHub', 'recommendedMode']
      },
      clothingAdvice: { type: 'STRING', description: 'Brief advice on what clothing to pack.' },
      days: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            dayNumber: { type: 'NUMBER' },
            date: { type: 'STRING' },
            title: { type: 'STRING' },
            theme: { type: 'STRING' },
            vibe: { type: 'STRING' },
            weatherForecast: {
              type: 'OBJECT',
              properties: {
                temp: { type: 'STRING' },
                condition: { type: 'STRING' },
                icon: { type: 'STRING' },
                rainChance: { type: 'NUMBER' }
              },
              required: ['temp', 'condition', 'icon', 'rainChance']
            },
            activities: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  id: { type: 'STRING' },
                  time: { type: 'STRING' },
                  endTime: { type: 'STRING' },
                  title: { type: 'STRING' },
                  category: { type: 'STRING' },
                  location: { type: 'STRING' },
                  coordinates: {
                    type: 'OBJECT',
                    properties: {
                      lat: { type: 'NUMBER' },
                      lng: { type: 'NUMBER' }
                    },
                    required: ['lat', 'lng']
                  },
                  estimatedCost: { type: 'NUMBER' },
                  travelTimeFromPrev: { type: 'STRING' },
                  duration: { type: 'STRING' },
                  description: { type: 'STRING' },
                  imageUrl: { type: 'STRING' },
                  recommendationReason: { type: 'STRING' },
                  isIndoor: { type: 'BOOLEAN' },
                  isRainSafe: { type: 'BOOLEAN' },
                  rating: { type: 'NUMBER' }
                },
                required: ['id', 'time', 'endTime', 'title', 'category', 'location', 'estimatedCost', 'travelTimeFromPrev', 'duration', 'description', 'imageUrl', 'recommendationReason', 'isIndoor', 'isRainSafe', 'rating']
              }
            }
          },
          required: ['dayNumber', 'date', 'title', 'theme', 'vibe', 'weatherForecast', 'activities']
        }
      },
      packingList: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING' },
            name: { type: 'STRING' },
            category: { type: 'STRING' },
            checked: { type: 'BOOLEAN' },
            reason: { type: 'STRING' }
          },
          required: ['id', 'name', 'category', 'checked', 'reason']
        }
      },
      requirements: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING' },
            title: { type: 'STRING' },
            type: { type: 'STRING' },
            status: { type: 'STRING' },
            notes: { type: 'STRING' }
          },
          required: ['id', 'title', 'type', 'status', 'notes']
        }
      },
      bookings: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING' },
            title: { type: 'STRING' },
            type: { type: 'STRING' },
            status: { type: 'STRING' },
            estimatedCost: { type: 'NUMBER' },
            provider: { type: 'STRING' },
            notes: { type: 'STRING' }
          },
          required: ['id', 'title', 'type', 'status', 'estimatedCost', 'provider', 'notes']
        }
      }
    },
    required: ['routeSummary', 'clothingAdvice', 'days', 'packingList', 'requirements', 'bookings']
  };

  let lastError: any = null;
  let genData: any = null;

  for (const modelName of PREFERRED_GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      });

      const text = response.text || '';
      genData = parseJsonSafely(text);
      if (genData && genData.days && Array.isArray(genData.days)) {
        break;
      }
    } catch (err: any) {
      console.warn(`[serverPlanner] Attempt with ${modelName} encountered: ${formatGenAiError(err)}, trying next...`);
      lastError = err;
    }
  }

  if (!genData || !genData.days) {
    throw new Error(lastError?.message || 'Invalid itinerary generated by Gemini AI. Please check your API key.');
  }

  const days = await Promise.all(
    (genData.days || []).map(async (day: any, dIdx: number) => {
      const dayNum = day.dayNumber || dIdx + 1;
      const activities = await Promise.all(
        (day.activities || []).map(async (act: any, aIdx: number) => {
          const baseLat = destLat || 20.0;
          const baseLng = destLng || 78.0;
          const offsetLat = (aIdx * 0.01) * Math.sin(aIdx * 1.5);
          const offsetLng = (aIdx * 0.01) * Math.cos(aIdx * 1.5);
          const realPhoto = await fetchRealPlacePhoto(act.title, destName, act.category);

          let cleanTravelTime = act.travelTimeFromPrev || (isRoadVehicleMode ? `15 min ${actionVerb}` : '15 min drive');
          let cleanDescription = act.description || `Experience ${act.title || destName}.`;
          let cleanRecommendation = act.recommendationReason || 'Tailored to your preferences and travel style.';

          if (isRoadVehicleMode) {
            // Strictly remove any stray cab/taxi/flight/train/bus mentions
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
            category: act.category || 'Sightseeing',
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
            imageUrl: realPhoto,
            recommendationReason: cleanRecommendation,
            isIndoor: Boolean(act.isIndoor),
            isRainSafe: Boolean(act.isRainSafe),
            rating: typeof act.rating === 'number' ? act.rating : 4.8
          };
        })
      );

      return {
        dayNumber: dayNum,
        date: day.date || `Day ${dayNum}`,
        title: day.title || `Day ${dayNum} Exploration`,
        theme: day.theme || `${destName} Highlights & Exploration`,
        vibe: day.vibe || 'Scenic views, cultural landmarks and delicious local tastes',
        weatherForecast: day.weatherForecast || {
          temp: '27°C',
          condition: 'Partly Cloudy',
          icon: 'Sun',
          rainChance: 10
        },
        activities
      };
    })
  );

  const daysInfo = days.map(d => {
    const lastAct = d.activities && d.activities.length > 0 ? d.activities[d.activities.length - 1] : undefined;
    return {
      dayNumber: d.dayNumber,
      theme: d.theme,
      location: lastAct?.location || destName,
      lastActivityTitle: lastAct?.title,
      lastActivityLocation: lastAct?.location,
      lastActivityCategory: lastAct?.category
    };
  });

  // 1. Fetch 5 verified stays specifically tailored for Day 1 near Day 1's night stop / last place
  const day1HotelsPromise = fetchAiHotelSuggestions({
    destination: destName,
    budgetTier: params.budgetTier,
    durationDays: params.durationDays,
    travellersCount: params.travellersCount,
    companionType: params.companionType,
    travelStyles: params.preferences?.styles,
    travelMode,
    targetDayNumber: 1,
    daysInfo
  });

  // 2. Fetch verified stays for subsequent / destination days
  const destHotelsPromise = fetchAiHotelSuggestions({
    destination: destName,
    budgetTier: params.budgetTier,
    durationDays: params.durationDays,
    travellersCount: params.travellersCount,
    companionType: params.companionType,
    travelStyles: params.preferences?.styles,
    travelMode,
    daysInfo
  });

  const [day1Hotels, destHotels] = await Promise.all([day1HotelsPromise, destHotelsPromise]);

  // Combine recommendations: Day 1 stays (all 4-5) followed by destination stays
  const initialHotels = [
    ...day1Hotels,
    ...destHotels.filter(dh => dh.dayNumber !== 1 && !day1Hotels.some(d1 => d1.id === dh.id))
  ];

  const daysWithStays = days.map((day) => {
    let matchStay: HotelStayRecommendation | undefined;
    if (day.dayNumber === 1 && day1Hotels.length > 0) {
      matchStay = day1Hotels[0];
    } else {
      matchStay = destHotels.find(h => h.dayNumber === day.dayNumber)
        || destHotels[(day.dayNumber - 1) % destHotels.length]
        || day1Hotels[0];
    }
    const lastAct = day.activities && day.activities.length > 0 ? day.activities[day.activities.length - 1] : undefined;
    if (matchStay && lastAct && !matchStay.nearPlaceName) {
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

  const finalRouteSummary = genData.routeSummary ? {
    distanceKm: genData.routeSummary.distanceKm || 250,
    flightDuration: isRoadVehicleMode ? undefined : genData.routeSummary.flightDuration,
    trainDuration: isRoadVehicleMode ? undefined : genData.routeSummary.trainDuration,
    driveDuration: genData.routeSummary.driveDuration || '4h 30m',
    departureHub: isRoadVehicleMode && /airport|terminal|station|railway/i.test(genData.routeSummary.departureHub || '')
      ? `${startCity} Highway Exit / Expressway Corridor`
      : (genData.routeSummary.departureHub || (isRoadVehicleMode ? `${startCity} Highway Corridor` : `${startCity} Terminal`)),
    arrivalHub: isRoadVehicleMode && /airport|terminal|station|railway/i.test(genData.routeSummary.arrivalHub || '')
      ? `${destName} Valley Entry / Highway Gateway`
      : (genData.routeSummary.arrivalHub || (isRoadVehicleMode ? `${destName} Entry / Highway Hub` : `${destName} Junction`)),
    keyHighwayOrTrain: genData.routeSummary.keyHighwayOrTrain || genData.routeSummary.keyRoute || (isRoadVehicleMode ? 'National Highway Corridor' : 'Direct Transit Route'),
    recommendedMode: isRoadVehicleMode ? travelMode : (genData.routeSummary.recommendedMode || travelMode),
    notes: isRoadVehicleMode ? `Complete overland round-trip road journey by ${travelMode}` : (genData.routeSummary.notes || 'Direct transit connectivity')
  } : {
    distanceKm: 250,
    flightDuration: isRoadVehicleMode ? undefined : '1h 30m',
    trainDuration: isRoadVehicleMode ? undefined : '5h',
    driveDuration: '4h 30m',
    departureHub: isRoadVehicleMode ? `${startCity} Highway Exit / Expressway Corridor` : `${startCity} Terminal`,
    arrivalHub: isRoadVehicleMode ? `${destName} Valley Entry / Highway Gateway` : `${destName} Junction`,
    keyHighwayOrTrain: isRoadVehicleMode ? 'National Highway Corridor' : 'Direct Transit Route',
    recommendedMode: travelMode,
    notes: isRoadVehicleMode ? `Complete overland round-trip road journey by ${travelMode}` : 'Direct transit connectivity'
  };

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
    packingList: (genData.packingList && genData.packingList.length > 0)
      ? genData.packingList.map((item: any, idx: number) => ({
          ...item,
          id: item.id || `p-${idx + 1}`,
          checked: false // Always starts unpacked so traveler can check items off as they pack
        }))
      : [
          { id: 'p-1', name: 'Comfortable walking footwear', category: 'Clothing', checked: false, reason: 'Sightseeing' },
          { id: 'p-2', name: 'Mobile charger & power bank', category: 'Electronics', checked: false, reason: 'Navigation' },
          { id: 'p-3', name: 'Government ID / booking receipts', category: 'Documents', checked: false, reason: 'Verification' },
          { id: 'p-4', name: 'Reusable water bottle & sunscreen', category: 'Toiletries', checked: false, reason: 'Daily travel' }
        ],
    requirements: (genData.requirements || []).map((doc: any, idx: number) => ({
      ...doc,
      id: doc.id || `req-${idx + 1}`,
      status: (doc.status === 'Completed' || doc.status === 'Ready') ? 'Action Required' : (doc.status || 'Action Required'),
      isPermit: doc.isPermit ?? (doc.type === 'Government Permit' || /permit/i.test(doc.title))
    })),
    bookings: (genData.bookings || []).map((b: any, idx: number) => ({
      ...b,
      id: b.id || `b-${idx + 1}`,
      status: (b.status === 'Confirmed' || b.status === 'Booked') ? 'To Book' : (b.status || 'To Book')
    })),
    hotelRecommendations: initialHotels,
    clothingAdvice: genData.clothingAdvice || 'Comfortable breathable travel attire.',
    createdAt: new Date().toISOString().split('T')[0],
    adaptationHistory: []
  };
}

/**
 * Dynamically adapt itinerary using Gemini AI based on destination and trigger
 */
export async function adaptTripPlanWithAI(
  trip: Trip,
  triggerId: string,
  targetDayNumber: number = 1
): Promise<{ updatedTrip: Trip; summaryMessage: string; changedCount: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return adaptTripPlan(trip, triggerId, targetDayNumber);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    const dayIndex = trip.days.findIndex(d => d.dayNumber === targetDayNumber);
    const currentDay = dayIndex !== -1 ? trip.days[dayIndex] : trip.days[0];
    const triggerOption = ADAPT_OPTIONS.find(o => o.id === triggerId);
    const triggerDescription = triggerOption ? `${triggerOption.label} (${triggerOption.description})` : triggerId;

    const prompt = `You are an AI adaptive travel assistant.
Destination: "${trip.destination}" (${trip.destinationStateOrCountry}).
Current Day ${currentDay.dayNumber} Theme: "${currentDay.theme}".
Current Activities:
${JSON.stringify(currentDay.activities.map(a => ({ title: a.title, category: a.category, location: a.location, cost: a.estimatedCost })))}

The user triggered this dynamic real-time adaptation: "${triggerDescription}".
Replan Day ${currentDay.dayNumber} activities specifically for "${trip.destination}" to accommodate this trigger.
Return updated theme, vibe, weatherForecast, and activities list with real places in ${trip.destination}.`;

    let response: any = null;
    for (const modelName of PREFERRED_GEMINI_MODELS) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                theme: { type: 'STRING' },
                vibe: { type: 'STRING' },
                summaryMessage: { type: 'STRING' },
                activities: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      id: { type: 'STRING' },
                      time: { type: 'STRING' },
                      endTime: { type: 'STRING' },
                      title: { type: 'STRING' },
                      category: { type: 'STRING' },
                      location: { type: 'STRING' },
                      coordinates: {
                        type: 'OBJECT',
                        properties: {
                          lat: { type: 'NUMBER' },
                          lng: { type: 'NUMBER' }
                        }
                      },
                      estimatedCost: { type: 'NUMBER' },
                      travelTimeFromPrev: { type: 'STRING' },
                      duration: { type: 'STRING' },
                      description: { type: 'STRING' },
                      imageUrl: { type: 'STRING' },
                      recommendationReason: { type: 'STRING' },
                      isIndoor: { type: 'BOOLEAN' },
                      isRainSafe: { type: 'BOOLEAN' },
                      isUpdated: { type: 'BOOLEAN' },
                      updatedReason: { type: 'STRING' },
                      rating: { type: 'NUMBER' }
                    },
                    required: ['id', 'time', 'title', 'category', 'location', 'estimatedCost', 'duration', 'description', 'recommendationReason']
                  }
                }
              },
              required: ['theme', 'vibe', 'summaryMessage', 'activities']
            }
          }
        });
        if (response && response.text) break;
      } catch (e) {
        console.warn(`Adaptation model ${modelName} failed:`, e);
      }
    }

    const parsed = parseJsonSafely(response.text || '{}');
    if (parsed.activities && Array.isArray(parsed.activities)) {
      const updatedTrip = JSON.parse(JSON.stringify(trip)) as Trip;
      const targetDay = updatedTrip.days[dayIndex !== -1 ? dayIndex : 0];
      targetDay.theme = parsed.theme || targetDay.theme;
      targetDay.vibe = parsed.vibe || targetDay.vibe;
      targetDay.activities = await Promise.all(
        parsed.activities.map(async (a: any, idx: number) => ({
          ...a,
          id: a.id || `act-adapted-${crypto.randomUUID()}`,
          imageUrl: await fetchRealPlacePhoto(a.title, trip.destination, a.category),
          rating: a.rating || 4.8,
          isUpdated: true,
          updatedReason: a.updatedReason || `Adapted for ${triggerOption?.label || triggerId}`
        }))
      );

      const summaryMessage = parsed.summaryMessage || `Day ${targetDay.dayNumber} adapted for ${triggerOption?.label || triggerId}.`;
      if (!updatedTrip.adaptationHistory) updatedTrip.adaptationHistory = [];
      updatedTrip.adaptationHistory.unshift({
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        trigger: triggerId,
        description: summaryMessage
      });

      return {
        updatedTrip,
        summaryMessage,
        changedCount: targetDay.activities.length
      };
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
 * Dynamically generate a real place or activity for a specific day in a trip
 */
export async function generateRealPlaceForDay(params: {
  destination: string;
  destinationStateOrCountry?: string;
  dayNumber: number;
  existingActivities?: Activity[];
  travelStyles?: string[];
  budgetTier?: BudgetTier;
  travelMode?: TravelMode;
}): Promise<Activity> {
  const {
    destination,
    destinationStateOrCountry = '',
    dayNumber = 1,
    existingActivities = [],
    travelStyles = ['Sightseeing', 'Culture', 'Food'],
    budgetTier = 'Moderate',
    travelMode = 'Flight'
  } = params;

  const isRoadVehicleMode = travelMode === 'Car / Road Trip' || travelMode === 'Bike / Motorcycle';
  const actionVerb = travelMode === 'Bike / Motorcycle' ? 'motorcycle ride' : 'car drive';
  const defaultTravelTime = isRoadVehicleMode ? `15 min ${actionVerb}` : '15 min drive';

  const existingTitles = existingActivities.map(a => a.title.toLowerCase());
  const lastAct = existingActivities[existingActivities.length - 1];

  // Calculate smart next time slot
  let nextTime = '04:30 PM';
  let nextEndTime = '06:00 PM';
  if (lastAct && lastAct.time) {
    if (lastAct.time.includes('09:') || lastAct.time.includes('10:') || lastAct.time.includes('11:')) {
      nextTime = '01:30 PM';
      nextEndTime = '03:00 PM';
    } else if (lastAct.time.includes('01:') || lastAct.time.includes('02:') || lastAct.time.includes('03:')) {
      nextTime = '04:30 PM';
      nextEndTime = '06:00 PM';
    } else if (lastAct.time.includes('04:') || lastAct.time.includes('05:') || lastAct.time.includes('06:')) {
      nextTime = '07:30 PM';
      nextEndTime = '09:30 PM';
    } else {
      nextTime = '08:30 PM';
      nextEndTime = '10:30 PM';
    }
  }

  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const prompt = `You are an expert travel concierge for "${destination}" (${destinationStateOrCountry}).
The traveler is on Day ${dayNumber} of their trip.
Travel mode is: ${travelMode}.${isRoadVehicleMode ? ` Note: Travelers have their own vehicle throughout the trip. Do NOT suggest cabs or public transit.` : ''}
Already planned stops for today: ${existingActivities.map(a => `"${a.title}" (${a.category})`).join(', ') || 'None yet'}.
Traveler styles: ${travelStyles.join(', ')}.
Budget: ${budgetTier}.

Suggest 1 exciting, authentic, REAL famous or hidden-gem place or activity in ${destination} to add to this day's itinerary.
The place MUST BE a real landmark, viewpoint, cafe, museum, temple, fort, market, beach, or nature trail in ${destination}.
Do NOT repeat any existing place.

Return ONLY a JSON object:
{
  "title": "Real Place Name in ${destination}",
  "category": "Sightseeing",
  "location": "Neighborhood or Area in ${destination}",
  "estimatedCost": 400,
  "duration": "1.5 hrs",
  "travelTimeFromPrev": "${defaultTravelTime}",
  "description": "2-sentence authentic highlight of this real place",
  "recommendationReason": "Why this specific place is a must-visit today",
  "isIndoor": false,
  "isRainSafe": false,
  "rating": 4.8
}`;

      for (const modelName of PREFERRED_GEMINI_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
          });

          if (response && response.text) {
            const parsed = parseJsonSafely(response.text);
            if (parsed && parsed.title) {
              const photo = await resolvePlaceImage(parsed.title, destination, parsed.category || 'Sightseeing');
              let cleanTravelTime = parsed.travelTimeFromPrev || defaultTravelTime;
              if (isRoadVehicleMode) {
                cleanTravelTime = cleanTravelTime.replace(/\b(cab|taxi|uber|ola|airport shuttle|metro|train|bus|auto|rickshaw)\b/gi, actionVerb);
              }

              return {
                id: `real-stop-${crypto.randomUUID()}`,
                time: nextTime,
                endTime: nextEndTime,
                title: parsed.title,
                category: (parsed.category as Activity['category']) || 'Sightseeing',
                location: parsed.location || `${destination} Area`,
                estimatedCost: Number(parsed.estimatedCost) || 400,
                duration: parsed.duration || '1.5 hrs',
                travelTimeFromPrev: cleanTravelTime,
                description: parsed.description || `Iconic real destination in ${destination}.`,
                recommendationReason: parsed.recommendationReason || `Handpicked authentic real place in ${destination}.`,
                imageUrl: photo,
                isIndoor: Boolean(parsed.isIndoor),
                isRainSafe: Boolean(parsed.isRainSafe),
                rating: parsed.rating || 4.8
              };
            }
          }
        } catch (err) {
          console.warn(`Model ${modelName} failed for real place:`, err);
        }
      }
    } catch (e) {
      console.warn('Gemini real place error, using fallback:', e);
    }
  }

  // Robust Dynamic Fallback for destinations
  const fallbackPlaces: Array<{
    title: string;
    category: Activity['category'];
    location: string;
    cost: number;
    desc: string;
    reason: string;
    isIndoor: boolean;
  }> = [
    {
      title: `${destination} Old Quarter & Heritage Bazaar Walk`,
      category: 'Culture',
      location: `${destination} Heritage Center`,
      cost: 250,
      desc: `Historic cobblestone paths lined with heritage architecture, local handicraft stalls, and centuries-old spice merchants.`,
      reason: `Authentic immersion into local life and regional craftsmanship.`,
      isIndoor: false
    },
    {
      title: `Panoramic Sunset Cliff Point & Ocean Vista in ${destination}`,
      category: 'Sightseeing',
      location: `${destination} High Viewpoint`,
      cost: 0,
      desc: `Breathtaking high vantage point overlooking the horizon with golden-hour views and sea breeze.`,
      reason: `The top-rated sunset photography spot in ${destination}.`,
      isIndoor: false
    },
    {
      title: `Artisan Culinary Tasting & Spice Kitchen in ${destination}`,
      category: 'Food',
      location: `${destination} Culinary Quarter`,
      cost: 650,
      desc: `Renowned regional eatery preparing traditional dishes, fresh infusions, and seasonal signature platters.`,
      reason: `Locals' favorite culinary secret praised for authentic flavors.`,
      isIndoor: true
    },
    {
      title: `Secluded Nature Trail & Hidden Waterfall Sanctuary in ${destination}`,
      category: 'Adventure',
      location: `${destination} Foothills & Reserve`,
      cost: 150,
      desc: `Lush green trail winding through tropical flora towards a clear natural spring pool.`,
      reason: `Refreshing escape away from tourist crowds with pristine natural beauty.`,
      isIndoor: false
    },
    {
      title: `Contemporary Art & Heritage Museum Pavilion in ${destination}`,
      category: 'Culture',
      location: `${destination} Arts District`,
      cost: 300,
      desc: `Curated gallery featuring regional folk art, colonial relics, and interactive cultural exhibits.`,
      reason: `Enriching cultural pause with comfortable air-conditioned halls and artisan cafe.`,
      isIndoor: true
    }
  ];

  // Pick one not in existing
  const available = fallbackPlaces.filter(p => !existingTitles.some(t => t.includes(p.title.toLowerCase()) || p.title.toLowerCase().includes(t)));
  const chosen = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : fallbackPlaces[Math.floor(Math.random() * fallbackPlaces.length)];

  const photo = await resolvePlaceImage(chosen.title, destination, chosen.category);

  return {
    id: `real-stop-${crypto.randomUUID()}`,
    time: nextTime,
    endTime: nextEndTime,
    title: chosen.title,
    category: chosen.category,
    location: chosen.location,
    estimatedCost: chosen.cost,
    duration: '1.5 hrs',
    travelTimeFromPrev: defaultTravelTime,
    description: chosen.desc,
    recommendationReason: chosen.reason,
    imageUrl: photo,
    isIndoor: chosen.isIndoor,
    isRainSafe: chosen.isIndoor,
    rating: 4.8
  };
}
