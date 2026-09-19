import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Calendar,
  MapPin,
  Mail,
  Check,
  Edit2,
  Save,
  Loader2,
  ShieldCheck,
  LogOut,
  Sparkles
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { ThemeConfig, UserProfileData } from '../types';
import { getCachedUserProfile, updateUserProfileData, getSupabaseClient, sanitizeAvatarUrl } from '../services/supabaseClient';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  currentTheme: ThemeConfig;
  savedTripsCount?: number;
  onSignOut?: () => void;
  onProfileUpdated?: (updated: UserProfileData) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  session,
  currentTheme,
  savedTripsCount = 0,
  onSignOut,
  onProfileUpdated
}) => {
  const user = session?.user;
  const userMeta = user?.user_metadata || {};

  // Form states
  const [fullName, setFullName] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [place, setPlace] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load user data on mount or session change
  useEffect(() => {
    if (!user) return;
    const cached = getCachedUserProfile(user.id);
    const initialName = cached?.name || userMeta.full_name || userMeta.name || user.email?.split('@')[0] || '';
    const initialDob = cached?.dob || userMeta.dob || '';
    const initialPlace = cached?.place || userMeta.place || '';
    const initialAvatar = sanitizeAvatarUrl(cached?.avatarUrl || userMeta.avatar_url || userMeta.avatarUrl || '');

    setFullName(initialName);
    setDob(initialDob);
    setPlace(initialPlace);
    setAvatarUrl(initialAvatar);
    setIsEditing(false);
    setSaveSuccess(false);
    setErrorMessage(null);
  }, [user, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !session) return null;

  // Format DOB nicely for display (e.g., "15 Aug 1998")
  const formatDobDisplay = (dobStr?: string) => {
    if (!dobStr) return 'Not provided';
    const parts = dobStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const formatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      
      // Calculate age
      const now = new Date();
      let age = now.getFullYear() - parts[0];
      const m = now.getMonth() - (parts[1] - 1);
      if (m < 0 || (m === 0 && now.getDate() < parts[2])) {
        age--;
      }
      return `${formatted}${age > 0 ? ` (${age} yrs)` : ''}`;
    }
    return dobStr;
  };

  // Format Member Since date
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Recent Traveler';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    const updatedProfile: UserProfileData = {
      name: fullName.trim() || user?.email?.split('@')[0] || 'Traveler',
      dob: dob.trim(),
      place: place.trim(),
      email: user?.email
    };

    const result = await updateUserProfileData(updatedProfile);
    setSaving(false);

    if (result.error) {
      setErrorMessage(result.error);
    } else {
      setSaveSuccess(true);
      setIsEditing(false);
      if (onProfileUpdated) {
        onProfileUpdated(updatedProfile);
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const userInitial = (fullName || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden z-10 text-white animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero Banner with Accent Gradient */}
        <div 
          className="h-28 sm:h-32 w-full relative p-4 flex items-start justify-between"
          style={{
            background: `linear-gradient(135deg, ${currentTheme.primaryColor}cc, #09090b)`
          }}
        >
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>TripWise Verified Account</span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
            aria-label="Close Profile Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Avatar & Primary Identification */}
        <div className="px-5 sm:px-6 pt-0 pb-6 relative -mt-12 sm:-mt-14 space-y-5">
          <div className="flex items-end justify-between gap-3">
            <div className="relative">
              <div 
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl border-4 border-zinc-950 overflow-hidden flex items-center justify-center text-white font-extrabold text-2xl sm:text-3xl shadow-xl ring-2 ring-white/10"
                style={{ backgroundColor: currentTheme.primaryColor }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  userInitial
                )}
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-zinc-950 ring-1 ring-emerald-400/40" />
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {/* User Name & Quick Badge */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">
                {fullName || 'Welcome, Traveler!'}
              </h2>
              {saveSuccess && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-md">
                  <Check className="w-3 h-3" />
                  Saved
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 truncate flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>{user?.email}</span>
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* VIEW MODE: Information Cards */}
          {!isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Full Name */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-semibold">
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Full Name</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {fullName || 'Not provided'}
                  </p>
                </div>

                {/* 2. Date of Birth */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Date of Birth</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {formatDobDisplay(dob)}
                  </p>
                </div>

                {/* 3. Place / Location */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Place / Location</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {place || 'Not provided'}
                  </p>
                </div>

                {/* 4. Trips & Membership */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Traveler Stats</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {savedTripsCount} {savedTripsCount === 1 ? 'Trip Planned' : 'Trips Planned'} • Member since {memberSince}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onSignOut) onSignOut();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* EDIT MODE: Form */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-3">
                {/* Name field */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rohan Pujeri"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-black border border-zinc-700 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold placeholder:text-zinc-600"
                      required
                    />
                  </div>
                </div>

                {/* DOB & Place in 2 Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* DOB field */}
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">
                      Date of Birth
                    </label>
                    <div className="relative flex items-center">
                      <Calendar className="w-4 h-4 text-zinc-500 absolute left-3 pointer-events-none" />
                      <input
                        type="date"
                        value={dob}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-black border border-zinc-700 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Place / Location field */}
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">
                      Place / Hometown
                    </label>
                    <div className="relative flex items-center">
                      <MapPin className="w-4 h-4 text-zinc-500 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        value={place}
                        onChange={(e) => setPlace(e.target.value)}
                        placeholder="e.g. Bengaluru, India"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-black border border-zinc-700 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Mode Buttons */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
