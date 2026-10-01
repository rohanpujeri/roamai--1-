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
    travelMode: 'Train',
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
      travelMode: 'Train',
      startCity: 'Tokyo',
      idealDay: ['Morning shrine walk', 'Authentic matcha tea ceremony', 'Traditional kaiseki dinner'],
      avoidances: ['Overcrowded tourist traps at midday']
    },
    routeSummary: {
      distanceKm: 450,
      trainDuration: '2h 15m (Shinkansen)',
      departureHub: 'Tokyo Station',
      arrivalHub: 'Kyoto Station'
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
  },
  {
    id: 'demo-swiss-alps',
    title: 'Alpine Peaks & Panoramic Trains',
    destination: 'Swiss Alps',
    destinationStateOrCountry: 'Switzerland',
    startDate: '2026-11-02',
    endDate: '2026-11-08',
    durationDays: 7,
    companionType: 'Family',
    travellersCount: 4,
    travelMode: 'Train',
    budgetTier: 'Premium',
    targetBudget: 95000,
    currency: '₹',
    heroImage: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=1200&auto=format&fit=crop&q=80',
    clothingAdvice: 'Thermal fleece, windproof shell jacket, insulated gloves, and polarized sunglasses.',
    createdAt: '2026-10-01T00:00:00.000Z',
    preferences: {
      styles: ['Nature', 'Sightseeing', 'Photography', 'Relaxation'],
      pace: 'Relaxed',
      idealDay: ['Glacier Express panorama ride', 'Fondue lunch in Zermatt', 'Matterhorn reflection lake walk'],
      avoidances: ['Rushing between connections']
    },
    routeSummary: {
      distanceKm: 280,
      trainDuration: '3h 10m',
      departureHub: 'Zurich HB',
      arrivalHub: 'Interlaken Ost'
    },
    days: [
      {
        dayNumber: 1,
        date: '2026-11-02',
        theme: 'Interlaken & Lauterbrunnen Waterfalls',
        vibe: 'Majestic Glacial Valleys',
        weatherForecast: {
          temp: '16°C',
          condition: 'Pleasant',
          icon: '🏔️',
          rainChance: 15
        },
        activities: [
          {
            id: 'swiss-act-1',
            time: '09:00 AM',
            title: 'Lauterbrunnen 72 Waterfalls Valley Stroll',
            category: 'Nature',
            location: 'Lauterbrunnen Valley, Bernese Oberland',
            coordinates: { lat: 46.593, lng: 7.907 },
            estimatedCost: 0,
            travelTimeFromPrev: '20 min train',
            duration: '2.5 hours',
            description: 'Walk past vertical limestone cliffs with Staubbach Falls tumbling 300 meters into the alpine meadows.',
            imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
            recommendationReason: 'The real-world valley that inspired J.R.R. Tolkien’s mythical Rivendell.'
          }
        ]
      }
    ],
    packingList: [],
    requirements: [],
    bookings: []
  },
  {
    id: 'demo-iceland',
    title: 'Cascading Falls & Volcanic Trails',
    destination: 'Iceland',
    destinationStateOrCountry: 'Iceland',
    startDate: '2026-11-12',
    endDate: '2026-11-17',
    durationDays: 5,
    companionType: 'Couple',
    travellersCount: 2,
    travelMode: 'Car / Road Trip',
    budgetTier: 'Premium',
    targetBudget: 82000,
    currency: '₹',
    heroImage: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1200&auto=format&fit=crop&q=80',
    clothingAdvice: 'Waterproof rain trousers, heavy down parka, crampons for glacier hikes, and wool socks.',
    createdAt: '2026-10-01T00:00:00.000Z',
    preferences: {
      styles: ['Adventure', 'Nature', 'Photography'],
      pace: 'Balanced',
      idealDay: ['Geothermal lagoon soak', 'Waterfall spray trek', 'Northern lights aurora hunt'],
      avoidances: ['Driving in severe blizzard warnings']
    },
    days: [
      {
        dayNumber: 1,
        date: '2026-11-12',
        theme: 'Golden Circle & Geysir Eruptions',
        vibe: 'Geothermal Wonders',
        weatherForecast: {
          temp: '12°C',
          condition: 'Chilly',
          icon: '🌊',
          rainChance: 25
        },
        activities: [
          {
            id: 'ice-act-1',
            time: '10:00 AM',
            title: 'Strokkur Geysir Eruption Viewing',
            category: 'Nature',
            location: 'Haukadalur Valley, Golden Circle',
            coordinates: { lat: 64.31, lng: -20.3 },
            estimatedCost: 0,
            travelTimeFromPrev: '1h 15m drive',
            duration: '1.5 hours',
            description: 'Watch boiling geothermal water erupt up to 30 meters skyward every 6-10 minutes.',
            imageUrl: 'https://images.unsplash.com/photo-1529963183134-61a90db47eaf?w=800&auto=format&fit=crop&q=80',
            recommendationReason: 'Raw geothermal energy pulsing right from the earth’s crust.'
          }
        ]
      }
    ],
    packingList: [],
    requirements: [],
    bookings: []
  },
  {
    id: 'demo-hokkaido',
    title: 'Powder Slopes & Hot Springs',
    destination: 'Hokkaido',
    destinationStateOrCountry: 'Japan',
    startDate: '2026-12-05',
    endDate: '2026-12-11',
    durationDays: 6,
    companionType: 'Friends',
    travellersCount: 4,
    travelMode: 'Train',
    budgetTier: 'Moderate',
    targetBudget: 68000,
    currency: '₹',
    heroImage: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&auto=format&fit=crop&q=80',
    clothingAdvice: 'Snowproof outerwear, thermal base layers, snow boots, and neck gaiter.',
    createdAt: '2026-10-01T00:00:00.000Z',
    preferences: {
      styles: ['Adventure', 'Food', 'Nature', 'Relaxation'],
      pace: 'Balanced',
      idealDay: ['Niseko powder ski runs', 'Steaming outdoor onsen', 'Sapporo miso ramen dinner'],
      avoidances: ['Icy driving without winter 4WD']
    },
    days: [
      {
        dayNumber: 1,
        date: '2026-12-05',
        theme: 'Sapporo Winter Food & Onsen',
        vibe: 'Crisp Snow & Steaming Comfort',
        weatherForecast: {
          temp: '-2°C',
          condition: 'Chilly',
          icon: '❄️',
          rainChance: 60
        },
        activities: [
          {
            id: 'hok-act-1',
            time: '11:30 AM',
            title: 'Ramen Alley (Ganso Ramen Yokocho)',
            category: 'Food',
            location: 'Susukino, Chuo Ward, Sapporo',
            coordinates: { lat: 43.054, lng: 141.353 },
            estimatedCost: 1100,
            travelTimeFromPrev: '15 min',
            duration: '1 hour',
            description: 'Savor piping hot Sapporo butter-corn miso ramen with tender chashu pork in a historic alley.',
            imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
            recommendationReason: 'The birthplace of miso ramen and the ultimate winter soul food.'
          }
        ]
      }
    ],
    packingList: [],
    requirements: [],
    bookings: []
  },
  {
    id: 'demo-patagonia',
    title: 'Glacial Fjords & Wild Ridges',
    destination: 'Patagonia',
    destinationStateOrCountry: 'Chile & Argentina',
    startDate: '2026-12-15',
    endDate: '2026-12-23',
    durationDays: 8,
    companionType: 'Solo',
    travellersCount: 1,
    travelMode: 'Car / Road Trip',
    budgetTier: 'Luxury',
    targetBudget: 115000,
    currency: '₹',
    heroImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80',
    clothingAdvice: 'Trekking poles, moisture-wicking wool, alpine tent gear, and 4-season windbreaker.',
    createdAt: '2026-10-01T00:00:00.000Z',
    preferences: {
      styles: ['Adventure', 'Nature', 'Photography', 'Backpacking'],
      pace: 'Packed',
      idealDay: ['Mirador Las Torres sunrise hike', 'Glacier Grey ice trekking', 'Campfire stargazing'],
      avoidances: ['Unmarked backcountry routes']
    },
    days: [
      {
        dayNumber: 1,
        date: '2026-12-15',
        theme: 'Torres del Paine Granite Horns',
        vibe: 'Pristine Wilderness Frontier',
        weatherForecast: {
          temp: '14°C',
          condition: 'Pleasant',
          icon: '🏕️',
          rainChance: 20
        },
        activities: [
          {
            id: 'pat-act-1',
            time: '08:00 AM',
            title: 'Base of the Towers (Mirador Las Torres) Hike',
            category: 'Adventure',
            location: 'Torres del Paine National Park, Magallanes',
            coordinates: { lat: -50.942, lng: -72.986 },
            estimatedCost: 3500,
            travelTimeFromPrev: '30 min bus',
            duration: '4.5 hours',
            description: 'Trek through beech forests and moraine boulder fields to the glacial turquoise tarn below three sheer granite spires.',
            imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
            recommendationReason: 'One of the most awe-inspiring mountain vistas on planet Earth.'
          }
        ]
      }
    ],
    packingList: [],
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
