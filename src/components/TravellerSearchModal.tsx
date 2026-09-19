import React, { useState, useMemo } from 'react';
import { Search, X, MapPin, Compass, Sparkles, UserCheck, UserPlus, Award } from 'lucide-react';
import { ThemeConfig } from '../types';

export interface TravellerSearchResult {
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
  isFollowing?: boolean;
}

const SAMPLE_TRAVELLERS: TravellerSearchResult[] = [
  {
    id: 'tr-1',
    name: 'Rohan Sharma',
    username: '@rohantravels',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    location: 'Bangalore, India',
    bio: 'Exploring new places, one trip at a time 🌍 Trekker & coffee aficionado.',
    level: 'Level 4 — Travel Explorer',
    tripsCount: 8,
    placesCount: 34,
    topDNA: ['Adventure 90%', 'Photography 88%', 'Nature 82%'],
    isFollowing: false
  },
  {
    id: 'tr-2',
    name: 'Aanya Verma',
    username: '@aanya_verma',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    location: 'Mumbai, India',
    bio: 'Beach lover, sunset chaser, and road trip fanatic. Currently in Goa.',
    level: 'Level 5 — Trailblazer',
    tripsCount: 14,
    placesCount: 52,
    topDNA: ['Nature 95%', 'Food 88%', 'Photography 91%'],
    isFollowing: true
  },
  {
    id: 'tr-3',
    name: 'Kabir Dev',
    username: '@himalayan_nomad',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    location: 'Manali, Himachal Pradesh',
    bio: 'High-altitude mountaineer & wilderness guide. Spiti & Ladakh specialist.',
    level: 'Level 6 — Master Nomad',
    tripsCount: 22,
    placesCount: 89,
    topDNA: ['Adventure 98%', 'Nature 94%', 'Camping 90%'],
    isFollowing: false
  },
  {
    id: 'tr-4',
    name: 'Sneha Patel',
    username: '@snehawanders',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    location: 'Pune, India',
    bio: 'Solo backpacker on a quest to explore hidden trails across Northeast India.',
    level: 'Level 3 — Solo Pioneer',
    tripsCount: 6,
    placesCount: 28,
    topDNA: ['Culture 85%', 'Food 92%', 'Nature 80%'],
    isFollowing: false
  },
  {
    id: 'tr-5',
    name: 'Vikramaditya Roy',
    username: '@vikram_aditya',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    location: 'Delhi, India',
    bio: 'Motorcycle expeditions through Rajasthan, Ladakh, and coastal Konkan.',
    level: 'Level 4 — Route Master',
    tripsCount: 11,
    placesCount: 45,
    topDNA: ['Road Trips 96%', 'Adventure 89%', 'Heritage 84%'],
    isFollowing: false
  }
];

interface TravellerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTraveller?: (traveller: TravellerSearchResult) => void;
  currentTheme?: ThemeConfig;
}

export const TravellerSearchModal: React.FC<TravellerSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTraveller
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [travellers, setTravellers] = useState<TravellerSearchResult[]>(SAMPLE_TRAVELLERS);

  const filterTags = ['All', 'Adventure', 'Nature', 'Photography', 'Food', 'Road Trips'];

  const filteredTravellers = useMemo(() => {
    return travellers.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.bio.toLowerCase().includes(searchQuery.toLowerCase());

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header with Search Box */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Search Travellers</h3>
                <p className="text-[11px] text-neutral-400">Discover fellow explorers, roadtrippers & adventurers</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, @username, or destination..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {filterTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Travellers List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-neutral-800/40">
          {filteredTravellers.length > 0 ? (
            filteredTravellers.map((traveller) => (
              <div
                key={traveller.id}
                onClick={() => onSelectTraveller?.(traveller)}
                className="pt-3 first:pt-0 flex items-start gap-3 p-2.5 rounded-2xl hover:bg-neutral-850/60 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 ring-2 ring-white/10 shrink-0">
                  <img
                    src={traveller.avatarUrl}
                    alt={traveller.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                        {traveller.name}
                      </h4>
                      <p className="text-[11px] text-neutral-400 font-medium">
                        {traveller.username}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => toggleFollow(traveller.id, e)}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                        traveller.isFollowing
                          ? 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-750'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md'
                      }`}
                    >
                      {traveller.isFollowing ? (
                        <>
                          <UserCheck className="w-3 h-3 text-emerald-400" />
                          <span>Connected</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>Connect</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-neutral-300 mt-1 line-clamp-2 leading-relaxed">
                    {traveller.bio}
                  </p>

                  <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px]">
                    <span className="flex items-center gap-1 text-neutral-400 font-medium">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      {traveller.location}
                    </span>
                    <span className="text-neutral-600">•</span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Award className="w-3 h-3" />
                      {traveller.level}
                    </span>
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-400 font-medium">
                      {traveller.tripsCount} Trips ({traveller.placesCount} Places)
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {traveller.topDNA.map((dna, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-neutral-800/80 border border-neutral-700 text-neutral-300 text-[10px] font-semibold"
                      >
                        {dna}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-neutral-500 flex flex-col items-center">
              <Search className="w-8 h-8 mb-2 stroke-1" />
              <p className="text-xs font-bold text-neutral-300">No travellers found</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">Try searching with different keywords or travel tags</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
