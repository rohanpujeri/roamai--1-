import React, { useState } from 'react';
import { Compass, Sparkles, Navigation, Bookmark, User, Plus, Menu, X, ChevronDown, Check, Sliders, MapPin, Palette } from 'lucide-react';
import { Trip, ThemeConfig } from '../types';

interface NavbarProps {
  currentView: 'landing' | 'wizard' | 'itinerary' | 'trip_mode' | 'my_trips' | 'map_search' | 'why_roamai';
  onNavigate: (view: 'landing' | 'wizard' | 'itinerary' | 'trip_mode' | 'my_trips' | 'map_search' | 'why_roamai') => void;
  activeTrip: Trip | null;
  savedTripsCount: number;
  currentTheme: ThemeConfig;
  onOpenThemeModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  activeTrip,
  savedTripsCount,
  currentTheme,
  onOpenThemeModal
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isWhiteBg = isHovered || isScrolled;
  const isDarkText = isWhiteBg || currentTheme.id === 'snow' || !currentTheme.isDark;

  return (
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
          {/* Logo */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => {
                onNavigate('landing');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0"
                style={{ background: currentTheme.heroGradient }}
              >
                <Compass className="w-5 h-5 transition-transform group-hover:rotate-45" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span 
                    className={`text-xl font-bold tracking-tight font-sans transition-colors duration-300 ${
                      isDarkText ? 'text-slate-900 font-extrabold' : 'text-white'
                    }`}
                    style={!isDarkText ? { textShadow: '0 1px 4px rgba(0,0,0,0.6)' } : undefined}
                  >
                    Roam<span style={{ color: currentTheme.primaryColor }}>AI</span>
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
                onClick={() => onNavigate('why_roamai')}
                title="About RoamAI"
                aria-label="About RoamAI"
                className={`w-9 h-9 rounded-xl text-sm font-bold transition-all flex items-center justify-center cursor-pointer ${
                  currentView === 'why_roamai'
                    ? 'text-white font-black bg-slate-900 shadow-md'
                    : isDarkText
                    ? 'text-slate-800 font-black hover:text-slate-950 hover:bg-slate-900/10'
                    : 'text-white/90 hover:text-white hover:bg-white/10 font-black'
                }`}
                style={!isDarkText && currentView !== 'why_roamai' ? { textShadow: '0 1px 4px rgba(0,0,0,0.6)' } : undefined}
              >
                <span className="text-base font-black italic font-serif">i</span>
              </button>

              {activeTrip && (
                <button
                  onClick={() => onNavigate('itinerary')}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'itinerary'
                      ? 'text-white font-bold bg-slate-900 shadow-md'
                      : isDarkText
                      ? 'text-slate-800 font-bold hover:text-slate-950 hover:bg-slate-900/10'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                  style={!isDarkText && currentView !== 'itinerary' ? { textShadow: '0 1px 4px rgba(0,0,0,0.6)' } : undefined}
                >
                  <MapPin className={`w-3.5 h-3.5 ${isDarkText && currentView !== 'itinerary' ? 'text-slate-700' : 'text-white'}`} />
                  <span>{activeTrip.destination} Itinerary</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right Action buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Color Theme Selector Pill */}
            <button
              onClick={onOpenThemeModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold backdrop-blur-md transition-all shadow-xs cursor-pointer ${
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

            {/* Primary CTA */}
            <button
              onClick={() => onNavigate('wizard')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              <Plus className="w-4 h-4" />
              <span>Plan My Trip</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenThemeModal}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center shadow-xs ${
                isDarkText
                  ? 'border-slate-300 bg-white/90 text-slate-900'
                  : 'border-white/30 bg-black/25 text-white'
              }`}
              title="Theme options"
            >
              <Palette className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('wizard')}
              className="p-2 rounded-xl text-white text-xs font-bold flex items-center gap-1 shadow-xs"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              <Plus className="w-4 h-4" />
              <span>Plan</span>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 rounded-xl border shadow-xs transition-colors ${
                isDarkText
                  ? 'text-slate-900 bg-white/90 hover:bg-white border-slate-300 font-bold'
                  : 'text-white bg-black/25 hover:bg-black/35 border-white/30'
              }`}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-white/20 bg-slate-900/95 backdrop-blur-2xl px-4 pt-2 pb-6 space-y-2 shadow-2xl text-white">
          <button
            onClick={() => {
              onNavigate('landing');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/10"
          >
            Discover & Features
          </button>
          <button
            onClick={() => {
              onNavigate('my_trips');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/10 flex items-center justify-between"
          >
            <span>My Trips</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-white text-slate-900 font-bold">
              {savedTripsCount}
            </span>
          </button>
          <button
            onClick={() => {
              onNavigate('why_roamai');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/10 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>About RoamAI (Why RoamAI)</span>
          </button>
          {activeTrip && (
            <button
              onClick={() => {
                onNavigate('itinerary');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 bg-white/15 text-white"
            >
              <MapPin className="w-4 h-4 text-white" />
              <span>{activeTrip.destination} Itinerary</span>
            </button>
          )}
          
          <div className="pt-2 border-t border-white/10">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenThemeModal();
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/10 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-white/80" />
                <span>Color Theme: {currentTheme.name}</span>
              </span>
              <div className="w-3.5 h-3.5 rounded-full border border-white/40" style={{ backgroundColor: currentTheme.primaryColor }} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
