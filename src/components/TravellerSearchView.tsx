import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Search, 
  MapPin, 
  Play, 
  Eye, 
  X, 
  Heart,
  Video,
  Users,
  Flame,
  Sparkles,
  ArrowLeft,
  Share2,
  Check,
  User
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { ThemeConfig } from '../types';
import { sanitizeAvatarUrl, getCachedUserProfile } from '../services/supabaseClient';
import { searchRealTravellers } from '../services/usernameService';
import { fetchGlobalTrails, getLocalTrails } from '../services/sharedTrailsService';
import { FollowListModal } from './FollowListModal';
import { getFollowCounts, toggleFollowUser, isUserFollowing } from '../services/followService';



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
  topDNA: string[];
  recentPlaces: string[];
  isFollowing?: boolean;
}

export interface ExploreTile {
  id: string;
  type: 'trail' | 'place' | 'photo';
  title: string;
  destination: string;
  imageUrl: string;
  videoUrl?: string;
  viewsCount: string;
  likesCount: string;
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
}

const FOLLOWING_STORAGE_KEY = 'roamai_following_users';

function getFollowedUserIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(FOLLOWING_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveFollowedUserIds(followed: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    const arr = Array.from(followed);
    localStorage.setItem(FOLLOWING_STORAGE_KEY, JSON.stringify(arr));
    // Update local profile stats followingCount if cached
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tripwise_user_profile_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const profile = JSON.parse(raw);
          if (profile && profile.stats) {
            profile.stats.followingCount = arr.length;
            localStorage.setItem(key, JSON.stringify(profile));
          }
        }
      }
    }
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('roamai_follow_changed', { detail: { count: arr.length } }));
  } catch (e) {
    console.warn('Failed to save followed users:', e);
  }
}

