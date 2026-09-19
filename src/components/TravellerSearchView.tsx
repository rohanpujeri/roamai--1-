import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Compass, 
  UserCheck, 
  UserPlus, 
  Award, 
  ArrowLeft, 
  Sparkles, 
  Play, 
  Eye, 
  X, 
  Heart,
  Video
} from 'lucide-react';
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
    username: string;
    avatarUrl: string;
  };
  spanTwoCols?: boolean;
  spanTwoRows?: boolean;
}

const SAMPLE_EXPLORE_TILES: ExploreTile[] = [
  {
    id: 'exp-1',
    type: 'trail',
    title: 'Hidden Treehouse in the Western Ghats rainforest',
    destination: 'Wayanad, Kerala',
    imageUrl: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-green-mountain-with-trees-41480-large.mp4',
    viewsCount: '875K',
    likesCount: '48.2K',
    creator: {
      username: 'aanya_verma',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
    },
    spanTwoRows: true
  },
  {
    id: 'exp-2',
    type: 'place',
    title: 'Cliffside sunset view of Arabian Sea',
    destination: 'Varkala, Kerala',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    videoUrl: '/videos/beach-waves.mp4',
    viewsCount: '543K',
    likesCount: '32.1K',
    creator: {
      username: 'rohantravels',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'exp-3',
    type: 'trail',
    title: 'Spiti Valley winter river crossing',
    destination: 'Spiti Valley, Himachal',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-top-view-of-water-moving-in-a-lake-43750-large.mp4',
    viewsCount: '105K',
    likesCount: '12.4K',
    creator: {
      username: 'himalayan_nomad',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'exp-4',
    type: 'place',
    title: 'Crystal clear glass water river boat ride',
    destination: 'Dawki, Meghalaya',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    viewsCount: '906K',
    likesCount: '64.5K',
    creator: {
      username: 'snehawanders',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'exp-5',
    type: 'trail',
    title: 'High altitude Himalayan motorcycle pass',
    destination: 'Ladakh, India',
    imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
    viewsCount: '78.2K',
    likesCount: '8.9K',
    creator: {
      username: 'vikram_aditya',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'exp-6',
    type: 'place',
    title: 'Tropical Bali Rice Terraces & Hidden Cascades',
    destination: 'Ubud, Bali',
    imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
    viewsCount: '1.5M',
    likesCount: '128K',
    creator: {
      username: 'leotravels',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'exp-7',
    type: 'trail',
    title: 'Sunset over Japanese cherry blossoms',
    destination: 'Kyoto, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
    viewsCount: '1.2M',
    likesCount: '98K',
    creator: {
      username: 'diya_journeys',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'exp-8',
    type: 'place',
    title: 'Old street food secrets in the royal alleys',
    destination: 'Lucknow, India',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
    viewsCount: '420K',
    likesCount: '36K',
    creator: {
      username: 'diya_journeys',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80'
    }
  },
  {
    id: 'exp-9',
    type: 'trail',
    title: 'Dudhsagar Waterfalls train trail trek',
    destination: 'Goa Border, India',
    imageUrl: 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=600&q=80',
    viewsCount: '650K',
    likesCount: '52K',
    creator: {
      username: 'rohantravels',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    }
  }
];

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
  onOpenTrail?: (trailId?: string) => void;
  onStartPlanning?: (destination?: string) => void;
  onBack?: () => void;
}

export const TravellerSearchView: React.FC<TravellerSearchViewProps> = ({
  onSelectTraveller,
  onOpenTrail,
  onStartPlanning
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'explore' | 'profiles' | 'places'>('explore');
  const [travellers, setTravellers] = useState<TravellerProfile[]>(ALL_TRAVELLERS);
  const [selectedTile, setSelectedTile] = useState<ExploreTile | null>(null);

  // Filtered Travellers
  const filteredTravellers = useMemo(() => {
    if (!searchQuery.trim()) return travellers;
    const q = searchQuery.toLowerCase();
    return travellers.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.username.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      t.bio.toLowerCase().includes(q) ||
      t.recentPlaces.some((p) => p.toLowerCase().includes(q))
    );
  }, [travellers, searchQuery]);

  // Filtered Explore Tiles (Places & Trails)
  const filteredExploreTiles = useMemo(() => {
    if (!searchQuery.trim()) return SAMPLE_EXPLORE_TILES;
    const q = searchQuery.toLowerCase();
    return SAMPLE_EXPLORE_TILES.filter((tile) =>
      tile.title.toLowerCase().includes(q) ||
      tile.destination.toLowerCase().includes(q) ||
      tile.creator.username.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const toggleFollow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTravellers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isFollowing: !t.isFollowing } : t))
    );
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-black text-white pb-28 select-none">
      {/* 1. Top Search Header Bar (Matches Instagram Explore search bar with AI prompt) */}
      <div className="sticky top-0 z-40 bg-black/85 backdrop-blur-xl border-b border-white/10 px-3 py-2.5 sm:px-6 sm:py-3.5">
        <div className="max-w-md sm:max-w-3xl mx-auto space-y-2.5">
          {/* Rounded Pill Search Bar */}
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search profiles, places, trails with Roam AI..."
              className="w-full bg-[#1b1c22] hover:bg-[#20222a] border border-white/10 rounded-2xl pl-11 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder:text-neutral-400 focus:outline-hidden focus:border-white/30 transition-all shadow-inner"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-3.5 flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full pointer-events-none">
                <Sparkles className="w-3 h-3" />
                <span className="hidden xs:inline">AI</span>
              </div>
            )}
          </div>

          {/* Quick Filter Tabs (Explore All, Travellers, Places/Trails) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className={`px-3.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'explore'
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-[#1b1c22] text-neutral-300 hover:bg-[#252732] border border-white/5'
              }`}
            >
              Explore Trails
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profiles')}
              className={`px-3.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'profiles'
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-[#1b1c22] text-neutral-300 hover:bg-[#252732] border border-white/5'
              }`}
            >
              Travellers ({filteredTravellers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('places')}
              className={`px-3.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'places'
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-[#1b1c22] text-neutral-300 hover:bg-[#252732] border border-white/5'
              }`}
            >
              Places & Destinations
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="max-w-md sm:max-w-3xl mx-auto px-1 sm:px-4 pt-2">
        {/* Live Search Traveller Profile Matches Row (When typing in search bar) */}
        {isSearching && filteredTravellers.length > 0 && (
          <div className="mb-4 bg-[#14151b] border border-white/10 rounded-2xl p-3 sm:p-4 space-y-3 mx-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                Traveller Matches
              </span>
              <span className="text-[11px] text-neutral-500 font-medium">
                {filteredTravellers.length} found
              </span>
            </div>

            <div className="space-y-2.5">
              {filteredTravellers.slice(0, 3).map((tr) => (
                <div
                  key={tr.id}
                  onClick={() => onSelectTraveller?.(tr)}
                  className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-[#1c1e28] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={tr.avatarUrl}
                      alt={tr.name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-white/20 shrink-0 group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                          {tr.name}
                        </span>
                        <span className="text-[10px] font-extrabold text-amber-400 bg-amber-950/70 border border-amber-800/60 px-1.5 py-0.2 rounded-md shrink-0">
                          {tr.level.split('—')[0].trim()}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 font-medium truncate">
                        {tr.username} • {tr.location}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => toggleFollow(tr.id, e)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      tr.isFollowing
                        ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md'
                    }`}
                  >
                    {tr.isFollowing ? 'Following' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: EXPLORE TRAILS & PLACES (3-Column Masonry Grid identical to Instagram Explore screenshot) */}
        {(activeTab === 'explore' || (activeTab === 'places' && !isSearching)) && (
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {filteredExploreTiles.map((tile, idx) => {
              // Create staggered visual rhythm (every 6th item is a taller vertical reel)
              const isFeatureTile = idx === 0 || idx === 7;

              return (
                <div
                  key={tile.id}
                  onClick={() => setSelectedTile(tile)}
                  className={`relative overflow-hidden cursor-pointer group bg-neutral-900 ${
                    isFeatureTile ? 'row-span-2' : 'aspect-square'
                  }`}
                >
                  {/* Media Thumbnail */}
                  <img
                    src={tile.imageUrl}
                    alt={tile.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Gradient Vignette for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Top Right Video / Trail Reel Indicator */}
                  <div className="absolute top-2 right-2 text-white/90 drop-shadow-md">
                    {tile.type === 'trail' ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <Compass className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Bottom Left View Count (Matches Instagram screenshot with eye icon and count) */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[11px] font-bold text-white drop-shadow-md">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{tile.viewsCount}</span>
                  </div>

                  {/* Hover Overlay with Destination Title & Creator */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={tile.creator.avatarUrl}
                        alt={tile.creator.username}
                        className="w-5 h-5 rounded-full object-cover ring-1 ring-white"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[11px] font-bold text-white truncate">
                        {tile.creator.username}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white line-clamp-2 leading-tight">
                        {tile.title}
                      </p>
                      <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{tile.destination}</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: TRAVELLER PROFILES FULL LIST */}
        {activeTab === 'profiles' && (
          <div className="space-y-3 px-2 sm:px-0">
            {filteredTravellers.map((tr) => (
              <div
                key={tr.id}
                onClick={() => onSelectTraveller?.(tr)}
                className="bg-[#14151b] hover:bg-[#181a24] border border-white/10 rounded-2xl p-4 transition-all shadow-md cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={tr.avatarUrl}
                      alt={tr.name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/40 shrink-0 group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                          {tr.name}
                        </h3>
                        <span className="text-[10px] font-extrabold text-amber-400 bg-amber-950/70 border border-amber-800/60 px-1.5 py-0.2 rounded-md shrink-0">
                          {tr.level.split('—')[0].trim()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 font-medium">
                        {tr.username}
                      </p>
                      <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>{tr.location}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => toggleFollow(tr.id, e)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      tr.isFollowing
                        ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md'
                    }`}
                  >
                    {tr.isFollowing ? (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-emerald-400" />
                        Following
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <UserPlus className="w-3 h-3" />
                        Connect
                      </span>
                    )}
                  </button>
                </div>

                <p className="text-xs text-neutral-300 mt-2.5 line-clamp-2 leading-relaxed">
                  {tr.bio}
                </p>

                <div className="flex items-center gap-1.5 flex-wrap mt-2.5 pt-2 border-t border-white/5">
                  <span className="text-[10px] text-neutral-400 font-semibold mr-1">
                    {tr.tripsCount} Trips • {tr.placesCount} Places
                  </span>
                  {tr.topDNA.map((dna, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-white/5 text-neutral-300 text-[10px] font-semibold"
                    >
                      {dna}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: PLACES & DESTINATIONS SEARCH */}
        {activeTab === 'places' && isSearching && (
          <div className="space-y-3 px-2 sm:px-0">
            {filteredExploreTiles.map((tile) => (
              <div
                key={tile.id}
                onClick={() => setSelectedTile(tile)}
                className="bg-[#14151b] hover:bg-[#181a24] border border-white/10 rounded-2xl p-3 sm:p-4 flex items-center gap-3.5 transition-all cursor-pointer group"
              >
                <img
                  src={tile.imageUrl}
                  alt={tile.destination}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover ring-1 ring-white/10 shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{tile.destination}</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 mt-0.5">
                    {tile.title}
                  </h4>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {tile.viewsCount} views
                    </span>
                    <span>•</span>
                    <span>@{tile.creator.username}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartPlanning?.(tile.destination);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-md cursor-pointer shrink-0"
                >
                  Plan Trip
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Interactive Explore Tile Preview Modal (Opens when tapping any photo or trail) */}
      {selectedTile && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm sm:max-w-md bg-neutral-900 border border-white/15 rounded-3xl overflow-hidden shadow-2xl space-y-3">
            {/* Media Header */}
            <div className="relative aspect-4/3 sm:aspect-video w-full overflow-hidden bg-black">
              <img
                src={selectedTile.imageUrl}
                alt={selectedTile.title}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setSelectedTile(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center cursor-pointer hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
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
                  <img
                    src={selectedTile.creator.avatarUrl}
                    alt={selectedTile.creator.username}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-white/30"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">
                      @{selectedTile.creator.username}
                    </p>
                    <p className="text-[10px] text-neutral-400">Creator Trail</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full">
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
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
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
                  className="flex-1 py-2.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950"
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
