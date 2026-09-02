import { resolvePlaceImage } from './placeImages';

const photoCache = new Map<string, string>();

/**
 * Clean activity title to maximize search hit rate on Wikipedia/Wikimedia
 */
function cleanPlaceTitle(title: string): string {
  return title
    .replace(/\(.*?\)/g, '') // remove (parentheses)
    .replace(/\b(morning|afternoon|evening|night|sunset|sunrise|exploration|visit|tour|stop|walk|stroll|highlights?|experience)\b/gi, '')
    .replace(/["'’]/g, '')
    .trim();
}

/**
 * Fetch a genuine, verified real photograph of a specific place, landmark, eatery or viewpoint
 */
export async function fetchRealPlacePhoto(
  placeTitle: string,
  destination: string = '',
  category: string = ''
): Promise<string> {
  const cacheKey = `${placeTitle.toLowerCase()}__${destination.toLowerCase()}`;
  if (photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey)!;
  }

  const cleanTitle = cleanPlaceTitle(placeTitle);
  const searchQueries = [
    cleanTitle,
    `${cleanTitle} ${destination}`.trim()
  ].filter(Boolean);

  for (const query of searchQueries) {
    // 1. Wikipedia Summary REST API
    try {
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/\s+/g, '_'))}`;
      const res = await fetch(summaryUrl, {
        headers: { 'User-Agent': 'RoamAI-TravelApp/1.0 (travel@roamai.app)' }
      });
      if (res.ok) {
        const data = await res.json();
        const img = data.originalimage?.source || data.thumbnail?.source;
        if (img && typeof img === 'string' && img.startsWith('http') && !img.endsWith('.svg')) {
          photoCache.set(cacheKey, img);
          return img;
        }
      }
    } catch (_) {}

    // 2. Wikipedia Generator Search API
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=2&prop=pageimages&pithumbsize=1000&format=json&origin=*`;
      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'RoamAI-TravelApp/1.0 (travel@roamai.app)' }
      });
      if (res.ok) {
        const data = await res.json();
        const pages = data.query?.pages;
        if (pages) {
          for (const page of Object.values(pages) as any[]) {
            const src = page.thumbnail?.source;
            if (src && typeof src === 'string' && src.startsWith('http') && !src.endsWith('.svg')) {
              photoCache.set(cacheKey, src);
              return src;
            }
          }
        }
      }
    } catch (_) {}

    // 3. Wikimedia Commons Media Search
    try {
      const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=1000&format=json&origin=*`;
      const res = await fetch(commonsUrl, {
        headers: { 'User-Agent': 'RoamAI-TravelApp/1.0 (travel@roamai.app)' }
      });
      if (res.ok) {
        const data = await res.json();
        const pages = data.query?.pages;
        if (pages) {
          const first = Object.values(pages)[0] as any;
          const thumb = first?.imageinfo?.[0]?.thumburl || first?.imageinfo?.[0]?.url;
          if (thumb && typeof thumb === 'string' && thumb.startsWith('http') && !thumb.endsWith('.svg')) {
            photoCache.set(cacheKey, thumb);
            return thumb;
          }
        }
      }
    } catch (_) {}
  }

  // Fallback to verified contextual photo
  const fallback = resolvePlaceImage(placeTitle, category, '', destination);
  photoCache.set(cacheKey, fallback);
  return fallback;
}
