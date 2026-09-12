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

export function generateHotelBookingUrls(
  hotelName: string,
  destination: string,
  startDate?: string,
  endDate?: string,
  travellersCount: number = 2
) {
  const cleanHotelName = hotelName.trim();
  const cleanDest = destination.trim();
  const specificQuery = encodeURIComponent(`${cleanHotelName} ${cleanDest}`);
  const destQuery = encodeURIComponent(cleanDest);
  const hotelQuery = encodeURIComponent(cleanHotelName);

  // Format dates if available (YYYY-MM-DD)
  let checkin = '';
  let checkout = '';
  if (startDate && !isNaN(Date.parse(startDate))) {
    checkin = new Date(startDate).toISOString().split('T')[0];
  }
  if (endDate && !isNaN(Date.parse(endDate))) {
    checkout = new Date(endDate).toISOString().split('T')[0];
  }
  const adults = Math.max(1, travellersCount || 2);

  // 1. Google Travel / Hotels Direct Property Rate Comparison
  const googleHotelsUrl = checkin && checkout
    ? `https://www.google.com/travel/hotels?q=${specificQuery}&checkin=${checkin}&checkout=${checkout}&adults=${adults}`
    : `https://www.google.com/travel/hotels?q=${specificQuery}`;

  // 2. Booking.com Direct Search for exact property in destination
  let bookingComUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${cleanHotelName}, ${cleanDest}`)}`;
  if (checkin && checkout) {
    bookingComUrl += `&checkin=${checkin}&checkout=${checkout}&group_adults=${adults}&no_rooms=1`;
  }

  // 3. Agoda Direct Search
  let agodaUrl = `https://www.agoda.com/en-gb/search?text=${specificQuery}`;
  if (checkin && checkout) {
    agodaUrl += `&checkIn=${checkin}&checkOut=${checkout}&rooms=1&adults=${adults}`;
  }

  // 4. TripAdvisor Direct Property & Price Comparison
  const tripAdvisorUrl = `https://www.tripadvisor.com/Search?q=${specificQuery}`;

  // 5. Expedia Direct Hotel Search
  let expediaUrl = `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(`${cleanHotelName}, ${cleanDest}`)}`;
  if (checkin && checkout) {
    expediaUrl += `&startDate=${checkin}&endDate=${checkout}&adults=${adults}`;
  }

  // 6. MakeMyTrip Direct Search
  const makeMyTripUrl = `https://www.google.com/search?q=${encodeURIComponent(`${cleanHotelName} ${cleanDest} MakeMyTrip`)}`;

  // 7. Direct Official Website Search
  const officialSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${cleanHotelName} ${cleanDest} official hotel website booking`)}`;

  return {
    primary: googleHotelsUrl,
    googleHotels: googleHotelsUrl,
    bookingCom: bookingComUrl,
    agoda: agodaUrl,
    tripAdvisor: tripAdvisorUrl,
    expedia: expediaUrl,
    makeMyTrip: makeMyTripUrl,
    officialSearch: officialSearchUrl
  };
}

const clientHotelCache = new Map<string, HotelStayRecommendation[]>();

function getCacheKey(params: HotelRecommendationParams): string {
  return `${params.destination.toLowerCase()}__${params.budgetTier}__${params.durationDays}d__${params.companionType || 'Solo'}`;
}

export function getFallbackHotelRecommendations(params: HotelRecommendationParams): HotelStayRecommendation[] {
  const { destination, budgetTier, durationDays = 3, companionType = 'Friends' } = params;

  // Baseline price per night ranges by tier
  const priceMap = {
    Budget: { min: 800, max: 1600 },
    Moderate: { min: 2600, max: 4800 },
    Premium: { min: 6500, max: 12000 },
    Luxury: { min: 18000, max: 36000 }
  };

  const tierPrices = priceMap[budgetTier] || priceMap.Moderate;
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

export async function fetchAiHotelSuggestions(params: HotelRecommendationParams): Promise<HotelStayRecommendation[]> {
  const cacheKey = getCacheKey(params);
  if (clientHotelCache.has(cacheKey)) {
    return clientHotelCache.get(cacheKey)!;
  }

  const fallback = getFallbackHotelRecommendations(params);

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
    console.warn('Failed to fetch hotels from API, using heuristic baseline:', error);
  }

  clientHotelCache.set(cacheKey, fallback);
  return fallback;
}
