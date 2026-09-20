import { Trip } from '../types';

export interface TravelDNAScores {
  adventure: number;
  nature: number;
  food: number;
  culture: number;
  photography: number;
  nightlife: number;
  relaxation: number;
  luxury: number;
}

export interface TravelArchetype {
  title: string;
  description: string;
  primaryTrait: keyof TravelDNAScores;
  secondaryTrait: keyof TravelDNAScores;
}

export interface TravelDNAAnalysis {
  hasCompletedTrips: boolean;
  completedTripsCount: number;
  scores: TravelDNAScores;
  archetype: TravelArchetype;
  preferences: {
    transport: string;
    pace: string;
    budget: string;
    accommodation: string;
  };
}

const DEFAULT_ARCHETYPE: TravelArchetype = {
  title: 'Global Explorer',
  description: 'Curious voyager driven to experience diverse cultures, scenic landscapes, and enriching horizons across the globe.',
  primaryTrait: 'adventure',
  secondaryTrait: 'culture'
};

export function calculateTravelDNA(completedTrips: Trip[]): TravelDNAAnalysis {
  if (!completedTrips || completedTrips.length === 0) {
    return {
      hasCompletedTrips: false,
      completedTripsCount: 0,
      scores: {
        adventure: 0,
        nature: 0,
        food: 0,
        culture: 0,
        photography: 0,
        nightlife: 0,
        relaxation: 0,
        luxury: 0
      },
      archetype: DEFAULT_ARCHETYPE,
      preferences: {
        transport: 'Road trips (Car/Bike)',
        pace: 'Balanced',
        budget: 'Flexible',
        accommodation: 'Homestays & Boutique Stays'
      }
    };
  }

  const raw: Record<keyof TravelDNAScores, number> = {
    adventure: 0,
    nature: 0,
    food: 0,
    culture: 0,
    photography: 0,
    nightlife: 0,
    relaxation: 0,
    luxury: 0
  };

  const transportCounts: Record<string, number> = {};
  const paceCounts: Record<string, number> = {};
  const budgetCounts: Record<string, number> = {};
  const stayCounts: Record<string, number> = {};

  completedTrips.forEach((trip) => {
    // 1. Travel styles from preferences
    const styles = trip.preferences?.styles || [];
    styles.forEach((s) => {
      const style = (s || '').toLowerCase();
      if (style.includes('adventure')) raw.adventure += 24;
      if (style.includes('nature')) raw.nature += 24;
      if (style.includes('food')) raw.food += 24;
      if (style.includes('culture') || style.includes('spiritual')) raw.culture += 24;
      if (style.includes('sightseeing')) {
        raw.culture += 12;
        raw.photography += 14;
      }
      if (style.includes('photography')) raw.photography += 24;
      if (style.includes('nightlife')) raw.nightlife += 24;
      if (style.includes('relaxation')) raw.relaxation += 24;
      if (style.includes('luxury')) raw.luxury += 24;
      if (style.includes('backpacking')) {
        raw.adventure += 18;
        raw.culture += 10;
      }
      if (style.includes('hidden gems')) {
        raw.adventure += 14;
        raw.photography += 14;
        raw.nature += 10;
      }
      if (style.includes('shopping')) {
        raw.luxury += 12;
        raw.culture += 8;
      }
    });

    // 2. Budget tier
    const budget = trip.budgetTier || 'Moderate';
    budgetCounts[budget] = (budgetCounts[budget] || 0) + 1;
    if (budget === 'Luxury') {
      raw.luxury += 25;
      raw.relaxation += 10;
    } else if (budget === 'Premium') {
      raw.luxury += 15;
      raw.relaxation += 6;
    } else if (budget === 'Budget') {
      raw.adventure += 12;
    }

    // 3. Travel pace
    if (trip.preferences?.pace) {
      paceCounts[trip.preferences.pace] = (paceCounts[trip.preferences.pace] || 0) + 1;
      if (trip.preferences.pace === 'Packed') raw.adventure += 10;
      if (trip.preferences.pace === 'Relaxed') raw.relaxation += 12;
    }

    // 4. Travel mode
    if (trip.travelMode) {
      transportCounts[trip.travelMode] = (transportCounts[trip.travelMode] || 0) + 1;
      const tm = trip.travelMode.toLowerCase();
      if (tm.includes('bike') || tm.includes('road') || tm.includes('car')) {
        raw.adventure += 8;
      }
    }

    // 5. Destination keywords
    const dest = `${trip.destination || ''} ${trip.destinationStateOrCountry || ''}`.toLowerCase();
    if (/mountain|himalaya|alps|hill|peak|trek|summit|pass|valley|canyon/i.test(dest)) {
      raw.adventure += 14;
      raw.nature += 14;
    }
    if (/beach|coast|island|sea|ocean|bay|reef|cove/i.test(dest)) {
      raw.relaxation += 14;
      raw.nature += 10;
    }
    if (/temple|fort|palace|heritage|historic|ancient|museum|ruins/i.test(dest)) {
      raw.culture += 14;
    }
    if (/forest|jungle|national park|wildlife|safari|reserve/i.test(dest)) {
      raw.nature += 16;
      raw.adventure += 10;
    }

    // 6. Activities & Days
    trip.days?.forEach((day) => {
      day.activities?.forEach((act) => {
        const cat = (act.category || '').toLowerCase();
        const text = `${act.title || ''} ${act.description || ''} ${(act.tags || []).join(' ')}`.toLowerCase();

        // Category bonuses
        if (cat.includes('adventure') || cat.includes('sport') || cat.includes('outdoor')) raw.adventure += 8;
        if (cat.includes('nature') || cat.includes('park') || cat.includes('wildlife')) raw.nature += 8;
        if (cat.includes('food') || cat.includes('dining') || cat.includes('culinary')) raw.food += 8;
        if (cat.includes('culture') || cat.includes('historic') || cat.includes('heritage') || cat.includes('sightseeing')) raw.culture += 8;
        if (cat.includes('photo') || cat.includes('viewpoint') || cat.includes('scenic')) raw.photography += 8;
        if (cat.includes('night') || cat.includes('club') || cat.includes('pub') || cat.includes('bar')) raw.nightlife += 8;
        if (cat.includes('relax') || cat.includes('wellness') || cat.includes('spa')) raw.relaxation += 8;

        // Content keywords
        if (/hike|trek|climb|rafting|surf|scuba|biking|kayak|safari|paragliding/i.test(text)) {
          raw.adventure += 6;
        }
        if (/waterfall|lake|forest|trail|valley|canyon|sunset|sunrise|flora|wildlife/i.test(text)) {
          raw.nature += 5;
          raw.photography += 4;
        }
        if (/street food|market|tasting|cuisine|chef|dinner|bakery|cafe|brewery|wine|dessert/i.test(text)) {
          raw.food += 6;
        }
        if (/temple|palace|museum|fort|cathedral|church|ruins|history|monument|gallery|folklore/i.test(text)) {
          raw.culture += 6;
        }
        if (/viewpoint|panoramic|scenic|golden hour|mirador|overlook|vista|skyline/i.test(text)) {
          raw.photography += 6;
        }
        if (/cocktail|lounge|live music|rooftop|club|party|dj|nightclub|pub crawl/i.test(text)) {
          raw.nightlife += 6;
        }
        if (/spa|massage|hammock|hot spring|resort|beach lounger|meditation|sauna|unwind/i.test(text)) {
          raw.relaxation += 6;
        }
        if (/fine dining|michelin|private yacht|charter|vip|helicopter|luxury stay/i.test(text)) {
          raw.luxury += 8;
        }
      });

      // Suggested stays
      const stay = day.suggestedStay;
      if (stay) {
        stayCounts[stay.category] = (stayCounts[stay.category] || 0) + 1;
        if (stay.category === 'Luxury Hotel' || stay.category === 'Resort') {
          raw.luxury += 10;
          raw.relaxation += 6;
        } else if (stay.category === 'Eco-Lodge') {
          raw.nature += 10;
          raw.adventure += 5;
        } else if (stay.category === 'Homestay / Villa') {
          raw.culture += 6;
          raw.relaxation += 5;
        } else if (stay.category === 'Hostel / Budget') {
          raw.adventure += 8;
        }
      }
    });

    // Check general hotel recommendations
    trip.hotelRecommendations?.forEach((h) => {
      stayCounts[h.category] = (stayCounts[h.category] || 0) + 1;
      if (h.category === 'Luxury Hotel' || h.category === 'Resort') {
        raw.luxury += 8;
      }
    });
  });

  // Calculate scores normalized to 0-100%
  const traitKeys: (keyof TravelDNAScores)[] = [
    'adventure',
    'nature',
    'food',
    'culture',
    'photography',
    'nightlife',
    'relaxation',
    'luxury'
  ];

  const maxRaw = Math.max(...traitKeys.map((k) => raw[k]));
  const scores: TravelDNAScores = {
    adventure: 0,
    nature: 0,
    food: 0,
    culture: 0,
    photography: 0,
    nightlife: 0,
    relaxation: 0,
    luxury: 0
  };

  if (maxRaw > 0) {
    traitKeys.forEach((k) => {
      const ratio = raw[k] / maxRaw;
      // Scale: highest trait lands in 85-98%, moderate traits 45-75%, baseline traits 15-35%
      const calculated = Math.round(18 + ratio * 78);
      scores[k] = Math.min(98, Math.max(15, calculated));
    });
  } else {
    traitKeys.forEach((k) => {
      scores[k] = 50;
    });
  }

  // Sort traits to find primary and secondary
  const sortedTraits = [...traitKeys].sort((a, b) => scores[b] - scores[a]);
  const primary = sortedTraits[0];
  const secondary = sortedTraits[1];

  const archetype = getArchetype(primary, secondary);

  // Derived preferences
  const topTransport = getTopKey(transportCounts) || 'Road trips (Car/Bike)';
  const topPace = getTopKey(paceCounts) || 'Balanced';
  const topBudget = getTopKey(budgetCounts) || 'Flexible';
  const topStay = getTopKey(stayCounts) || 'Homestays & Boutique Stays';

  return {
    hasCompletedTrips: true,
    completedTripsCount: completedTrips.length,
    scores,
    archetype,
    preferences: {
      transport: topTransport,
      pace: topPace,
      budget: topBudget,
      accommodation: topStay
    }
  };
}

