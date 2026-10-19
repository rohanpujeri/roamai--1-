import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bookmark, 
  Share2, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Plus, 
  MapPin, 
  Upload, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Check,
  Film,
  LogIn,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Hash,
  Camera,
  Sparkles,
  Compass,
  Info
} from 'lucide-react';
import { ThemeConfig, SavedPlace } from '../types';
import { resolvePlaceImage } from '../utils/placeImages';
import type { SelectedTrailLocation } from './TrailLocationPickerModal';

const TrailLocationPickerModal = React.lazy(() => import('./TrailLocationPickerModal'));
import { Session } from '@supabase/supabase-js';
import { getCachedUserProfile, sanitizeAvatarUrl, getCanonicalUsername } from '../services/supabaseClient';
import {
  saveTrailMedia,
  resolveTrailMediaUrl
} from '../services/trailMediaStorage';
import {
  getLocalTrails,
  fetchGlobalTrails,
  fetchMoreGlobalTrails,
  publishGlobalTrail,
  TrailReel,
  sanitizeTrail,
  DEFAULT_TRAIL_CREATOR
} from '../services/sharedTrailsService';
import { isTrailSaved, toggleSaveTrail } from '../services/savedTrailsService';
import { isFakeMockUser, cleanBio } from '../utils/userUtils';
import { getSavedPlaces, savePlaceToStorage, removeSavedPlace } from '../services/placesService';

export type { TrailReel };

interface TrailsViewProps {
  currentTheme: ThemeConfig;
  session: Session | null;
  isActive?: boolean;
  onStartPlanning: (destination?: string) => void;
  onBack: () => void;
  onRequireAuth?: () => void;
  onOpenUploadPage?: (file?: File) => void;
  onOpenUserProfile?: (traveller: {
    id?: string;
    username: string;
    name?: string;
    avatarUrl?: string;
    location?: string;
  }) => void;
  onOpenOwnProfile?: () => void;
  customTrails?: TrailReel[];
  initialTrailId?: string;
  initialIndex?: number;
  feedTitle?: string;
  showBackButton?: boolean;
  onDeleteTrail?: (trailId: string) => void;
}

