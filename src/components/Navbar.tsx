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
import { getSupabaseClient } from '../services/supabaseClient';

interface NavbarProps {
  currentView: 'landing' | 'wizard' | 'itinerary' | 'trip_mode' | 'my_trips' | 'map_search' | 'why_tripwise' | 'why_roamai';
  onNavigate: (view: 'landing' | 'wizard' | 'itinerary' | 'trip_mode' | 'my_trips' | 'map_search' | 'why_tripwise' | 'why_roamai') => void;
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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

  const handleDrawerNavigate = (view: 'landing' | 'wizard' | 'itinerary' | 'trip_mode' | 'my_trips' | 'map_search' | 'why_tripwise' | 'why_roamai') => {
    onNavigate(view);
    setIsDrawerOpen(false);
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsDrawerOpen(false);
    setIsUserMenuOpen(false);
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Left: Logo */}
            <div className="flex items-center gap-8">
              <button
                onClick={() => {
                  onNavigate('landing');
                  setIsDrawerOpen(false);
                }}
                className="flex items-center gap-2.5 text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-all duration-300 shrink-0 ring-2 ring-white/30">
                  <img
                    src="/logo.png"
                    alt="TripWise Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span 
                      className={`text-xl font-bold tracking-tight font-sans transition-colors duration-300 ${
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

            {/* Right Action buttons */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Color Theme Selector Pill (Hidden on tiny screens) */}
              <button
                onClick={onOpenThemeModal}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold backdrop-blur-md transition-all shadow-xs cursor-pointer ${
                  isDarkText
                    ? 'border-slate-300 bg-white/90 hover:bg-white text-slate-900 font-bold shadow-xs'
                    : 'border-white/30 bg-black/25 hover:bg-black/35 text-white'
                }`}
                style={!isDarkText ? { textShadow: '0 1px 3px rgba(0,0,0,0.6)' } : undefined}
                title="Change color theme palette"
              >
                <div 
                  className="w-3 h-3 rounded-full shadow-2xs border border-white/40 shrink-0"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                />
                <span className="font-bold">{currentTheme.name}</span>
                <Palette className={`w-3.5 h-3.5 ml-0.5 ${isDarkText ? 'text-slate-700' : 'text-white/80'}`} />
              </button>

              {/* Primary CTA: Plan My Trip */}
              <button
                onClick={onPlanTrip}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                style={{ backgroundColor: currentTheme.primaryColor }}
              >
                <Plus className="w-4 h-4" />
                <span>Plan My Trip</span>
              </button>

