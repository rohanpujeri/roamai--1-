import { TravelMode } from '../../src/types';

export function isBikeMode(mode?: string): boolean {
  if (!mode) return false;
  const m = mode.toLowerCase();
  return m.includes('bike') || m.includes('motor') || m.includes('cycle') || m.includes('two-wheeler') || m.includes('scooter');
}

export function isRoadTripMode(mode?: string): boolean {
  if (!mode) return false;
  const m = mode.toLowerCase();
  return isBikeMode(mode) || m.includes('car') || m.includes('road') || m.includes('drive') || m.includes('vehicle') || m.includes('self-drive') || m.includes('suv') || m.includes('cab');
}

export function normalizeTravelMode(mode?: string): TravelMode {
  if (!mode) return 'Flight';
  if (isBikeMode(mode)) return 'Bike / Motorcycle';
  if (isRoadTripMode(mode)) return 'Car / Road Trip';
  const m = mode.toLowerCase();
  if (m.includes('train') || m.includes('rail')) return 'Train';
  if (m.includes('bus') || m.includes('coach')) return 'Bus';
  return 'Flight';
}

export const FLIGHT_AND_RENTAL_REGEX = /\b(flight|flights|airport|airports|boarding|terminal|airline|airlines|fly|flying|plane|airplane|aircraft|airfare|takeoff|landing|blr|ixl|ixc|del|bom|maa|hyd|ccu|rental hub|pick up rental|pickup rental|bike pickup|motorcycle pickup|bike rental|motorcycle rental|rent a bike|renting motorcycle|renting bike|chandigarh rental|leh rental|manali rental|rental shop|pick up motorcycles|hire a bike)\b/i;

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

export interface OverlandStageActivity {
  id: string;
  time: string;
  endTime: string;
  title: string;
  category: 'Travel' | 'Sightseeing' | 'Food' | 'Culture' | 'Nature';
  location: string;
  coordinates: Coordinates;
  estimatedCost: number;
  travelTimeFromPrev: string;
  duration: string;
  description: string;
  imageUrl: string;
  recommendationReason: string;
  isIndoor: boolean;
  isRainSafe: boolean;
  rating: number;
}

export interface OverlandStageDetails {
  title: string;
  theme: string;
  vibe: string;
  activities: OverlandStageActivity[];
}

/**
 * Returns structured, authentic highway stage activities for overland trips (Bike / Car)
 */