export const TrailsView: React.FC<TrailsViewProps> = ({
  currentTheme,
  session,
  isActive = true,
  onStartPlanning,
  onBack,
  onRequireAuth,
  onOpenUploadPage,
  onOpenUserProfile,
  onOpenOwnProfile,
  customTrails,
  initialTrailId,
  initialIndex,
  feedTitle,
  showBackButton = false,
  onDeleteTrail
}) => {
  const cachedUser = session?.user ? getCachedUserProfile(session.user.id) : null;
  const currentUsername = useMemo(() => {
    return getCanonicalUsername(session?.user, cachedUser).toLowerCase().replace(/^@/, '');
  }, [cachedUser, session?.user]);

  const currentUserAvatar = useMemo(() => {
    const raw = cachedUser?.avatarUrl || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.avatarUrl || '';
    return sanitizeAvatarUrl(raw);
  }, [cachedUser, session?.user]);

  // Load trails: either customTrails (user-specific) or all global trails
  const [trails, setTrails] = useState<TrailReel[]>(() => {
    if (customTrails && customTrails.length > 0) {
      return customTrails.map((t) => sanitizeTrail({
        ...t,
        isSaved: isTrailSaved(t.id)
      }));
    }
    return getLocalTrails().map((t) => sanitizeTrail({ 
      ...t, 
      isSaved: isTrailSaved(t.id)
    }));
  });

  // On mount: purge any legacy video entries from localStorage so only photos remain
  useEffect(() => {
    try {
      const keys = ['roamai_user_trails', 'tripwise_user_trails', 'roamai_global_trails', 'roamai_trails_cache'];
      keys.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((t: any) => {
              if (!t) return false;
              if (t.mediaType === 'video') return false;
              const u = (t.videoUrl || t.mediaUrl || '').toLowerCase();
              if (u.includes('.mp4') || u.includes('.mov') || u.includes('.webm')) return false;
              return true;
            });
            if (cleaned.length !== parsed.length) {
              localStorage.setItem(key, JSON.stringify(cleaned));
            }
          }
        }
      });
    } catch {}
  }, []);

  // Sync custom trails if prop updates
  useEffect(() => {
    if (customTrails) {
      setTrails(
        customTrails.map((t) =>
          sanitizeTrail({
            ...t,
            isSaved: isTrailSaved(t.id)
          })
        )
      );
    }
  }, [customTrails]);

  // Periodically sync global trails from server API & Supabase ONLY if active and NOT in custom user feed
  useEffect(() => {
    if (customTrails || !isActive) return; // Only sync when view is active and not on custom feed
    let isMounted = true;
    const syncTrails = async () => {
      try {
        const globalList = await fetchGlobalTrails();
        if (isMounted && Array.isArray(globalList)) {
          setTrails((prev) => {
            const mapped = globalList
              .filter((g) => g && !g.id?.startsWith('sample-trail-') && !isFakeMockUser(g.creator?.username))
              .map((g) => sanitizeTrail({ 
                ...g, 
                isSaved: isTrailSaved(g.id)
              }));
            const prevIds = prev.map((p) => p.id).join(',');
            const nextIds = mapped.map((g) => g.id).join(',');
            if (prevIds !== nextIds || prev.length !== mapped.length) {
              return mapped;
            }
            // Check if any save status changed before creating a new state reference
            const anyDiff = prev.some((p) => {
              return p.isSaved !== isTrailSaved(p.id);
            });
            if (anyDiff) {
              return prev.map((p) => sanitizeTrail({ 
                ...p, 
                isSaved: isTrailSaved(p.id)
              }));
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Could not sync global trails:', err);
      }
    };

    syncTrails();
    const interval = setInterval(syncTrails, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [customTrails, isActive]);

  // Listen for newly published trails from the dedicated UploadTrailView page
  useEffect(() => {
    const handleUploaded = (e: any) => {
      const newTrail = e.detail;
      if (newTrail) {
        setTrails((prev) => [sanitizeTrail(newTrail), ...prev.filter((p) => p.id !== newTrail.id)]);
        setCurrentIndex(0);
      }
    };
    const handleDeleted = (e: any) => {
      const deletedId = e.detail?.trailId;
      if (deletedId) {
        setTrails((prev) => prev.filter((p) => p.id !== deletedId));
      }
    };
    window.addEventListener('roamai_trail_uploaded', handleUploaded);
    window.addEventListener('roamai_trail_deleted', handleDeleted);
    return () => {
      window.removeEventListener('roamai_trail_uploaded', handleUploaded);
      window.removeEventListener('roamai_trail_deleted', handleDeleted);
    };
  }, []);

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (initialTrailId && customTrails && customTrails.length > 0) {
      const idx = customTrails.findIndex((t) => t.id === initialTrailId);
      if (idx !== -1) return idx;
    }
    if (typeof initialIndex === 'number' && initialIndex >= 0) {
      return initialIndex;
    }
    return 0;
  });

  // Jump to initial trail ID if provided
  useEffect(() => {
    if (initialTrailId && trails.length > 0) {
      const idx = trails.findIndex((t) => t.id === initialTrailId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
  }, [initialTrailId, trails.length]);


  // Listen for non-blocking background creator profile hydration updates
  useEffect(() => {
    const handleHydrated = () => {
      const local = getLocalTrails();
      if (local && local.length > 0 && !customTrails) {
        setTrails((prev) => {
          const map = new Map(local.map((l) => [l.id, l]));
          let changed = false;
          const updated = prev.map((p) => {
            const fresh = map.get(p.id);
            if (fresh && fresh.creator?.avatarUrl && fresh.creator.avatarUrl !== p.creator?.avatarUrl) {
              changed = true;
              return {
                ...p,
                creator: {
                  ...p.creator,
                  avatarUrl: fresh.creator.avatarUrl,
                  name: fresh.creator.name || p.creator?.name
                }
              };
            }
            return p;
          });
          return changed ? updated : prev;
        });
      }
    };
    window.addEventListener('roamai_trail_creators_hydrated', handleHydrated);
    return () => window.removeEventListener('roamai_trail_creators_hydrated', handleHydrated);
  }, [customTrails]);

  // Auto-sync user's uploaded trails with their latest canonical profile username and avatar
  useEffect(() => {
    if (!session?.user) return;
    const canonicalUname = getCanonicalUsername(session.user, cachedUser);
    const cleanCanonical = canonicalUname.toLowerCase().replace(/^@/, '');
    const cleanNoUnderscore = cleanCanonical.replace(/_/g, '');
    const canonicalAvatar = sanitizeAvatarUrl(cachedUser?.avatarUrl || session.user.user_metadata?.avatar_url || session.user.user_metadata?.avatarUrl || '');

    setTrails((prev) => {
      let changed = false;
      const updated = prev.map((t) => {
        if (!t) return t;
        const cUname = (t.creator?.username || '').toLowerCase().replace(/^@/, '');
        const hasCreatorId = Boolean(t.creator?.id);
        const matchesCreatorId = hasCreatorId && (t.creator!.id === session.user.id || t.creator!.id === `user_${session.user.id}` || t.creator!.id === `supa_${session.user.id}`);
        const isUserTrail = hasCreatorId
          ? matchesCreatorId
          : Boolean(cleanCanonical && cUname && cUname === cleanCanonical);

        if (isUserTrail) {
          if (t.creator?.username !== canonicalUname || (canonicalAvatar && t.creator?.avatarUrl !== canonicalAvatar)) {
            changed = true;
            return {
              ...t,
              creator: {
                ...t.creator,
                id: session.user.id,
                username: canonicalUname,
                avatarUrl: canonicalAvatar || t.creator?.avatarUrl || ''
              }
            };
          }
        }
        return t;
      });

      if (changed) {
        try {
          localStorage.setItem('roamai_user_trails', JSON.stringify(updated));
          localStorage.setItem('tripwise_user_trails', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      }
      return prev;
    });
  }, [session?.user, cachedUser]);

  const [isPlaying, setIsPlaying] = useState<boolean>(Boolean(isActive));
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('tripwise_trails_muted');
      return stored !== null ? stored === 'true' : false;
    } catch {
      return false;
    }
  });
  const [showMuteIndicator, setShowMuteIndicator] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [locationActionTrail, setLocationActionTrail] = useState<TrailReel | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>(() => getSavedPlaces());
  const [locationToast, setLocationToast] = useState<string | null>(null);

  const activeReel = trails[currentIndex] || trails[0];

  const fallbackPoster = useMemo(() => {
    return resolvePlaceImage(activeReel?.destination || activeReel?.title || 'Scenic Travel', 'Nature');
  }, [activeReel?.destination, activeReel?.title]);

  const effectivePoster = activeReel?.posterUrl || fallbackPoster;

  // Active media resolution states - initialized immediately so media/background is instantly visible
  const [activeMediaUrl, setActiveMediaUrl] = useState<string>(() => {
    const reel = trails[currentIndex] || trails[0];
    if (reel?.videoUrl && !reel.videoUrl.startsWith('blob:')) {
      return reel.videoUrl;
    }
    return reel?.posterUrl || '';
  });
  const [activeMediaError, setActiveMediaError] = useState<boolean>(false);
  const [isMediaLoading, setIsMediaLoading] = useState<boolean>(false);
  const [nextMediaUrl, setNextMediaUrl] = useState<string>('');
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);

  // Upload modal form state
  const [uploadVideoFile, setUploadVideoFile] = useState<File | null>(null);
  const [uploadVideoPreview, setUploadVideoPreview] = useState<string>('');
  const [uploadPosterPreview, setUploadPosterPreview] = useState<string>('');
  const [uploadCaption, setUploadCaption] = useState<string>('');
  const [uploadDestination, setUploadDestination] = useState<string>('');
  const [uploadTags, setUploadTags] = useState<string>('');
  const [uploadAudio, setUploadAudio] = useState<string>('Original Travel Sound');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [taggedPeople, setTaggedPeople] = useState<string>('');
  const [showTagInput, setShowTagInput] = useState<boolean>(false);
  const [showLocationInput, setShowLocationInput] = useState<boolean>(false);
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState<boolean>(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [isTrailLocationModalOpen, setIsTrailLocationModalOpen] = useState<boolean>(false);
  const [uploadLocationError, setUploadLocationError] = useState<string | null>(null);
  const [slideState, setSlideState] = useState<'idle' | 'sliding-up' | 'sliding-down'>('idle');
  const slideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Automatically detect hashtags typed inside the combined caption & hashtags input box
  const detectedHashtags = useMemo(() => {
    const matches = uploadCaption.match(/#([a-zA-Z0-9_\u0080-\uFFFF]+)/g);
    return matches ? Array.from(new Set(matches.map((m) => m.trim()))) : [];
  }, [uploadCaption]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragDistanceRef = useRef<number>(0);


  // Resolve active media URL whenever active reel changes and view is active, and preload next reel
  useEffect(() => {
    if (!isActive || !activeReel) {
      setActiveMediaUrl(activeReel?.posterUrl || '');
      setActiveMediaError(false);
      setIsVideoReady(false);
      return;
    }
    let isMounted = true;
    setActiveMediaError(false);
    setIsMediaLoading(true);
    setIsVideoReady(false);

    resolveTrailMediaUrl(activeReel.id, activeReel.videoUrl).then((resolved) => {
      if (isMounted) {
        setActiveMediaUrl(resolved);
        setIsMediaLoading(false);
      }
    });

    // Proactively pre-resolve and warm next reel media and poster for instantaneous transitions
    const nextReel = trails[currentIndex + 1];
    if (nextReel && nextReel.id) {
      resolveTrailMediaUrl(nextReel.id, nextReel.videoUrl).then((resUrl) => {
        if (isMounted && resUrl) {
          setNextMediaUrl(resUrl);
        }
      }).catch(() => {});
      if (nextReel.posterUrl && !nextReel.posterUrl.startsWith('blob:') && typeof Image !== 'undefined') {
        const img = new Image();
        img.src = nextReel.posterUrl;
      }
    } else {
      setNextMediaUrl('');
    }

    return () => {
      isMounted = false;
    };
  }, [isActive, activeReel?.id, activeReel?.videoUrl, currentIndex, trails]);

  // Auto-play when active reel changes or when trails page opens
  useEffect(() => {
    if (!isActive || showUploadModal) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {
        // Fallback if browser blocked unmuted autoplay
        if (videoRef.current && !isMuted) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, [currentIndex, isActive, showUploadModal]);

  // Keep video DOM element's muted property synchronized with isMuted state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Extra guard: whenever activeMediaUrl updates, ensure paused if not on trails
  useEffect(() => {
    if (!isActive && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [activeMediaUrl, isActive]);

  // Pause when browser tab/app is hidden, resume only if actively on trails
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      } else if (isActive && !showUploadModal) {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, showUploadModal]);

  // Listen to instant global pause events (e.g. user swiping away from trails)
  useEffect(() => {
    const handleGlobalPause = () => {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };
    window.addEventListener('roamai_pause_trails', handleGlobalPause);
    return () => {
      window.removeEventListener('roamai_pause_trails', handleGlobalPause);
    };
  }, []);

  const handleNextReel = () => {
    if (slideState !== 'idle') return;
    setSlideState('sliding-up');
    setIsVideoReady(false);
    if (progressBarRef.current) {
      progressBarRef.current.style.width = '0%';
    }
    if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current);
    slideTimeoutRef.current = setTimeout(() => {
      if (currentIndex < trails.length - 1) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        // Progressive prefetching: load more trails in background when user approaches end of feed
        if (nextIdx >= trails.length - 3 && !customTrails) {
          fetchMoreGlobalTrails(trails.length, 20).then((more) => {
            if (more && more.length > 0) {
              setTrails((prev) => {
                const existing = new Set(prev.map((p) => p.id));
                const filtered = more.filter((m) => !existing.has(m.id)).map(sanitizeTrail);
                return filtered.length > 0 ? [...prev, ...filtered] : prev;
              });
            }
          }).catch(() => {});
        }
      } else {
        setCurrentIndex(0);
      }
      setSlideState('idle');
    }, 150);
  };

  const handlePrevReel = () => {
    if (slideState !== 'idle') return;
    setSlideState('sliding-down');
    setIsVideoReady(false);
    if (progressBarRef.current) {
      progressBarRef.current.style.width = '0%';
    }
    if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current);
    slideTimeoutRef.current = setTimeout(() => {
      if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      } else {
        setCurrentIndex(trails.length - 1);
      }
      setSlideState('idle');
    }, 150);
  };

  const togglePlay = () => {
    if (!isActive) return;
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setShowMuteIndicator(true);
    setTimeout(() => setShowMuteIndicator(false), 800);

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (!nextMuted) {
        videoRef.current.play().catch(() => {});
      }
    }

    try {
      localStorage.setItem('tripwise_trails_muted', String(nextMuted));
    } catch {}
  };

  const handlePlaylineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current || !videoRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(1, clickX / rect.width));
    videoRef.current.currentTime = newProgress * videoRef.current.duration;
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${newProgress * 100}%`;
    }
  };

  // Mouse wheel scroll to change trails (with throttle)
  const lastWheelTimeRef = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    if (showUploadModal || locationActionTrail) return;
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
    if (!isActive || showUploadModal || locationActionTrail) return;

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
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, showUploadModal, locationActionTrail, currentIndex, trails.length, isMuted, isPlaying]);



  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeReel) return;
    const isNowSaved = toggleSaveTrail(activeReel);
    setTrails((prev) =>
      prev.map((t, idx) => {
        if (idx === currentIndex) {
          return { ...t, isSaved: isNowSaved };
        }
        return t;
      })
    );
    setShareToast(isNowSaved ? 'Saved to Saved Trails!' : 'Removed from Saved Trails');
    setTimeout(() => setShareToast(null), 2500);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareToast('Trail link copied to clipboard!');
      setTimeout(() => setShareToast(null), 2500);
    }
  };
  // Photo File Selection Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG, WEBP, HEIC). Video uploads are not supported for Trails.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setUploadVideoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setUploadVideoPreview(previewUrl);
      setUploadPosterPreview(previewUrl);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadPosterPreview(url);
    }
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem('roamai_reel_draft', JSON.stringify({
        caption: uploadCaption,
        destination: uploadDestination,
        taggedPeople: taggedPeople,
        audio: uploadAudio,
        tags: uploadTags,
        date: new Date().toISOString()
      }));
    } catch {}
    setShareToast('Draft saved successfully');
    setTimeout(() => setShareToast(null), 3000);
    setShowUploadModal(false);
    handleResetUpload();
  };

  const handleResetUpload = () => {
    setUploadVideoFile(null);
    setUploadVideoPreview('');
    setUploadPosterPreview('');
    setUploadCaption('');
    setUploadDestination('');
    setUploadTags('');
    setUploadAudio('Original Travel Sound');
    setTaggedPeople('');
    setShowTagInput(false);
    setShowLocationInput(false);
    setShowHashtagSuggestions(false);
    setIsPreviewPlaying(false);
    setIsTrailLocationModalOpen(false);
    setUploadLocationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit User Trail
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadVideoFile && !uploadVideoPreview) return;

    if (!uploadDestination.trim()) {
      setUploadLocationError('Location is mandatory for sharing a trail. Please choose a location.');
      setIsTrailLocationModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    const trailId = `user-trail-${Date.now()}`;

    // 1. Save binary file to IndexedDB for persistent reloadable playback
    if (uploadVideoFile) {
      await saveTrailMedia(trailId, uploadVideoFile);
    }

    // 2. Poster frame
    const poster = uploadPosterPreview || uploadVideoPreview;

    const cached = session?.user ? getCachedUserProfile(session.user.id) : null;
    const meta = session?.user?.user_metadata || {};
    const creatorName = cached?.name || meta.full_name || meta.name || cached?.username?.replace(/^@/, '') || 'Traveller';
    const username = getCanonicalUsername(session?.user, cached);
    const rawAvatar = cached?.avatarUrl || meta.avatar_url || meta.avatarUrl || '';
    const avatarUrl = sanitizeAvatarUrl(rawAvatar);

    const extractedHashtags = (uploadCaption.match(/#([a-zA-Z0-9_\u0080-\uFFFF]+)/g) || []).map((t) => t.trim());
    const finalCaption = uploadCaption.trim();
    const cleanTitle = uploadCaption.replace(/#\S+/g, '').trim() || uploadDestination.trim() || '';

    const newTrail: TrailReel = {
      id: trailId,
      videoUrl: uploadVideoPreview,
      posterUrl: poster || undefined,
      mediaType: 'image',
      title: cleanTitle,
      creator: {
        id: session?.user?.id,
        name: creatorName,
        username: username,
        avatarUrl: avatarUrl,
        isVerified: false
      },
      caption: finalCaption,
      destination: uploadDestination.trim(),
      tags: extractedHashtags.length > 0 ? extractedHashtags : (uploadTags ? uploadTags.split(' ').filter(Boolean) : []),
      audioTitle: uploadAudio.trim() || 'Original Sound',
      aspectRatio: 'original',
      fitMode: 'contain'
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
    handleResetUpload();
  };

  // Require login to access Trails page
  if (!session) {
    return (
      <div className="relative w-full h-full min-h-[100dvh] bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-center text-white overflow-hidden select-none">
        {/* Ambient Glow */}
        <div 
          className="absolute w-80 h-80 rounded-full blur-[140px] opacity-25 pointer-events-none"
          style={{ backgroundColor: currentTheme.primaryColor }}
        />

        <div className="relative z-10 max-w-sm w-full space-y-6 bg-zinc-900/90 backdrop-blur-2xl p-7 sm:p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-white shadow-xl ring-1 ring-white/20"
            style={{ backgroundColor: currentTheme.primaryColor }}
          >
            <Film className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Log in to watch Trails</h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Watch travel trails and save trails to your personal collection.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => onRequireAuth?.()}
              className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              <LogIn className="w-4 h-4" />
              Sign in to Continue
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-semibold text-xs border border-white/10 transition-all cursor-pointer"
            >
              Back to Discover
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasBottomNav = true;

  return (
    <div 
      onWheel={handleWheel}
      className="relative w-full h-full bg-black overflow-hidden select-none"
    >
      {/* Background Ambience (Blurred Video Frame) */}
      <div 
        className="absolute inset-0 bg-cover bg-center blur-3xl opacity-25 scale-110 pointer-events-none transition-all duration-700"
        style={{ backgroundImage: activeReel?.posterUrl ? `url(${activeReel.posterUrl})` : 'none' }}
      />

      {/* Top Status Bar Vignette Gradient (Guarantees clock, battery, & TRAILS header are clear over video) */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 via-black/25 to-transparent pointer-events-none z-20" />

      {/* Bottom Vignette Gradient (Guarantees caption, creator, & playline are clear over video) */}
      <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none z-10" />

      {/* Top Floating Action Bar */}
      <div 
        className="absolute left-4 sm:left-8 right-4 sm:right-8 z-30 flex items-center justify-between pointer-events-auto"
        style={{ top: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 8px)' }}
      >
        <div className="flex items-center gap-2.5">
          {(showBackButton || customTrails) && (
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white flex items-center justify-center cursor-pointer shadow-xl transition-all hover:scale-105 active:scale-95"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white font-black text-xs sm:text-sm tracking-wider flex items-center shadow-xl">
            {feedTitle ? feedTitle.toUpperCase() : 'TRAILS'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          

          {/* Upload Trail '+' Button (Upload Video or Photo - hidden in user profile reels view) */}
          {!customTrails && (
            <button
              type="button"
              onClick={() => {
                if (!session) {
                  onRequireAuth?.();
                  return;
                }
                if (onOpenUploadPage) {
                  onOpenUploadPage();
                } else {
                  setShowUploadModal(true);
                }
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-linear-to-tr from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-white flex items-center justify-center shadow-xl shadow-emerald-950/60 cursor-pointer transition-all hover:scale-110 active:scale-95 border border-white/20"
              title="Upload trail (video or photo)"
              aria-label="Upload trail (video or photo)"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          )}
        </div>
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
            onClick={() => {
              if (!session) {
                onRequireAuth?.();
                return;
              }
              if (onOpenUploadPage) {
                onOpenUploadPage();
              } else {
                setShowUploadModal(true);
              }
            }}
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
          className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center cursor-pointer group shrink-0"
        >

          {/* Animated Mute / Unmute Visual Indicator Badge */}
          {showMuteIndicator && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in fade-in zoom-in duration-150">
              <div className="w-16 h-16 rounded-full bg-black/75 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-2xl transition-all">
                {isMuted ? (
                  <VolumeX className="w-8 h-8 text-neutral-300 stroke-[2.2]" />
                ) : (
                  <Volume2 className="w-8 h-8 text-white stroke-[2.2]" />
                )}
              </div>
            </div>
          )}
          {/* Ambient optimized backdrop for non-9:16 aspect ratios */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img
              src={effectivePoster}
              alt=""
              className="w-full h-full object-cover opacity-25 scale-105"
              style={{ filter: 'blur(10px)', transform: 'translateZ(0)' }}
            />
          </div>

          {/* Video or Image Media Player with Smooth Slide Transition */}
          <div
            className="absolute inset-0 z-10 w-full h-full flex items-center justify-center transition-all duration-150 ease-out"
            style={{
              transform: slideState === 'sliding-up'
                ? 'translate3d(0, -6%, 0) scale(0.97)'
                : slideState === 'sliding-down'
                ? 'translate3d(0, 6%, 0) scale(0.97)'
                : 'translate3d(0, 0, 0) scale(1)',
              opacity: slideState !== 'idle' ? 0.75 : 1,
              willChange: 'transform, opacity'
            }}
          >
            {(() => {
              const reelAspect = activeReel?.aspectRatio;
              const reelFit = activeReel?.fitMode;
              // Full screen trail is strictly only applicable to 16:9 ratio videos; all other aspects stay original and fill black screen
              const is16by9 = reelAspect === '16:9';
              const shouldCover = is16by9 && reelFit !== 'contain';
              const isContain = !shouldCover;

              return activeReel.mediaType === 'image' || activeMediaUrl.startsWith('data:image') ? (
                <img
                  src={activeMediaUrl || effectivePoster || activeReel.videoUrl}
                  alt={activeReel.caption}
                  className={`w-full h-full ${isContain ? 'object-contain' : 'object-cover'} select-none`}
                  style={{ width: '100%', height: '100%', objectFit: isContain ? 'contain' : 'cover' }}
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    key={activeReel.id}
                    src={activeMediaUrl}
                    poster={effectivePoster}
                    playsInline
                    webkit-playsinline="true"
                    loop
                    autoPlay={isActive && !showUploadModal}
                    preload={isActive ? 'auto' : 'metadata'}
                    muted={isMuted}
                    className={`w-full h-full ${isContain ? 'object-contain' : 'object-cover'}`}
                    style={{ width: '100%', height: '100%', objectFit: isContain ? 'contain' : 'cover' }}
                    onCanPlay={() => setIsVideoReady(true)}
                    onPlay={() => {
                      if (!isActive || showUploadModal) {
                        videoRef.current?.pause();
                        setIsPlaying(false);
                        return;
                      }
                      setIsVideoReady(true);
                      setIsPlaying(true);
                    }}
                    onPause={() => setIsPlaying(false)}
                    onError={() => {
                      setActiveMediaError(true);
                    }}
                    onTimeUpdate={() => {
                      const v = videoRef.current;
                      if (v && v.duration) {
                        if (!isVideoReady && v.currentTime > 0) {
                          setIsVideoReady(true);
                        }
                        if (progressBarRef.current) {
                          const pct = Math.min(100, Math.max(0, (v.currentTime / v.duration) * 100));
                          progressBarRef.current.style.width = `${pct}%`;
                        }
                      }
                    }}
                  />

                  {/* Seamless instant poster frame cover while video buffers */}
                  {!isVideoReady && (
                    <img
                      src={effectivePoster}
                      alt="Poster preview"
                      className={`absolute inset-0 w-full h-full ${isContain ? 'object-contain' : 'object-cover'} pointer-events-none z-10 transition-opacity duration-200`}
                      style={{ width: '100%', height: '100%', objectFit: isContain ? 'contain' : 'cover' }}
                    />
                  )}
                </div>
              );
            })()}
          </div>

          {/* Lightweight next reel poster prefetch without competing for GPU decoders or video bandwidth */}
          {isActive && trails[currentIndex + 1] && (
            <img
              src={trails[currentIndex + 1]?.posterUrl || resolvePlaceImage(trails[currentIndex + 1]?.destination || trails[currentIndex + 1]?.title, 'Nature')}
              alt=""
              className="hidden pointer-events-none"
              style={{ display: 'none' }}
              aria-hidden="true"
            />
          )}

          {/* Recovery overlay if clip unavailable */}
          {activeMediaError && (
            <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-6 text-center space-y-4 z-20">
              {effectivePoster && (
                <img
                  src={effectivePoster}
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
                  Unable to buffer this clip stream right now.
                </p>
              </div>
              <div className="relative z-10 flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMediaError(false);
                    setIsVideoReady(false);
                    if (videoRef.current) {
                      videoRef.current.load();
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 shadow-lg cursor-pointer transition-all"
                >
                  Retry Stream
                </button>
                {currentIndex < trails.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextReel();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-lg cursor-pointer transition-all"
                  >
                    Next Trail →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Play/Pause Center Overlay Animation (video reels only) */}
          {!isPlaying && !activeMediaError && activeReel.mediaType !== 'image' && !activeMediaUrl.startsWith('data:image') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none transition-all">
              <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl scale-110">
                <Play className="w-8 h-8 fill-white ml-1" />
              </div>
            </div>
          )}

        {/* Gradient Overlays for readable text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />

        {/* Right Action Sidebar (Only Save Option) */}
        <div 
          className="absolute right-3.5 sm:right-6 z-20 flex flex-col items-center gap-4 sm:gap-5 pointer-events-auto select-none"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 116px)' }}
        >
          {/* Save / Bookmark Button */}
          <button
            type="button"
            onClick={handleSave}
            className="flex flex-col items-center gap-1 group/btn cursor-pointer transition-transform active:scale-75 hover:scale-110"
            title={activeReel.isSaved ? 'Unsave Trail' : 'Save Trail'}
          >
            <Bookmark 
              className={`w-7 h-7 sm:w-8 sm:h-8 transition-all ${
                activeReel.isSaved 
                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_2px_12px_rgba(251,191,36,0.7)]' 
                  : 'text-white stroke-[2.2] drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]'
              }`} 
            />
            <span className="text-xs sm:text-sm font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              {activeReel.isSaved ? 'Saved' : 'Save'}
            </span>
          </button>
        </div>

        {/* Bottom Left Info & Caption Overlay (Above playline & low bottom nav) */}
        {(() => {
          const creator = activeReel?.creator || DEFAULT_TRAIL_CREATOR;
          const creatorUsername = (creator.username || '').toLowerCase().replace(/^@/, '');
          const isOwnTrail = Boolean(
            (session?.user?.id && creator.id && (creator.id === session.user.id || creator.id === `user_${session.user.id}` || creator.id === `supa_${session.user.id}`)) ||
            (!creator.id && currentUsername && creatorUsername && creatorUsername === (currentUsername || '').toLowerCase().replace(/^@/, ''))
          );

          const canonicalOwnUsername = getCanonicalUsername(session?.user, cachedUser);
          const effectiveUsername = isOwnTrail
            ? canonicalOwnUsername
            : (creator.username || creator.name || 'creator');

          const creatorCleanDisplay = effectiveUsername.replace(/^@/, '');
          const effectiveAvatarUrl = isOwnTrail
            ? sanitizeAvatarUrl(cachedUser?.avatarUrl || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.avatarUrl || creator.avatarUrl)
            : sanitizeAvatarUrl(creator.avatarUrl);

          const handleOpenCreatorProfile = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (isOwnTrail) {
              if (onOpenOwnProfile) {
                onOpenOwnProfile();
              } else {
                window.dispatchEvent(new CustomEvent('roamai_view_own_profile'));
              }
              return;
            }

            const travellerData = {
              id: creator.id,
              username: effectiveUsername,
              name: creator.name,
              avatarUrl: effectiveAvatarUrl,
              location: activeReel?.destination || ''
            };

            if (onOpenUserProfile) {
              onOpenUserProfile(travellerData);
            } else {
              window.dispatchEvent(
                new CustomEvent('roamai_view_traveller', {
                  detail: travellerData
                })
              );
            }
          };

          return (
            <div 
              className="absolute left-3.5 sm:left-6 right-16 sm:right-24 z-20 space-y-2 pointer-events-none max-w-xl"
              style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 116px)' }}
            >
              {/* Creator Row: Photo beside Profile Username */}
              <div className="flex items-center gap-2.5 pointer-events-auto flex-wrap">
                {/* Clean Circular Photo (Instagram Reels style) */}
                <div 
                  onClick={handleOpenCreatorProfile}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden shadow-lg shrink-0 bg-neutral-900 border border-white/20 flex items-center justify-center cursor-pointer hover:opacity-85 hover:scale-105 transition-all ring-1 ring-white/15"
                  title={`View ${creatorCleanDisplay}'s profile`}
                >
                  {effectiveAvatarUrl ? (
                    <img
                      src={effectiveAvatarUrl}
                      alt={creatorCleanDisplay}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-white font-bold text-sm sm:text-base select-none">
                      {creatorCleanDisplay.charAt(0).toUpperCase() || 'T'}
                    </div>
                  )}
                </div>

                {/* Username only (no full name) */}
                <span 
                  onClick={handleOpenCreatorProfile}
                  className="text-base sm:text-lg font-bold text-white tracking-wide drop-shadow-md cursor-pointer hover:underline hover:text-indigo-200 transition-colors"
                  title={`View ${creatorCleanDisplay}'s profile`}
                >
                  {creatorCleanDisplay}
                </span>
              </div>

              {/* Creator Bio (if available on creator profile) */}
              {cleanBio(creator.bio) && (
                <p className="text-xs sm:text-sm text-neutral-300 font-normal drop-shadow-md line-clamp-1">
                  {cleanBio(creator.bio)}
                </p>
              )}

              {/* Caption / Trail Details */}
              {activeReel?.caption && (
                <p className="text-sm sm:text-base text-neutral-100 line-clamp-2 leading-relaxed drop-shadow-md font-medium">
                  {activeReel.caption}
                </p>
              )}

              {/* Destination Badge / Location */}
              {activeReel?.destination && (
                <div className="flex items-center gap-1.5 flex-wrap pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocationActionTrail(activeReel);
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 active:scale-95 backdrop-blur-md border border-white/25 hover:border-white/40 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer group"
                    title={`Options for ${activeReel?.destination}`}
                  >
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate max-w-[200px] sm:max-w-xs">{activeReel?.destination}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Video Playline directly above Bottom Navigation Bar with doubled gap (video reels only) */}
        {activeReel.mediaType !== 'image' && !activeMediaUrl.startsWith('data:image') && (
          <div 
            onClick={handlePlaylineClick}
            className="absolute left-3.5 right-3.5 sm:left-6 sm:right-6 z-30 h-4 flex items-center cursor-pointer pointer-events-auto group/playline"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)' }}
            title="Video playback progress"
          >
            <div className="w-full h-[3px] sm:h-[4px] bg-white/40 group-hover/playline:h-[6px] rounded-full overflow-hidden transition-all duration-150 backdrop-blur-xs shadow-xs">
              <div
                ref={progressBarRef}
                className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
                style={{ width: '0%' }}
              />
            </div>
          </div>
        )}
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





      {/* Instagram Reel Style Upload Modal */}
      {showUploadModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => {
            if (!isSubmitting) {
              setShowUploadModal(false);
              handleResetUpload();
            }
          }}
        >
          <div 
            className={`w-full bg-[#1c1c1e] sm:bg-[#18181b] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white transition-all duration-300 ${
              !uploadVideoPreview ? 'max-w-md' : 'max-w-4xl max-h-[92vh]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* STEP 1: Select from device screen */}
            {!uploadVideoPreview ? (
              <div className="flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
                  <div className="w-8" />
                  <h3 className="text-sm sm:text-base font-bold text-white text-center">Create new trail</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      handleResetUpload();
                    }}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-zinc-300 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body: Select from device */}
                <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-5 bg-transparent">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-linear-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/40">
                    <Camera className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-base sm:text-lg font-bold text-white">
                      Upload Travel Photo
                    </h4>
                    <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                      Select a travel photo from your device to share with the community
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/50 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Select picture from device
                  </button>

                  <p className="text-[11px] text-zinc-500">
                    Supports JPG, JPEG, PNG, WEBP, HEIC up to 25MB
                  </p>
                </div>
              </div>
            ) : (
              /* STEP 2: Instagram "New reel" layout (matching attached design) */
              <form id="upload-reel-form" onSubmit={handleUploadSubmit} className="flex flex-col h-full max-h-[92vh] sm:max-h-[850px] bg-black text-white">
                {/* Header: Circle Back Button & Centered "New trail photo" */}
                <div className="relative flex items-center justify-center px-4 py-3.5 border-b border-zinc-900 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetUpload}
                    disabled={isSubmitting}
                    className="absolute left-4 w-10 h-10 rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95 disabled:opacity-40"
                    title="Back"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">New trail photo</h2>
                </div>

                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 max-w-md mx-auto w-full">
                  {/* Centered Preview Card with original natural photo aspect ratio */}
                  <div className="relative mx-auto rounded-3xl overflow-hidden bg-black/95 border border-white/10 shadow-2xl flex items-center justify-center w-full max-w-[340px] sm:max-w-sm max-h-[460px]">
                    <img
                      src={uploadPosterPreview || uploadVideoPreview}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 pointer-events-none scale-110"
                    />
                    <img
                      src={uploadPosterPreview || uploadVideoPreview}
                      alt="Trail preview"
                      className="relative z-10 w-auto max-w-full max-h-[460px] object-contain mx-auto"
                    />
                  </div>

                  {/* Caption Input: "Add a caption..." */}
                  <div className="pt-2">
                    <textarea
                      rows={3}
                      value={uploadCaption}
                      onChange={(e) => setUploadCaption(e.target.value)}
                      placeholder="Add a caption..."
                      className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-zinc-500 focus:outline-hidden resize-none leading-relaxed border-none p-0"
                    />

                    {/* Detected Hashtags Display if any */}
                    {detectedHashtags.length > 0 && (
                      <div className="pt-1.5 flex flex-wrap gap-1.5 items-center">
                        {detectedHashtags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Button Row: [# Hashtags] (no poll, no prompt) */}
                  <div className="flex items-center gap-2 pt-1 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowHashtagSuggestions(!showHashtagSuggestions);
                        if (!uploadCaption.endsWith(' ') && uploadCaption.length > 0) {
                          setUploadCaption((prev) => prev + ' #');
                        } else if (uploadCaption.length === 0) {
                          setUploadCaption('#');
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                        showHashtagSuggestions 
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md' 
                          : 'bg-[#262626] hover:bg-zinc-800 text-white border-white/5'
                      }`}
                    >
                      <Hash className="w-3.5 h-3.5" />
                      <span>Hashtags</span>
                    </button>
                  </div>

                  {/* Hashtag Suggestions Palette when active */}
                  {showHashtagSuggestions && (
                    <div className="p-2.5 rounded-2xl bg-[#1c1c1e] border border-white/10 flex flex-wrap gap-1.5 animate-in fade-in duration-150">
                      {['#travel', '#wanderlust', '#trails', '#nature', '#adventure', '#explore', '#sunset', '#mountains', '#beach'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (!uploadCaption.includes(tag)) {
                              setUploadCaption((prev) => prev.trim() ? `${prev.trim()} ${tag} ` : `${tag} `);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium cursor-pointer transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Divider Line */}
                  <div className="border-t border-zinc-900 pt-1" />

                  {/* Row 1: Tag people > */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowTagInput(!showTagInput)}
                      className="w-full py-3 flex items-center justify-between text-left hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Camera className="w-5 h-5 text-white" />
                        <span className="text-sm sm:text-base font-semibold text-white">Tag people</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        {taggedPeople && <span className="text-xs text-blue-400 font-medium truncate max-w-[120px]">{taggedPeople}</span>}
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    </button>

                    {showTagInput && (
                      <div className="pb-3 pl-8">
                        <input
                          type="text"
                          value={taggedPeople}
                          onChange={(e) => setTaggedPeople(e.target.value)}
                          placeholder="Tag users (e.g. @friend1, @traveler)..."
                          className="w-full bg-[#1c1c1e] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Row 2: Add location > (Mandatory) */}
                  <div className={`rounded-2xl transition-all ${uploadLocationError && !uploadDestination ? 'border border-rose-500/70 bg-rose-500/5 p-2' : ''}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadLocationError(null);
                        setIsTrailLocationModalOpen(true);
                      }}
                      className="w-full py-2 flex items-center justify-between text-left hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className={`w-5 h-5 ${uploadDestination ? 'text-blue-400' : 'text-white'}`} />
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-semibold text-white">Add location</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Required
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        {uploadDestination ? (
                          <span className="text-xs text-blue-400 font-semibold truncate max-w-[140px] bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20">
                            {uploadDestination}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">Select on map or search</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    </button>

                    {uploadLocationError && !uploadDestination && (
                      <p className="pt-1 pl-8 text-[11px] text-rose-400 font-medium">
                        {uploadLocationError}
                      </p>
                    )}

                    <p className="pl-8 pt-1 text-[11px] text-zinc-500 leading-snug">
                      Select on interactive map or search places. People you share with can see the location.
                    </p>
                  </div>
                </div>

                {/* Bottom Action Bar: [Save draft] [Next] (Exact screenshot style) */}
                <div className="px-5 sm:px-6 py-4 border-t border-zinc-900 bg-black shrink-0 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 rounded-2xl bg-[#262626] hover:bg-zinc-800 text-white font-bold text-sm text-center cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                  >
                    Save draft
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 rounded-2xl bg-[#0095f6] hover:bg-[#1877f2] text-white font-bold text-sm text-center cursor-pointer transition-all active:scale-98 shadow-lg shadow-blue-950/40 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sharing...</span>
                      </>
                    ) : (
                      <span>Next</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Trail Location Action Modal (Save Place & Plan a Trip) */}
      {locationActionTrail && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in pb-20 sm:pb-4"
          onClick={() => setLocationActionTrail(null)}
        >
          <div
            className="w-full sm:max-w-md bg-[#16161c] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag bar */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto sm:hidden mb-1" />

            {/* Header */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate">
                    {locationActionTrail.destination}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Location tagged in this trail
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLocationActionTrail(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toast feedback if any */}
            {locationToast && (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{locationToast}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {/* Option 1: Save Place / Saved Place */}
              {(() => {
                const dest = locationActionTrail.destination.trim();
                const placeId = `trail_loc_${dest.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                const isSaved = savedPlaces.some(
                  (p) =>
                    p.placeId === placeId ||
                    p.name.toLowerCase() === dest.toLowerCase() ||
                    p.address.toLowerCase() === dest.toLowerCase()
                );

                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (isSaved) {
                        removeSavedPlace(placeId);
                        const updated = getSavedPlaces().filter(
                          (p) =>
                            p.placeId !== placeId &&
                            p.name.toLowerCase() !== dest.toLowerCase() &&
                            p.address.toLowerCase() !== dest.toLowerCase()
                        );
                        setSavedPlaces(updated);
                        setLocationToast('Removed from your Saved Places');
                      } else {
                        savePlaceToStorage({
                          placeId,
                          name: dest.split(',')[0].trim(),
                          address: dest,
                          latitude: 0,
                          longitude: 0,
                          category: 'Trail Destination',
                          source: 'manual'
                        });
                        setSavedPlaces(getSavedPlaces());
                        setLocationToast('Saved to your Places!');
                      }
                      window.dispatchEvent(new CustomEvent('roamai_saved_places_changed'));
                      setTimeout(() => setLocationToast(null), 2500);
                    }}
                    className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left cursor-pointer group ${
                      isSaved
                        ? 'bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSaved ? 'bg-amber-500/25 text-amber-400' : 'bg-white/10 text-white'
                      }`}>
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-400' : ''}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{isSaved ? 'Saved in Your Places' : 'Save Place'}</span>
                          {isSaved && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold">
                              Saved
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 truncate">
                          {isSaved ? 'Tap to remove from saved places' : 'Add to your places to visit & explore later'}
                        </p>
                      </div>
                    </div>
                    {isSaved ? (
                      <Check className="w-5 h-5 text-amber-400 shrink-0" />
                    ) : (
                      <Plus className="w-5 h-5 text-white/60 group-hover:text-white transition-colors shrink-0" />
                    )}
                  </button>
                );
              })()}

              {/* Option 2: Plan a Trip to this Place */}
              <button
                type="button"
                onClick={() => {
                  const dest = locationActionTrail.destination.trim();
                  setLocationActionTrail(null);
                  setIsPlaying(false);
                  if (videoRef.current) {
                    videoRef.current.pause();
                  }
                  if (onStartPlanning) {
                    onStartPlanning(dest);
                  }
                }}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/40 hover:to-purple-600/40 border border-indigo-500/40 hover:border-indigo-500/60 transition-all flex items-center justify-between gap-3 text-left cursor-pointer group shadow-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Plan a Trip to this Place</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-300 font-semibold border border-indigo-400/30">
                        AI Planner
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200/80 truncate">
                      Create a personalized custom itinerary for this destination
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-indigo-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>

              {/* Option 3: Explore on Google Maps */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationActionTrail.destination)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setLocationActionTrail(null)}
                className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-3 text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                    <Compass className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">Explore on Google Maps</div>
                    <p className="text-xs text-neutral-400 truncate">
                      View real reviews, routes, and geographic satellite map
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </a>
            </div>

            {/* Cancel / Dismiss */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setLocationActionTrail(null)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Location Picker Modal (Interactive Map or Search) */}
      {isTrailLocationModalOpen && (
        <React.Suspense fallback={null}>
          <TrailLocationPickerModal
            isOpen={isTrailLocationModalOpen}
            onClose={() => setIsTrailLocationModalOpen(false)}
            initialLocation={uploadDestination}
            onSelectLocation={(loc: SelectedTrailLocation) => {
              const formatted = loc.name.trim() || loc.address.trim();
              setUploadDestination(formatted);
              setUploadLocationError(null);
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
};
