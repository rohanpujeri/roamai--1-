import React, { useState, useMemo, useEffect } from 'react';
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
  Video,
  Users
} from 'lucide-react';
import { ThemeConfig } from '../types';
import { sanitizeAvatarUrl } from '../services/supabaseClient';
import { searchRealTravellers } from '../services/usernameService';

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
  const [travellers, setTravellers] = useState<TravellerProfile[]>([]);
  const [selectedTile, setSelectedTile] = useState<ExploreTile | null>(null);

  // Fetch real registered profiles dynamically across Supabase, server username registry, and local profiles
  useEffect(() => {
    let isMounted = true;
    searchRealTravellers(searchQuery).then((results) => {
      if (isMounted) {
        setTravellers(results);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [searchQuery]);

  // Dynamic explore tiles from real user uploaded trails only
  const exploreTiles = useMemo<ExploreTile[]>(() => {
    try {
      const raw = localStorage.getItem('roamai_user_trails') || localStorage.getItem('tripwise_user_trails');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(
              (t: any) =>
                t &&
                !t.id?.startsWith('sample-trail-') &&
                t.creator?.username !== '@elena_voyages' &&
                t.creator?.username !== '@rohan_treks'
            )
            .map((t: any, idx: number) => ({
              id: t.id || `trail-${idx}`,
              type: 'trail' as const,
              title: t.title || t.caption || 'Travel Trail',
              destination: t.destination || 'Explore Destination',
              imageUrl: t.posterUrl || '',
              videoUrl: t.videoUrl,
              viewsCount: t.viewsCount ? String(t.viewsCount) : '1',
              likesCount: t.likesCount ? String(t.likesCount) : '0',
              creator: {
                username: t.creator?.username || '@traveler',
                avatarUrl: sanitizeAvatarUrl(t.creator?.avatarUrl) || ''
              },
              spanTwoRows: idx % 6 === 0
            }));
        }
      }
    } catch {
      // ignore
    }
    return [];
  }, []);

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
    if (!searchQuery.trim()) return exploreTiles;
    const q = searchQuery.toLowerCase();
    return exploreTiles.filter((tile) =>
      tile.title.toLowerCase().includes(q) ||
      tile.destination.toLowerCase().includes(q) ||
      tile.creator.username.toLowerCase().includes(q)
    );
  }, [exploreTiles, searchQuery]);

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
                    {tr.avatarUrl ? (
                      <img
                        src={tr.avatarUrl}
                        alt={tr.name}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-white/20 shrink-0 group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-xs ring-1 ring-white/20 shrink-0 select-none group-hover:scale-105 transition-transform">
                        {tr.name?.charAt(0).toUpperCase() || tr.username?.replace(/^@/, '').charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
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
          filteredExploreTiles.length > 0 ? (
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
                    {tile.imageUrl ? (
                      <img
                        src={tile.imageUrl}
                        alt={tile.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-neutral-900 via-neutral-950 to-neutral-900 flex flex-col items-center justify-center p-3 text-center select-none group-hover:scale-105 transition-transform duration-300">
                        <Video className="w-6 h-6 text-emerald-400 mb-1" />
                        <span className="text-[11px] font-bold text-white line-clamp-1">{tile.destination}</span>
                      </div>
                    )}

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
                        {tile.creator.avatarUrl ? (
                          <img
                            src={tile.creator.avatarUrl}
                            alt={tile.creator.username}
                            className="w-5 h-5 rounded-full object-cover ring-1 ring-white"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] text-white font-bold ring-1 ring-white select-none">
                            {tile.creator.username.replace(/^@/, '').charAt(0).toUpperCase() || 'T'}
                          </div>
                        )}
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
          ) : (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="w-14 h-14 rounded-2xl bg-[#14151b] border border-white/10 flex items-center justify-center mx-auto text-neutral-400">
                <Compass className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">No Explore Trails Yet</h3>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                {searchQuery ? `No trails found for "${searchQuery}".` : 'Be the first to upload a video trail to explore community moments!'}
              </p>
            </div>
          )
        )}

        {/* TAB 2: TRAVELLER PROFILES FULL LIST */}
        {activeTab === 'profiles' && (
          filteredTravellers.length > 0 ? (
            <div className="space-y-3 px-2 sm:px-0">
              {filteredTravellers.map((tr) => (
                <div
                  key={tr.id}
                  onClick={() => onSelectTraveller?.(tr)}
                  className="bg-[#14151b] hover:bg-[#181a24] border border-white/10 rounded-2xl p-4 transition-all shadow-md cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {tr.avatarUrl ? (
                        <img
                          src={tr.avatarUrl}
                          alt={tr.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/40 shrink-0 group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-linear-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-base ring-2 ring-emerald-500/40 shrink-0 select-none group-hover:scale-105 transition-transform">
                          {tr.name?.charAt(0).toUpperCase() || tr.username?.replace(/^@/, '').charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
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
          ) : (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="w-14 h-14 rounded-2xl bg-[#14151b] border border-white/10 flex items-center justify-center mx-auto text-neutral-400">
                <Users className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">No Travellers Found</h3>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                {searchQuery ? `No travellers matched "${searchQuery}".` : 'Search for friends or explore new creators by name or handle.'}
              </p>
            </div>
          )
        )}

        {/* TAB 3: PLACES & DESTINATIONS SEARCH */}
        {activeTab === 'places' && isSearching && (
          filteredExploreTiles.length > 0 ? (
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
          ) : (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="w-14 h-14 rounded-2xl bg-[#14151b] border border-white/10 flex items-center justify-center mx-auto text-neutral-400">
                <MapPin className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">No Destinations Found</h3>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                Try searching for a different city, country, or landmark.
              </p>
            </div>
          )
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
                  {selectedTile.creator.avatarUrl ? (
                    <img
                      src={selectedTile.creator.avatarUrl}
                      alt={selectedTile.creator.username}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-white/30"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-600 to-indigo-700 flex items-center justify-center text-white font-bold text-xs ring-1 ring-white/30 select-none">
                      {selectedTile.creator.username.replace(/^@/, '').charAt(0).toUpperCase() || 'T'}
                    </div>
                  )}
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
