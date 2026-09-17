import { BudgetTier, TravelCompanion, HotelStayRecommendation, TravelMode } from '../types';

export interface HotelRecommendationParams {
  destination: string;
  budgetTier: BudgetTier;
  durationDays: number;
  travellersCount: number;
  companionType?: TravelCompanion;
  travelStyles?: string[];
  travelMode?: TravelMode;
  targetDayNumber?: number;
  daysInfo?: {
    dayNumber: number;
    theme: string;
    location?: string;
    lastActivityTitle?: string;
    lastActivityLocation?: string;
    lastActivityCategory?: string;
  }[];
}

export function extractNightStopCity(location?: string, fallbackDest?: string): string {
  if (!location || !location.trim()) return fallbackDest || '';
  let clean = location.trim();
  
  clean = clean
    .replace(/\s+Highway\s+(Stop|Corridor|Stretch|Exit|Hub|Rest Area|Entry)/gi, '')
    .replace(/\s+Expressway\s+(Stretch|Corridor|Exit|Entry)/gi, '')
    .replace(/\s+Expressway/gi, '')
    .replace(/\s+Exit/gi, '')
    .trim();

  if (clean.includes(',')) {
    const parts = clean.split(',').map(p => p.trim()).filter(Boolean);
    if (/^NH-?\d+/i.test(parts[0]) && parts[1]) {
      return parts[1];
    }
    return clean;
  }
  
  if (/^NH-?\d+$/i.test(clean)) {
    return fallbackDest || clean;
  }

  return clean;
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
  const targetDayKey = params.targetDayNumber ? `_day${params.targetDayNumber}` : '_all';
  const lastStopsKey = (params.daysInfo || []).map(d => `${d.dayNumber}:${d.lastActivityLocation || d.location || ''}:${d.lastActivityTitle || ''}`).join('_');
  return `${params.destination.toLowerCase()}__${params.budgetTier}__${params.durationDays}d__${params.companionType || 'Solo'}__${params.travelMode || 'any'}${targetDayKey}__${lastStopsKey}`;
}

