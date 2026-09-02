export type TravelStyle =
  | 'Adventure'
  | 'Relaxation'
  | 'Nightlife'
  | 'Nature'
  | 'Culture'
  | 'Food'
  | 'Photography'
  | 'Shopping'
  | 'Luxury'
  | 'Backpacking'
  | 'Spiritual'
  | 'Hidden gems';

export type TravelPace = 'Relaxed' | 'Balanced' | 'Packed';

export type FoodPreference = 'Vegetarian' | 'Non-vegetarian' | 'Vegan' | 'No preference';

export type AlcoholPreference = 'Yes' | 'Occasionally' | 'No';

export type TravelCompanion = 'Solo' | 'Couple' | 'Friends' | 'Family' | 'Group';

export type TravelMode =
  | 'Flight'
  | 'Train'
  | 'Car / Road Trip'
  | 'Bus'
  | 'Bike / Motorcycle'
  | 'Self-Drive Rental'
  | 'Public Transit';

export type BudgetTier = 'Budget' | 'Moderate' | 'Premium' | 'Luxury';

export interface GroupMember {
  id: string;
  name: string;
  avatar?: string;
  styles: TravelStyle[];
  food: FoodPreference;
  notes?: string;
}

export interface UserPreferences {
  styles: TravelStyle[];
  pace: TravelPace;
  food: FoodPreference;
  alcohol: AlcoholPreference;
  travelMode?: TravelMode;
  startCity?: string;
  idealDay: string[];
  avoidances: string[];
  customNotes?: string;
  groupMembers?: GroupMember[];
}

export type ExpenseCategory =
  | 'Food'
  | 'Sightseeing'
  | 'Adventure'
  | 'Relaxation'
  | 'Culture'
  | 'Nightlife'
  | 'Shopping'
  | 'Transit'
  | 'Stay'
  | 'Other';

export interface ExpenseItem {
  id: string;
  dayNumber: number;
  title: string;
  amount: number;
  category: ExpenseCategory;
  time?: string;
  paidBy?: string;
  activityId?: string;
  notes?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  time: string; // e.g. "09:00 AM"
  endTime?: string;
  title: string;
  category: 'Food' | 'Sightseeing' | 'Adventure' | 'Relaxation' | 'Culture' | 'Nightlife' | 'Shopping' | 'Transit';
  location: string;
  coordinates?: { lat: number; lng: number };
  estimatedCost: number; // in INR/USD
  travelTimeFromPrev: string; // e.g. "15 min drive"
  duration: string; // e.g. "2 hours"
  description: string;
  imageUrl: string;
  recommendationReason: string;
  isIndoor?: boolean;
  isRainSafe?: boolean;
  isUpdated?: boolean;
  updatedReason?: string;
  bookingRequired?: boolean;
  bookingUrl?: string;
  tips?: string;
  bestTime?: string;
  rating?: number;
  completed?: boolean;
}

export interface DayItinerary {
  dayNumber: number;
  date: string;
  theme: string;
  vibe: string;
  weatherForecast: {
    temp: string;
    condition: 'Sunny' | 'Partly Cloudy' | 'Rainy' | 'Cloudy' | 'Pleasant' | 'Chilly';
    icon: string;
    rainChance: number;
  };
  activities: Activity[];
}

export interface PackingItem {
  id: string;
  name: string;
  category: 'Clothing' | 'Electronics' | 'Documents' | 'Toiletries' | 'Health & Essentials';
  checked: boolean;
  reason?: string;
}

export interface RequirementDocument {
  id: string;
  title: string;
  type: 'ID Proof' | 'Ticket' | 'Booking' | 'Government Permit' | 'Medical';
  status: 'Ready' | 'Action Required' | 'Optional';
  officialWebsite?: string;
  isPermit?: boolean;
  notes: string;
}

export interface BookingItem {
  id: string;
  title: string;
  type: 'Accommodation' | 'Flight / Train' | 'Cab / Rental' | 'Activity Entry' | 'Experience';
  status: 'Booked' | 'Pending' | 'Suggested';
  estimatedCost: number;
  provider?: string;
  bookingLink?: string;
  notes?: string;
}

