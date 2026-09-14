import { BudgetTier, TravelCompanion, HotelStayRecommendation } from '../types';

export interface HotelRecommendationParams {
  destination: string;
  budgetTier: BudgetTier;
  durationDays: number;
  travellersCount: number;
  companionType?: TravelCompanion;
  travelStyles?: string[];
  daysInfo?: { dayNumber: number; theme: string; location?: string }[];
}

export function generateHotelBookingUrls(
  hotelName: string,
  destination: string,
  startDate?: string,
  endDate?: string,
  travellersCount: number = 2
) {
  const cleanHotelName = hotelName.trim();
  const cleanDest = destination.trim();
  const propertySearchTerm = `${cleanHotelName} ${cleanDest}`;
  const specificQuery = encodeURIComponent(propertySearchTerm);
  const adults = Math.max(1, travellersCount || 2);

  // Validate dates: Only include check-in/out if valid AND not in the past
  let checkin = '';
  let checkout = '';
  const nowMs = Date.now() - (24 * 60 * 60 * 1000); // allow today
  if (startDate && !isNaN(Date.parse(startDate))) {
    const sDate = new Date(startDate);
    if (sDate.getTime() >= nowMs) {
      checkin = sDate.toISOString().split('T')[0];
    }
  }
  if (endDate && !isNaN(Date.parse(endDate))) {
    const eDate = new Date(endDate);
    if (eDate.getTime() >= nowMs) {
      checkout = eDate.toISOString().split('T')[0];
    }
  }

  const hasValidFutureDates = Boolean(checkin && checkout);

  // 1. Google Travel / Hotels Direct Property Rate Comparison
  const googleHotelsUrl = hasValidFutureDates
    ? `https://www.google.com/travel/hotels?q=${specificQuery}&checkin=${checkin}&checkout=${checkout}&adults=${adults}`
    : `https://www.google.com/travel/hotels?q=${specificQuery}`;

  // 2. Booking.com Direct Search
  let bookingComUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(propertySearchTerm)}&sb=1`;
  if (hasValidFutureDates) {
    bookingComUrl += `&checkin=${checkin}&checkout=${checkout}&group_adults=${adults}&no_rooms=1`;
  }

  // 3. Agoda Direct Hotel Listing
  const agodaUrl = `https://www.google.com/search?q=${encodeURIComponent(propertySearchTerm + ' Agoda booking')}`;

  // 4. MakeMyTrip Direct Search
  const makeMyTripUrl = `https://www.google.com/search?q=${encodeURIComponent(propertySearchTerm + ' MakeMyTrip booking')}`;

  // 5. Google Maps Direct Property Place & Booking
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(propertySearchTerm)}`;

  // 6. TripAdvisor Direct Property & Price Comparison
  const tripAdvisorUrl = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(propertySearchTerm)}`;

  // 7. Expedia Direct Hotel Search
  let expediaUrl = `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(propertySearchTerm)}`;
  if (hasValidFutureDates) {
    expediaUrl += `&startDate=${checkin}&endDate=${checkout}&adults=${adults}&rooms=1`;
  }

  // 8. Direct Official Website Search
  const officialSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${cleanHotelName} ${cleanDest} official hotel website booking`)}`;

  return {
    primary: googleHotelsUrl,
    googleHotels: googleHotelsUrl,
    bookingCom: bookingComUrl,
    agoda: agodaUrl,
    makeMyTrip: makeMyTripUrl,
    googleMaps: googleMapsUrl,
    tripAdvisor: tripAdvisorUrl,
    expedia: expediaUrl,
    officialSearch: officialSearchUrl
  };
}

const clientHotelCache = new Map<string, HotelStayRecommendation[]>();

function getCacheKey(params: HotelRecommendationParams): string {
  return `${params.destination.toLowerCase()}__${params.budgetTier}__${params.durationDays}d__${params.companionType || 'Solo'}`;
}

export async function fetchAiHotelSuggestions(params: HotelRecommendationParams): Promise<HotelStayRecommendation[]> {
  const cacheKey = getCacheKey(params);
  if (clientHotelCache.has(cacheKey)) {
    return clientHotelCache.get(cacheKey)!;
  }

  try {
    const response = await fetch('/api/ai/suggest-hotels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (response.ok) {
      const result = await response.json();
      if (Array.isArray(result) && result.length > 0) {
        clientHotelCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch hotels from AI API:', error);
  }

  return [];
}
