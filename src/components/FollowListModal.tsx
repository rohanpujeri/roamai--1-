import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X, Users, UserCheck, UserPlus, Loader2 } from 'lucide-react';
import { 
  FollowUserProfile, 
  getFollowers, 
  getFollowing, 
  toggleFollowUser, 
  isUserFollowing 
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

export const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'followers',
  profileUser,
  currentUser,
  onSelectUser
}) => {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [followersList, setFollowersList] = useState<FollowUserProfile[]>([]);
  const [followingList, setFollowingList] = useState<FollowUserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync tab when opening or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
    }
  }, [isOpen, initialTab]);

  // Load followers & following whenever modal opens or profileUser changes
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

      setFollowersList(followers);
      setFollowingList(following);
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
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Filter lists based on search input
  const activeList = activeTab === 'followers' ? followersList : followingList;
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^@+/, '');
    if (!q) return activeList;
    return activeList.filter((u) => {
      const uClean = u.username.toLowerCase().replace(/^@+/, '');
      const nClean = (u.name || '').toLowerCase();
      return uClean.includes(q) || nClean.includes(q);
    });
  }, [activeList, searchQuery]);

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
  const handleToggleFollow = async (target: FollowUserProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.username) return;

    // Optimistically update list in view
    const nextIsFollowing = !target.isFollowing;
    const updateInList = (list: FollowUserProfile[]) =>
      list.map((u) => {
        if (u.username.toLowerCase() === target.username.toLowerCase()) {
          return { ...u, isFollowing: nextIsFollowing };
        }
        return u;
      });

    setFollowersList((prev) => updateInList(prev));
    setFollowingList((prev) => updateInList(prev));

    await toggleFollowUser(currentUser, target);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tabs (Instagram Style) */}
        <div className="relative border-b border-neutral-800/80 bg-neutral-900/90 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <h3 className="text-sm font-semibold text-neutral-300">
              {profileUser.username || 'Profile'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="flex items-center px-3 pb-2.5 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('followers');
                setSearchQuery('');
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'followers'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
              }`}
            >
              <span>Followers</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
                activeTab === 'followers' ? 'bg-neutral-700 text-neutral-100' : 'bg-neutral-800/60 text-neutral-400'
              }`}>
                {followersList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('following');
                setSearchQuery('');
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'following'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
              }`}
            >
              <span>Following</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
                activeTab === 'following' ? 'bg-neutral-700 text-neutral-100' : 'bg-neutral-800/60 text-neutral-400'
              }`}>
                {followingList.length}
              </span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-neutral-800/60 bg-neutral-900/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-9 py-2 bg-neutral-800/70 border border-neutral-700/60 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-neutral-500 focus:bg-neutral-800 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List of Users */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 divide-y divide-neutral-800/40">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
              <p className="text-xs text-neutral-400">Loading {activeTab}...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const self = isSelf(user);
              return (
                <div
                  key={user.id || user.username}
                  onClick={() => {
                    onSelectUser?.(user);
                    onClose();
                  }}
                  className="flex items-center justify-between py-2.5 px-2.5 rounded-xl hover:bg-neutral-800/50 transition-colors cursor-pointer group"
                >
                  {/* Left: Avatar + Info */}
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-11 h-11 rounded-full object-cover border border-neutral-700/80 shrink-0 shadow-xs"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 border border-neutral-700 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                        {user.name?.charAt(0).toUpperCase() || user.username?.replace(/^@/, '').charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="font-semibold text-xs sm:text-sm text-white truncate group-hover:text-neutral-200 transition-colors">
                        {user.name}
                      </div>
                      <div className="text-[11px] sm:text-xs text-neutral-400 truncate">
                        {user.username}
                      </div>
                      {user.location && (
                        <div className="text-[10px] text-neutral-500 truncate">
                          {user.location}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <div className="shrink-0 pl-1">
                    {self ? (
                      <span className="text-[11px] font-semibold text-neutral-400 px-3 py-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700/60 select-none">
                        You
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleToggleFollow(user, e)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                          user.isFollowing
                            ? 'bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 shadow-xs'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30'
                        }`}
                      >
                        {user.isFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-neutral-800/80 flex items-center justify-center text-neutral-500 mb-3 border border-neutral-700/50">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-neutral-300">
                {searchQuery
                  ? `No accounts found for "${searchQuery}"`
                  : activeTab === 'followers'
                  ? 'No followers yet'
                  : 'Not following anyone yet'}
              </p>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed">
                {searchQuery
                  ? 'Check for spelling errors or try searching for another name or handle.'
                  : activeTab === 'followers'
                  ? 'When people follow this profile, they will show up here.'
                  : 'Profiles this account follows will appear here.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
