import { Trip } from '../types';

export const DEMO_TRIPS: Trip[] = [
  {
    id: 'demo-kyoto',
    title: 'Historic Temples & Zen Gardens',
    destination: 'Kyoto',
    destinationStateOrCountry: 'Japan',
    startDate: '2026-10-15',
    endDate: '2026-10-20',
    durationDays: 5,
    companionType: 'Couple',
    travellersCount: 2,
    travelMode: 'Flight',
    budgetTier: 'Moderate',
    targetBudget: 58000,
    currency: '₹',
    heroImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop&q=80',
    clothingAdvice: 'Comfortable walking shoes, light layers, and a modest jacket for temple visits.',
    createdAt: '2026-10-01T00:00:00.000Z',
    preferences: {
      styles: ['Culture', 'Photography', 'Food', 'Sightseeing'],
      pace: 'Balanced',
      food: 'No preference',
      alcohol: 'Occasionally',
      travelMode: 'Flight',
      startCity: 'Tokyo',
      idealDay: ['Morning shrine walk', 'Authentic matcha tea ceremony', 'Traditional kaiseki dinner'],
      avoidances: ['Overcrowded tourist traps at midday']
    },
    routeSummary: {
      distanceKm: 450,
      flightDuration: '1h 15m',
      departureHub: 'Tokyo Haneda Airport (HND)',
      arrivalHub: 'Osaka Itami Airport (ITM)'
    },
    days: [
      {
        dayNumber: 1,
        date: '2026-10-15',
        theme: 'Arashiyama Bamboo & River Walk',
        vibe: 'Serene Nature & Heritage',
        weatherForecast: {
          temp: '22°C',
          condition: 'Sunny',
          icon: '🌸',
          rainChance: 5
        },
        activities: [
          {
            id: 'demo-act-1',
            time: '08:30 AM',
            title: 'Arashiyama Bamboo Grove Walk',
            category: 'Nature',
            location: 'Arashiyama, Ukyo Ward, Kyoto',
            coordinates: { lat: 35.017, lng: 135.671 },
            estimatedCost: 0,
            travelTimeFromPrev: '10 min',
            duration: '1.5 hours',
            description: 'Stroll through the towering green bamboo stalks early in the morning before crowds gather.',
            imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80',
            recommendationReason: 'Morning golden light filtering through bamboo canopy is unmatched for photography.'
          },
          {
            id: 'demo-act-2',
            time: '11:00 AM',
            title: 'Tenryu-ji Zen Temple Garden',
            category: 'Culture',
            location: 'Tenryuji, Susukinobaba-cho, Saga, Ukyo Ward',
            coordinates: { lat: 35.015, lng: 135.677 },
            estimatedCost: 600,
            travelTimeFromPrev: '5 min walk',
            duration: '1.5 hours',
            description: 'Explore the 14th-century pond garden that miraculously survived fires, framed by Mount Arashiyama.',
            imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80',
            recommendationReason: 'UNESCO World Heritage Site with authentic stroll-style landscape architecture.'
          },
          {
            id: 'demo-act-3',
            time: '02:00 PM',
            title: 'Traditional Uji Matcha Tasting & Tea Ceremony',
            category: 'Food',
            location: 'Saga Tenryuji, Kyoto',
            coordinates: { lat: 35.014, lng: 135.678 },
            estimatedCost: 1500,
            travelTimeFromPrev: '8 min walk',
            duration: '1 hour',
            description: 'Whisk fresh green matcha accompanied by seasonal wagashi sweet pastries.',
            imageUrl: 'https://images.unsplash.com/photo-1545048702-79360700129e?w=800&auto=format&fit=crop&q=80',
            recommendationReason: 'Calming mindful pause in a centuries-old tatami teahouse.'
          }
        ]
      },
      {
        dayNumber: 2,
        date: '2026-10-16',
        theme: 'Torii Gates & Gion Geisha District',
        vibe: 'Spiritual & Evening Lanterns',
        weatherForecast: {
          temp: '21°C',
          condition: 'Pleasant',
          icon: '⛩️',
          rainChance: 10
        },
        activities: [
          {
            id: 'demo-act-4',
            time: '07:30 AM',
            title: 'Fushimi Inari-taisha Senbon Torii Hike',
            category: 'Sightseeing',
            location: '68 Fukakusa Yabunouchicho, Fushimi Ward',
            coordinates: { lat: 34.967, lng: 135.772 },
            estimatedCost: 0,
            travelTimeFromPrev: '20 min train',
            duration: '2.5 hours',
            description: 'Hike through thousands of bright vermillion torii gates winding up the sacred Mount Inari.',
            imageUrl: 'https://images.unsplash.com/photo-1478436127897-769e00d0c715?w=800&auto=format&fit=crop&q=80',
            recommendationReason: 'Iconic world-famous path with peaceful fox shrines and sweeping mountain viewpoints.'
          },
          {
            id: 'demo-act-5',
            time: '05:30 PM',
            title: 'Twilight Walk in Historic Gion & Pontocho',
            category: 'Culture',
            location: 'Gion, Higashiyama Ward, Kyoto',
            coordinates: { lat: 35.003, lng: 135.777 },
            estimatedCost: 2000,
            travelTimeFromPrev: '15 min cab',
            duration: '2 hours',
            description: 'Wander wooden machiya merchant houses alongside glowing lanterns in Kyoto’s geisha quarter.',
            imageUrl: 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=800&auto=format&fit=crop&q=80',
            recommendationReason: 'Experience Kyoto’s nighttime historic atmosphere and sample artisanal street yakitori.'
          }
        ]
      }
    ],
    packingList: [
      { id: 'p1', name: 'Slip-on Walking Shoes (easy for temples)', category: 'Clothing', checked: true },
      { id: 'p2', name: 'Universal Travel Power Adapter (Type A/B)', category: 'Electronics', checked: true },
      { id: 'p3', name: 'Passport & Rail Pass Confirmation', category: 'Documents', checked: false }
    ],
    requirements: [],
    bookings: []
  },
  {
    id: 'demo-bali',
    title: 'Coastal Surf & Coral Reefs',
    destination: 'Bali',
    destinationStateOrCountry: 'Indonesia',
    startDate: '2026-10-22',
    endDate: '2026-10-27',
    durationDays: 5,
    companionType: 'Friends',
    travellersCount: 3,
    travelMode: 'Flight',
    budgetTier: 'Budget',
    targetBudget: 42000,
    currency: '₹',
    heroImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&auto=format&fit=crop&q=80',
    clothingAdvice: 'Swimwear, breathable linen clothing, UV rashguards, and sunglasses.',
    createdAt: '2026-10-01T00:00:00.000Z',
    preferences: {
      styles: ['Adventure', 'Relaxation', 'Nature', 'Photography'],
      pace: 'Relaxed',
      idealDay: ['Sunrise surf session', 'Açai bowl breakfast', 'Cliffside sunset lounge'],
      avoidances: ['Heavy peak-hour highway traffic']
    },
    routeSummary: {
      distanceKm: 4200,
      flightDuration: '6h 30m',
      departureHub: 'International Airport',
      arrivalHub: 'Ngurah Rai (DPS)'
    },
    days: [
      {
        dayNumber: 1,
        date: '2026-10-22',
        theme: 'Canggu Surf & Beach Clubs',
        vibe: 'Tropical Ocean Vibes',
        weatherForecast: {
          temp: '30°C',
          condition: 'Sunny',
          icon: '☀️',
          rainChance: 0
        },
        activities: [
          {
            id: 'bali-act-1',
            time: '07:00 AM',
            title: 'Batu Bolong Beginner Wave Surf Session',
            category: 'Adventure',
            location: 'Pantai Batu Bolong, Canggu',
            coordinates: { lat: -8.658, lng: 115.13 },
            estimatedCost: 1800,
            travelTimeFromPrev: '10 min',
            duration: '2 hours',
            description: 'Catch gentle rolling waves with a local surf instructor on longboards.',
            imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
            recommendationReason: 'One of Southeast Asia’s most beginner-friendly breaks with warm water.'
          },
          {
            id: 'bali-act-2',
            time: '05:00 PM',
            title: 'Uluwatu Cliff Sunset & Kecak Fire Dance',
            category: 'Culture',
            location: 'Pecatu, South Kuta, Badung',
            coordinates: { lat: -8.829, lng: 115.084 },
            estimatedCost: 1200,
            travelTimeFromPrev: '45 min ride',
            duration: '2 hours',
            description: 'Perched 70 meters above crashing Indian Ocean waves as chanting performers recount the Ramayana epic.',
            imageUrl: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&auto=format&fit=crop&q=80',
            recommendationReason: 'Panoramic clifftop sunset spectacle with vibrant traditional polyrhythmic chant.'
          }
        ]
      }
    ],
    packingList: [
      { id: 'bp1', name: 'Reef-safe Sunscreen SPF 50', category: 'Health & Essentials', checked: true },
      { id: 'bp2', name: 'Waterproof Dry Bag (15L)', category: 'Electronics', checked: true }
    ],
    requirements: [],
    bookings: []
  }
];

export function isDemoTripId(tripId?: string | null): boolean {
  if (!tripId) return false;
  return tripId.startsWith('demo-') || DEMO_TRIPS.some((d) => d.id === tripId);
}

export function getDemoTripById(tripId?: string | null): Trip | null {
  if (!tripId) return null;
  return DEMO_TRIPS.find((d) => d.id === tripId) || null;
}
