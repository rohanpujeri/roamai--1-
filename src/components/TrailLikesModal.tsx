import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Heart, 
  Search, 
  UserPlus, 
  UserCheck, 
  Loader2,
  Users,
  Check
} from 'lucide-react';
import { TrailLiker, fetchTrailLikers } from '../services/sharedTrailsService';
import { 
  isUserFollowing, 
  followUser, 
  unfollowUser, 
  cleanHandle,
  isFakeMockUser
} from '../services/followService';
import { sanitizeAvatarUrl } from '../services/supabaseClient';

interface TrailLikesModalProps {
  isOpen: boolean;
  onClose: () => void;
  trailId: string;
  trailTitle?: string;
  likesCount: number;
  initialLikers?: TrailLiker[];
  currentUser?: {
    id?: string;
    name: string;
    username: string;
    avatarUrl?: string;
  } | null;
  onLikeTrail?: () => void;
  onSelectUser?: (username: string) => void;
}

export const TrailLikesModal: React.FC<TrailLikesModalProps> = ({
  isOpen,
  onClose,
  trailId,
  trailTitle,
  likesCount,
  initialLikers = [],
  currentUser,
  onLikeTrail,
  onSelectUser
}) => {
  const [likers, setLikers] = useState<TrailLiker[]>(initialLikers);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const curUname = useMemo(() => {
    return cleanHandle(currentUser?.username || '');
  }, [currentUser?.username]);

  // Load and enrich likers list when modal opens
  useEffect(() => {
    if (!isOpen || !trailId) return;

    let isMounted = true;
    setIsLoading(true);
    setSearchQuery('');

    const loadLikers = async () => {
      try {
        const fetched = await fetchTrailLikers(trailId);
        const likersMap = new Map<string, TrailLiker>();

        // Merge initial likers
        initialLikers.forEach((l) => {
          const u = cleanHandle(l.username);
          if (u && !isFakeMockUser(u)) likersMap.set(u, l);
        });

        // Merge fetched likers
        fetched.forEach((l) => {
          const u = cleanHandle(l.username);
          if (u && !isFakeMockUser(u)) likersMap.set(u, l);
        });

        // If current user is recorded as liking the trail, ensure they appear in the list
        if (currentUser && currentUser.username) {
          const cClean = cleanHandle(currentUser.username);
          const hasLikedLocal = localStorage.getItem('roamai_liked_trail_ids');
          const isLikedByUser = hasLikedLocal ? JSON.parse(hasLikedLocal).includes(trailId) : false;

          if (isLikedByUser && !isFakeMockUser(cClean) && !likersMap.has(cClean)) {
            likersMap.set(cClean, {
              id: currentUser.id,
              name: currentUser.name || 'You',
              username: currentUser.username.startsWith('@') ? currentUser.username : `@${currentUser.username}`,
              avatarUrl: sanitizeAvatarUrl(currentUser.avatarUrl || '')
            });
          }
        }

        const finalList = Array.from(likersMap.values());

        if (isMounted) {
          setLikers(finalList);

          // Populate following statuses
          const fMap: Record<string, boolean> = {};
          if (currentUser?.username) {
            finalList.forEach((l) => {
              const targetU = cleanHandle(l.username);
              if (targetU && targetU !== curUname) {
                fMap[targetU] = isUserFollowing(curUname, targetU);
              }
            });
          }
          setFollowingMap(fMap);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load trail likers:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    loadLikers();

    return () => {
      isMounted = false;
    };
  }, [isOpen, trailId, likesCount, currentUser?.username]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered likers based on search query
  const filteredLikers = useMemo(() => {
    if (!searchQuery.trim()) return likers;
    const q = searchQuery.trim().toLowerCase().replace(/^@+/, '');
    return likers.filter((l) => {
      const nameMatch = (l.name || '').toLowerCase().includes(q);
      const usernameMatch = cleanHandle(l.username).includes(q);
      return nameMatch || usernameMatch;
    });
  }, [likers, searchQuery]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const handleToggleFollow = async (liker: TrailLiker) => {
    if (!currentUser?.username) {
      showToast('Please sign in to follow travelers');
      return;
    }

    const targetU = cleanHandle(liker.username);
    if (!targetU || targetU === curUname) return;

    const currentlyFollowing = !!followingMap[targetU];

    // Optimistic UI update
    setFollowingMap((prev) => ({ ...prev, [targetU]: !currentlyFollowing }));

    try {
      if (currentlyFollowing) {
        await unfollowUser(
          { id: currentUser.id, username: currentUser.username },
          { id: liker.id, username: liker.username }
        );
        showToast(`Unfollowed @${targetU}`);
      } else {
        await followUser(
          { 
            id: currentUser.id, 
            username: currentUser.username, 
            name: currentUser.name, 
            avatarUrl: currentUser.avatarUrl 
          },
          { 
            id: liker.id, 
            username: liker.username, 
            name: liker.name, 
            avatarUrl: liker.avatarUrl 
          }
        );
        showToast(`Following @${targetU}`);
      }
      window.dispatchEvent(new CustomEvent('roamai_follow_changed'));
    } catch (err) {
      // Revert optimistic update on failure
      setFollowingMap((prev) => ({ ...prev, [targetU]: currentlyFollowing }));
      console.warn('Failed to toggle follow:', err);
    }
  };

  if (!isOpen) return null;

  const totalLikesDisplay = isLoading ? (likesCount || 0) : likers.length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-h-[85vh] sm:max-h-[600px] sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-[#141418] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <Heart className="w-4 h-4 fill-red-500" />
            </div>
            <h3 className="text-base font-bold text-white">Likes</h3>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-semibold text-neutral-300">
              {totalLikesDisplay}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        {likers.length > 3 && (
          <div className="px-4 py-2.5 border-b border-white/5 shrink-0 bg-neutral-900/40">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search likers..."
                className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-zinc-800/95 border border-white/15 text-white text-xs font-semibold shadow-xl flex items-center gap-1.5 animate-fade-in">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Likers List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2 sm:p-3 min-h-[220px]">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs">Loading profiles...</span>
            </div>
          ) : filteredLikers.length === 0 ? (
            searchQuery ? (
              <div className="py-16 text-center space-y-2">
                <p className="text-sm font-semibold text-white">No results found</p>
                <p className="text-xs text-neutral-400">
                  No one matching &ldquo;{searchQuery}&rdquo; liked this trail.
                </p>
              </div>
            ) : (
              <div className="py-16 px-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                  <Heart className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-xs mx-auto">
                  <h4 className="text-sm font-bold text-white">No likes yet</h4>
                  <p className="text-xs text-neutral-400">
                    Be the first traveler to like this trail!
                  </p>
                </div>
                {onLikeTrail && (
                  <button
                    type="button"
                    onClick={() => {
                      onLikeTrail();
                      onClose();
                    }}
                    className="mt-3 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-bold transition-all shadow-lg shadow-red-500/20 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Heart className="w-3.5 h-3.5 fill-white" />
                    <span>Like Trail</span>
                  </button>
                )}
              </div>
            )
          ) : (
            <div className="space-y-1">
              {filteredLikers.map((liker, idx) => {
                const isSelf = cleanHandle(liker.username) === curUname;
                const isFollowing = !!followingMap[cleanHandle(liker.username)];
                const initial = (liker.name || liker.username || 'U').charAt(0).toUpperCase();

                return (
                  <div
                    key={liker.id || liker.username || idx}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    {/* User Info */}
                    <div 
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer pr-3"
                      onClick={() => onSelectUser && onSelectUser(liker.username)}
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-800 border border-white/10 shrink-0 flex items-center justify-center text-xs font-bold text-white">
                        {liker.avatarUrl ? (
                          <img
                            src={liker.avatarUrl}
                            alt={liker.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // fallback on error
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-linear-to-br from-emerald-500 to-teal-700 flex items-center justify-center">
                            {initial}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                            {liker.name}
                          </p>
                          {isSelf && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {liker.username.startsWith('@') ? liker.username : `@${liker.username}`}
                        </p>
                      </div>
                    </div>

                    {/* Follow / Unfollow Button */}
                    {!isSelf && (
                      <div className="shrink-0">
                        {isFollowing ? (
                          <button
                            type="button"
                            onClick={() => handleToggleFollow(liker)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-neutral-300" />
                            <span>Following</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleFollow(liker)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Follow</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 border-t border-white/5 bg-neutral-950/60 text-center text-[11px] text-neutral-400 shrink-0">
          Tap on any traveler to view profile or connect
        </div>
      </div>
    </div>
  );
};
