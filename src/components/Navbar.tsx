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
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  const cachedProfile = session?.user ? getCachedUserProfile(session.user.id) : null;
  const userDisplayName = cachedProfile?.name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    const handleScroll = (e?: Event) => {
      const target = e?.target as HTMLElement | undefined;
      const scrollY = target && typeof target.scrollTop === 'number' ? target.scrollTop : window.scrollY;
      setIsScrolled(scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

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

  const isDarkText = !currentTheme.isDark ? (isScrolled || currentTheme.id === 'snow') : false;

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
        className="sticky top-0 z-40 transition-colors duration-300 relative bg-black/15 dark:bg-black/30 backdrop-blur-xs"
      >
        {/* Backdrop on Scroll with Theme Awareness - NO slide down translation */}
        <div 
          className={`absolute inset-0 ${
            currentTheme.isDark 
              ? 'bg-slate-950/85 border-b border-white/10' 
              : 'bg-white/85 border-b border-slate-200/80'
          } backdrop-blur-2xl shadow-md transition-opacity duration-300 ease-out pointer-events-none ${
            isScrolled 
              ? 'opacity-100' 
              : 'opacity-0'
          }`} 
        />

        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center justify-between h-14 sm:h-18">
            {/* Left: Logo */}
            <div className="flex items-center gap-4 sm:gap-8 min-w-0">
              <button
                onClick={() => {
                  onNavigate('landing');
                  setIsDrawerOpen(false);
                }}
                className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer shrink-0"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-all duration-300 shrink-0 ring-2 ring-white/30">
                  <img
                    src="/logo.png"
                    alt="TripWise Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span 
                      className={`text-lg sm:text-xl font-bold tracking-tight font-sans transition-colors duration-300 ${
                        isDarkText ? 'text-slate-900 font-extrabold' : 'text-white'
                      }`}
                      style={!isDarkText ? { textShadow: '0 1px 4px rgba(0,0,0,0.6)' } : undefined}
                    >
                      Trip<span style={{ color: currentTheme.primaryColor }}>Wise</span>
                    </span>
                  </div>
                  <p 
                    className={`text-[11px] -mt-0.5 hidden sm:block font-medium transition-colors duration-300 ${
                      isDarkText ? 'text-slate-700 font-semibold' : 'text-white/80'
                    }`}
                    style={!isDarkText ? { textShadow: '0 1px 3px rgba(0,0,0,0.6)' } : undefined}
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
              {/* Color Theme Selector Pill */}
              <button
                onClick={onOpenThemeModal}
                className={`flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border text-xs font-bold backdrop-blur-md transition-all shadow-xs cursor-pointer ${
                  isDarkText
                    ? 'border-slate-300 bg-white/90 hover:bg-white text-slate-900 font-bold shadow-xs'
                    : 'border-white/30 bg-black/25 hover:bg-black/35 text-white'
                }`}
                style={!isDarkText ? { textShadow: '0 1px 3px rgba(0,0,0,0.6)' } : undefined}
                title="Change color theme palette"
              >
                <div 
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-2xs border border-white/40 shrink-0"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                />
                <span className="font-bold hidden md:inline">{currentTheme.name}</span>
                <Palette className={`w-3.5 h-3.5 ${isDarkText ? 'text-slate-700' : 'text-white/80'}`} />
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
