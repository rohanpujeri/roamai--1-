const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
};

export const config = {
  api: {
    googleMapsKey: getEnv('VITE_GOOGLE_MAPS_API_KEY') || getEnv('GOOGLE_MAPS_API_KEY'),
  },
  supabase: {
    url: getEnv('VITE_SUPABASE_URL'),
    anonKey: getEnv('VITE_SUPABASE_ANON_KEY'),
  },
  db: {
    schema: 'public',
    tables: {
      users: 'users',
      trips: 'trips',
      places: 'places'
    }
  },
  app: {
    url: getEnv('VITE_APP_URL') || 'http://localhost:3000',
    name: 'RoamAI',
  },
  models: {
    defaultAiModel: 'gemini-3.7-flash',
  }
};