export interface RouteSummary {
  distanceKm: number;
  flightDuration?: string;
  trainDuration?: string;
  driveDuration?: string;
  departureHub: string;
  arrivalHub: string;
  keyHighwayOrTrain?: string;
  notes?: string;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  destinationStateOrCountry: string;
  startCity?: string;
  routeSummary?: RouteSummary;
  heroImage: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  companionType: TravelCompanion;
  travellersCount: number;
  travelMode?: TravelMode;
  budgetTier: BudgetTier;
  targetBudget: number;
  currency: string;
  preferences: UserPreferences;
  days: DayItinerary[];
  packingList: PackingItem[];
  requirements: RequirementDocument[];
  bookings: BookingItem[];
  expenses?: ExpenseItem[];
  clothingAdvice: string;
  createdAt: string;
  lastModified?: string;
  adaptationHistory?: {
    timestamp: string;
    trigger: string;
    description: string;
  }[];
}

export interface DestinationPreset {
  id: string;
  name: string;
  tagline: string;
  region: string;
  country: string;
  heroImage: string;
  gallery: string[];
  climate: string;
  avgCostPerDay: number;
  bestMonths: string;
  popularFor: TravelStyle[];
  shortDescription: string;
  officialPermitNote?: string;
}

export type ThemeId = 'beach' | 'mountain' | 'waterfall' | 'trekking' | 'snow';

export interface SavedPlace {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category?: string;
  rating?: number;
  photoUrl?: string;
  savedAt: string;
  source?: 'places_autocomplete' | 'manual' | 'firestore';
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  types?: string[];
  rating?: number;
  photoUrl?: string;
  distanceKm?: number;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  vibe: string;
  tagline: string;
  icon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  canvasBg: string;
  canvasTint: string;
  cardBg: string;
  cardBorder: string;
  optionBg: string;
  optionHoverBg: string;
  optionSelectedBg: string;
  optionBorder: string;
  bgSubtle: string;
  borderSubtle: string;
  taglineColor?: string;
  heroGradient: string;
  heroBannerBg?: string;
  heroAtmosphereGlow?: string;
  vibeTextGradient?: string;
  heroBadgeBg?: string;
  heroBadgeBorder?: string;
  heroBadgeText?: string;
  badgeClass: string;
  activeRingClass: string;
  primaryBtnClass: string;
  secondaryBtnClass: string;
  textAccentClass: string;
  swatches: string[];
  isDark?: boolean;
  heroPhotoUrl?: string;
  heroPhotoPosition?: string;
  heroPhotoTag?: string;
  heroFloatingPhotos?: {
    url: string;
    title: string;
    location: string;
  }[];
  previewTrip?: {
    title: string;
    image: string;
    subtitle: string;
    budget: string;
    temp: string;
    day1Title: string;
    activity1: {
      time: string;
      title: string;
      category: string;
      cost: string;
    };
    activity2: {
      time: string;
      title: string;
      category: string;
      cost: string;
    };
  };
}

export interface RealTripCostBreakdown {
  transit: number;
  stays: number;
  food: number;
  activities: number;
  misc: number;
}

export interface RealTripTierData {
  tier: BudgetTier;
  totalCost: number;
  perPersonCost: number;
  perDayPerPerson: number;
  breakdown: RealTripCostBreakdown;
  stayDescription: string;
  foodDescription: string;
  transitDescription: string;
  realTravellerLog: string;
  spendingPersona: string;
}

export interface RealTripBudgetResult {
  destination: string;
  startCity: string;
  currency: string;
  travelMode: TravelMode;
  durationDays: number;
  travellersCount: number;
  tiers: Record<BudgetTier, RealTripTierData>;
  moneySavingTip: string;
  crowdsourcedSampleCount: number;
  peakSeasonNote: string;
  aiConfidence: string;
  isAiGenerated: boolean;
}
