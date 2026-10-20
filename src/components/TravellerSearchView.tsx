import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  MapPin, 
  Play, 
  X, 
  Video,
  Users,
  Flame,
  Sparkles,
  ArrowLeft,
  Share2,
  Check,
  CheckCircle2,
  User,
  LayoutGrid,
  Film,
  Compass,
  Mountain,
  Award,
  Calendar,
  Clock,
  ArrowRight,
  RotateCw,
  Loader2
} from 'lucide-react';

import { Session } from '@supabase/supabase-js';
import { ThemeConfig, Trip } from '../types';
import { TrailsView } from './TrailsView';
import { sanitizeAvatarUrl, getCachedUserProfile, getSupabaseClient } from '../services/supabaseClient';
import { searchRealTravellers } from '../services/usernameService';
import { fetchGlobalTrails, getLocalTrails, TrailReel, isValidTrailMedia } from '../services/sharedTrailsService';
import { calculateTravelDNA, TravelDNAAnalysis } from '../utils/travelDNA';
import { isTripCompleted } from '../utils/tripCompletion';
import { 
  isFakeMockUser,
  cleanBio
} from '../utils/userUtils';
import { 
  fetchDynamicTrendingItineraries, 
  getCachedTrendingItineraries, 
  TrendingItinerary 
} from '../services/trendingItinerariesService';

export type { TrendingItinerary };



export interface TravellerProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  location: string;
  bio: string;
  level: string;
  tripsCount: number;
  placesCount: number;
  countriesCount?: number;
  topDNA: string[];
  recentPlaces: string[];
}

export interface ExploreTile {
  id: string;
  type: 'trail' | 'place' | 'photo';
  title: string;
  destination: string;
  imageUrl: string;
  mediaUrl?: string;
  creator: {
    id?: string;
    name: string;
    username: string;
    avatarUrl: string;
  };
  spanTwoCols?: boolean;
  spanTwoRows?: boolean;
}



interface TravellerSearchViewProps {
  currentTheme?: ThemeConfig;
  session?: Session | null;
  onSelectTraveller?: (traveller: TravellerProfile) => void;
  onOpenOwnProfile?: () => void;
  onOpenTrail?: (trailId?: string) => void;
  onStartPlanning?: (destination?: string) => void;
  onBack?: () => void;
  onRequireAuth?: () => void;
}