              {/* User Avatar / Sign In (Desktop) */}
              {session ? (
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all shadow-xs cursor-pointer ${
                      isDarkText
                        ? 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-900'
                        : 'border-white/30 bg-black/25 hover:bg-black/40 text-white'
                    }`}
                    title={session.user.email}
                  >
                    <User className="w-4 h-4" />
                  </button>
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl py-2 border border-slate-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Signed in as</p>
                        <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
                          {session.user.email}
                        </p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onRequireAuth}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold backdrop-blur-md transition-all shadow-xs cursor-pointer ${
                    isDarkText
                      ? 'border-slate-300 bg-white/90 hover:bg-white text-slate-900 shadow-xs'
                      : 'border-white/30 bg-black/25 hover:bg-black/35 text-white'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}

              {/* Three Lines Hamburger Menu Button (Top Right Corner - Desktop & Mobile) */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className={`flex items-center justify-center p-2.5 rounded-xl border transition-all duration-200 shadow-xs hover:scale-105 active:scale-95 cursor-pointer ${
                  isDarkText
                    ? 'text-slate-900 bg-white/90 hover:bg-white border-slate-300 shadow-sm'
                    : 'text-white bg-black/30 hover:bg-black/45 border-white/30'
                }`}
                aria-label="Open Navigation Drawer"
                title="Menu"
              >
                <Menu className="w-5 h-5 stroke-[2.2]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Slide-In Navigation Drawer from Right (Slide Left Page) */}
      <div 
        className={`fixed inset-0 z-50 transition-visibility duration-300 ${
          isDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Backdrop Overlay */}
        <div 
          onClick={() => setIsDrawerOpen(false)}
          className={`fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300 ease-in-out ${
            isDrawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />

        {/* Slide-Out Drawer Panel */}
        <div 
          className={`fixed top-0 right-0 bottom-0 w-full max-w-sm sm:max-w-md bg-slate-900/95 text-white backdrop-blur-3xl border-l border-white/10 shadow-2xl z-50 flex flex-col justify-between transition-transform duration-300 ease-out transform ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Top Section / Header */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shrink-0 ring-2 ring-white/20">
                  <img
                    src="/logo.png"
                    alt="TripWise Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                    Trip<span style={{ color: currentTheme.primaryColor }}>Wise</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Smart AI Travel Companion</p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links Section */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
                Navigation
              </p>

              {/* 1. Discover */}
              <button
                onClick={() => handleDrawerNavigate('landing')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left group cursor-pointer ${
                  currentView === 'landing'
                    ? 'bg-white/15 text-white font-bold ring-1 ring-white/20 shadow-lg'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white font-medium'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div 
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      currentView === 'landing'
                        ? 'text-white shadow-md'
                        : 'bg-white/10 text-slate-300 group-hover:text-white group-hover:bg-white/15'
                    }`}
                    style={currentView === 'landing' ? { backgroundColor: currentTheme.primaryColor } : undefined}
                  >
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-base font-bold block">Discover</span>
                    <span className="text-xs text-slate-400 font-normal">Explore trending destinations & itineraries</span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all ${
                  currentView === 'landing' ? 'text-white' : ''
                }`} />
              </button>

              {/* 2. My Trips */}
              <button
                onClick={() => handleDrawerNavigate('my_trips')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left group cursor-pointer ${
                  currentView === 'my_trips'
                    ? 'bg-white/15 text-white font-bold ring-1 ring-white/20 shadow-lg'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white font-medium'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div 
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      currentView === 'my_trips'
                        ? 'text-white shadow-md'
                        : 'bg-white/10 text-slate-300 group-hover:text-white group-hover:bg-white/15'
                    }`}
                    style={currentView === 'my_trips' ? { backgroundColor: currentTheme.primaryColor } : undefined}
                  >
                    <Bookmark className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold">My Trips</span>
                      {savedTripsCount > 0 && (
                        <span 
                          className="px-2 py-0.5 text-[11px] font-black rounded-full text-slate-950"
                          style={{ backgroundColor: currentTheme.accentColor || '#34d399' }}
                        >
                          {savedTripsCount}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-normal">View & manage your planned itineraries</span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all ${
                  currentView === 'my_trips' ? 'text-white' : ''
                }`} />
              </button>

              {/* 3. About Tripwise */}
              <button
                onClick={() => handleDrawerNavigate('why_tripwise')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left group cursor-pointer ${
                  currentView === 'why_tripwise' || currentView === 'why_roamai'
                    ? 'bg-white/15 text-white font-bold ring-1 ring-white/20 shadow-lg'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white font-medium'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div 
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      currentView === 'why_tripwise' || currentView === 'why_roamai'
                        ? 'text-white shadow-md'
                        : 'bg-white/10 text-slate-300 group-hover:text-white group-hover:bg-white/15'
                    }`}
                    style={currentView === 'why_tripwise' || currentView === 'why_roamai' ? { backgroundColor: currentTheme.primaryColor } : undefined}
                  >
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-base font-bold block">About Tripwise</span>
                    <span className="text-xs text-slate-400 font-normal">Why TripWise AI & features breakdown</span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all ${
                  currentView === 'why_tripwise' || currentView === 'why_roamai' ? 'text-white' : ''
                }`} />
              </button>
            </div>

            {/* 4. Login Profile Section */}
            <div className="pt-2 border-t border-white/10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
                Login Profile
              </p>

              {session ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-md ring-2 ring-white/20 shrink-0"
                      style={{ backgroundColor: currentTheme.primaryColor }}
                    >
                      {session.user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white truncate block">
                          {session.user.email?.split('@')[0] || 'User Profile'}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {session.user.email}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                    <span>Saved Trips in Cloud:</span>
                    <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
                      {savedTripsCount}
                    </span>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="w-full mt-1 py-2.5 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 hover:text-red-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out from Profile</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-slate-300 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Login / User Profile</h4>
                      <p className="text-xs text-slate-400">Access synced trips & cloud itinerary saves</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onRequireAuth();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    style={{ backgroundColor: currentTheme.primaryColor }}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In / Login Profile</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions & Preferences */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
                Actions & Preferences
              </p>

              {/* Plan Trip Quick Action */}
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onPlanTrip();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl text-white font-bold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{ backgroundColor: currentTheme.primaryColor }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold block">Plan a New Trip</span>
                    <span className="text-xs text-white/80 font-normal">Launch the AI trip creation wizard</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/80" />
              </button>

              {/* Theme Selector */}
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenThemeModal();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-slate-300 group-hover:text-white">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">Theme: {currentTheme.name}</span>
                      <div 
                        className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs" 
                        style={{ backgroundColor: currentTheme.primaryColor }} 
                      />
                    </div>
                    <span className="text-xs text-slate-400">Customize visual appearance & atmosphere</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
              </button>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-black/20 text-center">
            <p className="text-xs text-slate-500 font-medium">
              TripWise • Intelligent Autonomous Travel Engine
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
