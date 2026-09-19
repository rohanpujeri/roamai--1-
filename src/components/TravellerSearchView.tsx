import React, { useState, useMemo } from 'react';
import { Search, MapPin, Compass, UserCheck, UserPlus, Award, ArrowLeft, Sparkles, Filter } from 'lucide-react';
import { ThemeConfig } from '../types';

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

const ALL_TRAVELLERS: TravellerProfile[] = [
  {
    id: 'tr-1',
    name: 'Rohan Sharma',
    username: '@rohantravels',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    location: 'Bangalore, India',
    bio: 'Exploring new places, one trip at a time 🌍 Trekker, mountain photographer & coffee aficionado.',
    level: 'Level 4 — Travel Explorer',
    tripsCount: 8,
    placesCount: 34,
    topDNA: ['Adventure 90%', 'Photography 88%', 'Nature 82%'],
    recentPlaces: ['Manali', 'Coorg', 'Wayanad', 'Goa'],
    isFollowing: false
  },
  {
    id: 'tr-2',
    name: 'Aanya Verma',
    username: '@aanya_verma',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    location: 'Mumbai, India',
    bio: 'Beach lover, sunset chaser, and road trip fanatic. Living out of a backpack across coastal India.',
    level: 'Level 5 — Trailblazer',
    tripsCount: 14,
    placesCount: 52,
    topDNA: ['Nature 95%', 'Food 88%', 'Photography 91%'],
    recentPlaces: ['Goa', 'Gokarna', 'Varkala', 'Pondicherry'],
    isFollowing: true
  },
  {
    id: 'tr-3',
    name: 'Kabir Dev',
    username: '@himalayan_nomad',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    location: 'Manali, Himachal Pradesh',
    bio: 'High-altitude mountaineer & wilderness guide. Spiti Valley & Ladakh winter expeditions specialist.',
    level: 'Level 6 — Master Nomad',
    tripsCount: 22,
    placesCount: 89,
    topDNA: ['Adventure 98%', 'Nature 94%', 'Camping 90%'],
    recentPlaces: ['Spiti', 'Ladakh', 'Zanskar', 'Kaza'],
    isFollowing: false
  },
  {
    id: 'tr-4',
    name: 'Sneha Patel',
    username: '@snehawanders',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    location: 'Pune, India',
    bio: 'Solo backpacker on a quest to explore hidden trails across Northeast India & Southeast Asia.',
    level: 'Level 3 — Solo Pioneer',
    tripsCount: 6,
    placesCount: 28,
    topDNA: ['Culture 85%', 'Food 92%', 'Nature 80%'],
    recentPlaces: ['Meghalaya', 'Dawki', 'Kaziranga', 'Tawang'],
    isFollowing: false
  },
  {
    id: 'tr-5',
    name: 'Vikramaditya Roy',
    username: '@vikram_aditya',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    location: 'Delhi, India',
    bio: 'Motorcycle expeditions through Rajasthan, Ladakh, and coastal Konkan trails. Coffee & sunsets.',
    level: 'Level 4 — Route Master',
    tripsCount: 11,
    placesCount: 45,
    topDNA: ['Road Trips 96%', 'Adventure 89%', 'Heritage 84%'],
    recentPlaces: ['Jaisalmer', 'Udaipur', 'Pushkar', 'Leh'],
    isFollowing: false
  },
  {
    id: 'tr-6',
    name: 'Diya Sengupta',
    username: '@diya_journeys',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    location: 'Kolkata, India',
    bio: 'Culinary explorer & slow travel advocate. Documenting street food recipes across 18 states.',
    level: 'Level 4 — Food Nomad',
    tripsCount: 10,
    placesCount: 42,
    topDNA: ['Food 98%', 'Culture 90%', 'Photography 82%'],
    recentPlaces: ['Amritsar', 'Lucknow', 'Varanasi', 'Kochi'],
    isFollowing: false
  }
];

interface TravellerSearchViewProps {
  currentTheme?: ThemeConfig;
  onSelectTraveller?: (traveller: TravellerProfile) => void;
  onBack?: () => void;
}

