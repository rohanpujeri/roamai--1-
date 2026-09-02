import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Wallet,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Search,
  Check,
  Plus,
  Trash2,
  Sliders,
  Compass,
  AlertTriangle,
  Smile,
  ShieldAlert,
  Clock,
  Heart,
  Navigation,
  PlaneTakeoff,
  Locate,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MapPinned,
  RefreshCw,
  TrendingUp,
  Lightbulb,
  Coins,
  Bot,
  BedDouble,
  UtensilsCrossed,
  Ticket
} from 'lucide-react';
import {
  TravelStyle,
  TravelPace,
  FoodPreference,
  AlcoholPreference,
  TravelCompanion,
  TravelMode,
  BudgetTier,
  UserPreferences,
  GroupMember,
  DestinationPreset,
  RealTripBudgetResult
} from '../types';
import { Step1DestinationSearch, SelectedDestinationPlace } from './Step1DestinationSearch';
import { fetchAiRealTripBudget } from '../services/aiBudgetEstimator';
import { evaluateTripFeasibility, DestinationFeasibility } from '../utils/travelFeasibility';
import { fetchAiDestinationTravelIntelligence, DestinationTravelIntelligence } from '../services/aiDestinationAdvisor';

interface CreateTripWizardProps {
  initialDestinationId?: string;
  onGenerateTrip: (tripParams: {
    destinationId: string;
    destinationPlace?: SelectedDestinationPlace;
    startCity: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    companionType: TravelCompanion;
    travellersCount: number;
    travelMode: TravelMode;
    budgetTier: BudgetTier;
    targetBudget: number;
    preferences: UserPreferences;
  }) => void;
  onCancel: () => void;
}

export const TRAVEL_MODES: {
  id: TravelMode;
  label: string;
  icon: string;
  desc: string;
  tag: string;
}[] = [
    { id: 'Flight', label: 'Flight', icon: '✈️', desc: 'Fastest air transit & airport transfers', tag: 'Fast & Direct' },
    { id: 'Train', label: 'Train / Railway', icon: '🚆', desc: 'Scenic rail routes & sleeper/express berths', tag: 'Scenic Comfort' },
    { id: 'Car / Road Trip', label: 'Car / Road Trip', icon: '🚗', desc: 'Highway drive with pitstops & total freedom', tag: 'High Flexibility' },
    { id: 'Bus', label: 'Bus / Sleeper Coach', icon: '🚌', desc: 'Overnight Volvo AC & sleeper intercity', tag: 'Budget Friendly' },
    { id: 'Bike / Motorcycle', label: 'Bike / Motorcycle', icon: '🏍️', desc: 'Thrilling open-road highway & mountain passes', tag: 'Adventure Ride' },
    { id: 'Self-Drive Rental', label: 'Self-Drive / Rental', icon: '🚙', desc: 'Rental car or hired SUV at destination', tag: 'Local Freedom' }
  ];

const TRAVEL_STYLES: { id: TravelStyle; label: string; icon: string; desc: string }[] = [
  { id: 'Adventure', label: 'Adventure', icon: '🧗', desc: 'Trekking, watersports & adrenaline' },
  { id: 'Relaxation', label: 'Relaxation', icon: '🌴', desc: 'Beaches, spa & unrushed vibe' },
  { id: 'Nightlife', label: 'Nightlife', icon: '🍸', desc: 'Clubs, sunset bars & music' },
  { id: 'Nature', label: 'Nature', icon: '🌿', desc: 'Rainforests, wildlife & greenery' },
  { id: 'Culture', label: 'Culture', icon: '🏛️', desc: 'Heritage forts, art & history' },
  { id: 'Food', label: 'Food', icon: '🥘', desc: 'Local delicacies, cafes & street food' },
  { id: 'Photography', label: 'Photography', icon: '📸', desc: 'Scenic vistas & Instagram aesthetics' },
  { id: 'Shopping', label: 'Shopping', icon: '🛍️', desc: 'Flea markets & boutique souvenirs' },
  { id: 'Luxury', label: 'Luxury', icon: '✨', desc: 'Fine dining & private yachts' },
  { id: 'Backpacking', label: 'Backpacking', icon: '🎒', desc: 'Offbeat trails & budget gems' },
  { id: 'Spiritual', label: 'Spiritual', icon: '🛕', desc: 'Temples, yoga & inner peace' },
  { id: 'Hidden gems', label: 'Hidden gems', icon: '🗺️', desc: 'Secret coves & uncrowded spots' }
];

const IDEAL_DAYS = [
  'Wake up early and explore',
  'Slow morning + sightseeing',
  'Adventure all day',
  'Food + cafes',
  'Beach + nightlife',
  'Photography + hidden places'
];

const AVOIDANCES = [
  'Crowded places',
  'Long travel',
  'Expensive restaurants',
  'Night travel',
  'Adventure activities',
  'Alcohol-focused places'
];

const getTodayFormattedDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCalculatedEndDate = (startString: string, days: number) => {
  const parts = startString.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const start = new Date(parts[0], parts[1] - 1, parts[2]);
    const end = new Date(start);
    end.setDate(start.getDate() + Math.max(1, days) - 1);
    const year = end.getFullYear();
    const month = String(end.getMonth() + 1).padStart(2, '0');
    const day = String(end.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return startString;
};

const getCalculatedDaysBetween = (startString: string, endString: string) => {
  const startParts = startString.split('-').map(Number);
  const endParts = endString.split('-').map(Number);
  if (
    startParts.length === 3 && !isNaN(startParts[0]) && !isNaN(startParts[1]) && !isNaN(startParts[2]) &&
    endParts.length === 3 && !isNaN(endParts[0]) && !isNaN(endParts[1]) && !isNaN(endParts[2])
  ) {
    const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  }
  return 4;
};

// Helper to estimate transit cost based on travel mode, budget tier, duration, travellers, and distance
export const getTravelModeTransitCost = (
  mode: TravelMode,
  tier: BudgetTier,
  duration: number,
  travellers: number,
  distanceKm: number = 600
) => {
  // Distance scaling factor (base is ~600km)
  const distFactor = Math.max(0.6, Math.min(2.5, distanceKm / 600));

  switch (mode) {
    case 'Flight': {
      // Per person roundtrip flights + airport cabs
      const baseFlight =
        tier === 'Budget' ? 4500 : tier === 'Moderate' ? 6500 : tier === 'Premium' ? 10500 : 18000;
      const flightPerPerson = Math.round(baseFlight * (0.7 + 0.3 * distFactor));
      const airportTransfer = tier === 'Budget' ? 600 : 1200;
      return flightPerPerson * travellers + airportTransfer;
    }
    case 'Train': {
      // Per person roundtrip rail fares + station local transit
      const baseTrain =
        tier === 'Budget' ? 700 : tier === 'Moderate' ? 1600 : tier === 'Premium' ? 2800 : 4500;
      const trainPerPerson = Math.round(baseTrain * (0.6 + 0.4 * distFactor));
      const stationCab = tier === 'Budget' ? 300 : 600;
      return trainPerPerson * travellers + stationCab;
    }
    case 'Car / Road Trip': {
      // Highway fuel + FASTag tolls per car (1 car per 4-5 people)
      const carsCount = Math.max(1, Math.ceil(travellers / 4));
      const roundTripDist = distanceKm * 2;
      const fuelPerCar = Math.round(roundTripDist * 8.5);
      const tollsPerCar = Math.round((roundTripDist / 100) * 120);
      const tierComfortBonus = tier === 'Budget' ? 0 : tier === 'Moderate' ? 1000 : tier === 'Premium' ? 2500 : 4500;
      return carsCount * (fuelPerCar + tollsPerCar + tierComfortBonus);
    }
    case 'Bus': {
      // Per person roundtrip intercity Volvo/sleeper bus
      const baseBus =
        tier === 'Budget' ? 800 : tier === 'Moderate' ? 1300 : tier === 'Premium' ? 2000 : 2800;
      const busPerPerson = Math.round(baseBus * (0.6 + 0.4 * distFactor));
      return busPerPerson * travellers;
    }
    case 'Bike / Motorcycle': {
      // 1 bike per 2 riders, rental + fuel per day
      const bikesCount = Math.max(1, Math.ceil(travellers / 2));
      const bikePerDay =
        tier === 'Budget' ? 900 : tier === 'Moderate' ? 1400 : tier === 'Premium' ? 2200 : 3500;
      const roundTripDist = distanceKm * 2;
      const totalFuel = Math.round((roundTripDist / 35) * 105);
      return bikesCount * (bikePerDay * duration + totalFuel);
    }
    case 'Self-Drive Rental': {
      // Rental car at destination (1 car per 4 people) per day + fuel
      const carsCount = Math.max(1, Math.ceil(travellers / 4));
      const rentalPerDay =
        tier === 'Budget' ? 1600 : tier === 'Moderate' ? 2500 : tier === 'Premium' ? 4200 : 6800;
      const dailyFuel = 600;
      return carsCount * (rentalPerDay + dailyFuel) * duration;
    }
    default:
      return 2500 * travellers;
  }
};

// Calculate realistic tiered budget based on destination avg cost, duration, travellers, mode of travel, AND route distance
export const calculateTierBudget = (
  tier: BudgetTier,
  destination: DestinationPreset,
  duration: number,
  travellers: number,
  travelMode: TravelMode = 'Flight',
  distanceKm: number = 600
) => {
  const baseCost = destination?.avgCostPerDay || 7000;
  // Multiplier considering room sharing for 2+ people
  const groupFactor = travellers <= 1 ? 1 : 1 + (travellers - 1) * 0.70;

  let groundDailyPerPerson = 0;
  if (tier === 'Budget') {
    groundDailyPerPerson = Math.max(1200, Math.round(baseCost * 0.32));
  } else if (tier === 'Moderate') {
    groundDailyPerPerson = Math.round(baseCost * 0.70);
  } else if (tier === 'Premium') {
    groundDailyPerPerson = Math.round(baseCost * 1.35);
  } else {
    // Luxury
    groundDailyPerPerson = Math.round(baseCost * 2.30);
  }

  const groundTotal = groundDailyPerPerson * duration * groupFactor;
  const transitTotal = getTravelModeTransitCost(travelMode, tier, duration, travellers, distanceKm);
  const totalMin = groundTotal + transitTotal;

  return Math.max(2500, Math.round(totalMin / 500) * 500);
};

export const CreateTripWizard: React.FC<CreateTripWizardProps> = ({
  initialDestinationId = '',
  onGenerateTrip,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 6;

  // Step 1: Destination (Google Places Interactive Map)
  const [selectedDestinationPlace, setSelectedDestinationPlace] = useState<SelectedDestinationPlace | null>(null);
  const [selectedDestId, setSelectedDestId] = useState<string>(initialDestinationId);

  // Step 2: Starting Point / Departure Location & Geolocation
  const [startCity, setStartCity] = useState<string>('');
  const [customStartCity, setCustomStartCity] = useState<string>('');
  const [isCustomCityInput, setIsCustomCityInput] = useState<boolean>(false);
  const [originSearch, setOriginSearch] = useState<string>('');
  const [originSelectionMode, setOriginSelectionMode] = useState<'ask_location' | 'manual' | 'detected'>('ask_location');
  const [locatingStatus, setLocatingStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
  const [locationErrorMsg, setLocationErrorMsg] = useState<string>('');
  const [detectedLocationData, setDetectedLocationData] = useState<{
    cityName: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
  } | null>(null);

  // Step 3: Dates, Duration & Mode of Travel
  const [durationDays, setDurationDays] = useState<number>(4);
  const [startDate, setStartDate] = useState<string>(() => getTodayFormattedDate());
  const [endDate, setEndDate] = useState<string>(() => getCalculatedEndDate(getTodayFormattedDate(), 4));
  const [travelMode, setTravelMode] = useState<TravelMode>('Flight');

  // Step 4: Travellers
  const [companionType, setCompanionType] = useState<TravelCompanion>('Friends');
  const [travellersCount, setTravellersCount] = useState<number>(3);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([
    { id: 'm1', name: 'Traveller 1', styles: ['Adventure', 'Culture'], food: 'No preference' },
    { id: 'm2', name: 'Traveller 2', styles: ['Food', 'Nature'], food: 'No preference' },
    { id: 'm3', name: 'Traveller 3', styles: ['Relaxation', 'Hidden gems'], food: 'No preference' }
  ]);

  // Step 5: Budget
  const [budgetTier, setBudgetTier] = useState<BudgetTier>('Moderate');
  const [customBudget, setCustomBudget] = useState<number>(30000);
  const [aiBudgetResult, setAiBudgetResult] = useState<RealTripBudgetResult | null>(null);
  const [isFetchingAiBudget, setIsFetchingAiBudget] = useState<boolean>(false);

  // AI Destination & Route Logistics Intelligence
  const [aiDestinationInfo, setAiDestinationInfo] = useState<DestinationTravelIntelligence | null>(null);
  const [isLoadingAiInfo, setIsLoadingAiInfo] = useState<boolean>(false);

  // Step 6: Preferences (default nothing selected)
  const [selectedStyles, setSelectedStyles] = useState<TravelStyle[]>([]);
  const [travelPace, setTravelPace] = useState<TravelPace | null>(null);
  const [foodPreference, setFoodPreference] = useState<FoodPreference | null>(null);
  const [alcoholPreference, setAlcoholPreference] = useState<AlcoholPreference | null>(null);
  const [selectedIdealDays, setSelectedIdealDays] = useState<string[]>([]);
  const [selectedAvoidances, setSelectedAvoidances] = useState<string[]>([]);

  // Dynamically resolved destination preset for downstream logistics & AI calculation
  const selectedDestination: DestinationPreset = useMemo(() => {
    if (selectedDestinationPlace) {
      return {
        id: selectedDestinationPlace.placeId,
        name: selectedDestinationPlace.name,
        tagline: `Journey to ${selectedDestinationPlace.name}`,
        region: selectedDestinationPlace.address.split(',')[0] || selectedDestinationPlace.name,
        country: selectedDestinationPlace.address.includes('India') ? 'India' : 'International',
        heroImage:
          selectedDestinationPlace.photoUrl ||
          'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80',
        gallery: [],
        climate: 'Pleasant & Moderate',
        avgCostPerDay: 7000,
        bestMonths: 'Year-round',
        popularFor: ['Culture', 'Food', 'Nature', 'Sightseeing'] as TravelStyle[],
        shortDescription: selectedDestinationPlace.address
      };
    }
    return {
      id: 'custom-destination',
      name: 'Selected Destination',
      tagline: 'Your Personalized Journey',
      region: 'Explore',
      country: 'Global',
      heroImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80',
      gallery: [],
      climate: 'Pleasant',
      avgCostPerDay: 7000,
      bestMonths: 'Year-round',
      popularFor: ['Culture', 'Food', 'Nature', 'Sightseeing'],
      shortDescription: 'Search any destination with Google Maps'
    };
  }, [selectedDestinationPlace]);

  // Effective Start City
  const effectiveStartCity = isCustomCityInput && customStartCity.trim() ? customStartCity.trim() : (startCity || 'Origin City');

  // Travel Feasibility Calculation for Selected Destination & Origin
  const destinationFeasibility: DestinationFeasibility = useMemo(() => {
    return evaluateTripFeasibility({
      destination: selectedDestinationPlace || selectedDestination,
      originCityName: effectiveStartCity,
      originCoords:
        detectedLocationData?.lat && detectedLocationData?.lng
          ? { lat: detectedLocationData.lat, lng: detectedLocationData.lng }
          : null
    });
  }, [selectedDestinationPlace, selectedDestination, effectiveStartCity, detectedLocationData]);

  // Automatically fetch AI travel mode and minimum required days for the selected destination
  useEffect(() => {
    const destName =
      selectedDestinationPlace?.name ||
      (selectedDestId && selectedDestId !== 'custom-destination' ? selectedDestId : '') ||
      (selectedDestination.name !== 'Selected Destination' ? selectedDestination.name : '');

    if (!destName) return;

    let isMounted = true;
    setIsLoadingAiInfo(true);

    fetchAiDestinationTravelIntelligence(destName, effectiveStartCity)
      .then((info) => {
        if (!isMounted) return;
        setAiDestinationInfo(info);
        if (info.minimumRequiredDays && info.minimumRequiredDays > 0) {
          setDurationDays(info.minimumRequiredDays);
          setEndDate(getCalculatedEndDate(startDate, info.minimumRequiredDays));
        }
        if (info.recommendedTravelMode) {
          setTravelMode(info.recommendedTravelMode);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch AI destination intelligence:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingAiInfo(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDestinationPlace, selectedDestId, selectedDestination.name, effectiveStartCity]);

  // Keep durationDays aligned with the minimum required trip duration for the chosen destination
  useEffect(() => {
    const minRequired = aiDestinationInfo?.minimumRequiredDays || destinationFeasibility.minDurationDays;
    if (durationDays < minRequired) {
      setDurationDays(minRequired);
      setEndDate(getCalculatedEndDate(startDate, minRequired));
    }
  }, [destinationFeasibility.minDurationDays, aiDestinationInfo?.minimumRequiredDays, startDate]);

  // Keep travelMode aligned with physically possible travel modes for this destination & route
  useEffect(() => {
    if (aiDestinationInfo?.recommendedTravelMode) {
      setTravelMode(aiDestinationInfo.recommendedTravelMode);
    } else {
      const isCurrentModeAvailable = destinationFeasibility.availableTravelModes.some(
        (m) => m.id === travelMode
      );
      if (!isCurrentModeAvailable) {
        setTravelMode(destinationFeasibility.defaultRecommendedMode);
      }
    }
  }, [aiDestinationInfo?.recommendedTravelMode, destinationFeasibility.availableTravelModes, destinationFeasibility.defaultRecommendedMode]);

  // Dynamic travel modes list fetched by AI for the specific origin -> destination route
  const travelModesToDisplay = useMemo(() => {
    if (aiDestinationInfo?.modesBreakdown && aiDestinationInfo.modesBreakdown.length > 0) {
      return aiDestinationInfo.modesBreakdown
        .filter((item) => !item.label.toLowerCase().includes('fly +') && !item.label.toLowerCase().includes('fly+'))
        .map((item) => ({
          id: item.mode,
          label: item.label,
          icon: item.icon,
          desc: item.desc || `${item.mode} transit from ${effectiveStartCity} to ${selectedDestination.name}`,
          tag: item.tag || (item.isRecommended ? 'AI Pick' : 'Available'),
          isRecommended: item.isRecommended,
          suitabilityScore: item.suitabilityScore,
          durationEstimate: item.durationEstimate,
          estimatedCostRange: item.estimatedCostRange,
          hasSwitchOrTransfer: item.hasSwitchOrTransfer,
          transferGuide: item.transferGuide,
          pros: item.pros,
          cons: item.cons
        }));
    }
    return destinationFeasibility.availableTravelModes.map((m) => ({
      id: m.id,
      label: m.label,
      icon: m.icon,
      desc: m.desc,
      tag: m.tag,
      isRecommended: m.id === travelMode,
      suitabilityScore: 85,
      durationEstimate: 'Direct transit',
      estimatedCostRange: '',
      hasSwitchOrTransfer: false,
      transferGuide: undefined,
      pros: '',
      cons: ''
    }));
  }, [aiDestinationInfo?.modesBreakdown, destinationFeasibility.availableTravelModes, effectiveStartCity, selectedDestination.name, travelMode]);

  // Route Details Calculation
  const currentRouteDetails = useMemo(() => ({
    distanceKm: aiDestinationInfo?.distanceKm || destinationFeasibility.distanceKm,
    routeTitle: `${effectiveStartCity} to ${selectedDestination.name}`,
    keyHighwayOrTrain: destinationFeasibility.transitSummary.routeNote,
    recommendedMode: travelMode,
    flightDuration: destinationFeasibility.transitSummary.flightTime || '2h',
    trainDuration: destinationFeasibility.transitSummary.trainTime || '8h',
    driveDuration: destinationFeasibility.transitSummary.driveTime || '10h'
  }), [effectiveStartCity, selectedDestination.name, travelMode, destinationFeasibility, aiDestinationInfo?.distanceKm]);

  // Tracks if user has manually moved the slider or overridden the AI tier default
  const isCustomBudgetManuallyEditedRef = useRef<boolean>(false);

  // AI Real-Trip Budget Fetcher based on crowdsourced traveler logs
  const loadAiBudget = useCallback(
    async (forced: boolean = false) => {
      const destName = selectedDestinationPlace?.name || selectedDestination.name;
      if (!destName || destName === 'Selected Destination' || destName === 'Custom Destination') return;

      setIsFetchingAiBudget(true);
      try {
        const result = await fetchAiRealTripBudget({
          destination: destName,
          startCity: effectiveStartCity,
          durationDays,
          travellersCount,
          travelMode,
          companionType,
          distanceKm: currentRouteDetails.distanceKm
        });
        setAiBudgetResult(result);
        const tierData = result.tiers[budgetTier];
        if (tierData && (forced || !isCustomBudgetManuallyEditedRef.current)) {
          setCustomBudget(tierData.totalCost);
        }
      } catch (err) {
        console.error('Failed to load AI real-trip budget:', err);
      } finally {
        setIsFetchingAiBudget(false);
      }
    },
    [
      selectedDestinationPlace?.name,
      selectedDestination.name,
      effectiveStartCity,
      durationDays,
      travellersCount,
      travelMode,
      companionType,
      currentRouteDetails.distanceKm,
      budgetTier
    ]
  );

  // Auto-fetch real trip budget whenever user is on budget step or changes key variables
  useEffect(() => {
    if (currentStep === 5 || currentStep === 4) {
      loadAiBudget();
    }
  }, [
    currentStep,
    selectedDestinationPlace?.name,
    selectedDestination.name,
    durationDays,
    travellersCount,
    travelMode,
    companionType
  ]);

  // Browser Geolocation Detector
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocatingStatus('error');
      setLocationErrorMsg('Geolocation is not supported by your browser. Please choose your departure city manually below.');
      setOriginSelectionMode('manual');
      return;
    }

    setLocatingStatus('locating');
    setLocationErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          // Reverse geocoding via OpenStreetMap Nominatim with a 4-second timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            const cityName =
              data.address?.city ||
              data.address?.town ||
              data.address?.municipality ||
              data.address?.state_district ||
              data.address?.county ||
              data.address?.state;
            const stateName = data.address?.state;
            const countryName = data.address?.country;

            if (cityName) {
              setStartCity(cityName);
              setIsCustomCityInput(false);
              setCustomStartCity('');
              setDetectedLocationData({
                cityName,
                state: stateName,
                country: countryName,
                lat,
                lng
              });
              setLocatingStatus('success');
              setOriginSelectionMode('detected');
              return;
            }
          }
        } catch {
          setLocatingStatus('error');
          setLocationErrorMsg('Unable to fetch city from coordinates. Please enter manually.');
          setOriginSelectionMode('manual');
        }
      },
      (err) => {
        setLocatingStatus('error');
        setOriginSelectionMode('manual');
        if (err.code === 1) {
          setLocationErrorMsg('Location permission was denied. No worries! Please choose or search your starting city manually below.');
        } else if (err.code === 2) {
          setLocationErrorMsg('Unable to determine your GPS location. Please pick your starting city manually below.');
        } else {
          setLocationErrorMsg('Location request timed out. Please choose your departure city manually below.');
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };

  // Automatically request GPS location on initial wizard mount if not already set
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation && !startCity && !detectedLocationData) {
      handleDetectLocation();
    }
  }, []);

  const handleNext = () => {
    if (currentStep === 1 && !selectedDestinationPlace) {
      return;
    }

    if (currentStep < totalSteps) {
      if (currentStep === 4) {
        // Entering Step 5 (Budget): calculate default based on selected tier and trigger AI real-trip load
        loadAiBudget();
        setCustomBudget(
          calculateTierBudget(
            budgetTier,
            selectedDestination,
            durationDays,
            travellersCount,
            travelMode,
            currentRouteDetails.distanceKm
          )
        );
      }
      setCurrentStep(currentStep + 1);
    } else {
      // Trigger AI Generation
      const targetDestName = selectedDestinationPlace?.name || selectedDestination.name || selectedDestId;
      onGenerateTrip({
        destinationId: targetDestName,
        destinationPlace: selectedDestinationPlace || {
          placeId: `custom-dest-${crypto.randomUUID()}`,
          name: targetDestName,
          address: selectedDestination.region || targetDestName,
          latitude: 11.4102,
          longitude: 76.6950
        },
        startCity: effectiveStartCity,
        startDate,
        endDate,
        durationDays,
        companionType,
        travellersCount,
        travelMode,
        budgetTier,
        targetBudget: customBudget,
        preferences: {
          styles: selectedStyles.length > 0 ? selectedStyles : ['Culture', 'Food', 'Nature', 'Hidden gems'],
          pace: travelPace || 'Balanced',
          food: foodPreference || 'No preference',
          alcohol: alcoholPreference || 'No',
          travelMode,
          startCity: effectiveStartCity,
          idealDay: selectedIdealDays,
          avoidances: selectedAvoidances,
          groupMembers: companionType === 'Friends' || companionType === 'Group' ? groupMembers : undefined
        }
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onCancel();
    }
  };

  const toggleStyle = (style: TravelStyle) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter((s) => s !== style));
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const togglePace = (pace: TravelPace) => {
    setTravelPace((prev) => (prev === pace ? null : pace));
  };

  const toggleFood = (food: FoodPreference) => {
    setFoodPreference((prev) => (prev === food ? null : food));
  };

  const toggleAlcohol = (alc: AlcoholPreference) => {
    setAlcoholPreference((prev) => (prev === alc ? null : alc));
  };

  const toggleIdealDay = (item: string) => {
    if (selectedIdealDays.includes(item)) {
      setSelectedIdealDays(selectedIdealDays.filter((i) => i !== item));
    } else {
      setSelectedIdealDays([...selectedIdealDays, item]);
    }
  };

  const toggleAvoidance = (item: string) => {
    if (selectedAvoidances.includes(item)) {
      setSelectedAvoidances(selectedAvoidances.filter((i) => i !== item));
    } else {
      setSelectedAvoidances([...selectedAvoidances, item]);
    }
  };

  const clearAllStep6Preferences = () => {
    setSelectedStyles([]);
    setTravelPace(null);
    setFoodPreference(null);
    setAlcoholPreference(null);
    setSelectedIdealDays([]);
    setSelectedAvoidances([]);
  };

  // Adjust travellers count sync with members
  const updateTravellerCount = (newCount: number) => {
    const val = Math.max(1, Math.min(10, newCount));
    setTravellersCount(val);
    if (companionType === 'Solo') {
      setTravellersCount(1);
    } else if (companionType === 'Couple') {
      setTravellersCount(2);
    }
  };

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Top Header & Progress */}
        <div className="wizard-container-card bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/80 dark:border-white/15 mb-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{currentStep === 1 ? 'Back to Home' : 'Previous Step'}</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-300 px-3 py-1.5 rounded-full border border-sky-200 dark:border-sky-800">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mb-2">
            <div
              className="bg-sky-600 h-full transition-all duration-500 ease-out rounded-full shadow-xs"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>

          {/* Step Titles */}
          <div className="text-left mt-4">
            {currentStep === 1 && (
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Where are you going?
                </h2>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Where are you starting your trip from?
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Share your current location or pick your departure hub to calculate exact routes, travel times, and transit costs.
                </p>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  When, how long, & how do you want to travel?
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Select your trip dates, total duration, and preferred mode of transportation to {selectedDestination.name}.
                </p>
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Who are you travelling with?
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  We balance individual group preferences so everyone enjoys the trip.
                </p>
              </div>
            )}

            {currentStep === 5 && (
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  What is your budget?
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  We'll calibrate stays, experiences, food, and {travelMode} transit to match your comfort.
                </p>
              </div>
            )}

            {currentStep === 6 && (
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  What kind of traveller are you?
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Select your vibe, dining habits, and things to avoid for full itinerary personalization.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Wizard Step Content */}
        <div className="wizard-step-card bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/80 dark:border-white/15 mb-6 text-left">
          <AnimatePresence mode="wait">
            {/* STEP 1: DESTINATION INTERACTIVE MAP SEARCH */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Step1DestinationSearch
                  selectedPlace={selectedDestinationPlace}
                  onSelectPlace={(place) => {
                    setSelectedDestinationPlace(place);
                    setSelectedDestId(place.placeId);
                  }}
                  onClearPlace={() => {
                    setSelectedDestinationPlace(null);
                  }}
                />
              </motion.div>
            )}

            {/* STEP 2: DEDICATED STARTING POINT / LOCATION STEP */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* 1. LOCATION-FIRST ASKING SCREEN */}
                {originSelectionMode === 'ask_location' && (
                  <div className="space-y-5">
                    <div className="p-6 sm:p-8 rounded-3xl border-2 border-emerald-300/80 bg-gradient-to-b from-emerald-50/90 via-teal-50/40 to-white text-center space-y-5 shadow-sm">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md ring-8 ring-emerald-100/80 mx-auto">
                        <Locate className="w-8 h-8 animate-pulse" />
                      </div>

                      <div className="max-w-md mx-auto space-y-2">
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          Where are you starting your trip from?
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          Allow location access so TripCraft can pinpoint your closest departure hub, calculate accurate route distances to <strong className="text-emerald-950">{selectedDestination.name}</strong>, and tailor your transit budget.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
                        <button
                          type="button"
                          id="detect-location-first-btn"
                          onClick={handleDetectLocation}
                          disabled={locatingStatus === 'locating'}
                          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-75 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {locatingStatus === 'locating' ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Detecting GPS Location...</span>
                            </>
                          ) : (
                            <>
                              <MapPinned className="w-4 h-4" />
                              <span>Use My Current Location</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          id="choose-manually-first-btn"
                          onClick={() => setOriginSelectionMode('manual')}
                          className="w-full sm:w-auto px-5 py-3.5 rounded-2xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50"
                        >
                          <Navigation className="w-4 h-4 text-slate-500" />
                          <span>Choose Manually</span>
                        </button>
                      </div>

                      <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
                        <span>🔒 Used only for real-time corridor & transit calculations. Never stored.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. DETECTED LOCATION CONFIRMATION SCREEN */}
                {originSelectionMode === 'detected' && (
                  <div className="space-y-5">
                    <div className="p-5 rounded-2xl border-2 border-emerald-400/90 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 space-y-3 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                                Location Detected
                              </span>
                              {detectedLocationData?.lat && detectedLocationData?.lng && (
                                <span className="text-[11px] text-slate-500 font-medium">
                                  GPS: {detectedLocationData.lat.toFixed(2)}°, {detectedLocationData.lng.toFixed(2)}°
                                </span>
                              )}
                            </div>
                            <h4 className="text-lg font-black text-emerald-950 mt-0.5">
                              {effectiveStartCity} {detectedLocationData?.state ? `(${detectedLocationData.state})` : ''}
                            </h4>
                            <p className="text-xs text-emerald-900/80 mt-0.5">
                              Departure hub confirmed for route to <strong className="text-emerald-950">{selectedDestination.name}</strong>.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            id="change-detected-origin-btn"
                            onClick={() => setOriginSelectionMode('manual')}
                            className="px-3.5 py-2 rounded-xl border border-emerald-400 bg-white hover:bg-emerald-50 text-emerald-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Change Manually</span>
                          </button>
                          <button
                            type="button"
                            id="redetect-origin-btn"
                            onClick={handleDetectLocation}
                            disabled={locatingStatus === 'locating'}
                            className="p-2 rounded-xl border border-emerald-400 bg-white hover:bg-emerald-50 text-emerald-800 transition-all cursor-pointer shadow-xs disabled:opacity-60"
                            title="Re-detect GPS location"
                          >
                            <Locate className={`w-4 h-4 ${locatingStatus === 'locating' ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>


                  </div>
                )}

                {/* 3. MANUAL SELECTION SCREEN (FALLBACK OR EXPLICIT CHOICE) */}
                {originSelectionMode === 'manual' && (
                  <div className="space-y-6">
                    {/* Notice if permission was denied or error */}
                    {locatingStatus === 'error' && (
                      <div className="p-3.5 rounded-2xl border border-amber-300 bg-amber-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-semibold">{locationErrorMsg}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleDetectLocation}
                          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 cursor-pointer self-start sm:self-auto"
                        >
                          Retry GPS Detection
                        </button>
                      </div>
                    )}

                    {/* Search / Filter departure city */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                          Select or Search Departure Hub
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-900 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                            Active: {effectiveStartCity}
                          </span>
                          <button
                            type="button"
                            id="detect-location-top-btn"
                            onClick={handleDetectLocation}
                            disabled={locatingStatus === 'locating'}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Locate className="w-3 h-3" />
                            <span>Detect Location</span>
                          </button>
                        </div>
                      </div>

                      {/* Simple Origin City Input */}
                      <div className="mt-2">
                        <label className="text-xs font-bold text-slate-700 block mb-2">
                          Enter Departure City
                        </label>
                        <input
                          type="text"
                          value={startCity}
                          onChange={(e) => setStartCity(e.target.value)}
                          placeholder="e.g. Mumbai, New York, London..."
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 3: DATES, DURATION & MODE OF TRAVEL */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* 1. TRIP DURATION SELECTOR */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      Choose Trip Duration
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {(() => {
                      const minDays = aiDestinationInfo?.minimumRequiredDays || destinationFeasibility.minDurationDays;
                      const durationOptions = [
                        {
                          days: minDays,
                          label: `${minDays} Days`,
                          sub: `${minDays - 1} Nights (AI Min)`,
                          isPlus: false
                        },
                        {
                          days: minDays + 1,
                          label: `${minDays + 1} Days`,
                          sub: `${minDays} Nights`,
                          isPlus: false
                        },
                        {
                          days: minDays + 2,
                          label: `${minDays + 2} Days`,
                          sub: `${minDays + 1} Nights (Ideal)`,
                          isPlus: false
                        },
                        {
                          days: minDays + 3,
                          label: `${minDays + 3}+ Days`,
                          sub: `${minDays + 2}+ Nights`,
                          isPlus: true
                        }
                      ];

                      return durationOptions.map((opt) => {
                        const isSelected = opt.isPlus
                          ? durationDays >= opt.days
                          : durationDays === opt.days;
                        return (
                          <button
                            key={opt.days}
                            type="button"
                            onClick={() => {
                              setDurationDays(opt.days);
                              setEndDate(getCalculatedEndDate(startDate, opt.days));
                            }}
                            className={`wizard-option-btn py-3.5 px-4 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'is-selected border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs ring-2 ring-emerald-500/20'
                                : 'border-slate-200 text-slate-700 hover:border-slate-300 font-medium bg-white'
                            }`}
                          >
                            <span className="text-lg block font-extrabold">{opt.label}</span>
                            <span className="text-[11px] text-slate-500">{opt.sub}</span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* 2. DATE INPUTS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Start Date
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const today = getTodayFormattedDate();
                          const minReq = aiDestinationInfo?.minimumRequiredDays || destinationFeasibility.minDurationDays;
                          setStartDate(today);
                          setEndDate(getCalculatedEndDate(today, Math.max(durationDays, minReq)));
                        }}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        Today
                      </button>
                    </div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        const minReq = aiDestinationInfo?.minimumRequiredDays || destinationFeasibility.minDurationDays;
                        setStartDate(newStart);
                        if (newStart && endDate) {
                          const calculatedDays = getCalculatedDaysBetween(newStart, endDate);
                          if (calculatedDays < minReq) {
                            setDurationDays(minReq);
                            setEndDate(getCalculatedEndDate(newStart, minReq));
                          } else {
                            setDurationDays(calculatedDays);
                          }
                        }
                      }}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        End Date
                      </label>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {durationDays} {durationDays === 1 ? 'Day' : 'Days'}
                      </span>
                    </div>
                    <input
                      type="date"
                      value={endDate}
                      min={getCalculatedEndDate(startDate, aiDestinationInfo?.minimumRequiredDays || destinationFeasibility.minDurationDays)}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        const minReq = aiDestinationInfo?.minimumRequiredDays || destinationFeasibility.minDurationDays;
                        setEndDate(newEnd);
                        if (startDate && newEnd) {
                          const calculatedDays = getCalculatedDaysBetween(startDate, newEnd);
                          const safeDays = Math.max(calculatedDays, minReq);
                          setDurationDays(safeDays);
                          if (calculatedDays < minReq) {
                            setEndDate(getCalculatedEndDate(startDate, minReq));
                          }
                        }
                      }}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer"
                    />
                  </div>
                </div>

                {/* 3. MODE OF TRAVEL SELECTOR */}
                <div className="pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Modes of Travel
                      </label>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Distance: ~{aiDestinationInfo?.distanceKm || destinationFeasibility.distanceKm} km
                      </span>
                    </div>
                    <span className="self-start sm:self-auto text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Selected: {travelMode}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {travelModesToDisplay.map((mode) => {
                      const isSelected = travelMode === mode.id;
                      const isAiPick = mode.isRecommended || aiDestinationInfo?.recommendedTravelMode === mode.id;

                      return (
                        <button
                          key={mode.id}
                          type="button"
                          id={`travel-mode-${mode.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                          onClick={() => setTravelMode(mode.id)}
                          className={`wizard-option-btn p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'is-selected border-emerald-600 bg-emerald-50/90 text-emerald-950 font-bold shadow-xs ring-2 ring-emerald-500/20'
                              : isAiPick
                              ? 'border-emerald-300 bg-emerald-50/30 text-slate-800 hover:border-emerald-400 font-medium'
                              : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white font-medium'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-2xl">{mode.icon}</span>
                              <div className="flex items-center gap-1">
                                {isAiPick && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 shadow-xs">
                                    ⭐ AI Pick
                                  </span>
                                )}
                                <span
                                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                                    isSelected ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {mode.tag}
                                </span>
                              </div>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900">{mode.label}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{mode.desc}</p>

                            {mode.durationEstimate && (
                              <div className="mt-1.5 text-[10px] font-semibold text-slate-600">
                                ⏱️ {mode.durationEstimate} {mode.estimatedCostRange ? `• ${mode.estimatedCostRange}` : ''}
                              </div>
                            )}
                            
                            {mode.hasSwitchOrTransfer && (
                              <div className="mt-1 text-[9px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                                🔄 Transfer / Border switch required
                              </div>
                            )}

                            {mode.pros && (
                              <div className="mt-1 text-[9px] text-emerald-700 leading-snug font-medium">
                                ✓ {mode.pros}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="mt-2.5 pt-1.5 border-t border-emerald-200 flex items-center gap-1 text-[10px] font-bold text-emerald-800">
                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>Chosen Transport</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="wizard-option-card p-4 rounded-2xl border border-slate-100 flex items-center gap-3 text-xs text-slate-600">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Optimal Season:</strong> {aiDestinationInfo?.bestSeasons || selectedDestination.bestMonths} is the ideal time to visit with {selectedDestination.climate}.
                  </span>
                </div>
              </motion.div>
            )}

            {/* STEP 4: TRAVELLERS */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
                    Companion Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {(['Solo', 'Couple', 'Friends', 'Family', 'Group'] as TravelCompanion[]).map((comp) => {
                      const isSelected = companionType === comp;
                      return (
                        <button
                          key={comp}
                          type="button"
                          onClick={() => {
                            setCompanionType(comp);
                            if (comp === 'Solo') setTravellersCount(1);
                            else if (comp === 'Couple') setTravellersCount(2);
                            else if (comp === 'Friends' && travellersCount < 3) setTravellersCount(3);
                          }}
                          className={`wizard-option-btn companion-type-btn p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'is-selected border-emerald-600 !bg-emerald-600 !text-white font-extrabold shadow-md shadow-emerald-600/25 ring-2 ring-emerald-500/30 scale-[1.02]'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 font-semibold'
                          }`}
                        >
                          <span className="text-xl block mb-1">
                            {comp === 'Solo' && '🎒'}
                            {comp === 'Couple' && '💑'}
                            {comp === 'Friends' && '🏄‍♂️'}
                            {comp === 'Family' && '👨‍👩‍👧‍👦'}
                            {comp === 'Group' && '🚌'}
                          </span>
                          <span
                            className={`text-xs block font-bold transition-colors ${
                              isSelected ? '!text-white font-black drop-shadow-xs' : 'text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            {comp}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Number of Travellers */}
                <div className="wizard-option-card flex items-center justify-between p-4 rounded-2xl border border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Total Travellers</h4>
                    <p className="text-xs text-slate-500">How many people are going on this trip?</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateTravellerCount(travellersCount - 1)}
                      disabled={travellersCount <= 1}
                      className="wizard-option-btn w-9 h-9 rounded-xl border border-slate-200 text-slate-800 font-bold hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-base font-extrabold text-slate-900 w-6 text-center">
                      {travellersCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateTravellerCount(travellersCount + 1)}
                      disabled={travellersCount >= 12}
                      className="wizard-option-btn w-9 h-9 rounded-xl border border-slate-200 text-slate-800 font-bold hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: BUDGET */}
            {currentStep === 5 && (() => {
              // Active tier and calculations from AI Real-Trip result or fallback
              const activeAiTier = aiBudgetResult?.tiers[budgetTier];
              const minNeededBudget = aiBudgetResult?.tiers.Budget.totalCost || calculateTierBudget('Budget', selectedDestination, durationDays, travellersCount, travelMode, currentRouteDetails.distanceKm);
              const maxBudgetCap = Math.max(minNeededBudget + 20000, (aiBudgetResult?.tiers.Luxury.totalCost || calculateTierBudget('Luxury', selectedDestination, durationDays, travellersCount, travelMode, currentRouteDetails.distanceKm)) * 1.3);
              
              // Dynamic Breakdown Calculation scaling with slider
              const baseTransitCost = activeAiTier?.breakdown.transit ?? getTravelModeTransitCost(travelMode, budgetTier, durationDays, travellersCount, currentRouteDetails.distanceKm);
              const currentTransitCost = Math.min(baseTransitCost, Math.max(500, Math.round(customBudget * 0.45)));
              const groundRemaining = Math.max(0, customBudget - currentTransitCost);

              const totalGroundAi = activeAiTier
                ? (activeAiTier.breakdown.stays + activeAiTier.breakdown.food + activeAiTier.breakdown.activities + activeAiTier.breakdown.misc)
                : 0;

              const staysPortion = totalGroundAi > 0 && activeAiTier
                ? Math.round(groundRemaining * (activeAiTier.breakdown.stays / totalGroundAi))
                : Math.round(groundRemaining * 0.45);

              const foodPortion = totalGroundAi > 0 && activeAiTier
                ? Math.round(groundRemaining * (activeAiTier.breakdown.food / totalGroundAi))
                : Math.round(groundRemaining * 0.35);

              const activitiesPortion = totalGroundAi > 0 && activeAiTier
                ? Math.round(groundRemaining * (activeAiTier.breakdown.activities / totalGroundAi))
                : Math.round(groundRemaining * 0.15);

              const miscPortion = Math.max(0, groundRemaining - staysPortion - foodPortion - activitiesPortion);

              return (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* AI Cost Engine Status Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900 text-white rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      {isFetchingAiBudget ? (
                        <div className="flex items-center gap-2 text-emerald-300 font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          <span>Gemini AI is analyzing live crowdsourced costs for {selectedDestination.name}...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-200">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            <strong>AI Cost Calibrated:</strong> ~{aiBudgetResult?.crowdsourcedSampleCount || 480} real traveler logs for {durationDays}d / {travellersCount}p ({travelMode})
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        isCustomBudgetManuallyEditedRef.current = false;
                        loadAiBudget(true);
                      }}
                      disabled={isFetchingAiBudget}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-[11px] font-semibold transition-colors disabled:opacity-50"
                      title="Re-estimate budget with Gemini AI"
                    >
                      <RefreshCw className={`w-3 h-3 ${isFetchingAiBudget ? 'animate-spin' : ''}`} />
                      <span>{isFetchingAiBudget ? 'Calibrating...' : 'Re-estimate with AI'}</span>
                    </button>
                  </div>

                  {/* Budget Tier Selection (Budget, Moderate, Premium, Luxury) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Select AI Trip Budget Tier
                        </label>
                        <span className="text-[10px] text-slate-400">({durationDays} Days / {travellersCount} {travellersCount === 1 ? 'Person' : 'People'})</span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Min Baseline: ₹{minNeededBudget.toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {(
                        [
                          {
                            tier: 'Budget' as BudgetTier,
                            icon: '🪙',
                            subtitle: 'Hostels, Dhabas & Shared Transit',
                            badge: 'Minimum Needed',
                            color: 'amber'
                          },
                          {
                            tier: 'Moderate' as BudgetTier,
                            icon: '💳',
                            subtitle: '3-Star Boutique, Cafes & Cabs',
                            badge: 'Popular Choice',
                            color: 'emerald'
                          },
                          {
                            tier: 'Premium' as BudgetTier,
                            icon: '💎',
                            subtitle: '4-Star Resorts & Private Chauffeured',
                            badge: 'Upgraded',
                            color: 'blue'
                          },
                          {
                            tier: 'Luxury' as BudgetTier,
                            icon: '👑',
                            subtitle: '5-Star Heritage, Gourmet & VIP',
                            badge: 'All-Inclusive',
                            color: 'purple'
                          }
                        ]
                      ).map((b) => {
                        const tierInfo = aiBudgetResult?.tiers[b.tier];
                        const tierAmount = tierInfo?.totalCost || calculateTierBudget(b.tier, selectedDestination, durationDays, travellersCount, travelMode, currentRouteDetails.distanceKm);
                        const perPerson = tierInfo?.perPersonCost || Math.round(tierAmount / travellersCount);
                        const perDay = tierInfo?.perDayPerPerson || Math.round(perPerson / durationDays);
                        const isSelected = budgetTier === b.tier;

                        return (
                          <button
                            key={b.tier}
                            type="button"
                            onClick={() => {
                              setBudgetTier(b.tier);
                              isCustomBudgetManuallyEditedRef.current = false;
                              setCustomBudget(tierAmount);
                            }}
                            className={`wizard-option-btn p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between relative overflow-hidden ${
                              isSelected
                                ? 'is-selected border-emerald-600 bg-emerald-50/90 text-emerald-950 font-bold shadow-md ring-2 ring-emerald-500/20'
                                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-medium hover:bg-slate-50/60 shadow-2xs'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> Selected
                              </div>
                            )}

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">{b.icon}</span>
                                <span
                                  className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                                    b.tier === 'Budget'
                                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                                      : b.tier === 'Moderate'
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                      : b.tier === 'Premium'
                                      ? 'bg-blue-50 text-blue-900 border-blue-300'
                                      : 'bg-purple-50 text-purple-900 border-purple-300'
                                  }`}
                                >
                                  {b.badge}
                                </span>
                              </div>

                              <h4 className="text-base font-extrabold">{b.tier}</h4>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                                {tierInfo?.stayDescription ? tierInfo.stayDescription.split('(')[0] : b.subtitle}
                              </p>

                              {/* Persona Tag */}
                              <div className="mt-2">
                                <span className="inline-block text-[9px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                  👤 {tierInfo?.spendingPersona || 'Real travelers'}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3.5 pt-2.5 border-t border-slate-200/70">
                              <div className="flex items-baseline justify-between">
                                <span className="text-xs text-slate-500 font-semibold">Total Trip</span>
                                <span className="text-sm font-black text-emerald-900">
                                  ₹{tierAmount.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                                <span>Per person</span>
                                <span className="font-semibold text-slate-700">₹{perPerson.toLocaleString()} (₹{perDay.toLocaleString()}/d)</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Approximate Total Budget Input Slider */}
                  <div className="wizard-option-card p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-800 block uppercase tracking-wider">
                            Total Planned Trip Budget (INR ₹)
                          </label>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            {budgetTier} Tier Active
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Slide to calibrate custom spending or use AI benchmark for {selectedDestination.name}.
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="font-black text-emerald-800 text-2xl block">
                          ₹{customBudget.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ≈ ₹{Math.round(customBudget / travellersCount).toLocaleString()} / person (₹{Math.round(customBudget / (travellersCount * durationDays)).toLocaleString()} / day)
                        </span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={minNeededBudget}
                      max={maxBudgetCap}
                      step={500}
                      value={Math.max(minNeededBudget, customBudget)}
                      onChange={(e) => {
                        isCustomBudgetManuallyEditedRef.current = true;
                        setCustomBudget(Number(e.target.value));
                      }}
                      className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span className="font-semibold text-emerald-900">₹{minNeededBudget.toLocaleString()} (Min Required)</span>
                      <span className="font-bold text-slate-700">{travellersCount} Travellers • {durationDays} Days</span>
                      <span className="font-semibold text-slate-600">₹{Math.round(maxBudgetCap).toLocaleString()} (Luxury Cap)</span>
                    </div>

                    {/* AI Real-Trip Expense Breakdown Grid */}
                    <div className="pt-3.5 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-emerald-600" />
                          Real Traveler Spending Allocation ({budgetTier} Tier):
                        </span>
                        <span className="text-slate-500 font-semibold">{durationDays} Days / {travellersCount} Pax</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-100">
                          <div className="text-[10px] font-bold flex items-center gap-1 text-blue-900">
                            <span>{travelMode === 'Flight' ? '✈️' : travelMode === 'Train' ? '🚆' : travelMode === 'Car / Road Trip' ? '🚗' : travelMode === 'Bus' ? '🚌' : travelMode === 'Bike / Motorcycle' ? '🏍️' : '🚙'}</span>
                            <span>Transit</span>
                          </div>
                          <div className="text-xs font-black mt-1 text-blue-950">
                            ₹{currentTransitCost.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-blue-700/80 mt-0.5 truncate">
                            {activeAiTier?.transitDescription || `${travelMode} RT`}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-100">
                          <div className="text-[10px] font-bold flex items-center gap-1 text-indigo-900">
                            <span>🏨</span>
                            <span>Stays</span>
                          </div>
                          <div className="text-xs font-black mt-1 text-indigo-950">
                            ₹{staysPortion.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-indigo-700/80 mt-0.5 truncate">
                            {activeAiTier?.stayDescription || 'Accommodations'}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-100">
                          <div className="text-[10px] font-bold flex items-center gap-1 text-amber-900">
                            <span>🍽️</span>
                            <span>Dining</span>
                          </div>
                          <div className="text-xs font-black mt-1 text-amber-950">
                            ₹{foodPortion.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-amber-700/80 mt-0.5 truncate">
                            {activeAiTier?.foodDescription || 'Food & snacks'}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-100">
                          <div className="text-[10px] font-bold flex items-center gap-1 text-purple-900">
                            <span>🎟️</span>
                            <span>Activities</span>
                          </div>
                          <div className="text-xs font-black mt-1 text-purple-950">
                            ₹{activitiesPortion.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-purple-700/80 mt-0.5 truncate">
                            Passes, entry & tours
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100 col-span-2 sm:col-span-1">
                          <div className="text-[10px] font-bold flex items-center gap-1 text-emerald-900">
                            <span>🛍️</span>
                            <span>Buffer & Misc</span>
                          </div>
                          <div className="text-xs font-black mt-1 text-emerald-950">
                            ₹{miscPortion.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-emerald-700/80 mt-0.5 truncate">
                            Local snacks & shopping
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Real Traveler Log Quote & Insider Savings Hack & Seasonality Note */}
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                      {activeAiTier?.realTravellerLog && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2">
                          <span className="text-base">💬</span>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 block">
                              Real Traveler Expense Log
                            </span>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                              "{activeAiTier.realTravellerLog}"
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 block">
                            Real Traveler Cost-Saving Tip
                          </span>
                          <p className="text-[11px] text-amber-900/90 mt-0.5 leading-relaxed">
                            {aiBudgetResult?.moneySavingTip || 'Book local scooter/car rentals or local buses at arrival instead of hiring standard tourist taxis.'}
                          </p>
                        </div>
                      </div>

                      {aiBudgetResult?.peakSeasonNote && (
                        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 flex items-start gap-2 md:col-span-2">
                          <span className="text-base">🗓️</span>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 block">
                              Seasonality & Price Surge Note
                            </span>
                            <p className="text-[11px] text-blue-900/90 mt-0.5 leading-relaxed">
                              {aiBudgetResult.peakSeasonNote}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* STEP 6: TRAVELLER PERSONALITY & PREFERENCES */}
            {currentStep === 6 && (() => {
              const totalSelectedCount =
                selectedStyles.length +
                (travelPace ? 1 : 0) +
                (foodPreference ? 1 : 0) +
                (alcoholPreference ? 1 : 0) +
                selectedAvoidances.length;

              return (
                <motion.div
                  key="step6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-7"
                >
                  {/* Preferences Header & Clear Button */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">
                        {totalSelectedCount === 0
                          ? 'All questions are optional — tap any choice to customize your AI plan'
                          : `${totalSelectedCount} preference${totalSelectedCount > 1 ? 's' : ''} customized`}
                      </span>
                    </div>
                    {totalSelectedCount > 0 && (
                      <button
                        type="button"
                        onClick={clearAllStep6Preferences}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        Clear All Choices
                      </button>
                    )}
                  </div>

                  {/* 1. Travel Style */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <span>1. Travel Style</span>
                        <span className="text-[10px] font-normal text-slate-500 lowercase">(select any vibes)</span>
                      </label>
                      {selectedStyles.length > 0 && (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          {selectedStyles.length} selected
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {TRAVEL_STYLES.map((style) => {
                        const isSelected = selectedStyles.includes(style.id);
                        return (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => toggleStyle(style.id)}
                            className={`wizard-option-btn p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${isSelected
                                ? 'is-selected border-emerald-600 bg-emerald-50/90 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-500/20'
                                : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white font-medium hover:bg-slate-50/50'
                              }`}
                          >
                            <span className="text-lg shrink-0 mt-0.5">{style.icon}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold block">{style.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                              </div>
                              <span className="text-[10px] text-slate-500 block leading-tight whitespace-normal mt-0.5">
                                {style.desc}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Travel Pace & 3. Food Preference */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Travel Pace */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          2. Travel Pace
                        </label>
                        {travelPace && (
                          <button
                            type="button"
                            onClick={() => setTravelPace(null)}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Relaxed', 'Balanced', 'Packed'] as TravelPace[]).map((pace) => {
                          const isSelected = travelPace === pace;
                          return (
                            <button
                              key={pace}
                              type="button"
                              onClick={() => togglePace(pace)}
                              className={`wizard-option-btn py-2.5 px-3 rounded-xl border text-center text-xs transition-all cursor-pointer whitespace-normal ${isSelected
                                  ? 'is-selected border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-500/20'
                                  : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white font-medium'
                                }`}
                            >
                              {pace}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Food Preference */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          3. Food Preference
                        </label>
                        {foodPreference && (
                          <button
                            type="button"
                            onClick={() => setFoodPreference(null)}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Vegetarian', 'Non-vegetarian', 'Vegan', 'No preference'] as FoodPreference[]).map(
                          (food) => {
                            const isSelected = foodPreference === food;
                            return (
                              <button
                                key={food}
                                type="button"
                                onClick={() => toggleFood(food)}
                                className={`wizard-option-btn py-2.5 px-3 rounded-xl border text-center text-xs transition-all cursor-pointer whitespace-normal break-words flex items-center justify-center min-h-[42px] ${isSelected
                                    ? 'is-selected border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-500/20'
                                    : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white font-medium'
                                  }`}
                              >
                                <span className="leading-snug text-center">{food}</span>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. Alcohol Question */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        4. Do you drink alcohol?
                      </label>
                      {alcoholPreference && (
                        <button
                          type="button"
                          onClick={() => setAlcoholPreference(null)}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {(['Yes', 'Occasionally', 'No'] as AlcoholPreference[]).map((alc) => {
                        const isSelected = alcoholPreference === alc;
                        return (
                          <button
                            key={alc}
                            type="button"
                            onClick={() => toggleAlcohol(alc)}
                            className={`wizard-option-btn py-2.5 px-4 rounded-xl border text-center text-xs transition-all cursor-pointer whitespace-normal ${isSelected
                                ? 'is-selected border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-500/20'
                                : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white font-medium'
                              }`}
                          >
                            {alc}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. Avoidances */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <span>5. Anything you want to avoid?</span>
                        <span className="text-[10px] font-normal text-slate-500 lowercase">(optional)</span>
                      </label>
                      {selectedAvoidances.length > 0 && (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          {selectedAvoidances.length} selected
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {AVOIDANCES.map((avoid) => {
                        const isSelected = selectedAvoidances.includes(avoid);
                        return (
                          <button
                            key={avoid}
                            type="button"
                            onClick={() => toggleAvoidance(avoid)}
                            className={`wizard-option-btn p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${isSelected
                                ? 'is-selected border-amber-600 bg-amber-50 text-amber-950 font-bold shadow-xs'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white font-medium'
                              }`}
                          >
                            <span className="leading-snug break-words flex-1">{avoid}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>

        {/* Bottom Actions Sticky Floating Bar */}
        <div className="sticky bottom-4 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-4 sm:p-5 rounded-3xl border border-white/80 dark:border-white/20 shadow-2xl flex items-center justify-between gap-4 mt-6">
          {currentStep > 1 ? (
            <button
              id="wizard-back-btn"
              type="button"
              onClick={handleBack}
              className="px-5 sm:px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs"
            >
              ← Back
            </button>
          ) : (
            <div className="hidden sm:block">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                {selectedDestinationPlace
                  ? 'Destination selected! Click Continue to configure trip details.'
                  : 'Search and select any place or address above to proceed.'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Step {currentStep} of {totalSteps}
            </span>
            <button
              id="wizard-continue-btn"
              type="button"
              onClick={handleNext}
              disabled={currentStep === 1 && !selectedDestinationPlace}
              className={`px-6 sm:px-9 py-3.5 rounded-2xl font-bold text-sm shadow-xl transition-all flex items-center gap-2 border ${currentStep === 1 && !selectedDestinationPlace
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60'
                  : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/30 border-sky-400/40 hover:scale-102 active:scale-98 cursor-pointer'
                }`}
            >
              <span>{currentStep === totalSteps ? 'Generate AI Itinerary' : 'Continue →'}</span>
              {currentStep === totalSteps ? (
                <Sparkles className="w-4 h-4 text-sky-200" />
              ) : null}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
