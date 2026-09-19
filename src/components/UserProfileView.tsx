import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Camera,
  Edit2,
  MapPin,
  Calendar,
  Compass,
  Mountain,
  Heart,
  Users,
  Check,
  Save,
  X,
  Share2,
  Sparkles,
  Plus,
  Play,
  Bookmark,
  LayoutGrid,
  Film,
  ChevronDown,
  Menu,
  Copy,
  Layers,
  Award,
  Flame,
  Volume2,
  VolumeX,
  Loader2,
  AtSign,
  LogIn
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { Trip, ThemeConfig, UserProfileData } from '../types';
import { getCachedUserProfile, updateUserProfileData } from '../services/supabaseClient';
import { isTripCompleted, setTripCompletedLocal } from '../utils/tripCompletion';
import { validateUsernameFormat, checkUsernameAvailability, claimUsername } from '../services/usernameService';
import { NavigationDrawer } from './NavigationDrawer';

interface UserProfileViewProps {
  session: Session | null;
  currentTheme: ThemeConfig;
  trips: Trip[];
  onOpenTrip: (tripId: string) => void;
  onStartPlanning: (destination?: string) => void;
  onToggleTripCompleted?: (tripId: string) => void;
  onBack: () => void;
  onRequireAuth?: () => void;
  onNavigate?: (view: any) => void;
  onOpenThemeModal?: () => void;
}

