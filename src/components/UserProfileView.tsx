import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Camera,
  Edit2,
  MapPin,
  Calendar,
  Compass,
  Mountain,
  Heart,
  User,
  Users,
  Check,
  CheckCircle2,
  Save,
  X,
  Share2,
  Sparkles,
  Plus,
  Play,
  Bookmark,
  LayoutGrid,
  Film,
  ChevronDown,
  Menu,
  Copy,
  Layers,
  Award,
  Flame,
  Volume2,
  VolumeX,
  Loader2,
  AtSign,
  LogIn,
  LogOut,
  Upload,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Hash,
  UserPlus,
  Pause
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { Trip, ThemeConfig, UserProfileData } from '../types';
import {
  getCachedUserProfile,
  updateUserProfileData,
  getSupabaseClient,
  sanitizeAvatarUrl,
  processAvatarImageFile
} from '../services/supabaseClient';
import {
  resolveTrailMediaUrl,
  saveTrailMedia,
  generateVideoPoster,
  deleteTrailMedia
} from '../services/trailMediaStorage';
import {
  fetchGlobalTrails,
  publishGlobalTrail,
  deleteGlobalTrail,
  TrailReel,
  sanitizeTrail
} from '../services/sharedTrailsService';
import { TrailsView } from './TrailsView';
import { EditCoverModal } from './EditCoverModal';
import { TrailLocationPickerModal, SelectedTrailLocation } from './TrailLocationPickerModal';
import { isTripCompleted, setTripCompletedLocal } from '../utils/tripCompletion';
import { calculateTravelDNA } from '../utils/travelDNA';
import { validateUsernameFormat, checkUsernameAvailability, claimUsername } from '../services/usernameService';
import { NavigationDrawer } from './NavigationDrawer';
import { FollowListModal } from './FollowListModal';
import { getFollowCounts, isFakeMockUser } from '../services/followService';


interface UserProfileViewProps {
  session: Session | null;
  currentTheme: ThemeConfig;
  trips: Trip[];
  onOpenTrip: (tripId: string) => void;
  onStartPlanning: (destination?: string) => void;
  onToggleTripCompleted?: (tripId: string) => void;
  onBack: () => void;
  onRequireAuth?: () => void;
  onNavigate?: (view: any) => void;
  onOpenThemeModal?: () => void;
  onOpenUploadPage?: () => void;
}

