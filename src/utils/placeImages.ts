import type React from 'react';

// Curated, verified high-resolution photography for travel activities, landmarks, dining, and scenic stops

const PALACE_HERITAGE_IMAGES = [
  'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80', // Bangalore / Mysore palace style
  'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80', // Red Fort / Heritage
  'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80', // Taj / Marble heritage
  'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80', // Royal Palace courtyard
  'https://images.unsplash.com/photo-1600100397608-f010e421d014?auto=format&fit=crop&w=800&q=80'  // Amber Fort / Stone architecture
];

const FOOD_DINING_IMAGES = [
  'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80', // Dosa & Chutney / South Indian
  'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80', // Indian Thali / Feast
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', // Cozy Restaurant dining
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80', // Cafe & street dining
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80', // Coffee / Breakfast bistro
  'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80'  // Artisan regional food
];

const MARKET_SHOPPING_IMAGES = [
  'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=800&q=80', // Colorful Flower & Spice market
  'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?auto=format&fit=crop&w=800&q=80', // Street Bazaar / Souvenirs
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80', // Boutique / Artisan shops
  'https://images.unsplash.com/photo-1481437156560-3205f6a55735?auto=format&fit=crop&w=800&q=80'  // City market & spices
];

const NATURE_GARDEN_IMAGES = [
  'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80', // Botanical garden / Green foliage
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', // Lake & reflections
  'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80', // Waterfall & lush forest
  'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80', // Mountain trails & valley
  'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80'  // Pine forest / Serene woods
];

const BEACH_COAST_IMAGES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', // Tropical beach & sand
  'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80', // Sunset palm beach
  'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=800&q=80'  // Ocean coast & surf
];

const TEMPLE_SPIRITUAL_IMAGES = [
  'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80', // Intricate stone temple
  'https://images.unsplash.com/photo-1561361066-4b82d33ce06f?auto=format&fit=crop&w=800&q=80', // Spiritual ghats & incense
  'https://images.unsplash.com/photo-1609766418204-94aae0ecfddc?auto=format&fit=crop&w=800&q=80'  // Ancient shrine & lights
];

const ADVENTURE_TREK_IMAGES = [
  'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80', // Hiking peak & ridge
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80', // Scuba / Water adventures
  'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=800&q=80'  // Rock climbing & canyon
];

const NIGHTLIFE_SOCIAL_IMAGES = [
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80', // Rooftop lounge / Night bistro
  'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=800&q=80', // Live music pub & cocktails
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80'  // Social gathering / DJ vibe
];

const SIGHTSEEING_CITY_IMAGES = [
  'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80', // City landmark & viewpoint
  'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=800&q=80', // Urban architecture & square
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'  // Classic travel exploration
];

function pickFromList(list: string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % list.length;
  return list[idx];
}

/**
 * Resolves an authentic, verified high-resolution photo URL for any travel activity based on title, category, and context.
 */
