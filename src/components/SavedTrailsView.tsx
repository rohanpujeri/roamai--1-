import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Bookmark, 
  Play, 
  MapPin, 
  Heart, 
  Eye, 
  Share2, 
  Trash2, 
  Compass, 
  Volume2, 
  VolumeX, 
  X,
  Sparkles
} from 'lucide-react';
import { ThemeConfig } from '../types';
import { TrailReel } from '../services/sharedTrailsService';
import { getSavedTrails, unsaveTrail } from '../services/savedTrailsService';
import { sanitizeAvatarUrl } from '../services/supabaseClient';

interface SavedTrailsViewProps {
  currentTheme: ThemeConfig;
  onBack: () => void;
  onOpenTrailsTab: () => void;
  onStartPlanning?: (destination?: string) => void;
}

export const SavedTrailsView: React.FC<SavedTrailsViewProps> = ({
  currentTheme,
  onBack,
  onOpenTrailsTab,
  onStartPlanning
}) => {
  const [savedTrails, setSavedTrails] = useState<TrailReel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activePlaybackTrail, setActivePlaybackTrail] = useState<TrailReel | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Load saved trails on mount and listen to changes
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const trails = await getSavedTrails();
        if (isMounted) setSavedTrails(trails);
      } catch (err) {
        console.warn('Failed to load saved trails:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();

    const handleSavedTrailsChanged = () => {
      load();
    };

    window.addEventListener('roamai_saved_trails_changed', handleSavedTrailsChanged);
    window.addEventListener('storage', handleSavedTrailsChanged);
    return () => {
      isMounted = false;
      window.removeEventListener('roamai_saved_trails_changed', handleSavedTrailsChanged);
      window.removeEventListener('storage', handleSavedTrailsChanged);
    };
  }, []);

  const handleUnsave = (e: React.MouseEvent, trailId: string) => {
    e.stopPropagation();
    unsaveTrail(trailId);
    setSavedTrails((prev) => prev.filter((t) => t.id !== trailId));
  };

  const handleShare = (e: React.MouseEvent, trail: TrailReel) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareToast(`Copied "${trail.title || 'Trail'}" to clipboard!`);
      setTimeout(() => setShareToast(null), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white pt-4 sm:pt-6 pb-24 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Toast */}
      {shareToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-500/90 text-white text-xs sm:text-sm font-bold shadow-2xl backdrop-blur-md animate-bounce">
          {shareToast}
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer border border-white/10 shrink-0"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Saved Trails
              </h1>
              <span 
                className="px-2.5 py-0.5 rounded-full text-xs font-black text-slate-950 shadow-sm"
                style={{ backgroundColor: currentTheme.accentColor || '#34d399' }}
              >
                {savedTrails.length}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Your bookmarked travel trails & creator spots
            </p>
          </div>
        </div>

        {/* Explore More CTA */}
        <button
          onClick={onOpenTrailsTab}
          className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer text-white"
          style={{ backgroundColor: currentTheme.primaryColor }}
        >
          <Compass className="w-4 h-4" />
          <span className="hidden xs:inline">Explore</span> Trails
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-white/20 border-t-emerald-400 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-400 font-medium">Loading your saved trails...</p>
        </div>
      ) : savedTrails.length === 0 ? (
        <div className="py-20 px-4 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-zinc-900/90 border border-white/10 flex items-center justify-center mx-auto text-amber-400 shadow-2xl">
            <Bookmark className="w-8 h-8 sm:w-10 sm:h-10 fill-amber-400/20" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">No Saved Trails Yet</h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            When you browse travel trails in Trails, tap the bookmark button to save your favorite trails here for trip inspiration.
          </p>
          <button
            onClick={onOpenTrailsTab}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-xs sm:text-sm font-bold shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
            style={{ backgroundColor: currentTheme.primaryColor }}
          >
            <Compass className="w-4 h-4" />
            Browse Trails Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {savedTrails.map((trail) => {
            const hasVideo = !!trail.videoUrl;
            const previewImage = trail.posterUrl || (!hasVideo ? trail.videoUrl : '');

            return (
              <div
                key={trail.id}
                onClick={() => setActivePlaybackTrail(trail)}
                className="group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-900/90 border border-white/10 hover:border-white/25 shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col aspect-[9/14]"
              >
                {/* Visual Media Background */}
                <div className="absolute inset-0 bg-zinc-950 overflow-hidden">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={trail.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : trail.videoUrl ? (
                    <video
                      src={trail.videoUrl}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      muted
                      playsInline
                      loop
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center text-zinc-600">
                      <Play className="w-12 h-12" />
                    </div>
                  )}
                  {/* Subtle Dark Vignette Gradients */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60 pointer-events-none" />
                </div>

                {/* Top Overlay Row: Creator + Unsave Button */}
                <div className="relative z-10 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15">
                    <img
                      src={sanitizeAvatarUrl(trail.creator?.avatarUrl) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={trail.creator?.name || 'Creator'}
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-white/50 shrink-0"
                    />
                    <span className="text-[11px] font-bold text-white truncate max-w-[100px]">
                      {trail.creator?.username || trail.creator?.name || 'traveler'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleUnsave(e, trail.id)}
                    className="w-8 h-8 rounded-full bg-black/60 hover:bg-red-500/80 backdrop-blur-md border border-white/20 text-amber-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
                    title="Remove from Saved Trails"
                    aria-label="Unsave trail"
                  >
                    <Bookmark className="w-4 h-4 fill-amber-400 group-hover/btn:fill-white" />
                  </button>
                </div>

                {/* Center Play Icon on Hover */}
                <div className="relative z-10 flex-1 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 shadow-2xl">
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Bottom Metadata */}
                <div className="relative z-10 p-3 sm:p-4 space-y-2">
                  {trail.destination && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-bold text-white">
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[150px]">{trail.destination}</span>
                    </div>
                  )}

                  <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-md">
                    {trail.title || trail.caption || 'Travel Reel'}
                  </h3>

                  {/* Stats & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] text-zinc-300">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                        {trail.likesCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-zinc-400" />
                        {trail.viewsCount || 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleShare(e, trail)}
                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                        title="Share Trail"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>

                      {trail.destination && onStartPlanning && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartPlanning(trail.destination);
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold text-white transition-all hover:scale-105 cursor-pointer shadow-sm"
                          style={{ backgroundColor: currentTheme.primaryColor }}
                        >
                          Plan Trip
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Video Playback Modal */}
      {activePlaybackTrail && (
        <div 
          className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4"
          onClick={() => setActivePlaybackTrail(null)}
        >
          <div 
            className="relative w-full max-w-sm sm:max-w-md aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/20 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Video Player */}
            {activePlaybackTrail.videoUrl ? (
              <video
                src={activePlaybackTrail.videoUrl}
                poster={activePlaybackTrail.posterUrl}
                className="w-full h-full object-cover"
                autoPlay
                loop
                playsInline
                muted={isMuted}
              />
            ) : (
              <img
                src={activePlaybackTrail.posterUrl}
                alt={activePlaybackTrail.title}
                className="w-full h-full object-cover"
              />
            )}

            {/* Top Modal Controls */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105"
                aria-label="Toggle mute"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setActivePlaybackTrail(null)}
                className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105"
                aria-label="Close player"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom Modal Information */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20 space-y-2">
              <div className="flex items-center gap-2">
                <img
                  src={sanitizeAvatarUrl(activePlaybackTrail.creator?.avatarUrl) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={activePlaybackTrail.creator?.name || 'Creator'}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-white/50 shrink-0"
                />
                <div>
                  <h4 className="text-xs font-bold text-white">{activePlaybackTrail.creator?.name || 'Traveler'}</h4>
                  <p className="text-[10px] text-zinc-400">{activePlaybackTrail.creator?.username || '@traveler'}</p>
                </div>
              </div>

              <p className="text-xs text-white leading-relaxed line-clamp-3">
                {activePlaybackTrail.caption || activePlaybackTrail.title}
              </p>

              {activePlaybackTrail.destination && onStartPlanning && (
                <button
                  type="button"
                  onClick={() => {
                    const dest = activePlaybackTrail.destination;
                    setActivePlaybackTrail(null);
                    onStartPlanning(dest);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                >
                  <Sparkles className="w-4 h-4" />
                  Plan a Trip to {activePlaybackTrail.destination}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
