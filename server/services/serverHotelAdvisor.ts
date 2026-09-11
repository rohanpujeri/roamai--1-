import { GoogleGenAI } from '@google/genai';
import { BudgetTier, TravelCompanion, HotelStayRecommendation } from '../../src/types';
import { PREFERRED_GEMINI_MODELS, formatGenAiError } from '../utils/geminiModels';

export interface HotelRecommendationParams {
  destination: string;
  budgetTier: BudgetTier;
  durationDays: number;
  travellersCount: number;
  companionType?: TravelCompanion;
  travelStyles?: string[];
  daysInfo?: { dayNumber: number; theme: string; location?: string }[];
}

const HOTEL_PHOTOS_BY_CATEGORY: Record<string, string[]> = {
  'Resort': [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'
  ],
  'Boutique Hotel': [
    'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80'
  ],
  'Homestay / Villa': [
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
  ],
  'Hostel / Budget': [
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80'
  ],
  'Luxury Hotel': [
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80'
  ],
  'Eco-Lodge': [
    'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80'
  ]
};

function pickHotelPhoto(category: string, index: number): string {
  const list = HOTEL_PHOTOS_BY_CATEGORY[category] || HOTEL_PHOTOS_BY_CATEGORY['Resort'];
  return list[index % list.length];
}

function parseJsonSafely(text: string): any {
  if (!text || !text.trim()) return null;
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
    return null;
  }
}

// In-memory cache for fast responsive tab switching
const hotelCache = new Map<string, HotelStayRecommendation[]>();

export const PRICE_MAP_BY_TIER = {
  Budget: { min: 800, max: 1800 },
  Moderate: { min: 2500, max: 5000 },
  Premium: { min: 6500, max: 13000 },
  Luxury: { min: 16000, max: 45000 }
};

function getCacheKey(params: HotelRecommendationParams): string {
  return `${params.destination.toLowerCase()}__${params.budgetTier}__${params.durationDays}d__${params.companionType || 'Solo'}`;
}

