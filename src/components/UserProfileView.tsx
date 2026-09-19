import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Camera,
  Edit2,
  MapPin,
  Calendar,
  Compass,
  Mountain,
  Leaf,
  Utensils,
  Camera as PhotoIcon,
  Music,
  Gem,
  Car,
  Gauge,
  Wallet,
  BedDouble,
  Heart,
  Users,
  ChevronRight,
  ShieldCheck,
  Check,
  Save,
  X,
  Share2,
  Sparkles,
  Plus,
  Clock,
  Navigation
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { Trip, ThemeConfig, UserProfileData } from '../types';
import { getCachedUserProfile, updateUserProfileData } from '../services/supabaseClient';

interface UserProfileViewProps {
  session: Session | null;
  currentTheme: ThemeConfig;
  trips: Trip[];
  onOpenTrip: (tripId: string) => void;
  onStartPlanning: (destination?: string) => void;
  onBack: () => void;
}

// Initial sample trips for display if user has few or no saved trips
const SAMPLE_RECENT_TRIPS = [
  {
    id: 'sample-1',
    destination: 'Goa',
    date: 'Jan 2024',
    duration: '4 days',
    cost: '₹28,430',
    imageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'sample-2',
    destination: 'Wayanad',
    date: 'Oct 2023',
    duration: '3 days',
    cost: '₹16,800',
    imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'sample-3',
    destination: 'Coorg',
    date: 'Mar 2023',
    duration: '2 days',
    cost: '₹11,200',
    imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80'
  }
];