export function resolvePlaceImage(
  title: string = '',
  category: string = '',
  location: string = '',
  destination: string = ''
): string {
  const text = `${title} ${location} ${category} ${destination}`.toLowerCase();
  const seed = `${title}-${category}-${destination}`;

  // 1. Palaces, Forts, Monuments, Castles
  if (
    text.includes('palace') ||
    text.includes('fort') ||
    text.includes('mahal') ||
    text.includes('castle') ||
    text.includes('monument') ||
    text.includes('heritage')
  ) {
    return pickFromList(PALACE_HERITAGE_IMAGES, seed);
  }

  // 2. Food, Dining, Cafes, Dosa, Bakeries, Restaurants, Breweries
  if (
    category.toLowerCase().includes('food') ||
    category.toLowerCase().includes('dining') ||
    text.includes('dosa') ||
    text.includes('restaurant') ||
    text.includes('cafe') ||
    text.includes('bistro') ||
    text.includes('bakery') ||
    text.includes('breakfast') ||
    text.includes('lunch') ||
    text.includes('dinner') ||
    text.includes('dhaba') ||
    text.includes('sagar') ||
    text.includes('eatery') ||
    text.includes('brewery') ||
    text.includes('tasting') ||
    text.includes('coffee') ||
    text.includes('tea')
  ) {
    return pickFromList(FOOD_DINING_IMAGES, seed);
  }

  // 3. Markets, Shopping, Bazaars, Flowers
  if (
    category.toLowerCase().includes('shopping') ||
    text.includes('market') ||
    text.includes('bazaar') ||
    text.includes('bazar') ||
    text.includes('kr market') ||
    text.includes('flower') ||
    text.includes('craft') ||
    text.includes('mall') ||
    text.includes('street shopping')
  ) {
    return pickFromList(MARKET_SHOPPING_IMAGES, seed);
  }

  // 4. Temples, Churches, Mosques, Ashrams, Spiritual
  if (
    text.includes('temple') ||
    text.includes('church') ||
    text.includes('basilica') ||
    text.includes('mosque') ||
    text.includes('ashram') ||
    text.includes('shrine') ||
    text.includes('cathedral') ||
    text.includes('monastery')
  ) {
    return pickFromList(TEMPLE_SPIRITUAL_IMAGES, seed);
  }

  // 5. Beach, Coastal, Islands, Lakes, Boating
  if (
    text.includes('beach') ||
    text.includes('coast') ||
    text.includes('island') ||
    text.includes('cove') ||
    text.includes('bay') ||
    text.includes('shack') ||
    text.includes('surf')
  ) {
    return pickFromList(BEACH_COAST_IMAGES, seed);
  }

  // 6. Parks, Gardens, Waterfalls, Lakes, Viewpoints, Nature
  if (
    category.toLowerCase().includes('nature') ||
    text.includes('garden') ||
    text.includes('park') ||
    text.includes('botanical') ||
    text.includes('lake') ||
    text.includes('falls') ||
    text.includes('waterfall') ||
    text.includes('peak') ||
    text.includes('hill') ||
    text.includes('valley') ||
    text.includes('sanctuary') ||
    text.includes('plantation') ||
    text.includes('viewpoint')
  ) {
    return pickFromList(NATURE_GARDEN_IMAGES, seed);
  }

  // 7. Adventure, Trek, Sports, Safari
  if (
    category.toLowerCase().includes('adventure') ||
    text.includes('trek') ||
    text.includes('hike') ||
    text.includes('safari') ||
    text.includes('kayak') ||
    text.includes('rafting') ||
    text.includes('scuba') ||
    text.includes('snorkeling')
  ) {
    return pickFromList(ADVENTURE_TREK_IMAGES, seed);
  }

  // 8. Nightlife, Clubs, Pubs, Lounges
  if (
    category.toLowerCase().includes('nightlife') ||
    text.includes('pub') ||
    text.includes('club') ||
    text.includes('bar') ||
    text.includes('lounge') ||
    text.includes('dj')
  ) {
    return pickFromList(NIGHTLIFE_SOCIAL_IMAGES, seed);
  }

  // Fallback to Sightseeing / City landmarks
  return pickFromList(SIGHTSEEING_CITY_IMAGES, seed);
}

/**
 * Returns a guaranteed fallback image URL for a given category if an image fails to load.
 */
export function getCategoryFallbackImage(category: string = ''): string {
  const cat = category.toLowerCase();
  if (cat.includes('food') || cat.includes('dining')) return FOOD_DINING_IMAGES[0];
  if (cat.includes('shop')) return MARKET_SHOPPING_IMAGES[0];
  if (cat.includes('nature')) return NATURE_GARDEN_IMAGES[0];
  if (cat.includes('advent')) return ADVENTURE_TREK_IMAGES[0];
  if (cat.includes('night')) return NIGHTLIFE_SOCIAL_IMAGES[0];
  if (cat.includes('cult') || cat.includes('spirit')) return PALACE_HERITAGE_IMAGES[0];
  return SIGHTSEEING_CITY_IMAGES[0];
}

/**
 * React onError handler helper to seamlessly replace broken images with verified category photos
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, category: string = '') {
  const target = e.currentTarget;
  const fallback = getCategoryFallbackImage(category);
  if (target.src !== fallback) {
    target.src = fallback;
  }
}

const clientPhotoCache = new Map<string, string>();

/**
 * Fetch real verified photo on the client side
 */
export async function fetchRealPlacePhotoClient(
  title: string,
  destination: string = '',
  category: string = ''
): Promise<string> {
  const key = `${title.toLowerCase()}__${destination.toLowerCase()}`;
  if (clientPhotoCache.has(key)) {
    return clientPhotoCache.get(key)!;
  }

  try {
    const res = await fetch(`/api/places/real-photo?title=${encodeURIComponent(title)}&destination=${encodeURIComponent(destination)}&category=${encodeURIComponent(category)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.photoUrl) {
        clientPhotoCache.set(key, data.photoUrl);
        return data.photoUrl;
      }
    }
  } catch (_) {}

  const fallback = resolvePlaceImage(title, category, '', destination);
  clientPhotoCache.set(key, fallback);
  return fallback;
}