function getTopKey(record: Record<string, number>): string | null {
  let topKey: string | null = null;
  let maxVal = 0;
  for (const [k, v] of Object.entries(record)) {
    if (v > maxVal) {
      maxVal = v;
      topKey = k;
    }
  }
  return topKey;
}

function getArchetype(primary: keyof TravelDNAScores, secondary: keyof TravelDNAScores): TravelArchetype {
  const map: Record<string, { title: string; description: string }> = {
    'adventure-nature': {
      title: 'Alpine & Wilderness Adventurer',
      description: 'Driven by high-altitude trails, rugged wilderness expeditions, and breathtaking untamed terrains.'
    },
    'adventure-photography': {
      title: 'Frontier Photo-Voyager',
      description: 'Chasing dramatic dawn summits, remote vistas, and raw, cinematic landscapes from behind the lens.'
    },
    'adventure-culture': {
      title: 'Historic Expedition Pioneer',
      description: 'Seeking thrilling journeys through ancient realms, rugged heritage pathways, and legendary trails.'
    },
    'adventure-food': {
      title: 'Nomadic Trail Gastronome',
      description: 'Fueling backcountry expeditions with vibrant local flavors, roadside joints, and hearty regional eats.'
    },
    'nature-relaxation': {
      title: 'Coastal & Sanctuary Seeker',
      description: 'Recharging among tranquil shores, whispering pine canopies, and serene natural wonderlands.'
    },
    'nature-photography': {
      title: 'Landscape & Wildlife Chronicler',
      description: 'Patiently capturing golden-hour horizons, misty valleys, and the poetry of the natural world.'
    },
    'nature-adventure': {
      title: 'Untamed Wilds Explorer',
      description: 'Immersing deep into national parks, remote ridges, rushing rivers, and untouched backcountry.'
    },
    'food-culture': {
      title: 'Cultural Epicurean',
      description: 'Experiencing civilizations through their regional kitchens, centuries-old recipes, and bustling spice markets.'
    },
    'food-luxury': {
      title: 'Haute Gastronomy Connoisseur',
      description: 'Seeking extraordinary culinary journeys, artisanal chef tables, and world-class wine pairings.'
    },
    'food-nightlife': {
      title: 'Midnight Street Food Wanderer',
      description: 'Hunting late-night street food alleys, vibrant night markets, and craft watering holes around the globe.'
    },
    'culture-photography': {
      title: 'Heritage Documentarian',
      description: 'Preserving the spirit of timeless monuments, ancient cobblestone alleys, and architectural marvels.'
    },
    'culture-relaxation': {
      title: 'Mindful Heritage Pilgrim',
      description: 'Exploring sacred temples, tranquil heritage towns, and enriching cultural landscapes at a soulful pace.'
    },
    'culture-adventure': {
      title: 'Antiquity & Trail Explorer',
      description: 'Navigating forgotten ruins, dramatic historical landmarks, and remote cultural crossroads.'
    },
    'photography-adventure': {
      title: 'Expedition Visual Storyteller',
      description: 'Framing raw, dramatic vistas from windy coastlines, towering peaks, and unmapped horizons.'
    },
    'photography-culture': {
      title: 'Cultural Light & Life Chronicler',
      description: 'Finding the soul of places in historic facades, golden-hour temples, and authentic street moments.'
    },
    'nightlife-food': {
      title: 'Midnight City Pulse Explorer',
      description: 'Alive in the after-hours glow of dynamic metropolises, rooftop lounges, and legendary midnight eats.'
    },
    'nightlife-culture': {
      title: 'Urban Rhythm Cosmopolitan',
      description: 'Immersing into the music, nightlife scenes, and creative underground cultures of vibrant world capitals.'
    },
    'relaxation-nature': {
      title: 'Serenity & Slow-Traveler',
      description: 'Cherishing slow sunlit mornings, calming coastal breezes, and peaceful retreats far from crowds.'
    },
    'relaxation-luxury': {
      title: 'Sanctuary & Wellness Aficionado',
      description: 'Indulging in restorative spas, tranquil luxury resorts, and effortless coastal retreats.'
    },
    'luxury-relaxation': {
      title: 'First-Class Retreat Connoisseur',
      description: 'Elevating every voyage with world-class hospitality, private transfers, and bespoke comfort.'
    },
    'luxury-food': {
      title: 'Bespoke Epicurean Voyager',
      description: 'Pairing world-renowned culinary landmarks with exquisite private stays and tailored journeys.'
    }
  };

  const key = `${primary}-${secondary}`;
  if (map[key]) {
    return {
      title: map[key].title,
      description: map[key].description,
      primaryTrait: primary,
      secondaryTrait: secondary
    };
  }

  // Fallback map based on primary trait
  const primaryFallback: Record<keyof TravelDNAScores, { title: string; description: string }> = {
    adventure: {
      title: 'Fearless Trailblazer',
      description: 'Driven by uncharted paths, adrenaline rushes, and the exhilaration of spontaneous discovery.'
    },
    nature: {
      title: 'Earth & Wilds Wanderer',
      description: 'Deeply connected with scenic landscapes, national parks, and the serenity of the great outdoors.'
    },
    food: {
      title: 'Gastronomic Nomad',
      description: 'Traveling destination to destination guided by flavor, authentic recipes, and culinary wonder.'
    },
    culture: {
      title: 'Civilization & Heritage Explorer',
      description: 'Enchanted by centuries of art, history, architecture, and living local traditions.'
    },
    photography: {
      title: 'Visual Chronicle Voyager',
      description: 'Seeing the world through lens, light, composition, and unforgettable visual memories.'
    },
    nightlife: {
      title: 'Electric City Wanderer',
      description: 'Energized by after-dark skylines, vibrant night markets, and high-spirited social adventures.'
    },
    relaxation: {
      title: 'Mindful Sanctuary Seeker',
      description: 'Mastering the art of restorative travel, gentle paces, and calming retreats.'
    },
    luxury: {
      title: 'Curated Luxury Voyager',
      description: 'Bespoke itineraries, premium stays, and seamless sophistication everywhere you roam.'
    }
  };

  return {
    title: primaryFallback[primary]?.title || DEFAULT_ARCHETYPE.title,
    description: primaryFallback[primary]?.description || DEFAULT_ARCHETYPE.description,
    primaryTrait: primary,
    secondaryTrait: secondary
  };
}
