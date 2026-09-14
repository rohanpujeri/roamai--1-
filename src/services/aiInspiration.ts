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

const clientPreviewCache = new Map<string, DynamicPreviewTrip>();

export async function fetchAiDynamicPreviewTrip(themeId: string, themeName?: string, themeVibe?: string): Promise<DynamicPreviewTrip | null> {
  const cacheKey = `theme_${themeId || 'default'}`;
  if (clientPreviewCache.has(cacheKey)) {
    return clientPreviewCache.get(cacheKey)!;
  }

  try {
    const res = await fetch('/api/ai/theme-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId, themeName, themeVibe })
    });

    if (res.ok) {
      const data: DynamicPreviewTrip = await res.json();
      if (data && data.title) {
        clientPreviewCache.set(cacheKey, data);
        return data;
      }
    }
  } catch (err) {
    console.warn('[aiInspiration] Failed to fetch dynamic theme preview from AI:', err);
  }

  return null;
}
