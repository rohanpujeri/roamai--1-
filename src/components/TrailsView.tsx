import React, { useState, useRef, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Plus, 
  MapPin, 
  Music, 
  Upload, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Compass, 
  Send,
  Check,
  Film
} from 'lucide-react';
import { ThemeConfig } from '../types';
import { Session } from '@supabase/supabase-js';
import { getCachedUserProfile, sanitizeAvatarUrl } from '../services/supabaseClient';
import {
  saveTrailMedia,
  resolveTrailMediaUrl,
  generateVideoPoster
} from '../services/trailMediaStorage';
import {
  getLocalTrails,
  fetchGlobalTrails,
  publishGlobalTrail,
  likeGlobalTrail,
  commentOnGlobalTrail
} from '../services/sharedTrailsService';

export interface TrailReel {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  mediaType?: 'video' | 'image';
  title?: string;
  creator: {
    name: string;
    username: string;
    avatarUrl: string;
    isFollowed?: boolean;
  };
  caption: string;
  destination: string;
  tags: string[];
  audioTitle: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  comments?: Array<{
    id: string;
    user: string;
    avatar: string;
    text: string;
    time: string;
  }>;
}

interface TrailsViewProps {
  currentTheme: ThemeConfig;
  session: Session | null;
  isActive?: boolean;
  onStartPlanning: (destination?: string) => void;
  onBack: () => void;
}