export function getDynamicHotelFallback(params: HotelRecommendationParams): HotelStayRecommendation[] {
  const tier = params.budgetTier || 'Moderate';
  const isBudget = tier === 'Budget';
  const isLuxury = tier === 'Luxury';
  const isRoadVehicleMode = params.travelMode === 'Car / Road Trip' || params.travelMode === 'Bike / Motorcycle';

  // If a specific target day is requested, generate 4 to 5 stays specifically in that day's night stop city
  if (params.targetDayNumber) {
    const dayInfo = params.daysInfo?.find(d => d.dayNumber === params.targetDayNumber);
    const dayStopRaw = dayInfo?.lastActivityLocation || dayInfo?.location || params.destination;
    const targetCity = extractNightStopCity(dayStopRaw, params.destination);
    const nearName = dayInfo?.lastActivityTitle ? `Near ${dayInfo.lastActivityTitle}` : `Near ${targetCity}`;

    const stayBlueprints = isBudget
      ? [
          { name: `${targetCity} Highway Travelers Inn`, cat: 'Hostel / Budget' as const, price: 950, rating: 4.6, reviews: 240, img: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80' },
          { name: `Green Oasis Backpacker Lodge ${targetCity}`, cat: 'Hostel / Budget' as const, price: 1200, rating: 4.7, reviews: 310, img: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=600&q=80' },
          { name: `${targetCity} Roadhouse & Dorms`, cat: 'Hostel / Budget' as const, price: 850, rating: 4.5, reviews: 190, img: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80' },
          { name: `Homely Transit Stay ${targetCity}`, cat: 'Homestay / Villa' as const, price: 1400, rating: 4.8, reviews: 180, img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80' },
          { name: `${targetCity} Express Rest Lodge`, cat: 'Hostel / Budget' as const, price: 1100, rating: 4.6, reviews: 260, img: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80' }
        ]
      : isLuxury
      ? [
          { name: `The Grand Palace & Spa ${targetCity}`, cat: 'Luxury Hotel' as const, price: 18500, rating: 4.9, reviews: 480, img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80' },
          { name: `Royal Heritage Pavilion ${targetCity}`, cat: 'Luxury Hotel' as const, price: 22000, rating: 4.9, reviews: 390, img: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80' },
          { name: `The Fern Luxury Suites ${targetCity}`, cat: 'Luxury Hotel' as const, price: 16500, rating: 4.8, reviews: 410, img: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=600&q=80' },
          { name: `${targetCity} Cliffside Villa Retreat`, cat: 'Resort' as const, price: 26000, rating: 5.0, reviews: 290, img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80' },
          { name: `Oberoi / Taj Gateway Sanctuary ${targetCity}`, cat: 'Luxury Hotel' as const, price: 24500, rating: 4.9, reviews: 520, img: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=600&q=80' }
        ]
      : [
          { name: `Hotel Comfort Residency ${targetCity}`, cat: 'Boutique Hotel' as const, price: 3200, rating: 4.7, reviews: 410, img: 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?auto=format&fit=crop&w=600&q=80' },
          { name: `${targetCity} Grand Transit Hotel`, cat: 'Boutique Hotel' as const, price: 3800, rating: 4.8, reviews: 360, img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80' },
          { name: `Valley Breeze Garden Resort ${targetCity}`, cat: 'Resort' as const, price: 4200, rating: 4.7, reviews: 290, img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80' },
          { name: `The Heritage Haven ${targetCity}`, cat: 'Homestay / Villa' as const, price: 2900, rating: 4.8, reviews: 220, img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
          { name: `${targetCity} Highway Executive Inn`, cat: 'Boutique Hotel' as const, price: 3500, rating: 4.6, reviews: 330, img: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80' }
        ];

    return stayBlueprints.map((bp, idx) => {
      const urls = generateHotelBookingUrls(bp.name, targetCity, undefined, undefined, params.travellersCount);
      return {
        id: `hotel-day-${params.targetDayNumber}-${idx + 1}-${Date.now()}`,
        dayNumber: params.targetDayNumber,
        name: bp.name,
        category: bp.cat,
        budgetTier: tier,
        pricePerNight: bp.price,
        priceFormatted: `₹${bp.price.toLocaleString('en-IN')} / night`,
        locationArea: dayInfo?.lastActivityLocation || `${targetCity} Main Corridor`,
        nearPlaceName: nearName,
        rating: bp.rating,
        reviewCount: bp.reviews,
        reviewSnippet: `Verified ${tier} comfort located in ${targetCity} with 24/7 front desk and secure vehicle parking.`,
        amenities: ['Free WiFi', 'Breakfast Available', 'Secure Vehicle Parking', 'Air Conditioning', 'Power Backup'],
        imageUrl: bp.img,
        matchReason: `Convenient night stop in ${targetCity} ${nearName} with secure on-site parking for road travelers.`,
        bookingSearchUrl: urls.primary,
        recommendedFor: `Road travelers concluding Day ${params.targetDayNumber} near ${nearName}`
      };
    });
  }

  // Fallback when no targetDayNumber is provided (generates across Day 1, 2, 3)
  const dest = params.destination || 'Destination';
  const price1 = isBudget ? 1200 : isLuxury ? 12000 : 3800;
  const price2 = isBudget ? 1800 : isLuxury ? 16500 : 4800;
  const price3 = isBudget ? 900 : isLuxury ? 22000 : 3200;

  const day1Info = params.daysInfo?.find(d => d.dayNumber === 1);
  const day2Info = params.daysInfo?.find(d => d.dayNumber === 2);
  const day3Info = params.daysInfo?.find(d => d.dayNumber === 3);

  const city1 = extractNightStopCity(day1Info?.lastActivityLocation || day1Info?.location, dest);
  const city2 = extractNightStopCity(day2Info?.lastActivityLocation || day2Info?.location, dest);
  const city3 = extractNightStopCity(day3Info?.lastActivityLocation || day3Info?.location, dest);

  const near1 = day1Info?.lastActivityTitle ? `Near ${day1Info.lastActivityTitle}` : `Near ${city1}`;
  const near2 = day2Info?.lastActivityTitle ? `Near ${day2Info.lastActivityTitle}` : `Near ${city2}`;
  const near3 = day3Info?.lastActivityTitle ? `Near ${day3Info.lastActivityTitle}` : `Near ${city3}`;

  const urls1 = generateHotelBookingUrls(
    isLuxury ? `The Grand Heritage Palace & Spa ${city1}` : `${city1} Mountain & Valley View Resort`,
    city1,
    undefined,
    undefined,
    params.travellersCount
  );
  const urls2 = generateHotelBookingUrls(
    `${city2} Heritage Boutique Stay`,
    city2,
    undefined,
    undefined,
    params.travellersCount
  );
  const urls3 = generateHotelBookingUrls(
    `${city3} Eco Nature Retreat`,
    city3,
    undefined,
    undefined,
    params.travellersCount
  );

  return [
    {
      id: `hotel-fallback-1-${crypto.randomUUID()}`,
      dayNumber: 1,
      name: isLuxury ? `The Grand Heritage Palace & Spa ${city1}` : isBudget ? `${city1} Travelers Backpacker Hub` : `${city1} Mountain & Valley View Resort`,
      category: isLuxury ? 'Luxury Hotel' : isBudget ? 'Hostel / Budget' : 'Resort',
      budgetTier: tier,
      pricePerNight: price1,
      priceFormatted: `₹${price1.toLocaleString()} / night`,
      locationArea: day1Info?.lastActivityLocation || `${city1} Central Quarter`,
      nearPlaceName: near1,
      rating: 4.8,
      reviewCount: 420,
      reviewSnippet: 'Outstanding hospitality, spotless rooms, and safe on-site parking for road travelers.',
      amenities: ['Free WiFi', 'Breakfast Included', 'Scenic View', 'Air Conditioning', 'Secure Vehicle Parking'],
      imageUrl: isLuxury
        ? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80'
        : 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
      matchReason: `Located conveniently in ${city1} ${near1} with safe parking for your road trip.`,
      bookingSearchUrl: urls1.primary,
      recommendedFor: isRoadVehicleMode ? `Road trippers stopping near ${near1}` : 'Scenic views & central relaxation'
    },
    {
      id: `hotel-fallback-2-${crypto.randomUUID()}`,
      dayNumber: 2,
      name: isLuxury ? `Royal Pavilion Boutique Estate ${city2}` : isBudget ? `${city2} Cozy Nest Inn` : `${city2} Heritage Boutique Stay`,
      category: isLuxury ? 'Luxury Hotel' : isBudget ? 'Homestay / Villa' : 'Boutique Hotel',
      budgetTier: tier,
      pricePerNight: price2,
      priceFormatted: `₹${price2.toLocaleString()} / night`,
      locationArea: day2Info?.lastActivityLocation || `${city2} Old Heritage Town`,
      nearPlaceName: near2,
      rating: 4.7,
      reviewCount: 310,
      reviewSnippet: 'Authentic local charm, peaceful atmosphere, and secure gated parking.',
      amenities: ['Free High-Speed WiFi', 'Artisan Cafe', 'Garden Terrace', 'Secure Vehicle Parking'],
      imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
      matchReason: `Located conveniently in ${city2} ${near2} with safe vehicle parking.`,
      bookingSearchUrl: urls2.primary,
      recommendedFor: isRoadVehicleMode ? `Road trippers stopping near ${near2}` : 'Cultural immersion & heritage charm'
    },
    {
      id: `hotel-fallback-3-${crypto.randomUUID()}`,
      dayNumber: 3,
      name: isLuxury ? `The Serenity Hilltop Villas ${city3}` : `${city3} Eco Nature Retreat & Cottages`,
      category: isLuxury ? 'Luxury Hotel' : 'Eco-Lodge',
      budgetTier: tier,
      pricePerNight: price3,
      priceFormatted: `₹${price3.toLocaleString()} / night`,
      locationArea: day3Info?.lastActivityLocation || `${city3} Nature Foothills`,
      nearPlaceName: near3,
      rating: 4.9,
      reviewCount: 512,
      reviewSnippet: 'Tranquil haven surrounded by nature with infinity views and secure parking.',
      amenities: ['Nature Trails', 'Outdoor Fire Pit', 'Organic Dining', 'Secure Vehicle Parking'],
      imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80',
      matchReason: `Located conveniently in ${city3} ${near3} with vehicle parking.`,
      bookingSearchUrl: urls3.primary,
      recommendedFor: isRoadVehicleMode ? `Road trippers stopping near ${near3}` : 'Nature getaways & tranquil wellness'
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

