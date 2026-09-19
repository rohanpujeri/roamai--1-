import React from 'react';
import { Home, Play, Plus, Search } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { getCachedUserProfile } from '../services/supabaseClient';

export interface BottomNavBarProps {
  currentView: string;
  onNavigate: (view: any) => void;
  onStartPlanning: () => void;
  onOpenTravellerSearch: () => void;
  session: Session | null;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentView,
  onNavigate,
  onStartPlanning,
  onOpenTravellerSearch,
  session
}) => {
  const cachedProfile = getCachedUserProfile(session?.user?.id);
  const userAvatar = cachedProfile?.avatarUrl || session?.user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
  const userName = cachedProfile?.name || session?.user?.user_metadata?.full_name || 'Traveler';

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <nav 
        aria-label="Quick Navigation"
        className="flex items-center gap-1.5 sm:gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-[#141419]/90 hover:bg-[#141419]/95 backdrop-blur-2xl border border-white/12 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.65),0_2px_10px_rgba(0,0,0,0.4)] transition-all duration-300"
      >
        {/* 1. Home Button */}
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          aria-label="Home"
          title="Home"
          className={`relative p-2 sm:p-2.5 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center group ${
            currentView === 'landing'
              ? 'text-white'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Home className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform group-hover:scale-110 ${
            currentView === 'landing' ? 'stroke-[2.5]' : 'stroke-2'
          }`} />
          {currentView === 'landing' && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
          )}
        </button>

        {/* 2. Trails Button (Reels style video feed) */}
        <button
          type="button"
          onClick={() => onNavigate('trails')}
          aria-label="Trails Video Reels"
          title="Trails (Travel Reels)"
          className={`relative px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl sm:rounded-3xl transition-all duration-200 cursor-pointer flex items-center justify-center group ${
            currentView === 'trails'
              ? 'bg-neutral-800/90 text-white shadow-inner'
              : 'hover:bg-neutral-800/50 text-neutral-400 hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center">
            <Play className={`w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current transition-transform group-hover:scale-110 ${
              currentView === 'trails' ? 'text-white' : 'text-neutral-300'
            }`} />
          </div>
        </button>

        {/* 3. + Plan New Trip Button (Center) */}
        <button
          type="button"
          onClick={onStartPlanning}
          aria-label="Plan New Trip"
          title="Plan New Trip"
          className="relative p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all duration-200 cursor-pointer flex items-center justify-center group shadow-sm hover:shadow-white/10"
        >
          <Plus className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.5] transition-transform group-hover:rotate-90 group-hover:scale-110" />
          <span className="sr-only">Plan New Trip</span>
        </button>

        {/* 4. Travellers Profile Search */}
        <button
          type="button"
          onClick={onOpenTravellerSearch}
          aria-label="Search Travellers"
          title="Search Travellers"
          className="relative p-2 sm:p-2.5 rounded-full text-neutral-400 hover:text-white transition-all duration-200 cursor-pointer flex items-center justify-center group"
        >
          <Search className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-2 transition-transform group-hover:scale-110" />
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
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center text-white font-bold text-xs ring-1 ring-white/20">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span>{userName.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* Red status / notification dot matching the screenshot */}
          <span 
            className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#141419] shadow-xs"
            title="Profile notifications" 
          />
        </button>
      </nav>
    </div>
  );
};
