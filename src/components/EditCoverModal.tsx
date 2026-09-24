import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';

export interface EditCoverModalProps {
  isOpen: boolean;
  videoFile?: File | null;
  videoUrl?: string;
  initialPoster?: string;
  onClose: () => void;
  onSave: (coverDataUrl: string) => void;
}

interface FrameItem {
  id: string;
  time: number;
  dataUrl: string;
}

export const EditCoverModal: React.FC<EditCoverModalProps> = ({
  isOpen,
  videoFile,
  videoUrl,
  initialPoster,
  onClose,
  onSave,
}) => {
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const [selectedDataUrl, setSelectedDataUrl] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  
  // Text Overlay State (Aa button)
  const [overlayText, setOverlayText] = useState<string>('');
  const [isEditingText, setIsEditingText] = useState<boolean>(false);
  const [tempText, setTempText] = useState<string>('');
  const [textColor, setTextColor] = useState<string>('#ffffff');
  
  const cameraRollInputRef = useRef<HTMLInputElement | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize selected poster when opened
  useEffect(() => {
    if (isOpen) {
      if (initialPoster) {
        setSelectedDataUrl(initialPoster);
      }
      setIsEditingText(false);
    }
  }, [isOpen, initialPoster]);

  // Extract frames from video across timeline
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const mediaSource = videoFile ? URL.createObjectURL(videoFile) : (videoUrl || '');

    if (!mediaSource) {
      if (initialPoster) {
        setFrames([{ id: 'init-0', time: 0, dataUrl: initialPoster }]);
      }
      return;
    }

    setIsLoadingFrames(true);

    const video = document.createElement('video');
    video.src = mediaSource;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('webkit-playsinline', 'true');
    video.preload = 'metadata';

    const frameCount = 8;
    const extractedList: FrameItem[] = [];

    const handleLoadedMetadata = async () => {
      try {
        const duration = video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : 3;
        const intervals = Array.from({ length: frameCount }, (_, i) => {
          // Spread across 3% to 95% of video duration
          const ratio = (i + 0.3) / (frameCount + 0.3);
          return Math.max(0.1, Math.min(duration - 0.1, duration * ratio));
        });

        for (let i = 0; i < intervals.length; i++) {
          if (!isMounted) break;
          const targetTime = intervals[i];

          const frameUrl = await new Promise<string>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              try {
                const canvas = document.createElement('canvas');
                const width = video.videoWidth || 540;
                const height = video.videoHeight || 960;
                canvas.width = Math.min(width, 720);
                canvas.height = Math.round((canvas.width / width) * height);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  resolve(canvas.toDataURL('image/jpeg', 0.85));
                  return;
                }
              } catch {}
              resolve('');
            };

            video.addEventListener('seeked', onSeeked);
            video.currentTime = targetTime;
          });

          if (frameUrl) {
            extractedList.push({
              id: `frame-${i}`,
              time: targetTime,
              dataUrl: frameUrl,
            });
          }
        }

        if (isMounted) {
          if (extractedList.length > 0) {
            setFrames(extractedList);
            if (!initialPoster) {
              setSelectedDataUrl(extractedList[0].dataUrl);
              setSelectedIndex(0);
            }
          } else if (initialPoster) {
            setFrames([{ id: 'init-0', time: 0, dataUrl: initialPoster }]);
          }
        }
      } catch (err) {
        console.warn('Could not extract video frames:', err);
      } finally {
        if (isMounted) {
          setIsLoadingFrames(false);
          if (videoFile) {
            URL.revokeObjectURL(mediaSource);
          }
        }
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      isMounted = false;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      if (videoFile) {
        try {
          URL.revokeObjectURL(mediaSource);
        } catch {}
      }
    };
  }, [isOpen, videoFile, videoUrl, initialPoster]);

  if (!isOpen) return null;

  // Handle camera roll image selection
  const handleCameraRollSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
        if (resultUrl) {
          setSelectedDataUrl(resultUrl);
          // Add custom photo to beginning of frames list
          setFrames((prev) => [
            { id: `custom-${Date.now()}`, time: 0, dataUrl: resultUrl },
            ...prev.filter((f) => !f.id.startsWith('custom-')),
          ]);
          setSelectedIndex(0);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Composite text overlay on canvas and save
  const handleSave = () => {
    if (!selectedDataUrl) {
      onClose();
      return;
    }

    // If no text overlay, save image as is
    if (!overlayText.trim()) {
      onSave(selectedDataUrl);
      onClose();
      return;
    }

    // Render text onto canvas over image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 720;
      canvas.height = img.naturalHeight || 1280;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        onSave(selectedDataUrl);
        onClose();
        return;
      }

      // Draw base image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw overlay text
      const fontSize = Math.round(canvas.width * 0.06);
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      // Position text vertically in the lower-middle zone
      const textX = canvas.width / 2;
      const textY = canvas.height * 0.52;

      ctx.fillText(overlayText.trim().toUpperCase(), textX, textY);

      const finalCompositeUrl = canvas.toDataURL('image/jpeg', 0.9);
      onSave(finalCompositeUrl);
      onClose();
    };
    img.onerror = () => {
      onSave(selectedDataUrl);
      onClose();
    };
    img.src = selectedDataUrl;
  };

  return (
    <div className="fixed inset-0 z-100 flex flex-col bg-[#0b0c10] text-white animate-in fade-in duration-200 select-none">
      {/* Hidden file input for camera roll */}
      <input
        ref={cameraRollInputRef}
        type="file"
        accept="image/*"
        onChange={handleCameraRollSelect}
        className="hidden"
      />

      {/* TOP HEADER: (X) | Edit cover | (✓) */}
      <header className="px-4 py-3.5 flex items-center justify-between border-b border-white/5 bg-[#0b0c10]/95 backdrop-blur-md shrink-0">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          title="Cancel"
        >
          <X className="w-5 h-5 stroke-[2.2]" />
        </button>

        {/* Title */}
        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
          Edit cover
        </h2>

        {/* Done / Checkmark Button */}
        <button
          type="button"
          onClick={handleSave}
          className="w-9 h-9 rounded-full bg-[#3875f6] hover:bg-[#2b66e3] text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-blue-500/25 active:scale-95"
          title="Done"
        >
          <Check className="w-5 h-5 stroke-[2.5]" />
        </button>
      </header>

      {/* Subheader: Cover Tab (no profile grid per request) */}
      <div className="pt-2.5 pb-2 text-center shrink-0">
        <div className="inline-block border-b-2 border-white pb-1.5 px-3">
          <span className="text-sm font-bold text-white tracking-wide">Cover</span>
        </div>
        <p className="text-xs text-zinc-400 mt-2.5 px-4 font-normal max-w-xs mx-auto">
          Select a cover image from your video or camera roll and add text.
        </p>
      </div>

      {/* CENTER: Main Preview Card with Text Overlay & Aa button */}
      <div className="flex-1 flex items-center justify-center p-3 min-h-0 relative">
        <div className="relative w-[210px] sm:w-[240px] aspect-[9/16] rounded-3xl overflow-hidden bg-black border border-white/15 shadow-2xl flex items-center justify-center group">
          {/* Active Frame Image */}
          {selectedDataUrl ? (
            <img
              src={selectedDataUrl}
              alt="Cover Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-[11px] font-medium">Loading frame...</span>
            </div>
          )}

          {/* Text Overlay on Preview */}
          {overlayText.trim() && (
            <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
              <span
                className="text-xs sm:text-sm font-extrabold tracking-widest uppercase text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] select-none px-2 py-1 rounded"
                style={{ color: textColor }}
              >
                {overlayText}
              </span>
            </div>
          )}

          {/* Floating Aa Button on Bottom-Left */}
          <button
            type="button"
            onClick={() => {
              setTempText(overlayText);
              setIsEditingText(true);
            }}
            className="absolute bottom-3 left-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center text-xs font-bold transition-all shadow-lg active:scale-90 cursor-pointer"
            title="Add text to cover"
          >
            Aa
          </button>
        </div>

        {/* Text Input Modal Overlay (when tapping Aa) */}
        {isEditingText && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-xs space-y-4 text-center">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Add Text to Cover</span>
                <button
                  type="button"
                  onClick={() => setIsEditingText(false)}
                  className="text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <input
                type="text"
                autoFocus
                value={tempText}
                onChange={(e) => setTempText(e.target.value)}
                placeholder="e.g. ITINERARY"
                maxLength={30}
                className="w-full bg-[#18181f] border border-white/15 rounded-xl px-4 py-3 text-center text-sm font-bold text-white placeholder:text-zinc-600 focus:outline-hidden focus:border-blue-500 uppercase tracking-wider"
              />

              {/* Text color picker buttons */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {['#ffffff', '#fde047', '#38bdf8', '#4ade80', '#f43f5e', '#a855f7'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTextColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                      textColor === color ? 'scale-125 border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                {overlayText && (
                  <button
                    type="button"
                    onClick={() => {
                      setOverlayText('');
                      setIsEditingText(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
                  >
                    Remove Text
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOverlayText(tempText);
                    setIsEditingText(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#3875f6] hover:bg-blue-600 text-xs font-bold text-white transition-all cursor-pointer shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM SECTION: Filmstrip Timeline & Camera Roll Button */}
      <div className="px-4 pb-6 pt-2 shrink-0 space-y-3">
        {/* Horizontal Filmstrip Frames */}
        <div className="relative">
          {isLoadingFrames && frames.length === 0 ? (
            <div className="h-16 sm:h-20 w-full flex items-center justify-center gap-2 text-zinc-500 text-xs bg-black/40 rounded-xl border border-white/5">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Extracting video frames...</span>
            </div>
          ) : (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 px-0.5 rounded-xl bg-black/50 border border-white/5 items-center">
              {frames.map((frame, index) => {
                const isSelected = selectedDataUrl === frame.dataUrl || (selectedIndex === index && !selectedDataUrl);
                return (
                  <div
                    key={frame.id}
                    onClick={() => {
                      setSelectedDataUrl(frame.dataUrl);
                      setSelectedIndex(index);
                    }}
                    className={`relative w-12 sm:w-14 h-16 sm:h-20 rounded-lg overflow-hidden shrink-0 cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-[#3875f6] border-2 border-white scale-102 z-10 shadow-lg shadow-blue-500/30'
                        : 'opacity-70 hover:opacity-100 border border-transparent'
                    }`}
                  >
                    <img
                      src={frame.dataUrl}
                      alt={`Frame ${index + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Big Blue "Add from camera roll" Button */}
        <button
          type="button"
          onClick={() => cameraRollInputRef.current?.click()}
          className="w-full py-3.5 rounded-xl bg-[#3875f6] hover:bg-[#2b66e3] text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.98]"
        >
          <span>Add from camera roll</span>
        </button>
      </div>
    </div>
  );
};
