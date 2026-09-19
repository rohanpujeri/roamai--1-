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
  Lock,
  ChevronDown,
  UserPlus,
  Menu,
  Copy,
  Layers,
  Award,
  Flame,
  Volume2,
  VolumeX
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

// Default recent trips for grid display
const SAMPLE_RECENT_TRIPS = [
  {
    id: 'sample-1',
    destination: 'Goa',
    date: 'Jan 2024',
    duration: '4 days',
    cost: '₹28,430',
    imageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80',
    isCarousel: true
  },
  {
    id: 'sample-2',
    destination: 'Wayanad',
    date: 'Oct 2023',
    duration: '3 days',
    cost: '₹16,800',
    imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80',
    isCarousel: false
  },
  {
    id: 'sample-3',
    destination: 'Coorg',
    date: 'Mar 2023',
    duration: '2 days',
    cost: '₹11,200',
    imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80',
    isCarousel: true
  },
  {
    id: 'sample-4',
    destination: 'Spiti Valley',
    date: 'Jul 2023',
    duration: '6 days',
    cost: '₹34,500',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
    isCarousel: true
  },
  {
    id: 'sample-5',
    destination: 'Ladakh',
    date: 'Aug 2023',
    duration: '7 days',
    cost: '₹42,000',
    imageUrl: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=800&auto=format&fit=crop&q=80',
    isCarousel: false
  },
  {
    id: 'sample-6',
    destination: 'Meghalaya',
    date: 'Nov 2023',
    duration: '5 days',
    cost: '₹22,900',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    isCarousel: true
  }
];

// User's uploaded travel reels / trails
const USER_TRAILS_FEED = [
  {
    id: 'user-trail-1',
    title: 'Sunset Cliffs in South Goa',
    destination: 'Goa',
    viewsCount: '14.2K',
    likesCount: '1,840',
    videoUrl: '/videos/beach-waves.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    duration: '0:24'
  },
  {
    id: 'user-trail-2',
    title: 'Chasing Waterfalls in Wayanad',
    destination: 'Wayanad',
    viewsCount: '8.9K',
    likesCount: '942',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-green-mountain-with-trees-41480-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80',
    duration: '0:35'
  },
  {
    id: 'user-trail-3',
    title: 'Sunrise above the Clouds at 11,000 ft',
    destination: 'Spiti Valley',
    viewsCount: '24.5K',
    likesCount: '3,120',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-top-view-of-water-moving-in-a-lake-43750-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    duration: '0:42'
  },
  {
    id: 'user-trail-4',
    title: 'Secret Coffee Plantation Walk',
    destination: 'Coorg',
    viewsCount: '6.1K',
    likesCount: '780',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80',
    duration: '0:18'
  },
  {
    id: 'user-trail-5',
    title: 'Emerald Lake Crystal Waters',
    destination: 'Meghalaya',
    viewsCount: '31.8K',
    likesCount: '4,520',
    videoUrl: '/videos/beach-waves.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    duration: '0:30'
  },
  {
    id: 'user-trail-6',
    title: 'Highway Pass Ride at Sunset',
    destination: 'Ladakh',
    viewsCount: '19.4K',
    likesCount: '2,890',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-green-mountain-with-trees-41480-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=600&q=80',
    duration: '0:28'
  }
];

