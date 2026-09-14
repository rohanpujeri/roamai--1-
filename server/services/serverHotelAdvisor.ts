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

export async function fetchAiHotelSuggestions(params: HotelRecommendationParams): Promise<HotelStayRecommendation[]> {
  const cacheKey = getCacheKey(params);
  if (hotelCache.has(cacheKey)) {
    return hotelCache.get(cacheKey)!;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[serverHotelAdvisor] No GEMINI_API_KEY available in environment');
    return [];
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const daysSummary = params.daysInfo && params.daysInfo.length > 0
      ? params.daysInfo.map((d) => `Day ${d.dayNumber}: ${d.theme} ${d.location ? `(${d.location})` : ''}`).join('\n')
      : '';

    const tierGuideline = params.budgetTier === 'Luxury'
      ? `STRICT LUXURY TIER MANDATE:
- Suggest ONLY premier 5-Star luxury hotels (e.g. Taj, Oberoi, Marriott, Leela, Four Seasons), heritage palaces, and private luxury pool villas.
- Nightly rate MUST be in the luxury tier (₹16,000 to ₹45,000+ per night in INR).`
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
Search and suggest 5 authentic, real-world hotels, resorts, homestays, or backpacker hostels that currently exist in or near "${params.destination}".

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
    "name": "Actual Real Hotel/Resort Name in ${params.destination} matching ${params.budgetTier} tier",
    "category": "${params.budgetTier === 'Luxury' ? 'Luxury Hotel' : params.budgetTier === 'Budget' ? 'Hostel / Budget' : 'Resort'}",
    "budgetTier": "${params.budgetTier}",
    "pricePerNight": number (realistic per-night INR rate matching ${params.budgetTier} tier),
    "locationArea": "Neighborhood or vicinity description in ${params.destination}",
    "rating": number (4.6 to 5.0),
    "reviewCount": number (e.g. 520),
    "reviewSnippet": "1-2 sentence real guest highlight",
    "amenities": ["Free Wi-Fi", "Breakfast Included", "Scenic View", "Air Conditioning"],
    "dayNumber": number (Suggested stay for which day, 1 to ${params.durationDays}),
    "recommendedFor": "e.g. 'Travelers seeking ${params.budgetTier} comfort in ${params.destination}'",
    "matchReason": "Why this specifically fits the ${params.budgetTier} tier"
  }
]

RULES:
1. Provide REAL, authentic places that exist in "${params.destination}".
2. All recommended stays MUST strictly adhere to the "${params.budgetTier}" tier constraints.
3. Return ONLY the valid JSON array without extra text.`;

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
            const googleQuery = encodeURIComponent(`${hotelName} ${params.destination}`);
            
            // Strictly enforce per-night price within the selected budget tier
            let price = typeof item.pricePerNight === 'number' && item.pricePerNight > 0
              ? item.pricePerNight
              : tierBounds.min + Math.round((tierBounds.max - tierBounds.min) * 0.5);

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
              reviewSnippet: item.reviewSnippet || `Tailored to your ${params.budgetTier} budget with verified guest ratings.`,
              amenities: Array.isArray(item.amenities) && item.amenities.length > 0 ? item.amenities : ['Breakfast Included', 'Free Wi-Fi', 'Scenic View', 'Parking'],
              imageUrl: photo,
              bookingSearchUrl: `https://www.google.com/travel/hotels?q=${googleQuery}`,
              recommendedFor: item.recommendedFor || `Perfect for ${params.companionType || 'travelers'} seeking ${params.budgetTier} tier comfort in ${params.destination}`,
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

  return [];
}