export function getFallbackHotelRecommendations(params: HotelRecommendationParams): HotelStayRecommendation[] {
  const { destination, budgetTier, durationDays = 3, companionType = 'Friends' } = params;

  const tierPrices = PRICE_MAP_BY_TIER[budgetTier] || PRICE_MAP_BY_TIER.Moderate;
  const stays: HotelStayRecommendation[] = [];

  let candidates: {
    name: string;
    category: HotelStayRecommendation['category'];
    area: string;
    rating: number;
    reviews: number;
    snippet: string;
    amenities: string[];
    price: number;
    dayNumber: number;
    matchReason: string;
  }[] = [];

  if (budgetTier === 'Luxury') {
    candidates = [
      {
        name: `${destination} 5-Star Grand Palace & Luxury Spa`,
        category: 'Luxury Hotel',
        area: `${destination} Premier Heritage & Luxury Quarter`,
        rating: 4.9,
        reviews: 820,
        snippet: `Iconic 5-star luxury hospitality in ${destination}, signature spa therapies, curated fine-dining and dedicated butler service.`,
        amenities: ['Private Pool Access', 'Butler Service', '5-Star Luxury Spa', 'Fine Dining Breakfast', 'Chauffeured Airport Transfer', 'Scenic Panoramic View'],
        price: tierPrices.min + Math.round((tierPrices.max - tierPrices.min) * 0.5),
        dayNumber: 1,
        matchReason: `Premier 5-star luxury stay for Day 1 in ${destination}. Unmatched luxury comfort and VIP amenities.`
      },
      {
        name: `${destination} Royal Heritage Luxury Resort & Villas`,
        category: 'Resort',
        area: `${destination} Scenic Valley & Coastal Enclave`,
        rating: 4.9,
        reviews: 710,
        snippet: `Private plunge pools, sunset cocktail lounges, bespoke wellness retreats, and Michelin-caliber curated dining in ${destination}.`,
        amenities: ['Private Plunge Pool', 'Infinity Pool', 'Champagne Lounge', 'Luxury Wellness Pavilion', 'Valet Parking', '24/7 Concierge'],
        price: tierPrices.min + Math.round((tierPrices.max - tierPrices.min) * 0.35),
        dayNumber: Math.min(2, durationDays),
        matchReason: `Exclusive 5-star luxury resort tailored for ${companionType} in ${destination}. Perfect for evening relaxation.`
      },
      {
        name: `${destination} Signature 5-Star Private Pool Suites`,
        category: 'Luxury Hotel',
        area: `${destination} Prime Panoramic Ridge`,
        rating: 4.9,
        reviews: 590,
        snippet: `Panoramic floor-to-ceiling vistas, curated sommelier tastings, heated infinity pools, and lavish luxury suites in ${destination}.`,
        amenities: ['Heated Infinity Pool', 'Bespoke Dining', 'Ayurvedic & Western Spa', 'Private Chauffeur', 'High-Speed Wi-Fi'],
        price: tierPrices.max,
        dayNumber: Math.min(3, durationDays),
        matchReason: `Signature 5-star luxury retreat in ${destination} offering award-winning suites and elite VIP pampering.`
      },
      {
        name: `${destination} Premier Boutique Luxury Retreat & Spa`,
        category: 'Resort',
        area: `${destination} Historic Garden Estate`,
        rating: 4.8,
        reviews: 490,
        snippet: `Refined colonial and modern architecture, private courtyards, artisan cocktails, and five-star hospitality in ${destination}.`,
        amenities: ['Spa & Hydrotherapy', 'Private Balconies', 'Fine Dining Buffet', 'Lush Gardens', 'Curated Excursions'],
        price: tierPrices.min + Math.round((tierPrices.max - tierPrices.min) * 0.6),
        dayNumber: Math.min(4, durationDays),
        matchReason: `Exceptional 5-star luxury stay in ${destination} guaranteeing total tranquility and personalized service.`
      }
    ];
  } else if (budgetTier === 'Budget') {
    candidates = [
      {
        name: `${destination} Backpackers Central Hostel & Co-Living`,
        category: 'Hostel / Budget',
        area: `${destination} Central Backpacker Hub`,
        rating: 4.7,
        reviews: 520,
        snippet: `Vibrant backpacker social community in ${destination}, clean AC dorms/private rooms, cafe, co-working space & local walking tours.`,
        amenities: ['Free High-Speed Wi-Fi', 'Cafe & Shared Kitchen', 'Common Lounge & Games', 'Lockers', 'Local Tours'],
        price: tierPrices.min + 200,
        dayNumber: 1,
        matchReason: `Top-rated budget backpacker stay matching your ${budgetTier} budget with active social events in ${destination}.`
      },
      {
        name: `${destination} Nature Valley Budget Homestay`,
        category: 'Homestay / Villa',
        area: `${destination} Scenic Green Belt`,
        rating: 4.6,
        reviews: 310,
        snippet: `Warm local host hospitality, home-cooked regional meals, clean scenic rooms and affordable local transit in ${destination}.`,
        amenities: ['Home-cooked Meals', 'Free Wi-Fi', 'Nature Views', 'Rental Assistance'],
        price: tierPrices.min + Math.round((tierPrices.max - tierPrices.min) * 0.4),
        dayNumber: Math.min(2, durationDays),
        matchReason: `Authentic regional budget homestay tailored for ${companionType} in ${destination}. Clean, safe and friendly.`
      },
      {
        name: `${destination} Traveler Youth Hostel & Social Hub`,
        category: 'Hostel / Budget',
        area: `${destination} Vibrant Sightseeing Quarter`,
        rating: 4.7,
        reviews: 440,
        snippet: `Modern co-living hostel, rooftop cafe, evening live events & friendly backpacker community in ${destination}.`,
        amenities: ['Co-working Cafe', 'Free Wi-Fi', 'Board Games', 'Luggage Storage', 'Rooftop Terrace'],
        price: tierPrices.max,
        dayNumber: Math.min(3, durationDays),
        matchReason: `High-value budget stay in ${destination} with premium hostel amenities and prime location.`
      },
      {
        name: `${destination} Alpine Backpacker Eco-Lodge`,
        category: 'Eco-Lodge',
        area: `${destination} Nature Bypass`,
        rating: 4.5,
        reviews: 190,
        snippet: `Budget-friendly wooden cottages, stargazing terrace, bonfire area, and easy access to local exploration in ${destination}.`,
        amenities: ['Campfire / Bonfire', 'Eco-friendly', 'Free Wi-Fi', 'Tea & Coffee Corner'],
        price: tierPrices.min + 300,
        dayNumber: Math.min(4, durationDays),
        matchReason: `Great value budget pick in ${destination} for relaxing in nature without overspending.`
      }
    ];
  } else if (budgetTier === 'Premium') {
    candidates = [
      {
        name: `${destination} 4-Star Boutique Resort & Suites`,
        category: 'Resort',
        area: `${destination} Scenic Promenade`,
        rating: 4.8,
        reviews: 580,
        snippet: `4-star boutique suites, infinity pool, multi-cuisine dining, lush landscaped grounds & cocktail lounge in ${destination}.`,
        amenities: ['Infinity Pool', 'Breakfast Buffet', 'Spa & Wellness', 'Balcony with Views', 'Free Wi-Fi'],
        price: tierPrices.min + Math.round((tierPrices.max - tierPrices.min) * 0.4),
        dayNumber: 1,
        matchReason: `Top recommended 4-star stay matching your ${budgetTier} budget with excellent amenities in ${destination}.`
      },
      {
        name: `${destination} Premium Heritage Villas & Suites`,
        category: 'Homestay / Villa',
        area: `${destination} Private Valley View`,
        rating: 4.7,
        reviews: 360,
        snippet: `Private villa suites, bonfire nights, curated regional cuisine, and expansive garden decks in ${destination}.`,
        amenities: ['Private Balcony', 'Bonfire', 'Room Service', 'Nature Trails', 'Parking'],
        price: tierPrices.min + Math.round((tierPrices.max - tierPrices.min) * 0.2),
        dayNumber: Math.min(2, durationDays),
        matchReason: `Comfortable premium boutique accommodation in ${destination} offering privacy and serene surroundings.`
      },
      {
        name: `${destination} Horizon Cliff Suites & Spa`,
        category: 'Boutique Hotel',
        area: `${destination} Central Prime Quarter`,
        rating: 4.8,
        reviews: 420,
        snippet: `Rooftop cocktail lounge, panoramic suites, fitness center and top-rated breakfast spread in ${destination}.`,
        amenities: ['Rooftop Lounge', 'Fitness Center', 'Free Wi-Fi', 'Valet Parking', 'Room Service'],
        price: tierPrices.max,
        dayNumber: Math.min(3, durationDays),
        matchReason: `Signature 4-star property in ${destination} with modern comforts and great city/nature access.`
      },
      {
        name: `${destination} Eco-Resort & Wellness Pavilion`,
        category: 'Eco-Lodge',
        area: `${destination} Lush Nature Ridge`,
        rating: 4.7,
        reviews: 260,
        snippet: `Sustainable wooden villas, organic chef dining, guided nature walks, and stargazing deck in ${destination}.`,
        amenities: ['Organic Dining', 'Guided Treks', 'Spa Pavilion', 'Free Wi-Fi'],
        price: tierPrices.min + Math.round((tierPrices.max - tierPrices.min) * 0.5),
        dayNumber: Math.min(4, durationDays),
        matchReason: `Curated eco-resort experience in ${destination} blending nature with premium comfort.`
      }
    ];
  } else {
    // Moderate (3-Star Boutique, Heritage Havelis, Cozy Stays)
    candidates = [
      {
        name: `${destination} Boutique Retreat & Suites`,
        category: 'Boutique Hotel',
        area: `${destination} Historic Heritage Quarter`,
        rating: 4.7,
        reviews: 390,
        snippet: `Charming 3-star boutique stay, AC rooms, rooftop cafe, clean facilities and attentive hospitality in ${destination}.`,
        amenities: ['Breakfast Included', 'Free Wi-Fi', 'AC Rooms', 'Rooftop Cafe', 'Tour Assistance'],
        price: tierPrices.min + Math.round((tierPrices.max - tierPrices.min) * 0.4),
        dayNumber: 1,
        matchReason: `Comfortable 3-star boutique stay matching your Moderate budget in ${destination}.`
      },
      {
        name: `${destination} Nature Valley Homestay & Cottages`,
        category: 'Homestay / Villa',
        area: `${destination} Tranquil Green District`,
        rating: 4.6,
        reviews: 280,
        snippet: `Peaceful garden cottages, delicious home-cooked regional meals, and morning scenic views in ${destination}.`,
        amenities: ['Home-cooked Meals', 'Free Wi-Fi', 'Balcony', 'Free Parking'],
        price: tierPrices.min + Math.round((tierPrices.max - tierPrices.min) * 0.2),
        dayNumber: Math.min(2, durationDays),
        matchReason: `Cozy local accommodation in ${destination} offering great value and warmth for ${companionType}.`
      },
      {
        name: `${destination} Central Plaza Hotel`,
        category: 'Boutique Hotel',
        area: `${destination} Commercial & Sightseeing Hub`,
        rating: 4.7,
        reviews: 340,
        snippet: `Spacious AC rooms, in-house restaurant, express laundry, and 24/7 travel desk in ${destination}.`,
        amenities: ['Restaurant', 'Free Wi-Fi', 'Elevator', '24/7 Front Desk'],
        price: tierPrices.max,
        dayNumber: Math.min(3, durationDays),
        matchReason: `Central location in ${destination} making it effortless to visit all key itinerary attractions.`
      },
      {
        name: `${destination} Forest View Cottage Stay`,
        category: 'Eco-Lodge',
        area: `${destination} Lush Nature Belt`,
        rating: 4.5,
        reviews: 190,
        snippet: `Wooden cottages nestled in trees, bonfire setup, outdoor seating and wholesome regional breakfast in ${destination}.`,
        amenities: ['Bonfire', 'Scenic Deck', 'Free Wi-Fi', 'Complimentary Breakfast'],
        price: tierPrices.min + Math.round((tierPrices.max - tierPrices.min) * 0.5),
        dayNumber: Math.min(4, durationDays),
        matchReason: `Relaxing moderate nature stay in ${destination} after an active day of sightseeing.`
      }
    ];
  }

  candidates.forEach((c, idx) => {
    const photo = pickHotelPhoto(c.category, idx);
    const googleQuery = encodeURIComponent(`${c.name} ${destination} hotels booking`);
    stays.push({
      id: `hotel_${idx + 1}_${Date.now()}`,
      dayNumber: c.dayNumber,
      name: c.name,
      category: c.category,
      budgetTier,
      pricePerNight: c.price,
      priceFormatted: `₹${c.price.toLocaleString('en-IN')} / night`,
      locationArea: c.area,
      rating: c.rating,
      reviewCount: c.reviews,
      reviewSnippet: c.snippet,
      amenities: c.amenities,
      imageUrl: photo,
      bookingSearchUrl: `https://www.google.com/travel/hotels?q=${googleQuery}`,
      recommendedFor: `Recommended for ${companionType} looking for authentic ${budgetTier} comfort`,
      matchReason: c.matchReason
    });
  });

  return stays;
}

