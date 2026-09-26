import React from 'react';
import { Home, Play, Plus, Search, User } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { getCachedUserProfile, sanitizeAvatarUrl } from '../services/supabaseClient';
import { ThemeConfig } from '../types';

export interface BottomNavBarProps {
  currentView: string;
  onNavigate: (view: any) => void;
  onStartPlanning: () => void;
  onOpenTravellerSearch: () => void;
  session: Session | null;
  currentTheme?: ThemeConfig;
  onRequireAuth?: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentView,
  onNavigate,
  onStartPlanning,
  onOpenTravellerSearch,
  session,
  currentTheme,
  onRequireAuth
}) => {
  const cachedProfile = getCachedUserProfile(session?.user?.id);
  const rawAvatar = cachedProfile?.avatarUrl || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.avatarUrl || '';
  const userAvatar = sanitizeAvatarUrl(rawAvatar);
  const userName = cachedProfile?.name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'Traveler';

  return (
    <div 
      style={{ 
        transform: 'translate3d(-50%, 0, 0)', 
        willChange: 'transform',
        bottom: currentView === 'trails'
          ? 'calc(env(safe-area-inset-bottom, 0px) + 4px)'
          : 'calc(env(safe-area-inset-bottom, 0px) + 16px)'
      }}
      className="fixed left-1/2 z-50 pointer-events-auto w-[92vw] max-w-[460px] sm:max-w-[500px] transition-[bottom,padding] duration-200 ease-out"
    >
      <nav 
        aria-label="Quick Navigation"
        className={`w-full flex items-center justify-between ${currentView === 'trails' ? 'px-4 sm:px-6 py-1.5 sm:py-2' : 'px-5 sm:px-7 py-2.5 sm:py-3.5'} bg-[#141419]/95 hover:bg-[#141419]/98 backdrop-blur-md border border-white/15 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.65),0_4px_12px_rgba(0,0,0,0.4)] transition-[padding] duration-200 ease-out`}
      >
        {/* 1. Home Button */}
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          aria-label="Home"
          title="Home"
          className={`relative ${currentView === 'trails' ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3'} rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center group ${
            currentView === 'landing'
              ? 'text-white'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Home className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110 ${
            currentView === 'landing' ? 'stroke-[2.5]' : 'stroke-2'
          }`} />
          {currentView === 'landing' && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full" />
          )}
        </button>

        {/* 2. Trails Button (Reels style video feed) */}
        <button
          type="button"
          onClick={() => {
            if (!session) {
              if (onRequireAuth) {
                onRequireAuth();
              } else {
                onNavigate('auth');
              }
              return;
            }
            onNavigate('trails');
          }}
          aria-label="Trails Video Feed"
          title="Trails"
          className={`relative ${currentView === 'trails' ? 'p-1.5 sm:p-2' : 'p-2 sm:p-2.5'} rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center group ${
            currentView === 'trails'
              ? 'text-white'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all duration-200 ${
            currentView === 'trails'
              ? 'border-2 border-white bg-white/20 text-white shadow-[0_0_12px_rgba(255,255,255,0.3)] scale-105'
              : 'border border-white/40 group-hover:border-white/80 text-neutral-300 group-hover:text-white group-hover:scale-105'
          }`}>
            <Play className={`w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5 transition-transform ${
              currentView === 'trails' ? 'text-white' : 'text-neutral-300 group-hover:text-white'
            }`} />
          </div>
          {currentView === 'trails' && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full" />
          )}
        </button>

        {/* 3. + Plan New Trip Button (Center with Theme Background) */}
        <button
          type="button"
          onClick={onStartPlanning}
          aria-label="Plan New Trip"
          title="Plan New Trip"
          style={{
            background: currentTheme?.heroGradient || currentTheme?.primaryColor || 'linear-gradient(135deg, #0284c7, #0d9488)',
            boxShadow: `0 4px 18px ${currentTheme?.primaryColor || '#0284c7'}70`
          }}
          className={`relative p-2.5 sm:p-3 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center group active:scale-95 text-white ${
            currentView === 'wizard'
              ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-105'
              : 'hover:brightness-110 hover:scale-105'
          }`}
        >
          <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5] transition-transform group-hover:rotate-90 group-hover:scale-110" />
          <span className="sr-only">Plan New Trip</span>
        </button>

        {/* 4. Travellers Profile Search (Separate Page) */}
        <button
          type="button"
          onClick={() => onNavigate('travellers_search')}
          aria-label="Search Travellers"
          title="Search Travellers"
          className={`relative p-2.5 sm:p-3 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center group ${
            currentView === 'travellers_search'
              ? 'text-white'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Search className={`w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-110 ${
            currentView === 'travellers_search' ? 'stroke-[2.5]' : 'stroke-2'
          }`} />
          {currentView === 'travellers_search' && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full" />
          )}
        </button>

        {/* 5. Travellers Profile (Avatar with red indicator dot) */}
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          aria-label="Travellers Profile"
          title={`Profile (${userName})`}
          className={`relative p-0.5 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center group ${
            currentView === 'profile' ? 'ring-2 ring-white/60' : 'hover:ring-1 hover:ring-white/40'
          }`}
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center text-white font-bold text-xs sm:text-sm ring-1 ring-white/25">
            {session && userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : session ? (
              <span>{userName.charAt(0).toUpperCase()}</span>
            ) : (
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-300" />
            )}
          </div>
        </button>
      </nav>
    </div>
  );
};
