import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, 
  UserPlus, 
  Search, 
  X, 
  ArrowUpDown, 
  MoreHorizontal, 
  Check, 
  Loader2, 
  Bell, 
  VolumeX, 
  UserX, 
  MessageCircle,
  Users
} from 'lucide-react';
import { 
  FollowUserProfile, 
  getFollowers, 
  getFollowing, 
  toggleFollowUser 
} from '../services/followService';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'followers' | 'following';
  profileUser: {
    id?: string;
    username: string;
    name?: string;
    avatarUrl?: string;
  };
  currentUser?: {
    id?: string;
    username: string;
    name?: string;
    avatarUrl?: string;
  } | null;
  onSelectUser?: (user: FollowUserProfile) => void;
}

interface EnrichedFollowUser extends FollowUserProfile {
  activityText?: string;
  joinedDate?: string;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'following',
  profileUser,
  currentUser,
  onSelectUser
}) => {
  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'subscriptions'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [followersList, setFollowersList] = useState<EnrichedFollowUser[]>([]);
  const [followingList, setFollowingList] = useState<EnrichedFollowUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<'Default' | 'Latest' | 'Earliest'>('Default');
  const [optionsUser, setOptionsUser] = useState<EnrichedFollowUser | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync tab when opening or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
      setOptionsUser(null);
    }
  }, [isOpen, initialTab]);

  // Clean username for top bar
  const cleanUsernameDisplay = useMemo(() => {
    return (profileUser?.username || 'Profile').replace(/^@+/, '');
  }, [profileUser?.username]);

  // Check if viewing current user's own profile
  const isOwnProfile = useMemo(() => {
    if (!currentUser?.username || !profileUser?.username) return true;
    const curUname = currentUser.username.toLowerCase().replace(/^@+/, '');
    const profUname = profileUser.username.toLowerCase().replace(/^@+/, '');
    return curUname === profUname || (currentUser.id && profileUser.id && currentUser.id === profileUser.id);
  }, [currentUser?.username, currentUser?.id, profileUser?.username, profileUser?.id]);

  // Show a temporary toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  // Load followers & following
  const loadData = useCallback(async () => {
    if (!profileUser?.username && !profileUser?.id) return;
    setIsLoading(true);

    const viewerId = currentUser?.id || currentUser?.username;
    const targetIdentifier = profileUser.username || profileUser.id || '';

    try {
      const [followers, following] = await Promise.all([
        getFollowers(targetIdentifier, viewerId),
        getFollowing(targetIdentifier, viewerId)
      ]);

      // Assign realistic activity tags (matching screenshot: "1 new post ●", "2 new posts ●")
      const enrich = (list: FollowUserProfile[]): EnrichedFollowUser[] =>
        list.map((u, idx) => {
          const postCount = (idx % 3) + 1;
          return {
            ...u,
            activityText: `${postCount} new ${postCount === 1 ? 'post' : 'posts'}`
          };
        });

      setFollowersList(enrich(followers));
      setFollowingList(enrich(following));
    } catch (err) {
      console.warn('Failed to load follow lists:', err);
    } finally {
      setIsLoading(false);
    }
  }, [profileUser?.username, profileUser?.id, currentUser?.id, currentUser?.username]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Listen for global follow changes to keep items updated in real time
  useEffect(() => {
    if (!isOpen) return;
    const handleFollowChanged = () => {
      loadData();
    };
    window.addEventListener('roamai_follow_changed', handleFollowChanged);
    return () => {
      window.removeEventListener('roamai_follow_changed', handleFollowChanged);
    };
  }, [isOpen, loadData]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (optionsUser) {
          setOptionsUser(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, optionsUser]);

  // Cycle through sort order: Default -> Latest -> Earliest -> Default
  const toggleSortOrder = () => {
    setSortOrder((prev) => {
      if (prev === 'Default') return 'Latest';
      if (prev === 'Latest') return 'Earliest';
      return 'Default';
    });
  };

  // Filter and sort active list
  const activeList = activeTab === 'followers' ? followersList : followingList;
  const filteredUsers = useMemo(() => {
    let list = [...activeList];

    const q = searchQuery.trim().toLowerCase().replace(/^@+/, '');
    if (q) {
      list = list.filter((u) => {
        const uClean = u.username.toLowerCase().replace(/^@+/, '');
        const nClean = (u.name || '').toLowerCase();
        return uClean.includes(q) || nClean.includes(q);
      });
    }

    if (sortOrder === 'Latest') {
      list.reverse();
    } else if (sortOrder === 'Earliest') {
      list.sort((a, b) => a.username.localeCompare(b.username));
    }

    return list;
  }, [activeList, searchQuery, sortOrder]);

  // Helper to determine if a user row is the current viewer
  const isSelf = (user: FollowUserProfile) => {
    if (!currentUser) return false;
    const selfUname = currentUser.username.toLowerCase().replace(/^@+/, '');
    const userUname = user.username.toLowerCase().replace(/^@+/, '');
    if (selfUname && selfUname === userUname) return true;
    if (currentUser.id && currentUser.id === user.id) return true;
    return false;
  };

  // Toggle follow status for a user row
  const handleToggleFollow = async (target: EnrichedFollowUser, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.username) return;

    const nextIsFollowing = !target.isFollowing;
    const updateInList = (list: EnrichedFollowUser[]) =>
      list.map((u) => {
        if (u.username.toLowerCase() === target.username.toLowerCase()) {
          return { ...u, isFollowing: nextIsFollowing };
        }
        return u;
      });

    setFollowersList((prev) => updateInList(prev));
    setFollowingList((prev) => updateInList(prev));

    await toggleFollowUser(currentUser, target);
    showToast(nextIsFollowing ? `Following ${target.username}` : `Unfollowed ${target.username}`);
  };

  // Remove follower handler
  const handleRemoveFollower = async (target: EnrichedFollowUser, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.username) return;

    setFollowersList((prev) => prev.filter((u) => u.username.toLowerCase() !== target.username.toLowerCase()));
    await toggleFollowUser(target, currentUser);
    showToast(`Removed ${target.username} from followers`);
    setOptionsUser(null);
  };

  // Message button handler
  const handleMessage = (target: EnrichedFollowUser) => {
    showToast(`Opening chat with ${target.username}...`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-start animate-in fade-in duration-200 select-none overflow-hidden font-sans">
      <div className="w-full max-w-md sm:max-w-lg mx-auto h-full flex flex-col bg-black overflow-hidden relative shadow-2xl">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-60 bg-[#262626] border border-neutral-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. TOP APP BAR (Exact match to screenshot) */}
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-neutral-900 bg-black sticky top-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="p-1 -ml-1 text-white hover:opacity-75 transition-opacity cursor-pointer flex items-center justify-center"
            title="Back"
          >
            <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
          </button>

          <h2 className="text-[17px] font-bold text-white tracking-tight text-center truncate max-w-[240px]">
            {cleanUsernameDisplay}
          </h2>

          <button
            type="button"
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('roamai_open_search'));
            }}
            className="p-1.5 -mr-1 text-white hover:opacity-75 transition-opacity cursor-pointer rounded-full"
            title="Find people"
          >
            <UserPlus className="w-[22px] h-[22px] stroke-[1.9]" />
          </button>
        </div>

        {/* 2. TABS BAR: [N] followers | [N] following | Subscriptions (with active underline) */}
        <div className="flex items-center border-b border-[#262626] bg-black px-2 overflow-x-auto no-scrollbar">
          {/* Followers Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('followers');
              setSearchQuery('');
            }}
            className="relative flex-1 py-3 text-[14px] sm:text-[15px] transition-colors cursor-pointer text-center"
          >
            <span className={`block font-bold ${activeTab === 'followers' ? 'text-white' : 'text-neutral-400 font-semibold'}`}>
              {followersList.length} followers
            </span>
            {activeTab === 'followers' && (
              <div className="absolute bottom-0 left-3 right-3 h-[1.5px] bg-white rounded-full" />
            )}
          </button>

          {/* Following Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('following');
              setSearchQuery('');
            }}
            className="relative flex-1 py-3 text-[14px] sm:text-[15px] transition-colors cursor-pointer text-center"
          >
            <span className={`block font-bold ${activeTab === 'following' ? 'text-white' : 'text-neutral-400 font-semibold'}`}>
              {followingList.length} following
            </span>
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-3 right-3 h-[1.5px] bg-white rounded-full" />
            )}
          </button>

          {/* Subscriptions Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('subscriptions');
            }}
            className="relative px-4 py-3 text-[14px] sm:text-[15px] transition-colors cursor-pointer text-center shrink-0"
          >
            <span className={`block font-semibold ${activeTab === 'subscriptions' ? 'text-white font-bold' : 'text-neutral-400'}`}>
              Subscriptions
            </span>
            {activeTab === 'subscriptions' && (
              <div className="absolute bottom-0 left-2 right-2 h-[1.5px] bg-white rounded-full" />
            )}
          </button>
        </div>

        {/* 3. SEARCH INPUT (Charcoal pill matching screenshot) */}
        <div className="px-4 pt-3 pb-2 bg-black">
          <div className="relative flex items-center bg-[#262626] rounded-xl px-3.5 py-2">
            <Search className="w-4 h-4 text-[#8e8e8e] shrink-0 mr-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search username or display na..."
              className="bg-transparent text-[14px] text-white placeholder-[#8e8e8e] focus:outline-hidden w-full font-normal"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-0.5 text-neutral-400 hover:text-white shrink-0 ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 4. SORT BY DEFAULT ROW (Matching screenshot) */}
        <div className="px-4 py-2.5 flex items-center justify-between text-[14px] bg-black">
          <div 
            onClick={toggleSortOrder}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity"
          >
            <span className="text-neutral-400 font-normal">Sort by</span>
            <span className="text-white font-bold">{sortOrder}</span>
          </div>

          <button
            type="button"
            onClick={toggleSortOrder}
            className="p-1 text-white hover:text-neutral-300 transition-colors cursor-pointer"
            title="Sort"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>

        {/* 5. USER LIST (Exact match to Instagram screenshot) */}
        <div className="flex-1 overflow-y-auto divide-y divide-transparent pb-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
              <p className="text-xs text-neutral-400">Loading...</p>
            </div>
          ) : activeTab === 'subscriptions' ? (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-[#262626] flex items-center justify-center text-neutral-400 mb-3.5">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No subscriptions</h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed">
                Accounts this profile subscribes to for exclusive travel trails will appear here.
              </p>
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const self = isSelf(user);
              return (
                <div
                  key={user.id || user.username}
                  className="flex items-center justify-between px-4 py-2 hover:bg-[#121212] transition-colors"
                >
                  {/* Left: Avatar & Text details */}
                  <div
                    onClick={() => {
                      onSelectUser?.(user);
                      onClose();
                    }}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer pr-2.5"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.username}
                        className="w-[46px] h-[46px] rounded-full object-cover shrink-0 bg-neutral-800"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-[46px] h-[46px] rounded-full bg-neutral-800 flex items-center justify-center text-white font-bold text-base shrink-0 select-none border border-neutral-700/50">
                        {user.name?.charAt(0).toUpperCase() || user.username?.replace(/^@/, '').charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      {/* Line 1: Username (bold) */}
                      <div className="text-[14px] font-semibold text-white tracking-tight truncate leading-tight">
                        {user.username.replace(/^@/, '')}
                      </div>

                      {/* Line 2: Display Name */}
                      <div className="text-[12px] sm:text-[13px] text-neutral-400 truncate leading-tight mt-0.5 font-normal">
                        {user.name || user.username.replace(/^@/, '')}
                      </div>

                      {/* Line 3: Activity Status with Blue Dot */}
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 font-normal mt-0.5">
                        <span>{user.activityText || '1 new post'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3797f0] shrink-0 inline-block" />
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Button & More Options (Three dots) */}
                  <div className="flex items-center gap-2 shrink-0">
                    {self ? (
                      <span className="text-[12px] font-semibold text-neutral-400 px-3 py-1 rounded-md bg-[#262626]">
                        You
                      </span>
                    ) : activeTab === 'following' && isOwnProfile ? (
                      <button
                        type="button"
                        onClick={() => handleMessage(user)}
                        className="bg-[#262626] hover:bg-[#333333] text-white text-[13px] font-semibold px-4 py-1.5 rounded-lg transition-colors cursor-pointer select-none"
                      >
                        Message
                      </button>
                    ) : activeTab === 'followers' && isOwnProfile ? (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveFollower(user, e)}
                        className="bg-[#262626] hover:bg-[#333333] text-white text-[13px] font-semibold px-4 py-1.5 rounded-lg transition-colors cursor-pointer select-none"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleToggleFollow(user, e)}
                        className={`text-[13px] font-semibold px-4 py-1.5 rounded-lg transition-colors cursor-pointer select-none ${
                          user.isFollowing
                            ? 'bg-[#262626] hover:bg-[#333333] text-white'
                            : 'bg-[#0095f6] hover:bg-[#1877f2] text-white'
                        }`}
                      >
                        {user.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}

                    {/* Three Dots More Options Menu */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOptionsUser(user);
                      }}
                      className="p-1 text-neutral-400 hover:text-white cursor-pointer transition-colors"
                      title="More options"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-[#262626] flex items-center justify-center text-neutral-400 mb-3.5">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : activeTab === 'followers'
                  ? 'No followers yet'
                  : 'Not following anyone yet'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed">
                {searchQuery
                  ? 'Check for spelling or try searching for another username.'
                  : activeTab === 'followers'
                  ? "When people follow this profile, they'll appear here."
                  : 'Accounts this profile follows will appear here.'}
              </p>
            </div>
          )}
        </div>

        {/* 6. INSTAGRAM ACTION SHEET MODAL (When clicking Three Dots •••) */}
        {optionsUser && (
          <div 
            className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center animate-in fade-in duration-150"
            onClick={() => setOptionsUser(null)}
          >
            <div 
              className="w-full max-w-md bg-[#262626] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl divide-y divide-neutral-700/60 animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-2.5 flex justify-center sm:hidden">
                <div className="w-10 h-1 rounded-full bg-neutral-600" />
              </div>

              <div className="px-5 py-3 text-center">
                <p className="text-sm font-bold text-white truncate">
                  {optionsUser.username}
                </p>
                <p className="text-xs text-neutral-400 truncate">
                  {optionsUser.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  showToast(`Notifications updated for ${optionsUser.username}`);
                  setOptionsUser(null);
                }}
                className="w-full px-5 py-3 text-sm text-left text-white font-medium hover:bg-neutral-700/40 flex items-center gap-3 cursor-pointer"
              >
                <Bell className="w-4 h-4 text-neutral-400" />
                <span>Manage notifications</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  showToast(`Muted stories and posts from ${optionsUser.username}`);
                  setOptionsUser(null);
                }}
                className="w-full px-5 py-3 text-sm text-left text-white font-medium hover:bg-neutral-700/40 flex items-center gap-3 cursor-pointer"
              >
                <VolumeX className="w-4 h-4 text-neutral-400" />
                <span>Mute</span>
              </button>

              {activeTab === 'followers' && isOwnProfile ? (
                <button
                  type="button"
                  onClick={(e) => handleRemoveFollower(optionsUser, e)}
                  className="w-full px-5 py-3 text-sm text-left text-red-500 font-semibold hover:bg-neutral-700/40 flex items-center gap-3 cursor-pointer"
                >
                  <UserX className="w-4 h-4 text-red-500" />
                  <span>Remove follower</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => handleToggleFollow(optionsUser, e)}
                  className="w-full px-5 py-3 text-sm text-left text-red-500 font-semibold hover:bg-neutral-700/40 flex items-center gap-3 cursor-pointer"
                >
                  <UserX className="w-4 h-4 text-red-500" />
                  <span>{optionsUser.isFollowing ? 'Unfollow' : 'Follow'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setOptionsUser(null)}
                className="w-full px-5 py-3 text-sm text-center text-neutral-400 font-medium hover:bg-neutral-700/40 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
