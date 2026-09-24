import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Upload, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Send,
  Check,
  Film,
  LogIn,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Hash,
  UserPlus,
  Camera,
  Trash2
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
  commentOnGlobalTrail,
  isTrailLikedByUser,
  TrailLiker,
  TrailReel,
  recordTrailView,
  deleteGlobalTrail,
  sanitizeTrail,
  DEFAULT_TRAIL_CREATOR
} from '../services/sharedTrailsService';
import { isTrailSaved, toggleSaveTrail } from '../services/savedTrailsService';
import { isUserFollowing, followUser, unfollowUser, isFollowedBy, isFakeMockUser } from '../services/followService';
import { TrailLikesModal } from './TrailLikesModal';

export type { TrailReel };

interface TrailsViewProps {
  currentTheme: ThemeConfig;
  session: Session | null;
  isActive?: boolean;
  onStartPlanning: (destination?: string) => void;
  onBack: () => void;
  onRequireAuth?: () => void;
  onOpenUploadPage?: (file?: File) => void;
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
  customTrails,
  initialTrailId,
  initialIndex,
  feedTitle,
  showBackButton = false,
  onDeleteTrail
}) => {
  const cachedUser = session?.user ? getCachedUserProfile(session.user.id) : null;
  const currentUsername = useMemo(() => {
    return (
      cachedUser?.username ||
      (session?.user?.email ? `@${session.user.email.split('@')[0]}` : '')
    ).toLowerCase().replace(/^@/, '');
  }, [cachedUser?.username, session?.user?.email]);

  // Load trails: either customTrails (user-specific) or all global trails
  const [trails, setTrails] = useState<TrailReel[]>(() => {
    if (customTrails && customTrails.length > 0) {
      return customTrails.map((t) => sanitizeTrail({
        ...t,
        isSaved: isTrailSaved(t.id),
        isLiked: isTrailLikedByUser(t.id)
      }));
    }
    return getLocalTrails().map((t) => sanitizeTrail({ 
      ...t, 
      isSaved: isTrailSaved(t.id),
      isLiked: isTrailLikedByUser(t.id)
    }));
  });

  // Sync custom trails if prop updates
  useEffect(() => {
    if (customTrails) {
      setTrails(
        customTrails.map((t) =>
          sanitizeTrail({
            ...t,
            isSaved: isTrailSaved(t.id),
            isLiked: isTrailLikedByUser(t.id)
          })
        )
      );
    }
  }, [customTrails]);

  // Periodically sync global trails from server API & Supabase ONLY if NOT in custom user feed
  useEffect(() => {
    if (customTrails) return; // Never overwrite user-specific feed with global trails!
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
                isSaved: isTrailSaved(g.id),
                isLiked: isTrailLikedByUser(g.id)
              }));
            const prevIds = prev.map((p) => p.id).join(',');
            const nextIds = mapped.map((g) => g.id).join(',');
            if (prevIds !== nextIds || prev.length !== mapped.length) {
              return mapped;
            }
            return prev.map((p) => sanitizeTrail({ 
              ...p, 
              isSaved: isTrailSaved(p.id),
              isLiked: isTrailLikedByUser(p.id)
            }));
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

  // Listen for view count updates
  useEffect(() => {
    const handleTrailViewed = (e: any) => {
      const { trailId, viewsCount } = e.detail || {};
      if (trailId && typeof viewsCount === 'number') {
        setTrails((prev) =>
          prev.map((t) => (t.id === trailId ? { ...t, viewsCount } : t))
        );
      }
    };
    window.addEventListener('roamai_trail_viewed', handleTrailViewed);
    return () => window.removeEventListener('roamai_trail_viewed', handleTrailViewed);
  }, []);

  // Listen for trail liked updates
  useEffect(() => {
    const handleTrailLiked = (e: any) => {
      const { trailId, increment, liker, likesCount } = e.detail || {};
      if (!trailId) return;
      setTrails((prev) =>
        prev.map((t) => {
          if (t.id === trailId) {
            const currentLikers = Array.isArray(t.likedBy) ? t.likedBy : [];
            const cleanU = (liker?.username || '').toLowerCase().replace(/^@+/, '');
            const updatedLikers = increment && liker
              ? [liker, ...currentLikers.filter((u) => (u.username || '').toLowerCase().replace(/^@+/, '') !== cleanU)]
              : currentLikers.filter((u) => (u.username || '').toLowerCase().replace(/^@+/, '') !== cleanU);
            return {
              ...t,
              isLiked: cleanU === currentUsername ? increment : t.isLiked,
              likesCount: typeof likesCount === 'number' ? likesCount : updatedLikers.length,
              likedBy: updatedLikers
            };
          }
          return t;
        })
      );
    };
    window.addEventListener('roamai_trail_liked', handleTrailLiked);
    return () => window.removeEventListener('roamai_trail_liked', handleTrailLiked);
  }, [currentUsername]);

  const [isPlaying, setIsPlaying] = useState<boolean>(Boolean(isActive));
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showComments, setShowComments] = useState<boolean>(false);
  const [showLikesModal, setShowLikesModal] = useState<boolean>(false);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [unfollowConfirmCreator, setUnfollowConfirmCreator] = useState<{ id?: string; username: string; name: string; avatarUrl?: string } | null>(null);
  const [showHeartBurst, setShowHeartBurst] = useState<boolean>(false);
  const lastTapRef = useRef<number>(0);

  const getCurrentUserLiker = (): TrailLiker | undefined => {
    if (!session?.user) return undefined;
    const cached = getCachedUserProfile(session.user.id);
    const meta = session.user.user_metadata || {};
    const fallbackU = session.user.email 
      ? session.user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
      : `user_${session.user.id.slice(0, 8)}`;
    return {
      id: session.user.id,
      name: cached?.name || meta.full_name || meta.name || session.user.email?.split('@')[0] || 'Traveller',
      username: cached?.username || (meta.username ? `@${meta.username.replace(/^@/, '')}` : `@${fallbackU}`),
      avatarUrl: sanitizeAvatarUrl(cached?.avatarUrl || meta.avatar_url || meta.avatarUrl || '')
    };
  };

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
  const [taggedPeople, setTaggedPeople] = useState<string>('');
  const [showTagInput, setShowTagInput] = useState<boolean>(false);
  const [showLocationInput, setShowLocationInput] = useState<boolean>(false);
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState<boolean>(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Automatically detect hashtags typed inside the combined caption & hashtags input box
  const detectedHashtags = useMemo(() => {
    const matches = uploadCaption.match(/#([a-zA-Z0-9_\u0080-\uFFFF]+)/g);
    return matches ? Array.from(new Set(matches.map((m) => m.trim()))) : [];
  }, [uploadCaption]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragDistanceRef = useRef<number>(0);

  const activeReel = trails[currentIndex] || trails[0];

  // Record view count strictly for signed-up users
  useEffect(() => {
    if (!isActive || !activeReel?.id) return;
    if (!session?.user) return; // ONLY signed-up users increase view count!

    const viewer = {
      id: session.user.id,
      username: currentUsername || session.user.email?.split('@')[0] || `user_${session.user.id.slice(0, 8)}`
    };

    const timer = setTimeout(() => {
      recordTrailView(activeReel.id, viewer);
    }, 700);

    return () => clearTimeout(timer);
  }, [isActive, activeReel?.id, session?.user?.id, currentUsername]);

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

  // Auto-play when active reel changes, but strictly only when on the trails page!
  useEffect(() => {
    if (!isActive || showUploadModal || showLikesModal) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isPlaying) {
        videoRef.current.play().catch(() => {
          // If browser restricts unmuted autoplay before interaction, fallback to mute and play
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, [currentIndex, isActive, showUploadModal, showLikesModal]);

  // Pause video whenever user is NOT actively on Trails tab or when an overlay modal is open
  useEffect(() => {
    if (!isActive || showUploadModal || showLikesModal) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch(() => {});
          }
        });
        setIsPlaying(true);
      }
    }
  }, [isActive, showUploadModal, showLikesModal]);

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
      } else if (isActive && !showUploadModal && !showLikesModal) {
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
  }, [isActive, showUploadModal, showLikesModal]);

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
    if (showComments || showUploadModal || showLikesModal) return;
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
    if (!isActive || showComments || showUploadModal || showLikesModal) return;

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
  }, [isActive, showComments, showUploadModal, showLikesModal, currentIndex, trails.length, isMuted, isPlaying]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeReel) return;
    if (!session?.user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    const isLiked = !activeReel.isLiked;
    const liker = getCurrentUserLiker();
    if (!liker) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    likeGlobalTrail(activeReel.id, isLiked, liker);
    setTrails((prev) =>
      prev.map((t, idx) => {
        if (idx === currentIndex) {
          const currentLikers = Array.isArray(t.likedBy) ? t.likedBy : [];
          const cleanU = (liker.username || '').toLowerCase().replace(/^@+/, '');
          const updatedLikers = isLiked
            ? [liker, ...currentLikers.filter((u) => (u.username || '').toLowerCase().replace(/^@+/, '') !== cleanU)]
            : currentLikers.filter((u) => (u.username || '').toLowerCase().replace(/^@+/, '') !== cleanU);

          return {
            ...t,
            isLiked,
            likesCount: updatedLikers.length,
            likedBy: updatedLikers
          };
        }
        return t;
      })
    );
  };

  const handleDeleteActiveTrail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeReel) return;
    if (!window.confirm('Are you sure you want to delete this trail?')) return;

    const trailIdToDelete = activeReel.id;
    await deleteGlobalTrail(trailIdToDelete);
    if (onDeleteTrail) {
      onDeleteTrail(trailIdToDelete);
    }
    const remaining = trails.filter((t) => t.id !== trailIdToDelete);
    if (remaining.length === 0) {
      onBack();
    } else {
      setTrails(remaining);
      if (currentIndex >= remaining.length) {
        setCurrentIndex(remaining.length - 1);
      }
    }
  };

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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
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
    const creatorName = cached?.name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || (session?.user?.email ? session.user.email.split('@')[0] : 'Traveller');
    const fallbackUploadU = session?.user?.email 
      ? session.user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
      : (session?.user?.id ? `user_${session.user.id.slice(0, 8)}` : 'traveller');
    const username = cached?.username || `@${fallbackUploadU}`;
    const rawAvatar = cached?.avatarUrl || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.avatarUrl || '';
    const avatarUrl = sanitizeAvatarUrl(rawAvatar);

    // Extract hashtags automatically from the combined caption & hashtags box
    const extractedHashtags = (uploadCaption.match(/#([a-zA-Z0-9_\u0080-\uFFFF]+)/g) || []).map((t) => t.trim());
    const finalCaption = uploadCaption.trim() || 'Exploring this breathtaking destination! 🌍✈️';
    const cleanTitle = uploadCaption.replace(/#\S+/g, '').trim() || uploadDestination.trim() || 'Travel Trail';

    const newTrail: TrailReel = {
      id: trailId,
      videoUrl: uploadVideoPreview,
      posterUrl: poster || undefined,
      mediaType: isImg ? 'image' : 'video',
      title: cleanTitle,
      creator: {
        id: session?.user?.id,
        name: creatorName,
        username: username,
        avatarUrl: avatarUrl,
        isFollowed: false,
        isVerified: false
      },
      caption: finalCaption,
      destination: uploadDestination.trim() || 'Travel Destination',
      tags: extractedHashtags.length > 0 ? extractedHashtags : (uploadTags ? uploadTags.split(' ').filter(Boolean) : ['#travel']),
      audioTitle: uploadAudio.trim() || 'Original Sound',
      likesCount: 0,
      commentsCount: 0,
      viewsCount: 0,
      isLiked: false,
      likedBy: [],
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
              Watch travel trails, like and comment on creator spots, and save trails to your personal collection.
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

  return (
    <div 
      onWheel={handleWheel}
      className="relative w-full h-full max-h-full bg-black overflow-hidden flex items-center justify-center select-none"
    >
      {/* Background Ambience (Blurred Video Frame) */}
      <div 
        className="absolute inset-0 bg-cover bg-center blur-3xl opacity-25 scale-110 pointer-events-none transition-all duration-700"
        style={{ backgroundImage: activeReel?.posterUrl ? `url(${activeReel.posterUrl})` : 'none' }}
      />

      {/* Top Floating Action Bar */}
      <div className="absolute top-4 sm:top-6 left-4 sm:left-8 right-4 sm:right-8 z-30 flex items-center justify-between pointer-events-auto">
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
          {/* If own trail, show delete button */}
          {(() => {
            const creator = activeReel?.creator || DEFAULT_TRAIL_CREATOR;
            const creatorUsername = (creator.username || '').toLowerCase().replace(/^@/, '');
            const isOwnTrail = Boolean(
              (currentUsername && creatorUsername && creatorUsername === currentUsername) ||
              (session?.user?.id && creator.id && creator.id === session.user.id)
            );
            if (isOwnTrail) {
              return (
                <button
                  type="button"
                  onClick={handleDeleteActiveTrail}
                  className="w-10 h-10 rounded-full bg-black/60 hover:bg-rose-600/90 backdrop-blur-md border border-white/20 text-rose-300 hover:text-white flex items-center justify-center cursor-pointer shadow-xl transition-all hover:scale-105 active:scale-95"
                  title="Delete Trail"
                  aria-label="Delete Trail"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              );
            }
            return null;
          })()}

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
            const now = Date.now();
            if (now - lastTapRef.current < 320) {
              // Double tap detected! Like the trail with heart burst animation
              if (!session?.user) {
                if (onRequireAuth) onRequireAuth();
                return;
              }
              if (activeReel && !activeReel.isLiked) {
                const liker = getCurrentUserLiker();
                if (liker) {
                  likeGlobalTrail(activeReel.id, true, liker);
                  setTrails((prev) =>
                    prev.map((t, idx) => {
                      if (idx === currentIndex) {
                        const currentLikers = Array.isArray(t.likedBy) ? t.likedBy : [];
                        const cleanU = (liker.username || '').toLowerCase().replace(/^@+/, '');
                        const updatedLikers = [liker, ...currentLikers.filter((u) => (u.username || '').toLowerCase().replace(/^@+/, '') !== cleanU)];

                        return {
                          ...t,
                          isLiked: true,
                          likesCount: updatedLikers.length,
                          likedBy: updatedLikers
                        };
                      }
                      return t;
                    })
                  );
                }
              }
              setShowHeartBurst(true);
              setTimeout(() => setShowHeartBurst(false), 950);
              lastTapRef.current = 0;
              return;
            }
            lastTapRef.current = now;
            togglePlay();
          }}
          className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center cursor-pointer group"
        >
          {/* Instagram Double-Tap Heart Burst Animation */}
          {showHeartBurst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in fade-in zoom-in duration-150">
              <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center animate-bounce">
                <Heart className="w-full h-full fill-red-500 text-red-500 drop-shadow-[0_10px_35px_rgba(239,68,68,0.9)]" />
              </div>
            </div>
          )}
          {/* Ambient blurred backdrop for non-9:16 aspect ratios */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {activeReel.mediaType === 'image' || activeMediaUrl.startsWith('data:image') ? (
              <img
                src={activeMediaUrl || activeReel.posterUrl || activeReel.videoUrl}
                alt=""
                className="w-full h-full object-cover blur-2xl opacity-35 scale-110"
              />
            ) : (
              <img
                src={activeReel.posterUrl || activeMediaUrl}
                alt=""
                className="w-full h-full object-cover blur-2xl opacity-35 scale-110"
              />
            )}
          </div>

          {/* Video or Image Media Player - Sticking to original aspect ratio */}
          {activeReel.mediaType === 'image' || activeMediaUrl.startsWith('data:image') ? (
            <img
              src={activeMediaUrl || activeReel.posterUrl || activeReel.videoUrl}
              alt={activeReel.caption}
              className="relative z-10 w-full h-full object-contain select-none"
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
              autoPlay={isActive && !showUploadModal && !showLikesModal}
              preload={isActive ? 'auto' : 'none'}
              muted={isMuted}
              className="relative z-10 w-full h-full object-contain"
              onPlay={() => {
                if (!isActive || showUploadModal || showLikesModal) {
                  videoRef.current?.pause();
                  setIsPlaying(false);
                  return;
                }
                setIsPlaying(true);
              }}
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

        {/* Right Action Sidebar (Instagram Reels style - Above playline) */}
        <div className="absolute right-4 sm:right-8 bottom-[160px] sm:bottom-[170px] z-20 flex flex-col items-center gap-3.5 sm:gap-4 pointer-events-auto">
          {/* Like Button & Likes Count */}
          <div className="flex flex-col items-center gap-1 group/btn">
            <button
              type="button"
              onClick={handleLike}
              className="flex flex-col items-center cursor-pointer transition-transform active:scale-75"
              title={activeReel.isLiked ? 'Unlike' : 'Like'}
            >
              <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 shadow-xl ${
                activeReel.isLiked ? 'bg-red-500/20 text-red-500 scale-110' : 'bg-black/50 hover:bg-black/70 text-white'
              }`}>
                <Heart className={`w-6 h-6 transition-transform ${
                  activeReel.isLiked ? 'fill-red-500 stroke-red-500' : 'stroke-white hover:scale-105'
                }`} />
              </div>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowLikesModal(true);
              }}
              className="text-xs font-bold text-white drop-shadow-md hover:text-emerald-400 hover:underline transition-all cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-black/40"
              title="View profiles who liked this trail"
            >
              {activeReel.likesCount}
            </button>
          </div>

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
        </div>

        {/* Bottom Left Info & Caption Overlay (Above playline & low bottom nav) */}
        {(() => {
          const creator = activeReel?.creator || DEFAULT_TRAIL_CREATOR;
          const creatorUsername = (creator.username || '').toLowerCase().replace(/^@/, '');
          const creatorCleanDisplay = (creator.username || creator.name || 'creator').replace(/^@/, '');
          const isOwnTrail = Boolean(
            (currentUsername && creatorUsername && creatorUsername === currentUsername) ||
            (session?.user?.id && creator.id && creator.id === session.user.id)
          );
          const isFollowed = isUserFollowing(currentUsername, creator.username) || !!creator.isFollowed;

          return (
            <div className="absolute left-4 sm:left-8 right-20 sm:right-28 bottom-[160px] sm:bottom-[170px] z-20 space-y-2.5 pointer-events-none max-w-xl">
              {/* Creator Row: Photo beside Profile Username (Only Username, No Full Name) + Follow Button */}
              <div className="flex items-center gap-2.5 pointer-events-auto">
                {/* Clean Circular Photo (Instagram Reels style - no ring) */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(
                      new CustomEvent('roamai_view_traveller', {
                        detail: {
                          id: creator.id,
                          username: creator.username,
                          name: creator.name,
                          avatarUrl: creator.avatarUrl,
                          location: activeReel?.destination || '',
                          isFollowing: isFollowed
                        }
                      })
                    );
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shadow-md shrink-0 bg-neutral-900 border border-white/15 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  title={`View ${creator.username}'s profile`}
                >
                  {creator.avatarUrl ? (
                    <img
                      src={creator.avatarUrl}
                      alt={creator.username}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-white font-bold text-xs select-none">
                      {creatorCleanDisplay.charAt(0).toUpperCase() || 'T'}
                    </div>
                  )}
                </div>

                {/* Username only (no full name) */}
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(
                      new CustomEvent('roamai_view_traveller', {
                        detail: {
                          id: creator.id,
                          username: creator.username,
                          name: creator.name,
                          avatarUrl: creator.avatarUrl,
                          location: activeReel?.destination || '',
                          isFollowing: isFollowed
                        }
                      })
                    );
                  }}
                  className="text-sm font-bold text-white tracking-wide drop-shadow-md cursor-pointer hover:underline"
                >
                  {creatorCleanDisplay}
                </span>

                {/* Verified Badge (only if creator is verified) */}
                {creator.isVerified && (
                  <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-xs" title="Verified Creator">
                    ✓
                  </span>
                )}

                {/* Follow / Following Button (hidden for own profile) */}
                {!isOwnTrail && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isFollowed) {
                        setUnfollowConfirmCreator(creator);
                      } else {
                        followUser(
                          {
                            id: session?.user?.id,
                            username: currentUsername,
                            name: cachedUser?.name || currentUsername,
                            avatarUrl: cachedUser?.avatarUrl
                          },
                          {
                            id: creator.id,
                            username: creator.username,
                            name: creator.name,
                            avatarUrl: creator.avatarUrl
                          }
                        );
                        setTrails((prev) =>
                          prev.map((t, idx) => {
                            if (idx === currentIndex) {
                              return {
                                ...t,
                                creator: { ...(t.creator || DEFAULT_TRAIL_CREATOR), isFollowed: true }
                              };
                            }
                            return t;
                          })
                        );
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      isFollowed
                        ? 'bg-white/20 border-white/30 text-white'
                        : isFollowedBy(currentUsername, creator.username)
                        ? 'bg-[#0095f6] border-transparent text-white'
                        : 'bg-transparent hover:bg-white/15 border-white/60 text-white'
                    }`}
                  >
                    {isFollowed ? 'Following' : (isFollowedBy(currentUsername, creator.username) ? 'Follow Back' : 'Follow')}
                  </button>
                )}
              </div>

              {/* Caption */}
              <p className="text-xs sm:text-sm text-neutral-100 line-clamp-2 leading-relaxed drop-shadow-sm font-medium">
                {activeReel?.caption || ''}
              </p>

              {/* Destination Badge */}
              <div className="flex items-center gap-2 flex-wrap pointer-events-auto pt-0.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{activeReel.destination}</span>
                </span>
              </div>
            </div>
          );
        })()}

        {/* Video Playline directly above low Bottom Navigation Bar (matches Instagram Reels design) */}
        <div 
          onClick={handlePlaylineClick}
          className="absolute bottom-[114px] sm:bottom-[122px] left-4 right-4 sm:left-8 sm:right-8 z-30 h-4 flex items-center cursor-pointer pointer-events-auto group/playline"
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

      {/* Trail Likes Modal (Instagram Reels Style) */}
      <TrailLikesModal
        isOpen={showLikesModal}
        onClose={() => setShowLikesModal(false)}
        trailId={activeReel?.id || ''}
        trailTitle={activeReel?.title || activeReel?.destination}
        likesCount={activeReel?.likesCount || 0}
        initialLikers={activeReel?.likedBy}
        currentUser={getCurrentUserLiker()}
        onLikeTrail={() => {
          if (!session?.user) {
            if (onRequireAuth) onRequireAuth();
            return;
          }
          if (activeReel && !activeReel.isLiked) {
            handleLike({ stopPropagation: () => {} } as React.MouseEvent);
          }
        }}
      />

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
              accept="video/*,image/*"
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
                    <Film className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-base sm:text-lg font-bold text-white">
                      Upload Travel Trail
                    </h4>
                    <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                      Select a travel video or photo from your device to share with the community
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/50 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Select from device
                  </button>

                  <p className="text-[11px] text-zinc-500">
                    Supports MP4, MOV, WebM, JPG, PNG up to 100MB
                  </p>
                </div>
              </div>
            ) : (
              /* STEP 2: Instagram "New reel" layout (matching attached design) */
              <form id="upload-reel-form" onSubmit={handleUploadSubmit} className="flex flex-col h-full max-h-[92vh] sm:max-h-[850px] bg-black text-white">
                {/* Header: Circle Back Button & Centered "New reel" */}
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
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">New reel</h2>
                </div>

                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 max-w-md mx-auto w-full">
                  {/* Centered Preview Card sticking to original aspect ratio */}
                  <div className="relative w-full max-w-[280px] sm:max-w-xs min-h-[180px] max-h-[380px] mx-auto rounded-3xl overflow-hidden bg-black/95 border border-white/10 shadow-2xl flex items-center justify-center group">
                    {uploadVideoFile?.type.startsWith('image/') ? (
                      <>
                        <img
                          src={uploadPosterPreview || uploadVideoPreview}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 pointer-events-none scale-110"
                        />
                        <img
                          src={uploadPosterPreview || uploadVideoPreview}
                          alt="Trail preview"
                          className="relative z-10 max-h-[380px] w-auto max-w-full object-contain mx-auto"
                        />
                      </>
                    ) : (
                      <>
                        {uploadPosterPreview && (
                          <img
                            src={uploadPosterPreview}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 pointer-events-none scale-110"
                          />
                        )}
                        <video
                          src={uploadVideoPreview}
                          poster={uploadPosterPreview}
                          playsInline
                          loop
                          autoPlay={isPreviewPlaying}
                          muted
                          className="relative z-10 max-h-[380px] w-auto max-w-full object-contain mx-auto"
                        />
                      </>
                    )}

                    {/* "Preview" Pill on Top */}
                    <button
                      type="button"
                      onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                      className="absolute top-3 inset-x-0 mx-auto w-fit px-3.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-md border border-white/15 cursor-pointer shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      {isPreviewPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
                      <span>Preview</span>
                    </button>

                    {/* "Edit cover" Pill on Bottom */}
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="absolute bottom-3 inset-x-0 mx-auto w-fit px-4 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-semibold backdrop-blur-md border border-white/15 cursor-pointer shadow-md transition-all active:scale-95"
                    >
                      Edit cover
                    </button>
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

                  {/* Row 2: Add location > */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowLocationInput(!showLocationInput)}
                      className="w-full py-2 flex items-center justify-between text-left hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-white" />
                        <span className="text-sm sm:text-base font-semibold text-white">Add location</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        {uploadDestination && <span className="text-xs text-blue-400 font-medium truncate max-w-[140px]">{uploadDestination}</span>}
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    </button>

                    {showLocationInput && (
                      <div className="py-2 pl-8">
                        <input
                          type="text"
                          value={uploadDestination}
                          onChange={(e) => setUploadDestination(e.target.value)}
                          placeholder="Search location..."
                          className="w-full bg-[#1c1c1e] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                    )}

                    {/* Suggested Location Pills (Matching screenshot: Indian, Banglore, Sarjapur...) */}
                    <div className="flex items-center gap-2 overflow-x-auto py-2 pl-8 scrollbar-none">
                      {['Indian', 'Banglore', 'Sarjapur, Karnataka, India', 'Manali', 'Goa', 'Bali'].map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setUploadDestination(loc)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 cursor-pointer transition-colors ${
                            uploadDestination === loc
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'bg-[#262626] hover:bg-zinc-800 text-zinc-200'
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>

                    <p className="pl-8 pt-1 text-[11px] text-zinc-500 leading-snug">
                      People you share this content with can see the location.
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

      {/* Instagram Unfollow Confirmation Dialog for Trail Creator */}
      {unfollowConfirmCreator && (
        <div 
          className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setUnfollowConfirmCreator(null)}
        >
          <div 
            className="w-full max-w-[320px] bg-[#262626] rounded-2xl overflow-hidden shadow-2xl text-center animate-in zoom-in-95 duration-150 divide-y divide-neutral-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {unfollowConfirmCreator?.avatarUrl ? (
                <img
                  src={sanitizeAvatarUrl(unfollowConfirmCreator.avatarUrl)}
                  alt={unfollowConfirmCreator.username || 'Creator'}
                  className="w-16 h-16 rounded-full mx-auto object-cover mb-4 border border-neutral-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                  {unfollowConfirmCreator?.name?.charAt(0).toUpperCase() || unfollowConfirmCreator?.username?.replace(/^@/, '').charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <h3 className="text-base font-bold text-white leading-tight">
                Unfollow {(unfollowConfirmCreator?.username || 'user').startsWith('@') ? unfollowConfirmCreator?.username : `@${unfollowConfirmCreator?.username || 'user'}`}?
              </h3>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                Their posts and trails will no longer appear in your feed. They won't know you unfollowed them.
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (unfollowConfirmCreator) {
                  await unfollowUser(
                    {
                      id: session?.user?.id,
                      username: currentUsername
                    },
                    {
                      id: unfollowConfirmCreator.id,
                      username: unfollowConfirmCreator.username || ''
                    }
                  );
                  setTrails((prev) =>
                    prev.map((t, idx) => {
                      if (idx === currentIndex) {
                        return {
                          ...t,
                          creator: { ...(t.creator || DEFAULT_TRAIL_CREATOR), isFollowed: false }
                        };
                      }
                      return t;
                    })
                  );
                  setUnfollowConfirmCreator(null);
                }
              }}
              className="w-full py-3.5 text-sm font-bold text-red-500 hover:bg-neutral-700/30 transition-colors cursor-pointer"
            >
              Unfollow
            </button>

            <button
              type="button"
              onClick={() => setUnfollowConfirmCreator(null)}
              className="w-full py-3.5 text-sm font-normal text-white hover:bg-neutral-700/30 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