export const TrailsView: React.FC<TrailsViewProps> = ({
  currentTheme,
  session,
  isActive = true,
  onStartPlanning,
  onBack
}) => {
  // Load real user trails exclusively from local and server registry
  const [trails, setTrails] = useState<TrailReel[]>(() => getLocalTrails());

  // Periodically sync global trails from server API & Supabase so any profile can see everyone's trails
  useEffect(() => {
    let isMounted = true;
    const syncTrails = async () => {
      try {
        const globalList = await fetchGlobalTrails();
        if (isMounted && Array.isArray(globalList)) {
          setTrails((prev) => {
            const prevIds = prev.map((p) => p.id).join(',');
            const nextIds = globalList.map((g) => g.id).join(',');
            if (prevIds !== nextIds || prev.length !== globalList.length) {
              return globalList;
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Could not sync global trails:', err);
      }
    };

    syncTrails();
    const interval = setInterval(syncTrails, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [showComments, setShowComments] = useState<boolean>(false);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  // Active media resolution states
  const [activeMediaUrl, setActiveMediaUrl] = useState<string>('');
  const [activeMediaError, setActiveMediaError] = useState<boolean>(false);
  const [isMediaLoading, setIsMediaLoading] = useState<boolean>(false);

  // Upload modal form state
  const [uploadVideoFile, setUploadVideoFile] = useState<File | null>(null);
  const [uploadVideoPreview, setUploadVideoPreview] = useState<string>('');
  const [uploadPosterPreview, setUploadPosterPreview] = useState<string>('');
  const [uploadCaption, setUploadCaption] = useState<string>('');
  const [uploadDestination, setUploadDestination] = useState<string>('');
  const [uploadTags, setUploadTags] = useState<string>('');
  const [uploadAudio, setUploadAudio] = useState<string>('Original Travel Sound');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragDistanceRef = useRef<number>(0);

  const activeReel = trails[currentIndex] || trails[0];

  // Resolve active media URL whenever active reel changes
  useEffect(() => {
    if (!activeReel) {
      setActiveMediaUrl('');
      setActiveMediaError(false);
      return;
    }
    let isMounted = true;
    setActiveMediaError(false);
    setIsMediaLoading(true);

    resolveTrailMediaUrl(activeReel.id, activeReel.videoUrl).then((resolved) => {
      if (isMounted) {
        setActiveMediaUrl(resolved);
        setIsMediaLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeReel?.id, activeReel?.videoUrl]);

  // Auto-play when active reel changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isPlaying) {
        videoRef.current.play().catch(() => {
          // browser autoplay policy may require mute
          setIsMuted(true);
        });
      }
    }
  }, [currentIndex]);

  // Pause video if user slides away from Trails
  useEffect(() => {
    if (!isActive) {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {
          setIsMuted(true);
        });
        setIsPlaying(true);
      }
    }
  }, [isActive]);

  const handleNextReel = () => {
    if (currentIndex < trails.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0); // loop back
    }
  };

  const handlePrevReel = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(trails.length - 1);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handlePlaylineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current || !videoRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(1, clickX / rect.width));
    videoRef.current.currentTime = newProgress * videoRef.current.duration;
    setProgress(newProgress * 100);
  };

  // Mouse wheel scroll to change trails (with throttle)
  const lastWheelTimeRef = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    if (showComments || showUploadModal) return;
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 450) return;

    if (e.deltaY > 40) {
      lastWheelTimeRef.current = now;
      handleNextReel();
    } else if (e.deltaY < -40) {
      lastWheelTimeRef.current = now;
      handlePrevReel();
    }
  };

  // Keyboard navigation for full screen reels (ArrowDown/Up, J/K, Space, M)
  useEffect(() => {
    if (!isActive || showComments || showUploadModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handleNextReel();
      } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handlePrevReel();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.muted = !isMuted;
          setIsMuted(!isMuted);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, showComments, showUploadModal, currentIndex, trails.length, isMuted, isPlaying]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeReel) return;
    const isLiked = !activeReel.isLiked;
    likeGlobalTrail(activeReel.id, isLiked);
    setTrails((prev) =>
      prev.map((t, idx) => {
        if (idx === currentIndex) {
          return {
            ...t,
            isLiked,
            likesCount: isLiked ? t.likesCount + 1 : Math.max(0, t.likesCount - 1)
          };
        }
        return t;
      })
    );
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTrails((prev) =>
      prev.map((t, idx) => {
        if (idx === currentIndex) {
          return { ...t, isSaved: !t.isSaved };
        }
        return t;
      })
    );
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareToast('Trail link copied to clipboard!');
      setTimeout(() => setShareToast(null), 2500);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activeReel) return;

    const cached = session?.user ? getCachedUserProfile(session.user.id) : null;
    const userDisplayName = cached?.name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || 'You';
    const rawAvatar = cached?.avatarUrl || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.avatarUrl || '';
    const userAvatar = sanitizeAvatarUrl(rawAvatar);

    const newComment = {
      id: `comm-${Date.now()}`,
      user: userDisplayName,
      avatar: userAvatar,
      text: newCommentText.trim(),
      time: 'Just now'
    };

    commentOnGlobalTrail(activeReel.id, newComment);

    setTrails((prev) =>
      prev.map((t, idx) => {
        if (idx === currentIndex) {
          return {
            ...t,
            commentsCount: t.commentsCount + 1,
            comments: [newComment, ...(t.comments || [])]
          };
        }
        return t;
      })
    );

    setNewCommentText('');
  };

  // Video / Photo File Selection Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadVideoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setUploadVideoPreview(previewUrl);

      // Generate instant video thumbnail
      try {
        const poster = await generateVideoPoster(file);
        setUploadPosterPreview(poster);
      } catch (err) {
        console.warn('Could not generate poster:', err);
      }
    }
  };

  // Submit User Trail
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadVideoFile && !uploadVideoPreview) return;

    setIsSubmitting(true);
    const trailId = `user-trail-${Date.now()}`;

    // 1. Save binary file to IndexedDB for persistent reloadable playback
    if (uploadVideoFile) {
      await saveTrailMedia(trailId, uploadVideoFile);
    }

    // 2. Poster frame
    let poster = uploadPosterPreview;
    if (!poster && uploadVideoFile) {
      poster = await generateVideoPoster(uploadVideoFile);
    }

    const isImg = uploadVideoFile?.type.startsWith('image/');
    const cached = session?.user ? getCachedUserProfile(session.user.id) : null;
    const creatorName = cached?.name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || 'You';
    const username = cached?.username || (session?.user?.email ? `@${session.user.email.split('@')[0]}` : '@traveler');
    const rawAvatar = cached?.avatarUrl || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.avatarUrl || '';
    const avatarUrl = sanitizeAvatarUrl(rawAvatar);

    const newTrail: TrailReel = {
      id: trailId,
      videoUrl: uploadVideoPreview,
      posterUrl: poster || undefined,
      mediaType: isImg ? 'image' : 'video',
      title: uploadCaption || uploadDestination || 'Travel Reel',
      creator: {
        name: creatorName,
        username: username,
        avatarUrl: avatarUrl,
        isFollowed: true
      },
      caption: uploadCaption || 'Exploring this breathtaking destination! 🌍✈️',
      destination: uploadDestination || 'Travel Destination',
      tags: uploadTags.split(' ').filter(Boolean),
      audioTitle: uploadAudio || 'Original Sound',
      likesCount: 1,
      commentsCount: 0,
      isLiked: true,
      comments: []
    };

    // 3. Publish to global server and Supabase so anyone / other profiles can view it immediately
    try {
      await publishGlobalTrail(newTrail, uploadVideoFile || undefined);
    } catch (err) {
      console.warn('Failed to publish trail globally:', err);
    }

    setTrails((prev) => [newTrail, ...prev.filter((p) => p.id !== newTrail.id)]);
    setCurrentIndex(0);
    setIsSubmitting(false);
    setShowUploadModal(false);
    setUploadVideoFile(null);
    setUploadVideoPreview('');
    setUploadPosterPreview('');
    setUploadCaption('');
    setUploadDestination('');
  };

  return (
    <div 
      onWheel={handleWheel}
      className="relative w-full h-full min-h-screen bg-black overflow-hidden flex items-center justify-center select-none"
    >
      {/* Background Ambience (Blurred Video Frame) */}
      <div 
        className="absolute inset-0 bg-cover bg-center blur-3xl opacity-25 scale-110 pointer-events-none transition-all duration-700"
        style={{ backgroundImage: activeReel?.posterUrl ? `url(${activeReel.posterUrl})` : 'none' }}
      />

      {/* Top Floating Action Bar */}
      <div className="absolute top-4 sm:top-6 left-4 sm:left-8 right-4 sm:right-8 z-30 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <span className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white font-black text-xs sm:text-sm tracking-wider flex items-center gap-2 shadow-xl">
            <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '8s' }} />
            TRAILS
          </span>
          {trails.length > 0 && (
            <span className="text-xs font-bold text-neutral-300 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
              {currentIndex + 1} / {trails.length}
            </span>
          )}
        </div>

        {/* Upload Trail '+' Button (Upload Video or Photo) */}
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-linear-to-tr from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-white flex items-center justify-center shadow-xl shadow-emerald-950/60 cursor-pointer transition-all hover:scale-110 active:scale-95 border border-white/20"
          title="Upload trail (video or photo)"
          aria-label="Upload trail (video or photo)"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Share Toast */}
      {shareToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Main Reel Full Screen Container */}
      {!activeReel ? (
        <div className="relative w-full h-full overflow-hidden bg-black flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
            <Film className="w-12 h-12" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-2xl font-bold text-white tracking-tight">No Trails Yet</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Be the first explorer to upload a travel trail and inspire the community with your adventures.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-8 py-3.5 rounded-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-base flex items-center gap-2.5 shadow-xl shadow-emerald-950/60 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>Upload First Trail</span>
          </button>
        </div>
      ) : (
        <div 
          onTouchStart={(e) => {
            touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            dragDistanceRef.current = 0;
          }}
          onTouchMove={(e) => {
            if (touchStartRef.current) {
              const dx = e.touches[0].clientX - touchStartRef.current.x;
              const dy = e.touches[0].clientY - touchStartRef.current.y;
              dragDistanceRef.current = Math.hypot(dx, dy);
            }
          }}
          onTouchEnd={(e) => {
            if (touchStartRef.current) {
              const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
              if (dy < -60) {
                // Swiped up -> next trail
                handleNextReel();
              } else if (dy > 60) {
                // Swiped down -> previous trail
                handlePrevReel();
              }
              touchStartRef.current = null;
            }
          }}
          onClick={() => {
            if (dragDistanceRef.current > 15) {
              dragDistanceRef.current = 0;
              return;
            }
            togglePlay();
          }}
          className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center cursor-pointer group"
        >
          {/* Video or Image Media Player */}
          {activeReel.mediaType === 'image' || activeMediaUrl.startsWith('data:image') ? (
            <img
              src={activeMediaUrl || activeReel.posterUrl || activeReel.videoUrl}
              alt={activeReel.caption}
              className="w-full h-full object-cover select-none"
            />
          ) : (
            <video
              ref={videoRef}
              key={activeMediaUrl}
              src={activeMediaUrl}
              poster={activeReel.posterUrl}
              playsInline
              webkit-playsinline="true"
              loop
              autoPlay
              preload="auto"
              muted={isMuted}
              className="w-full h-full object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => {
                setActiveMediaError(true);
              }}
              onTimeUpdate={() => {
                if (videoRef.current && videoRef.current.duration) {
                  setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
                }
              }}
            />
          )}

          {/* Recovery overlay if old session clip expired */}
          {activeMediaError && (
            <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-6 text-center space-y-4 z-20">
              {activeReel.posterUrl && (
                <img
                  src={activeReel.posterUrl}
                  alt="Poster frame"
                  className="absolute inset-0 w-full h-full object-cover opacity-20 blur-xs pointer-events-none"
                />
              )}
              <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400">
                <Film className="w-7 h-7" />
              </div>
              <div className="relative z-10 space-y-1">
                <h4 className="text-sm font-bold text-white">Clip Stream Unavailable</h4>
                <p className="text-xs text-neutral-300 max-w-xs leading-relaxed">
                  This video was saved in temporary session memory and expired on reload.
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUploadModal(true);
                }}
                className="relative z-10 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-lg cursor-pointer transition-all"
              >
                Upload Clip to Replace
              </button>
            </div>
          )}

          {/* Play/Pause Center Overlay Animation */}
          {!isPlaying && !activeMediaError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none transition-all">
              <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl scale-110">
                <Play className="w-8 h-8 fill-white ml-1" />
              </div>
            </div>
          )}

        {/* Gradient Overlays for readable text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />

        {/* Right Action Sidebar (Instagram Reels style - Lifted up well above playline) */}
        <div className="absolute right-4 sm:right-8 bottom-[145px] sm:bottom-[155px] z-20 flex flex-col items-center gap-3.5 sm:gap-4 pointer-events-auto">
          {/* Like Button */}
          <button
            type="button"
            onClick={handleLike}
            className="flex flex-col items-center gap-1 group/btn cursor-pointer"
          >
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 shadow-xl ${
              activeReel.isLiked ? 'bg-red-500/20 text-red-500 scale-110' : 'bg-black/50 hover:bg-black/70 text-white'
            }`}>
              <Heart className={`w-6 h-6 transition-transform group-active/btn:scale-75 ${
                activeReel.isLiked ? 'fill-red-500 stroke-red-500' : 'stroke-white'
              }`} />
            </div>
            <span className="text-xs font-bold text-white drop-shadow-md">
              {activeReel.likesCount}
            </span>
          </button>

          {/* Comments Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(true);
            }}
            className="flex flex-col items-center gap-1 group/btn cursor-pointer"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition-all shadow-xl">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-white drop-shadow-md">
              {activeReel.commentsCount}
            </span>
          </button>

          {/* Save / Bookmark Button */}
          <button
            type="button"
            onClick={handleSave}
            className="flex flex-col items-center gap-1 group/btn cursor-pointer"
          >
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-xl ${
              activeReel.isSaved ? 'bg-amber-500/20 text-amber-400' : 'bg-black/50 hover:bg-black/70 text-white'
            }`}>
              <Bookmark className={`w-6 h-6 ${activeReel.isSaved ? 'fill-amber-400 stroke-amber-400' : 'stroke-white'}`} />
            </div>
            <span className="text-xs font-bold text-white drop-shadow-md">
              Save
            </span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="flex flex-col items-center gap-1 group/btn cursor-pointer"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition-all shadow-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white drop-shadow-md">
              Share
            </span>
          </button>

          {/* Sound Mute/Unmute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer shadow-xl"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-neutral-300" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          {/* Audio Album Thumbnail */}
          <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/30 shadow-md bg-neutral-900 mt-1 shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center">
            {activeReel.creator.avatarUrl ? (
              <img 
                src={activeReel.creator.avatarUrl} 
                alt="Sound cover"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-xs">🎵</span>
            )}
          </div>
        </div>

        {/* Bottom Left Info & Caption Overlay (Lifted up well above playline & bottom nav) */}
        <div className="absolute left-4 sm:left-8 right-20 sm:right-28 bottom-[145px] sm:bottom-[155px] z-20 space-y-2.5 pointer-events-none max-w-xl">
          {/* Creator Row: Photo beside Profile Username (Only Username, No Full Name) + Follow Button */}
          <div className="flex items-center gap-2.5 pointer-events-auto">
            {/* Clean Circular Photo (Instagram Reels style - no ring) */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shadow-md shrink-0 bg-neutral-900 border border-white/15 flex items-center justify-center">
              {activeReel.creator.avatarUrl ? (
                <img
                  src={activeReel.creator.avatarUrl}
                  alt={activeReel.creator.username}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-white font-bold text-xs select-none">
                  {activeReel.creator.username.replace(/^@/, '').charAt(0).toUpperCase() || 'T'}
                </div>
              )}
            </div>

            {/* Username only (no full name) */}
            <span className="text-sm font-bold text-white tracking-wide drop-shadow-md">
              {activeReel.creator.username.replace(/^@/, '')}
            </span>

            {/* Verified Badge */}
            <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-xs">
              ✓
            </span>

            {/* Follow / Following Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTrails((prev) =>
                  prev.map((t, idx) => {
                    if (idx === currentIndex) {
                      return {
                        ...t,
                        creator: { ...t.creator, isFollowed: !t.creator.isFollowed }
                      };
                    }
                    return t;
                  })
                );
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                activeReel.creator.isFollowed
                  ? 'bg-white/20 border-white/30 text-white'
                  : 'bg-transparent hover:bg-white/15 border-white/60 text-white'
              }`}
            >
              {activeReel.creator.isFollowed ? 'Following' : 'Follow'}
            </button>
          </div>

          {/* Caption */}
          <p className="text-xs sm:text-sm text-neutral-100 line-clamp-2 leading-relaxed drop-shadow-sm font-medium">
            {activeReel.caption}
          </p>

          {/* Destination Badge & Audio Soundtrack */}
          <div className="flex items-center gap-2 flex-wrap pointer-events-auto pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{activeReel.destination}</span>
            </span>

            {/* Audio Soundtrack Banner */}
            <div className="inline-flex items-center gap-1.5 text-neutral-300 text-xs font-medium px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10">
              <Music className="w-3.5 h-3.5 text-white animate-pulse" />
              <span className="truncate max-w-[180px]">{activeReel.audioTitle}</span>
            </div>
          </div>
        </div>

        {/* Video Playline directly above Bottom Navigation Bar (matches Instagram Reels design) */}
        <div 
          onClick={handlePlaylineClick}
          className="absolute bottom-[86px] sm:bottom-[94px] left-4 right-4 sm:left-8 sm:right-8 z-30 h-4 flex items-center cursor-pointer pointer-events-auto group/playline"
          title="Video playback progress"
        >
          <div className="w-full h-[2.5px] sm:h-[3px] bg-white/35 group-hover/playline:h-[4px] rounded-full overflow-hidden transition-all duration-150 backdrop-blur-xs shadow-xs">
            <div
              className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      )}

      {/* Up / Down Navigation Chevrons for Desktop / Tablet */}
      <div className="hidden sm:flex flex-col gap-3 absolute right-6 top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={handlePrevReel}
          className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all hover:scale-110 shadow-xl cursor-pointer active:scale-95"
          title="Previous Trail (Up Arrow)"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={handleNextReel}
          className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all hover:scale-110 shadow-xl cursor-pointer active:scale-95"
          title="Next Trail (Down Arrow)"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>

      {/* Comments Drawer / Sheet */}
      {showComments && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl h-[70vh] max-h-[600px] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Drawer Header */}
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Comments ({activeReel?.comments?.length || 0})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowComments(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 divide-y divide-neutral-800/40">
              {activeReel?.comments && activeReel.comments.length > 0 ? (
                activeReel.comments.map((comm) => (
                  <div key={comm.id} className="pt-3 first:pt-0 flex items-start gap-3">
                    {comm.avatar ? (
                      <img 
                        src={comm.avatar} 
                        alt={comm.user} 
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-white/15 shrink-0"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-white font-bold text-xs shrink-0 ring-1 ring-white/15 select-none">
                        {comm.user?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">{comm.user}</span>
                        <span className="text-[10px] text-neutral-500">{comm.time}</span>
                      </div>
                      <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">{comm.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                  <MessageCircle className="w-8 h-8 mb-2 stroke-1" />
                  <p className="text-xs">No comments yet. Be the first to share your thoughts!</p>
                </div>
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleAddComment} className="p-3 border-t border-neutral-800 flex items-center gap-2 bg-neutral-950">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Add a travel comment..."
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white flex items-center justify-center cursor-pointer transition-transform active:scale-90"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Trail Modal */}
      {showUploadModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Upload Travel Trail</h3>
                  <p className="text-[11px] text-neutral-400">Share your travel trail with other travellers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Video File Picker */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                  Select Travel Video or Photo (MP4 / MOV / WebM / JPG / PNG)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {uploadVideoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-500/50 bg-black h-48 flex items-center justify-center">
                    {uploadVideoFile?.type.startsWith('image/') ? (
                      <img
                        src={uploadVideoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={uploadVideoPreview}
                        poster={uploadPosterPreview}
                        controls
                        playsInline
                        webkit-playsinline="true"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black text-white text-xs font-bold backdrop-blur-md cursor-pointer"
                    >
                      Change Media
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-700 hover:border-emerald-500/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-neutral-950/60 hover:bg-neutral-950"
                  >
                    <Upload className="w-8 h-8 text-neutral-500 mb-2" />
                    <p className="text-xs font-bold text-neutral-200">Click to upload your travel clip or photo</p>
                    <p className="text-[11px] text-neutral-500 mt-1">Supports travel videos and photos</p>
                  </div>
                )}
              </div>

              {/* Destination Tag */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Destination Tag *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  <input
                    type="text"
                    required
                    value={uploadDestination}
                    onChange={(e) => setUploadDestination(e.target.value)}
                    placeholder="e.g. Manali, Himachal Pradesh or Bali, Indonesia"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Caption & Story
                </label>
                <textarea
                  rows={2}
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Describe your experience or secret spots..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Hashtags
                </label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="e.g. #beach #trek #nature (optional)"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Audio Soundtrack Title */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Audio / Soundtrack Name
                </label>
                <div className="relative">
                  <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={uploadAudio}
                    onChange={(e) => setUploadAudio(e.target.value)}
                    placeholder="e.g. Mountain Chill • Original Sound"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadVideoPreview || isSubmitting}
                  className="px-5 py-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Publishing...' : 'Publish Trail'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
