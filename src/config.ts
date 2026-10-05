export const config = {
  api: {
    googleMapsKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    storageVersion: 'v2_majtaremnrjzzzxpquef_clean',
  },
  db: {
    schema: 'public',
    tables: {
      users: 'users',
      trips: 'trips',
      places: 'saved_places'
    }
  },
  app: {
    url: import.meta.env.VITE_APP_URL || 'http://localhost:3000',
    name: 'TripWise',
  },
  models: {
    defaultAiModel: 'tripwise-engine',
  }
};

