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
 * Resolves coordinates dynamically from place objects or numerical inputs
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
  }

  return null;
}

/**
 * Geometric distance calculation between origin and destination.
 * Note: Real-world route logistics, feasible modes, and travel times are determined by AI via /api/ai/destination-advice.
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
  const destCoords =
    'latitude' in destination && typeof destination.latitude === 'number' && destination.latitude !== 0
      ? { lat: destination.latitude, lng: ('longitude' in destination && typeof destination.longitude === 'number' ? destination.longitude : 0) }
      : null;

  let distanceKm = 650;
  if (destCoords && resolvedOriginCoords) {
    distanceKm = calculateHaversineDistanceKm(resolvedOriginCoords, destCoords);
  }

  const isShortDist = distanceKm < 150;
  const isFarDistance = distanceKm > 1200;

  let minDurationDays = 3;
  let recommendedDurationDays = 5;
  let minDurationReason = `Requires at least 3 days to explore key attractions in ${destName} and account for travel transit.`;

  if (isShortDist) {
    minDurationDays = 2;
    recommendedDurationDays = 3;
    minDurationReason = `Short distance getaway (~${distanceKm} km) ideal for a 2 to 3-day itinerary.`;
  } else if (isFarDistance) {
    minDurationDays = 4;
    recommendedDurationDays = 6;
    minDurationReason = `Long-distance travel (~${distanceKm} km) requires sufficient time for transit and comprehensive sightseeing.`;
  }

  const availableTravelModes: TravelModeOption[] = [
    {
      id: 'Flight',
      label: 'Flight',
      icon: '✈️',
      desc: `Air transit from ${originCityName} to ${destName}`,
      tag: 'Fast Transit',
      isAvailable: true,
      recommendedFor: 'Primary Transit'
    }
  ];

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
    defaultRecommendedMode: 'Flight',
    transitSummary: {
      flightTime: `Direct or connecting flight`,
      routeNote: `${originCityName} to ${destName} (~${distanceKm} km)`
    }
  };
}
