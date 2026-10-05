/**
 * Centralized Server Configuration
 * Environment variables take priority with fallback defaults for Supabase.
 */
export const serverConfig = {
  supabase: {
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://majtaremnrjzzzxpquef.supabase.co',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_lEh8i3--27fBR0viPcq2mA_K_99EkIO'
  }
};
