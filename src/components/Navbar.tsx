import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Sparkles, 
  Navigation, 
  Bookmark, 
  User, 
  Menu, 
  X, 
  ChevronRight, 
  Palette, 
  Info, 
  LogOut, 
  LogIn, 
  Luggage,
  ShieldCheck
} from 'lucide-react';
import { Trip, ThemeConfig } from '../types';
import { Session } from '@supabase/supabase-js';
import { getSupabaseClient, getCachedUserProfile } from '../services/supabaseClient';
import { UserProfileModal } from './UserProfileModal';
import { NavigationDrawer } from './NavigationDrawer';

interface NavbarProps {
  currentView: 'landing' | 'wizard' | 'itinerary' | 'trip_mode' | 'my_trips' | 'map_search' | 'why_tripwise' | 'why_roamai' | 'profile' | 'trails' | 'travellers_search' | 'saved_trails' | 'upload_trail';
  onNavigate: (view: 'landing' | 'wizard' | 'itinerary' | 'trip_mode' | 'my_trips' | 'map_search' | 'why_tripwise' | 'why_roamai' | 'profile' | 'trails' | 'travellers_search' | 'saved_trails' | 'upload_trail') => void;
  activeTrip: Trip | null;
  savedTripsCount: number;
  currentTheme: ThemeConfig;
  onOpenThemeModal: () => void;
  session: Session | null;
  onRequireAuth: () => void;
  onPlanTrip: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  activeTrip,
  savedTripsCount,
  currentTheme,
  onOpenThemeModal,
  session,
  onRequireAuth,
  onPlanTrip
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  const cachedProfile = session?.user ? getCachedUserProfile(session.user.id) : null;
  const userDisplayName = cachedProfile?.name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'User';

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    };
    if (isDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  const isDarkText = currentTheme.id === 'snow';

  const handleDrawerNavigate = (view: 'landing' | 'wizard' | 'itinerary' | 'trip_mode' | 'my_trips' | 'map_search' | 'why_tripwise' | 'why_roamai' | 'profile' | 'trails' | 'travellers_search') => {
    onNavigate(view);
    setIsDrawerOpen(false);
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsDrawerOpen(false);
  };

  return (
    <>
      <header 
        className="sticky top-0 z-40 transition-colors duration-300 relative bg-transparent pt-2.5 sm:pt-1"
      >
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center justify-between h-14 sm:h-18">
            {/* Left: Logo */}
            <div className="flex items-center gap-4 sm:gap-8 min-w-0">
              <button
                onClick={() => {
                  onNavigate('landing');
                  setIsDrawerOpen(false);
                }}
                className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer shrink-0 bg-transparent border-0 p-1 shadow-none transition-transform hover:scale-102 active:scale-98"
              >
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-all duration-300 shrink-0 ring-1.5 ring-white/30">
                  <img
                    src="/logo.png"
                    alt="TripWise Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span 
                      className="text-base sm:text-xl font-bold tracking-tight font-sans transition-colors duration-300 text-white"
                      style={{ textShadow: '0 2px 8px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)' }}
                    >
                      Trip<span style={{ color: currentTheme.primaryColor }}>Wise</span>
                    </span>
                  </div>
                  <p 
                    className="text-[10px] sm:text-[11px] -mt-0.5 hidden sm:block font-medium transition-colors duration-300 text-white/90"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.85)' }}
                  >
                    Plan • Prepare • Travel • Adapt
                  </p>
                </div>
              </button>

              {/* Desktop Navigation Links */}
              <nav className="hidden md:flex items-center gap-1.5">
                <button
                  onClick={() => onNavigate('landing')}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'landing'
                      ? 'text-white font-bold bg-slate-900 shadow-md'
                      : isDarkText
                      ? 'text-slate-800 font-bold hover:text-slate-950 hover:bg-slate-900/10'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                  style={!isDarkText && currentView !== 'landing' ? { textShadow: '0 1px 4px rgba(0,0,0,0.6)' } : undefined}
                >
                  <span>Discover</span>
                </button>

                <button
                  onClick={() => onNavigate('my_trips')}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'my_trips'
                      ? 'text-white font-bold bg-slate-900 shadow-md'
                      : isDarkText
                      ? 'text-slate-800 font-bold hover:text-slate-950 hover:bg-slate-900/10'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                  style={!isDarkText && currentView !== 'my_trips' ? { textShadow: '0 1px 4px rgba(0,0,0,0.6)' } : undefined}
                >
                  <span>My Trips</span>
                  {savedTripsCount > 0 && (
                    <span 
                      className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold shadow-xs ${
                        currentView === 'my_trips'
                          ? 'bg-emerald-400 text-slate-950 font-black'
                          : isDarkText
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-900'
                      }`}
                    >
                      {savedTripsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => onNavigate('why_tripwise')}
                  title="About TripWise"
                  aria-label="About TripWise"
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'why_tripwise' || currentView === 'why_roamai'
                      ? 'text-white font-bold bg-slate-900 shadow-md'
                      : isDarkText
                      ? 'text-slate-800 font-bold hover:text-slate-950 hover:bg-slate-900/10'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                  style={!isDarkText && currentView !== 'why_tripwise' && currentView !== 'why_roamai' ? { textShadow: '0 1px 4px rgba(0,0,0,0.6)' } : undefined}
                >
                  <span>About Tripwise</span>
                </button>
              </nav>
            </div>

            {/* Right Action buttons (Optimized for Mobile) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Color Theme Selector */}
              <button
                onClick={onOpenThemeModal}
                className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:px-2 sm:py-1 rounded-lg bg-transparent border-0 shadow-none text-xs font-bold transition-all cursor-pointer hover:opacity-80 active:scale-95 ${
                  isDarkText
                    ? 'text-slate-900 font-bold'
                    : 'text-white'
                }`}
                style={!isDarkText ? { textShadow: '0 1px 4px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.6)' } : undefined}
                title="Change color theme palette"
              >
                <div 
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shadow-md border-2 border-white/60 shrink-0"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                />
                <span className="font-bold hidden md:inline">{currentTheme.name}</span>
                <Palette className={`w-4 h-4 ${isDarkText ? 'text-slate-800' : 'text-white drop-shadow-md'}`} />
              </button>



              {/* Three Lines Hamburger Menu Button (Top Right Corner) - Hidden on Home Page */}
              {currentView !== 'landing' && (
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className={`flex items-center justify-center p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border transition-all duration-200 shadow-xs hover:scale-105 active:scale-95 cursor-pointer ${
                    isDarkText
                      ? 'text-slate-900 bg-white/90 hover:bg-white border-slate-300 shadow-sm'
                      : 'text-white bg-black/30 hover:bg-black/45 border-white/30'
                  }`}
                  aria-label="Open Navigation Drawer"
                  title="Menu"
                >
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Slide-In Navigation Drawer from Right - Hidden on Home Page */}
      {currentView !== 'landing' && (
        <NavigationDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          currentView={currentView}
          onNavigate={handleDrawerNavigate}
          activeTrip={activeTrip}
          savedTripsCount={savedTripsCount}
          currentTheme={currentTheme}
          onOpenThemeModal={onOpenThemeModal}
          session={session}
          onRequireAuth={() => {
            setIsDrawerOpen(false);
            onRequireAuth();
          }}
          onPlanTrip={() => {
            setIsDrawerOpen(false);
            onPlanTrip();
          }}
          onSignOut={handleSignOut}
        />
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        key={profileRefreshKey}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        session={session}
        currentTheme={currentTheme}
        savedTripsCount={savedTripsCount}
        onSignOut={handleSignOut}
        onProfileUpdated={() => {
          setProfileRefreshKey((prev) => prev + 1);
        }}
      />
    </>
  );
};