export const TravellerSearchView: React.FC<TravellerSearchViewProps> = ({
  currentTheme,
  session,
  onSelectTraveller,
  onOpenOwnProfile,
  onOpenTrail,
  onStartPlanning,
  onRequireAuth
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [travellers, setTravellers] = useState<TravellerProfile[]>([]);
  const [selectedTile, setSelectedTile] = useState<ExploreTile | null>(null);
  const [selectedItinerary, setSelectedItinerary] = useState<TrendingItinerary | null>(null);

  // Instagram-style active viewing profile (opens profile in the same page)
  const [viewingProfile, setViewingProfile] = useState<TravellerProfile | null>(null);
  const [profileTab, setProfileTab] = useState<'trips' | 'trails' | 'dna'>('trips');
  const [viewingProfileCompletedTrips, setViewingProfileCompletedTrips] = useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Full-screen Instagram Reels viewer state
  const [activeReelTrailId, setActiveReelTrailId] = useState<string | null>(null);
  const [activeReelTrails, setActiveReelTrails] = useState<TrailReel[] | null>(null);
  const [activeReelTitle, setActiveReelTitle] = useState<string>('Trails');

  // Listen for navigation event to open a traveller's profile
  useEffect(() => {
    const handleViewTraveller = (e: any) => {
      if (e.detail) {
        setActiveReelTrailId(null);
        setActiveReelTrails(null);
        const d = e.detail;
        const cleanUname = (d.username || '').replace(/^@+/, '');
        const cleanLower = cleanUname.toLowerCase();

        // Match existing traveller from travellers list
        const matched = travellers.find((t) => {
          const tClean = (t.username || '').replace(/^@+/, '').toLowerCase();
          return (
            tClean === cleanLower ||
            tClean.replace(/_/g, '') === cleanLower.replace(/_/g, '') ||
            (t.id && d.id && (t.id === d.id || t.id.replace(/^supa_/, '') === String(d.id).replace(/^supa_/, '')))
          );
        });

        // Also check cached profiles in localStorage if available
        let cachedStats: any = null;
        if (typeof window !== 'undefined') {
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith('tripwise_user_profile_')) {
                const raw = localStorage.getItem(k);
                if (raw) {
                  const p = JSON.parse(raw);
                  const pU = (p.username || '').toLowerCase().replace(/^@+/, '');
                  if (pU === cleanLower || pU.replace(/_/g, '') === cleanLower.replace(/_/g, '') || (d.id && p.id === d.id)) {
                    cachedStats = p;
                    break;
                  }
                }
              }
            }
          } catch {}
        }

        setViewingProfile({
          id: d.id || matched?.id || cachedStats?.id || `user_${cleanUname}`,
          name: d.name || matched?.name || cachedStats?.name || cleanUname,
          username: d.username?.startsWith('@') ? d.username : (matched?.username || (cachedStats?.username ? cachedStats.username : `@${cleanUname}`)),
          avatarUrl: d.avatarUrl || matched?.avatarUrl || cachedStats?.avatarUrl || '',
          location: d.location || matched?.location || cachedStats?.place || 'Traveler',
          bio: cleanBio(d.bio) || cleanBio(matched?.bio) || cleanBio(cachedStats?.bio) || '',
          level: d.level || matched?.level || cachedStats?.stats?.level || 'Travel Explorer',
          tripsCount: d.tripsCount ?? (matched?.tripsCount ?? (cachedStats?.stats?.tripsCount || 0)),
          placesCount: d.placesCount ?? (matched?.placesCount ?? (cachedStats?.stats?.placesCount || 0)),
          countriesCount: d.countriesCount ?? (matched?.countriesCount ?? (cachedStats?.stats?.countriesCount || 0)),
          topDNA: d.topDNA || matched?.topDNA || [],
          recentPlaces: d.recentPlaces || matched?.recentPlaces || []
        });
        setProfileTab('trips');
        try {
          window.scrollTo({ top: 0, behavior: 'instant' });
        } catch {}
      }
    };

    // Check pending view from sessionStorage if redirected across components
    try {
      const pendingRaw = sessionStorage.getItem('roamai_pending_view_traveller');
      if (pendingRaw) {
        sessionStorage.removeItem('roamai_pending_view_traveller');
        const parsed = JSON.parse(pendingRaw);
        if (parsed && (parsed.username || parsed.id)) {
          handleViewTraveller({ detail: parsed });
        }
      }
    } catch {}

    window.addEventListener('roamai_view_traveller', handleViewTraveller);
    return () => window.removeEventListener('roamai_view_traveller', handleViewTraveller);
  }, [travellers]);

  // Fetch completed trips for currently viewed profile to display Completed Trips and Travel DNA
  useEffect(() => {
    if (!viewingProfile) {
      setViewingProfileCompletedTrips([]);
      return;
    }

    let isMounted = true;
    const vId = viewingProfile.id;
    const cleanId = vId.replace(/^supa_/, '').replace(/^user_/, '');
    const cleanUname = viewingProfile.username.toLowerCase().replace(/^@+/, '');
    const cleanUnameNoUnderscore = cleanUname.replace(/_/g, '');
    const foundTrips: Trip[] = [];

    // 1. Search local storage for cached trips under this user ID or general trips (IMMEDIATE UI response: 0ms)
    if (typeof window !== 'undefined') {
      try {
        const keysToTry = [
          `tripwise_user_trips_v2_${cleanId}`,
          `tripwise_user_trips_v2_${vId}`,
          `tripwise_user_trips_v2_${cleanUname}`,
          `tripwise_user_trips_v2_${cleanUnameNoUnderscore}`,
          'tripwise_user_trips_v2'
        ];
        for (const key of keysToTry) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((t: any) => {
                if (t && (t.isCompleted || isTripCompleted(t))) {
                  if (!foundTrips.some((existing) => existing.id === t.id)) {
                    foundTrips.push(t);
                  }
                }
              });
            }
          }
        }
      } catch (e) {
        console.warn('Error reading local trips for profile:', e);
      }
    }

    // Hydrate immediately with local trips if found
    if (foundTrips.length > 0) {
      setViewingProfileCompletedTrips([...foundTrips]);
      setIsLoadingTrips(false);
    } else {
      setIsLoadingTrips(true);
    }

    const loadCompletedTrips = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (isMounted) setIsLoadingTrips(false);
        return;
      }

      // Parallelize Supabase trips query and profiles query with targeted columns
      try {
        const [tripsResult, profileResult] = await Promise.allSettled([
          supabase
            .from('trips')
            .select('id, user_id, trip_data, created_at')
            .or(`user_id.eq.${cleanId},user_id.eq.${vId}`),
          supabase
            .from('profiles')
            .select('id, name, avatar_url, bio, trips_count, places_count, countries_count')
            .or(`id.eq.${cleanId},username.ilike.@${cleanUname},username.ilike.${cleanUname}`)
            .maybeSingle()
        ]);

        if (tripsResult.status === 'fulfilled' && tripsResult.value.data) {
          const data = tripsResult.value.data;
          if (Array.isArray(data)) {
            data.forEach((row: any) => {
              const t = row.trip_data || row;
              if (t && (t.isCompleted || isTripCompleted(t))) {
                if (!foundTrips.some((existing) => existing.id === t.id)) {
                  foundTrips.push(t);
                }
              }
            });
          }
        }

        if (profileResult.status === 'fulfilled' && profileResult.value.data && isMounted) {
          const pData = profileResult.value.data;
          setViewingProfile((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              name: pData.name || prev.name,
              avatarUrl: pData.avatar_url || prev.avatarUrl,
              bio: cleanBio(pData.bio) || cleanBio(prev.bio) || '',
              tripsCount: pData.trips_count ?? prev.tripsCount,
              placesCount: pData.places_count ?? prev.placesCount,
              countriesCount: pData.countries_count ?? prev.countriesCount
            };
          });
        }
      } catch (err) {
        console.warn('Error fetching user trips and profile from Supabase:', err);
      }

      if (isMounted) {
        setViewingProfileCompletedTrips(foundTrips);
        setIsLoadingTrips(false);
      }
    };

    loadCompletedTrips();

    return () => {
      isMounted = false;
    };
  }, [viewingProfile?.id, viewingProfile?.username]);

  // Compute Travel DNA profile for the currently viewed traveller
  const viewingProfileTravelDNA = useMemo<TravelDNAAnalysis>(() => {
    return calculateTravelDNA(viewingProfileCompletedTrips);
  }, [viewingProfileCompletedTrips]);

  // Collect identifiers for the actively logged-in user only
  const currentIdentifiers = useMemo(() => {
    const ids = new Set<string>();
    const unames = new Set<string>();

    if (session?.user) {
      if (session.user.id) ids.add(session.user.id);
      const meta = (session.user.user_metadata || {}) as Record<string, any>;
      if (meta.username) {
        unames.add(meta.username.toLowerCase().replace(/^@+/, ''));
      }
      const cached = getCachedUserProfile(session.user.id);
      if (cached?.username) {
        unames.add(cached.username.toLowerCase().replace(/^@+/, ''));
      }
    }

    return { ids, unames };
  }, [session?.user?.id, session?.user?.user_metadata]);

  // Check if a profile belongs to the currently logged in user
  const isCurrentUser = useCallback((tr: TravellerProfile): boolean => {
    const cleanUname = tr.username.toLowerCase().replace(/^@+/, '');
    if (currentIdentifiers.unames.has(cleanUname)) return true;
    if (currentIdentifiers.ids.has(tr.id)) return true;
    if (tr.id.startsWith('supa_') && currentIdentifiers.ids.has(tr.id.replace('supa_', ''))) return true;
    return false;
  }, [currentIdentifiers]);

  // Fetch real registered profiles dynamically across Supabase, server registry, and local profiles
  useEffect(() => {
    let isMounted = true;
    // Do not fetch/display community accounts if the visitor is not logged in and not searching
    if (!session?.user && !searchQuery.trim()) {
      setTravellers([]);
      return;
    }

    const timer = setTimeout(() => {
      searchRealTravellers(searchQuery).then((results) => {
        if (isMounted) {
          const mapped = results.filter((t) => !isFakeMockUser(t.username));
          setTravellers(mapped);
        }
      });
    }, searchQuery.trim() ? 200 : 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, session?.user?.id]);

  // Global user trails list synced across all profiles
  const [globalTrailsList, setGlobalTrailsList] = useState<any[]>(() => getLocalTrails());

  useEffect(() => {
    let isMounted = true;
    const syncTrails = () => {
      fetchGlobalTrails().then((trails) => {
        if (isMounted && Array.isArray(trails)) {
          setGlobalTrailsList(trails);
        }
      });
    };
    syncTrails();

    const handleDeleted = (e: any) => {
      const deletedId = e.detail?.trailId;
      if (deletedId) {
        setGlobalTrailsList((prev) => prev.filter((t: any) => t && t.id !== deletedId));
        setActiveReelTrails((prev) => prev ? prev.filter((t: any) => t && t.id !== deletedId) : null);
      }
    };

    const handleSaved = () => {
      syncTrails();
    };

    const handleCloseActiveReel = () => {
      setActiveReelTrailId(null);
      setActiveReelTrails(null);
    };

    window.addEventListener('roamai_trail_deleted', handleDeleted);
    window.addEventListener('roamai_trail_saved', handleSaved);
    window.addEventListener('roamai_trail_liked', handleSaved);
    window.addEventListener('roamai_close_active_reel', handleCloseActiveReel);

    return () => {
      isMounted = false;
      window.removeEventListener('roamai_trail_deleted', handleDeleted);
      window.removeEventListener('roamai_trail_saved', handleSaved);
      window.removeEventListener('roamai_trail_liked', handleSaved);
      window.removeEventListener('roamai_close_active_reel', handleCloseActiveReel);
    };
  }, []);

  // Dynamic explore tiles from real user uploaded trails across all profiles
  const exploreTiles = useMemo<ExploreTile[]>(() => {
    if (!globalTrailsList || globalTrailsList.length === 0) return [];

    const isVideoExtension = (url?: string) => url && /\.(mp4|webm|mov|ogg)($|\?)/i.test(url);

    return globalTrailsList
      .filter((t: any) => t && !t.id?.startsWith('sample-trail-') && !isFakeMockUser(t.creator?.username) && isValidTrailMedia(t))
      .map((t: any, idx: number) => {
        const cleanPoster = t.posterUrl && !isVideoExtension(t.posterUrl) ? t.posterUrl : '';
        return {
          id: t.id || `trail-${idx}`,
          type: 'trail' as const,
          title: t.title || t.caption || 'Travel Reel',
          destination: t.destination || 'Explore Destination',
          imageUrl: cleanPoster,
          mediaUrl: t.mediaUrl,
          creator: {
            id: t.creator?.id,
            name: t.creator?.name || 'Traveler',
            username: t.creator?.username || '@traveler',
            avatarUrl: sanitizeAvatarUrl(t.creator?.avatarUrl) || ''
          },
          spanTwoRows: idx % 6 === 0
        };
      });
  }, [globalTrailsList]);

  // Trails uploaded by currently viewed user profile
  const viewingProfileTrails = useMemo(() => {
    if (!viewingProfile) return [];
    const vUname = viewingProfile.username.toLowerCase().replace(/^@+/, '');
    const vUnameNoUnderscore = vUname.replace(/_/g, '');
    const vName = viewingProfile.name.toLowerCase();
    const vId = viewingProfile.id;
    const vCleanId = vId.replace(/^supa_/, '').replace(/^user_/, '');

    return exploreTiles.filter((tile) => {
      const creatorUname = (tile.creator?.username || '').toLowerCase().replace(/^@+/, '');
      const creatorUnameNoUnderscore = creatorUname.replace(/_/g, '');
      const creatorName = (tile.creator?.name || '').toLowerCase();
      const creatorId = tile.creator?.id ? String(tile.creator.id).replace(/^supa_/, '').replace(/^user_/, '') : '';
      return (
        creatorUname === vUname ||
        (creatorUnameNoUnderscore && creatorUnameNoUnderscore === vUnameNoUnderscore) ||
        creatorName === vName ||
        (creatorId && (creatorId === vCleanId || creatorId === vId))
      );
    });
  }, [viewingProfile, exploreTiles]);

  // Full raw TrailReels uploaded by currently viewed user profile for Instagram Reels viewer
  const viewingProfileFullTrails = useMemo<TrailReel[]>(() => {
    if (!viewingProfile || !globalTrailsList) return [];
    const vUname = viewingProfile.username.toLowerCase().replace(/^@+/, '');
    const vUnameNoUnderscore = vUname.replace(/_/g, '');
    const vName = viewingProfile.name.toLowerCase();
    const vId = viewingProfile.id;
    const vCleanId = vId.replace(/^supa_/, '').replace(/^user_/, '');

    return (globalTrailsList as TrailReel[]).filter((t: any) => {
      if (!t || t.id?.startsWith('sample-trail-') || isFakeMockUser(t.creator?.username)) return false;
      const creatorUname = (t.creator?.username || '').toLowerCase().replace(/^@+/, '');
      const creatorUnameNoUnderscore = creatorUname.replace(/_/g, '');
      const creatorName = (t.creator?.name || '').toLowerCase();
      const creatorId = t.creator?.id ? String(t.creator.id).replace(/^supa_/, '').replace(/^user_/, '') : '';
      return (
        creatorUname === vUname ||
        (creatorUnameNoUnderscore && creatorUnameNoUnderscore === vUnameNoUnderscore) ||
        creatorName === vName ||
        (creatorId && (creatorId === vCleanId || creatorId === vId))
      );
    });
  }, [viewingProfile, globalTrailsList]);

  // Unique places visited by the viewed traveller (strictly from completed trips)
  const viewingProfilePlacesCount = useMemo(() => {
    if (viewingProfileCompletedTrips.length === 0) return 0;
    const places = new Set<string>();
    viewingProfileCompletedTrips.forEach((t) => {
      if (t.destination) places.add(t.destination.trim().toLowerCase());
      t.days?.forEach((d) => {
        d.activities?.forEach((a) => {
          if ((a as any).placeName) places.add((a as any).placeName.trim().toLowerCase());
        });
      });
    });
    return places.size;
  }, [viewingProfileCompletedTrips]);

  // Unique countries visited by the viewed traveller (strictly from completed trips)
  const viewingProfileCountriesCount = useMemo(() => {
    if (viewingProfileCompletedTrips.length === 0) return 0;
    const countries = new Set<string>();
    viewingProfileCompletedTrips.forEach((t) => {
      if ((t as any).destinationPlace?.country) {
        countries.add((t as any).destinationPlace.country.trim().toLowerCase());
      } else if (t.destination) {
        const parts = t.destination.split(',');
        if (parts.length > 1) {
          countries.add(parts[parts.length - 1].trim().toLowerCase());
        } else {
          countries.add(t.destination.trim().toLowerCase());
        }
      }
    });
    return countries.size;
  }, [viewingProfileCompletedTrips]);

  // Trips count (strictly from completed trips)
  const viewingProfileTripsCount = useMemo(() => {
    return viewingProfileCompletedTrips.length;
  }, [viewingProfileCompletedTrips.length]);

  // Suggested profiles for discover people section: ONLY shown for logged-in users, excluding yourself
  const suggestedProfiles = useMemo(() => {
    if (!session?.user) return [];
    return travellers.filter((t) => !isCurrentUser(t));
  }, [travellers, isCurrentUser, session]);

  // Filtered Travellers during active search
  const filteredTravellers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().replace(/^@+/, '');
    return travellers.filter((t) => {
      const cleanUser = t.username.toLowerCase().replace(/^@+/, '');
      return (
        t.name.toLowerCase().includes(q) ||
        cleanUser.includes(q) ||
        t.bio.toLowerCase().includes(q) ||
        t.recentPlaces.some((p) => p.toLowerCase().includes(q)) ||
        (t.topDNA && t.topDNA.some((dna) => dna.toLowerCase().includes(q)))
      );
    });
  }, [travellers, searchQuery]);

  // Filtered Explore Tiles during active search
  const filteredExploreTiles = useMemo(() => {
    if (!searchQuery.trim()) return exploreTiles;
    const q = searchQuery.toLowerCase().replace(/^@+/, '');
    return exploreTiles.filter((tile) =>
      (tile.title || '').toLowerCase().includes(q) ||
      (tile.destination || '').toLowerCase().includes(q) ||
      (tile.creator?.username || '').toLowerCase().includes(q)
    );
  }, [exploreTiles, searchQuery]);

  // Dynamic AI-generated and Trail-driven trending itineraries
  const [aiTrendingItineraries, setAiTrendingItineraries] = useState<TrendingItinerary[]>(() => {
    return getCachedTrendingItineraries() || [];
  });
  const [isLoadingTrends, setIsLoadingTrends] = useState<boolean>(() => {
    return !(getCachedTrendingItineraries()?.length);
  });
  const [isRefreshingTrends, setIsRefreshingTrends] = useState<boolean>(false);

  const loadTrendingItineraries = useCallback(async (force = false) => {
    if (force) {
      setIsRefreshingTrends(true);
    } else if (!aiTrendingItineraries.length) {
      setIsLoadingTrends(true);
    }

    try {
      const results = await fetchDynamicTrendingItineraries(globalTrailsList, force);
      if (Array.isArray(results) && results.length > 0) {
        setAiTrendingItineraries(results);
      }
    } catch (err) {
      console.warn('Failed to load dynamic trending itineraries:', err);
    } finally {
      setIsLoadingTrends(false);
      setIsRefreshingTrends(false);
    }
  }, [globalTrailsList, aiTrendingItineraries.length]);

  useEffect(() => {
    loadTrendingItineraries(false);
  }, [globalTrailsList]);

  // Dynamic trending itineraries merged with local saved trips
  const trendingItineraries = useMemo<TrendingItinerary[]>(() => {
    const list: TrendingItinerary[] = [...aiTrendingItineraries];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('tripwise_user_trips_v2');
        if (raw) {
          const trips: Trip[] = JSON.parse(raw);
          if (Array.isArray(trips)) {
            trips.slice(0, 3).forEach((t) => {
              if (t && t.destination && !list.some((item) => item.destination.toLowerCase() === t.destination.toLowerCase())) {
                list.unshift({
                  id: `user-trip-${t.id}`,
                  title: t.title || `${t.destination} Itinerary`,
                  destination: t.destination,
                  destinationSubtitle: t.destinationStateOrCountry || 'Planned Itinerary',
                  durationDays: t.durationDays || (t.days?.length || 3),
                  estimatedBudget: t.currency && t.targetBudget ? `${t.currency}${t.targetBudget.toLocaleString()}` : 'Custom Plan',
                  heroImage: t.heroImage || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80',
                  tags: t.preferences?.styles && t.preferences.styles.length > 0 ? t.preferences.styles.slice(0, 4) : ['Custom Itinerary', 'Travel Plan'],
                  vibe: 'Custom Trip',
                  highlights: t.days?.slice(0, 3).map((d) => d.theme || `Day ${d.dayNumber}: ${d.activities?.[0]?.title || 'Explore'}`) || ['Tailored day-by-day plan'],
                  description: `Custom itinerary generated for ${t.destination} with ${t.durationDays || t.days?.length || 3} days of curated activities.`,
                  sourceBadge: 'My Trip'
                });
              }
            });
          }
        }
      } catch {}
    }
    return list;
  }, [aiTrendingItineraries]);

  const filteredItineraries = useMemo(() => {
    if (!searchQuery.trim()) return trendingItineraries;
    const q = searchQuery.toLowerCase().trim();
    return trendingItineraries.filter((it) =>
      it.destination.toLowerCase().includes(q) ||
      it.title.toLowerCase().includes(q) ||
      it.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [trendingItineraries, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  // Handle clicking on any profile:
  // - If it's the user's OWN account, redirect to their profile page!
  // - If it's another user, open their Instagram profile view in the same page.
  const handleProfileClick = (tr: TravellerProfile) => {
    if (isCurrentUser(tr)) {
      if (onOpenOwnProfile) {
        onOpenOwnProfile();
      } else {
        onSelectTraveller?.(tr);
      }
      return;
    }
    setViewingProfile(tr);
    setProfileTab('trips');
    onSelectTraveller?.(tr);
  };

  const handleShareProfile = (tr: TravellerProfile) => {
    const link = `${window.location.origin}/#search?user=${tr.username.replace(/^@+/, '')}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        setShareToast(`Link to ${tr.username}'s profile copied!`);
        setTimeout(() => setShareToast(null), 2500);
      });
    }
  };

  // =========================================================================
  // VIEW A: INSTAGRAM OTHER USER'S PROFILE (Rendered in same page)
  // =========================================================================
  if (viewingProfile) {
    return (
      <div className="min-h-screen bg-black text-white pb-40 select-none animate-in fade-in duration-200">
        {/* Top Sticky Profile Header Bar */}
        <div 
          className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-neutral-900 px-3 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between"
          style={{ paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 8px)' }}
        >
          <button
            type="button"
            onClick={() => setViewingProfile(null)}
            className="flex items-center gap-1.5 text-neutral-300 hover:text-white cursor-pointer px-2 py-1 -ml-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-semibold text-neutral-400">Search</span>
          </button>

          <div className="flex items-center gap-1.5 font-bold text-sm text-white">
            <span>{viewingProfile.username}</span>
          </div>

          <button
            type="button"
            onClick={() => handleShareProfile(viewingProfile)}
            className="p-1.5 text-neutral-400 hover:text-white cursor-pointer rounded-full hover:bg-neutral-800 transition-colors"
            title="Share Profile"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Share Toast */}
        {shareToast && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#1e1e1e] border border-neutral-700 text-white text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{shareToast}</span>
          </div>
        )}

        {/* Profile Content Container */}
        <div className="max-w-2xl mx-auto px-4 pt-3">
          {/* Header Row: Avatar on Left, Name + Stats on Right (matches UserProfileView) */}
          <div className="flex items-center gap-5 sm:gap-8">
            {/* Avatar on Left */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-zinc-800 bg-zinc-900 shadow-md">
                {viewingProfile.avatarUrl ? (
                  <img
                    src={viewingProfile.avatarUrl}
                    alt={viewingProfile.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl select-none">
                    {viewingProfile.name?.charAt(0).toUpperCase() || viewingProfile.username?.replace(/^@/, '').charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Name & Level Badge, and Stats (post) */}
            <div className="flex-1 flex flex-col justify-center">
              {/* User Full Name & Level Badge */}
              <div className="flex items-center gap-2 flex-wrap mb-2.5">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {viewingProfile.name}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Award className="w-3 h-3" />
                  <span>Level {Math.max(1, Math.min(10, Math.floor(viewingProfileTripsCount / 2) + 1))}</span>
                </span>
              </div>

              {/* STATS: POST */}
              <div className="flex items-center text-left pt-1">
                {/* Posts */}
                <div
                  onClick={() => setProfileTab('trips')}
                  className="cursor-pointer group"
                >
                  <span className="block font-bold text-base sm:text-lg text-white group-hover:text-zinc-300 transition-colors leading-tight">
                    {viewingProfileTripsCount + viewingProfileTrails.length}
                  </span>
                  <span className="block text-xs text-zinc-300 font-normal mt-0.5">
                    {viewingProfileTripsCount + viewingProfileTrails.length === 1 ? 'post' : 'posts'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bio & Details */}
          <div className="mt-3 text-left">
            {cleanBio(viewingProfile.bio) && (
              <p className="text-xs sm:text-sm text-zinc-200 font-normal leading-relaxed whitespace-pre-line mb-1">
                {cleanBio(viewingProfile.bio)}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium flex-wrap">
              <span className="text-zinc-500 font-mono">
                {viewingProfile.username}
              </span>
            </div>
          </div>

          {/* Action Button: Plan a Trip */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                if (onStartPlanning) {
                  onStartPlanning(viewingProfileCompletedTrips[0]?.destination);
                }
              }}
              className="w-full py-2 px-3 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] active:bg-[#0077c5] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-center shadow-md flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Plan a Trip</span>
            </button>
          </div>

          {/* Dedicated Travel Footprint Counter Section (Public for all users to see) */}
          <div className="mt-3.5 mb-2 p-3 sm:p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md">
            <div className="flex items-center justify-around text-center divide-x divide-zinc-800">
              {/* Trips */}
              <div 
                onClick={() => setProfileTab('trips')}
                className="flex-1 px-2 cursor-pointer group transition-transform active:scale-95"
                title="Trips"
              >
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Compass className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
                  <span className="font-extrabold text-base sm:text-lg text-white group-hover:text-emerald-400 transition-colors leading-tight">
                    {viewingProfileTripsCount}
                  </span>
                </div>
                <span className="block text-[11px] sm:text-xs text-zinc-400 font-medium tracking-wide">
                  trips
                </span>
              </div>

              {/* Countries Visited */}
              <div 
                onClick={() => setProfileTab('trips')}
                className="flex-1 px-2 cursor-pointer group transition-transform active:scale-95"
                title="Countries visited"
              >
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <MapPin className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                  <span className="font-extrabold text-base sm:text-lg text-white group-hover:text-teal-400 transition-colors leading-tight">
                    {viewingProfileCountriesCount}
                  </span>
                </div>
                <span className="block text-[11px] sm:text-xs text-zinc-400 font-medium tracking-wide">
                  countries
                </span>
              </div>

              {/* Places Visited */}
              <div 
                onClick={() => setProfileTab('trips')}
                className="flex-1 px-2 cursor-pointer group transition-transform active:scale-95"
                title="Places visited"
              >
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Mountain className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="font-extrabold text-base sm:text-lg text-white group-hover:text-cyan-400 transition-colors leading-tight">
                    {viewingProfilePlacesCount}
                  </span>
                </div>
                <span className="block text-[11px] sm:text-xs text-zinc-400 font-medium tracking-wide">
                  places
                </span>
              </div>
            </div>
          </div>

          {/* 4. Profile Tabs: Completed Trips | Trails | Travel DNA (Just symbols matching own profile) */}
          <div className="border-t border-neutral-800 mt-2">
            <div className="flex border-b border-neutral-800">
              {/* Tab 1: Completed Trips (Grid icon) */}
              <button
                type="button"
                onClick={() => setProfileTab('trips')}
                className={`flex-1 py-3 flex items-center justify-center relative transition-colors cursor-pointer ${
                  profileTab === 'trips' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title="Completed Trips"
                aria-label="Completed Trips"
              >
                <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6" />
                {profileTab === 'trips' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white" />
                )}
              </button>

              {/* Tab 2: Trails (Film icon) */}
              <button
                type="button"
                onClick={() => setProfileTab('trails')}
                className={`flex-1 py-3 flex items-center justify-center relative transition-colors cursor-pointer ${
                  profileTab === 'trails' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title="Trails"
                aria-label="Trails"
              >
                <Film className="w-5 h-5 sm:w-6 sm:h-6" />
                {profileTab === 'trails' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white" />
                )}
              </button>

              {/* Tab 3: Travel DNA Profile (Sparkles icon) */}
              <button
                type="button"
                onClick={() => setProfileTab('dna')}
                className={`flex-1 py-3 flex items-center justify-center relative transition-colors cursor-pointer ${
                  profileTab === 'dna' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title="Travel DNA"
                aria-label="Travel DNA"
              >
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                {profileTab === 'dna' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white" />
                )}
              </button>
            </div>

            {/* Tab 1: Completed Trips Grid */}
            {profileTab === 'trips' && (
              viewingProfileCompletedTrips.length > 0 ? (
                <div className="grid grid-cols-3 gap-0.5 sm:gap-1.5 pt-2">
                  {viewingProfileCompletedTrips.map((trip) => (
                    <div
                      key={trip.id}
                      onClick={() => onStartPlanning?.(trip.destination)}
                      className="relative aspect-square overflow-hidden cursor-pointer group bg-neutral-900 rounded-xs"
                    >
                      <img
                        src={trip.heroImage || '/images/bg_waterfall.jpg'}
                        alt={trip.destination}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-white text-[9px] font-extrabold flex items-center gap-1 shadow-md">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        <span>Completed</span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end">
                        <span className="text-xs font-bold text-white drop-shadow-xs truncate">
                          {trip.destination}
                        </span>
                        <span className="text-[10px] text-neutral-300 font-medium truncate">
                          {trip.durationDays || 3} Days
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 px-4 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white">No Completed Trips Yet</h4>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                    When {viewingProfile.name} completes journeys, their travel footprints will appear here.
                  </p>
                </div>
              )
            )}

            {/* Tab 2: Trails Grid */}
            {profileTab === 'trails' && (
              viewingProfileTrails.length > 0 ? (
                <div className="grid grid-cols-3 gap-0.5 sm:gap-1.5 pt-2">
                  {viewingProfileTrails.map((trail) => (
                    <div
                      key={trail.id}
                      onClick={() => {
                        setActiveReelTrails(viewingProfileFullTrails.length > 0 ? viewingProfileFullTrails : null);
                        setActiveReelTitle(viewingProfile?.username ? `@${viewingProfile.username.replace(/^@+/, '')}'s Trails` : `${viewingProfile?.name || 'User'}'s Trails`);
                        setActiveReelTrailId(trail.id);
                      }}
                      className="relative aspect-square overflow-hidden cursor-pointer group bg-neutral-900 rounded-xs"
                    >
                      {trail.imageUrl ? (
                        <img
                          src={trail.imageUrl}
                          alt={trail.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center p-2 text-center">
                          <Video className="w-5 h-5 text-neutral-600 mb-1" />
                          <span className="text-[10px] text-neutral-400 truncate">{trail.destination}</span>
                        </div>
                      )}
                      <div className="absolute top-1.5 right-1.5 text-white drop-shadow">
                        <Video className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                    <Video className="w-5 h-5 text-neutral-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No Trails Uploaded Yet</h3>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                    When {viewingProfile.name} uploads trails or travel moments, they will appear here.
                  </p>
                </div>
              )
            )}

            {/* Tab 3: Travel DNA Profile */}
            {profileTab === 'dna' && (
              <div className="pt-3 space-y-3 text-left">
                {/* Travel Archetype Hero Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#141419] border border-white/10 shadow-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Travel DNA Profile
                    </span>
                    <span className="text-[11px] text-neutral-400 font-semibold">
                      {viewingProfileCompletedTrips.length} {viewingProfileCompletedTrips.length === 1 ? 'Trip' : 'Trips'} Completed
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {viewingProfileTravelDNA.archetype.title}
                  </h3>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {viewingProfileTravelDNA.archetype.description}
                  </p>
                </div>

                {/* Vibe Breakdown */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#141419] border border-white/10 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      Vibe Breakdown
                    </h4>
                    <span className="text-[10px] text-neutral-400">
                      Based on travel footprint
                    </span>
                  </div>

                  {Object.entries(viewingProfileTravelDNA.scores).map(([trait, score]) => (
                    <div key={trait} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize text-neutral-300 font-medium">{trait}</span>
                        <span className="font-bold text-white">{score}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                        <div 
                          className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(score, 12)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Learned Preferences */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#141419] border border-white/10 shadow-xl space-y-2.5">
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    Travel Preferences & Style
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                      <span className="text-[10px] text-neutral-400 block mb-0.5">Transport</span>
                      <span className="text-white font-semibold">{viewingProfileTravelDNA.preferences.transport}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                      <span className="text-[10px] text-neutral-400 block mb-0.5">Pace</span>
                      <span className="text-white font-semibold">{viewingProfileTravelDNA.preferences.pace}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                      <span className="text-[10px] text-neutral-400 block mb-0.5">Budget</span>
                      <span className="text-white font-semibold">{viewingProfileTravelDNA.preferences.budget}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                      <span className="text-[10px] text-neutral-400 block mb-0.5">Stays</span>
                      <span className="text-white font-semibold">{viewingProfileTravelDNA.preferences.accommodation}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trail Preview Modal */}
        {selectedTile && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm sm:max-w-md bg-[#161616] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl space-y-3">
              <div className="relative aspect-4/3 sm:aspect-video w-full overflow-hidden bg-black">
                {selectedTile.imageUrl ? (
                  <img
                    src={selectedTile.imageUrl}
                    alt={selectedTile.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-500">
                    <Video className="w-10 h-10" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedTile(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                </div>

              <div className="p-4 pt-1 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">
                    @{selectedTile.creator?.username ? selectedTile.creator.username.replace(/^@/, '') : 'traveler'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full">
                    <MapPin className="w-3 h-3" />
                    {selectedTile.destination}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-medium">
                  {selectedTile.title}
                </p>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      const tileId = selectedTile.id;
                      const tileCreatorUname = (selectedTile.creator?.username || '').toLowerCase().replace(/^@+/, '');
                      const creatorTrails = (globalTrailsList as TrailReel[]).filter((t: any) => {
                        const u = (t.creator?.username || '').toLowerCase().replace(/^@+/, '');
                        return u === tileCreatorUname;
                      });
                      setSelectedTile(null);
                      setActiveReelTrails(creatorTrails.length > 0 ? creatorTrails : (globalTrailsList as TrailReel[]));
                      setActiveReelTitle(selectedTile.creator?.username || 'Community Trails');
                      setActiveReelTrailId(tileId);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Watch in Trails</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTile(null);
                      onStartPlanning?.(selectedTile.destination);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#0095f6] hover:bg-[#1877f2] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Plan Trip</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW B: MAIN SEARCH & EXPLORE FEED (When no profile is actively opened)
  // =========================================================================
  return (
    <div className="min-h-screen bg-black text-white pb-40 select-none">
      {/* 1. Sleek Instagram Search Bar (Sticky Top) */}
      <div 
        className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-neutral-900 px-3 py-2.5 sm:px-6 sm:py-3"
        style={{ paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 8px)' }}
      >
        <div className="max-w-md sm:max-w-3xl mx-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search profiles and trails..."
              className="w-full bg-[#262626] hover:bg-[#2f2f2f] focus:bg-[#2c2c2c] border border-white/5 rounded-xl pl-10 pr-9 py-2 text-sm text-white placeholder:text-neutral-400 focus:outline-hidden transition-all shadow-inner"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-3 flex items-center gap-1 text-[10px] font-bold text-neutral-400 pointer-events-none">
                <Sparkles className="w-3 h-3 text-neutral-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="max-w-md sm:max-w-3xl mx-auto px-2 sm:px-4 pt-3">
        {/* ============================================================ */}
        {/* A. SEARCH MODE (When user is actively typing in search bar)  */}
        {/* ============================================================ */}
        {isSearching ? (
          <div className="space-y-6">
            {/* Matching Accounts / Profiles (Instagram Style) */}
            {filteredTravellers.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  Profiles ({filteredTravellers.length})
                </div>

                <div className="divide-y divide-neutral-900 bg-[#121212] border border-neutral-800/80 rounded-2xl overflow-hidden shadow-md">
                  {filteredTravellers.map((tr) => {
                    const cleanUser = tr.username.replace(/^@+/, '').toLowerCase();
                    const isOwn = isCurrentUser(tr);

                    return (
                      <div
                        key={tr.id}
                        onClick={() => handleProfileClick(tr)}
                        className="flex items-center justify-between gap-3 p-3 hover:bg-[#1a1a1a] transition-colors cursor-pointer group"
                      >
                        {/* Avatar & User Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          {tr.avatarUrl ? (
                            <img
                              src={tr.avatarUrl}
                              alt={tr.name}
                              className="w-11 h-11 rounded-full object-cover shrink-0 group-hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white font-bold text-sm shrink-0 select-none group-hover:scale-105 transition-transform">
                              {tr.name?.charAt(0).toUpperCase() || tr.username?.replace(/^@/, '').charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                                {tr.username}
                              </span>
                              {isOwn && (
                                <span className="text-[10px] font-bold text-neutral-300 bg-white/10 px-1.5 py-0.2 rounded shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 truncate">
                              {tr.name}
                            </p>
                            {cleanBio(tr.bio) && (
                              <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                                {cleanBio(tr.bio)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Button: If own account, "Your Profile" / else "View" */}
                        {isOwn ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProfileClick(tr);
                            }}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#262626] hover:bg-[#333333] text-neutral-200 border border-neutral-700 transition-all cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            <User className="w-3 h-3 text-neutral-400" />
                            <span>Your Profile</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProfileClick(tr);
                            }}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/60 transition-all cursor-pointer shrink-0"
                          >
                            View
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Matching Trails Grid */}
            {filteredExploreTiles.length > 0 && (
              <div className="space-y-2">
                <div className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-rose-400" />
                  Trails ({filteredExploreTiles.length})
                </div>

                <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                  {filteredExploreTiles.map((tile) => (
                    <div
                      key={tile.id}
                      onClick={() => setSelectedTile(tile)}
                      className="relative aspect-[4/5] sm:aspect-square overflow-hidden cursor-pointer group bg-neutral-900 rounded-sm"
                    >
                      {tile.imageUrl ? (
                        <img
                          src={tile.imageUrl}
                          alt={tile.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center p-2 text-center select-none">
                          <Video className="w-5 h-5 text-neutral-500 mb-1" />
                          <span className="text-[10px] font-medium text-neutral-400 line-clamp-1">{tile.destination}</span>
                        </div>
                      )}

                      <div className="absolute top-2 right-2 text-white drop-shadow-md">
                        <Video className="w-3.5 h-3.5" />
                      </div>

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                        <span className="text-[11px] font-semibold text-white truncate">
                          {tile.creator?.username || '@traveler'}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white line-clamp-2 leading-tight">
                            {tile.title}
                          </p>
                          <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{tile.destination}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State when no profiles or trails match */}
            {filteredTravellers.length === 0 && filteredExploreTiles.length === 0 && (
              <div className="py-20 text-center space-y-3 px-4">
                <div className="w-14 h-14 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">No results found for &ldquo;{searchQuery}&rdquo;</h3>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  Check the spelling or try searching for another username, traveller name, or destination.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================ */
          /* B. DEFAULT INSTAGRAM EXPLORE FEED (!isSearching)            */
          /* ============================================================ */
          <div className="space-y-5">
            {/* 1. "Suggested for you" / "Discover People" Carousel (Excludes Current User) */}
            {suggestedProfiles.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    Suggested for you
                  </span>
                  <span className="text-[11px] text-neutral-500 font-medium">
                    Discover travelers
                  </span>
                </div>

                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 px-0.5">
                  {suggestedProfiles.map((tr) => {
                    const cleanUser = tr.username.replace(/^@+/, '').toLowerCase();

                    return (
                      <div
                        key={tr.id}
                        onClick={() => handleProfileClick(tr)}
                        className="w-[145px] sm:w-[160px] shrink-0 bg-[#121212] border border-neutral-800/90 rounded-2xl p-3 flex flex-col items-center text-center group cursor-pointer hover:border-neutral-700 transition-all shadow-sm"
                      >
                        {/* Profile Avatar (Clean, NO gradient ring) */}
                        {tr.avatarUrl ? (
                          <img
                            src={tr.avatarUrl}
                            alt={tr.name}
                            className="w-14 h-14 rounded-full object-cover mb-2 group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white font-bold text-base mb-2 select-none group-hover:scale-105 transition-transform">
                            {tr.name?.charAt(0).toUpperCase() || tr.username?.replace(/^@/, '').charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}

                        <h4 className="text-xs font-bold text-white truncate w-full group-hover:text-blue-400 transition-colors">
                          {tr.username}
                        </h4>
                        <p className="text-[11px] text-neutral-400 truncate w-full mt-0.5">
                          {tr.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. "Trending Itineraries" Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Trending Itineraries
                  <span className="ml-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full lowercase tracking-normal">
                    AI & Trails Live
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadTrendingItineraries(true)}
                    disabled={isRefreshingTrends}
                    title="Refresh AI Trends"
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1 text-[11px] font-medium disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCw className={`w-3 h-3 ${isRefreshingTrends ? 'animate-spin text-emerald-400' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <span className="text-[11px] text-neutral-500 font-medium">
                    {filteredItineraries.length} {filteredItineraries.length === 1 ? 'itinerary' : 'itineraries'}
                  </span>
                </div>
              </div>

              {isLoadingTrends && filteredItineraries.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="rounded-2xl overflow-hidden bg-[#141419] border border-white/5 animate-pulse flex flex-col aspect-[16/14]"
                    >
                      <div className="aspect-[16/10] w-full bg-neutral-800/70" />
                      <div className="p-3.5 space-y-2 flex-1">
                        <div className="h-4 bg-neutral-800 rounded-md w-3/4" />
                        <div className="h-3 bg-neutral-800/60 rounded-md w-1/2" />
                        <div className="h-3 bg-neutral-800/40 rounded-md w-5/6" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredItineraries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {filteredItineraries.map((itinerary) => (
                    <div
                      key={itinerary.id}
                      onClick={() => setSelectedItinerary(itinerary)}
                      className="group relative rounded-2xl overflow-hidden bg-[#141419] border border-white/10 hover:border-emerald-500/50 shadow-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:shadow-emerald-950/20 cursor-pointer flex flex-col"
                    >
                      {/* Image Header with floating badges */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-900">
                        <img
                          src={itinerary.heroImage}
                          alt={itinerary.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 shadow-sm">
                              <Calendar className="w-3 h-3 text-emerald-400" />
                              {itinerary.durationDays} Days
                            </span>
                            {itinerary.sourceBadge === 'Trending on Trails' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-600/40 shadow-sm">
                                <Flame className="w-3 h-3 text-amber-400" />
                                {itinerary.trailCount ? `${itinerary.trailCount} Trails` : 'On Trails'}
                              </span>
                            ) : itinerary.sourceBadge === 'My Trip' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-300 bg-teal-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-teal-500/40 shadow-sm">
                                My Trip
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-indigo-500/40 shadow-sm">
                                <Sparkles className="w-3 h-3 text-indigo-400" />
                                AI Trend
                              </span>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-700/50 shadow-sm shrink-0">
                            {itinerary.estimatedBudget}
                          </span>
                        </div>

                        {/* Destination Pill at bottom of image */}
                        <div className="absolute bottom-2.5 left-2.5 right-2.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/95 drop-shadow-md">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{itinerary.destination}</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                            {itinerary.title}
                          </h3>

                          {/* Highlights Preview */}
                          {itinerary.highlights && itinerary.highlights.length > 0 && (
                            <ul className="space-y-1">
                              {itinerary.highlights.slice(0, 2).map((h, i) => (
                                <li key={i} className="text-[11px] text-neutral-400 flex items-center gap-1.5 truncate">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                  <span className="truncate">{h}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Tags and CTA Button */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-1 overflow-hidden max-h-5">
                            {itinerary.tags.slice(0, 2).map((t) => (
                              <span key={t} className="text-[10px] font-semibold text-neutral-400 bg-white/5 px-2 py-0.5 rounded-md">
                                #{t}
                              </span>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartPlanning?.(itinerary.destination);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer shrink-0"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Plan Trip</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center space-y-3 px-4 bg-[#121212] border border-neutral-800/80 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                    <Calendar className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No Trending Itineraries Found</h3>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                    Try searching for a different destination or explore our top recommendations.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Interactive Trail Preview Modal */}
      {selectedTile && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm sm:max-w-md bg-[#161616] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl space-y-3">
            {/* Media Header */}
            <div className="relative aspect-4/3 sm:aspect-video w-full overflow-hidden bg-black">
              {selectedTile.imageUrl ? (
                <img
                  src={selectedTile.imageUrl}
                  alt={selectedTile.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-500">
                  <Video className="w-10 h-10" />
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedTile(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            {/* Content Details */}
            <div className="p-4 pt-1 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {selectedTile.creator?.avatarUrl ? (
                    <img
                      src={selectedTile.creator?.avatarUrl}
                      alt={selectedTile.creator?.username || 'traveler'}
                      className="w-8 h-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white font-bold text-xs select-none">
                      {selectedTile.creator?.username ? selectedTile.creator.username.replace(/^@/, '').charAt(0).toUpperCase() : 'T'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {selectedTile.creator?.username || '@traveler'}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">{selectedTile.creator?.name || 'Travel Creator'}</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full shrink-0">
                  <MapPin className="w-3 h-3" />
                  {selectedTile.destination}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-medium">
                {selectedTile.title}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTile(null);
                    onOpenTrail?.(selectedTile.id);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Watch in Trails</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTile(null);
                    onStartPlanning?.(selectedTile.destination);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#0095f6] hover:bg-[#1877f2] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Plan This Trip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Interactive Trending Itinerary Preview Modal */}
      {selectedItinerary && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm sm:max-w-lg bg-[#161616] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl space-y-4">
            {/* Header Image */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
              <img
                src={selectedItinerary.heroImage}
                alt={selectedItinerary.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

              <button
                type="button"
                onClick={() => setSelectedItinerary(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Badges on image */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  {selectedItinerary.durationDays} Days
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-700/60">
                  {selectedItinerary.estimatedBudget}
                </span>
              </div>

              <div className="absolute bottom-3 left-4 right-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {selectedItinerary.destination}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white drop-shadow-md">
                  {selectedItinerary.title}
                </h3>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-5 pt-0 space-y-4">
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                {selectedItinerary.description}
              </p>

              {/* Highlights */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Key Itinerary Highlights
                </span>
                <ul className="space-y-1.5 bg-neutral-900/80 border border-neutral-800 rounded-xl p-3">
                  {selectedItinerary.highlights.map((highlight, idx) => (
                    <li key={idx} className="text-xs text-neutral-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {selectedItinerary.tags.map((tag) => (
                  <span key={tag} className="text-xs font-medium text-neutral-400 bg-neutral-800/80 border border-neutral-700/50 px-2.5 py-1 rounded-lg">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSelectedItinerary(null)}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>Close</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const dest = selectedItinerary.destination;
                    setSelectedItinerary(null);
                    onStartPlanning?.(dest);
                  }}
                  className="flex-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Plan This Itinerary</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* --- INSTAGRAM REELS FULL-SCREEN VIEWER --- */}
      {activeReelTrailId && (
        <div className="fixed inset-0 z-[100] bg-black w-full h-full animate-fade-in select-none">
          <TrailsView
            currentTheme={currentTheme}
            session={session}
            isActive={true}
            customTrails={activeReelTrails && activeReelTrails.length > 0 ? activeReelTrails : undefined}
            initialTrailId={activeReelTrailId}
            showBackButton={true}
            feedTitle={activeReelTitle}
            onBack={() => {
              setActiveReelTrailId(null);
              setActiveReelTrails(null);
            }}
            onDeleteTrail={(deletedId) => {
              setGlobalTrailsList((prev) => prev.filter((t: any) => t && t.id !== deletedId));
              setActiveReelTrails((prev) => prev ? prev.filter((t: any) => t && t.id !== deletedId) : null);
            }}
            onStartPlanning={(dest) => {
              setActiveReelTrailId(null);
              setActiveReelTrails(null);
              onStartPlanning?.(dest);
            }}
            onRequireAuth={onRequireAuth}
            onOpenUserProfile={(traveller) => {
              setActiveReelTrailId(null);
              setActiveReelTrails(null);
              window.dispatchEvent(new CustomEvent('roamai_view_traveller', { detail: traveller }));
            }}
            onOpenOwnProfile={() => {
              setActiveReelTrailId(null);
              setActiveReelTrails(null);
              onOpenOwnProfile?.();
            }}
          />
        </div>
      )}
    </div>
  );
};
