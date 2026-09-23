import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Compass, 
  Bookmark, 
  Film,
  Plus, 
  User, 
  Palette, 
  ChevronRight, 
  X, 
  Info,
  LogOut,
  LogIn
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { ThemeConfig, Trip } from '../types';
import { getCachedUserProfile, getSupabaseClient } from '../services/supabaseClient';
import { getSavedTrailsCount } from '../services/savedTrailsService';

export interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onNavigate: (view: any) => void;
  activeTrip?: Trip | null;
  savedTripsCount?: number;
  currentTheme: ThemeConfig;
  onOpenThemeModal?: () => void;
  session: Session | null;
  onRequireAuth: () => void;
  onPlanTrip: () => void;
  onSignOut?: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  currentView,
  onNavigate,
  savedTripsCount = 0,
  currentTheme,
  onOpenThemeModal,
  session,
  onRequireAuth,
  onPlanTrip,
  onSignOut
}) => {
  const cachedProfile = session?.user ? getCachedUserProfile(session.user.id) : null;
  const userDisplayName = cachedProfile?.name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'User';

  const [savedTrailsCount, setSavedTrailsCount] = useState<number>(() => getSavedTrailsCount());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleCountChange = () => {
      setSavedTrailsCount(getSavedTrailsCount());
    };
    window.addEventListener('roamai_saved_trails_changed', handleCountChange);
    window.addEventListener('storage', handleCountChange);
    return () => {
      window.removeEventListener('roamai_saved_trails_changed', handleCountChange);
      window.removeEventListener('storage', handleCountChange);
    };
  }, []);

  // Close on Escape key press
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

  const handleDrawerNavigate = (view: any) => {
    onNavigate(view);
    onClose();
  };

  const handleSignOutInternal = async () => {
    if (onSignOut) {
      onSignOut();
    } else {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    }
    onClose();
  };

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  const drawerContent = (
    <div 
      className={`fixed inset-0 z-[99999] transition-visibility duration-300 ${
        isOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
      }`}
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop Overlay */}
      <div 
        onClick={onClose}
        onTouchMove={(e) => e.preventDefault()}
        className={`fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ease-in-out z-[99999] ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Slide-Out Drawer Panel - Above bottom navigation bar with full viewport height */}
      <div 
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        className={`fixed top-0 right-0 bottom-0 h-full h-[100dvh] max-h-screen w-[88vw] max-w-[420px] sm:w-1/2 sm:max-w-[480px] bg-black text-white border-l border-neutral-800 shadow-2xl z-[100000] flex flex-col transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ backgroundColor: '#000000', touchAction: 'pan-y' }}
      >
        {/* Pinned Drawer Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-neutral-800 shrink-0 bg-black z-10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl overflow-hidden shadow-lg shrink-0 ring-1 sm:ring-2 ring-neutral-700">
              <img
                src="/logo.png"
                alt="TripWise Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white truncate flex items-center gap-1">
                Trip<span style={{ color: currentTheme.primaryColor }}>Wise</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-neutral-400 font-medium truncate hidden xs:block">Smart AI Travel</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Header Sign Out Button */}
            {session && (
              <button
                type="button"
                onClick={handleSignOutInternal}
                className="px-2.5 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[11px]">Sign Out</span>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 active:scale-95"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Scrollable Drawer Content - Smooth touch scrolling with pb-36 and touch-pan-y */}
        <div 
          className="p-4 sm:p-5 overflow-y-auto overscroll-contain min-h-0 flex-1 space-y-4 sm:space-y-6 bg-black pb-36 sm:pb-28"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y'
          }}
        >

          {/* Navigation Section */}
          <div className="space-y-1.5 sm:space-y-2">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1 mb-1">
              Navigation
            </p>

            {/* Discover */}
            <button
              onClick={() => handleDrawerNavigate('landing')}
              className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all text-left group cursor-pointer border ${
                currentView === 'landing'
                  ? 'bg-neutral-900 text-white font-bold border-neutral-700 shadow-md'
                  : 'border-transparent text-neutral-300 hover:bg-neutral-900/80 hover:text-white hover:border-neutral-800 font-medium'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div 
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    currentView === 'landing'
                      ? 'text-white shadow-md'
                      : 'bg-neutral-900 text-neutral-300 group-hover:text-white group-hover:bg-neutral-800 border border-neutral-800'
                  }`}
                  style={currentView === 'landing' ? { backgroundColor: currentTheme.primaryColor } : undefined}
                >
                  <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-bold block truncate">Discover</span>
                  <span className="text-[10px] text-neutral-400 font-normal truncate hidden sm:block">Explore trending destinations</span>
                </div>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 text-neutral-400 group-hover:text-white shrink-0 hidden xs:block ${
                currentView === 'landing' ? 'text-white' : ''
              }`} />
            </button>

            {/* My Trips */}
            <button
              onClick={() => handleDrawerNavigate('my_trips')}
              className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all text-left group cursor-pointer border ${
                currentView === 'my_trips'
                  ? 'bg-neutral-900 text-white font-bold border-neutral-700 shadow-md'
                  : 'border-transparent text-neutral-300 hover:bg-neutral-900/80 hover:text-white hover:border-neutral-800 font-medium'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div 
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    currentView === 'my_trips'
                      ? 'text-white shadow-md'
                      : 'bg-neutral-900 text-neutral-300 group-hover:text-white group-hover:bg-neutral-800 border border-neutral-800'
                  }`}
                  style={currentView === 'my_trips' ? { backgroundColor: currentTheme.primaryColor } : undefined}
                >
                  <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold truncate">My Trips</span>
                    {savedTripsCount > 0 && (
                      <span 
                        className="px-1.5 py-0.2 text-[10px] font-black rounded-full text-slate-950"
                        style={{ backgroundColor: currentTheme.accentColor || '#34d399' }}
                      >
                        {savedTripsCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400 font-normal truncate hidden sm:block">Your saved itineraries</span>
                </div>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 text-neutral-400 group-hover:text-white shrink-0 hidden xs:block ${
                currentView === 'my_trips' ? 'text-white' : ''
              }`} />
            </button>

            {/* Saved Trails */}
            <button
              onClick={() => handleDrawerNavigate('saved_trails')}
              className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all text-left group cursor-pointer border ${
                currentView === 'saved_trails'
                  ? 'bg-neutral-900 text-white font-bold border-neutral-700 shadow-md'
                  : 'border-transparent text-neutral-300 hover:bg-neutral-900/80 hover:text-white hover:border-neutral-800 font-medium'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div 
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    currentView === 'saved_trails'
                      ? 'text-white shadow-md'
                      : 'bg-neutral-900 text-neutral-300 group-hover:text-white group-hover:bg-neutral-800 border border-neutral-800'
                  }`}
                  style={currentView === 'saved_trails' ? { backgroundColor: currentTheme.primaryColor } : undefined}
                >
                  <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold truncate">Saved Trails</span>
                    {savedTrailsCount > 0 && (
                      <span 
                        className="px-1.5 py-0.2 text-[10px] font-black rounded-full text-slate-950"
                        style={{ backgroundColor: currentTheme.accentColor || '#34d399' }}
                      >
                        {savedTrailsCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400 font-normal truncate hidden sm:block">Bookmarked travel trails</span>
                </div>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 text-neutral-400 group-hover:text-white shrink-0 hidden xs:block ${
                currentView === 'saved_trails' ? 'text-white' : ''
              }`} />
            </button>

            {/* About Tripwise */}
            <button
              onClick={() => handleDrawerNavigate('why_tripwise')}
              className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all text-left group cursor-pointer border ${
                currentView === 'why_tripwise' || currentView === 'why_roamai'
                  ? 'bg-neutral-900 text-white font-bold border-neutral-700 shadow-md'
                  : 'border-transparent text-neutral-300 hover:bg-neutral-900/80 hover:text-white hover:border-neutral-800 font-medium'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div 
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    currentView === 'why_tripwise' || currentView === 'why_roamai'
                      ? 'text-white shadow-md'
                      : 'bg-neutral-900 text-neutral-300 group-hover:text-white group-hover:bg-neutral-800 border border-neutral-800'
                  }`}
                  style={currentView === 'why_tripwise' || currentView === 'why_roamai' ? { backgroundColor: currentTheme.primaryColor } : undefined}
                >
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-bold block truncate">About</span>
                  <span className="text-[10px] text-neutral-400 font-normal truncate hidden sm:block">TripWise AI features</span>
                </div>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 text-neutral-400 group-hover:text-white shrink-0 hidden xs:block ${
                currentView === 'why_tripwise' || currentView === 'why_roamai' ? 'text-white' : ''
              }`} />
            </button>
          </div>

          {/* Quick Actions & Preferences */}
          <div className="space-y-1.5 sm:space-y-2 pt-2 border-t border-neutral-800">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1 mb-1">
              Actions
            </p>

            {/* Plan Trip Quick Action */}
            <button
              onClick={() => {
                onClose();
                onPlanTrip();
              }}
              className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-white font-bold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </div>
                <span className="text-xs sm:text-sm font-bold truncate">Plan Trip</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0 hidden xs:block" />
            </button>

            {/* Theme Selector */}
            {onOpenThemeModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenThemeModal();
                }}
                className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/90 text-neutral-200 hover:text-white transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-300 group-hover:text-white border border-neutral-700 shrink-0">
                    <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold truncate">Theme</span>
                      <div 
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-white/40 shadow-xs shrink-0" 
                        style={{ backgroundColor: currentTheme.primaryColor }} 
                      />
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white shrink-0 hidden xs:block" />
              </button>
            )}
          </div>

          {/* Login Profile Section */}
          <div className="pt-3 border-t border-neutral-800">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1 mb-1.5">
              Login Profile
            </p>

            {session ? (
              <div 
                onClick={() => handleDrawerNavigate('profile')}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 space-y-2.5 shadow-md cursor-pointer transition-all hover:bg-neutral-850 group"
                title="Click to view and edit profile"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div 
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-md ring-1 ring-white/20 shrink-0 group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: currentTheme.primaryColor }}
                  >
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-white truncate block group-hover:text-emerald-300 transition-colors">
                          {userDisplayName}
                        </span>
                        <span className="text-[10px] font-extrabold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-1.5 py-0.2 rounded-md shrink-0">
                          Lvl 4
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded-md shrink-0">
                        View
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                      {session.user.email}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800/80">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDrawerNavigate('profile');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-neutral-850 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-neutral-750"
                  >
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                    <span>View Profile Info</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSignOutInternal();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-red-600/25 hover:bg-red-600/40 border border-red-500/50 text-red-300 hover:text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 space-y-2 sm:space-y-3 shadow-md">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 shrink-0">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">Profile Login</h4>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onRequireAuth();
                  }}
                  className="w-full py-1.5 sm:py-2 px-2.5 rounded-lg sm:rounded-xl text-white text-[10px] sm:text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                >
                  <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Sign In</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pinned Drawer Footer with Quick Sign Out for 100% mobile accessibility */}
        <div className="p-3 sm:p-4 border-t border-neutral-800 bg-black/95 backdrop-blur-md shrink-0 space-y-2 z-10">
          {session && (
            <button
              type="button"
              onClick={handleSignOutInternal}
              className="w-full py-2.5 px-3 rounded-xl bg-red-600/25 hover:bg-red-600/40 border border-red-500/50 text-red-300 hover:text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>Sign Out</span>
            </button>
          )}
          <p className="text-[9px] sm:text-[11px] text-neutral-500 font-medium text-center">
            TripWise • AI Travel
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
};