// Initial wishlist destinations
const SAMPLE_WISHLIST = [
  {
    id: 'wish-1',
    name: 'Ladakh',
    subtitle: 'Himalayan Passes',
    imageUrl: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wish-2',
    name: 'Bali',
    subtitle: 'Indonesia',
    imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'wish-3',
    name: 'Japan',
    subtitle: 'Kyoto & Tokyo',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80'
  }
];

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  session,
  currentTheme,
  trips,
  onOpenTrip,
  onStartPlanning,
  onBack
}) => {
  const user = session?.user;
  const userMeta = user?.user_metadata || {};

  const [activeTab, setActiveTab] = useState<'overview' | 'dna' | 'trips' | 'saved' | 'crew'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile data states
  const [profile, setProfile] = useState<UserProfileData>(() => {
    const cached = user ? getCachedUserProfile(user.id) : null;
    return {
      name: cached?.name || userMeta.full_name || userMeta.name || 'Rohan Sharma',
      username: cached?.username || userMeta.username || '@rohantravels',
      bio: cached?.bio || userMeta.bio || 'Exploring new places, one trip at a time 🌍',
      avatarUrl: cached?.avatarUrl || userMeta.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      dob: cached?.dob || userMeta.dob || '1998-08-15',
      place: cached?.place || userMeta.place || 'Bengaluru, India',
      email: user?.email || 'rohan.sharma@example.com',
      travelDNA: cached?.travelDNA || {
        adventure: 90,
        nature: 82,
        food: 74,
        photography: 88,
        nightlife: 60,
        luxury: 40
      },
      travelPreferences: cached?.travelPreferences || {
        transport: 'Road trips (Car/Bike)',
        pace: 'Balanced',
        budget: '₹10K – ₹25K',
        accommodation: 'Hotels / Homestays',
        food: 'Non-vegetarian (Open to all)'
      },
      stats: {
        tripsCount: Math.max(trips.length, 8),
        placesCount: trips.length > 0 ? trips.reduce((acc, t) => acc + t.days.reduce((a, d) => a + d.activities.length, 0), 0) : 34,
        countriesCount: 4,
        level: 'Travel Explorer',
        levelNumber: 4
      }
    };
  });

  // Edit form state
  const [editForm, setEditForm] = useState<UserProfileData>(profile);

  useEffect(() => {
    if (user) {
      const cached = getCachedUserProfile(user.id);
      if (cached) {
        setProfile((prev) => ({ ...prev, ...cached }));
        setEditForm((prev) => ({ ...prev, ...cached }));
      }
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(editForm);
    setIsEditModalOpen(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);

    if (user) {
      await updateUserProfileData(editForm);
    }
  };

  // Format DOB nicely for display (e.g., "15 Aug 1998")
  const formatDobDisplay = (dobStr?: string) => {
    if (!dobStr) return 'Not set';
    const parts = dobStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return dobStr;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-900 dark:text-white pb-16">
      {/* Top Profile Container */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-2 sm:pt-4">
        
        {/* Main Card */}
        <div className="bg-white dark:bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800/80">
          
          {/* 1. SCENIC COVER IMAGE BANNER */}
          <div className="relative h-48 sm:h-64 md:h-72 w-full overflow-hidden bg-zinc-900">
            <img
              src="/images/bg_mountain.jpg"
              alt="Mountain Lake Cover"
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                // Fallback to beautiful mountain lake from unsplash if local image fails
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=80';
              }}
            />
            {/* Subtle gradient vignette */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

            {/* Back button */}
            <button
              onClick={onBack}
              className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {/* Script Text in Top Right: "Collect Experiences Not Things" */}
            <div className="absolute top-4 sm:top-6 right-4 sm:right-8 text-right pointer-events-none select-none">
              <span 
                className="block text-white/90 text-lg sm:text-2xl md:text-3xl font-serif italic tracking-wide"
                style={{
                  fontFamily: "'Playfair Display', Georgia, cursive",
                  textShadow: '0 2px 10px rgba(0,0,0,0.8)'
                }}
              >
                Collect
              </span>
              <span 
                className="block text-white/90 text-lg sm:text-2xl md:text-3xl font-serif italic tracking-wide"
                style={{
                  fontFamily: "'Playfair Display', Georgia, cursive",
                  textShadow: '0 2px 10px rgba(0,0,0,0.8)'
                }}
              >
                Experiences
              </span>
              <span 
                className="block text-white/90 text-lg sm:text-2xl md:text-3xl font-serif italic tracking-wide"
                style={{
                  fontFamily: "'Playfair Display', Georgia, cursive",
                  textShadow: '0 2px 10px rgba(0,0,0,0.8)'
                }}
              >
                Not Things
              </span>
            </div>
          </div>

          {/* 2. PROFILE HEADER & STATS BAR */}
          <div className="px-5 sm:px-8 pb-4 pt-0 relative bg-white dark:bg-zinc-950">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-16 sm:-mt-20 md:-mt-24 mb-6">
              
              {/* Left: Avatar & Identity */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5">
                {/* Circular Profile Avatar */}
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 shrink-0">
                  <img
                    src={profile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                    alt={profile.name}
                    className="w-full h-full rounded-full object-cover border-4 border-white dark:border-zinc-950 shadow-2xl ring-1 ring-zinc-200 dark:ring-zinc-800"
                  />
                  {/* Camera icon button */}
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-zinc-900 hover:bg-black text-white border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
                    title="Change profile picture"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                {/* Name, Handle, Bio */}
                <div className="space-y-1 sm:mb-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {profile.name}
                    </h1>

                    {/* Level badge displayed right beside user name */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-xs">
                      <Mountain className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Level {profile.stats?.levelNumber || 4} — {profile.stats?.level || 'Travel Explorer'}</span>
                    </span>

                    {saveSuccess && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        Saved
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-zinc-400">
                    {profile.username || '@rohantravels'}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 font-medium pt-0.5">
                    {profile.bio}
                  </p>
                </div>
              </div>

              {/* Right: Edit Profile Button */}
              <div className="flex items-center gap-2.5 self-start md:self-end md:mb-2">
                <button
                  onClick={() => {
                    setEditForm(profile);
                    setIsEditModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-zinc-300 dark:border-zinc-700 text-slate-900 dark:text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>

            {/* Stats & Gamified Badge Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-3 sm:gap-4 pt-3 pb-2 border-t border-zinc-100 dark:border-zinc-850 items-center">
              {/* Trips count */}
              <div className="lg:col-span-2 text-left sm:text-center p-2">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white block leading-none">
                  {profile.stats?.tripsCount || 8}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-semibold block mt-1">
                  Trips
                </span>
              </div>

              {/* Places count */}
              <div className="lg:col-span-2 text-left sm:text-center p-2">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white block leading-none">
                  {profile.stats?.placesCount || 34}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-semibold block mt-1">
                  Places
                </span>
              </div>

              {/* Countries count */}
              <div className="lg:col-span-2 text-left sm:text-center p-2">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white block leading-none">
                  {profile.stats?.countriesCount || 4}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-semibold block mt-1">
                  Countries
                </span>
              </div>

              {/* Level 4 Travel Explorer badge */}
              <div className="col-span-2 sm:col-span-4 lg:col-span-6 lg:ml-auto">
                <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 flex items-center gap-3 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
                    <Mountain className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-extrabold text-emerald-900 dark:text-emerald-300 block leading-tight">
                      Level {profile.stats?.levelNumber || 4}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 block leading-tight">
                      {profile.stats?.level || 'Travel Explorer'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. PROFILE NAVIGATION TABS */}
            <div className="flex items-center gap-6 sm:gap-8 border-b border-zinc-200 dark:border-zinc-800 pt-4 overflow-x-auto select-none">
              {(['overview', 'dna', 'trips', 'saved', 'crew'] as const).map((tab) => {
                const isActive = activeTab === tab;
                const labels: Record<typeof tab, string> = {
                  overview: 'Overview',
                  dna: 'Travel DNA',
                  trips: 'Trips',
                  saved: 'Saved',
                  crew: 'Crew'
                };

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm sm:text-base font-bold transition-all relative shrink-0 cursor-pointer ${
                      isActive
                        ? 'text-emerald-700 dark:text-emerald-400 font-extrabold'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{labels[tab]}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        </div>

        {/* 4. TAB CONTENTS */}
        <div className="mt-6">
          
          {/* --- TAB 1: OVERVIEW (MATCHING SCREENSHOT) --- */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Upper 2 Cards: Travel DNA & Travel Preferences */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* CARD 1: YOUR TRAVEL DNA */}
                <div className="lg:col-span-6 bg-white dark:bg-zinc-950 rounded-3xl p-5 sm:p-6 shadow-xl border border-zinc-200 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                      <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="text-base sm:text-lg font-extrabold">Your Travel DNA</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('dna')}
                      className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* DNA Style Bars */}
                  <div className="space-y-3 pt-1">
                    {[
                      { name: 'Adventure', icon: Mountain, val: profile.travelDNA?.adventure || 90 },
                      { name: 'Nature', icon: Leaf, val: profile.travelDNA?.nature || 82 },
                      { name: 'Food', icon: Utensils, val: profile.travelDNA?.food || 74 },
                      { name: 'Photography', icon: PhotoIcon, val: profile.travelDNA?.photography || 88 },
                      { name: 'Nightlife', icon: Music, val: profile.travelDNA?.nightlife || 60 },
                      { name: 'Luxury', icon: Gem, val: profile.travelDNA?.luxury || 40 }
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.name} className="flex items-center gap-3">
                          <div className="flex items-center gap-2 w-28 sm:w-32 shrink-0">
                            <Icon className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
                            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200">
                              {item.name}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="flex-1 h-3.5 bg-slate-100 dark:bg-zinc-850 rounded-full overflow-hidden p-0.5">
                            <div
                              className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-700 shadow-xs"
                              style={{ width: `${item.val}%` }}
                            />
                          </div>

                          <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-zinc-200 w-10 text-right">
                            {item.val}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CARD 2: TRAVEL PREFERENCES */}
                <div className="lg:col-span-6 bg-white dark:bg-zinc-950 rounded-3xl p-5 sm:p-6 shadow-xl border border-zinc-200 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                      <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="text-base sm:text-lg font-extrabold">Travel Preferences</h3>
                    </div>
                    <button
                      onClick={() => {
                        setEditForm(profile);
                        setIsEditModalOpen(true);
                      }}
                      className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  {/* Preference Items */}
                  <div className="space-y-3.5 pt-1">
                    {/* Preferred Transport */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 shrink-0">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">
                          Preferred Transport
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block">
                          {profile.travelPreferences?.transport || 'Road trips (Car/Bike)'}
                        </span>
                      </div>
                    </div>

                    {/* Travel Pace */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 shrink-0">
                        <Gauge className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">
                          Travel Pace
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block">
                          {profile.travelPreferences?.pace || 'Balanced'}
                        </span>
                      </div>
                    </div>

                    {/* Typical Budget */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">
                          Typical Budget
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block">
                          {profile.travelPreferences?.budget || '₹10K – ₹25K'}
                        </span>
                      </div>
                    </div>

                    {/* Accommodation */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 shrink-0">
                        <BedDouble className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">
                          Accommodation
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block">
                          {profile.travelPreferences?.accommodation || 'Hotels / Homestays'}
                        </span>
                      </div>
                    </div>

                    {/* Food Preference */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 shrink-0">
                        <Utensils className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">
                          Food Preference
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block">
                          {profile.travelPreferences?.food || 'Non-vegetarian (Open to all)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Lower 2 Cards: Recent Trips & Wishlist */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* CARD 3: RECENT TRIPS */}
                <div className="lg:col-span-6 bg-white dark:bg-zinc-950 rounded-3xl p-5 sm:p-6 shadow-xl border border-zinc-200 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                      <Navigation className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="text-base sm:text-lg font-extrabold">Recent Trips</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('trips')}
                      className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>View All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Horizontal Trip Cards */}
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-1">
                    {SAMPLE_RECENT_TRIPS.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => onStartPlanning(t.destination)}
                        className="group rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 cursor-pointer hover:border-emerald-500 transition-all shadow-xs"
                      >
                        <div className="h-20 sm:h-24 w-full overflow-hidden bg-zinc-800">
                          <img
                            src={t.imageUrl}
                            alt={t.destination}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-2 sm:p-2.5 space-y-0.5">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {t.destination}
                          </h4>
                          <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate">
                            {t.date}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block truncate">
                            {t.duration} • {t.cost}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CARD 4: WISHLIST */}
                <div className="lg:col-span-6 bg-white dark:bg-zinc-950 rounded-3xl p-5 sm:p-6 shadow-xl border border-zinc-200 dark:border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                      <Heart className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-600/20" />
                      <h3 className="text-base sm:text-lg font-extrabold">Wishlist</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('saved')}
                      className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>View All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Horizontal Wishlist Cards */}
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-1">
                    {SAMPLE_WISHLIST.map((w) => (
                      <div
                        key={w.id}
                        onClick={() => onStartPlanning(w.name)}
                        className="group rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 cursor-pointer hover:border-emerald-500 transition-all shadow-xs"
                      >
                        <div className="h-20 sm:h-24 w-full overflow-hidden bg-zinc-800 relative">
                          <img
                            src={w.imageUrl}
                            alt={w.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {/* Heart icon on image */}
                          <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white">
                            <Heart className="w-3.5 h-3.5 fill-white text-white" />
                          </div>
                        </div>
                        <div className="p-2 sm:p-2.5 text-center">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {w.name}
                          </h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* --- TAB 2: TRAVEL DNA DETAILS --- */}
          {activeTab === 'dna' && (
            <div className="bg-white dark:bg-zinc-950 rounded-3xl p-6 sm:p-8 shadow-xl border border-zinc-200 dark:border-zinc-800/80 space-y-6">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Travel Personality Profile
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
                  Based on your exploration choices, itineraries, and preferred activities.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {[
                    { name: 'Adventure & Thrills', val: profile.travelDNA?.adventure || 90, desc: 'High affinity for mountain passes, trekking, motorcycling, and offbeat trails.' },
                    { name: 'Nature & Landscapes', val: profile.travelDNA?.nature || 82, desc: 'Loves serene lakes, high-altitude valleys, national parks, and stargazing.' },
                    { name: 'Food & Local Culinary', val: profile.travelDNA?.food || 74, desc: 'Enjoys authentic local Tibetan, Kashmiri, and regional cuisine.' },
                    { name: 'Photography & Scenery', val: profile.travelDNA?.photography || 88, desc: 'Keeps an eye out for golden-hour panoramas and majestic scenic vistas.' },
                    { name: 'Nightlife & Gatherings', val: profile.travelDNA?.nightlife || 60, desc: 'Comfortable with local cafes, bonfires, and evening acoustic vibes.' },
                    { name: 'Luxury & Stays', val: profile.travelDNA?.luxury || 40, desc: 'Prefers experiential glamping and boutique heritage retreats.' }
                  ].map((d) => (
                    <div key={d.name} className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{d.name}</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{d.val}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full" style={{ width: `${d.val}%` }} />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">{d.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-4">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                    Travel Archetype
                  </span>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                    The High-Altitude Nomad
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                    You thrive on open highways, breathtaking ridge-lines, and unscripted road journeys. You balance physical adrenaline with quiet moments behind the lens and local fireside feasts.
                  </p>
                  <button
                    onClick={() => onStartPlanning('Ladakh')}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Plan Next Adventure
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 3: TRIPS LIST --- */}
          {activeTab === 'trips' && (
            <div className="bg-white dark:bg-zinc-950 rounded-3xl p-6 sm:p-8 shadow-xl border border-zinc-200 dark:border-zinc-800/80 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">All Planned Trips</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                    {trips.length} active itineraries in your travel library.
                  </p>
                </div>
                <button
                  onClick={() => onStartPlanning()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Plan New Trip</span>
                </button>
              </div>

              {trips.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trips.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onOpenTrip(t.id)}
                      className="group p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 hover:border-emerald-500 transition-all cursor-pointer shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                          {t.durationDays} Days
                        </span>
                        <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                          {t.travelMode}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                          {t.destination}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                          {t.days.length} Days Itinerary • {t.budgetTier}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <Compass className="w-12 h-12 text-slate-400 dark:text-zinc-600 mx-auto" />
                  <p className="text-sm text-slate-600 dark:text-zinc-400">No trips planned yet.</p>
                  <button
                    onClick={() => onStartPlanning()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    Start Planning
                  </button>
                </div>
              )}
            </div>
          )}

          {/* --- TAB 4: SAVED (WISHLIST) --- */}
          {activeTab === 'saved' && (
            <div className="bg-white dark:bg-zinc-950 rounded-3xl p-6 sm:p-8 shadow-xl border border-zinc-200 dark:border-zinc-800/80 space-y-6">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Dream Destinations Wishlist</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {SAMPLE_WISHLIST.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => onStartPlanning(w.name)}
                    className="group rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 cursor-pointer hover:border-emerald-500 transition-all shadow-sm"
                  >
                    <div className="h-36 w-full overflow-hidden relative">
                      <img src={w.imageUrl} alt={w.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white">
                        <Heart className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                      </div>
                    </div>
                    <div className="p-3.5 space-y-1">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{w.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">{w.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- TAB 5: CREW (TRAVEL COMPANIONS) --- */}
          {activeTab === 'crew' && (
            <div className="bg-white dark:bg-zinc-950 rounded-3xl p-6 sm:p-8 shadow-xl border border-zinc-200 dark:border-zinc-800/80 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Travel Crew & Companions</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Friends and family you share itineraries with.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Aarav Sharma', role: 'Adventure Co-rider', trips: '4 trips together', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80' },
                  { name: 'Priya Mehta', role: 'Food & Culture Partner', trips: '3 trips together', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80' },
                  { name: 'Vikram Pujeri', role: 'Road Trip Navigator', trips: '6 trips together', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80' }
                ].map((member) => (
                  <div key={member.name} className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 flex items-center gap-3.5">
                    <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{member.name}</h4>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">{member.role}</span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">{member.trips}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- EDIT PROFILE MODAL / DRAWER --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setIsEditModalOpen(false)} />

          <div
            className="relative w-full max-w-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                Edit Travel Profile
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-850 hover:bg-slate-200 dark:hover:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Name & Handle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Username Handle
                  </label>
                  <input
                    type="text"
                    value={editForm.username || ''}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="@rohantravels"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Bio Tagline
                </label>
                <input
                  type="text"
                  value={editForm.bio || ''}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Exploring new places, one trip at a time 🌍"
                />
              </div>

              {/* DOB & Place */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Date of Birth (DOB)
                  </label>
                  <input
                    type="date"
                    value={editForm.dob || ''}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Place / Hometown
                  </label>
                  <input
                    type="text"
                    value={editForm.place || ''}
                    onChange={(e) => setEditForm({ ...editForm, place: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Bengaluru, India"
                  />
                </div>
              </div>

              {/* Travel Preferences */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Travel Preferences
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                      Preferred Transport
                    </label>
                    <select
                      value={editForm.travelPreferences?.transport || 'Road trips (Car/Bike)'}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          travelPreferences: { ...editForm.travelPreferences, transport: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Road trips (Car/Bike)">Road trips (Car/Bike)</option>
                      <option value="Flights (Fast transit)">Flights (Fast transit)</option>
                      <option value="Train / Scenic rail">Train / Scenic rail</option>
                      <option value="Self-Drive Rental">Self-Drive Rental</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                      Travel Pace
                    </label>
                    <select
                      value={editForm.travelPreferences?.pace || 'Balanced'}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          travelPreferences: { ...editForm.travelPreferences, pace: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Relaxed (Slow & Chill)">Relaxed (Slow & Chill)</option>
                      <option value="Balanced">Balanced</option>
                      <option value="Packed (Max sights)">Packed (Max sights)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                      Typical Budget
                    </label>
                    <input
                      type="text"
                      value={editForm.travelPreferences?.budget || '₹10K – ₹25K'}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          travelPreferences: { ...editForm.travelPreferences, budget: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="₹10K – ₹25K"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                      Food Preference
                    </label>
                    <select
                      value={editForm.travelPreferences?.food || 'Non-vegetarian (Open to all)'}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          travelPreferences: { ...editForm.travelPreferences, food: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Non-vegetarian (Open to all)">Non-vegetarian (Open to all)</option>
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Vegan">Vegan</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
