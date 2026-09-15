import { Trip, UserPreferences, Activity, TravelCompanion, TravelMode, BudgetTier, GroupMember } from '../../src/types';
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
  
  const stylesList = params.preferences.styles.length > 0 ? params.preferences.styles.join(', ') : 'Culture, Food, Nature, Scenic Sightseeing';
  const foodPref = params.preferences.food || 'No preference';
  const alcoholPref = params.preferences.alcohol || 'No';
  const customNotesText = params.preferences.customNotes ? params.preferences.customNotes.trim() : '';

  const prompt = `You are a world-class AI travel planner and local expert.
Your task is to generate a realistic, high-precision, authentic ${params.durationDays}-day travel itinerary for:
Destination: "${destName}" (${destAddress}).
${destLat && destLng ? `Exact Destination Geographic Center: Latitude ${destLat}, Longitude ${destLng}.` : ''}
Departure Point: "${startCity}".
Travelers: ${params.companionType} (${params.travellersCount} people).
Travel Mode: ${travelMode}.
Budget Level: ${params.budgetTier} (~₹${params.targetBudget?.toLocaleString() || '30,000'} total for ${params.travellersCount} people over ${params.durationDays} days).

USER PREFERENCES TO STRICTLY ADHERE TO:
1. TRAVEL STYLES (${stylesList}):
   - The itinerary MUST directly reflect the selected styles:
     ${params.preferences.styles.includes('Adventure') ? '• ADVENTURE: Include outdoor thrills, hiking/trekking trails, watersports, or viewpoints with climbs.' : ''}
     ${params.preferences.styles.includes('Relaxation') ? '• RELAXATION: Include peaceful lakeside/beach walks, gardens, scenic viewpoints, or unhurried tea lounges.' : ''}
     ${params.preferences.styles.includes('Food') ? '• FOOD: Include famous local food streets, heritage bakeries, regional culinary legends, and authentic tasting spots.' : ''}
     ${params.preferences.styles.includes('Nature') ? '• NATURE: Feature national parks, waterfalls, botanical gardens, lakes, mountain viewpoints, or wildlife reserves.' : ''}
     ${params.preferences.styles.includes('Culture') ? '• CULTURE: Feature historic forts, palaces, heritage architecture, art galleries, museums, or local craft hubs.' : ''}
     ${params.preferences.styles.includes('Nightlife') ? '• NIGHTLIFE: Include lively evening streets, night markets, rooftop lounges, or live music venues.' : ''}
     ${params.preferences.styles.includes('Photography') ? '• PHOTOGRAPHY: Include photogenic golden-hour viewpoints, architectural vistas, and scenic photo spots.' : ''}
     ${params.preferences.styles.includes('Shopping') ? '• SHOPPING: Include vibrant local bazaars, spice/tea markets, artisan souvenir emporiums, or flea markets.' : ''}
     ${params.preferences.styles.includes('Spiritual') ? '• SPIRITUAL: Feature iconic historic temples, ashrams, sacred ghats, shrines, or meditation spots.' : ''}
     ${params.preferences.styles.includes('Hidden gems') ? '• HIDDEN GEMS: Include offbeat, secret, uncrowded scenic spots and local-favorite corners.' : ''}
     ${params.preferences.styles.includes('Luxury') ? '• LUXURY: Feature fine dining, exclusive heritage tours, and high-end viewpoints.' : ''}
     ${params.preferences.styles.includes('Backpacking') ? '• BACKPACKING: Feature scenic budget-friendly routes, youth vibes, walking tours, and free panoramic points.' : ''}

2. FOOD PREFERENCE (${foodPref}):
   ${foodPref === 'Vegetarian' ? '• STRICT VEGETARIAN REQUIREMENT: ALL proposed dining, breakfast, lunch, and dinner activities MUST be 100% pure vegetarian restaurants or renowned veg-friendly regional kitchens in the destination.' : ''}
   ${foodPref === 'Vegan' ? '• STRICT VEGAN REQUIREMENT: All meals and cafe stops must be plant-based and vegan-friendly organic eateries.' : ''}
   ${foodPref === 'Non-vegetarian' ? '• NON-VEGETARIAN: Feature famous authentic regional non-veg specialties, seafood, or traditional local meat preparations.' : ''}
   ${foodPref === 'No preference' ? '• Include a diverse mix of authentic regional culinary highlights.' : ''}

3. ALCOHOL PREFERENCE (${alcoholPref}):
   ${alcoholPref === 'No' ? '• ZERO ALCOHOL VENUES: Do NOT suggest any bars, pubs, breweries, liquor venues, or wine tasting. For evenings, suggest scenic night viewpoints, artisan dessert parlors, cultural walks, or night bazaars.' : '• Include vibrant evening sunset cocktail lounges, craft breweries, scenic rooftop bars, or beach/hillview shacks.'}

4. SPECIAL REQUESTS & CUSTOM NOTES:
   ${customNotesText ? `• CRITICAL USER REQUEST: "${customNotesText}". MUST explicitly integrate this request into the relevant daily activities, dining options, or schedule notes!` : '• None specified.'}

STRICT ACCURACY & TIMELINE RULES:
1. QUANTITY PER DAY: Each day MUST contain 3 to 4 sequential, well-timed activities (e.g., Morning exploration 09:00 AM - 11:30 AM, Lunch & local market 01:00 PM - 02:30 PM, Afternoon attraction/scenic spot 03:30 PM - 05:30 PM, Evening dining/sunset/night stroll 07:30 PM - 09:30 PM). NEVER generate only 1 or 2 activities for any day.
2. ZERO HALLUCINATIONS: Every single activity, landmark, dining spot, cafe, and viewpoint MUST be a real, verified place strictly located in and around "${destName}".
3. NEVER mix up destinations: Do NOT include places from other states or other districts (e.g., if destination is Ooty, all stops MUST be real Ooty spots like Doddabetta Peak, Ooty Botanical Gardens, Ooty Lake, Pykara Lake/Falls, Nilgiri Mountain Railway, Rose Garden, Tea Museum, etc. Do NOT include Wayanad, Goa, or Manali places).
4. EXACT REAL-WORLD COORDINATES: For each activity, provide authentic latitude and longitude coordinates in "${destName}".
5. AUTHENTIC LOCAL FLAVORS: Propose real popular local eateries, regional cuisine, and authentic experiences specific to "${destName}" aligned with the ${params.budgetTier} budget tier.
6. REALISTIC COSTS: Every activity cost in INR must be realistic for real people (e.g., local street food ₹100-₹300, entry tickets ₹50-₹500, fine dining ₹1,500-₹3,500).
7. TRANSIT LOGISTICS: Calculate realistic distance and transit options from "${startCity}" to "${destName}".`;

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
            travelTimeFromPrev: act.travelTimeFromPrev || '15 min drive',
            duration: act.duration || '1.5 hrs',
            description: act.description || `Experience ${act.title || destName}.`,
            imageUrl: realPhoto,
            recommendationReason: act.recommendationReason || 'Tailored to your preferences and travel style.',
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

  const initialHotels = await fetchAiHotelSuggestions({
    destination: destName,
    budgetTier: params.budgetTier,
    durationDays: params.durationDays,
    travellersCount: params.travellersCount,
    companionType: params.companionType,
    travelStyles: params.preferences?.styles,
    daysInfo: days.map(d => ({ dayNumber: d.dayNumber, theme: d.theme }))
  });

  const daysWithStays = days.map((day) => {
    const matchStay = initialHotels.find(h => h.dayNumber === day.dayNumber) || initialHotels[0];
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
    routeSummary: genData.routeSummary || {
      distanceKm: 250,
      flightDuration: '1h 30m',
      trainDuration: '5h',
      driveDuration: '4h 30m',
      departureHub: `${startCity} Terminal`,
      arrivalHub: `${destName} Junction`,
      keyHighwayOrTrain: 'Direct Transit Route',
      recommendedMode: travelMode,
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
    days: daysWithStays,
    packingList: (genData.packingList && genData.packingList.length > 0) ? genData.packingList : [
      { id: 'p-1', name: 'Comfortable walking footwear', category: 'Clothing', checked: false, reason: 'Sightseeing' },
      { id: 'p-2', name: 'Mobile charger & power bank', category: 'Electronics', checked: false, reason: 'Navigation' },
      { id: 'p-3', name: 'Government ID / booking receipts', category: 'Documents', checked: false, reason: 'Verification' },
      { id: 'p-4', name: 'Reusable water bottle & sunscreen', category: 'Toiletries', checked: false, reason: 'Daily travel' }
    ],
    requirements: genData.requirements || [],
    bookings: genData.bookings || [],
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
}): Promise<Activity> {
  const {
    destination,
    destinationStateOrCountry = '',
    dayNumber = 1,
    existingActivities = [],
    travelStyles = ['Sightseeing', 'Culture', 'Food'],
    budgetTier = 'Moderate'
  } = params;

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
  "travelTimeFromPrev": "15 min cab",
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
              return {
                id: `real-stop-${crypto.randomUUID()}`,
                time: nextTime,
                endTime: nextEndTime,
                title: parsed.title,
                category: (parsed.category as Activity['category']) || 'Sightseeing',
                location: parsed.location || `${destination} Area`,
                estimatedCost: Number(parsed.estimatedCost) || 400,
                duration: parsed.duration || '1.5 hrs',
                travelTimeFromPrev: parsed.travelTimeFromPrev || '15 min cab',
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
    travelTimeFromPrev: '15 min cab',
    description: chosen.desc,
    recommendationReason: chosen.reason,
    imageUrl: photo,
    isIndoor: chosen.isIndoor,
    isRainSafe: chosen.isIndoor,
    rating: 4.8
  };
}