export interface UserTrailItem {
  id: string;
  title: string;
  destination: string;
  viewsCount: string;
  likesCount: string;
  videoUrl: string;
  posterUrl?: string;
  duration?: string;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  session,
  currentTheme,
  trips,
  onOpenTrip,
  onStartPlanning,
  onToggleTripCompleted,
  onBack,
  onRequireAuth,
  onNavigate,
  onOpenThemeModal
}) => {
  const user = session?.user;
  const userMeta = (user?.user_metadata || {}) as Record<string, any>;

  // Tabs: trips (grid), trails (reels), dna (travel personality), saved (bookmarks)
  const [activeTab, setActiveTab] = useState<'trips' | 'trails' | 'dna' | 'saved'>('trips');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  // Active trail for modal playback
  const [selectedTrail, setSelectedTrail] = useState<UserTrailItem | null>(null);
  const [isModalMuted, setIsModalMuted] = useState(true);

  // User uploaded trails from local storage
  const [userTrails, setUserTrails] = useState<UserTrailItem[]>(() => {
    try {
      const raw = localStorage.getItem('roamai_user_trails') || localStorage.getItem('tripwise_user_trails');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Filter ONLY completed trips for travel footprint counters (trips, countries, places)
  const completedTrips = React.useMemo(() => {
    return trips.filter((t) => isTripCompleted(t));
  }, [trips]);

  // Calculate unique places ONLY from completed trips
  const calculatedPlacesCount = React.useMemo(() => {
    const places = new Set<string>();
    completedTrips.forEach((t) => {
      if (t.destination) places.add(t.destination.trim().toLowerCase());
      t.days?.forEach((d) => {
        d.activities?.forEach((a) => {
          if (a.placeName) places.add(a.placeName.trim().toLowerCase());
        });
      });
    });
    return places.size;
  }, [completedTrips]);

  // Calculate unique countries ONLY from completed trips
  const calculatedCountriesCount = React.useMemo(() => {
    const countries = new Set<string>();
    completedTrips.forEach((t) => {
      if (t.destinationPlace?.country) {
        countries.add(t.destinationPlace.country.trim().toLowerCase());
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
  }, [completedTrips]);

  const getFallbackUsername = (u?: typeof user, meta?: Record<string, any>) => {
    if (meta?.username?.trim()) return meta.username.trim();
    if (u?.email) {
      return `@${u.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')}`;
    }
    return '@traveler';
  };

  const getFallbackName = (u?: typeof user, meta?: Record<string, any>) => {
    if (meta?.full_name?.trim()) return meta.full_name.trim();
    if (meta?.name?.trim()) return meta.name.trim();
    if (u?.email) {
      const emailPrefix = u.email.split('@')[0].replace(/[._]/g, ' ');
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
    return 'Traveler';
  };

  // Profile data states - dynamically mapped to current authenticated user
  const [profile, setProfile] = useState<UserProfileData>(() => {
    const cached = user ? getCachedUserProfile(user.id) : null;
    return {
      name: cached?.name || getFallbackName(user, userMeta),
      username: cached?.username || getFallbackUsername(user, userMeta),
      bio: cached?.bio || userMeta.bio || 'Exploring new places, one trip at a time 🌍',
      avatarUrl: cached?.avatarUrl || userMeta.avatar_url || userMeta.avatarUrl || '',
      dob: cached?.dob || userMeta.dob || '',
      place: cached?.place || userMeta.place || '',
      email: user?.email || '',
      travelDNA: cached?.travelDNA || {
        adventure: 85,
        nature: 80,
        food: 75,
        photography: 80,
        nightlife: 60,
        luxury: 40
      },
      travelPreferences: cached?.travelPreferences || {
        transport: 'Road trips (Car/Bike)',
        pace: 'Balanced',
        budget: 'Flexible',
        accommodation: 'Homestays & Boutique Stays',
        food: 'Open to local food'
      },
      stats: {
        tripsCount: completedTrips.length,
        placesCount: calculatedPlacesCount,
        countriesCount: calculatedCountriesCount,
        postsCount: completedTrips.length + userTrails.length,
        followersCount: cached?.stats?.followersCount ?? 0,
        followingCount: cached?.stats?.followingCount ?? 0,
        level: 'Travel Explorer',
        levelNumber: Math.max(1, Math.min(10, Math.floor(completedTrips.length / 2) + 1))
      }
    };
  });

  const [editForm, setEditForm] = useState<UserProfileData>(profile);
  const [editUsernameError, setEditUsernameError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync profile when user identity or metadata changes
  useEffect(() => {
    const cached = user ? getCachedUserProfile(user.id) : null;
    const name = cached?.name || getFallbackName(user, userMeta);
    const username = cached?.username || getFallbackUsername(user, userMeta);
    const avatarUrl = cached?.avatarUrl || userMeta.avatar_url || userMeta.avatarUrl || '';
    const place = cached?.place || userMeta.place || '';
    const bio = cached?.bio || userMeta.bio || 'Exploring new places, one trip at a time 🌍';
    const dob = cached?.dob || userMeta.dob || '';

    const synced: UserProfileData = {
      name,
      username,
      avatarUrl,
      place,
      bio,
      dob,
      email: user?.email || '',
      travelDNA: cached?.travelDNA || profile.travelDNA,
      travelPreferences: cached?.travelPreferences || profile.travelPreferences,
      stats: {
        tripsCount: completedTrips.length,
        placesCount: calculatedPlacesCount,
        countriesCount: calculatedCountriesCount,
        postsCount: completedTrips.length + userTrails.length,
        followersCount: cached?.stats?.followersCount ?? profile.stats?.followersCount ?? 0,
        followingCount: cached?.stats?.followingCount ?? profile.stats?.followingCount ?? 0,
        level: 'Travel Explorer',
        levelNumber: Math.max(1, Math.min(10, Math.floor(completedTrips.length / 2) + 1))
      }
    };

    setProfile(synced);
    setEditForm(synced);
  }, [
    user?.id,
    user?.email,
    userMeta?.full_name,
    userMeta?.name,
    userMeta?.avatar_url,
    userMeta?.avatarUrl,
    userMeta?.username,
    userMeta?.place,
    completedTrips.length,
    calculatedPlacesCount,
    calculatedCountriesCount
  ]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditUsernameError(null);

    const currentClean = (profile.username || '').replace(/^@/, '').toLowerCase().trim();
    const newClean = (editForm.username || '').replace(/^@/, '').toLowerCase().trim();

    // Check if username changed and validate uniqueness
    if (newClean && newClean !== currentClean) {
      const formatCheck = validateUsernameFormat(newClean);
      if (!formatCheck.isValid) {
        setEditUsernameError(formatCheck.error || 'Invalid username format.');
        return;
      }

      setIsSavingProfile(true);
      try {
        const availability = await checkUsernameAvailability(newClean, user?.id);
        if (!availability.available) {
          setEditUsernameError(availability.error || 'This username is already taken by another account.');
          setIsSavingProfile(false);
          return;
        }

        // Claim username across server and database
        await claimUsername(newClean, user?.id || 'local_user', user?.email || undefined);
      } catch (err) {
        console.error('Failed to verify username availability:', err);
      }
    }

    const updatedData: UserProfileData = {
      ...editForm,
      username: newClean ? `@${newClean}` : editForm.username
    };

    setProfile(updatedData);
    setIsSavingProfile(false);
    setIsEditModalOpen(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    if (user) {
      await updateUserProfileData(updatedData);
    }
  };

  const handleShareProfile = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  };

  const handleToggleCompleted = (tripId: string) => {
    const currentTrip = trips.find((t) => t.id === tripId);
    const willBeCompleted = currentTrip ? !isTripCompleted(currentTrip) : true;
    setTripCompletedLocal(tripId, willBeCompleted);
    if (onToggleTripCompleted) {
      onToggleTripCompleted(tripId);
    }
  };

  // Real user planned trips with completion status
  const displayTrips = trips.map((t) => ({
    id: t.id,
    destination: t.destination,
    date: t.startDate || 'Recent',
    duration: `${t.durationDays} days`,
    cost: t.budgetTier,
    imageUrl: t.destinationPlace?.photoUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80',
    isCarousel: (t.days?.length || 0) > 1,
    isCompleted: isTripCompleted(t)
  }));

  return (
    <div className="w-full min-h-screen bg-black text-white pb-32">
      {/* Toast feedback */}
      {shareToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-zinc-800 text-white text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Profile link copied to clipboard!</span>
        </div>
      )}

      {saveSuccess && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-950 text-emerald-200 text-xs font-semibold shadow-2xl border border-emerald-500/40 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Profile successfully updated!</span>
        </div>
      )}

      {/* 1. TOP INSTAGRAM APP BAR */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between border-b border-zinc-900">
        {/* Left: + Create / Plan */}
        <button
          onClick={() => onStartPlanning()}
          className="p-1 text-white hover:text-zinc-300 transition-colors cursor-pointer"
          title="Plan new trip"
        >
          <Plus className="w-6 h-6 stroke-[2.2]" />
        </button>

        {/* Center: Username with dropdown (or Profile when signed out) */}
        <div 
          onClick={() => {
            if (session) {
              setIsEditModalOpen(true);
            } else {
              onRequireAuth?.();
            }
          }}
          className="flex items-center gap-1 cursor-pointer select-none group"
        >
          <span className="font-bold text-base sm:text-lg text-white tracking-tight group-hover:text-zinc-300 transition-colors">
            {session ? (profile.username?.replace('@', '') || (user?.email ? user.email.split('@')[0] : 'profile')) : 'Profile'}
          </span>
          {session && <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />}
        </div>

        {/* Right: Hamburger menu - opens same 3-lines slider as home page */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-1 text-white hover:text-zinc-300 transition-colors cursor-pointer"
            aria-label="Open Navigation Drawer"
            title="Menu & Navigation"
          >
            <Menu className="w-6 h-6 stroke-[2]" />
          </button>
        </div>
      </header>

      {!session ? (
        /* Signed-Out State with prominent Login Button */
        <div className="px-4 sm:px-6 pt-12 pb-24 max-w-md mx-auto flex flex-col items-center text-center animate-fade-in">
          {/* Glowing Avatar Ring */}
          <div className="relative mb-6">
            <div 
              className="absolute inset-0 rounded-full blur-2xl opacity-40 scale-125 pointer-events-none"
              style={{ backgroundColor: currentTheme.primaryColor }}
            />
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-zinc-900 border-2 border-zinc-800 p-1 flex items-center justify-center shadow-2xl">
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${currentTheme.primaryColor}22` }}
              >
                <User className="w-12 h-12 stroke-[1.8]" style={{ color: currentTheme.primaryColor }} />
              </div>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2.5">
            Sign in to TripWise
          </h2>
          <p className="text-sm text-zinc-400 font-medium max-w-sm leading-relaxed mb-8">
            Log in to access your personal profile, view your saved itineraries, track visited countries, and share your travel trails.
          </p>

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            <button
              onClick={() => onRequireAuth?.()}
              className="w-full py-3.5 px-6 rounded-2xl text-white font-bold shadow-xl flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-sm sm:text-base"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              <LogIn className="w-5 h-5 stroke-[2.2]" />
              <span>Sign In / Log In</span>
            </button>

            <button
              onClick={() => onRequireAuth?.()}
              className="w-full py-3 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
            >
              Don't have an account? Sign Up
            </button>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full mt-10 text-left">
            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-850">
              <Bookmark className="w-4 h-4 mb-1.5" style={{ color: currentTheme.primaryColor }} />
              <p className="text-xs font-bold text-white leading-snug">Saved Trips</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Keep plans synced</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-850">
              <MapPin className="w-4 h-4 mb-1.5" style={{ color: currentTheme.primaryColor }} />
              <p className="text-xs font-bold text-white leading-snug">World Map</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Track countries</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-850">
              <Film className="w-4 h-4 mb-1.5" style={{ color: currentTheme.primaryColor }} />
              <p className="text-xs font-bold text-white leading-snug">Travel Reels</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Post travel trails</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 2. PROFILE HEADER: AVATAR & STATS (POSTS, FOLLOWERS, FOLLOWING) */}
          <div className="px-4 sm:px-6 pt-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-6 sm:gap-8">
          {/* Circular Avatar with + Badge (Uses custom avatar or clean initial) */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
            <div className="w-full h-full rounded-full p-[2px] bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-md">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-black bg-neutral-900 flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-emerald-600 via-teal-700 to-indigo-800 text-white font-black text-2xl sm:text-3xl select-none">
                    {profile.name?.charAt(0).toUpperCase() || 'T'}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Right + Add Badge */}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white text-black border-2 border-black flex items-center justify-center font-bold shadow-md cursor-pointer hover:scale-110 transition-transform"
              title="Update profile picture"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          {/* Right Column: Name and Stats (post | followers | following) */}
          <div className="flex-1 flex flex-col justify-center">
            {/* User Full Name & Level Badge */}
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {profile.name}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Award className="w-3 h-3" />
                <span>Level {profile.stats?.levelNumber || 1}</span>
              </span>
            </div>

            {/* STATS IN ONE STRAIGHT LINE: POST | FOLLOWERS | FOLLOWING */}
            <div className="flex items-center justify-between text-center max-w-[280px] sm:max-w-[340px] pt-1">
              {/* Posts */}
              <div 
                onClick={() => setActiveTab('trips')}
                className="cursor-pointer group flex-1"
              >
                <span className="block font-bold text-base sm:text-lg text-white group-hover:text-zinc-300 transition-colors leading-tight">
                  {displayTrips.length + userTrails.length}
                </span>
                <span className="block text-xs text-zinc-300 font-normal mt-0.5">
                  {displayTrips.length + userTrails.length === 1 ? 'post' : 'posts'}
                </span>
              </div>

              {/* Followers */}
              <div className="cursor-pointer group flex-1">
                <span className="block font-bold text-base sm:text-lg text-white group-hover:text-zinc-300 transition-colors leading-tight">
                  {profile.stats?.followersCount ?? 0}
                </span>
                <span className="block text-xs text-zinc-300 font-normal mt-0.5">
                  followers
                </span>
              </div>

              {/* Following */}
              <div className="cursor-pointer group flex-1">
                <span className="block font-bold text-base sm:text-lg text-white group-hover:text-zinc-300 transition-colors leading-tight">
                  {profile.stats?.followingCount ?? 0}
                </span>
                <span className="block text-xs text-zinc-300 font-normal mt-0.5">
                  following
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio & Details */}
        <div className="mt-3 text-left">
          <p className="text-xs sm:text-sm text-zinc-200 font-normal leading-relaxed whitespace-pre-line">
            {profile.bio}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400 font-medium flex-wrap">
            {profile.place && (
              <>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  {profile.place}
                </span>
                <span>•</span>
              </>
            )}
            <span className="text-zinc-500 font-mono">
              {profile.username || getFallbackUsername(user, userMeta)}
            </span>
          </div>
        </div>

        {/* Action Buttons: Edit profile | Share profile */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => {
              setEditForm(profile);
              setIsEditModalOpen(true);
            }}
            className="flex-1 py-1.5 sm:py-2 px-3 rounded-lg bg-[#262626] hover:bg-[#333333] active:bg-[#1f1f1f] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-center"
          >
            Edit profile
          </button>
          <button
            onClick={handleShareProfile}
            className="flex-1 py-1.5 sm:py-2 px-3 rounded-lg bg-[#262626] hover:bg-[#333333] active:bg-[#1f1f1f] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-center"
          >
            Share profile
          </button>
        </div>

        {/* 3. DEDICATED TRAVEL STATS SECTION: ONLY COMPLETED TRIPS COUNT */}
        <div className="mt-4 p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md">
          <div className="flex items-center justify-around text-center divide-x divide-zinc-800">
            {/* Completed Trips */}
            <div 
              onClick={() => setActiveTab('trips')}
              className="flex-1 px-2 cursor-pointer group transition-transform active:scale-95"
              title="Completed Trips"
            >
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <Compass className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
                <span className="font-extrabold text-base sm:text-lg text-white group-hover:text-emerald-400 transition-colors leading-tight">
                  {completedTrips.length}
                </span>
              </div>
              <span className="block text-[11px] sm:text-xs text-zinc-400 font-medium tracking-wide">
                trips
              </span>
            </div>

            {/* Countries Visited (Completed Trips Only) */}
            <div 
              onClick={() => setActiveTab('trips')}
              className="flex-1 px-2 cursor-pointer group transition-transform active:scale-95"
              title="Countries visited on completed trips"
            >
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <MapPin className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                <span className="font-extrabold text-base sm:text-lg text-white group-hover:text-teal-400 transition-colors leading-tight">
                  {calculatedCountriesCount}
                </span>
              </div>
              <span className="block text-[11px] sm:text-xs text-zinc-400 font-medium tracking-wide">
                countries
              </span>
            </div>

            {/* Places Visited (Completed Trips Only) */}
            <div 
              onClick={() => setActiveTab('trips')}
              className="flex-1 px-2 cursor-pointer group transition-transform active:scale-95"
              title="Places visited on completed trips"
            >
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <Mountain className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="font-extrabold text-base sm:text-lg text-white group-hover:text-cyan-400 transition-colors leading-tight">
                  {calculatedPlacesCount}
                </span>
              </div>
              <span className="block text-[11px] sm:text-xs text-zinc-400 font-medium tracking-wide">
                places
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FOUR PROFILE TABS: TRIPS, TRAILS (REELS), TRAVEL DNA, SAVED */}
      <div className="max-w-2xl mx-auto mt-4 border-t border-zinc-850">
        <div className="flex items-center">
          {/* 1. Trips Tab (Grid icon) */}
          <button
            onClick={() => setActiveTab('trips')}
            className={`flex-1 py-3 flex items-center justify-center relative transition-colors cursor-pointer ${
              activeTab === 'trips' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Trips"
          >
            <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6" />
            {activeTab === 'trips' && (
              <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white" />
            )}
          </button>

          {/* 2. Trails Tab (Reels icon) */}
          <button
            onClick={() => setActiveTab('trails')}
            className={`flex-1 py-3 flex items-center justify-center relative transition-colors cursor-pointer ${
              activeTab === 'trails' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Trails (User Uploaded Reels)"
          >
            <Film className="w-5 h-5 sm:w-6 sm:h-6" />
            {activeTab === 'trails' && (
              <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white" />
            )}
          </button>

          {/* 3. Travel DNA Tab (Sparkles icon) */}
          <button
            onClick={() => setActiveTab('dna')}
            className={`flex-1 py-3 flex items-center justify-center relative transition-colors cursor-pointer ${
              activeTab === 'dna' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Travel DNA & Preferences"
          >
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            {activeTab === 'dna' && (
              <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white" />
            )}
          </button>

          {/* 4. Saved Tab (Bookmark icon) */}
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 flex items-center justify-center relative transition-colors cursor-pointer ${
              activeTab === 'saved' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Saved & Wishlist"
          >
            <Bookmark className="w-5 h-5 sm:w-6 sm:h-6" />
            {activeTab === 'saved' && (
              <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white" />
            )}
          </button>
        </div>

        {/* 4. CONTENT GRIDS */}
        {/* --- TAB 1: TRIPS (3-COLUMN MEDIA GRID) --- */}
        {activeTab === 'trips' && (
          <div>
            {displayTrips.length === 0 ? (
              <div className="py-20 px-4 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                  <LayoutGrid className="w-7 h-7" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white">No Trips Yet</h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Plan your first adventure with AI and your customized itinerary will appear here.
                </p>
                <button
                  onClick={() => onStartPlanning()}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Plan a Trip
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 sm:gap-1 mt-0.5">
                {displayTrips.map((trip) => (
                  <div
                    key={trip.id}
                    onClick={() => onOpenTrip(trip.id)}
                    className="relative aspect-square overflow-hidden group cursor-pointer bg-zinc-900"
                  >
                    <img
                      src={trip.imageUrl}
                      alt={trip.destination}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Top-Left Completed Badge / Interactive Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCompleted(trip.id);
                      }}
                      className={`absolute top-1.5 left-1.5 z-10 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold flex items-center gap-1 shadow-md transition-all cursor-pointer backdrop-blur-md ${
                        trip.isCompleted
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          : 'bg-black/70 hover:bg-black/90 text-zinc-300 border border-white/20'
                      }`}
                      title={trip.isCompleted ? 'Completed trip (Click to unmark)' : 'Click to mark as completed'}
                    >
                      <Check className={`w-2.5 h-2.5 ${trip.isCompleted ? 'stroke-[3]' : 'opacity-60'}`} />
                      <span>{trip.isCompleted ? 'Done' : 'Mark Done'}</span>
                    </button>

                    {/* Top-Right Multi-Photo / Carousel Indicator matching screenshot */}
                    {trip.isCarousel && (
                      <div className="absolute top-2 right-2 text-white/90 drop-shadow-md">
                        <Layers className="w-4 h-4 fill-white/80" />
                      </div>
                    )}

                    {/* Bottom Title Gradient Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end">
                      <span className="text-xs sm:text-sm font-bold text-white drop-shadow-xs truncate">
                        {trip.destination}
                      </span>
                      <span className="text-[10px] text-zinc-300 font-medium drop-shadow-xs">
                        {trip.duration}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: TRAILS (3-COLUMN REELS VIDEO GRID) --- */}
        {activeTab === 'trails' && (
          <div>
            {userTrails.length === 0 ? (
              <div className="py-20 px-4 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                  <Film className="w-7 h-7" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white">No Trails Uploaded</h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Share your travel moments and video reels with the RoamAI community.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 sm:gap-1 mt-0.5">
                {userTrails.map((trail) => (
                  <div
                    key={trail.id}
                    onClick={() => setSelectedTrail(trail)}
                    className="relative aspect-[9/16] overflow-hidden group cursor-pointer bg-zinc-900"
                  >
                    <img
                      src={trail.posterUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'}
                      alt={trail.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Dark Vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                    {/* Bottom-left: Play Icon + Views Count (Instagram Reels style) */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold drop-shadow-md">
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{trail.viewsCount || '0'}</span>
                    </div>

                    {/* Duration in top right */}
                    {trail.duration && (
                      <div className="absolute top-2 right-2 text-[10px] font-semibold text-white/80 bg-black/50 px-1.5 py-0.5 rounded-sm">
                        {trail.duration}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: TRAVEL DNA (PERSONALITY, RADAR & PREFERENCES) --- */}
        {activeTab === 'dna' && (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Travel Archetype Hero Card */}
            <div className="p-5 rounded-2xl bg-[#1a1a1f] border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Travel DNA Profile
                </span>
                <span className="text-xs text-zinc-400 font-semibold">
                  Level {profile.stats?.levelNumber || 1} Explorer
                </span>
              </div>
              <h3 className="text-xl font-black text-white">
                Mountain & Coast Explorer
              </h3>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                You thrive on high-altitude treks, spontaneous coastal highway drives, and offbeat local culinary discoveries.
              </p>
            </div>

            {/* Travel DNA Radar Breakdown */}
            <div className="p-5 rounded-2xl bg-[#1a1a1f] border border-white/10 shadow-xl space-y-3.5">
              <h4 className="text-sm font-bold text-white">
                Vibe Breakdown
              </h4>

              {Object.entries(profile.travelDNA || {}).map(([trait, score]) => (
                <div key={trait} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize text-zinc-300 font-medium">{trait}</span>
                    <span className="font-bold text-white">{score}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div 
                      className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Travel Preferences */}
            <div className="p-5 rounded-2xl bg-[#1a1a1f] border border-white/10 shadow-xl space-y-3">
              <h4 className="text-sm font-bold text-white">
                Preferences
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-900 border border-white/5">
                  <span className="text-zinc-400 block text-[11px]">Preferred Transport</span>
                  <span className="font-bold text-white mt-0.5 block">{profile.travelPreferences?.transport || 'Road trips'}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-white/5">
                  <span className="text-zinc-400 block text-[11px]">Travel Pace</span>
                  <span className="font-bold text-white mt-0.5 block">{profile.travelPreferences?.pace || 'Balanced'}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-white/5">
                  <span className="text-zinc-400 block text-[11px]">Target Budget</span>
                  <span className="font-bold text-white mt-0.5 block">{profile.travelPreferences?.budget || 'Flexible'}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-white/5">
                  <span className="text-zinc-400 block text-[11px]">Accommodation</span>
                  <span className="font-bold text-white mt-0.5 block">{profile.travelPreferences?.accommodation || 'Homestays'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 4: SAVED (WISHLIST SPOTS) --- */}
        {activeTab === 'saved' && (
          <div>
            {(profile.wishlist || []).length === 0 ? (
              <div className="py-20 px-4 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                  <Bookmark className="w-7 h-7" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white">No Saved Places</h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Bookmark dream destinations and itineraries to easily find them later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 sm:gap-1 mt-0.5">
                {(profile.wishlist || []).map((spot) => (
                  <div
                    key={spot.id}
                    onClick={() => onStartPlanning(spot.name)}
                    className="relative aspect-square overflow-hidden group cursor-pointer bg-zinc-900"
                  >
                    <img
                      src={spot.imageUrl}
                      alt={spot.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
                      <span className="text-xs sm:text-sm font-bold text-white truncate drop-shadow-xs">
                        {spot.name}
                      </span>
                      {spot.country && (
                        <span className="text-[10px] text-zinc-300 font-medium truncate drop-shadow-xs">
                          {spot.country}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- TRAIL VIDEO REEL PREVIEW MODAL --- */}
      {selectedTrail && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm aspect-[9/16] rounded-3xl overflow-hidden bg-black border border-white/15 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setSelectedTrail(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Mute button */}
            <button
              onClick={() => setIsModalMuted(!isModalMuted)}
              className="absolute top-4 left-4 z-20 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
            >
              {isModalMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Video */}
            <video
              src={selectedTrail.videoUrl}
              poster={selectedTrail.posterUrl}
              autoPlay
              loop
              playsInline
              muted={isModalMuted}
              className="w-full h-full object-cover"
            />

            {/* Bottom info */}
            <div className="absolute bottom-4 left-4 right-4 z-20 space-y-1.5 text-left pointer-events-auto">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>{selectedTrail.destination}</span>
              </div>
              <p className="text-xs text-white font-medium leading-snug line-clamp-2">
                {selectedTrail.title}
              </p>
              <div className="flex items-center gap-4 text-xs text-zinc-300 pt-1">
                <span className="flex items-center gap-1">
                  <Play className="w-3.5 h-3.5 fill-white" />
                  {selectedTrail.viewsCount} views
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  {selectedTrail.likesCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* --- EDIT PROFILE MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 rounded-3xl border border-white/15 max-h-[90vh] overflow-y-auto text-left shadow-2xl">
            <div className="sticky top-0 bg-zinc-950/95 backdrop-blur-md px-6 py-4 border-b border-zinc-800 flex items-center justify-between z-10">
              <h3 className="text-base font-bold text-white">Edit Profile</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-hidden focus:border-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Username Handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">@</span>
                  <input
                    type="text"
                    value={editForm.username?.replace(/^@/, '') || ''}
                    onChange={(e) => {
                      setEditUsernameError(null);
                      setEditForm({ ...editForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') });
                    }}
                    className={`w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-900 border text-white font-medium focus:outline-hidden ${
                      editUsernameError ? 'border-red-500 focus:border-red-400' : 'border-zinc-800 focus:border-white'
                    }`}
                    placeholder="unique_username"
                    required
                  />
                </div>
                {editUsernameError ? (
                  <p className="text-red-400 text-xs font-medium mt-1 ml-1">{editUsernameError}</p>
                ) : (
                  <p className="text-zinc-500 text-[11px] mt-1 ml-1">Must be unique across all TripWise accounts</p>
                )}
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Avatar Image URL</label>
                <input
                  type="url"
                  value={editForm.avatarUrl}
                  onChange={(e) => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-hidden focus:border-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Bio</label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-hidden focus:border-white resize-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Location</label>
                <input
                  type="text"
                  value={editForm.place}
                  onChange={(e) => setEditForm({ ...editForm, place: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-hidden focus:border-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSavingProfile}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold cursor-pointer transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin text-black" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-In Navigation Drawer from Right (Same as home page 3 lines slider) */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentView="profile"
        onNavigate={(view) => {
          setIsDrawerOpen(false);
          if (onNavigate) {
            onNavigate(view);
          } else if (view === 'landing') {
            onBack();
          }
        }}
        savedTripsCount={trips.length}
        currentTheme={currentTheme}
        onOpenThemeModal={onOpenThemeModal}
        session={session}
        onRequireAuth={() => {
          setIsDrawerOpen(false);
          onRequireAuth?.();
        }}
        onPlanTrip={() => {
          setIsDrawerOpen(false);
          onStartPlanning();
        }}
      />
    </div>
  );
};