export function getOverlandStageDetails(params: {
  startCity: string;
  destName: string;
  dayNum: number;
  totalDays: number;
  outboundDays: number;
  coreDestDays: number;
  returnDays: number;
  travelMode: TravelMode;
}): OverlandStageDetails {
  const { startCity, destName, dayNum, totalDays, outboundDays, coreDestDays, travelMode } = params;
  const isBike = travelMode === 'Bike / Motorcycle';
  const vehicleName = isBike ? 'Motorcycle' : 'Road Trip Car';
  const verb = isBike ? 'Riding' : 'Driving';
  const mountVerb = isBike ? 'Luggage saddlebags mounting & riding gear check' : 'Luggage packing & vehicle inspection';

  const startClean = startCity.toLowerCase();
  const destClean = destName.toLowerCase();
  const isSouthOrigin = startClean.includes('bangalore') || startClean.includes('bengaluru') || startClean.includes('chennai') || startClean.includes('hyderabad') || startClean.includes('kochi') || startClean.includes('mysore');
  const isNorthHimalayas = destClean.includes('manali') || destClean.includes('ladakh') || destClean.includes('leh') || destClean.includes('shimla') || destClean.includes('spiti') || destClean.includes('kashmir') || destClean.includes('dharamshala') || destClean.includes('kullu');

  // Outbound Stages
  if (dayNum <= outboundDays) {
    if (outboundDays === 1) {
      // 1-Day Direct Scenic Drive / Ride
      return {
        title: `${startCity} to ${destName}: Scenic Highway Journey`,
        theme: `Direct Overland Expedition to ${destName}`,
        vibe: `Crisp morning start, scenic highway stretches, mountain foothills, and arrival at ${destName}`,
        activities: [
          {
            id: `act-${dayNum}-1`,
            time: '06:00 AM',
            endTime: '08:30 AM',
            title: `Early Morning Departure from ${startCity}`,
            category: 'Travel',
            location: `${startCity} Highway Exit`,
            coordinates: findCoordsByName(startCity) || { lat: 12.9716, lng: 77.5946 },
            estimatedCost: isBike ? 600 : 1200,
            travelTimeFromPrev: '0 min',
            duration: '2.5 hrs',
            description: `${mountVerb}, tank refuel, and heading out on the national highway before morning traffic.`,
            imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600&auto=format&fit=crop',
            recommendationReason: `Starting early guarantees smooth highway progress out of ${startCity}.`,
            isIndoor: false,
            isRainSafe: true,
            rating: 4.8
          },
          {
            id: `act-${dayNum}-2`,
            time: '09:00 AM',
            endTime: '10:15 AM',
            title: 'Highway Breakfast & Fuel Refill Stop',
            category: 'Food',
            location: 'National Highway Waypoint',
            coordinates: { lat: 14.2250, lng: 76.3980 },
            estimatedCost: 350,
            travelTimeFromPrev: '30 min drive',
            duration: '1.25 hrs',
            description: `Rest stop at an authentic highway restaurant for fresh breakfast, hot tea/coffee, and vehicle check.`,
            imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop',
            recommendationReason: 'Essential hydration, fuel, and meal break along the highway.',
            isIndoor: true,
            isRainSafe: true,
            rating: 4.7
          },
          {
            id: `act-${dayNum}-3`,
            time: '01:00 PM',
            endTime: '02:30 PM',
            title: `Scenic Approach & Highway Dhaba Lunch`,
            category: 'Food',
            location: `En-Route Ghats to ${destName}`,
            coordinates: { lat: 15.3647, lng: 75.1240 },
            estimatedCost: 450,
            travelTimeFromPrev: '2 hrs drive',
            duration: '1.5 hrs',
            description: `Scenic winding ghat approach, panoramic photo point stop, and hearty regional lunch.`,
            imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop',
            recommendationReason: 'Scenic mountain climb transition with delicious roadside dining.',
            isIndoor: true,
            isRainSafe: true,
            rating: 4.8
          },
          {
            id: `act-${dayNum}-4`,
            time: '05:30 PM',
            endTime: '08:00 PM',
            title: `Arrival in ${destName} & Hotel Check-in`,
            category: 'Travel',
            location: `${destName} Center`,
            coordinates: findCoordsByName(destName) || { lat: 32.2432, lng: 77.1892 },
            estimatedCost: 500,
            travelTimeFromPrev: '1.5 hrs drive',
            duration: '2.5 hrs',
            description: `Arriving in ${destName}, parking vehicle safely, hotel check-in, hot shower, and relaxed evening stroll with dinner.`,
            imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
            recommendationReason: `Successful completion of the ${travelMode} road journey to ${destName}.`,
            isIndoor: false,
            isRainSafe: false,
            rating: 4.9
          }
        ]
      };
    }

    // Multi-Day Outbound Stages (e.g. Bangalore to Manali / Ladakh)
    if (isSouthOrigin && isNorthHimalayas) {
      if (dayNum === 1) {
        return {
          title: `${startCity} to Kolhapur / Pune: NH48 Highway Flag-off`,
          theme: `Stage 1: Highway Departure & Maharashtra Border Transit`,
          vibe: `High-octane morning departure, cruising along the golden quadrilateral, roadside coconut water and dhabas`,
          activities: [
            {
              id: `act-${dayNum}-1`,
              time: '06:00 AM',
              endTime: '08:30 AM',
              title: `${vehicleName} Inspection & Highway Flag-Off`,
              category: 'Travel',
              location: `${startCity} NH48 / Nelamangala Tollway Exit`,
              coordinates: { lat: 13.0980, lng: 77.3890 },
              estimatedCost: isBike ? 800 : 2000,
              travelTimeFromPrev: '0 min',
              duration: '2.5 hrs',
              description: `Final tyre pressure calibration, fuel tank fill-up, mounting saddlebags/gear, and hitting NH48 northbound out of ${startCity}.`,
              imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600&auto=format&fit=crop',
              recommendationReason: `Early morning start beats city traffic and sets high mileage pace on Day 1.`,
              isIndoor: false,
              isRainSafe: true,
              rating: 4.9
            },
            {
              id: `act-${dayNum}-2`,
              time: '09:00 AM',
              endTime: '10:15 AM',
              title: 'Highway Refuel & Tumkur/Chitradurga Breakfast',
              category: 'Food',
              location: 'NH48 Chitradurga Highway Corridor',
              coordinates: { lat: 14.2250, lng: 76.3980 },
              estimatedCost: 300,
              travelTimeFromPrev: '1.5 hrs riding',
              duration: '1.25 hrs',
              description: `Fuel refill and hot crispy dosas, filter coffee, and tyre inspection at a renowned highway food court.`,
              imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Classic highway refueling and energizing South Indian breakfast.',
              isIndoor: true,
              isRainSafe: true,
              rating: 4.7
            },
            {
              id: `act-${dayNum}-3`,
              time: '01:30 PM',
              endTime: '03:00 PM',
              title: 'Belagavi / Hubli Highway Dhaba Lunch Stop',
              category: 'Food',
              location: 'NH48 Karnataka-Maharashtra Border Highway Dhaba',
              coordinates: { lat: 15.8497, lng: 74.4977 },
              estimatedCost: 450,
              travelTimeFromPrev: '3 hrs riding',
              duration: '1.5 hrs',
              description: `Authentic roadside dhaba thali lunch, fresh sugarcane juice, hydration rest, and bike cooling halt.`,
              imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Mid-route sustenance and rider recovery milestone.',
              isIndoor: true,
              isRainSafe: true,
              rating: 4.8
            },
            {
              id: `act-${dayNum}-4`,
              time: '06:30 PM',
              endTime: '09:00 PM',
              title: 'Arrival in Kolhapur / Pune & Transit Rest',
              category: 'Travel',
              location: 'Kolhapur / Pune Transit Hub',
              coordinates: { lat: 16.7050, lng: 74.2433 },
              estimatedCost: 600,
              travelTimeFromPrev: '2.5 hrs riding',
              duration: '2.5 hrs',
              description: `Check into rider-friendly transit hotel, secure vehicle parking, hot refreshing shower, and authentic Kolhapuri/Maharashtrian dinner.`,
              imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'First major milestone completed on the overland route north.',
              isIndoor: true,
              isRainSafe: true,
              rating: 4.8
            }
          ]
        };
      }

      if (dayNum === 2) {
        return {
          title: 'Maharashtra to Udaipur: Western Express Highway',
          theme: 'Stage 2: Gujarat Transit & Aravalli Foothills Approach',
          vibe: 'Smooth multi-lane expressway cruising, vibrant highway dhabas, and entering Rajasthan',
          activities: [
            {
              id: `act-${dayNum}-1`,
              time: '06:30 AM',
              endTime: '09:00 AM',
              title: 'Morning Throttle onto Gujarat & Rajasthan Corridor',
              category: 'Travel',
              location: 'NH48 Vadodara-Ahmedabad Expressway Stretch',
              coordinates: { lat: 22.3072, lng: 73.1812 },
              estimatedCost: isBike ? 800 : 2000,
              travelTimeFromPrev: '0 min',
              duration: '2.5 hrs',
              description: `Early morning engine start, tank refill, and cruising past industrial corridors towards Rajasthan hills.`,
              imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Fast transit leg utilizing India’s best expressway sections.',
              isIndoor: false,
              isRainSafe: true,
              rating: 4.8
            },
            {
              id: `act-${dayNum}-2`,
              time: '09:30 AM',
              endTime: '10:30 AM',
              title: 'Highway Kathiyawadi Breakfast & Chai Stop',
              category: 'Food',
              location: 'National Highway Express Hub',
              coordinates: { lat: 23.0225, lng: 72.5714 },
              estimatedCost: 300,
              travelTimeFromPrev: '1 hr riding',
              duration: '1 hr',
              description: `Hot fafda, jalebi, masala chai, and rider hydration pause.`,
              imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Cultural culinary taste on the western highway circuit.',
              isIndoor: true,
              isRainSafe: true,
              rating: 4.7
            },
            {
              id: `act-${dayNum}-3`,
              time: '01:30 PM',
              endTime: '03:00 PM',
              title: 'Rajasthani Highway Dhaba Lunch',
              category: 'Food',
              location: 'Himmatnagar-Ratanpur Rajasthan Border Highway',
              coordinates: { lat: 23.8500, lng: 73.4000 },
              estimatedCost: 450,
              travelTimeFromPrev: '2.5 hrs riding',
              duration: '1.5 hrs',
              description: `Authentic Dal Baati Churma and sev tamatar at a traditional roadside charpai dhaba.`,
              imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Classic Indian road-trip dhaba experience.',
              isIndoor: true,
              isRainSafe: true,
              rating: 4.8
            },
            {
              id: `act-${dayNum}-4`,
              time: '06:30 PM',
              endTime: '09:00 PM',
              title: 'Arrival in Udaipur & Lakeside Relaxing Dinner',
              category: 'Travel',
              location: 'Udaipur City Center',
              coordinates: { lat: 24.5854, lng: 73.7125 },
              estimatedCost: 700,
              travelTimeFromPrev: '2.5 hrs riding',
              duration: '2.5 hrs',
              description: `Checking into hotel near Lake Pichola, bike wash/lubrication, and a soothing rooftop dinner overlooking the illuminated palaces.`,
              imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Picturesque royal halt recharging energy for northern highways.',
              isIndoor: false,
              isRainSafe: false,
              rating: 4.9
            }
          ]
        };
      }

      if (dayNum === 3) {
        return {
          title: 'Udaipur to Chandigarh Gateway: Northern Plains Route',
          theme: 'Stage 3: Jaipur Bypass & Himalayan Foothills Gateway',
          vibe: 'Long sweeping northern highways, Grand Trunk Road dhabas, and approaching the Shivalik hills',
          activities: [
            {
              id: `act-${dayNum}-1`,
              time: '06:00 AM',
              endTime: '09:00 AM',
              title: 'Early Morning Cruise along Rajasthan-Haryana Expressways',
              category: 'Travel',
              location: 'NH48 Jaipur-Delhi Western Peripheral Corridor',
              coordinates: { lat: 26.9124, lng: 75.7873 },
              estimatedCost: isBike ? 800 : 2000,
              travelTimeFromPrev: '0 min',
              duration: '3 hrs',
              description: `Cruising along Delhi-Jaipur highway bypass into Haryana, morning cool breeze, and quick fuel top-up.`,
              imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Efficient expressway transit crossing north into the foothills gateway.',
              isIndoor: false,
              isRainSafe: true,
              rating: 4.8
            },
            {
              id: `act-${dayNum}-2`,
              time: '09:30 AM',
              endTime: '10:30 AM',
              title: 'Highway Tea & Pyaz Kachori Breakfast',
              category: 'Food',
              location: 'Neemrana Highway Food Stop',
              coordinates: { lat: 27.9890, lng: 76.3860 },
              estimatedCost: 250,
              travelTimeFromPrev: '1 hr riding',
              duration: '1 hr',
              description: `Crispy Rajasthani kachoris, tea, and quick vehicle inspection.`,
              imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Fast, tasty breakfast halt.',
              isIndoor: true,
              isRainSafe: true,
              rating: 4.7
            },
            {
              id: `act-${dayNum}-3`,
              time: '01:30 PM',
              endTime: '03:00 PM',
              title: 'Murthal / Ambala Authentic Punjabi Dhaba Lunch',
              category: 'Food',
              location: 'Grand Trunk Road Murthal / Ambala Dhaba',
              coordinates: { lat: 28.9880, lng: 77.0700 },
              estimatedCost: 500,
              travelTimeFromPrev: '2.5 hrs riding',
              duration: '1.5 hrs',
              description: `Legendary tandoori stuffed parathas with fresh white butter, sweet lassi, and road traveler camaraderie.`,
              imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Iconic North Indian highway dining institution.',
              isIndoor: true,
              isRainSafe: true,
              rating: 4.9
            },
            {
              id: `act-${dayNum}-4`,
              time: '06:00 PM',
              endTime: '08:30 PM',
              title: 'Arrival in Chandigarh / Foothills Gateway & Gear Briefing',
              category: 'Travel',
              location: 'Chandigarh / Zirakpur Himalayan Gateway',
              coordinates: { lat: 30.7333, lng: 76.7794 },
              estimatedCost: 650,
              travelTimeFromPrev: '2 hrs riding',
              duration: '2.5 hrs',
              description: `Checking into hotel, final mountain gear inspection, chain lubrication, warm dinner, and rest before ascending the Himalayas.`,
              imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Strategic resting point at the base of the Himalayas.',
              isIndoor: true,
              isRainSafe: true,
              rating: 4.8
            }
          ]
        };
      }

      if (dayNum === 4 && (destClean.includes('ladakh') || destClean.includes('leh')) && outboundDays > 4) {
        return {
          title: `Chandigarh to Manali: Himalayan Gateway Stage`,
          theme: `Stage 4: Beas Valley Ride to Manali Basecamp`,
          vibe: `Winding mountain roads, Beas river rapids, and resting at the foot of Rohtang/Atal Tunnel`,
          activities: [
            {
              id: `act-${dayNum}-1`,
              time: '06:30 AM',
              endTime: '09:30 AM',
              title: 'Ascending Himachal Hills via Kiratpur-Manali Expressway',
              category: 'Travel',
              location: 'Kiratpur-Manali 4-Lane Expressway / Swarghat',
              coordinates: { lat: 31.2500, lng: 76.7000 },
              estimatedCost: isBike ? 600 : 1500,
              travelTimeFromPrev: '0 min',
              duration: '3 hrs',
              description: `Riding into the majestic Shivalik and Dhauladhar foothills on the 4-lane mountain highway.`,
              imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Crucial mountain transit connecting the plains to the high Himalayas.',
              isIndoor: false,
              isRainSafe: true,
              rating: 4.9
            },
            {
              id: `act-${dayNum}-2`,
              time: '10:00 AM',
              endTime: '11:15 AM',
              title: 'Mountain Viewpoint Chai & Pandoh Dam Stop',
              category: 'Sightseeing',
              location: 'Pandoh Dam / Mandi Ghat Waypoint',
              coordinates: { lat: 31.6700, lng: 77.0100 },
              estimatedCost: 200,
              travelTimeFromPrev: '45 min ride',
              duration: '1.25 hrs',
              description: `Stopping beside the turquoise Beas river reservoir for hot ginger tea and panoramic photo shoots.`,
              imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Classic Himalayan photo spot along the river corridor.',
              isIndoor: false,
              isRainSafe: false,
              rating: 4.8
            },
            {
              id: `act-${dayNum}-3`,
              time: '01:30 PM',
              endTime: '03:00 PM',
              title: 'Riverside Himachali Trout & Siddu Lunch in Kullu',
              category: 'Food',
              location: 'Kullu Valley Beas Riverbank Cafe',
              coordinates: { lat: 31.9579, lng: 77.1095 },
              estimatedCost: 550,
              travelTimeFromPrev: '1.5 hrs ride',
              duration: '1.5 hrs',
              description: `Authentic traditional Siddu with ghee, fresh river trout/dal, and riverside apple orchard views.`,
              imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Iconic local Himachali mountain meal.',
              isIndoor: true,
              isRainSafe: true,
              rating: 4.9
            },
            {
              id: `act-${dayNum}-4`,
              time: '05:30 PM',
              endTime: '08:30 PM',
              title: `Arrival in Manali Basecamp & High Altitude Check`,
              category: 'Travel',
              location: 'Manali / Old Manali Basecamp',
              coordinates: { lat: 32.2432, lng: 77.1892 },
              estimatedCost: 600,
              travelTimeFromPrev: '1.5 hrs ride',
              duration: '3 hrs',
              description: `Checking into hotel in Manali, mountain bike inspection, warm dinner, and rest before crossing high Himalayan passes.`,
              imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Essential mountain acclimatization and staging point for Ladakh.',
              isIndoor: true,
              isRainSafe: true,
              rating: 4.9
            }
          ]
        };
      }

      if (dayNum === 5 && (destClean.includes('ladakh') || destClean.includes('leh')) && outboundDays > 4) {
        return {
          title: `Manali to Jispa / Keylong: Crossing Atal Tunnel into Lahaul`,
          theme: `Stage 5: High Altitude Lahaul Valley Expedition`,
          vibe: `Atal Tunnel transit, roaring Chandra-Bhaga rivers, snow peaks, and high mountain camping`,
          activities: [
            {
              id: `act-${dayNum}-1`,
              time: '07:00 AM',
              endTime: '09:30 AM',
              title: 'Atal Tunnel Crossing & Sissu Waterfall Halt',
              category: 'Travel',
              location: 'Atal Tunnel North Portal / Sissu, Lahaul',
              coordinates: { lat: 32.4800, lng: 77.1200 },
              estimatedCost: isBike ? 500 : 1200,
              travelTimeFromPrev: '0 min',
              duration: '2.5 hrs',
              description: `Riding through the engineering marvel of Atal Tunnel (9.02 km at 3,048m) and emerging into the breathtaking rugged Lahaul valley with views of Sissu Waterfall.`,
              imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Spectacular gateway into the trans-Himalayan landscape.',
              isIndoor: false,
              isRainSafe: false,
              rating: 5.0
            },
            {
              id: `act-${dayNum}-2`,
              time: '10:00 AM',
              endTime: '11:30 AM',
              title: 'Tandi Chandra-Bhaga Confluence & Fuel Top-up',
              category: 'Travel',
              location: 'Tandi Petrol Pump / River Confluence',
              coordinates: { lat: 32.5500, lng: 76.9700 },
              estimatedCost: isBike ? 800 : 2500,
              travelTimeFromPrev: '45 min ride',
              duration: '1.5 hrs',
              description: `Sacred confluence of Chandra & Bhaga rivers and full tank fuel top-up at the iconic last regular petrol station.`,
              imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Critical fuel stop and historic Himalayan waypoint.',
              isIndoor: false,
              isRainSafe: true,
              rating: 4.8
            },
            {
              id: `act-${dayNum}-3`,
              time: '01:00 PM',
              endTime: '02:30 PM',
              title: 'Lahauli Thukpa & Momos Lunch in Keylong',
              category: 'Food',
              location: 'Keylong High Mountain Cafe',
              coordinates: { lat: 32.5710, lng: 77.0320 },
              estimatedCost: 350,
              travelTimeFromPrev: '30 min ride',
              duration: '1.5 hrs',
              description: `Steaming hot Tibetan noodle thukpa, spicy chutney momos, and hot butter tea.`,
              imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Warming mountain meal in the heart of Lahaul.',
              isIndoor: true,
              isRainSafe: true,
              rating: 4.8
            },
            {
              id: `act-${dayNum}-4`,
              time: '05:30 PM',
              endTime: '08:30 PM',
              title: 'Arrival in Jispa Riverside Campsite & Bonfire Briefing',
              category: 'Travel',
              location: 'Bhaga Riverfront Camp, Jispa (3,200m)',
              coordinates: { lat: 32.6390, lng: 77.1850 },
              estimatedCost: 700,
              travelTimeFromPrev: '1 hr ride',
              duration: '3 hrs',
              description: `Riverside alpine stay, motorcycle check, starlit dinner by the Bhaga river, and acclimatization sleep.`,
              imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Unforgettable mountain wilderness overnight halt.',
              isIndoor: false,
              isRainSafe: true,
              rating: 4.9
            }
          ]
        };
      }

      if (dayNum === outboundDays || (dayNum === 4 && (!destClean.includes('ladakh') && !destClean.includes('leh')))) {
        const isLadakhFinal = destClean.includes('ladakh') || destClean.includes('leh');
        return {
          title: isLadakhFinal
            ? `Jispa to Leh: High Passes (Baralacha La, Tanglang La & More Plains)`
            : `Chandigarh to ${destName}: Himalayan Ghats & Mountain Ascent`,
          theme: isLadakhFinal ? `The Ultimate High Pass Expedition to Leh (3,500m)` : `Final Ascent: Beas Valley & Arrival in ${destName}`,
          vibe: isLadakhFinal
            ? `Epic mountain passes (4,890m to 5,328m), surreal moonscapes of More Plains, and triumphant entry into Leh`
            : `Winding mountain passes, Beas river rapids, pine-scented mountain air, and triumphant entry into ${destName}`,
          activities: isLadakhFinal ? [
            {
              id: `act-${dayNum}-1`,
              time: '06:00 AM',
              endTime: '09:30 AM',
              title: 'Crossing Baralacha La Pass (4,890m) & Deepak Tal',
              category: 'Travel',
              location: 'Baralacha La High Mountain Pass',
              coordinates: { lat: 32.7567, lng: 77.4206 },
              estimatedCost: isBike ? 600 : 1500,
              travelTimeFromPrev: '0 min',
              duration: '3.5 hrs',
              description: `Early morning throttle across Suraj Tal & Deepak Tal lakes, ascending the dramatic snow walls of Baralacha La pass.`,
              imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'One of the most thrilling high altitude mountain passes in the world.',
              isIndoor: false,
              isRainSafe: false,
              rating: 5.0
            },
            {
              id: `act-${dayNum}-2`,
              time: '10:30 AM',
              endTime: '12:30 PM',
              title: 'Gata Loops (21 Hairpin Bends) & Nakee La (4,739m)',
              category: 'Travel',
              location: 'Gata Loops / Nakee La Highway Pass',
              coordinates: { lat: 32.9500, lng: 77.5800 },
              estimatedCost: 200,
              travelTimeFromPrev: '1 hr ride',
              duration: '2 hrs',
              description: `Negotiating the legendary 21 hairpin bends of Gata Loops and crossing Nakee La and Lachung La into Ladakh.`,
              imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Iconic milestone on the Manali-Leh highway.',
              isIndoor: false,
              isRainSafe: false,
              rating: 4.9
            },
            {
              id: `act-${dayNum}-3`,
              time: '01:00 PM',
              endTime: '03:00 PM',
              title: 'Cruising the More Plains (40 km High Altitude Plateau) & Pang Lunch',
              category: 'Food',
              location: 'More Plains & Pang Military Rest Camp',
              coordinates: { lat: 33.1500, lng: 77.6500 },
              estimatedCost: 450,
              travelTimeFromPrev: '1.5 hrs ride',
              duration: '2 hrs',
              description: `Riding across the astonishing flat high-altitude More Plains plateau at 4,000m altitude and hot Maggi/dal-chawal lunch in Pang.`,
              imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Surreal geological wonder and hearty mountain meal.',
              isIndoor: true,
              isRainSafe: true,
              rating: 4.9
            },
            {
              id: `act-${dayNum}-4`,
              time: '05:30 PM',
              endTime: '08:30 PM',
              title: 'Tanglang La Pass (5,328m) & Triumphant Arrival in Leh',
              category: 'Travel',
              location: 'Leh Main Market / Shanti Stupa Valley (3,500m)',
              coordinates: { lat: 34.1526, lng: 77.5771 },
              estimatedCost: 700,
              travelTimeFromPrev: '2.5 hrs ride',
              duration: '3 hrs',
              description: `Conquering Tanglang La (the 2nd highest motorable pass), descending into the Indus River valley, and celebratory arrival in Leh on ${travelMode}! Check into hotel, hot shower, and relaxed dinner.`,
              imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
              recommendationReason: `Triumphant overland arrival completing the great journey from ${startCity} to Leh!`,
              isIndoor: false,
              isRainSafe: false,
              rating: 5.0
            }
          ] : [
            {
              id: `act-${dayNum}-1`,
              time: '06:30 AM',
              endTime: '09:30 AM',
              title: 'Ascending Himachal Hills via Kiratpur-Manali Highway',
              category: 'Travel',
              location: 'Kiratpur-Manali 4-Lane Expressway / Swarghat',
              coordinates: { lat: 31.2500, lng: 76.7000 },
              estimatedCost: isBike ? 600 : 1500,
              travelTimeFromPrev: '0 min',
              duration: '3 hrs',
              description: `Riding into the majestic Shivalik and Dhauladhar foothills, crossing scenic hill tunnels, and breathing crisp pine mountain air.`,
              imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Breathtaking mountain riding on one of India’s most scenic hill highways.',
              isIndoor: false,
              isRainSafe: true,
              rating: 4.9
            },
            {
              id: `act-${dayNum}-2`,
              time: '10:00 AM',
              endTime: '11:15 AM',
              title: 'Mountain Viewpoint Chai & Pandoh Dam Stop',
              category: 'Sightseeing',
              location: 'Pandoh Dam / Mandi Ghat Waypoint',
              coordinates: { lat: 31.6700, lng: 77.0100 },
              estimatedCost: 200,
              travelTimeFromPrev: '45 min ride',
              duration: '1.25 hrs',
              description: `Stopping beside the turquoise Beas river reservoir for hot ginger tea and panoramic photo shoots.`,
              imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Classic Himalayan photo spot along the river corridor.',
              isIndoor: false,
              isRainSafe: false,
              rating: 4.8
            },
            {
              id: `act-${dayNum}-3`,
              time: '01:30 PM',
              endTime: '03:00 PM',
              title: 'Riverside Himachali Trout & Siddu Lunch in Kullu',
              category: 'Food',
              location: 'Kullu Valley Beas Riverbank Cafe',
              coordinates: { lat: 31.9579, lng: 77.1095 },
              estimatedCost: 550,
              travelTimeFromPrev: '1.5 hrs ride',
              duration: '1.5 hrs',
              description: `Authentic traditional Siddu with ghee, fresh river trout/dal, and riverside apple orchard views.`,
              imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop',
              recommendationReason: 'Iconic local Himachali mountain meal.',
              isIndoor: true,
              isRainSafe: true,
              rating: 4.9
            },
            {
              id: `act-${dayNum}-4`,
              time: '05:30 PM',
              endTime: '08:30 PM',
              title: `Triumphant Arrival in ${destName} & Hotel Check-in`,
              category: 'Travel',
              location: `${destName} Old Town / Mall Road`,
              coordinates: findCoordsByName(destName) || { lat: 32.2432, lng: 77.1892 },
              estimatedCost: 600,
              travelTimeFromPrev: '1.5 hrs ride',
              duration: '3 hrs',
              description: `Rolling into ${destName} on ${travelMode}, celebrating completion of the great overland stage from ${startCity}, check-in, and relaxed dinner.`,
              imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
              recommendationReason: `Arrival milestone at your dream destination: ${destName}.`,
              isIndoor: false,
              isRainSafe: false,
              rating: 5.0
            }
          ]
        };
      }
    }
  }

  // Return Stages (Inbound)
  if (dayNum > outboundDays + coreDestDays) {
    const returnStageIndex = dayNum - (outboundDays + coreDestDays);
    const isFinalReturnDay = dayNum === totalDays;

    return {
      title: isFinalReturnDay
        ? `Final Stage: Highway Return to ${startCity}`
        : `Return Stage ${returnStageIndex}: Cruising Southbound Towards ${startCity}`,
      theme: isFinalReturnDay ? `Homeward Arrival in ${startCity}` : `Scenic Return Circuit Transit`,
      vibe: `Reflective highway cruising, open roads, souvenir stops, and safe return home`,
      activities: [
        {
          id: `act-${dayNum}-1`,
          time: '07:00 AM',
          endTime: '09:30 AM',
          title: `Morning Return Highway Leg Start`,
          category: 'Travel',
          location: 'National Return Highway Corridor',
          coordinates: { lat: 20.0, lng: 76.0 },
          estimatedCost: isBike ? 700 : 1800,
          travelTimeFromPrev: '0 min',
          duration: '2.5 hrs',
          description: `Morning vehicle check, tank refuel, and steady cruising on the return highway stretch.`,
          imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600&auto=format&fit=crop',
          recommendationReason: 'Smooth early return leg beating highway congestion.',
          isIndoor: false,
          isRainSafe: true,
          rating: 4.8
        },
        {
          id: `act-${dayNum}-2`,
          time: '10:00 AM',
          endTime: '11:15 AM',
          title: 'Highway Tea & Regional Refreshment Stop',
          category: 'Food',
          location: 'Highway Waypoint Rest Area',
          coordinates: { lat: 18.5, lng: 75.5 },
          estimatedCost: 300,
          travelTimeFromPrev: '1 hr riding',
          duration: '1.25 hrs',
          description: `Mid-morning tea break, stretching legs, and fuel top-up.`,
          imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop',
          recommendationReason: 'Rider alertness and hydration.',
          isIndoor: true,
          isRainSafe: true,
          rating: 4.7
        },
        {
          id: `act-${dayNum}-3`,
          time: '01:30 PM',
          endTime: '03:00 PM',
          title: 'Highway Dhaba Lunch & Route Milestone',
          category: 'Food',
          location: 'National Highway Food Hub',
          coordinates: { lat: 16.5, lng: 75.0 },
          estimatedCost: 450,
          travelTimeFromPrev: '2.5 hrs riding',
          duration: '1.5 hrs',
          description: `Hearty lunch thali, cold lassi/tender coconut, and vehicle check.`,
          imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop',
          recommendationReason: 'Traditional highway meal before the final stretch.',
          isIndoor: true,
          isRainSafe: true,
          rating: 4.8
        },
        {
          id: `act-${dayNum}-4`,
          time: '06:00 PM',
          endTime: '08:30 PM',
          title: isFinalReturnDay ? `Safe Arrival Back Home in ${startCity}` : 'Evening Transit Lodge & Rest',
          category: 'Travel',
          location: isFinalReturnDay ? `${startCity} Home / City Center` : 'Intermediate Transit Stay',
          coordinates: isFinalReturnDay ? (findCoordsByName(startCity) || { lat: 12.9716, lng: 77.5946 }) : { lat: 15.0, lng: 75.0 },
          estimatedCost: 500,
          travelTimeFromPrev: '2 hrs riding',
          duration: '2.5 hrs',
          description: isFinalReturnDay
            ? `Safely entering ${startCity}, completing the epic round-trip ${travelMode} expedition, unpack, and celebrate the unforgettable journey!`
            : `Checking into transit lodge, securing vehicle, hot dinner, and rest for the next day's ride.`,
          imageUrl: isFinalReturnDay ? 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=600&auto=format&fit=crop',
          recommendationReason: isFinalReturnDay ? `Triumphant return home with lifelong road-trip memories.` : `Well-deserved rest on the return circuit.`,
          isIndoor: isFinalReturnDay ? false : true,
          isRainSafe: true,
          rating: 5.0
        }
      ]
    };
  }

  // Fallback generic stage
  return {
    title: `Overland Road Trip: En-Route to ${destName}`,
    theme: `Highway Touring on ${travelMode}`,
    vibe: `Open highways, scenic vistas, and steady riding progress`,
    activities: [
      {
        id: `act-${dayNum}-1`,
        time: '07:00 AM',
        endTime: '09:30 AM',
        title: `Morning Highway Stage`,
        category: 'Travel',
        location: `Highway Route to ${destName}`,
        coordinates: { lat: 20.0, lng: 76.0 },
        estimatedCost: isBike ? 600 : 1500,
        travelTimeFromPrev: '0 min',
        duration: '2.5 hrs',
        description: `Hitting the highway, steady cruising, and scenic open landscape vistas.`,
        imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600&auto=format&fit=crop',
        recommendationReason: 'Highway touring progress.',
        isIndoor: false,
        isRainSafe: true,
        rating: 4.8
      },
      {
        id: `act-${dayNum}-2`,
        time: '10:00 AM',
        endTime: '11:15 AM',
        title: 'Highway Refuel & Breakfast Stop',
        category: 'Food',
        location: 'Highway Waypoint',
        coordinates: { lat: 21.0, lng: 76.5 },
        estimatedCost: 300,
        travelTimeFromPrev: '1 hr',
        duration: '1.25 hrs',
        description: `Fuel refill and fresh breakfast at a roadside eatery.`,
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop',
        recommendationReason: 'Essential road sustenance.',
        isIndoor: true,
        isRainSafe: true,
        rating: 4.7
      },
      {
        id: `act-${dayNum}-3`,
        time: '01:30 PM',
        endTime: '03:00 PM',
        title: 'Roadside Dhaba Lunch',
        category: 'Food',
        location: 'Midway Highway Dhaba',
        coordinates: { lat: 22.0, lng: 77.0 },
        estimatedCost: 400,
        travelTimeFromPrev: '2 hrs',
        duration: '1.5 hrs',
        description: `Hot lunch thali, cold beverages, and relaxing under the shade.`,
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop',
        recommendationReason: 'Delicious highway food stop.',
        isIndoor: true,
        isRainSafe: true,
        rating: 4.8
      },
      {
        id: `act-${dayNum}-4`,
        time: '06:00 PM',
        endTime: '08:30 PM',
        title: 'Stage Check-In & Rest',
        category: 'Travel',
        location: 'Overnight Transit Lodge',
        coordinates: { lat: 23.0, lng: 77.5 },
        estimatedCost: 500,
        travelTimeFromPrev: '2 hrs',
        duration: '2.5 hrs',
        description: `Check into hotel, vehicle safe parking, hot shower, and dinner.`,
        imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=600&auto=format&fit=crop',
        recommendationReason: 'Rest and recovery.',
        isIndoor: true,
        isRainSafe: true,
        rating: 4.8
      }
    ]
  };
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

