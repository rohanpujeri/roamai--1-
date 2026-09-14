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

export function getDynamicHotelFallback(params: HotelRecommendationParams): HotelStayRecommendation[] {
  const dest = params.destination || 'Destination';
  const tier = params.budgetTier || 'Moderate';
  const isBudget = tier === 'Budget';
  const isLuxury = tier === 'Luxury';

  const price1 = isBudget ? 1200 : isLuxury ? 12000 : 3800;
  const price2 = isBudget ? 1800 : isLuxury ? 16500 : 4800;
  const price3 = isBudget ? 900 : isLuxury ? 22000 : 3200;

  const urls1 = generateHotelBookingUrls(
    isLuxury ? `The Grand Heritage Palace & Spa ${dest}` : `${dest} Mountain & Valley View Resort`,
    dest,
    undefined,
    undefined,
    params.travellersCount
  );
  const urls2 = generateHotelBookingUrls(
    `${dest} Heritage Boutique Stay`,
    dest,
    undefined,
    undefined,
    params.travellersCount
  );
  const urls3 = generateHotelBookingUrls(
    `${dest} Eco Nature Retreat`,
    dest,
    undefined,
    undefined,
    params.travellersCount
  );

  return [
    {
      id: `hotel-fallback-1-${crypto.randomUUID()}`,
      dayNumber: 1,
      name: isLuxury ? `The Grand Heritage Palace & Spa ${dest}` : isBudget ? `${dest} Travelers Backpacker Hub` : `${dest} Mountain & Valley View Resort`,
      category: isLuxury ? 'Luxury Hotel' : isBudget ? 'Hostel / Budget' : 'Resort',
      budgetTier: tier,
      pricePerNight: price1,
      priceFormatted: `₹${price1.toLocaleString()} / night`,
      locationArea: `${dest} Central Scenic Quarter`,
      rating: 4.8,
      reviewCount: 420,
      reviewSnippet: 'Outstanding hospitality, spotless rooms, and breathtaking morning views.',
      amenities: ['Free WiFi', 'Breakfast Included', 'Scenic View', 'Air Conditioning', 'Parking'],
      imageUrl: isLuxury
        ? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80'
        : 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
      matchReason: `Top-rated stay in ${dest} tailored for ${params.companionType || 'Travellers'} within your ${tier} budget.`,
      bookingSearchUrl: urls1.primary,
      recommendedFor: 'Scenic views & central relaxation'
    },
    {
      id: `hotel-fallback-2-${crypto.randomUUID()}`,
      dayNumber: 2,
      name: isLuxury ? `Royal Pavilion Boutique Estate ${dest}` : isBudget ? `${dest} Cozy Nest Inn` : `${dest} Heritage Boutique Stay`,
      category: isLuxury ? 'Luxury Hotel' : isBudget ? 'Homestay / Villa' : 'Boutique Hotel',
      budgetTier: tier,
      pricePerNight: price2,
      priceFormatted: `₹${price2.toLocaleString()} / night`,
      locationArea: `${dest} Old Heritage Town`,
      rating: 4.7,
      reviewCount: 310,
      reviewSnippet: 'Authentic local charm, peaceful atmosphere, and walking distance to prime attractions.',
      amenities: ['Free High-Speed WiFi', 'Artisan Cafe', 'Garden Terrace', '24/7 Concierge'],
      imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
      matchReason: `Charming boutique sanctuary providing exceptional comfort and direct access to highlights in ${dest}.`,
      bookingSearchUrl: urls2.primary,
      recommendedFor: 'Cultural immersion & heritage charm'
    },
    {
      id: `hotel-fallback-3-${crypto.randomUUID()}`,
      dayNumber: 3,
      name: isLuxury ? `The Serenity Hilltop Villas ${dest}` : `${dest} Eco Nature Retreat & Cottages`,
      category: isLuxury ? 'Luxury Hotel' : 'Eco-Lodge',
      budgetTier: tier,
      pricePerNight: price3,
      priceFormatted: `₹${price3.toLocaleString()} / night`,
      locationArea: `${dest} Nature Foothills`,
      rating: 4.9,
      reviewCount: 512,
      reviewSnippet: 'Tranquil haven surrounded by nature with infinity views and exceptional dining.',
      amenities: ['Nature Trails', 'Outdoor Fire Pit', 'Organic Dining', 'Panoramic Deck'],
      imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80',
      matchReason: `Serene hillside nature immersion offering unmatched relaxation in ${dest}.`,
      bookingSearchUrl: urls3.primary,
      recommendedFor: 'Nature getaways & tranquil wellness'
    }
  ];
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

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const result = await response.json();
      if (Array.isArray(result) && result.length > 0) {
        clientHotelCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch hotels from AI API, using dynamic generator:', error);
  }

  const fallback = getDynamicHotelFallback(params);
  clientHotelCache.set(cacheKey, fallback);
  return fallback;
}