export interface UserTrailItem {
  id: string;
  title: string;
  destination: string;
  viewsCount: string;
  likesCount: string;
  videoUrl: string;
  posterUrl?: string;
  duration?: string;
  mediaType?: 'image' | 'video';
  caption?: string;
  rawTrail?: TrailReel;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  session,
  currentTheme,
  trips,
  onOpenTrip,
  onStartPlanning,
  onToggleTripCompleted,
  onBack,
  onRequireAuth,
  onNavigate,
  onOpenThemeModal,
  onOpenUploadPage
}) => {
  const user = session?.user;
  const userMeta = (user?.user_metadata || {}) as Record<string, any>;

  // Tabs: trips (completed journeys), trails (reels), dna (travel personality profile)
  const [activeTab, setActiveTab] = useState<'trips' | 'trails' | 'dna'>('trips');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  // Instagram-style Profile Photo Action Modal & View Picture Modal states
  const [showPhotoOptionsModal, setShowPhotoOptionsModal] = useState(false);
  const [showViewPhotoModal, setShowViewPhotoModal] = useState(false);

  // Active trail ID for full-screen Instagram Reels playback (same user only)
  const [activeReelTrailId, setActiveReelTrailId] = useState<string | null>(null);
  const [profileFullTrails, setProfileFullTrails] = useState<TrailReel[]>([]);
  const [selectedTrail, setSelectedTrail] = useState<UserTrailItem | null>(null);
  const [isModalMuted, setIsModalMuted] = useState(true);
  const [modalMediaUrl, setModalMediaUrl] = useState<string>('');
  const [modalMediaError, setModalMediaError] = useState<boolean>(false);
  const [isModalMediaLoading, setIsModalMediaLoading] = useState<boolean>(false);
  const [isModalPlaying, setIsModalPlaying] = useState<boolean>(true);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [trailToDelete, setTrailToDelete] = useState<UserTrailItem | null>(null);
  const [isDeletingTrail, setIsDeletingTrail] = useState<boolean>(false);

  // User uploaded trails from local storage - strictly filtered to this authenticated user
  const [userTrails, setUserTrails] = useState<UserTrailItem[]>(() => {
    try {
      const raw = localStorage.getItem('roamai_user_trails') || localStorage.getItem('tripwise_user_trails');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const currentUname = (userMeta.username || '').toLowerCase().replace(/^@/, '');
          const currentUnameNoUnderscore = currentUname.replace(/_/g, '');
          const currentUid = user?.id;
          if (!currentUname && !currentUid) return [];

          return parsed
            .filter(
              (t: any) =>
                t &&
                !t.id?.startsWith('sample-trail-') &&
                !isFakeMockUser(t.creator?.username) &&
                (
                  (currentUname && (
                    (t.creator?.username || '').toLowerCase().replace(/^@/, '') === currentUname ||
                    (t.creator?.username || '').toLowerCase().replace(/^@/, '').replace(/_/g, '') === currentUnameNoUnderscore
                  )) ||
                  (currentUid && (t.creator?.id === currentUid || String(t.creator?.id).replace(/^supa_/, '') === currentUid))
                )
            )
            .map((t: any) => ({
              id: t.id,
              title: t.title || t.caption || t.destination || '',
              destination: t.destination || '',
              viewsCount: t.viewsCount ? String(t.viewsCount) : '0',
              likesCount: t.likesCount ? String(t.likesCount) : '0',
              videoUrl: t.videoUrl,
              posterUrl: t.posterUrl,
              duration: t.duration,
              mediaType: t.mediaType || 'video',
              caption: t.caption || t.title || '',
              rawTrail: t
            }));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Listen for newly published trails from separate UploadTrailView page
  useEffect(() => {
    const handleUploaded = (e: any) => {
      const newTrail = e.detail;
      if (newTrail) {
        const sanitized = sanitizeTrail(newTrail);
        const item: UserTrailItem = {
          id: newTrail.id,
          title: newTrail.title || newTrail.caption || newTrail.destination || 'Travel Trail',
          destination: newTrail.destination || 'Travel Destination',
          viewsCount: String(newTrail.viewsCount || 0),
          likesCount: String(newTrail.likesCount || 0),
          videoUrl: newTrail.videoUrl,
          posterUrl: newTrail.posterUrl,
          duration: '0:30',
          mediaType: newTrail.mediaType || 'video',
          caption: newTrail.caption || newTrail.title,
          rawTrail: sanitized
        };
        setUserTrails((prev) => [item, ...prev.filter((p) => p.id !== item.id)]);
        setProfileFullTrails((prev) => [sanitized, ...prev.filter((p) => p.id !== sanitized.id)]);
      }
    };
    window.addEventListener('roamai_trail_uploaded', handleUploaded);
    return () => window.removeEventListener('roamai_trail_uploaded', handleUploaded);
  }, []);

  // Sync likes and views real-time to profile trails
  useEffect(() => {
    const handleLiked = (e: any) => {
      const { trailId, likesCount } = e.detail || {};
      if (!trailId) return;
      setProfileFullTrails((prev) =>
        prev.map((t) => (t.id === trailId ? { ...t, likesCount: typeof likesCount === 'number' ? likesCount : t.likesCount } : t))
      );
      setUserTrails((prev) =>
        prev.map((u) => (u.id === trailId ? { ...u, likesCount: String(typeof likesCount === 'number' ? likesCount : u.likesCount) } : u))
      );
    };

    const handleViewed = (e: any) => {
      const { trailId, viewsCount } = e.detail || {};
      if (!trailId) return;
      setProfileFullTrails((prev) =>
        prev.map((t) => (t.id === trailId ? { ...t, viewsCount: typeof viewsCount === 'number' ? viewsCount : t.viewsCount } : t))
      );
      setUserTrails((prev) =>
        prev.map((u) => (u.id === trailId ? { ...u, viewsCount: String(typeof viewsCount === 'number' ? viewsCount : u.viewsCount) } : u))
      );
    };

    const handleDeleted = (e: any) => {
      const { trailId } = e.detail || {};
      if (!trailId) return;
      setProfileFullTrails((prev) => prev.filter((t) => t.id !== trailId));
      setUserTrails((prev) => prev.filter((u) => u.id !== trailId));
    };

    window.addEventListener('roamai_trail_liked', handleLiked);
    window.addEventListener('roamai_trail_viewed', handleViewed);
    window.addEventListener('roamai_trail_deleted', handleDeleted);
    return () => {
      window.removeEventListener('roamai_trail_liked', handleLiked);
      window.removeEventListener('roamai_trail_viewed', handleViewed);
      window.removeEventListener('roamai_trail_deleted', handleDeleted);
    };
  }, []);

  // Fetch latest trails from backend/storage and sync user's trails
  useEffect(() => {
    fetchGlobalTrails().then((trails) => {
      if (!Array.isArray(trails)) return;
      const currentUname = (userMeta.username || '').toLowerCase().replace(/^@/, '');
      const currentUnameNoUnderscore = currentUname.replace(/_/g, '');
      const currentUid = user?.id;
      if (!currentUname && !currentUid) return;

      const myTrails = trails.filter((t: any) => {
        if (!t || t.id?.startsWith('sample-trail-') || isFakeMockUser(t.creator?.username)) return false;
        const cUname = (t.creator?.username || '').toLowerCase().replace(/^@/, '');
        const cUnameNoUnderscore = cUname.replace(/_/g, '');
        const cUid = t.creator?.id ? String(t.creator.id).replace(/^supa_/, '').replace(/^user_/, '') : '';
        return (
          (currentUname && (cUname === currentUname || (cUnameNoUnderscore && cUnameNoUnderscore === currentUnameNoUnderscore))) ||
          (currentUid && (cUid === currentUid || t.creator?.id === currentUid))
        );
      });

      if (myTrails.length > 0) {
        setProfileFullTrails(myTrails);
        setUserTrails(myTrails.map((t: any) => ({
          id: t.id,
          title: t.title || t.caption || t.destination || '',
          destination: t.destination || '',
          viewsCount: t.viewsCount ? String(t.viewsCount) : '0',
          likesCount: t.likesCount ? String(t.likesCount) : '0',
          videoUrl: t.videoUrl,
          posterUrl: t.posterUrl,
          duration: t.duration || '0:30',
          mediaType: t.mediaType || 'video',
          caption: t.caption || t.title || '',
          rawTrail: t
        })));
      }
    }).catch(() => {});
  }, [user?.id, userMeta.username]);

  // Trail Reel Upload Modal states
  const [isUploadTrailModalOpen, setIsUploadTrailModalOpen] = useState(false);
  const [trailFile, setTrailFile] = useState<File | null>(null);
  const [trailPreviewUrl, setTrailPreviewUrl] = useState<string>('');
  const [trailPosterUrl, setTrailPosterUrl] = useState<string>('');
  const [isEditCoverModalOpen, setIsEditCoverModalOpen] = useState<boolean>(false);
  const [trailDestination, setTrailDestination] = useState<string>('');
  const [trailCaption, setTrailCaption] = useState<string>('');
  const [trailTags, setTrailTags] = useState<string>('');
  const [isPublishingTrail, setIsPublishingTrail] = useState<boolean>(false);
  const [taggedPeopleTrail, setTaggedPeopleTrail] = useState<string>('');
  const [showTagInputTrail, setShowTagInputTrail] = useState<boolean>(false);
  const [showLocationInputTrail, setShowLocationInputTrail] = useState<boolean>(false);
  const [showHashtagSuggestionsTrail, setShowHashtagSuggestionsTrail] = useState<boolean>(false);
  const [isPreviewPlayingTrail, setIsPreviewPlayingTrail] = useState<boolean>(false);
  const [isTrailLocationModalOpen, setIsTrailLocationModalOpen] = useState<boolean>(false);
  const [uploadLocationErrorTrail, setUploadLocationErrorTrail] = useState<string | null>(null);
  const trailUploadInputRef = useRef<HTMLInputElement | null>(null);
  const trailCoverInputRef = useRef<HTMLInputElement | null>(null);

  // Automatically detect hashtags typed inside the combined caption & hashtags input box
  const detectedTrailHashtags = trailCaption.match(/#([a-zA-Z0-9_\u0080-\uFFFF]+)/g) 
    ? Array.from(new Set((trailCaption.match(/#([a-zA-Z0-9_\u0080-\uFFFF]+)/g) || []).map((t) => t.trim())))
    : [];

  const handleTrailCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setTrailPosterUrl(url);
    }
  };

  const handleSaveTrailDraft = () => {
    try {
      localStorage.setItem('roamai_reel_draft', JSON.stringify({
        caption: trailCaption,
        destination: trailDestination,
        taggedPeople: taggedPeopleTrail,
        tags: trailTags,
        date: new Date().toISOString()
      }));
    } catch {}
    setAvatarToast('Draft saved successfully');
    setTimeout(() => setAvatarToast(null), 3000);
    setIsUploadTrailModalOpen(false);
    handleResetTrailUpload();
  };

  const handleResetTrailUpload = () => {
    setTrailFile(null);
    setTrailPreviewUrl('');
    setTrailPosterUrl('');
    setTrailDestination('');
    setTrailCaption('');
    setTrailTags('');
    setTaggedPeopleTrail('');
    setShowTagInputTrail(false);
    setShowLocationInputTrail(false);
    setShowHashtagSuggestionsTrail(false);
    setIsPreviewPlayingTrail(false);
    setIsTrailLocationModalOpen(false);
    setUploadLocationErrorTrail(null);
    if (trailUploadInputRef.current) {
      trailUploadInputRef.current.value = '';
    }
    if (trailCoverInputRef.current) {
      trailCoverInputRef.current.value = '';
    }
  };

  const handleTrailFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTrailFile(file);
    const objUrl = URL.createObjectURL(file);
    setTrailPreviewUrl(objUrl);

    if (file.type.startsWith('video/')) {
      try {
        const poster = await generateVideoPoster(file);
        setTrailPosterUrl(poster);
      } catch {
        setTrailPosterUrl('');
      }
    } else {
      setTrailPosterUrl(objUrl);
    }
  };


  const handlePublishTrail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trailFile && !trailPreviewUrl) return;

    if (!trailDestination.trim()) {
      setUploadLocationErrorTrail('Location is mandatory for sharing a trail. Please choose a location.');
      setIsTrailLocationModalOpen(true);
      return;
    }

    try {
      setIsPublishingTrail(true);
      const trailId = `user-trail-${Date.now()}`;

      if (trailFile) {
        await saveTrailMedia(trailId, trailFile);
      }

      let poster = trailPosterUrl;
      if (!poster && trailFile && trailFile.type.startsWith('video/')) {
        try {
          poster = await generateVideoPoster(trailFile);
        } catch {
          // ignore
        }
      }

      const isImg = trailFile ? trailFile.type.startsWith('image/') : false;
      const cleanUsername = profile.username || getFallbackUsername(user, userMeta);
      const destinationVal = trailDestination.trim();
      const captionVal = trailCaption.trim();
      const cleanTitle = trailCaption.replace(/#\S+/g, '').trim() || destinationVal || '';
      const extractedTags = (trailCaption.match(/#([a-zA-Z0-9_\u0080-\uFFFF]+)/g) || []).map((t) => t.trim());

      const newTrailItem: UserTrailItem = {
        id: trailId,
        title: cleanTitle,
        destination: destinationVal,
        viewsCount: '0',
        likesCount: '0',
        videoUrl: trailPreviewUrl,
        posterUrl: poster || undefined,
        mediaType: isImg ? 'image' : 'video',
        caption: captionVal
      };

      const newReelForStorage: TrailReel = {
        id: trailId,
        videoUrl: trailPreviewUrl,
        posterUrl: poster || undefined,
        mediaType: isImg ? ('image' as const) : ('video' as const),
        title: cleanTitle,
        creator: {
          id: user?.id,
          name: profile.name,
          username: cleanUsername,
          avatarUrl: profile.avatarUrl,
          isFollowed: false,
          isVerified: false
        },
        caption: captionVal,
        destination: destinationVal,
        tags: extractedTags.length > 0 ? extractedTags : (trailTags ? trailTags.split(' ').filter(Boolean) : []),
        audioTitle: 'Original Audio',
        likesCount: 0,
        commentsCount: 0,
        viewsCount: 0,
        isLiked: false,
        likedBy: [],
        comments: []
      };

      try {
        await publishGlobalTrail(newReelForStorage, trailFile || undefined);
      } catch (err) {
        console.warn('Failed to publish trail globally from profile:', err);
      }

      setUserTrails((prev) => [newTrailItem, ...prev]);
      setProfileFullTrails((prev) => [sanitizeTrail(newReelForStorage), ...prev]);
      setIsUploadTrailModalOpen(false);
      handleResetTrailUpload();
      setActiveTab('trails');
      setAvatarToast('Trail uploaded to your profile!');
      setTimeout(() => setAvatarToast(null), 3500);
    } catch (err: any) {
      console.error('Error publishing trail:', err);
      alert('Failed to publish trail: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsPublishingTrail(false);
    }
  };

  // Resolve active media URL when previewing a trail
  useEffect(() => {
    if (!selectedTrail) {
      setModalMediaUrl('');
      setModalMediaError(false);
      setIsModalMediaLoading(false);
      return;
    }

    let isMounted = true;
    setIsModalMediaLoading(true);
    setModalMediaError(false);
    setIsModalPlaying(true);

    resolveTrailMediaUrl(selectedTrail.id, selectedTrail.videoUrl).then((resolved) => {
      if (isMounted) {
        setModalMediaUrl(resolved);
        setIsModalMediaLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedTrail?.id, selectedTrail?.videoUrl]);

  // Keyboard navigation for selectedTrail modal (Escape to close, Space to pause/play)
  useEffect(() => {
    if (!selectedTrail) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTrail(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrail]);

  const handleReplaceTrailMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTrail) return;

    try {
      setIsModalMediaLoading(true);
      setModalMediaError(false);

      await saveTrailMedia(selectedTrail.id, file);
      const poster = await generateVideoPoster(file);
      const newMediaUrl = URL.createObjectURL(file);
      const isImg = file.type.startsWith('image/');

      const updatedTrail: UserTrailItem = {
        ...selectedTrail,
        videoUrl: newMediaUrl,
        posterUrl: poster || selectedTrail.posterUrl,
        mediaType: isImg ? 'image' : 'video'
      };

      setSelectedTrail(updatedTrail);
      setModalMediaUrl(newMediaUrl);
      setUserTrails((prev) =>
        prev.map((t) => (t.id === selectedTrail.id ? updatedTrail : t))
      );

      try {
        const raw = localStorage.getItem('roamai_user_trails');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const updatedList = list.map((t: any) =>
              t.id === selectedTrail.id ? { ...t, ...updatedTrail } : t
            );
            localStorage.setItem('roamai_user_trails', JSON.stringify(updatedList));
          }
        }
      } catch (err) {
        console.warn('Failed to update trail in localStorage:', err);
      }
    } catch (err) {
      console.error('Failed to replace trail media:', err);
    } finally {
      setIsModalMediaLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteTrail = async (trailId: string) => {
    try {
      setIsDeletingTrail(true);
      await deleteTrailMedia(trailId);
    } catch {
      // ignore
    }
    try {
      await deleteGlobalTrail(trailId);
    } catch (err) {
      console.warn('Failed to delete global trail:', err);
    }
    setSelectedTrail(null);
    setTrailToDelete(null);
    setUserTrails((prev) => {
      const updated = prev.filter((t) => t.id !== trailId);
      try {
        localStorage.setItem('roamai_user_trails', JSON.stringify(updated));
        localStorage.setItem('tripwise_user_trails', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    setIsDeletingTrail(false);
    setAvatarToast('Trail deleted successfully');
    setTimeout(() => setAvatarToast(null), 3000);
  };

  // Filter ONLY completed trips for travel footprint counters (trips, countries, places)
  const completedTrips = React.useMemo(() => {
    return trips.filter((t) => isTripCompleted(t));
  }, [trips]);

  // Calculate unique places from completed trips and uploaded trails
  const calculatedPlacesCount = React.useMemo(() => {
    const places = new Set<string>();
    completedTrips.forEach((t) => {
      if (t.destination) places.add(t.destination.trim().toLowerCase());
      t.days?.forEach((d) => {
        d.activities?.forEach((a) => {
          if ((a as any).placeName) places.add((a as any).placeName.trim().toLowerCase());
        });
      });
    });
    userTrails.forEach((tr) => {
      if (tr.destination) places.add(tr.destination.trim().toLowerCase());
    });
    return places.size;
  }, [completedTrips, userTrails]);

  // Calculate unique countries from completed trips and uploaded trails
  const calculatedCountriesCount = React.useMemo(() => {
    const countries = new Set<string>();
    completedTrips.forEach((t) => {
      if ((t as any).destinationPlace?.country) {
        countries.add((t as any).destinationPlace.country.trim().toLowerCase());
      } else if (t.destination) {
        const parts = t.destination.split(',');
        if (parts.length > 1) {
          countries.add(parts[parts.length - 1].trim().toLowerCase());
        } else {
          countries.add(t.destination.trim().toLowerCase());
        }
      }
    });
    userTrails.forEach((tr) => {
      if (tr.destination) {
        const parts = tr.destination.split(',');
        if (parts.length > 1) {
          countries.add(parts[parts.length - 1].trim().toLowerCase());
        } else {
          countries.add(tr.destination.trim().toLowerCase());
        }
      }
    });
    return countries.size;
  }, [completedTrips, userTrails]);

  // Dynamically compute Travel DNA and Archetype based on completed trips
  const travelDNAAnalysis = React.useMemo(() => {
    return calculateTravelDNA(completedTrips);
  }, [completedTrips]);

  const getFallbackUsername = (u?: typeof user, meta?: Record<string, any>) => {
    if (meta?.username?.trim()) return meta.username.trim();
    if (u?.email) {
      return `@${u.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')}`;
    }
    return '@traveler';
  };

  const getFallbackName = (u?: typeof user, meta?: Record<string, any>) => {
    if (meta?.full_name?.trim()) return meta.full_name.trim();
    if (meta?.name?.trim()) return meta.name.trim();
    if (u?.email) {
      const emailPrefix = u.email.split('@')[0].replace(/[._]/g, ' ');
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
    return 'Traveler';
  };

  // Profile data states - dynamically mapped to current authenticated user
  const [profile, setProfile] = useState<UserProfileData>(() => {
    const cached = user ? getCachedUserProfile(user.id) : null;
    return {
      name: cached?.name || getFallbackName(user, userMeta),
      username: cached?.username || getFallbackUsername(user, userMeta),
      bio: cached?.bio || userMeta.bio || '',
      avatarUrl: sanitizeAvatarUrl(cached?.avatarUrl || userMeta.avatar_url || userMeta.avatarUrl || ''),
      dob: cached?.dob || userMeta.dob || '',
      place: cached?.place || userMeta.place || '',
      email: user?.email || '',
      travelDNA: travelDNAAnalysis.hasCompletedTrips ? travelDNAAnalysis.scores : (cached?.travelDNA || undefined),
      travelPreferences: travelDNAAnalysis.hasCompletedTrips ? {
        transport: travelDNAAnalysis.preferences.transport,
        pace: travelDNAAnalysis.preferences.pace,
        budget: travelDNAAnalysis.preferences.budget,
        accommodation: travelDNAAnalysis.preferences.accommodation,
        food: cached?.travelPreferences?.food || 'Open to local food'
      } : (cached?.travelPreferences || {
        transport: 'Road trips (Car/Bike)',
        pace: 'Balanced',
        budget: 'Flexible',
        accommodation: 'Homestays & Boutique Stays',
        food: 'Open to local food'
      }),
      stats: {
        tripsCount: completedTrips.length,
        placesCount: calculatedPlacesCount,
        countriesCount: calculatedCountriesCount,
        postsCount: completedTrips.length + userTrails.length,
        followersCount: getFollowCounts({ id: user?.id, username: cached?.username || getFallbackUsername(user, userMeta) }).followersCount,
        followingCount: getFollowCounts({ id: user?.id, username: cached?.username || getFallbackUsername(user, userMeta) }).followingCount,
        level: 'Travel Explorer',
        levelNumber: Math.max(1, Math.min(10, Math.floor(completedTrips.length / 2) + 1))
      }
    };
  });

  const [editForm, setEditForm] = useState<UserProfileData>(profile);
  const [editUsernameError, setEditUsernameError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarToast, setAvatarToast] = useState<string | null>(null);

  // Followers & Following Modal State
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers');

  const headerFileInputRef = useRef<HTMLInputElement | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);


  // Sync profile when user identity or metadata changes
  useEffect(() => {
    const cached = user ? getCachedUserProfile(user.id) : null;
    const name = cached?.name || getFallbackName(user, userMeta);
    const username = cached?.username || getFallbackUsername(user, userMeta);
    const avatarUrl = sanitizeAvatarUrl(cached?.avatarUrl || userMeta.avatar_url || userMeta.avatarUrl || '');
    const place = cached?.place || userMeta.place || '';
    const bio = cached?.bio || userMeta.bio || '';
    const dob = cached?.dob || userMeta.dob || '';

    const synced: UserProfileData = {
      name,
      username,
      avatarUrl,
      place,
      bio,
      dob,
      email: user?.email || '',
      travelDNA: travelDNAAnalysis.hasCompletedTrips ? (travelDNAAnalysis.scores as any) : undefined,
      travelPreferences: travelDNAAnalysis.hasCompletedTrips ? {
        transport: travelDNAAnalysis.preferences.transport,
        pace: travelDNAAnalysis.preferences.pace,
        budget: travelDNAAnalysis.preferences.budget,
        accommodation: travelDNAAnalysis.preferences.accommodation,
        food: cached?.travelPreferences?.food || profile.travelPreferences?.food || 'Open to local food'
      } : (cached?.travelPreferences || profile.travelPreferences),
      stats: {
        tripsCount: completedTrips.length,
        placesCount: calculatedPlacesCount,
        countriesCount: calculatedCountriesCount,
        postsCount: completedTrips.length + userTrails.length,
        followersCount: getFollowCounts({ id: user?.id, username }).followersCount,
        followingCount: getFollowCounts({ id: user?.id, username }).followingCount,
        level: 'Travel Explorer',
        levelNumber: Math.max(1, Math.min(10, Math.floor(completedTrips.length / 2) + 1))
      }
    };

    setProfile(synced);
    setEditForm(synced);

    if (user?.id) {
      try {
        localStorage.setItem(`tripwise_user_profile_${user.id}`, JSON.stringify(synced));
        const supabase = getSupabaseClient();
        if (supabase) {
          supabase.from('profiles').upsert({
            id: user.id,
            username: synced.username,
            name: synced.name,
            avatar_url: synced.avatarUrl,
            bio: synced.bio,
            place: synced.place,
            location: synced.place || 'Traveler',
            trips_count: completedTrips.length,
            places_count: calculatedPlacesCount,
            countries_count: calculatedCountriesCount,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' }).then(() => {}).catch(() => {});
        }
      } catch {}
    }
  }, [
    user?.id,
    user?.email,
    userMeta?.full_name,
    userMeta?.name,
    userMeta?.avatar_url,
    userMeta?.avatarUrl,
    userMeta?.username,
    userMeta?.place,
    completedTrips.length,
    calculatedPlacesCount,
    calculatedCountriesCount,
    travelDNAAnalysis
  ]);

  // Listen to real-time follow/unfollow actions across the app
  useEffect(() => {
    const handleFollowChanged = () => {
      const counts = getFollowCounts({ id: user?.id, username: profile.username });
      setProfile((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          followersCount: counts.followersCount,
          followingCount: counts.followingCount
        }
      }));
    };

    window.addEventListener('roamai_follow_changed', handleFollowChanged);
    window.addEventListener('storage', handleFollowChanged);
    return () => {
      window.removeEventListener('roamai_follow_changed', handleFollowChanged);
      window.removeEventListener('storage', handleFollowChanged);
    };
  }, [user?.id, profile.username]);


  // Sync profile-specific trails from global trails (server API & Supabase)
  useEffect(() => {
    let isMounted = true;
    const loadProfileTrails = async () => {
      try {
        const allTrails = await fetchGlobalTrails();
        if (!isMounted) return;
        const targetUsername = (profile.username || getFallbackUsername(user, userMeta)).toLowerCase().replace(/^@/, '');
        const targetName = (profile.name || '').toLowerCase().trim();

        const rawFiltered: TrailReel[] = allTrails
          .filter((t: any) => {
            if (!t || t.id?.startsWith('sample-trail-') || isFakeMockUser(t.creator?.username)) return false;
            const creatorUsername = (t.creator?.username || '').toLowerCase().replace(/^@/, '');
            const creatorId = t.creator?.id;
            return (
              (targetUsername && creatorUsername === targetUsername) ||
              (user?.id && creatorId === user.id)
            );
          })
          .map(sanitizeTrail);

        setProfileFullTrails(rawFiltered);

        const filtered: UserTrailItem[] = rawFiltered.map((t: TrailReel) => ({
          id: t.id,
          title: t.title || t.caption || t.destination || 'Travel Trail',
          destination: t.destination || 'Travel Destination',
          viewsCount: String(t.viewsCount || 0),
          likesCount: String(t.likesCount || 0),
          videoUrl: t.videoUrl,
          posterUrl: t.posterUrl,
          duration: (t as any).duration,
          mediaType: t.mediaType || 'video',
          caption: t.caption || t.title,
          rawTrail: t
        }));

        setUserTrails((prev) => {
          const prevIds = prev.map((p) => p.id).join(',');
          const nextIds = filtered.map((f) => f.id).join(',');
          return prevIds !== nextIds ? filtered : prev;
        });
      } catch (err) {
        console.warn('Could not sync user profile trails:', err);
      }
    };

    loadProfileTrails();
  }, [profile.username, profile.name, user?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditUsernameError(null);

    const currentClean = (profile.username || '').replace(/^@/, '').toLowerCase().trim();
    const newClean = (editForm.username || '').replace(/^@/, '').toLowerCase().trim();

    // Check if username changed and validate uniqueness
    if (newClean && newClean !== currentClean) {
      const formatCheck = validateUsernameFormat(newClean);
      if (!formatCheck.isValid) {
        setEditUsernameError(formatCheck.error || 'Invalid username format.');
        return;
      }

      setIsSavingProfile(true);
      try {
        const availability = await checkUsernameAvailability(newClean, user?.id);
        if (!availability.available) {
          setEditUsernameError(availability.error || 'This username is already taken by another account.');
          setIsSavingProfile(false);
          return;
        }

        // Claim username across server and database
        await claimUsername(newClean, user?.id || 'local_user', user?.email || undefined);
      } catch (err) {
        console.error('Failed to verify username availability:', err);
      }
    }

    const updatedData: UserProfileData = {
      ...editForm,
      username: newClean ? `@${newClean}` : editForm.username
    };

    setProfile(updatedData);
    setIsSavingProfile(false);
    setIsEditModalOpen(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    if (user) {
      await updateUserProfileData(updatedData);
    } else {
      try {
        localStorage.setItem('tripwise_user_profile_guest', JSON.stringify(updatedData));
      } catch {
        // ignore
      }
    }
  };

  const handleUploadPhoto = async (file: File) => {
    try {
      setIsUploadingAvatar(true);
      const dataUrl = await processAvatarImageFile(file, 512, 0.85);
      const updated: UserProfileData = {
        ...profile,
        avatarUrl: dataUrl
      };
      setProfile(updated);
      setEditForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
      if (user) {
        await updateUserProfileData(updated);
      } else {
        try {
          localStorage.setItem('tripwise_user_profile_guest', JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      setAvatarToast('Profile photo updated!');
      setTimeout(() => setAvatarToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to process image:', err);
      alert(err?.message || 'Failed to process image.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setIsUploadingAvatar(true);
      setShowPhotoOptionsModal(false);
      setShowViewPhotoModal(false);
      const updated: UserProfileData = {
        ...profile,
        avatarUrl: ''
      };
      setProfile(updated);
      setEditForm((prev) => ({ ...prev, avatarUrl: '' }));
      if (user) {
        await updateUserProfileData(updated);
      } else {
        try {
          localStorage.setItem('tripwise_user_profile_guest', JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      setAvatarToast('Profile photo removed');
      setTimeout(() => setAvatarToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to remove photo:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleModalPhotoSelect = async (file: File) => {
    try {
      setIsUploadingAvatar(true);
      const dataUrl = await processAvatarImageFile(file, 512, 0.85);
      setEditForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
    } catch (err: any) {
      console.error('Failed to process image:', err);
      alert(err?.message || 'Failed to process image.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleShareProfile = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  };

  const handleToggleCompleted = (tripId: string) => {
    const currentTrip = trips.find((t) => t.id === tripId);
    const willBeCompleted = currentTrip ? !isTripCompleted(currentTrip) : true;
    setTripCompletedLocal(tripId, willBeCompleted);
    if (onToggleTripCompleted) {
      onToggleTripCompleted(tripId);
    }
  };

  // Only display completed trips in profile as requested
  const displayTrips = trips
    .filter((t) => isTripCompleted(t))
    .map((t) => ({
      id: t.id,
      destination: t.destination,
      date: t.startDate || 'Recent',
      duration: `${t.durationDays} days`,
      cost: t.budgetTier,
      imageUrl: (t as any).destinationPlace?.photoUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80',
      isCarousel: (t.days?.length || 0) > 1,
      isCompleted: true
    }));

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

      {avatarToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-950 text-emerald-200 text-xs font-semibold shadow-2xl border border-emerald-500/40 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{avatarToast}</span>
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

        {/* Center: Username with dropdown (or Profile when signed out) */}
        <div 
          onClick={() => {
            if (session) {
              setIsEditModalOpen(true);
            } else {
              onRequireAuth?.();
            }
          }}
          className="flex items-center gap-1 cursor-pointer select-none group"
        >
          <span className="font-bold text-base sm:text-lg text-white tracking-tight group-hover:text-zinc-300 transition-colors">
            {session ? (profile.username?.replace('@', '') || (user?.email ? user.email.split('@')[0] : 'profile')) : 'Profile'}
          </span>
          {session && <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />}
        </div>

        {/* Right: Hamburger menu - opens same 3-lines slider as home page */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-1 text-white hover:text-zinc-300 transition-colors cursor-pointer"
            aria-label="Open Navigation Drawer"
            title="Menu & Navigation"
          >
            <Menu className="w-6 h-6 stroke-[2]" />
          </button>
        </div>
      </header>

      {!session ? (
        /* Signed-Out State with prominent Login Button */
        <div className="px-4 sm:px-6 pt-12 pb-24 max-w-md mx-auto flex flex-col items-center text-center animate-fade-in">
          {/* Clean Avatar (no ring) */}
          <div className="relative mb-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shadow-xl">
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${currentTheme.primaryColor}18` }}
              >
                <User className="w-12 h-12 stroke-[1.8]" style={{ color: currentTheme.primaryColor }} />
              </div>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2.5">
            Sign in to TripWise
          </h2>
          <p className="text-sm text-zinc-400 font-medium max-w-sm leading-relaxed mb-8">
            Log in to access your personal profile, view your saved itineraries, track visited countries, and share your travel trails.
          </p>

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            <button
              onClick={() => onRequireAuth?.()}
              className="w-full py-3.5 px-6 rounded-2xl text-white font-bold shadow-xl flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-sm sm:text-base"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              <LogIn className="w-5 h-5 stroke-[2.2]" />
              <span>Sign In / Log In</span>
            </button>

            <button
              onClick={() => onRequireAuth?.()}
              className="w-full py-3 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
            >
              Don't have an account? Sign Up
            </button>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full mt-10 text-left">
            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-850">
              <Bookmark className="w-4 h-4 mb-1.5" style={{ color: currentTheme.primaryColor }} />
              <p className="text-xs font-bold text-white leading-snug">Saved Trips</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Keep plans synced</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-850">
              <MapPin className="w-4 h-4 mb-1.5" style={{ color: currentTheme.primaryColor }} />
              <p className="text-xs font-bold text-white leading-snug">World Map</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Track countries</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-855">
              <Film className="w-4 h-4 mb-1.5" style={{ color: currentTheme.primaryColor }} />
              <p className="text-xs font-bold text-white leading-snug">Travel Trails</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Post travel trails</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 2. PROFILE HEADER: AVATAR & STATS (POSTS, FOLLOWERS, FOLLOWING) */}
          <div className="px-4 sm:px-6 pt-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-6 sm:gap-8">
          {/* Circular Avatar with Instagram '+' Badge & Tap to Open Instagram Photo Menu */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
            <input
              ref={headerFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadPhoto(file);
                if (e.target) e.target.value = '';
              }}
            />

            {/* Clean Avatar without Ring (Instagram profile style) */}
            <div 
              onClick={() => {
                if (profile.avatarUrl) {
                  setShowPhotoOptionsModal(true);
                } else {
                  headerFileInputRef.current?.click();
                }
              }}
              className="w-full h-full rounded-full overflow-hidden border border-white/15 bg-neutral-900 flex items-center justify-center relative cursor-pointer shadow-lg group select-none"
              title="Profile photo"
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-emerald-600 via-teal-700 to-indigo-800 text-white font-black text-2xl sm:text-3xl select-none group-hover:brightness-110 transition-all">
                  {profile.name?.charAt(0).toUpperCase() || 'T'}
                </div>
              )}

              {/* Upload Hover Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                <Camera className="w-5 h-5 drop-shadow" />
              </div>

              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/75 flex items-center justify-center text-white">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>

            {/* Instagram-style Blue '+' Badge Button at Bottom Right */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPhotoOptionsModal(true);
              }}
              className="absolute bottom-0 right-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#0095f6] text-white border-2 border-black flex items-center justify-center font-black shadow-lg cursor-pointer hover:bg-[#1877f2] hover:scale-110 active:scale-95 transition-all"
              title="Profile photo options"
              aria-label="Profile photo options"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
            </button>
          </div>

          {/* Right Column: Name and Stats (post | followers | following) */}
          <div className="flex-1 flex flex-col justify-center">
            {/* User Full Name & Level Badge */}
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {profile.name}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Award className="w-3 h-3" />
                <span>Level {profile.stats?.levelNumber || 1}</span>
              </span>
            </div>

            {/* STATS IN ONE STRAIGHT LINE: POST | FOLLOWERS | FOLLOWING */}
            <div className="flex items-center justify-between text-center max-w-[280px] sm:max-w-[340px] pt-1">
              {/* Posts */}
              <div 
                onClick={() => setActiveTab('trips')}
                className="cursor-pointer group flex-1"
              >
                <span className="block font-bold text-base sm:text-lg text-white group-hover:text-zinc-300 transition-colors leading-tight">
                  {displayTrips.length + userTrails.length}
                </span>
                <span className="block text-xs text-zinc-300 font-normal mt-0.5">
                  {displayTrips.length + userTrails.length === 1 ? 'post' : 'posts'}
                </span>
              </div>

              {/* Followers */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFollowModalTab('followers');
                  setIsFollowModalOpen(true);
                }}
                className="cursor-pointer group flex-1 bg-transparent border-0 p-0 text-center active:scale-95 transition-transform"
                title="View followers"
                aria-label="View followers"
              >
                <span className="block font-bold text-base sm:text-lg text-white group-hover:text-neutral-300 transition-colors leading-tight">
                  {profile.stats?.followersCount ?? 0}
                </span>
                <span className="block text-xs text-zinc-300 font-normal mt-0.5 group-hover:text-white transition-colors">
                  followers
                </span>
              </button>

              {/* Following */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFollowModalTab('following');
                  setIsFollowModalOpen(true);
                }}
                className="cursor-pointer group flex-1 bg-transparent border-0 p-0 text-center active:scale-95 transition-transform"
                title="View following"
                aria-label="View following"
              >
                <span className="block font-bold text-base sm:text-lg text-white group-hover:text-neutral-300 transition-colors leading-tight">
                  {profile.stats?.followingCount ?? 0}
                </span>
                <span className="block text-xs text-zinc-300 font-normal mt-0.5 group-hover:text-white transition-colors">
                  following
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Bio & Details */}
        <div className="mt-3 text-left">
          {profile.bio && (
            <p className="text-xs sm:text-sm text-zinc-200 font-normal leading-relaxed whitespace-pre-line mb-1">
              {profile.bio}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium flex-wrap">
            <span className="text-zinc-500 font-mono">
              {profile.username || getFallbackUsername(user, userMeta)}
            </span>
          </div>
        </div>

        {/* Action Buttons: Edit profile | Share profile */}
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
        </div>

        {/* 3. DEDICATED TRAVEL STATS SECTION: ONLY COMPLETED TRIPS COUNT */}
        <div className="mt-4 p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md">
          <div className="flex items-center justify-around text-center divide-x divide-zinc-800">
            {/* Completed Trips */}
            <div 
              onClick={() => setActiveTab('trips')}
              className="flex-1 px-2 cursor-pointer group transition-transform active:scale-95"
              title="Completed Trips"
            >
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <Compass className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
                <span className="font-extrabold text-base sm:text-lg text-white group-hover:text-emerald-400 transition-colors leading-tight">
                  {completedTrips.length}
                </span>
              </div>
              <span className="block text-[11px] sm:text-xs text-zinc-400 font-medium tracking-wide">
                trips
              </span>
            </div>

            {/* Countries Visited (Completed Trips Only) */}
            <div 
              onClick={() => setActiveTab('trips')}
              className="flex-1 px-2 cursor-pointer group transition-transform active:scale-95"
              title="Countries visited on completed trips"
            >
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <MapPin className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                <span className="font-extrabold text-base sm:text-lg text-white group-hover:text-teal-400 transition-colors leading-tight">
                  {calculatedCountriesCount}
                </span>
              </div>
              <span className="block text-[11px] sm:text-xs text-zinc-400 font-medium tracking-wide">
                countries
              </span>
            </div>

            {/* Places Visited (Completed Trips Only) */}
            <div 
              onClick={() => setActiveTab('trips')}
              className="flex-1 px-2 cursor-pointer group transition-transform active:scale-95"
              title="Places visited on completed trips"
            >
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <Mountain className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="font-extrabold text-base sm:text-lg text-white group-hover:text-cyan-400 transition-colors leading-tight">
                  {calculatedPlacesCount}
                </span>
              </div>
              <span className="block text-[11px] sm:text-xs text-zinc-400 font-medium tracking-wide">
                places
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. THREE PROFILE TABS: TRIPS (COMPLETED TRIPS), TRAILS (REELS), TRAVEL DNA */}
      <div className="max-w-2xl mx-auto mt-4 border-t border-zinc-850">
        <div className="flex items-center">
          {/* 1. Completed Trips Tab (Grid icon) */}
          <button
            onClick={() => setActiveTab('trips')}
            className={`flex-1 py-3 flex items-center justify-center relative transition-colors cursor-pointer ${
              activeTab === 'trips' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Completed Trips"
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
            title="Trails (User Uploaded Trails)"
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
        </div>

        {/* 4. CONTENT GRIDS */}
        {/* --- TAB 1: TRIPS (3-COLUMN MEDIA GRID) --- */}
        {activeTab === 'trips' && (
          <div>
            {displayTrips.length === 0 ? (
              <div className="py-20 px-4 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white">No Completed Trips Yet</h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Only completed trips appear in your profile gallery and travel footprint. Mark your planned trips as completed to display them here!
                </p>
                <button
                  onClick={() => onStartPlanning()}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Plan a Trip
                </button>
              </div>
            ) : (
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

                    {/* Top-Left Completed Badge / Interactive Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCompleted(trip.id);
                      }}
                      className="absolute top-1.5 left-1.5 z-10 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold flex items-center gap-1 shadow-md transition-all cursor-pointer backdrop-blur-md bg-emerald-500 hover:bg-emerald-600 text-white"
                      title="Completed trip (Click to unmark)"
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>Completed</span>
                    </button>

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
          </div>
        )}

        {/* --- TAB 2: TRAILS (3-COLUMN VIDEO GRID) --- */}
        {activeTab === 'trails' && (
          <div>
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-850 mb-1">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-emerald-400" />
                <span>Travel Trails ({userTrails.length})</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (onOpenUploadPage) {
                    onOpenUploadPage();
                  } else if (onNavigate) {
                    onNavigate('upload_trail');
                  } else {
                    setIsUploadTrailModalOpen(true);
                  }
                }}
                className="px-3 py-1 rounded-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md active:scale-95"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>Upload Trail</span>
              </button>
            </div>

            {userTrails.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
                  <Film className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-bold text-white">No Trails Uploaded Yet</h4>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                    Share your travel moments, video clips, and photo trails with the TripWise community.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenUploadPage) {
                      onOpenUploadPage();
                    } else if (onNavigate) {
                      onNavigate('upload_trail');
                    } else {
                      setIsUploadTrailModalOpen(true);
                    }
                  }}
                  className="px-5 py-2.5 rounded-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 mx-auto shadow-xl shadow-emerald-950/50 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Upload First Trail</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 sm:gap-1 mt-0.5">
                {userTrails.map((trail) => (
                  <div
                    key={trail.id}
                    onClick={() => setActiveReelTrailId(trail.id)}
                    className="relative aspect-[9/16] overflow-hidden group cursor-pointer bg-zinc-900"
                  >
                    {trail.posterUrl ? (
                      <img
                        src={trail.posterUrl}
                        alt={trail.title || trail.destination}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-linear-to-b from-zinc-850 to-zinc-950 text-center select-none">
                        <Film className="w-7 h-7 text-emerald-400 mb-1.5 opacity-90" />
                        <p className="text-[11px] font-bold text-white line-clamp-1">{trail.destination}</p>
                        <p className="text-[9px] text-zinc-400 line-clamp-1">{trail.title || 'Travel Trail'}</p>
                      </div>
                    )}

                    {/* Dark Vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                    {/* Bottom-left: Play Icon + Views Count (Instagram Reels style) */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold drop-shadow-md">
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{trail.viewsCount || '0'}</span>
                    </div>

                    {/* Duration in top left */}
                    {trail.duration && (
                      <div className="absolute top-2 left-2 z-10 text-[10px] font-semibold text-white/80 bg-black/50 px-1.5 py-0.5 rounded-sm">
                        {trail.duration}
                      </div>
                    )}

                    {/* Delete button on grid card (top right) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTrailToDelete(trail);
                      }}
                      className="absolute top-2 right-2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/65 hover:bg-rose-600 text-white flex items-center justify-center backdrop-blur-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer shadow-lg hover:scale-110 active:scale-95"
                      title="Delete Trail"
                      aria-label="Delete Trail"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: TRAVEL DNA (PERSONALITY, RADAR & PREFERENCES) --- */}
        {activeTab === 'dna' && (
          <div className="p-4 sm:p-6 space-y-4">
            {travelDNAAnalysis.hasCompletedTrips ? (
              <>
                {/* Travel Archetype Hero Card */}
                <div className="p-5 rounded-2xl bg-[#1a1a1f] border border-white/10 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Travel DNA Profile
                    </span>
                    <span className="text-xs text-zinc-400 font-semibold">
                      Level {profile.stats?.levelNumber || 1} Explorer • {completedTrips.length} {completedTrips.length === 1 ? 'Trip' : 'Trips'} Completed
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">
                    {travelDNAAnalysis.archetype.title}
                  </h3>
                  <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                    {travelDNAAnalysis.archetype.description}
                  </p>
                </div>

                {/* Travel DNA Radar Breakdown */}
                <div className="p-5 rounded-2xl bg-[#1a1a1f] border border-white/10 shadow-xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">
                      Vibe Breakdown
                    </h4>
                    <span className="text-[11px] text-zinc-400">
                      From {completedTrips.length} completed {completedTrips.length === 1 ? 'trip' : 'trips'}
                    </span>
                  </div>

                  {Object.entries(travelDNAAnalysis.scores).map(([trait, score]) => (
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
                    Learned Preferences & Patterns
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-zinc-900 border border-white/5">
                      <span className="text-zinc-400 block text-[11px]">Primary Transport</span>
                      <span className="font-bold text-white mt-0.5 block">{travelDNAAnalysis.preferences.transport}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900 border border-white/5">
                      <span className="text-zinc-400 block text-[11px]">Dominant Pace</span>
                      <span className="font-bold text-white mt-0.5 block">{travelDNAAnalysis.preferences.pace}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900 border border-white/5">
                      <span className="text-zinc-400 block text-[11px]">Target Budget</span>
                      <span className="font-bold text-white mt-0.5 block">{travelDNAAnalysis.preferences.budget}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900 border border-white/5">
                      <span className="text-zinc-400 block text-[11px]">Accommodation</span>
                      <span className="font-bold text-white mt-0.5 block">{travelDNAAnalysis.preferences.accommodation}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-14 px-6 text-center space-y-4 rounded-2xl bg-[#1a1a1f] border border-white/10 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-white">
                    Travel DNA Profile Unwritten
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Your Travel DNA and Archetype are generated dynamically from your completed trips. Complete your first journey or check off activities in your itinerary to discover your unique travel archetype, vibe breakdown, and travel personality!
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/5 max-w-sm mx-auto text-left space-y-2 text-xs text-zinc-300">
                  <div className="flex items-center gap-2 font-medium text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Complete trips to unlock:</span>
                  </div>
                  <ul className="text-[11px] text-zinc-400 space-y-1 pl-6 list-disc">
                    <li>Dynamic Travel Archetype based on your real itineraries</li>
                    <li>Adventure, Nature, Food, Culture & Vibe percentages</li>
                    <li>Learned travel patterns, pace, and accommodation preferences</li>
                  </ul>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    onClick={() => setActiveTab('trips')}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View My Trips</span>
                  </button>
                  <button
                    onClick={() => onStartPlanning()}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Plan New Trip</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* --- INSTAGRAM REELS FULL-SCREEN VIEWER (SHOWING ONLY TRAILS BY THIS USER) --- */}
      {activeReelTrailId && (
        <div className="fixed inset-0 z-[100] bg-black w-full h-full animate-fade-in select-none">
          <TrailsView
            currentTheme={currentTheme}
            session={session}
            isActive={true}
            customTrails={profileFullTrails}
            initialTrailId={activeReelTrailId}
            showBackButton={true}
            feedTitle={profile.username || profile.name || 'Trails'}
            onBack={() => setActiveReelTrailId(null)}
            onDeleteTrail={(deletedId) => {
              setProfileFullTrails((prev) => prev.filter((p) => p.id !== deletedId));
              setUserTrails((prev) => {
                const updated = prev.filter((p) => p.id !== deletedId);
                try {
                  localStorage.setItem('roamai_user_trails', JSON.stringify(updated));
                  localStorage.setItem('tripwise_user_trails', JSON.stringify(updated));
                } catch {
                  // ignore
                }
                return updated;
              });
            }}
            onStartPlanning={onStartPlanning}
            onRequireAuth={onRequireAuth}
            onOpenUploadPage={onOpenUploadPage}
            onOpenUserProfile={(traveller) => {
              setActiveReelTrailId(null);
              window.dispatchEvent(new CustomEvent('roamai_view_traveller', { detail: traveller }));
              onNavigate?.('search');
            }}
            onOpenOwnProfile={() => {
              setActiveReelTrailId(null);
            }}
          />
        </div>
      )}

      {/* --- DELETE TRAIL CONFIRMATION MODAL --- */}
      {trailToDelete && (
        <div 
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isDeletingTrail) setTrailToDelete(null);
          }}
        >
          <div 
            className="w-full max-w-[340px] bg-[#262626] rounded-2xl overflow-hidden shadow-2xl text-center animate-in zoom-in-95 duration-150 divide-y divide-neutral-700/60 text-white border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-2 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Delete this trail?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-white">"{trailToDelete.destination || trailToDelete.title}"</span>? This will permanently remove it from your profile and community discover feed.
              </p>
            </div>
            <button
              type="button"
              disabled={isDeletingTrail}
              onClick={async () => {
                const id = trailToDelete.id;
                await handleDeleteTrail(id);
              }}
              className="w-full py-3.5 text-sm font-bold text-rose-500 hover:bg-rose-500/10 active:bg-rose-500/20 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDeletingTrail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete Trail</span>
              )}
            </button>
            <button
              type="button"
              disabled={isDeletingTrail}
              onClick={() => setTrailToDelete(null)}
              className="w-full py-3 text-sm font-medium text-zinc-300 hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* --- UPLOAD TRAIL REEL MODAL (Instagram Reels Style) --- */}
      {isUploadTrailModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => {
            if (!isPublishingTrail) {
              setIsUploadTrailModalOpen(false);
              handleResetTrailUpload();
            }
          }}
        >
          <div 
            className={`w-full bg-[#1c1c1e] sm:bg-[#18181b] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white transition-all duration-300 ${
              !trailPreviewUrl ? 'max-w-md' : 'max-w-4xl max-h-[92vh]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hidden native file input */}
            <input
              ref={trailUploadInputRef}
              type="file"
              accept="video/*,image/*"
              className="hidden"
              onChange={handleTrailFileSelected}
            />

            {/* STEP 1: Select from device screen */}
            {!trailPreviewUrl ? (
              <div className="flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
                  <div className="w-8" />
                  <h3 className="text-sm sm:text-base font-bold text-white text-center">Create new trail</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadTrailModalOpen(false);
                      handleResetTrailUpload();
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
                      Select a video or photo from your device to share on your profile and discover feed
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => trailUploadInputRef.current?.click()}
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
              <form id="profile-upload-reel-form" onSubmit={handlePublishTrail} className="flex flex-col h-full max-h-[92vh] sm:max-h-[850px] bg-black text-white">
                {/* Header: Circle Back Button & Centered "New reel" */}
                <div className="relative flex items-center justify-center px-4 py-3.5 border-b border-zinc-900 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetTrailUpload}
                    disabled={isPublishingTrail}
                    className="absolute left-4 w-10 h-10 rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95 disabled:opacity-40"
                    title="Back"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">New trail</h2>
                </div>

                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 max-w-md mx-auto w-full">
                  {/* Centered Preview Card sticking to original aspect ratio */}
                  <div className="relative w-full max-w-[280px] sm:max-w-xs min-h-[180px] max-h-[380px] mx-auto rounded-3xl overflow-hidden bg-black/95 border border-white/10 shadow-2xl flex items-center justify-center group">
                    {trailFile?.type.startsWith('image/') ? (
                      <>
                        <img
                          src={trailPosterUrl || trailPreviewUrl}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 pointer-events-none scale-110"
                        />
                        <img
                          src={trailPosterUrl || trailPreviewUrl}
                          alt="Trail preview"
                          className="relative z-10 max-h-[380px] w-auto max-w-full object-contain mx-auto"
                        />
                      </>
                    ) : (
                      <>
                        {trailPosterUrl && (
                          <img
                            src={trailPosterUrl}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 pointer-events-none scale-110"
                          />
                        )}
                        <video
                          src={trailPreviewUrl}
                          poster={trailPosterUrl}
                          playsInline
                          loop
                          autoPlay={isPreviewPlayingTrail}
                          muted
                          className="relative z-10 max-h-[380px] w-auto max-w-full object-contain mx-auto"
                        />
                      </>
                    )}

                    {/* "Preview" Pill on Top */}
                    <button
                      type="button"
                      onClick={() => setIsPreviewPlayingTrail(!isPreviewPlayingTrail)}
                      className="absolute top-3 inset-x-0 mx-auto w-fit px-3.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-md border border-white/15 cursor-pointer shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      {isPreviewPlayingTrail ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
                      <span>Preview</span>
                    </button>

                    {/* "Edit cover" Pill on Bottom */}
                    <button
                      type="button"
                      data-cover-action="true"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsEditCoverModalOpen(true);
                      }}
                      className="absolute bottom-3 inset-x-0 mx-auto w-fit px-4 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-semibold backdrop-blur-md border border-white/15 cursor-pointer shadow-md transition-all active:scale-95 z-20"
                    >
                      Edit cover
                    </button>
                  </div>

                  {/* Caption Input: "Add a caption..." */}
                  <div className="pt-2">
                    <textarea
                      rows={3}
                      value={trailCaption}
                      onChange={(e) => setTrailCaption(e.target.value)}
                      placeholder="Add a caption..."
                      className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-zinc-500 focus:outline-hidden resize-none leading-relaxed border-none p-0"
                    />

                    {/* Detected Hashtags Display if any */}
                    {detectedTrailHashtags.length > 0 && (
                      <div className="pt-1.5 flex flex-wrap gap-1.5 items-center">
                        {detectedTrailHashtags.map((tag) => (
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
                        setShowHashtagSuggestionsTrail(!showHashtagSuggestionsTrail);
                        if (!trailCaption.endsWith(' ') && trailCaption.length > 0) {
                          setTrailCaption((prev) => prev + ' #');
                        } else if (trailCaption.length === 0) {
                          setTrailCaption('#');
                        }
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                        showHashtagSuggestionsTrail 
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md' 
                          : 'bg-[#262626] hover:bg-zinc-800 text-white border-white/5'
                      }`}
                    >
                      <Hash className="w-3.5 h-3.5" />
                      <span>Hashtags</span>
                    </button>
                  </div>

                  {/* Hashtag Suggestions Palette when active */}
                  {showHashtagSuggestionsTrail && (
                    <div className="p-2.5 rounded-2xl bg-[#1c1c1e] border border-white/10 flex flex-wrap gap-1.5 animate-in fade-in duration-150">
                      {['#travel', '#wanderlust', '#trails', '#nature', '#adventure', '#explore', '#sunset', '#mountains', '#beach'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (!trailCaption.includes(tag)) {
                              setTrailCaption((prev) => prev.trim() ? `${prev.trim()} ${tag} ` : `${tag} `);
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
                      onClick={() => setShowTagInputTrail(!showTagInputTrail)}
                      className="w-full py-3 flex items-center justify-between text-left hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Camera className="w-5 h-5 text-white" />
                        <span className="text-sm sm:text-base font-semibold text-white">Tag people</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        {taggedPeopleTrail && <span className="text-xs text-blue-400 font-medium truncate max-w-[120px]">{taggedPeopleTrail}</span>}
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    </button>

                    {showTagInputTrail && (
                      <div className="pb-3 pl-8">
                        <input
                          type="text"
                          value={taggedPeopleTrail}
                          onChange={(e) => setTaggedPeopleTrail(e.target.value)}
                          placeholder="Tag users (e.g. @friend1, @traveler)..."
                          className="w-full bg-[#1c1c1e] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Row 2: Add location > */}
                  {/* Row 2: Add location > (Mandatory) */}
                  <div className={`rounded-2xl transition-all ${uploadLocationErrorTrail && !trailDestination ? 'border border-rose-500/70 bg-rose-500/5 p-2' : ''}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadLocationErrorTrail(null);
                        setIsTrailLocationModalOpen(true);
                      }}
                      className="w-full py-2 flex items-center justify-between text-left hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className={`w-5 h-5 ${trailDestination ? 'text-blue-400' : 'text-white'}`} />
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-semibold text-white">Add location</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Required
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        {trailDestination ? (
                          <span className="text-xs text-blue-400 font-semibold truncate max-w-[140px] bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20">
                            {trailDestination}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">Select on map or search</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    </button>

                    {uploadLocationErrorTrail && !trailDestination && (
                      <p className="pt-1 pl-8 text-[11px] text-rose-400 font-medium">
                        {uploadLocationErrorTrail}
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
                    onClick={handleSaveTrailDraft}
                    disabled={isPublishingTrail}
                    className="flex-1 py-3.5 rounded-2xl bg-[#262626] hover:bg-zinc-800 text-white font-bold text-sm text-center cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                  >
                    Save draft
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishingTrail}
                    className="flex-1 py-3.5 rounded-2xl bg-[#0095f6] hover:bg-[#1877f2] text-white font-bold text-sm text-center cursor-pointer transition-all active:scale-98 shadow-lg shadow-blue-950/40 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isPublishingTrail ? (
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
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">@</span>
                  <input
                    type="text"
                    value={editForm.username?.replace(/^@/, '') || ''}
                    onChange={(e) => {
                      setEditUsernameError(null);
                      setEditForm({ ...editForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') });
                    }}
                    className={`w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-900 border text-white font-medium focus:outline-hidden ${
                      editUsernameError ? 'border-red-500 focus:border-red-400' : 'border-zinc-800 focus:border-white'
                    }`}
                    placeholder="unique_username"
                    required
                  />
                </div>
                {editUsernameError ? (
                  <p className="text-red-400 text-xs font-medium mt-1 ml-1">{editUsernameError}</p>
                ) : (
                  <p className="text-zinc-500 text-[11px] mt-1 ml-1">Must be unique across all TripWise accounts</p>
                )}
              </div>

              {/* Profile Photo Upload Section */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-2">Profile Photo</label>
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                  {/* Photo Preview */}
                  <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-zinc-700 bg-zinc-800 flex items-center justify-center">
                    {editForm.avatarUrl ? (
                      <img
                        src={editForm.avatarUrl}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-emerald-600 via-teal-700 to-indigo-800 text-white font-bold text-xl select-none">
                        {editForm.name?.charAt(0).toUpperCase() || 'T'}
                      </div>
                    )}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input
                      ref={modalFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleModalPhotoSelect(f);
                        if (e.target) e.target.value = '';
                      }}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => modalFileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        {isUploadingAvatar ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                        )}
                        <span>{editForm.avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                      </button>

                      {editForm.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setEditForm((prev) => ({ ...prev, avatarUrl: '' }))}
                          className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-snug">
                      Tap to choose or capture a photo from your camera or device (PNG, JPG, WEBP)
                    </p>
                  </div>
                </div>
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

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSavingProfile}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold cursor-pointer transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin text-black" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instagram-style Profile Photo Action Modal */}
      {showPhotoOptionsModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowPhotoOptionsModal(false)}
        >
          <div 
            className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl divide-y divide-zinc-800 text-center animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-4 px-6">
              <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-zinc-800 mb-2 border border-white/10 flex items-center justify-center shadow-md">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-white">{profile.name?.charAt(0).toUpperCase() || 'T'}</span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white">Profile Photo</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Manage or change your photo</p>
            </div>

            {profile.avatarUrl && (
              <button
                type="button"
                onClick={() => {
                  setShowPhotoOptionsModal(false);
                  setShowViewPhotoModal(true);
                }}
                className="w-full py-3.5 px-4 text-xs sm:text-sm font-semibold text-white hover:bg-zinc-800/80 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-zinc-400" />
                <span>View Profile Picture</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowPhotoOptionsModal(false);
                headerFileInputRef.current?.click();
              }}
              className="w-full py-3.5 px-4 text-xs sm:text-sm font-bold text-[#0095f6] hover:bg-zinc-800/80 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{profile.avatarUrl ? 'Choose New Photo' : 'Upload Photo'}</span>
            </button>

            {profile.avatarUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="w-full py-3.5 px-4 text-xs sm:text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Current Photo</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowPhotoOptionsModal(false)}
              className="w-full py-3 px-4 text-xs sm:text-sm font-medium text-zinc-400 hover:bg-zinc-800/80 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Instagram-style Full Screen View Profile Picture Modal */}
      {showViewPhotoModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowViewPhotoModal(false)}
        >
          {/* Top Bar */}
          <div className="absolute top-4 sm:top-6 left-4 sm:left-8 right-4 sm:right-8 flex items-center justify-between text-white z-10">
            <span className="text-sm sm:text-base font-bold tracking-wide">
              {profile.username || profile.name}
            </span>
            <button
              type="button"
              onClick={() => setShowViewPhotoModal(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer text-white"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Large Circular Avatar Display (No Ring) */}
          <div 
            className="w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden shadow-2xl border-2 border-white/20 bg-zinc-900 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-emerald-600 via-teal-700 to-indigo-800 text-white font-black text-6xl">
                {profile.name?.charAt(0).toUpperCase() || 'T'}
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="mt-8 flex items-center gap-3 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setShowViewPhotoModal(false);
                headerFileInputRef.current?.click();
              }}
              className="px-5 py-2.5 rounded-full bg-[#0095f6] hover:bg-[#1877f2] text-white font-bold text-xs sm:text-sm shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Change Photo</span>
            </button>
            {profile.avatarUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs sm:text-sm border border-red-500/30 transition-all cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>
        </div>
      )}
      </>
      )}

      {/* Slide-In Navigation Drawer from Right (Same as home page 3 lines slider) */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentView="profile"
        onNavigate={(view) => {
          setIsDrawerOpen(false);
          if (onNavigate) {
            onNavigate(view);
          } else if (view === 'landing') {
            onBack();
          }
        }}
        savedTripsCount={trips.length}
        currentTheme={currentTheme}
        onOpenThemeModal={onOpenThemeModal}
        session={session}
        onRequireAuth={() => {
          setIsDrawerOpen(false);
          onRequireAuth?.();
        }}
        onPlanTrip={() => {
          setIsDrawerOpen(false);
          onStartPlanning();
        }}
        onSignOut={async () => {
          setIsDrawerOpen(false);
          const supabase = getSupabaseClient();
          if (supabase) {
            await supabase.auth.signOut();
          }
        }}
      />

      {/* Followers & Following List Modal */}
      <FollowListModal
        isOpen={isFollowModalOpen}
        onClose={() => setIsFollowModalOpen(false)}
        initialTab={followModalTab}
        profileUser={{
          id: user?.id,
          username: profile.username || getFallbackUsername(user, userMeta),
          name: profile.name || getFallbackName(user, userMeta),
          avatarUrl: profile.avatarUrl
        }}
        currentUser={{
          id: user?.id,
          username: profile.username || getFallbackUsername(user, userMeta),
          name: profile.name || getFallbackName(user, userMeta),
          avatarUrl: profile.avatarUrl
        }}
        onSelectUser={(selectedUser) => {
          setIsFollowModalOpen(false);
          window.dispatchEvent(
            new CustomEvent('roamai_view_traveller', {
              detail: {
                id: selectedUser.id,
                username: selectedUser.username,
                name: selectedUser.name,
                avatarUrl: selectedUser.avatarUrl,
                location: selectedUser.location,
                bio: selectedUser.bio
              }
            })
          );
          onNavigate?.('search');
        }}
      />

      {/* Edit Cover Modal for Trail Upload */}
      <EditCoverModal
        isOpen={isEditCoverModalOpen}
        videoFile={trailFile}
        videoUrl={trailPreviewUrl}
        initialPoster={trailPosterUrl}
        onClose={() => setIsEditCoverModalOpen(false)}
        onSave={(newPoster) => setTrailPosterUrl(newPoster)}
      />

      {/* Location Picker Modal (Interactive Map or Search) */}
      <TrailLocationPickerModal
        isOpen={isTrailLocationModalOpen}
        onClose={() => setIsTrailLocationModalOpen(false)}
        initialLocation={trailDestination}
        onSelectLocation={(loc: SelectedTrailLocation) => {
          const formatted = loc.name.trim() || loc.address.trim();
          setTrailDestination(formatted);
          setUploadLocationErrorTrail(null);
        }}
      />
    </div>
  );
};
