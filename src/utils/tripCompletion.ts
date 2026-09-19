import { Trip } from '../types';

const COMPLETED_TRIPS_KEY = 'roamai_completed_trip_ids';

export function getCompletedTripIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMPLETED_TRIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isTripCompleted(trip: Trip): boolean {
  if (trip.isCompleted) return true;

  // Check localStorage IDs
  const completedIds = getCompletedTripIds();
  if (completedIds.includes(trip.id)) return true;

  // Check if all activities in all days are completed (if at least one activity exists)
  const allActs = trip.days?.flatMap((d) => d.activities || []) || [];
  if (allActs.length > 0 && allActs.every((a) => a.completed)) {
    return true;
  }

  return false;
}

export function setTripCompletedLocal(tripId: string, completed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getCompletedTripIds();
    let updated: string[];
    if (completed) {
      updated = current.includes(tripId) ? current : [...current, tripId];
    } else {
      updated = current.filter((id) => id !== tripId);
    }
    localStorage.setItem(COMPLETED_TRIPS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to update completed trips in localStorage', e);
  }
}
