import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  Play, 
  Pause, 
  Upload, 
  Film, 
  Hash, 
  Camera, 
  MapPin, 
  Loader2, 
  ChevronRight,
  Check
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { getCachedUserProfile, sanitizeAvatarUrl } from '../services/supabaseClient';
import { saveTrailMedia, generateVideoPoster } from '../services/trailMediaStorage';
import { publishGlobalTrail, TrailReel } from '../services/sharedTrailsService';
import { EditCoverModal } from './EditCoverModal';

export interface UploadTrailViewProps {
  initialFile?: File | null;
  session: Session | null;
  onBack: () => void;
  onSuccess: (createdTrail?: TrailReel) => void;
}

export const UploadTrailView: React.FC<UploadTrailViewProps> = ({
  initialFile = null,
  session,
  onBack,
  onSuccess
}) => {
  const [videoFile, setVideoFile] = useState<File | null>(initialFile);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [posterPreview, setPosterPreview] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [taggedPeople, setTaggedPeople] = useState<string>('');
  const [showTagInput, setShowTagInput] = useState<boolean>(false);
  const [showLocationInput, setShowLocationInput] = useState<boolean>(false);
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState<boolean>(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEditCoverModalOpen, setIsEditCoverModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize from initialFile prop if passed
  useEffect(() => {
    if (initialFile) {
      setVideoFile(initialFile);
      const url = URL.createObjectURL(initialFile);
      setVideoPreview(url);
      generateVideoPoster(initialFile)
        .then((poster) => setPosterPreview(poster))
        .catch(() => {});
    }
  }, [initialFile]);

  // Load saved draft if present and no initial file
  useEffect(() => {
    if (!initialFile) {
      try {
        const rawDraft = localStorage.getItem('roamai_trail_draft') || localStorage.getItem('roamai_reel_draft');
        if (rawDraft) {
          const draft = JSON.parse(rawDraft);
          if (draft.caption) setCaption(draft.caption);
          if (draft.destination) setDestination(draft.destination);
          if (draft.taggedPeople) setTaggedPeople(draft.taggedPeople);
        }
      } catch {}
    }
  }, [initialFile]);

  // Auto-detect hashtags in caption
  const detectedHashtags = useMemo(() => {
    const matches = caption.match(/#([a-zA-Z0-9_\u0080-\uFFFF]+)/g);
    return matches ? Array.from(new Set(matches.map((m) => m.trim()))) : [];
  }, [caption]);

  // Handle file chosen from device
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setVideoPreview(previewUrl);

      try {
        const poster = await generateVideoPoster(file);
        setPosterPreview(poster);
      } catch (err) {
        console.warn('Could not generate poster:', err);
      }
    }
  };

  // Handle custom cover image
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPosterPreview(url);
    }
  };

  // Reset file selection
  const handleReset = () => {
    setVideoFile(null);
    setVideoPreview('');
    setPosterPreview('');
    setIsPreviewPlaying(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  // Save draft
  const handleSaveDraft = () => {
    try {
      localStorage.setItem('roamai_trail_draft', JSON.stringify({
        caption,
        destination,
        taggedPeople,
        date: new Date().toISOString()
      }));
      setToastMessage('Draft saved successfully');
      setTimeout(() => setToastMessage(null), 2500);
    } catch {}
  };

  // Submit Trail
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile && !videoPreview) return;

    setIsSubmitting(true);
    const trailId = `user-trail-${Date.now()}`;

    try {
      // 1. Save binary file to IndexedDB for instant local playback
      if (videoFile) {
        await saveTrailMedia(trailId, videoFile);
      }

      // 2. Poster frame
      let poster = posterPreview;
      if (!poster && videoFile) {
        poster = await generateVideoPoster(videoFile);
      }

      const isImg = videoFile?.type.startsWith('image/');
      const cached = session?.user ? getCachedUserProfile(session.user.id) : null;
      const creatorName = cached?.name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || (session?.user?.email ? session.user.email.split('@')[0] : 'Traveller');
      const fallbackUname = session?.user?.email 
        ? session.user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
        : (session?.user?.id ? `user_${session.user.id.slice(0, 8)}` : 'traveller');
      const username = cached?.username || `@${fallbackUname}`;
      const rawAvatar = cached?.avatarUrl || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.avatarUrl || '';
      const avatarUrl = sanitizeAvatarUrl(rawAvatar);

      const extractedHashtags = (caption.match(/#([a-zA-Z0-9_\u0080-\uFFFF]+)/g) || []).map((t) => t.trim());
      const finalCaption = caption.trim();
      const cleanTitle = caption.replace(/#\S+/g, '').trim() || destination.trim() || '';

      const newTrail: TrailReel = {
        id: trailId,
        videoUrl: videoPreview,
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
        destination: destination.trim(),
        tags: extractedHashtags,
        audioTitle: '',
        likesCount: 0,
        commentsCount: 0,
        viewsCount: 0,
        isLiked: false,
        likedBy: [],
        comments: []
      };

      // 3. Publish to Supabase and API
      await publishGlobalTrail(newTrail, videoFile || undefined);

      // Clear draft after publishing
      try {
        localStorage.removeItem('roamai_trail_draft');
        localStorage.removeItem('roamai_reel_draft');
      } catch {}

      // Dispatch event to notify feed
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('roamai_trail_uploaded', { detail: newTrail }));
      }

      onSuccess(newTrail);
    } catch (err: any) {
      console.error('Failed to publish trail:', err);
      alert('Failed to publish trail: ' + (err?.message || 'Please try again'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] min-h-screen w-full bg-[#0a0a0f] text-white flex flex-col relative z-50">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverChange}
        className="hidden"
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-60 bg-emerald-500 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (videoPreview) {
              handleReset();
            } else {
              onBack();
            }
          }}
          disabled={isSubmitting}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-40"
          title="Back"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
          {videoPreview ? 'New trail' : 'Upload Trail'}
        </h1>

        <div className="w-10" />
      </header>

      {/* STEP 1: Select media from device if none selected */}
      {!videoPreview ? (
        <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center max-w-md mx-auto space-y-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-950/50 animate-pulse">
            <Film className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Create New Trail
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Select a travel video or photo from your device to share with explorers across the world.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-950/60 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2.5"
          >
            <Upload className="w-5 h-5" />
            <span>Select from device</span>
          </button>

          <p className="text-xs text-zinc-500">
            Supports MP4, MOV, WebM, JPG, PNG up to 100MB
          </p>
        </main>
      ) : (
        /* STEP 2: Dedicated "New trail" Details Collection Page */
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full pb-8">
          <div className="px-4 sm:px-6 py-4 space-y-5">
            {/* Centered Preview Card sticking to original aspect ratio */}
            <div className="relative w-full max-w-[280px] sm:max-w-xs min-h-[180px] max-h-[380px] mx-auto rounded-3xl overflow-hidden bg-black/95 border border-white/15 shadow-2xl flex items-center justify-center group">
              {videoFile?.type.startsWith('image/') ? (
                <>
                  <img
                    src={posterPreview || videoPreview}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 pointer-events-none scale-110"
                  />
                  <img
                    src={posterPreview || videoPreview}
                    alt="Trail preview"
                    className="relative z-10 max-h-[380px] w-auto max-w-full object-contain mx-auto"
                  />
                </>
              ) : (
                <>
                  {posterPreview && (
                    <img
                      src={posterPreview}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 pointer-events-none scale-110"
                    />
                  )}
                  <video
                    src={videoPreview}
                    poster={posterPreview}
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
                className="absolute top-3 inset-x-0 mx-auto w-fit px-3.5 py-1 rounded-full bg-black/65 hover:bg-black/85 text-white text-xs font-semibold backdrop-blur-md border border-white/20 cursor-pointer shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                {isPreviewPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
                <span>Preview</span>
              </button>

              {/* "Edit cover" Pill on Bottom */}
              <button
                type="button"
                onClick={() => setIsEditCoverModalOpen(true)}
                className="absolute bottom-3 inset-x-0 mx-auto w-fit px-4 py-1.5 rounded-xl bg-black/75 hover:bg-black/90 text-white text-xs font-semibold backdrop-blur-md border border-white/20 cursor-pointer shadow-md transition-all active:scale-95"
              >
                Edit cover
              </button>
            </div>

            {/* Combined Caption & Hashtags Box */}
            <div className="pt-2 bg-[#141419] border border-white/10 rounded-2xl p-4 space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Caption & Hashtags
              </label>
              <textarea
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption and type #hashtags..."
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-zinc-500 focus:outline-hidden resize-none leading-relaxed border-none p-0"
              />

              {/* Detected Hashtags Display */}
              {detectedHashtags.length > 0 && (
                <div className="pt-1.5 flex flex-wrap gap-1.5 items-center">
                  {detectedHashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Hashtags Quick Button */}
              <div className="pt-2 flex items-center justify-between border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowHashtagSuggestions(!showHashtagSuggestions);
                    if (!caption.endsWith(' ') && caption.length > 0) {
                      setCaption((prev) => prev + ' #');
                    } else if (caption.length === 0) {
                      setCaption('#');
                    }
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    showHashtagSuggestions 
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' 
                      : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span>Hashtags</span>
                </button>
                <span className="text-[11px] text-zinc-500">Caption and hashtags in same box</span>
              </div>

              {/* Hashtag Suggestions Palette */}
              {showHashtagSuggestions && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex flex-wrap gap-1.5 animate-in fade-in duration-150">
                  {['#travel', '#wanderlust', '#trails', '#nature', '#adventure', '#explore', '#sunset', '#mountains', '#beach'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (!caption.includes(tag)) {
                          setCaption((prev) => prev.trim() ? `${prev.trim()} ${tag} ` : `${tag} `);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium cursor-pointer transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Row: Tag people */}
            <div className="bg-[#141419] border border-white/10 rounded-2xl px-4 py-1">
              <button
                type="button"
                onClick={() => setShowTagInput(!showTagInput)}
                className="w-full py-3 flex items-center justify-between text-left hover:opacity-80 transition-opacity cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-white" />
                  <span className="text-sm font-semibold text-white">Tag people</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  {taggedPeople && <span className="text-xs text-emerald-400 font-medium truncate max-w-[120px]">{taggedPeople}</span>}
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </div>
              </button>

              {showTagInput && (
                <div className="pb-3 pt-1 border-t border-white/5">
                  <input
                    type="text"
                    value={taggedPeople}
                    onChange={(e) => setTaggedPeople(e.target.value)}
                    placeholder="Tag users (e.g. @friend1, @friend2)..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Row: Add location */}
            <div className="bg-[#141419] border border-white/10 rounded-2xl px-4 py-1">
              <button
                type="button"
                onClick={() => setShowLocationInput(!showLocationInput)}
                className="w-full py-3 flex items-center justify-between text-left hover:opacity-80 transition-opacity cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-white" />
                  <span className="text-sm font-semibold text-white">Add location</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  {destination && <span className="text-xs text-emerald-400 font-medium truncate max-w-[140px]">{destination}</span>}
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </div>
              </button>

              {showLocationInput && (
                <div className="py-2 border-t border-white/5 space-y-2">
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Search location..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-hidden focus:border-emerald-500"
                  />

                  {/* Suggested Location Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                    {['India', 'Bangalore', 'Goa', 'Manali', 'Bali', 'Paris', 'Tokyo', 'Swiss Alps'].map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setDestination(loc)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium shrink-0 cursor-pointer transition-colors ${
                          destination === loc
                            ? 'bg-emerald-600 text-white font-semibold'
                            : 'bg-white/10 hover:bg-white/15 text-zinc-200'
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Bar: [Save draft] [Share] */}
          <div className="px-4 sm:px-6 pt-4 border-t border-white/10 bg-[#0a0a0f] flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-2xl bg-[#1f1f23] hover:bg-[#2a2a30] text-white font-bold text-sm text-center cursor-pointer transition-all active:scale-98 disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-white font-bold text-sm text-center cursor-pointer transition-all active:scale-98 shadow-xl shadow-emerald-950/60 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sharing...</span>
                </>
              ) : (
                <span>Share</span>
              )}
            </button>
          </div>
        </form>
      )}
      {/* Edit Cover Modal (Matching Reel Cover Selector) */}
      <EditCoverModal
        isOpen={isEditCoverModalOpen}
        videoFile={videoFile}
        videoUrl={videoPreview}
        initialPoster={posterPreview}
        onClose={() => setIsEditCoverModalOpen(false)}
        onSave={(newPoster) => setPosterPreview(newPoster)}
      />
    </div>
  );
};
