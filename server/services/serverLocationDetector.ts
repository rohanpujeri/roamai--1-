export interface DetectedLocationResult {
  cityName: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  source: 'gps_google' | 'gps_nominatim' | 'gps_bigdatacloud' | 'ip';
}

/**
 * Robust server-side reverse geocoding with multi-provider fallback:
 * 1. Google Maps Geocoding API (if key available)
 * 2. OpenStreetMap Nominatim (with compliant User-Agent headers)
 * 3. BigDataCloud reverse geocode API
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<DetectedLocationResult | null> {
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  // 1. Google Maps Geocoding
  if (apiKey) {
    try {
      const gRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=locality|postal_town|administrative_area_level_2|administrative_area_level_1&key=${apiKey}`
      );
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.status === 'OK' && Array.isArray(gData.results) && gData.results.length > 0) {
          const firstResult = gData.results[0];
          let city = '';
          let state = '';
          let country = '';

          for (const comp of firstResult.address_components || []) {
            if (comp.types.includes('locality') || comp.types.includes('postal_town')) {
              city = comp.long_name;
            } else if (!city && comp.types.includes('administrative_area_level_2')) {
              city = comp.long_name;
            } else if (comp.types.includes('administrative_area_level_1')) {
              state = comp.long_name;
            } else if (comp.types.includes('country')) {
              country = comp.long_name;
            }
          }

          if (city) {
            return {
              cityName: city,
              state: state || undefined,
              country: country || undefined,
              lat,
              lng,
              source: 'gps_google'
            };
          }
        }
      }
    } catch (e) {
      console.warn('Google reverse geocode error:', e);
    }
  }

  // 2. OpenStreetMap Nominatim with proper User-Agent header to avoid 403 blocks
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'TripWiseApp/1.0 (travel-planner-app; contact@tripwise.app)',
          'Accept-Language': 'en'
        }
      }
    );
    if (nomRes.ok) {
      const data = await nomRes.json();
      const cityName =
        data.address?.city ||
        data.address?.town ||
        data.address?.municipality ||
        data.address?.state_district ||
        data.address?.county ||
        data.address?.state;

      if (cityName) {
        return {
          cityName,
          state: data.address?.state || undefined,
          country: data.address?.country || undefined,
          lat,
          lng,
          source: 'gps_nominatim'
        };
      }
    }
  } catch (e) {
    console.warn('Nominatim reverse geocode error:', e);
  }

  // 3. BigDataCloud reverse geocode fallback
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const cityName = bdcData.city || bdcData.locality || bdcData.principalSubdivision;
      if (cityName) {
        return {
          cityName,
          state: bdcData.principalSubdivision || undefined,
          country: bdcData.countryName || undefined,
          lat,
          lng,
          source: 'gps_bigdatacloud'
        };
      }
    }
  } catch (e) {
    console.warn('BigDataCloud reverse geocode error:', e);
  }

  return null;
}

/**
 * IP-based fallback when browser geolocation is denied or unavailable
 */
export async function detectLocationFromIp(clientIp?: string): Promise<DetectedLocationResult | null> {
  // Try ipwho.is (fast, HTTPS, CORS & proxy friendly)
  try {
    const targetUrl = clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1'
      ? `https://ipwho.is/${clientIp}`
      : 'https://ipwho.is/';

    const res = await fetch(targetUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.success !== false && data.city) {
        return {
          cityName: data.city,
          state: data.region || undefined,
          country: data.country || undefined,
          lat: typeof data.latitude === 'number' ? data.latitude : undefined,
          lng: typeof data.longitude === 'number' ? data.longitude : undefined,
          source: 'ip'
        };
      }
    }
  } catch (e) {
    console.warn('ipwho.is location lookup error:', e);
  }

  // Fallback to ipapi.co
  try {
    const targetUrl = clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1'
      ? `https://ipapi.co/${clientIp}/json/`
      : 'https://ipapi.co/json/';

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'TripWiseApp/1.0'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.city && !data.error) {
        return {
          cityName: data.city,
          state: data.region || undefined,
          country: data.country_name || undefined,
          lat: typeof data.latitude === 'number' ? data.latitude : undefined,
          lng: typeof data.longitude === 'number' ? data.longitude : undefined,
          source: 'ip'
        };
      }
    }
  } catch (e) {
    console.warn('ipapi.co location lookup error:', e);
  }

  return null;
}
