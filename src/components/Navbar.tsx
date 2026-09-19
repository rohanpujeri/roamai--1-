import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Sparkles, 
  Navigation, 
  Bookmark, 
  User, 
  Plus, 
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

interface NavbarProps {
  currentView: 'landing' | 'wizard' | 'itinerary' | 'trip_mode' | 'my_trips' | 'map_search' | 'why_tripwise' | 'why_roamai' | 'profile' | 'trails';
  onNavigate: (view: 'landing' | 'wizard' | 'itinerary' | 'trip_mode' | 'my_trips' | 'map_search' | 'why_tripwise' | 'why_roamai' | 'profile' | 'trails') => void;
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
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  const cachedProfile = session?.user ? getCachedUserProfile(session.user.id) : null;
  const userDisplayName = cachedProfile?.name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'User';
  const userPlace = cachedProfile?.place || session?.user?.user_metadata?.place || '';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  const isWhiteBg = isHovered || isScrolled;
  const isDarkText = isWhiteBg || currentTheme.id === 'snow' || !currentTheme.isDark;

  const handleDrawerNavigate = (view: 'landing' | 'wizard' | 'itinerary' | 'trip_mode' | 'my_trips' | 'map_search' | 'why_tripwise' | 'why_roamai' | 'profile' | 'trails') => {
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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="sticky top-0 z-40 transition-all duration-300 relative"
      >
        {/* Sliding / Dropping White Background on Hover/Scroll */}
        <div 
          className={`absolute inset-0 bg-white/95 backdrop-blur-2xl border-b border-slate-200/90 shadow-md transition-all duration-300 ease-out pointer-events-none ${
            isWhiteBg 
              ? 'translate-y-0 opacity-100' 
              : '-translate-y-full opacity-0'
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


              {/* Primary CTA: Plan My Trip (Optimized for mobile single-line) */}
              <button
                onClick={onPlanTrip}
                className="flex items-center gap-1 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: currentTheme.primaryColor }}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="sm:hidden">Plan</span>
                <span className="hidden sm:inline">Plan My Trip</span>
              </button>

              {/* Three Lines Hamburger Menu Button (Top Right Corner) */}
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
            </div>
          </div>
        </div>
      </header>

      {/* Slide-In Navigation Drawer from Right (Slide Left Page - Only Fills Half of Screen) */}
      <div 
        className={`fixed inset-0 z-50 transition-visibility duration-300 ${
          isDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Backdrop Overlay */}
        <div 
          onClick={() => setIsDrawerOpen(false)}
          className={`fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ease-in-out ${
            isDrawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />

        {/* Slide-Out Drawer Panel - Exactly Half Screen Width */}
        <div 
          className={`fixed top-0 right-0 bottom-0 w-1/2 max-w-[50vw] bg-black text-white border-l border-neutral-800 shadow-2xl z-50 flex flex-col justify-between transition-transform duration-300 ease-out transform ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ backgroundColor: '#000000', width: '50vw' }}
        >
          {/* Main Scrollable Drawer Content */}
          <div className="p-3 sm:p-5 overflow-y-auto space-y-4 sm:space-y-6 flex-1 flex flex-col bg-black">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-neutral-800">
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

              {/* Close Button */}
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Discover, 2. My Trips, 3. About Tripwise */}
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
                  setIsDrawerOpen(false);
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
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
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
            </div>

            {/* Spacer to push Login Profile to bottom if viewport is tall */}
            <div className="flex-1 min-h-2" />

            {/* Login Profile Section (Positioned at Bottom of Drawer) */}
            <div className="pt-3 border-t border-neutral-800 mt-auto">
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
                        {userPlace ? `${userPlace} • ` : ''}{session.user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-neutral-800/80">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDrawerNavigate('profile');
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <User className="w-3 h-3 text-neutral-400" />
                      <span>View Profile Info</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSignOut();
                      }}
                      className="py-1.5 px-2.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 hover:text-red-200 text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
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
                      setIsDrawerOpen(false);
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

          {/* Drawer Footer */}
          <div className="p-2.5 sm:p-4 border-t border-neutral-800 bg-black text-center shrink-0">
            <p className="text-[9px] sm:text-[11px] text-neutral-500 font-medium">
              TripWise • AI Travel
            </p>
          </div>
        </div>
      </div>

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