// Story Highlights
const HIGHLIGHTS = [
  { id: 'h1', title: 'Goa 🌊', imageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=300&auto=format&fit=crop&q=80' },
  { id: 'h2', title: 'Spiti 🏔️', imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&auto=format&fit=crop&q=80' },
  { id: 'h3', title: 'Wayanad 🌲', imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=300&auto=format&fit=crop&q=80' },
  { id: 'h4', title: 'Coorg ☕', imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=300&auto=format&fit=crop&q=80' },
  { id: 'h5', title: 'Bali ✨', imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=300&auto=format&fit=crop&q=80' },
];

// Wishlist saved spots
const SAMPLE_WISHLIST = [
  { id: 'w1', name: 'Ladakh', subtitle: 'Himalayas', imageUrl: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=600&auto=format&fit=crop&q=80' },
  { id: 'w2', name: 'Bali', subtitle: 'Indonesia', imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&auto=format&fit=crop&q=80' },
  { id: 'w3', name: 'Kyoto', subtitle: 'Japan', imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop&q=80' },
  { id: 'w4', name: 'Amalfi', subtitle: 'Italy', imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&auto=format&fit=crop&q=80' },
  { id: 'w5', name: 'Reykjavik', subtitle: 'Iceland', imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&auto=format&fit=crop&q=80' },
  { id: 'w6', name: 'Zermatt', subtitle: 'Switzerland', imageUrl: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=600&auto=format&fit=crop&q=80' }
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

  // Tabs: trips (grid), trails (reels), dna (travel personality), saved (bookmarks)
  const [activeTab, setActiveTab] = useState<'trips' | 'trails' | 'dna' | 'saved'>('trips');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  // Status Thought Note
  const [statusNote, setStatusNote] = useState<string>("Can't decide...");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState("Can't decide...");

  // Active trail for modal playback
  const [selectedTrail, setSelectedTrail] = useState<typeof USER_TRAILS_FEED[0] | null>(null);
  const [isModalMuted, setIsModalMuted] = useState(true);

  // Profile data states
  const [profile, setProfile] = useState<UserProfileData>(() => {
    const cached = user ? getCachedUserProfile(user.id) : null;
    return {
      name: cached?.name || userMeta.full_name || userMeta.name || 'Rohan Pujeri',
      username: cached?.username || userMeta.username || '@rohan_pujeri',
      bio: cached?.bio || userMeta.bio || 'Exploring new places, one trip at a time 🌍',
      avatarUrl: cached?.avatarUrl || userMeta.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      dob: cached?.dob || userMeta.dob || '1998-08-15',
      place: cached?.place || userMeta.place || 'Bengaluru, India',
      email: user?.email || 'rohan.pujeri@example.com',
      travelDNA: cached?.travelDNA || {
        adventure: 90,
        nature: 85,
        food: 72,
        photography: 88,
        nightlife: 60,
        luxury: 40
      },
      travelPreferences: cached?.travelPreferences || {
        transport: 'Road trips (Car/Bike)',
        pace: 'Balanced',
        budget: '₹10K – ₹25K',
        accommodation: 'Homestays & Boutique Stays',
        food: 'Open to local food'
      },
      stats: {
        tripsCount: Math.max(trips.length, 8),
        placesCount: 124,
        countriesCount: 4,
        level: 'Travel Explorer',
        levelNumber: 4
      }
    };
  });

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
    setTimeout(() => setSaveSuccess(false), 3000);

    if (user) {
      await updateUserProfileData(editForm);
    }
  };

  const handleShareProfile = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  };

  // Combine saved trips with sample trips
  const displayTrips = trips.length > 0 
    ? trips.map((t, i) => ({
        id: t.id,
        destination: t.destination,
        date: t.startDate || 'Recent',
        duration: `${t.durationDays} days`,
        cost: t.budgetTier,
        imageUrl: t.destinationPlace?.photoUrl || SAMPLE_RECENT_TRIPS[i % SAMPLE_RECENT_TRIPS.length].imageUrl,
        isCarousel: i % 2 === 0
      }))
    : SAMPLE_RECENT_TRIPS;

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

        {/* Center: Lock icon, username with dropdown, red notification dot */}
        <div 
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-1.5 cursor-pointer select-none group"
        >
          <Lock className="w-3.5 h-3.5 text-zinc-300 stroke-[2.5]" />
          <span className="font-bold text-base sm:text-lg text-white tracking-tight group-hover:text-zinc-300 transition-colors">
            {profile.username?.replace('@', '') || 'rohan_pujeri'}
          </span>
          <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
          <span className="w-2 h-2 rounded-full bg-red-500 shadow-xs ml-0.5" />
        </div>

        {/* Right: Threads icon & Hamburger menu */}
        <div className="flex items-center gap-4">
          <a
            href="https://threads.net"
            target="_blank"
            rel="noreferrer"
            className="text-white hover:text-zinc-300 transition-colors cursor-pointer"
            title="Threads"
          >
            <svg className="w-6 h-6 fill-current" viewBox="0 0 192 192">
              <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4184 44.7443 97.2749 44.744 97.1312 44.744C73.4984 44.744 55.4385 61.2721 52.8805 85.2289C50.2198 110.147 64.9749 132.868 91.0772 134.629C104.996 135.568 117.784 130.655 126.797 122.251C133.004 116.463 137.077 108.971 138.835 100.865C138.932 100.419 138.643 99.9863 138.196 99.8899C138.156 99.8814 138.115 99.8771 138.074 99.8771C137.671 99.8771 137.319 100.17 137.247 100.575C135.602 108.065 131.782 114.981 125.992 120.371C117.587 128.207 105.474 132.867 92.2039 131.972C68.1747 130.352 54.3414 109.183 56.8049 86.136C59.206 63.6669 75.3854 48.077 97.1309 48.077C97.2618 48.077 97.3925 48.0773 97.523 48.078C120.672 48.2255 134.42 62.4344 135.803 86.5862C128.537 83.7423 120.264 82.2611 111.411 82.2611C87.9547 82.2611 74.0206 96.1952 74.0206 112.553C74.0206 128.91 87.9547 142.845 111.411 142.845C124.629 142.845 135.795 137.893 143.082 129.479C147.248 124.668 150.151 118.665 151.71 111.96C153.308 105.087 153.649 97.6695 152.721 89.9679C151.107 76.5746 144.331 65.1793 134.385 57.0628C124.718 49.1744 111.666 44.8205 97.1309 44.8205C97.027 44.8205 96.9232 44.8207 96.8193 44.8211C72.0625 44.9818 51.5796 62.7719 48.9189 87.6896C46.1264 113.844 61.6888 137.935 89.2882 139.796C103.883 140.781 117.481 135.592 127.054 126.666C127.382 126.36 127.408 125.857 127.102 125.529C126.796 125.201 126.293 125.175 125.965 125.481C116.848 133.982 103.896 138.924 89.9882 137.986C63.6624 136.21 48.8079 113.228 51.4686 88.3104C54.0049 64.5583 73.5358 47.5748 97.1309 47.5748C111.082 47.5748 123.633 51.7613 132.928 59.3468C142.493 67.1517 149.009 78.1099 150.562 90.9883C152.484 106.929 148.868 120.301 139.816 130.686C132.88 138.653 122.253 143.345 109.611 143.345C87.411 143.345 74.5206 130.126 74.5206 114.553C74.5206 98.9791 87.411 85.7611 109.611 85.7611C117.893 85.7611 125.688 87.1189 132.614 89.7027C135.808 90.8929 138.809 89.4764 141.537 88.9883Z" />
            </svg>
          </a>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="p-1 text-white hover:text-zinc-300 transition-colors cursor-pointer"
            title="Menu & Settings"
          >
            <Menu className="w-6 h-6 stroke-[2]" />
          </button>
        </div>
      </header>

      {/* 2. PROFILE HEADER: AVATAR & STATS IN ONE STRAIGHT LINE */}
      <div className="px-4 sm:px-6 pt-3 max-w-2xl mx-auto">
        <div className="flex items-center gap-6 sm:gap-8">
          {/* Avatar with thought bubble note */}
          <div className="flex flex-col items-center shrink-0">
            {/* Thought Note Bubble */}
            <div 
              onClick={() => {
                setNoteInput(statusNote);
                setIsEditingNote(true);
              }}
              className="relative mb-1.5 cursor-pointer group"
              title="Click to edit note"
            >
              <div className="bg-[#262626] text-white text-[11px] font-medium px-2.5 py-1 rounded-2xl border border-white/10 shadow-lg flex items-center gap-1 max-w-[100px] truncate group-hover:bg-[#333333] transition-colors">
                <span className="truncate">{statusNote}</span>
              </div>
              <div className="absolute -bottom-1 left-4 w-2 h-2 bg-[#262626] rounded-full border border-white/10" />
              <div className="absolute -bottom-2 left-5 w-1 h-1 bg-[#262626] rounded-full" />
            </div>

            {/* Circular Avatar with + Badge */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24">
              <div className="w-full h-full rounded-full p-[2px] bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-md">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-black bg-neutral-900">
                  <img
                    src={profile.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
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
          </div>

          {/* Right Column: Name and Stats in ONE STRAIGHT LINE */}
          <div className="flex-1 flex flex-col justify-center">
            {/* User Full Name & Level Badge */}
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {profile.name}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Award className="w-3 h-3" />
                <span>Level {profile.stats?.levelNumber || 4}</span>
              </span>
            </div>

            {/* STATS IN ONE STRAIGHT LINE: TRIPS | PLACES | COUNTRIES */}
            <div className="flex items-center justify-between text-center max-w-[280px] sm:max-w-[340px] pt-1">
              {/* Trips */}
              <div 
                onClick={() => setActiveTab('trips')}
                className="cursor-pointer group flex-1"
              >
                <span className="block font-bold text-base sm:text-lg text-white group-hover:text-zinc-300 transition-colors leading-tight">
                  {profile.stats?.tripsCount || Math.max(trips.length, 8)}
                </span>
                <span className="block text-xs text-zinc-400 font-normal mt-0.5">
                  trips
                </span>
              </div>

              {/* Places */}
              <div 
                onClick={() => setActiveTab('trips')}
                className="cursor-pointer group flex-1"
              >
                <span className="block font-bold text-base sm:text-lg text-white group-hover:text-zinc-300 transition-colors leading-tight">
                  {profile.stats?.placesCount || 124}
                </span>
                <span className="block text-xs text-zinc-400 font-normal mt-0.5">
                  places
                </span>
              </div>

              {/* Countries */}
              <div 
                onClick={() => setActiveTab('trips')}
                className="cursor-pointer group flex-1"
              >
                <span className="block font-bold text-base sm:text-lg text-white group-hover:text-zinc-300 transition-colors leading-tight">
                  {profile.stats?.countriesCount || 4}
                </span>
                <span className="block text-xs text-zinc-400 font-normal mt-0.5">
                  countries
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
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              {profile.place || 'Bengaluru, India'}
            </span>
            <span>•</span>
            <span className="text-zinc-500 font-mono">
              {profile.username || '@rohan_pujeri'}
            </span>
          </div>
        </div>

        {/* Action Buttons: Edit profile | Share profile | UserPlus */}
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
          <button
            onClick={() => onStartPlanning()}
            className="py-1.5 sm:py-2 px-2.5 rounded-lg bg-[#262626] hover:bg-[#333333] text-white transition-colors cursor-pointer flex items-center justify-center"
            title="Plan trip with friends"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Story Highlights (Horizontal Carousel) */}
        <div className="flex items-center gap-4 mt-5 overflow-x-auto scrollbar-none pb-2 select-none">
          {/* + New Highlight */}
          <div 
            onClick={() => onStartPlanning()}
            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full border border-dashed border-zinc-700 group-hover:border-white flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] text-zinc-300 font-medium">New</span>
          </div>

          {/* Highlights */}
          {HIGHLIGHTS.map((h) => (
            <div 
              key={h.id} 
              onClick={() => setActiveTab('trips')}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full p-[2px] border border-zinc-800 group-hover:border-zinc-500 transition-colors">
                <img
                  src={h.imageUrl}
                  alt={h.title}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="text-[11px] text-zinc-300 font-medium max-w-[64px] truncate text-center">
                {h.title}
              </span>
            </div>
          ))}
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

        {/* --- TAB 2: TRAILS (3-COLUMN REELS VIDEO GRID) --- */}
        {activeTab === 'trails' && (
          <div className="grid grid-cols-3 gap-0.5 sm:gap-1 mt-0.5">
            {USER_TRAILS_FEED.map((trail) => (
              <div
                key={trail.id}
                onClick={() => setSelectedTrail(trail)}
                className="relative aspect-[9/16] overflow-hidden group cursor-pointer bg-zinc-900"
              >
                <img
                  src={trail.posterUrl}
                  alt={trail.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Dark Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                {/* Bottom-left: Play Icon + Views Count (Instagram Reels style) */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold drop-shadow-md">
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{trail.viewsCount}</span>
                </div>

                {/* Duration in top right */}
                <div className="absolute top-2 right-2 text-[10px] font-semibold text-white/80 bg-black/50 px-1.5 py-0.5 rounded-sm">
                  {trail.duration}
                </div>
              </div>
            ))}
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
                  Level {profile.stats?.levelNumber || 4} Explorer
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
                  <span className="font-bold text-white mt-0.5 block">{profile.travelPreferences?.budget || '₹10K – ₹25K'}</span>
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
          <div className="grid grid-cols-3 gap-0.5 sm:gap-1 mt-0.5">
            {SAMPLE_WISHLIST.map((spot) => (
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
                  <span className="text-[10px] text-zinc-300 font-medium truncate drop-shadow-xs">
                    {spot.subtitle}
                  </span>
                </div>
              </div>
            ))}
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

      {/* --- EDIT STATUS NOTE MODAL --- */}
      {isEditingNote && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-zinc-900 rounded-2xl border border-white/15 p-5 text-left shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">
              Update travel thought
            </h3>
            <input
              type="text"
              value={noteInput}
              maxLength={30}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="e.g. Can't decide... or Spiti next!"
              className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-xs font-medium focus:outline-hidden focus:border-white"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setIsEditingNote(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setStatusNote(noteInput.trim() || "Can't decide...");
                  setIsEditingNote(false);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-black hover:bg-zinc-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
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
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:outline-hidden focus:border-white"
                />
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
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold cursor-pointer transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
