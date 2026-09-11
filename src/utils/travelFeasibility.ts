import { TravelMode, DestinationPreset } from '../types';
import { SelectedDestinationPlace } from '../components/Step1DestinationSearch';

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface TravelModeOption {
  id: TravelMode;
  label: string;
  icon: string;
  desc: string;
  tag: string;
  isAvailable: boolean;
  unavailableReason?: string;
  recommendedFor?: string;
}

export interface DestinationFeasibility {
  minDurationDays: number;
  recommendedDurationDays: number;
  minDurationReason: string;
  distanceKm: number;
  isIslandOrOverseas: boolean;
  isHighAltitudeOrCircuit: boolean;
  isShortDistance: boolean;
  isInternational: boolean;
  availableTravelModes: TravelModeOption[];
  defaultRecommendedMode: TravelMode;
  transitSummary: {
    flightTime?: string;
    trainTime?: string;
    driveTime?: string;
    routeNote: string;
  };
}

/**
 * Calculates Great Circle Distance between two coordinates in Kilometers (Haversine formula)
 */
export function calculateHaversineDistanceKm(
  coord1: LocationCoordinates,
  coord2: LocationCoordinates
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
    Math.cos((coord2.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
/**
 * Known coordinate dictionary for major departure and arrival hubs
 */
const CITY_COORDINATES_MAP: Record<string, LocationCoordinates> = {
  bangalore: { lat: 12.9716, lng: 77.5946 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  bombay: { lat: 19.0760, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  'new delhi': { lat: 28.6139, lng: 77.2090 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  pune: { lat: 18.5204, lng: 73.8567 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  goa: { lat: 15.2993, lng: 74.1240 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  bali: { lat: -8.4095, lng: 115.1889 },
  indonesia: { lat: -8.4095, lng: 115.1889 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  thailand: { lat: 13.7563, lng: 100.5018 },
  phuket: { lat: 7.8804, lng: 98.3923 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  paris: { lat: 48.8566, lng: 2.3522 },
  london: { lat: 51.5074, lng: -0.1278 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  'new york': { lat: 40.7128, lng: -74.0060 },
  maldives: { lat: 4.1755, lng: 73.5093 },
  sydney: { lat: -33.8688, lng: 151.2093 }
};

/**
 * Resolves coordinates dynamically from place objects, numerical inputs, or city names
 */
export function resolveCoordinates(
  cityNameOrPlace: string | SelectedDestinationPlace | null | undefined
): LocationCoordinates | null {
  if (!cityNameOrPlace) return null;

  if (typeof cityNameOrPlace === 'object') {
    if (
      typeof cityNameOrPlace.latitude === 'number' &&
      typeof cityNameOrPlace.longitude === 'number' &&
      !isNaN(cityNameOrPlace.latitude) &&
      !isNaN(cityNameOrPlace.longitude) &&
      cityNameOrPlace.latitude !== 0
    ) {
      return { lat: cityNameOrPlace.latitude, lng: cityNameOrPlace.longitude };
    }
    const name = cityNameOrPlace.name?.toLowerCase() || '';
    for (const [key, coords] of Object.entries(CITY_COORDINATES_MAP)) {
      if (name.includes(key)) return coords;
    }
  }

  if (typeof cityNameOrPlace === 'string') {
    const clean = cityNameOrPlace.toLowerCase().trim();
    for (const [key, coords] of Object.entries(CITY_COORDINATES_MAP)) {
      if (clean.includes(key)) return coords;
    }
  }

  return null;
}

/**
 * Pure dynamic evaluation of route feasibility based purely on geometry, distance, and origin/destination names.
 * All route intelligence and destination specifics are fetched dynamically by AI.
 */
export function evaluateTripFeasibility(params: {
  destination: SelectedDestinationPlace | DestinationPreset | { name: string; address?: string; latitude?: number; longitude?: number };
  originCityName?: string;
  originCoords?: LocationCoordinates | null;
}): DestinationFeasibility {
  const { destination, originCityName = 'Origin Location', originCoords } = params;

  const destName = destination.name || 'Destination';
  const destAddress =
    ('address' in destination && destination.address) ||
    ('region' in destination && `${destination.region}, ${destination.country}`) ||
    '';

  // 1. Calculate Coordinates and Distance
  const resolvedOriginCoords = originCoords || resolveCoordinates(originCityName);
  const destCoords = resolveCoordinates(
    'latitude' in destination && typeof destination.latitude === 'number' && destination.latitude !== 0
      ? {
        placeId: ('id' in destination && typeof destination.id === 'string' ? destination.id : 'dest'),
        name: destName,
        address: destAddress,
        latitude: destination.latitude,
        longitude: ('longitude' in destination && typeof destination.longitude === 'number' ? destination.longitude : 0)
      }
      : destName
  );

  let distanceKm = 650;
  if (destCoords && resolvedOriginCoords) {
    distanceKm = calculateHaversineDistanceKm(resolvedOriginCoords, destCoords);
  }

  const isIslandOrOverseas = distanceKm > 2000;

  const isShortDist = distanceKm < 150;
  const isFarDistance = distanceKm > 1200;

  // 2. Pure dynamic duration baseline (refined dynamically by AI Destination Advisor)
  let minDurationDays = 3;
  let recommendedDurationDays = 5;
  let minDurationReason = `Requires at least 3 days to explore key attractions in ${destName} and account for travel transit.`;

  if (isIslandOrOverseas) {
    minDurationDays = 5;
    recommendedDurationDays = 7;
    minDurationReason = `Island & overseas exploration in ${destName} requires adequate flight transit and regional discovery time.`;
  } else if (isShortDist) {
    minDurationDays = 2;
    recommendedDurationDays = 3;
    minDurationReason = `Short distance getaway (~${distanceKm} km) ideal for a 2 to 3-day itinerary.`;
  } else if (isFarDistance) {
    minDurationDays = 4;
    recommendedDurationDays = 6;
    minDurationReason = `Long-distance travel (~${distanceKm} km) requires sufficient time for transit and comprehensive sightseeing.`;
  }

  // 3. Dynamic candidate travel modes from Origin to Destination
  const allCandidateModes: TravelModeOption[] = [
    {
      id: 'Flight',
      label: 'Flight',
      icon: '✈️',
      desc: `Direct or connecting air transit from ${originCityName} to ${destName}`,
      tag: 'Fast & Direct',
      isAvailable: true,
      recommendedFor: 'Primary Transit'
    }
  ];

  // Only add ground transport if not an isolated island or overseas destination
  if (!isIslandOrOverseas) {
    allCandidateModes.push(
      {
        id: 'Train',
        label: 'Train / Railway',
        icon: '🚆',
        desc: `Rail transit connecting ${originCityName} towards ${destName}`,
        tag: 'Scenic Rail',
        isAvailable: distanceKm <= 2000,
        recommendedFor: distanceKm >= 150 && distanceKm <= 1200 ? 'Scenic & Affordable' : undefined
      },
      {
        id: 'Car / Road Trip',
        label: 'Car / Road Trip',
        icon: '🚗',
        desc: `Highway road trip from ${originCityName} to ${destName} (~${distanceKm} km)`,
        tag: 'High Flexibility',
        isAvailable: distanceKm <= 1000,
        recommendedFor: distanceKm <= 600 ? 'Flexible Road Trip' : undefined
      },
      {
        id: 'Bus',
        label: 'Bus / Sleeper Coach',
        icon: '🚌',
        desc: `Intercity bus or sleeper coach route from ${originCityName} to ${destName}`,
        tag: 'Budget Friendly',
        isAvailable: distanceKm <= 800,
        recommendedFor: distanceKm <= 400 ? 'Direct Budget Route' : undefined
      },
      {
        id: 'Bike / Motorcycle',
        label: 'Bike / Motorcycle',
        icon: '🏍️',
        desc: `Motorcycle riding route from ${originCityName} to ${destName}`,
        tag: 'Adventure Ride',
        isAvailable: distanceKm <= 600,
        recommendedFor: distanceKm <= 350 ? 'Riding Expedition' : undefined
      }
    );
  }

  const availableTravelModes = allCandidateModes.filter((m) => m.isAvailable);

  let defaultRecommendedMode: TravelMode = 'Flight';
  if (!isIslandOrOverseas && isShortDist) {
    defaultRecommendedMode = 'Car / Road Trip';
  } else {
    defaultRecommendedMode = 'Flight';
  }

  // Estimated Transit Durations
  const flightHours = Math.max(1, Math.round(distanceKm / 550));
  const trainHours = Math.max(2, Math.round(distanceKm / 75));
  const driveHours = Math.max(2, Math.round(distanceKm / 65));

  return {
    minDurationDays,
    recommendedDurationDays,
    minDurationReason,
    distanceKm,
    isIslandOrOverseas: false,
    isHighAltitudeOrCircuit: false,
    isShortDistance: isShortDist,
    isInternational: false,
    availableTravelModes,
    defaultRecommendedMode,
    transitSummary: {
      flightTime: `~${flightHours}h flight`,
      trainTime: `~${trainHours}h rail`,
      driveTime: `~${driveHours}h road drive`,
      routeNote: `${originCityName} to ${destName} (~${distanceKm} km)`
    }
  };
}
