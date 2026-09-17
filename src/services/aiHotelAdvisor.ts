import { BudgetTier, TravelCompanion, HotelStayRecommendation, TravelMode } from '../types';

export interface HotelRecommendationParams {
  destination: string;
  budgetTier: BudgetTier;
  durationDays: number;
  travellersCount: number;
  companionType?: TravelCompanion;
  travelStyles?: string[];
  travelMode?: TravelMode;
  daysInfo?: {
    dayNumber: number;
    theme: string;
    location?: string;
    lastActivityTitle?: string;
    lastActivityLocation?: string;
    lastActivityCategory?: string;
  }[];
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
  const bookingComUrl = hasValidFutureDates
    ? `https://www.booking.com/searchresults.html?ss=${specificQuery}&checkin=${checkin}&checkout=${checkout}&group_adults=${adults}`
    : `https://www.booking.com/searchresults.html?ss=${specificQuery}`;

  // 3. Agoda Direct Search
  const agodaUrl = `https://www.agoda.com/search?text=${specificQuery}`;

  // 4. MakeMyTrip Direct Search
  const makeMyTripUrl = `https://www.makemytrip.com/hotels/hotel-listing/?searchText=${specificQuery}`;

  // 5. Google Maps Direct Location & Reviews
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${specificQuery}`;

  // 6. TripAdvisor Reviews & Photos
  const tripAdvisorUrl = `https://www.tripadvisor.com/Search?q=${specificQuery}`;

  // 7. Expedia Direct Rates
  const expediaUrl = `https://www.expedia.com/Hotel-Search?destination=${specificQuery}`;

  // 8. Official / Direct Hotel Website Deep Search
  const officialSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${cleanHotelName} ${cleanDest} official website direct booking`)}`;

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
  const lastStopsKey = (params.daysInfo || []).map(d => d.lastActivityTitle || '').join('_');
  return `${params.destination.toLowerCase()}__${params.budgetTier}__${params.durationDays}d__${params.companionType || 'Solo'}__${params.travelMode || 'any'}__${lastStopsKey}`;
}

export function getDynamicHotelFallback(params: HotelRecommendationParams): HotelStayRecommendation[] {
  const dest = params.destination || 'Destination';
  const tier = params.budgetTier || 'Moderate';
  const isBudget = tier === 'Budget';
  const isLuxury = tier === 'Luxury';
  const isRoadVehicleMode = params.travelMode === 'Car / Road Trip' || params.travelMode === 'Bike / Motorcycle';

  const price1 = isBudget ? 1200 : isLuxury ? 12000 : 3800;
  const price2 = isBudget ? 1800 : isLuxury ? 16500 : 4800;
  const price3 = isBudget ? 900 : isLuxury ? 22000 : 3200;

  const day1Info = params.daysInfo?.find(d => d.dayNumber === 1);
  const day2Info = params.daysInfo?.find(d => d.dayNumber === 2);
  const day3Info = params.daysInfo?.find(d => d.dayNumber === 3);

  const near1 = day1Info?.lastActivityTitle ? `Near ${day1Info.lastActivityTitle}` : undefined;
  const near2 = day2Info?.lastActivityTitle ? `Near ${day2Info.lastActivityTitle}` : undefined;
  const near3 = day3Info?.lastActivityTitle ? `Near ${day3Info.lastActivityTitle}` : undefined;

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
      locationArea: day1Info?.lastActivityLocation || `${dest} Central Scenic Quarter`,
      nearPlaceName: near1,
      rating: 4.8,
      reviewCount: 420,
      reviewSnippet: 'Outstanding hospitality, spotless rooms, and safe on-site parking for road travelers.',
      amenities: ['Free WiFi', 'Breakfast Included', 'Scenic View', 'Air Conditioning', 'Secure Vehicle Parking'],
      imageUrl: isLuxury
        ? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80'
        : 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
      matchReason: near1
        ? `Located conveniently close to ${day1Info?.lastActivityTitle} with safe parking for your road trip.`
        : `Top-rated stay in ${dest} tailored for ${params.companionType || 'Travellers'} within your ${tier} budget.`,
      bookingSearchUrl: urls1.primary,
      recommendedFor: isRoadVehicleMode ? `Road trippers stopping near ${day1Info?.lastActivityTitle || dest}` : 'Scenic views & central relaxation'
    },
    {
      id: `hotel-fallback-2-${crypto.randomUUID()}`,
      dayNumber: 2,
      name: isLuxury ? `Royal Pavilion Boutique Estate ${dest}` : isBudget ? `${dest} Cozy Nest Inn` : `${dest} Heritage Boutique Stay`,
      category: isLuxury ? 'Luxury Hotel' : isBudget ? 'Homestay / Villa' : 'Boutique Hotel',
      budgetTier: tier,
      pricePerNight: price2,
      priceFormatted: `₹${price2.toLocaleString()} / night`,
      locationArea: day2Info?.lastActivityLocation || `${dest} Old Heritage Town`,
      nearPlaceName: near2,
      rating: 4.7,
      reviewCount: 310,
      reviewSnippet: 'Authentic local charm, peaceful atmosphere, and secure gated parking.',
      amenities: ['Free High-Speed WiFi', 'Artisan Cafe', 'Garden Terrace', 'Secure Vehicle Parking'],
      imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
      matchReason: near2
        ? `Located conveniently close to ${day2Info?.lastActivityTitle} with safe vehicle parking.`
        : `Charming boutique sanctuary providing exceptional comfort and direct access to highlights in ${dest}.`,
      bookingSearchUrl: urls2.primary,
      recommendedFor: isRoadVehicleMode ? `Road trippers stopping near ${day2Info?.lastActivityTitle || dest}` : 'Cultural immersion & heritage charm'
    },
    {
      id: `hotel-fallback-3-${crypto.randomUUID()}`,
      dayNumber: 3,
      name: isLuxury ? `The Serenity Hilltop Villas ${dest}` : `${dest} Eco Nature Retreat & Cottages`,
      category: isLuxury ? 'Luxury Hotel' : 'Eco-Lodge',
      budgetTier: tier,
      pricePerNight: price3,
      priceFormatted: `₹${price3.toLocaleString()} / night`,
      locationArea: day3Info?.lastActivityLocation || `${dest} Nature Foothills`,
      nearPlaceName: near3,
      rating: 4.9,
      reviewCount: 512,
      reviewSnippet: 'Tranquil haven surrounded by nature with infinity views and secure parking.',
      amenities: ['Nature Trails', 'Outdoor Fire Pit', 'Organic Dining', 'Secure Vehicle Parking'],
      imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80',
      matchReason: near3
        ? `Located conveniently close to ${day3Info?.lastActivityTitle} with vehicle parking.`
        : `Serene hillside nature immersion offering unmatched relaxation in ${dest}.`,
      bookingSearchUrl: urls3.primary,
      recommendedFor: isRoadVehicleMode ? `Road trippers stopping near ${day3Info?.lastActivityTitle || dest}` : 'Nature getaways & tranquil wellness'
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

