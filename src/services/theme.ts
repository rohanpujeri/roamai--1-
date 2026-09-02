import { ThemeConfig, ThemeId } from '../types';

export const THEME_OPTIONS: ThemeConfig[] = [
  {
    id: 'beach',
    name: 'Beach Theme',
    vibe: 'Crystal Seashore & Ocean Waves',
    tagline: 'Coastal surf and sun',
    icon: '🏖️',
    primaryColor: '#0284c7', // sky-600 ocean blue
    secondaryColor: '#0d9488', // teal-600 aqua
    accentColor: '#f59e0b', // amber-500 golden sun
    canvasBg: '#f4fbfe',
    canvasTint: 'linear-gradient(180deg, #e0f2fe 0%, #f4fbfe 280px, #f4fbfe 100%)',
    cardBg: '#ffffff',
    cardBorder: '#dbeafe',
    optionBg: '#f8fbff',
    optionHoverBg: '#e0f2fe',
    optionSelectedBg: '#bae6fd',
    optionBorder: '#7dd3fc',
    bgSubtle: '#e0f2fe',
    borderSubtle: '#bae6fd',
    taglineColor: '#075985',
    heroGradient: 'linear-gradient(135deg, #0284c7 0%, #0d9488 50%, #f59e0b 100%)',
    heroBannerBg: 'linear-gradient(180deg, rgba(224, 242, 254, 0.30) 0%, rgba(204, 251, 241, 0.10) 55%, #f4fbfe 100%)',
    heroAtmosphereGlow: 'radial-gradient(ellipse at 50% 32%, rgba(2, 132, 199, 0.20) 0%, rgba(13, 148, 136, 0.15) 40%, rgba(245, 158, 11, 0.10) 70%, transparent 100%)',
    vibeTextGradient: 'linear-gradient(135deg, #0284c7 0%, #0d9488 50%, #f59e0b 100%)',
    heroBadgeBg: 'rgba(224, 242, 254, 0.85)',
    heroBadgeBorder: 'rgba(186, 230, 253, 0.75)',
    heroBadgeText: '#0369a1',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    activeRingClass: 'ring-sky-500 border-sky-500',
    primaryBtnClass: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20',
    secondaryBtnClass: 'bg-sky-50 text-sky-800 hover:bg-sky-100',
    textAccentClass: 'text-sky-600',
    swatches: ['#0284c7', '#0d9488', '#f59e0b', '#f4fbfe'],
    isDark: false,
    heroPhotoUrl: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=90&w=2400&auto=format&fit=crop',
    heroPhotoPosition: 'center 50%',
    heroPhotoTag: '🌊 Crystal Seashore & Foaming Ocean Surf • 29°C',
    heroFloatingPhotos: [
      { url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=85&w=800&auto=format&fit=crop', title: 'Seashore Surf & Foam', location: 'Golden Sand Shore • 29°C' },
      { url: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?q=85&w=800&auto=format&fit=crop', title: 'Turquoise Seashore', location: 'Crystal Water Line • 28°C' }
    ],
    previewTrip: {
      title: 'Coastal & Seashore Escape',
      image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=90&w=1200&auto=format&fit=crop',
      subtitle: '4 Days • 3 Travellers • Coastal Sun',
      budget: '₹30,000 Budget',
      temp: '29°C ☀️',
      day1Title: 'Day 1 • Arrival & Sunset Highlights',
      activity1: { time: '04:30 PM', title: 'Coastal Sunset & Fresh Beverages', category: 'Relaxation', cost: '₹500' },
      activity2: { time: '07:30 PM', title: 'Oceanfront Dining & Acoustic Melodies', category: 'Food', cost: '₹1,800' }
    }
  },
  {
    id: 'mountain',
    name: 'Green Mountain Theme',
    vibe: 'Lush Green Mountain Slopes & Emerald Peaks',
    tagline: 'Lush green mountain peaks & valley',
    icon: '🌿',
    primaryColor: '#059669', // emerald-600
    secondaryColor: '#047857', // emerald-700
    accentColor: '#10b981', // emerald-500
    canvasBg: '#f2fbf6',
    canvasTint: 'linear-gradient(180deg, #ecfdf5 0%, #f2fbf6 280px, #f8fafc 100%)',
    cardBg: '#ffffff',
    cardBorder: '#d1fae5',
    optionBg: '#f0fdf4',
    optionHoverBg: '#dcfce7',
    optionSelectedBg: '#bbf7d0',
    optionBorder: '#86efac',
    bgSubtle: '#ecfdf5',
    borderSubtle: '#a7f3d0',
    taglineColor: '#065f46',
    heroGradient: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #047857 100%)',
    heroBannerBg: 'linear-gradient(180deg, rgba(236, 253, 245, 0.35) 0%, rgba(240, 253, 244, 0.12) 55%, #f2fbf6 100%)',
    heroAtmosphereGlow: 'radial-gradient(ellipse at 50% 32%, rgba(16, 185, 129, 0.28) 0%, rgba(5, 150, 105, 0.18) 40%, rgba(4, 120, 87, 0.10) 70%, transparent 100%)',
    vibeTextGradient: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #047857 100%)',
    heroBadgeBg: 'rgba(220, 252, 231, 0.90)',
    heroBadgeBorder: 'rgba(167, 243, 208, 0.85)',
    heroBadgeText: '#065f46',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    activeRingClass: 'ring-emerald-500 border-emerald-500',
    primaryBtnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
    secondaryBtnClass: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    textAccentClass: 'text-emerald-600',
    swatches: ['#059669', '#10b981', '#047857', '#ecfdf5'],
    isDark: false,
    heroPhotoUrl: 'https://images.travelandleisureasia.com/wp-content/uploads/sites/6/2025/03/24213648/manali-tourist-places-fi.jpeg',
    heroPhotoPosition: 'center 45%',
    heroPhotoTag: '🌿 100% Lush Emerald Green Mountain Peaks • 4K Ultra HD',
    heroFloatingPhotos: [
      { url: 'https://images.travelandleisureasia.com/wp-content/uploads/sites/6/2025/03/24213648/manali-tourist-places-fi.jpeg', title: 'Lush Green Mountain', location: 'Emerald Ridge • 2,200m' },
      { url: 'https://images.travelandleisureasia.com/wp-content/uploads/sites/6/2025/03/24213648/manali-tourist-places-fi.jpeg', title: 'Green Forest Valley', location: 'Pine Slopes • 2,050m' }
    ],
    previewTrip: {
      title: 'Alpine & Summit Escape',
      image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=90&w=1200&auto=format&fit=crop',
      subtitle: '4 Days • 2 Travellers • Alpine Adventure',
      budget: '₹26,000 Budget',
      temp: '15°C 🏔️',
      day1Title: 'Day 1 • Valley Ridge & Cedar Woods Walk',
      activity1: { time: '10:00 AM', title: 'Mountain Valley Panorama Walk', category: 'Adventure', cost: '₹1,500' },
      activity2: { time: '02:30 PM', title: 'Riverside Timber Cafe & Local Warm Delicacies', category: 'Food', cost: '₹1,200' }
    }
  },
  {
    id: 'waterfall',
    name: 'Waterfall Theme',
    vibe: 'Cascading Rapids & Emerald Gorge',
    tagline: 'Cascades, rapids and pools',
    icon: '🌊',
    primaryColor: '#06b6d4', // cyan-500
    secondaryColor: '#059669', // emerald-600
    accentColor: '#2563eb', // blue-600
    canvasBg: '#f0faf9',
    canvasTint: 'linear-gradient(180deg, #e0f7f6 0%, #f0faf9 280px, #f0faf9 100%)',
    cardBg: '#ffffff',
    cardBorder: '#ccf1ee',
    optionBg: '#f5fcfb',
    optionHoverBg: '#e6fbf8',
    optionSelectedBg: '#cffafe',
    optionBorder: '#67e8f9',
    bgSubtle: '#e6fbf8',
    borderSubtle: '#a5f3fc',
    taglineColor: '#164e63',
    heroGradient: 'linear-gradient(135deg, #06b6d4 0%, #059669 50%, #2563eb 100%)',
    heroBannerBg: 'linear-gradient(180deg, rgba(207, 250, 254, 0.25) 0%, rgba(209, 250, 229, 0.10) 55%, #f0faf9 100%)',
    heroAtmosphereGlow: 'radial-gradient(ellipse at 50% 32%, rgba(6, 182, 212, 0.20) 0%, rgba(5, 150, 105, 0.15) 40%, rgba(37, 99, 235, 0.10) 70%, transparent 100%)',
    vibeTextGradient: 'linear-gradient(135deg, #06b6d4 0%, #059669 50%, #2563eb 100%)',
    heroBadgeBg: 'rgba(207, 250, 254, 0.85)',
    heroBadgeBorder: 'rgba(103, 232, 249, 0.75)',
    heroBadgeText: '#0e7490',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    activeRingClass: 'ring-cyan-500 border-cyan-500',
    primaryBtnClass: 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-600/20',
    secondaryBtnClass: 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100',
    textAccentClass: 'text-cyan-600',
    swatches: ['#06b6d4', '#059669', '#2563eb', '#f0faf9'],
    isDark: false,
    heroPhotoUrl: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=90&w=2560&auto=format&fit=crop',
    heroPhotoPosition: 'center 35%',
    heroPhotoTag: '🌊 Cascading Natural Waterfalls & Emerald Canyon Rapids',
    heroFloatingPhotos: [
      { url: 'https://images.unsplash.com/photo-1546271876-af6caec5fae5?q=85&w=800&auto=format&fit=crop', title: 'Cascade Rapids', location: 'Natural Waterfall Rapids • 22°C' },
      { url: 'https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?q=85&w=800&auto=format&fit=crop', title: 'Forest Plunge Basin', location: 'Lush Moss Gorge • 21°C' }
    ],
    previewTrip: {
      title: 'Waterfalls & Gorge Adventure',
      image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=90&w=1200&auto=format&fit=crop',
      subtitle: '5 Days • 2 Travellers • Waterfall Explorer',
      budget: '₹24,000 Budget',
      temp: '22°C 🌊',
      day1Title: 'Day 1 • Cascade Plunge & Forest Trails',
      activity1: { time: '09:30 AM', title: 'Waterfall Viewpoint & Canyon Mist', category: 'Sightseeing', cost: '₹200' },
      activity2: { time: '01:30 PM', title: 'River Crossing & Natural Emerald Lagoon Dip', category: 'Adventure', cost: '₹1,500' }
    }
  },
  {
    id: 'trekking',
    name: 'Trekking Theme',
    vibe: 'Alpine Trails, High Ridges & Wilderness Passes',
    tagline: 'High alpine trails and backcountry passes',
    icon: '🥾',
    primaryColor: '#15803d', // green-700
    secondaryColor: '#047857', // emerald-700
    accentColor: '#84cc16', // lime-500
    canvasBg: '#f2f9f3',
    canvasTint: 'linear-gradient(180deg, #dcfce7 0%, #f2f9f3 280px, #f2f9f3 100%)',
    cardBg: '#ffffff',
    cardBorder: '#bbf7d0',
    optionBg: '#f0fdf4',
    optionHoverBg: '#dcfce7',
    optionSelectedBg: '#bbf7d0',
    optionBorder: '#86efac',
    bgSubtle: '#dcfce7',
    borderSubtle: '#86efac',
    taglineColor: '#14532d',
    heroGradient: 'linear-gradient(135deg, #15803d 0%, #047857 50%, #84cc16 100%)',
    heroBannerBg: 'linear-gradient(180deg, rgba(220, 252, 231, 0.30) 0%, rgba(240, 253, 244, 0.12) 55%, #f2f9f3 100%)',
    heroAtmosphereGlow: 'radial-gradient(ellipse at 50% 32%, rgba(21, 128, 61, 0.22) 0%, rgba(4, 120, 87, 0.16) 40%, rgba(132, 204, 22, 0.10) 70%, transparent 100%)',
    vibeTextGradient: 'linear-gradient(135deg, #15803d 0%, #047857 50%, #84cc16 100%)',
    heroBadgeBg: 'rgba(220, 252, 231, 0.85)',
    heroBadgeBorder: 'rgba(134, 239, 172, 0.75)',
    heroBadgeText: '#166534',
    badgeClass: 'bg-green-50 text-green-800 border-green-200',
    activeRingClass: 'ring-green-600 border-green-600',
    primaryBtnClass: 'bg-green-700 hover:bg-green-800 text-white shadow-green-700/20',
    secondaryBtnClass: 'bg-green-50 text-green-800 hover:bg-green-100',
    textAccentClass: 'text-green-700',
    swatches: ['#15803d', '#047857', '#84cc16', '#f2f9f3'],
    isDark: false,
    heroPhotoUrl: 'https://images.unsplash.com/photo-1627289496743-8a9a08bb228a?q=90&w=2560&auto=format&fit=crop',
    heroPhotoPosition: 'center 40%',
    heroPhotoTag: '🥾 High Mountain Trekking Trails & Alpine Ridges',
    heroFloatingPhotos: [
      { url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=85&w=800&auto=format&fit=crop', title: 'Mountain Ridge Path', location: 'High Alpine Pass • 18°C' },
      { url: 'https://images.unsplash.com/photo-1627289496743-8a9a08bb228a?q=85&w=800&auto=format&fit=crop', title: 'Wilderness Trek', location: 'Alpine Valley Ridge • 17°C' }
    ],
    previewTrip: {
      title: 'Alpine Ridge & Mountain Trek',
      image: 'https://images.unsplash.com/photo-1627289496743-8a9a08bb228a?q=90&w=1200&auto=format&fit=crop',
      subtitle: '4 Days • 2 Trekkers • High Ridge Expedition',
      budget: '₹22,000 Budget',
      temp: '17°C 🥾',
      day1Title: 'Day 1 • Ridge Trail Ascent & Valley Campsite',
      activity1: { time: '06:30 AM', title: 'Alpine Ridge Trail Guided Hike', category: 'Adventure', cost: '₹850' },
      activity2: { time: '01:00 PM', title: 'Mountain Pass Viewpoint & Trailside Lunch', category: 'Food', cost: '₹450' }
    }
  },
  {
    id: 'snow',
    name: 'Snow & Alpine Theme',
    vibe: 'Powder Slopes, Frost & Alpine Glow',
    tagline: 'Glaciers, frost and cozy cabins',
    icon: '❄️',
    primaryColor: '#0ea5e9', // sky-500
    secondaryColor: '#6366f1', // indigo-500
    accentColor: '#38bdf8', // sky-400
    canvasBg: '#090d16',
    canvasTint: 'linear-gradient(180deg, #090d16 0%, #0d1527 280px, #070a12 100%)',
    cardBg: '#0f172a',
    cardBorder: '#1e293b',
    optionBg: '#1e293b',
    optionHoverBg: '#334155',
    optionSelectedBg: '#0369a1',
    optionBorder: '#38bdf8',
    bgSubtle: '#1e293b',
    borderSubtle: '#334155',
    taglineColor: '#93c5fd',
    heroGradient: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #38bdf8 100%)',
    heroBannerBg: 'linear-gradient(180deg, rgba(15, 23, 42, 0.90) 0%, rgba(13, 21, 39, 0.95) 55%, #090d16 100%)',
    heroAtmosphereGlow: 'radial-gradient(ellipse at 50% 32%, rgba(14, 165, 233, 0.25) 0%, rgba(99, 102, 241, 0.18) 40%, rgba(56, 189, 248, 0.10) 70%, transparent 100%)',
    vibeTextGradient: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #e0f2fe 100%)',
    heroBadgeBg: 'rgba(15, 23, 42, 0.90)',
    heroBadgeBorder: 'rgba(56, 189, 248, 0.40)',
    heroBadgeText: '#7dd3fc',
    badgeClass: 'bg-sky-950 text-sky-200 border-sky-800',
    activeRingClass: 'ring-sky-400 border-sky-400',
    primaryBtnClass: 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/25',
    secondaryBtnClass: 'bg-slate-800 text-sky-200 hover:bg-slate-700',
    textAccentClass: 'text-sky-400',
    swatches: ['#0ea5e9', '#6366f1', '#38bdf8', '#090d16'],
    isDark: false,
    heroPhotoUrl: 'https://images.unsplash.com/photo-1623057896740-99f8c2f090fc?q=90&w=2560&auto=format&fit=crop',
    heroPhotoPosition: 'center 40%',
    heroPhotoTag: '❄️ Alpine Sunset & Snow Mountain Slopes • -3°C',
    heroFloatingPhotos: [
      { url: 'https://images.unsplash.com/photo-1542332213-31f87348057f?q=85&w=800&auto=format&fit=crop', title: 'High-Altitude Ridge', location: 'Alpine Peak • -6°C' },
      { url: 'https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?q=85&w=800&auto=format&fit=crop', title: 'Powder Pines', location: 'Glacial Valley • -3°C' }
    ],
    previewTrip: {
      title: 'Alpine Snow & Sunset Expedition',
      image: 'https://images.unsplash.com/photo-1623057896740-99f8c2f090fc?q=90&w=1200&auto=format&fit=crop',
      subtitle: '5 Days • 2 Travellers • Alpine Snow Explorer',
      budget: '₹34,000 Budget',
      temp: '-3°C ❄️',
      day1Title: 'Day 1 • Alpine Pass Transit & Warm Hearth Dining',
      activity1: { time: '10:30 AM', title: 'Glacial Valley Snow Walk', category: 'Adventure', cost: '₹1,500' },
      activity2: { time: '05:30 PM', title: 'Warm Wooden Cabin Hearth & Hot Mountain Tea', category: 'Relaxation', cost: '₹400' }
    }
  }
];

export const DEFAULT_THEME_ID: ThemeId = 'beach';

export function getTheme(themeId: ThemeId): ThemeConfig {
  const found = THEME_OPTIONS.find((t) => t.id === themeId);
  return found || THEME_OPTIONS[0];
}

export function applyThemeToDocument(theme: ThemeConfig): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  root.style.setProperty('--color-primary', theme.primaryColor);
  root.style.setProperty('--color-secondary', theme.secondaryColor);
  root.style.setProperty('--color-accent', theme.accentColor);
  root.style.setProperty('--canvas-bg', theme.canvasBg);
  root.style.setProperty('--card-bg', theme.cardBg);
  root.style.setProperty('--card-border', theme.cardBorder);
  root.style.setProperty('--hero-gradient', theme.heroGradient);
  root.style.setProperty('--hero-banner-bg', theme.heroBannerBg);
  root.style.setProperty('--hero-atmosphere-glow', theme.heroAtmosphereGlow);
  root.style.setProperty('--vibe-text-gradient', theme.vibeTextGradient);
  root.style.setProperty('--hero-badge-bg', theme.heroBadgeBg);
  root.style.setProperty('--hero-badge-border', theme.heroBadgeBorder);
  root.style.setProperty('--hero-badge-text', theme.heroBadgeText);
  root.style.setProperty('--bg-subtle', theme.bgSubtle);
  root.style.setProperty('--border-subtle', theme.borderSubtle);

  if (theme.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function getSavedThemeId(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  try {
    const saved = localStorage.getItem('roamai_theme_id') as ThemeId;
    if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.warn('Unable to read saved theme:', e);
  }
  return DEFAULT_THEME_ID;
}
