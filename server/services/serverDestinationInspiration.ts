import { GoogleGenAI } from '@google/genai';
import { PREFERRED_GEMINI_MODELS, formatGenAiError, getGeminiApiKey } from '../utils/geminiModels';
import { fetchRealPlacePhoto } from '../utils/realPlacePhotos';

export interface DynamicPreviewTrip {
  themeId: string;
  title: string;
  destination: string;
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
}

const inspirationCache = new Map<string, DynamicPreviewTrip>();

function parseJsonSafely(text: string): any {
  if (!text || !text.trim()) return null;
  let cleaned = text.trim();
  if (cleaned.includes('```')) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      cleaned = match[1].trim();
    } else {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function fetchAiThemePreviewTrip(themeId: string, themeName?: string, themeVibe?: string): Promise<DynamicPreviewTrip> {
  const cacheKey = `theme_preview_${themeId || 'default'}`;
  if (inspirationCache.has(cacheKey)) {
    return inspirationCache.get(cacheKey)!;
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      themeId: themeId || 'basic',
      title: `${themeName || 'Explore'} Journey`,
      destination: 'Trending Destination',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      subtitle: '4 Days • 2 Travellers • AI Journey',
      budget: '₹28,000 Budget',
      temp: '25°C ☀️',
      day1Title: 'Day 1 • Arrival & Evening Sunset',
      activity1: { time: '04:30 PM', title: 'Scenic Promenade Walk', category: 'Relaxation', cost: '₹200' },
      activity2: { time: '07:30 PM', title: 'Local Artisan Dinner', category: 'Food', cost: '₹800' }
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a world-class travel curator AI.
Generate a dynamic, authentic journey inspiration preview card matching the theme "${themeName || themeId}" (vibe: "${themeVibe || 'Travel Adventure'}").
Pick a real-world, iconic travel destination that fits this vibe (e.g. for beach: Goa, Bali, Maldives; mountain: Manali, Swiss Alps; heritage: Jaipur, Rome; etc.).

Return strictly valid JSON with this exact schema:
{
  "title": "Creative Trip Title (e.g. Coastal & Seashore Escape)",
  "destination": "Actual Destination Name",
  "subtitle": "e.g. 4 Days • 2 Travellers • Coastal Sun",
  "budget": "e.g. ₹24,000 Budget",
  "temp": "e.g. 28°C ☀️",
  "day1Title": "Day 1 • Arrival & Sunset Highlights",
  "activity1": {
    "time": "04:00 PM",
    "title": "Real Famous Landmark/Activity",
    "category": "Sightseeing",
    "cost": "₹400"
  },
  "activity2": {
    "time": "07:30 PM",
    "title": "Evening Dining/Cultural Experience",
    "category": "Food",
    "cost": "₹900"
  }
}`;

    for (const modelName of PREFERRED_GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        const parsed = parseJsonSafely(response.text || '');
        if (parsed && parsed.title && parsed.destination) {
          const photo = await fetchRealPlacePhoto(parsed.destination, parsed.destination, 'Sightseeing');

          const result: DynamicPreviewTrip = {
            themeId: themeId || 'basic',
            title: parsed.title,
            destination: parsed.destination,
            image: photo || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
            subtitle: parsed.subtitle || '4 Days • 2 Travellers',
            budget: parsed.budget || '₹25,000 Budget',
            temp: parsed.temp || '26°C ☀️',
            day1Title: parsed.day1Title || 'Day 1 • Arrival & Highlights',
            activity1: parsed.activity1 || { time: '04:30 PM', title: 'Local Exploration', category: 'Sightseeing', cost: '₹300' },
            activity2: parsed.activity2 || { time: '07:30 PM', title: 'Regional Culinary Dinner', category: 'Food', cost: '₹800' }
          };

          inspirationCache.set(cacheKey, result);
          return result;
        }
      } catch (err) {
        console.warn(`[serverDestinationInspiration] Attempt with ${modelName} failed: ${formatGenAiError(err)}`);
      }
    }
  } catch (error) {
    console.error('[serverDestinationInspiration] Error:', error);
  }

  return {
    themeId: themeId || 'basic',
    title: `${themeName || 'Personalized'} Journey`,
    destination: 'Scenic Destination',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    subtitle: '4 Days • 2 Travellers • AI Journey',
    budget: '₹25,000 Budget',
    temp: '26°C ☀️',
    day1Title: 'Day 1 • Arrival & Highlights',
    activity1: { time: '04:30 PM', title: 'Scenic Exploration', category: 'Sightseeing', cost: '₹300' },
    activity2: { time: '07:30 PM', title: 'Local Cuisine Dinner', category: 'Food', cost: '₹800' }
  };
}
