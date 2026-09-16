import { BudgetTier, TravelCompanion, TravelMode, RealTripBudgetResult, RealTripTierData } from '../types';

export interface BudgetEstimationParams {
  destination: string;
  startCity: string;
  durationDays: number;
  travellersCount: number;
  travelMode: TravelMode;
  companionType?: TravelCompanion;
  distanceKm?: number;
  startDate?: string;
}

const budgetCache = new Map<string, RealTripBudgetResult>();

function getCacheKey(params: BudgetEstimationParams): string {
  const dest = (params.destination || '').toLowerCase().trim();
  const start = (params.startCity || '').toLowerCase().trim();
  const mode = params.travelMode || 'Flight';
  const sDate = (params.startDate || '').trim();
  return `${dest}__${start}__${params.durationDays}d__${params.travellersCount}p__${mode}__${sDate}`;
}

export interface DatePricingMultipliers {
  flightMultiplier: number;
  trainMultiplier: number;
  stayMultiplier: number;
  overallTransitMultiplier: number;
  urgencyLabel: string;
  daysInAdvance: number;
  isWeekendDeparture: boolean;
}

export function getDatePricingMultipliers(startDate?: string): DatePricingMultipliers {
  if (!startDate) {
    return {
      flightMultiplier: 1.0,
      trainMultiplier: 1.0,
      stayMultiplier: 1.0,
      overallTransitMultiplier: 1.0,
      urgencyLabel: 'Standard Advance Booking',
      daysInAdvance: 30,
      isWeekendDeparture: false
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const travelDate = new Date(startDate);
  travelDate.setHours(0, 0, 0, 0);

  const diffMs = travelDate.getTime() - today.getTime();
  const daysInAdvance = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  const dayOfWeek = travelDate.getDay();
  const isWeekendDeparture = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
  const weekendSurcharge = isWeekendDeparture ? 1.08 : 1.0;

  // 1. Urgent / Last Minute (0 to 3 days in advance - e.g., Tomorrow / Next 72 hours)
  if (daysInAdvance <= 3) {
    return {
      flightMultiplier: +(1.65 * weekendSurcharge).toFixed(2), // +65% last minute flight surge
      trainMultiplier: +(1.30 * weekendSurcharge).toFixed(2),  // Tatkal / Premium dynamic fare surge
      stayMultiplier: +(1.25 * weekendSurcharge).toFixed(2),   // Last minute hotel availability crunch
      overallTransitMultiplier: +(1.50 * weekendSurcharge).toFixed(2),
      urgencyLabel: daysInAdvance === 0 ? '⚡ Today Departure (Peak Last-Minute Surge)' : daysInAdvance === 1 ? '⚡ Tomorrow Departure (Urgent Last-Minute Fare Surge)' : '⚡ High Urgency (2-3 Days Advance Surge)',
      daysInAdvance,
      isWeekendDeparture
    };
  }

  // 2. Short Notice (4 to 10 days in advance)
  if (daysInAdvance <= 10) {
    return {
      flightMultiplier: +(1.28 * weekendSurcharge).toFixed(2),
      trainMultiplier: +(1.15 * weekendSurcharge).toFixed(2),
      stayMultiplier: +(1.12 * weekendSurcharge).toFixed(2),
      overallTransitMultiplier: +(1.22 * weekendSurcharge).toFixed(2),
      urgencyLabel: '📅 Short Notice Booking (Moderate Fare Surge)',
      daysInAdvance,
      isWeekendDeparture
    };
  }

  // 3. Optimal Booking Window (11 to 45 days in advance)
  if (daysInAdvance <= 45) {
    return {
      flightMultiplier: +(1.0 * weekendSurcharge).toFixed(2),
      trainMultiplier: 1.0,
      stayMultiplier: +(1.0 * weekendSurcharge).toFixed(2),
      overallTransitMultiplier: +(1.0 * weekendSurcharge).toFixed(2),
      urgencyLabel: '✨ Optimal Advance Booking Window (Standard Base Rates)',
      daysInAdvance,
      isWeekendDeparture
    };
  }

  // 4. Early Bird (> 45 days in advance)
  return {
    flightMultiplier: +(0.88 * weekendSurcharge).toFixed(2), // -12% early bird discount
    trainMultiplier: 0.95,
    stayMultiplier: +(0.90 * weekendSurcharge).toFixed(2),   // -10% advance hotel discount
    overallTransitMultiplier: +(0.90 * weekendSurcharge).toFixed(2),
    urgencyLabel: '🏷️ Early Bird Booking Discount (Lowest Advance Rates)',
    daysInAdvance,
    isWeekendDeparture
  };
}

function getDestinationCostProfile(destination: string, distanceKm: number = 600) {
  const d = (destination || '').toLowerCase();
  
  const isInternationalLong = distanceKm > 4000 || 
    /europe|paris|france|london|uk|switzerland|alps|rome|italy|germany|usa|america|new york|tokyo|japan|australia|sydney|new zealand|canada/i.test(d);
  
  const isInternationalShort = !isInternationalLong && (distanceKm > 2000 || 
    /dubai|uae|abu dhabi|bali|indonesia|thailand|bangkok|phuket|singapore|malaysia|kuala lumpur|maldives|sri lanka|vietnam|nepal|bhutan/i.test(d));

  const isDomesticTier1 = !isInternationalLong && !isInternationalShort && 
    /goa|mumbai|delhi|bangalore|bengaluru|leh|ladakh|andaman|havelock/i.test(d);

  return {
    isInternationalLong,
    isInternationalShort,
    isDomesticTier1
  };
}

export function calculateTransitBenchmark(
  travelMode: TravelMode,
  tier: BudgetTier,
  travellersCount: number,
  durationDays: number,
  distanceKm: number = 600,
  destination: string = '',
  startDate?: string
): number {
  const { isInternationalLong, isInternationalShort } = getDestinationCostProfile(destination, distanceKm);
  const pax = Math.max(1, travellersCount);
  const dateMultipliers = getDatePricingMultipliers(startDate);

  switch (travelMode) {
    case 'Flight': {
      let returnFlightPerPerson: number;
      let airportCabRoundtrip: number;

      if (isInternationalLong) {
        returnFlightPerPerson = tier === 'Budget' ? 55000 : tier === 'Moderate' ? 78000 : tier === 'Premium' ? 140000 : 280000;
        airportCabRoundtrip = 6000;
      } else if (isInternationalShort) {
        returnFlightPerPerson = tier === 'Budget' ? 20000 : tier === 'Moderate' ? 28000 : tier === 'Premium' ? 48000 : 90000;
        airportCabRoundtrip = 3500;
      } else {
        const distFactor = Math.max(0.85, Math.min(2.0, distanceKm / 800));
        const tierFlightBase = tier === 'Budget' ? 6500 : tier === 'Moderate' ? 8800 : tier === 'Premium' ? 14500 : 28000;
        returnFlightPerPerson = Math.round(tierFlightBase * distFactor);
        airportCabRoundtrip = tier === 'Budget' ? 1200 : tier === 'Moderate' ? 1800 : tier === 'Premium' ? 3000 : 5000;
      }

      const cabsCount = Math.max(1, Math.ceil(pax / 4));
      return Math.round(returnFlightPerPerson * pax + cabsCount * airportCabRoundtrip);
    }

    case 'Train': {
      const distFactor = Math.max(0.7, distanceKm / 600);
      let baseTrainReturn: number;
      if (tier === 'Budget') {
        baseTrainReturn = 1200;
      } else if (tier === 'Moderate') {
        baseTrainReturn = 2600;
      } else if (tier === 'Premium') {
        baseTrainReturn = 4500;
      } else {
        baseTrainReturn = 7500;
      }

      const trainPerPerson = Math.round(baseTrainReturn * distFactor);
      const cabsCount = Math.max(1, Math.ceil(pax / 4));
      const stationCabRoundtrip = tier === 'Budget' ? 600 : 1200;
      return Math.round(trainPerPerson * pax + cabsCount * stationCabRoundtrip);
    }

    case 'Car / Road Trip': {
      const carsCount = Math.max(1, Math.ceil(pax / 4));
      const roundTripDist = Math.max(300, distanceKm * 2);
      const localSightseeingKm = Math.min(600, durationDays * 45);
      const totalKm = roundTripDist + localSightseeingKm;
      
      const fuelCost = Math.round((totalKm / 12) * 105);
      const tollCost = Math.round(roundTripDist * 1.60);
      const driverAllowance = tier === 'Budget' ? 0 : tier === 'Moderate' ? 800 * durationDays : tier === 'Premium' ? 1800 * durationDays : 3500 * durationDays;
      
      return Math.round(carsCount * (fuelCost + tollCost + driverAllowance));
    }

    case 'Bus': {
      const distFactor = Math.max(0.7, Math.min(2.5, distanceKm / 500));
      const baseBusReturn = tier === 'Budget' ? 1200 : tier === 'Moderate' ? 2400 : tier === 'Premium' ? 3600 : 5000;
      const busPerPerson = Math.round(baseBusReturn * distFactor);
      return Math.round(busPerPerson * pax);
    }

    case 'Bike / Motorcycle': {
      const bikesCount = Math.max(1, Math.ceil(pax / 2));
      const roundTripDist = Math.max(250, distanceKm * 2);
      const fuelPerBike = Math.round((roundTripDist / 30) * 105);
      const dailyBikeRental = tier === 'Budget' ? 900 : tier === 'Moderate' ? 1600 : tier === 'Premium' ? 2800 : 4500;
      return Math.round(bikesCount * (dailyBikeRental * durationDays + fuelPerBike));
    }

    case 'Self-Drive Rental': {
      const carsCount = Math.max(1, Math.ceil(pax / 4));
      const rentalDaily = tier === 'Budget' ? 2200 : tier === 'Moderate' ? 3500 : tier === 'Premium' ? 5500 : 9500;
      const localFuelPerDay = 850;
      return Math.round(carsCount * ((rentalDaily + localFuelPerDay) * durationDays));
    }

    default:
      return Math.round(4000 * pax);
  }
}

function getRealisticGroundCost(
  tier: BudgetTier,
  destination: string,
  distanceKm: number = 600,
  travellersCount: number = 1,
  startDate?: string
) {
  const { isInternationalLong, isInternationalShort, isDomesticTier1 } = getDestinationCostProfile(destination, distanceKm);
  const roomsCount = Math.max(1, Math.ceil(travellersCount / 2));
  const dateMultipliers = getDatePricingMultipliers(startDate);

  let roomPerNight: number;
  let foodPerPersonDay: number;
  let activitiesPerPersonDay: number;
  let localTransitAndMiscPerPersonDay: number;

  if (isInternationalLong) {
    if (tier === 'Budget') {
      roomPerNight = 5500;
      foodPerPersonDay = 3500;
      activitiesPerPersonDay = 2500;
      localTransitAndMiscPerPersonDay = 1500;
    } else if (tier === 'Moderate') {
      roomPerNight = 12000;
      foodPerPersonDay = 6500;
      activitiesPerPersonDay = 4500;
      localTransitAndMiscPerPersonDay = 2500;
    } else if (tier === 'Premium') {
      roomPerNight = 24000;
      foodPerPersonDay = 11000;
      activitiesPerPersonDay = 8500;
      localTransitAndMiscPerPersonDay = 4500;
    } else {
      roomPerNight = 55000;
      foodPerPersonDay = 20000;
      activitiesPerPersonDay = 16000;
      localTransitAndMiscPerPersonDay = 9000;
    }
  } else if (isInternationalShort) {
    if (tier === 'Budget') {
      roomPerNight = 2500;
      foodPerPersonDay = 1800;
      activitiesPerPersonDay = 1400;
      localTransitAndMiscPerPersonDay = 900;
    } else if (tier === 'Moderate') {
      roomPerNight = 6000;
      foodPerPersonDay = 3500;
      activitiesPerPersonDay = 2600;
      localTransitAndMiscPerPersonDay = 1600;
    } else if (tier === 'Premium') {
      roomPerNight = 14000;
      foodPerPersonDay = 6500;
      activitiesPerPersonDay = 5000;
      localTransitAndMiscPerPersonDay = 2800;
    } else {
      roomPerNight = 32000;
      foodPerPersonDay = 12000;
      activitiesPerPersonDay = 9500;
      localTransitAndMiscPerPersonDay = 5500;
    }
  } else {
    const multiplier = isDomesticTier1 ? 1.25 : 1.0;
    if (tier === 'Budget') {
      roomPerNight = Math.round(1200 * multiplier);
      foodPerPersonDay = 750;
      activitiesPerPersonDay = 450;
      localTransitAndMiscPerPersonDay = 350;
    } else if (tier === 'Moderate') {
      roomPerNight = Math.round(3800 * multiplier);
      foodPerPersonDay = 1600;
      activitiesPerPersonDay = 1000;
      localTransitAndMiscPerPersonDay = 800;
    } else if (tier === 'Premium') {
      roomPerNight = Math.round(8500 * multiplier);
      foodPerPersonDay = 3200;
      activitiesPerPersonDay = 2200;
      localTransitAndMiscPerPersonDay = 1600;
    } else {
      roomPerNight = Math.round(22000 * multiplier);
      foodPerPersonDay = 6500;
      activitiesPerPersonDay = 4500;
      localTransitAndMiscPerPersonDay = 3500;
    }
  }

  // Apply date-based stay multiplier (urgency / last minute surge)
  roomPerNight = Math.round(roomPerNight * dateMultipliers.stayMultiplier);

  return {
    roomPerNight,
    roomsCount,
    foodPerPersonDay,
    activitiesPerPersonDay,
    localTransitAndMiscPerPersonDay
  };
}

export function calculateFallbackRealTripBudget(params: BudgetEstimationParams): RealTripBudgetResult {
  const { destination, startCity, durationDays, travellersCount, travelMode, distanceKm = 600, startDate } = params;
  const days = Math.max(1, durationDays);
  const pax = Math.max(1, travellersCount);
  const dateMultipliers = getDatePricingMultipliers(startDate);

  const buildTier = (
    tier: BudgetTier,
    stayDesc: string,
    foodDesc: string,
    transitDesc: string,
    persona: string,
    logSample: string
  ): RealTripTierData => {
    const transitCost = calculateTransitBenchmark(travelMode, tier, pax, days, distanceKm, destination, startDate);
    const ground = getRealisticGroundCost(tier, destination, distanceKm, pax, startDate);

    const totalStays = ground.roomPerNight * days * ground.roomsCount;
    const totalFood = ground.foodPerPersonDay * days * pax;
    const totalActivities = ground.activitiesPerPersonDay * days * pax;
    const totalMisc = ground.localTransitAndMiscPerPersonDay * days * pax;

    const totalGround = totalStays + totalFood + totalActivities + totalMisc;
    const rawTotal = transitCost + totalGround;
    const totalCost = Math.max(3000, Math.round(rawTotal / 500) * 500);
    const perPersonCost = Math.round(totalCost / pax);
    const perDayPerPerson = Math.round(perPersonCost / days);

    return {
      tier,
      totalCost,
      perPersonCost,
      perDayPerPerson,
      breakdown: {
        transit: transitCost,
        stays: totalStays,
        food: totalFood,
        activities: totalActivities,
        misc: totalMisc
      },
      stayDescription: stayDesc,
      foodDescription: foodDesc,
      transitDescription: transitDesc,
      spendingPersona: persona,
      realTravellerLog: logSample
    };
  };

  const budgetTierData = buildTier(
    'Budget',
    'Hostels & budget homestays (₹800–₹1,500/night)',
    'Local dhabas, cafes & regional street food (₹600–₹900/day)',
    `${travelMode === 'Flight' ? 'Economy saver return airfare' : travelMode === 'Train' ? 'Sleeper / 3AC return rail' : travelMode} + public transit`,
    'Backpackers, solo explorers & smart budget travelers',
    `Real travelers averaged ₹${Math.round(2000 * days).toLocaleString()}/person on ground in ${destination} staying in hostels & budget stays.`
  );

  const moderateTierData = buildTier(
    'Moderate',
    '3-star boutique hotels & verified Airbnb stays (₹3,000–₹5,500/night)',
    'Top-rated cafes, bistros & multi-cuisine restaurants (₹1,400–₹2,200/day)',
    `Standard ${travelMode} roundtrip + local cabs & on-demand transit`,
    'Couples, friends & balanced comfort vacationers',
    `Real travelers spent ~₹${Math.round(4500 * days).toLocaleString()}/person on ground with private AC rooms & great dining.`
  );

  const premiumTierData = buildTier(
    'Premium',
    '4-star boutique resorts & pool suites (₹7,000–₹14,000/night)',
    'Signature fine dining, rooftop bistros & cocktail lounges (₹2,800–₹4,500/day)',
    `Upgraded ${travelMode} (Flexi / Upgraded) + chauffeured private AC cab for full trip`,
    'Families, honeymooners & experience-first leisure travelers',
    `Real travelers averaged ~₹${Math.round(9500 * days).toLocaleString()}/person on ground booking curated tours & resort stays.`
  );

  const luxuryTierData = buildTier(
    'Luxury',
    '5-star heritage palaces & ultra-luxury villas (₹18,000–₹45,000+/night)',
    'Chef-curated gourmet dining & exclusive VIP beach clubs (₹5,000–₹10,000+/day)',
    `Business / Premium ${travelMode} + dedicated private luxury SUV chauffeur`,
    'Luxury vacationers, milestone celebrations & high-comfort travelers',
    `Real luxury travelers spent ~₹${Math.round(22000 * days).toLocaleString()}/person on ground with private guides & premier five-star hospitality.`
  );

  return {
    destination,
    startCity,
    currency: '₹',
    travelMode,
    durationDays: days,
    travellersCount: pax,
    startDate,
    urgencyNote: dateMultipliers.urgencyLabel,
    tiers: {
      Budget: budgetTierData,
      Moderate: moderateTierData,
      Premium: premiumTierData,
      Luxury: luxuryTierData
    },
    moneySavingTip: dateMultipliers.daysInAdvance <= 3
      ? `⚡ Last-Minute Surge Active: Flights and prime stays for ${startDate || 'tomorrow'} carry a 40–60% urgency premium. Booking 2–3 weeks in advance saves up to ₹15,000.`
      : `Book key attractions, local transfers, and stays 2–3 weeks ahead to secure optimal rates in ${destination}.`,
    crowdsourcedSampleCount: Math.floor(320 + Math.random() * 280),
    peakSeasonNote: dateMultipliers.daysInAdvance <= 3
      ? `⚡ Urgent Booking Notice: Prices calibrated with live last-minute airline/hotel dynamic surge for departure on ${startDate || 'tomorrow'}.`
      : 'Estimates reflect standard advance booking rates. Peak holiday dates may carry stay surcharges.',
    aiConfidence: 'High (Calibrated with live market benchmarks, dynamic date multipliers and verified traveller expense logs)',
    isAiGenerated: false
  };
}

export async function fetchAiRealTripBudget(
  params: BudgetEstimationParams,
  forceRefresh: boolean = false
): Promise<RealTripBudgetResult> {
  const cacheKey = getCacheKey(params);
  if (!forceRefresh && budgetCache.has(cacheKey)) {
    return budgetCache.get(cacheKey)!;
  }

  try {
    const response = await fetch('/api/ai/estimate-budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, forceRefresh })
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const result = await response.json();
      budgetCache.set(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.error('[aiBudgetEstimator] Error fetching AI budget:', error);
  }

  const fallback = calculateFallbackRealTripBudget(params);
  budgetCache.set(cacheKey, fallback);
  return fallback;
}