export const TravellerSearchView: React.FC<TravellerSearchViewProps> = ({
  session,
  onSelectTraveller,
  onOpenOwnProfile,
  onOpenTrail,
  onStartPlanning
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [travellers, setTravellers] = useState<TravellerProfile[]>([]);
  const [selectedTile, setSelectedTile] = useState<ExploreTile | null>(null);
  const [followedSet, setFollowedSet] = useState<Set<string>>(() => getFollowedUserIds());

  // Instagram-style active viewing profile (opens profile in the same page)
  const [viewingProfile, setViewingProfile] = useState<TravellerProfile | null>(null);
  const [profileTab, setProfileTab] = useState<'trails' | 'places'>('trails');
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Followers & Following Modal State
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers');

  // Listen for navigation event to open a traveller's profile
  useEffect(() => {
    const handleViewTraveller = (e: any) => {
      if (e.detail) {
        const d = e.detail;
        const cleanUname = (d.username || '').replace(/^@+/, '');
        setViewingProfile({
          id: d.id || `user_${cleanUname}`,
          name: d.name || cleanUname,
          username: d.username?.startsWith('@') ? d.username : `@${cleanUname}`,
          avatarUrl: d.avatarUrl || '',
          location: d.location || 'Traveler',
          bio: d.bio || 'Exploring new places, one trip at a time 🌍',
          level: d.level || 'Travel Explorer',
          tripsCount: d.tripsCount || 0,
          placesCount: d.placesCount || 0,
          topDNA: d.topDNA || ['Adventure', 'Nature'],
          recentPlaces: d.recentPlaces || [],
          isFollowing: !!d.isFollowing
        });
        setProfileTab('trails');
      }
    };
    window.addEventListener('roamai_view_traveller', handleViewTraveller);
    return () => window.removeEventListener('roamai_view_traveller', handleViewTraveller);
  }, []);

  // Collect all identifiers for currently logged-in user to prevent suggesting oneself
  const currentIdentifiers = useMemo(() => {
    const ids = new Set<string>();
    const unames = new Set<string>();

    if (session?.user) {
      if (session.user.id) ids.add(session.user.id);
      if (session.user.email) {
        const emUname = session.user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (emUname) unames.add(emUname);
      }
      const meta = (session.user.user_metadata || {}) as Record<string, any>;
      if (meta.username) {
        unames.add(meta.username.toLowerCase().replace(/^@+/, ''));
      }
      const cached = getCachedUserProfile(session.user.id);
      if (cached?.username) {
        unames.add(cached.username.toLowerCase().replace(/^@+/, ''));
      }
    }

    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('tripwise_user_profile_')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const data = JSON.parse(raw);
              if (data.id) ids.add(data.id);
              if (data.username) unames.add(data.username.toLowerCase().replace(/^@+/, ''));
              if (data.email) {
                const em = data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
                if (em) unames.add(em);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error reading local user profile identifiers:', err);
      }
    }

    return { ids, unames };
  }, [session?.user?.id, session?.user?.email, session?.user?.user_metadata]);

  // Current logged in user profile object for follow relationships
  const currentUserProfile = useMemo(() => {
    const cached = session?.user?.id ? getCachedUserProfile(session.user.id) : null;
    const meta = (session?.user?.user_metadata || {}) as Record<string, any>;
    const uName = cached?.username || meta.username || (session?.user?.email ? `@${session.user.email.split('@')[0]}` : '@traveler');
    const name = cached?.name || meta.full_name || meta.name || uName.replace(/^@/, '');
    const avatarUrl = sanitizeAvatarUrl(cached?.avatarUrl || meta.avatar_url || meta.avatarUrl || '');
    return {
      id: session?.user?.id || `user_${uName.replace(/^@/, '')}`,
      username: uName.startsWith('@') ? uName : `@${uName}`,
      name,
      avatarUrl
    };
  }, [session?.user]);


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
    searchRealTravellers(searchQuery).then((results) => {
      if (isMounted) {
        const currentFollows = getFollowedUserIds();
        const mapped = results.map((t) => {
          const cleanUser = t.username.replace(/^@+/, '').toLowerCase();
          const isF = currentFollows.has(t.id) || currentFollows.has(cleanUser);
          return { ...t, isFollowing: isF };
        });
        setTravellers(mapped);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [searchQuery]);

  // Sync followed set with storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setFollowedSet(getFollowedUserIds());
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('roamai_follow_changed', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('roamai_follow_changed', handleStorageChange);
    };
  }, []);

  // Toggle follow/following status for a user
  const toggleFollow = useCallback((id: string, username: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const cleanUser = username.replace(/^@+/, '').toLowerCase();

    // Sync with followService
    const matched = travellers.find((t) => t.id === id || t.username.replace(/^@+/, '').toLowerCase() === cleanUser);
    const targetName = matched?.name || (viewingProfile && viewingProfile.username.replace(/^@+/, '').toLowerCase() === cleanUser ? viewingProfile.name : cleanUser);
    const targetAvatar = matched?.avatarUrl || (viewingProfile && viewingProfile.username.replace(/^@+/, '').toLowerCase() === cleanUser ? viewingProfile.avatarUrl : undefined);

    toggleFollowUser(currentUserProfile, {
      id,
      username: cleanUser,
      name: targetName,
      avatarUrl: targetAvatar
    });

    setFollowedSet((prev) => {
      const next = new Set(prev);
      const isAlreadyFollowing = next.has(id) || next.has(cleanUser);
      if (isAlreadyFollowing) {
        next.delete(id);
        next.delete(cleanUser);
      } else {
        next.add(id);
        next.add(cleanUser);
      }
      saveFollowedUserIds(next);

      // Also update travellers state
      setTravellers((prevTravellers) =>
        prevTravellers.map((t) => {
          const tClean = t.username.replace(/^@+/, '').toLowerCase();
          if (t.id === id || tClean === cleanUser) {
            return { ...t, isFollowing: !isAlreadyFollowing };
          }
          return t;
        })
      );

      // If currently viewing this profile, update its state too
      setViewingProfile((cur) => {
        if (!cur) return null;
        const curClean = cur.username.replace(/^@+/, '').toLowerCase();
        if (cur.id === id || curClean === cleanUser) {
          return { ...cur, isFollowing: !isAlreadyFollowing };
        }
        return cur;
      });

      return next;
    });
  }, [currentUserProfile, travellers]);

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
    const interval = setInterval(syncTrails, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Dynamic explore tiles from real user uploaded trails across all profiles
  const exploreTiles = useMemo<ExploreTile[]>(() => {
    if (!globalTrailsList || globalTrailsList.length === 0) return [];

    return globalTrailsList.map((t: any, idx: number) => ({
      id: t.id || `trail-${idx}`,
      type: 'trail' as const,
      title: t.title || t.caption || 'Travel Reel',
      destination: t.destination || 'Explore Destination',
      imageUrl: t.posterUrl || t.videoUrl || '',
      videoUrl: t.videoUrl,
      viewsCount: t.viewsCount ? String(t.viewsCount) : '1',
      likesCount: t.likesCount ? String(t.likesCount) : '0',
      creator: {
        id: t.creator?.id,
        name: t.creator?.name || 'Traveler',
        username: t.creator?.username || '@traveler',
        avatarUrl: sanitizeAvatarUrl(t.creator?.avatarUrl) || ''
      },
      spanTwoRows: idx % 6 === 0
    }));
  }, [globalTrailsList]);

  // Trails uploaded by currently viewed user profile
  const viewingProfileTrails = useMemo(() => {
    if (!viewingProfile) return [];
    const vUname = viewingProfile.username.toLowerCase().replace(/^@+/, '');
    const vName = viewingProfile.name.toLowerCase();
    const vId = viewingProfile.id;

    return exploreTiles.filter((tile) => {
      const creatorUname = tile.creator.username.toLowerCase().replace(/^@+/, '');
      const creatorName = (tile.creator.name || '').toLowerCase();
      return (
        creatorUname === vUname ||
        creatorName === vName ||
        tile.creator.id === vId
      );
    });
  }, [viewingProfile, exploreTiles]);

  // Suggested profiles for discover people section: EXCLUDES the currently logged in user!
  const suggestedProfiles = useMemo(() => {
    return travellers.filter((t) => !isCurrentUser(t));
  }, [travellers, isCurrentUser]);

  // Filtered Travellers during active search
  const filteredTravellers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().replace(/^@+/, '');
    return travellers.filter((t) => {
      const cleanUser = t.username.toLowerCase().replace(/^@+/, '');
      return (
        t.name.toLowerCase().includes(q) ||
        cleanUser.includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.bio.toLowerCase().includes(q) ||
        t.recentPlaces.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [travellers, searchQuery]);

  // Filtered Explore Tiles during active search
  const filteredExploreTiles = useMemo(() => {
    if (!searchQuery.trim()) return exploreTiles;
    const q = searchQuery.toLowerCase().replace(/^@+/, '');
    return exploreTiles.filter((tile) =>
      tile.title.toLowerCase().includes(q) ||
      tile.destination.toLowerCase().includes(q) ||
      tile.creator.username.toLowerCase().includes(q)
    );
  }, [exploreTiles, searchQuery]);

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
    setProfileTab('trails');
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
    const cleanUser = viewingProfile.username.replace(/^@+/, '').toLowerCase();
    const isFollowing = followedSet.has(viewingProfile.id) || followedSet.has(cleanUser) || isUserFollowing(currentUserProfile.username, viewingProfile.username) || !!viewingProfile.isFollowing;
    const viewingFollowCounts = getFollowCounts(viewingProfile.username || viewingProfile.id);

    return (
      <div className="min-h-screen bg-black text-white pb-32 select-none animate-in fade-in duration-200">
        {/* Top Sticky Profile Header Bar */}
        <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-neutral-900 px-3 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between">
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
            <span className="text-[10px] text-amber-400 bg-amber-950/70 border border-amber-800/60 px-1.5 py-0.2 rounded-md font-semibold">
              {viewingProfile.level.split('—')[0].trim()}
            </span>
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
        <div className="max-w-xl mx-auto px-4 sm:px-6 pt-5">
          {/* 1. Header (Avatar + Stats) */}
          <div className="flex items-center gap-6 sm:gap-10 pb-4 border-b border-neutral-900">
            {/* Avatar (NO gradient ring) */}
            {viewingProfile.avatarUrl ? (
              <img
                src={viewingProfile.avatarUrl}
                alt={viewingProfile.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-neutral-700 shrink-0 shadow-md"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white font-bold text-2xl shrink-0 select-none shadow-md">
                {viewingProfile.name?.charAt(0).toUpperCase() || viewingProfile.username?.replace(/^@/, '').charAt(0).toUpperCase() || 'U'}
              </div>
            )}

            {/* Stats (Trails | Followers | Following) */}
            <div className="flex-1 flex items-center justify-around text-center">
              <div>
                <div className="font-bold text-base sm:text-lg text-white">
                  {viewingProfileTrails.length}
                </div>
                <div className="text-[11px] sm:text-xs text-neutral-400">trails</div>
              </div>

              <div
                onClick={() => {
                  setFollowModalTab('followers');
                  setIsFollowModalOpen(true);
                }}
                className="cursor-pointer group flex flex-col items-center"
                title="View followers"
              >
                <div className="font-bold text-base sm:text-lg text-white group-hover:text-neutral-300 transition-colors">
                  {viewingFollowCounts.followersCount}
                </div>
                <div className="text-[11px] sm:text-xs text-neutral-400 group-hover:text-white transition-colors">followers</div>
              </div>

              <div
                onClick={() => {
                  setFollowModalTab('following');
                  setIsFollowModalOpen(true);
                }}
                className="cursor-pointer group flex flex-col items-center"
                title="View following"
              >
                <div className="font-bold text-base sm:text-lg text-white group-hover:text-neutral-300 transition-colors">
                  {viewingFollowCounts.followingCount}
                </div>
                <div className="text-[11px] sm:text-xs text-neutral-400 group-hover:text-white transition-colors">following</div>
              </div>
            </div>
          </div>

          {/* 2. Name, Bio, Location */}
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-white">
              {viewingProfile.name}
            </h2>
            <p className="text-xs text-neutral-400 font-medium flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{viewingProfile.location || 'Roam Explorer'}</span>
            </p>
            <p className="text-xs text-neutral-200 pt-1 leading-relaxed whitespace-pre-line">
              {viewingProfile.bio || 'Exploring new places, one trip at a time 🌍'}
            </p>

            {/* Travel DNA tags */}
            {viewingProfile.topDNA && viewingProfile.topDNA.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-2">
                {viewingProfile.topDNA.map((dna, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-neutral-300 text-[10px] font-semibold"
                  >
                    {dna}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 3. Action Buttons (Follow / Following & Plan Trip) */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => toggleFollow(viewingProfile.id, viewingProfile.username, e)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm text-center ${
                isFollowing
                  ? 'bg-[#262626] hover:bg-[#333333] text-neutral-200 border border-neutral-700'
                  : 'bg-[#0095f6] hover:bg-[#1877f2] text-white'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>

            <button
              type="button"
              onClick={() => {
                if (onStartPlanning && viewingProfile.location) {
                  onStartPlanning(viewingProfile.location);
                }
              }}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#262626] hover:bg-[#333333] text-white border border-neutral-800 transition-colors cursor-pointer text-center"
            >
              Plan Trip to {viewingProfile.location || 'Destination'}
            </button>
          </div>

          {/* 4. Instagram Profile Tabs: Trails | Places */}
          <div className="border-t border-neutral-800/80 pt-2">
            <div className="flex items-center justify-around border-b border-neutral-800/80 pb-2">
              <button
                type="button"
                onClick={() => setProfileTab('trails')}
                className={`flex items-center gap-1.5 text-xs font-bold pb-1 cursor-pointer transition-colors ${
                  profileTab === 'trails' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>TRAILS ({viewingProfileTrails.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setProfileTab('places')}
                className={`flex items-center gap-1.5 text-xs font-bold pb-1 cursor-pointer transition-colors ${
                  profileTab === 'places' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>PLACES ({viewingProfile.placesCount || viewingProfile.recentPlaces?.length || 0})</span>
              </button>
            </div>

            {/* Tab 1: Trails Grid */}
            {profileTab === 'trails' && (
              viewingProfileTrails.length > 0 ? (
                <div className="grid grid-cols-3 gap-0.5 sm:gap-1.5 pt-2">
                  {viewingProfileTrails.map((trail) => (
                    <div
                      key={trail.id}
                      onClick={() => setSelectedTile(trail)}
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
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[10px] font-bold text-white drop-shadow">
                        <Eye className="w-3 h-3" />
                        <span>{trail.viewsCount}</span>
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
                    When {viewingProfile.name} uploads reels or travel moments, they will appear here.
                  </p>
                </div>
              )
            )}

            {/* Tab 2: Places List */}
            {profileTab === 'places' && (
              <div className="pt-3 space-y-2">
                {viewingProfile.recentPlaces && viewingProfile.recentPlaces.length > 0 ? (
                  viewingProfile.recentPlaces.map((place, idx) => (
                    <div
                      key={idx}
                      className="bg-[#121212] border border-neutral-800/80 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold text-white">{place}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onStartPlanning?.(place)}
                        className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
                      >
                        Plan Trip
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-neutral-400">
                    No travel destinations added yet.
                  </div>
                )}
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

                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    {selectedTile.viewsCount} views
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                    {selectedTile.likesCount}
                  </span>
                </div>
              </div>

              <div className="p-4 pt-1 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">
                    @{selectedTile.creator.username}
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
                    <span>Plan Trip</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Followers & Following List Modal */}
        <FollowListModal
          isOpen={isFollowModalOpen}
          onClose={() => setIsFollowModalOpen(false)}
          initialTab={followModalTab}
          profileUser={{
            id: viewingProfile.id,
            username: viewingProfile.username,
            name: viewingProfile.name,
            avatarUrl: viewingProfile.avatarUrl
          }}
          currentUser={currentUserProfile}
          onSelectUser={(selectedUser) => {
            setIsFollowModalOpen(false);
            const cleanU = selectedUser.username.replace(/^@+/, '');
            setViewingProfile({
              id: selectedUser.id,
              name: selectedUser.name,
              username: selectedUser.username,
              avatarUrl: selectedUser.avatarUrl || '',
              location: selectedUser.location || 'Traveler',
              bio: selectedUser.bio || 'Exploring new places, one trip at a time 🌍',
              level: 'Travel Explorer',
              tripsCount: 0,
              placesCount: 0,
              topDNA: ['Adventure', 'Photography'],
              recentPlaces: [],
              isFollowing: selectedUser.isFollowing
            });
            setProfileTab('trails');
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW B: MAIN SEARCH & EXPLORE FEED (When no profile is actively opened)
  // =========================================================================
  return (
    <div className="min-h-screen bg-black text-white pb-32 select-none">
      {/* 1. Sleek Instagram Search Bar (Sticky Top) */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-neutral-900 px-3 py-2.5 sm:px-6 sm:py-3">
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
                    const isFollowing = followedSet.has(tr.id) || followedSet.has(cleanUser) || !!tr.isFollowing;
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
                              {tr.name} • {tr.location || 'Traveler'}
                            </p>
                            {tr.bio && (
                              <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                                {tr.bio}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Button: If own account, "Your Profile" / else "Follow/Following" */}
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
                            onClick={(e) => toggleFollow(tr.id, tr.username, e)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                              isFollowing
                                ? 'bg-[#262626] hover:bg-[#333333] text-neutral-200 border border-neutral-700'
                                : 'bg-[#0095f6] hover:bg-[#1877f2] text-white shadow-sm'
                            }`}
                          >
                            {isFollowing ? 'Following' : 'Follow'}
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

                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[10px] font-bold text-white drop-shadow-md">
                        <Eye className="w-3 h-3" />
                        <span>{tile.viewsCount}</span>
                      </div>

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                        <span className="text-[11px] font-semibold text-white truncate">
                          {tile.creator.username}
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
                    const isFollowing = followedSet.has(tr.id) || followedSet.has(cleanUser) || !!tr.isFollowing;

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
                        <p className="text-[10px] text-neutral-500 truncate w-full mt-0.5">
                          {tr.location || 'Roam Explorer'}
                        </p>

                        {/* Follow / Following Button */}
                        <button
                          type="button"
                          onClick={(e) => toggleFollow(tr.id, tr.username, e)}
                          className={`w-full mt-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isFollowing
                              ? 'bg-[#262626] hover:bg-[#333333] text-neutral-200 border border-neutral-700'
                              : 'bg-[#0095f6] hover:bg-[#1877f2] text-white shadow-sm'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. "Trending Trails" Instagram 3-Column Explore Grid */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Trending Trails
                </span>
                <span className="text-[11px] text-neutral-500 font-medium">
                  {exploreTiles.length} {exploreTiles.length === 1 ? 'trail' : 'trails'}
                </span>
              </div>

              {exploreTiles.length > 0 ? (
                <div className="grid grid-cols-3 gap-0.5 sm:gap-1.5">
                  {exploreTiles.map((tile, idx) => {
                    const isFeatureTile = idx === 0 || idx === 7;

                    return (
                      <div
                        key={tile.id}
                        onClick={() => setSelectedTile(tile)}
                        className={`relative overflow-hidden cursor-pointer group bg-neutral-900 ${
                          isFeatureTile ? 'row-span-2' : 'aspect-square'
                        }`}
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
                            <Video className="w-5 h-5 text-neutral-600 mb-1" />
                            <span className="text-[10px] font-semibold text-neutral-400 line-clamp-1">{tile.destination}</span>
                          </div>
                        )}

                        {/* Gradient Vignette for readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-75 group-hover:opacity-90 transition-opacity" />

                        {/* Top Right Video / Reel Indicator */}
                        <div className="absolute top-2 right-2 text-white drop-shadow-md">
                          <Video className="w-3.5 h-3.5" />
                        </div>

                        {/* Bottom Left View Count */}
                        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[11px] font-bold text-white drop-shadow-md">
                          <Eye className="w-3 h-3" />
                          <span>{tile.viewsCount}</span>
                        </div>

                        {/* Hover Overlay with Destination Title & Creator */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                          <div className="flex items-center gap-1.5">
                            {tile.creator.avatarUrl ? (
                              <img
                                src={tile.creator.avatarUrl}
                                alt={tile.creator.username}
                                className="w-5 h-5 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[9px] text-white font-bold select-none">
                                {tile.creator.username.replace(/^@/, '').charAt(0).toUpperCase() || 'T'}
                              </div>
                            )}
                            <span className="text-[11px] font-bold text-white truncate">
                              {tile.creator.username}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-white line-clamp-2 leading-tight">
                              {tile.title}
                            </p>
                            <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{tile.destination}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center space-y-3 px-4 bg-[#121212] border border-neutral-800/80 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                    <Video className="w-6 h-6 text-rose-500" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No Trending Trails Yet</h3>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                    Trails uploaded by community members will appear here in the trending explore grid.
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

              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  {selectedTile.viewsCount} views
                </span>
                <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                  {selectedTile.likesCount}
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-4 pt-1 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {selectedTile.creator.avatarUrl ? (
                    <img
                      src={selectedTile.creator.avatarUrl}
                      alt={selectedTile.creator.username}
                      className="w-8 h-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white font-bold text-xs select-none">
                      {selectedTile.creator.username.replace(/^@/, '').charAt(0).toUpperCase() || 'T'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {selectedTile.creator.username}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">{selectedTile.creator.name || 'Travel Creator'}</p>
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
    </div>
  );
};
