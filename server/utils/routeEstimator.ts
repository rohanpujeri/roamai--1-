import { TravelMode } from '../../src/types';

export interface Coordinates {
  lat: number;
  lng: number;
}

export const KNOWN_CITY_COORDINATES: Record<string, Coordinates> = {
  // Indian Metros & Tier 1
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'new delhi': { lat: 28.6139, lng: 77.2090 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'chandigarh': { lat: 30.7333, lng: 76.7794 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'kochi': { lat: 9.9312, lng: 76.2673 },
  'cochin': { lat: 9.9312, lng: 76.2673 },
  'trivandrum': { lat: 8.5241, lng: 76.9366 },
  'thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
  'goa': { lat: 15.2993, lng: 74.1240 },
  'panaji': { lat: 15.4909, lng: 73.8278 },

  // Mountain & Himalayan Destinations
  'ladakh': { lat: 34.1526, lng: 77.5771 },
  'leh': { lat: 34.1526, lng: 77.5771 },
  'leh ladakh': { lat: 34.1526, lng: 77.5771 },
  'kargil': { lat: 34.5539, lng: 76.1349 },
  'srinagar': { lat: 34.0837, lng: 74.7973 },
  'jammu': { lat: 32.7266, lng: 74.8570 },
  'manali': { lat: 32.2432, lng: 77.1892 },
  'shimla': { lat: 31.1048, lng: 77.1734 },
  'dharamshala': { lat: 32.2190, lng: 76.3234 },
  'mcleodganj': { lat: 32.2426, lng: 76.3213 },
  'spiti': { lat: 32.2461, lng: 78.0349 },
  'kaza': { lat: 32.2276, lng: 78.0526 },
  'rishikesh': { lat: 30.0869, lng: 78.2676 },
  'haridwar': { lat: 29.9457, lng: 78.1642 },
  'dehradun': { lat: 30.3165, lng: 78.0322 },
  'mussoorie': { lat: 30.4598, lng: 78.0644 },
  'nainital': { lat: 29.3919, lng: 79.4542 },

  // South Indian Destinations
  'ooty': { lat: 11.4102, lng: 76.6950 },
  'munnar': { lat: 10.0889, lng: 77.0595 },
  'coorg': { lat: 12.3375, lng: 75.8069 },
  'madikeri': { lat: 12.4244, lng: 75.7382 },
  'mysore': { lat: 12.2958, lng: 76.6394 },
  'mysuru': { lat: 12.2958, lng: 76.6394 },
  'wayanad': { lat: 11.6854, lng: 76.1320 },
  'kodaikanal': { lat: 10.2381, lng: 77.4892 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'pondicherry': { lat: 11.9416, lng: 79.8083 },
  'puducherry': { lat: 11.9416, lng: 79.8083 },
  'hampi': { lat: 15.3350, lng: 76.4600 },
  'gokarna': { lat: 14.5479, lng: 74.3188 },

  // East & North East
  'guwahati': { lat: 26.1445, lng: 91.7362 },
  'shillong': { lat: 25.5788, lng: 91.8933 },
  'darjeeling': { lat: 27.0410, lng: 88.2663 },
  'gangtok': { lat: 27.3389, lng: 88.6065 },

  // West & Central
  'udaipur': { lat: 24.5854, lng: 73.7125 },
  'jodhpur': { lat: 26.2389, lng: 73.0243 },
  'jaisalmer': { lat: 26.9157, lng: 70.9083 },
  'varanasi': { lat: 25.3176, lng: 82.9739 },
  'agra': { lat: 27.1767, lng: 78.0081 },

  // International
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'bali': { lat: -8.4095, lng: 115.1889 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'kathmandu': { lat: 27.7172, lng: 85.3240 }
};

export function findCoordsByName(name: string): Coordinates | null {
  if (!name) return null;
  const clean = name.toLowerCase().trim();
  for (const [key, coords] of Object.entries(KNOWN_CITY_COORDINATES)) {
    if (clean === key || clean.includes(key) || key.includes(clean)) {
      return coords;
    }
  }
  return null;
}

export function calculateHaversineKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Estimates realistic highway/route distance in Kilometers
 */
export function estimateRouteDistanceKm(
  startCity: string,
  destName: string,
  startCoords?: Coordinates | null,
  destCoords?: Coordinates | null
): number {
  const c1 = startCoords || findCoordsByName(startCity);
  const c2 = destCoords || findCoordsByName(destName);

  if (c1 && c2) {
    const directKm = calculateHaversineKm(c1, c2);
    // Highway / road routes average ~1.28x - 1.35x direct straight-line distance due to terrain and roadways
    return Math.max(50, Math.round(directKm * 1.30));
  }

  // Fallback heuristic if unknown
  const isFar = destName.toLowerCase().includes('ladakh') || destName.toLowerCase().includes('leh') || destName.toLowerCase().includes('kashmir');
  return isFar ? 2800 : 650;
}

/**
 * Calculates physical one-way transit days needed based on distance and travel mode
 */
export function calculateTransitDaysOneWay(
  distanceKm: number,
  mode: TravelMode
): number {
  switch (mode) {
    case 'Flight':
      // Direct or connecting flight + airport transfer takes 1 calendar day
      return 1;

    case 'Bike / Motorcycle':
      // Realistic touring pace: ~500-550 km/day on highways, ~200-250 km/day in high altitude/mountain passes
      if (distanceKm <= 500) return 1;
      if (distanceKm <= 1000) return 2;
      if (distanceKm <= 1500) return 3;
      if (distanceKm <= 2100) return 4;
      if (distanceKm <= 2700) return 5;
      return Math.min(6, Math.ceil(distanceKm / 520)); // e.g. Bangalore to Ladakh (3,100 km) = 5 to 6 days

    case 'Car / Road Trip':
    case 'Self-Drive Rental':
      // Realistic road trip pace: ~700-750 km/day on expressways
      if (distanceKm <= 650) return 1;
      if (distanceKm <= 1300) return 2;
      if (distanceKm <= 2000) return 3;
      if (distanceKm <= 2800) return 4;
      return Math.min(5, Math.ceil(distanceKm / 700));

    case 'Train':
      // Express / Superfast train: ~1,100 km per 24 hours
      if (distanceKm <= 900) return 1;
      if (distanceKm <= 1800) return 2;
      return Math.min(4, Math.ceil(distanceKm / 1000));

    case 'Bus':
      if (distanceKm <= 550) return 1;
      if (distanceKm <= 1100) return 2;
      return Math.min(4, Math.ceil(distanceKm / 500));

    default:
      return 1;
  }
}

export interface TripAllocation {
  outboundDays: number;
  coreDestDays: number;
  returnDays: number;
  isOverlandMultiDay: boolean;
}

/**
 * Allocates days between Outbound Transit, Core Destination Stay, and Return Transit
 */
export function allocateTripDays(
  totalDurationDays: number,
  transitDaysOneWay: number
): TripAllocation {
  if (transitDaysOneWay <= 1) {
    const returnDays = 1;
    const outboundDays = 1;
    const coreDestDays = Math.max(1, totalDurationDays - (outboundDays + returnDays));
    return {
      outboundDays,
      coreDestDays,
      returnDays,
      isOverlandMultiDay: false
    };
  }

  // Multi-day overland journey
  // Ensure outbound + return fits within totalDurationDays, leaving at least 1-2 days for destination immersion
  let outboundDays = transitDaysOneWay;
  let returnDays = transitDaysOneWay;

  if (outboundDays + returnDays >= totalDurationDays) {
    // If total user days is constrained (e.g. 9 days for a 5-day one-way route):
    outboundDays = Math.max(1, Math.floor((totalDurationDays - 1) / 2));
    returnDays = Math.max(1, Math.floor((totalDurationDays - 1) / 2));
  }

  const coreDestDays = Math.max(1, totalDurationDays - (outboundDays + returnDays));

  return {
    outboundDays,
    coreDestDays,
    returnDays,
    isOverlandMultiDay: true
  };
}