export const TravellerSearchView: React.FC<TravellerSearchViewProps> = ({
  onSelectTraveller,
  onBack
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [travellers, setTravellers] = useState<TravellerProfile[]>(ALL_TRAVELLERS);

  const filterTags = ['All', 'Adventure', 'Nature', 'Photography', 'Food', 'Road Trips'];

  const filteredTravellers = useMemo(() => {
    return travellers.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        t.name.toLowerCase().includes(q) ||
        t.username.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.bio.toLowerCase().includes(q) ||
        t.recentPlaces.some((p) => p.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (selectedTag === 'All') return true;
      return t.topDNA.some((dna) => dna.toLowerCase().includes(selectedTag.toLowerCase()));
    });
  }, [travellers, searchQuery, selectedTag]);

  const toggleFollow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTravellers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isFollowing: !t.isFollowing } : t))
    );
  };

  return (
    <div className="min-h-screen bg-[#0c0d12] text-white pb-28 pt-4 sm:pt-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 cursor-pointer transition-colors"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-emerald-400" />
                <span>Travellers Profile Search</span>
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400">
                Discover and connect with fellow explorers, roadtrippers & guides
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar Container */}
        <div className="bg-[#14151c] border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search travellers by name, @username, destination (e.g. Manali, Spiti, Goa)..."
              className="w-full bg-[#1b1c24] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1 uppercase tracking-wider pl-1">
              <Filter className="w-3 h-3" />
              Category:
            </span>
            {filterTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Travellers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTravellers.map((traveller) => (
            <div
              key={traveller.id}
              onClick={() => onSelectTraveller?.(traveller)}
              className="bg-[#14151c] hover:bg-[#181922] border border-white/10 rounded-2xl p-4 sm:p-5 transition-all shadow-lg hover:border-emerald-500/40 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                {/* Profile Top Row: Avatar + Name + Level + Follow Button */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-neutral-800 ring-2 ring-emerald-500/40 shrink-0 group-hover:scale-105 transition-transform">
                      <img
                        src={traveller.avatarUrl}
                        alt={traveller.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                          {traveller.name}
                        </h2>
                        {/* Level badge beside name */}
                        <span className="text-[10px] font-extrabold text-amber-400 bg-amber-950/70 border border-amber-800/60 px-1.5 py-0.2 rounded-md shrink-0">
                          {traveller.level.split('—')[0].trim()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 font-medium">
                        {traveller.username}
                      </p>
                      <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{traveller.location}</span>
                      </p>
                    </div>
                  </div>

                  {/* Connect / Follow Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleFollow(traveller.id, e)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                      traveller.isFollowing
                        ? 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-750'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md'
                    }`}
                  >
                    {traveller.isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Connected</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Connect</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Bio */}
                <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2 mb-3">
                  {traveller.bio}
                </p>

                {/* Stats row */}
                <div className="flex items-center gap-3 text-xs text-neutral-400 border-t border-white/5 pt-2.5 mb-2.5">
                  <span className="font-bold text-white">
                    {traveller.tripsCount} <span className="font-normal text-neutral-400">Trips</span>
                  </span>
                  <span>•</span>
                  <span className="font-bold text-white">
                    {traveller.placesCount} <span className="font-normal text-neutral-400">Places</span>
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {traveller.level}
                  </span>
                </div>
              </div>

              {/* Bottom Tags */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {traveller.topDNA.map((dna, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300 text-[10px] font-semibold"
                  >
                    {dna}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredTravellers.length === 0 && (
          <div className="bg-[#14151c] border border-white/10 rounded-2xl p-12 text-center text-neutral-500 flex flex-col items-center">
            <Search className="w-10 h-10 mb-3 stroke-1 text-neutral-600" />
            <p className="text-sm font-bold text-neutral-200">No travellers found</p>
            <p className="text-xs text-neutral-500 mt-1">Try searching with a different name, city, or style</p>
          </div>
        )}
      </div>
    </div>
  );
};