/**
 * AI-powered hotel, resort, and homestay recommendation fetcher using Gemini AI
 */
export async function fetchAiHotelSuggestions(params: HotelRecommendationParams): Promise<HotelStayRecommendation[]> {
  const cacheKey = getCacheKey(params);
  if (hotelCache.has(cacheKey)) {
    return hotelCache.get(cacheKey)!;
  }

  const fallback = getFallbackHotelRecommendations(params);
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    hotelCache.set(cacheKey, fallback);
    return fallback;
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

    const daysSummary = (params.daysInfo || [])
      .map((d) => `Day ${d.dayNumber}: "${d.theme}" (${d.location || 'Key sights'})`)
      .join('\n');

    const tierGuideline =
      params.budgetTier === 'Luxury'
        ? `STRICT LUXURY TIER MANDATE:
- Suggest ONLY premier 5-Star Luxury Hotels, 5-Star Luxury Resorts, Royal Heritage Palaces, and VIP Private Villa Estates (e.g. Taj, Oberoi, Leela, St. Regis, Ritz-Carlton, Four Seasons, Aman, Alila, W Hotels, Evolve Back, luxury private pool villas).
- NEVER suggest hostels, backpacker dorms, 2-star/3-star budget lodges, or basic guesthouses.
- Nightly rate MUST be strictly in the authentic luxury tier (₹16,000 to ₹45,000+ per night in INR).
- Amenities MUST reflect 5-star luxury (e.g. "Private Plunge Pool", "Butler Service", "5-Star Spa", "Fine Dining", "Chauffeured Airport Transfer", "Champagne Lounge").`
        : params.budgetTier === 'Budget'
        ? `STRICT BUDGET TIER MANDATE:
- Suggest ONLY verified Backpacker Hostels (e.g. Zostel, goSTOPS, Hosteller), shared homestays, and affordable traveler lodges.
- NEVER suggest expensive 5-star luxury resorts.
- Nightly rate MUST be in the budget tier (₹800 to ₹1,800 per night in INR).`
        : params.budgetTier === 'Premium'
        ? `STRICT PREMIUM TIER MANDATE:
- Suggest 4-Star boutique resorts, cliffside pool suites, and premium villas (₹6,500 to ₹14,000 per night in INR).`
        : `STRICT MODERATE TIER MANDATE:
- Suggest comfortable 3-Star boutique hotels, verified Airbnb apartments, and authentic heritage havelis (₹2,500 to ₹5,200 per night in INR).`;

    const prompt = `You are an elite hotel concierge & accommodation specialist AI.
Suggest 5 authentic, real-world hotels, resorts, homestays, or boutique villas in or near "${params.destination}".

Trip Context:
- Destination: "${params.destination}"
- Target Budget Tier: "${params.budgetTier}"
- Travelers: ${params.travellersCount} (${params.companionType || 'Friends'})
- Trip Length: ${params.durationDays} Days
- Travel Styles: ${(params.travelStyles || []).join(', ') || 'Nature, Culture, Relaxation'}

${tierGuideline}

${daysSummary ? `Itinerary Days Context:\n${daysSummary}` : ''}

Provide 5 real, highly rated hotels/resorts strictly in valid JSON format:
[
  {
    "name": "Actual Real Hotel/Resort Name matching ${params.budgetTier} tier",
    "category": "${params.budgetTier === 'Luxury' ? 'Luxury Hotel' : params.budgetTier === 'Budget' ? 'Hostel / Budget' : 'Resort'}",
    "budgetTier": "${params.budgetTier}",
    "pricePerNight": number (realistic per-night INR rate matching ${params.budgetTier} tier),
    "locationArea": "Neighborhood or vicinity description (e.g. 'Mullayanagiri Foothills', 'Vagator Beachfront')",
    "rating": number (4.7 to 5.0),
    "reviewCount": number (e.g. 650),
    "reviewSnippet": "1-2 sentence real guest highlight",
    "amenities": ["Spa", "Private Pool", "Free Wi-Fi", "Breakfast Included"],
    "dayNumber": number (Suggested stay for which day, 1 to ${params.durationDays}),
    "recommendedFor": "e.g. 'Luxury travelers seeking elite 5-star comfort and private pool villas'",
    "matchReason": "Why this specifically fits the ${params.budgetTier} tier"
  }
]

RULES:
1. Provide REAL, authentic places that exist in "${params.destination}".
2. All recommended stays MUST strictly adhere to the "${params.budgetTier}" tier constraints.
3. Return ONLY valid JSON array without markdown formatting.`;

    for (const modelName of PREFERRED_GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3
          }
        });

        const text = response.text || '';
        const parsed = parseJsonSafely(text);

        if (Array.isArray(parsed) && parsed.length > 0) {
          const tierBounds = PRICE_MAP_BY_TIER[params.budgetTier] || PRICE_MAP_BY_TIER.Moderate;
          const results: HotelStayRecommendation[] = parsed.map((item: any, idx: number) => {
            const cat = item.category || (params.budgetTier === 'Luxury' ? 'Luxury Hotel' : params.budgetTier === 'Budget' ? 'Hostel / Budget' : 'Resort');
            const photo = pickHotelPhoto(cat, idx);
            const hotelName = item.name || `${params.destination} Stay`;
            const googleQuery = encodeURIComponent(`${hotelName} ${params.destination} hotels booking`);
            
            // Strictly enforce per-night price within the selected budget tier
            let price = typeof item.pricePerNight === 'number' && item.pricePerNight > 0
              ? item.pricePerNight
              : fallback[idx % fallback.length]?.pricePerNight || tierBounds.min + Math.round((tierBounds.max - tierBounds.min) * 0.5);

            if (price < tierBounds.min) price = tierBounds.min;
            if (price > tierBounds.max) price = tierBounds.max;

            return {
              id: `hotel_ai_${idx + 1}_${Date.now()}`,
              dayNumber: typeof item.dayNumber === 'number' ? Math.max(1, Math.min(params.durationDays, item.dayNumber)) : (idx % params.durationDays) + 1,
              name: hotelName,
              category: cat,
              budgetTier: params.budgetTier,
              pricePerNight: price,
              priceFormatted: `₹${price.toLocaleString('en-IN')} / night`,
              locationArea: item.locationArea || `${params.destination} District`,
              rating: typeof item.rating === 'number' ? item.rating : 4.7,
              reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : 320,
              reviewSnippet: item.reviewSnippet || `Tailored to your ${params.budgetTier} budget with top verified guest ratings.`,
              amenities: Array.isArray(item.amenities) && item.amenities.length > 0 ? item.amenities : ['Breakfast Included', 'Free Wi-Fi', 'Scenic View', 'Parking'],
              imageUrl: photo,
              bookingSearchUrl: `https://www.google.com/travel/hotels?q=${googleQuery}`,
              recommendedFor: item.recommendedFor || `Perfect for ${params.companionType || 'travelers'} seeking ${params.budgetTier} tier comfort`,
              matchReason: item.matchReason || `Strictly matches your ${params.budgetTier} budget tier (₹${tierBounds.min.toLocaleString('en-IN')}–₹${tierBounds.max.toLocaleString('en-IN')}/night)`
            };
          });

          hotelCache.set(cacheKey, results);
          return results;
        }
      } catch (err) {
        console.warn(`[serverHotelAdvisor] Attempt with ${modelName} encountered error: ${formatGenAiError(err)}, trying next...`);
      }
    }
  } catch (error) {
    console.warn('[serverHotelAdvisor] Gemini API error:', error);
  }

  hotelCache.set(cacheKey, fallback);
  return fallback;
}
