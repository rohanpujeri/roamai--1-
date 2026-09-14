import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Navigation,
  Sparkles,
  Zap,
  Clock,
  MapPin,
  Compass,
  ArrowRight,
  CheckCircle2,
  Circle,
  Share2,
  Sun,
  CloudRain,
  CloudSun,
  RefreshCw,
  Sliders,
  DollarSign,
  PhoneCall,
  ChevronRight,
  AlertCircle,
  Wallet,
  ExternalLink,
  X,
  Route,
  Shuffle,
  ArrowLeftRight,
  Car,
  Bus,
  Footprints,
  Plus,
  ArrowLeft,
  PieChart,
  LogOut
} from 'lucide-react';
import { Trip, Activity, ExpenseItem } from '../types';
import { resolvePlaceImage, handleImageError } from '../utils/placeImages';
import { DayExpenseTracker } from './DayExpenseTracker';
import { TripRouteMap } from './TripRouteMap';

interface TripModeViewProps {
  trip: Trip;
  activeDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  onOpenAdapt: () => void;
  onOpenActivityDetails: (activity: Activity) => void;
  onReplaceActivity?: (activityId: string) => void;
  onToggleActivityCompleted: (activityId: string) => void;
  onAddExpense?: (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onAddCustomActivity?: (dayNumber: number) => Promise<void> | void;
  onExitTripMode: () => void;
}

export type NavTravelMode = 'driving' | 'transit' | 'walking' | 'bicycling';

export interface TransitOption {
  mode: NavTravelMode;
  label: string;
  icon: string;
  duration: string;
  summary: string;
  hasSwitch?: boolean;
  switchDetails?: {
    step1: string;
    switchStation: string;
    step2: string;
  };
  estimatedFare?: string;
}

function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();

  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function getTransitOptionsForActivity(
  act: Activity,
  prevAct?: Activity,
  destinationCity: string = 'City'
): TransitOption[] {
  const parsedMins = parseInt(act.travelTimeFromPrev?.replace(/[^0-9]/g, '') || '15', 10);
  const driveMins = Math.max(6, isNaN(parsedMins) ? 15 : parsedMins);
  const walkMins = Math.round(driveMins * 2.6);
  const bikeMins = Math.round(driveMins * 1.1);
  const transitMins = Math.round(driveMins * 1.5);

  const prevName = prevAct?.title ? prevAct.title.split(' ')[0] : 'Origin';
  const currentName = act.title.split(' ')[0];

  return [
    {
      mode: 'driving',
      label: 'Drive / Taxi',
      icon: '🚗',
      duration: `${driveMins}m`,
      summary: `Direct door-to-door route via Main Road (${(driveMins * 0.45).toFixed(1)} km)`,
      estimatedFare: `INR ${Math.round(driveMins * 25 + 90)}`
    },
    {
      mode: 'transit',
      label: 'Public Transit (with Switch)',
      icon: '🚌',
      duration: `${transitMins}m`,
      summary: `Multi-line transfer with 1 connection switch`,
      hasSwitch: true,
      switchDetails: {
        step1: `Take Bus / Metro Line 14 from ${prevName} (3 stops • ${Math.round(transitMins * 0.4)} min)`,
        switchStation: `Switch at Central Junction / ${destinationCity} Hub (4 min transfer)`,
        step2: `Board Bus Line 3 to ${currentName} (${Math.round(transitMins * 0.35)} min)`
      },
      estimatedFare: 'INR 40 - 60'
    },
    {
      mode: 'walking',
      label: 'Walk',
      icon: '🚶',
      duration: `${walkMins}m`,
      summary: `Scenic pedestrian path (${(driveMins * 0.38).toFixed(1)} km • zero cost)`,
      estimatedFare: 'Free'
    },
    {
      mode: 'bicycling',
      label: 'Bike / Scooter',
      icon: '🚲',
      duration: `${bikeMins}m`,
      summary: `Dedicated bike lanes & micro-mobility paths`,
      estimatedFare: `INR ${Math.round(bikeMins * 5 + 30)}`
    }
  ];
}

export const TripModeView: React.FC<TripModeViewProps> = ({
  trip,
  activeDayNumber,
  onSelectDay,
  onOpenAdapt,
  onOpenActivityDetails,
  onReplaceActivity,
  onToggleActivityCompleted,
  onAddExpense,
  onDeleteExpense,
  onAddCustomActivity,
  onExitTripMode
}) => {
  const [activeSubView, setActiveSubView] = useState<'timeline' | 'budget'>('timeline');
  const [budgetDayFilter, setBudgetDayFilter] = useState<number | 'total'>(activeDayNumber);
  const [selectedMapActivityId, setSelectedMapActivityId] = useState<string | null>(null);
  const [navigatingActivity, setNavigatingActivity] = useState<Activity | null>(null);
  const [selectedTravelMode, setSelectedTravelMode] = useState<NavTravelMode>('driving');
  const currentDay = trip.days.find(d => d.dayNumber === activeDayNumber) || trip.days[0];
  
  // Sort activities chronologically by planned time without stale memoization
  const activities = (currentDay?.activities || []).slice().sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  const visitedCount = activities.filter(a => !!a.completed).length;
  const totalCount = activities.length;
  const isAllCompleted = totalCount > 0 && visitedCount === totalCount;

  // Determine which activity to show in the cockpit card:
  // 1. If user selected a stop explicitly on the map/list, use that.
  // 2. Otherwise, use the earliest unvisited stop.
  // 3. If all stops are visited, fallback to the last stop.
  const earliestUnvisited = activities.find(a => !a.completed);
  const activeCardActivity = 
    (selectedMapActivityId ? activities.find(a => a.id === selectedMapActivityId) : null) ||
    earliestUnvisited ||
    activities[activities.length - 1] ||
    activities[0];

  const activeIndex = activities.findIndex(a => a.id === activeCardActivity?.id);
  const prevActivity = activeIndex > 0 ? activities[activeIndex - 1] : undefined;
  const transitOptions = activeCardActivity ? getTransitOptionsForActivity(activeCardActivity, prevActivity, trip.destination) : [];
  const activeTransitOption = transitOptions.find(o => o.mode === selectedTravelMode) || transitOptions[0];
  
  const [navAlert, setNavAlert] = useState<string | null>(null);

  const getGoogleMapsNavUrl = (act: Activity, mode: NavTravelMode = selectedTravelMode) => {
    const destinationQuery = act.coordinates
      ? `${act.coordinates.lat},${act.coordinates.lng}`
      : encodeURIComponent(`${act.title}, ${act.location || trip.destination}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}&travelmode=${mode}`;
  };

  const handleStartNav = (act: Activity, mode: NavTravelMode = selectedTravelMode) => {
    setNavigatingActivity(act);
    const mapsUrl = getGoogleMapsNavUrl(act, mode);
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    setNavAlert(`🛰️ GPS Live Navigation (${mode.toUpperCase()}) started for ${act.title}. Route opened in Google Maps.`);
    setTimeout(() => setNavAlert(null), 6000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24 text-left">
      {/* Top Mobile/Desktop Status Bar */}
      <div className="bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/90 shadow-md sticky top-0 z-30 px-3.5 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left: Live Status & Destination */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <div className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-lg shrink-0">
                Live Trip
              </span>
              <h2 className="text-xs sm:text-sm font-extrabold text-white truncate">
                {trip.destination} • Day {currentDay.dayNumber}/{trip.durationDays}
              </h2>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {/* Expense Tracker Button */}
            <button
              id="trip-mode-budget-page-btn"
              onClick={() => setActiveSubView((prev) => (prev === 'budget' ? 'timeline' : 'budget'))}
              className={`h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border whitespace-nowrap active:scale-95 shrink-0 ${
                activeSubView === 'budget'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-emerald-500/20'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-700/80 hover:border-slate-600'
              }`}
              title="Open dedicated Expense Tracker page"
            >
              <Wallet className={`w-3.5 h-3.5 shrink-0 ${activeSubView === 'budget' ? 'text-slate-950' : 'text-emerald-400'}`} />
              <span>{activeSubView === 'budget' ? 'Timeline' : 'Expense Tracker'}</span>
            </button>

            {/* Change Plan Button */}
            <button
              onClick={onOpenAdapt}
              className="h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap border border-teal-500/50 shrink-0"
              title="Adapt and customize live itinerary"
            >
              <Zap className="w-3.5 h-3.5 shrink-0 text-teal-200" />
              <span>Change Plan</span>
            </button>

            {/* Exit Trip Mode Button */}
            <button
              onClick={onExitTripMode}
              className="h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="Exit Trip Mode and return to itinerary overview"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-32">
        
        {/* Navigation Feedback Toast */}
        {navAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2"
          >
            <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{navAlert}</span>
          </motion.div>
        )}

        {activeSubView === 'budget' ? (
          <div className="space-y-6 pb-24">
            {/* Top Dedicated Budget Page Header */}
            <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <button
                  id="back-to-timeline-btn"
                  type="button"
                  onClick={() => setActiveSubView('timeline')}
                  className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-400" />
                  <span>Back to Live Timeline</span>
                </button>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      💳 Expense Tracker
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-extrabold uppercase tracking-wide">
                      {budgetDayFilter === 'total' ? `Total Trip (All ${trip.durationDays} Days)` : `Day ${currentDay.dayNumber} of ${trip.durationDays}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live category tracking, budget optimization, and planned vs. actual expense analytics for {trip.destination}.
                  </p>
                </div>
              </div>

              {/* Day Selector Pills for Budget Tracking + Total Button */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {trip.days.map((day) => {
                  const isActive = budgetDayFilter === day.dayNumber;
                  return (
                    <button
                      key={day.dayNumber}
                      onClick={() => {
                        setBudgetDayFilter(day.dayNumber);
                        onSelectDay(day.dayNumber);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30'
                          : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      Day {day.dayNumber}
                    </button>
                  );
                })}

                {/* Total button next to all days */}
                <button
                  id="budget-filter-total-btn"
                  type="button"
                  onClick={() => setBudgetDayFilter('total')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    budgetDayFilter === 'total'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/40'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                  }`}
                  title="View total budget, overall expenses and analytics across all days"
                >
                  <PieChart className="w-3.5 h-3.5" />
                  <span>Total</span>
                </button>
              </div>
            </div>

            {/* Dedicated Full-Width Expense Tracker (NOT side by side) */}
            {onAddExpense && onDeleteExpense && (
              <div id="day-expense-tracker-dedicated-page">
                <DayExpenseTracker
                  trip={trip}
                  day={currentDay}
                  isTotalMode={budgetDayFilter === 'total'}
                  onAddExpense={onAddExpense}
                  onDeleteExpense={onDeleteExpense}
                  className="dark bg-slate-900/95 border-slate-700/80 text-white shadow-2xl rounded-3xl"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-24">
            {/* Day Selector Pills Container */}
            <div className="p-2 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-slate-700/90 shadow-xl flex items-center gap-2 overflow-x-auto scrollbar-none">
              {trip.days.map((day) => {
                const isActive = day.dayNumber === activeDayNumber;
                return (
                  <button
                    key={day.dayNumber}
                    onClick={() => onSelectDay(day.dayNumber)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center cursor-pointer ${
                      isActive
                        ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 font-black scale-[1.02]'
                        : 'bg-slate-900/90 text-slate-200 hover:text-white hover:bg-slate-800 border border-slate-700/80 font-bold'
                    }`}
                  >
                    <span className="font-extrabold">Day {day.dayNumber}</span>
                  </button>
                );
              })}
            </div>

            {/* Hero Greeting & Today Status (Compact) */}
            <div className="bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-700/80 shadow-lg relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                {/* Header row: Date, Vibe, Heading & Weather */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      <span>{currentDay.date}</span>
                      <span className="text-slate-500 font-normal">•</span>
                      <span className="text-emerald-300/90 lowercase first-letter:uppercase font-medium truncate">
                        {currentDay.vibe}
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-extrabold text-white leading-tight mt-0.5 truncate">
                      Good morning! Here's your plan for today.
                    </h2>
                  </div>

                  {/* Live Weather Badge */}
                  <div className="px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-center gap-1.5 text-[11px] font-semibold text-slate-200 shrink-0">
                    <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{currentDay.weatherForecast.temp}</span>
                  </div>
                </div>

                {/* Quick Metrics Bar (Slim Pill Row) */}
                <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-700/60 text-center">
                  <div className="py-1 px-1.5 rounded-xl bg-slate-900/60 border border-slate-750 flex items-center justify-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">Stops:</span>
                    <span className="text-[11px] sm:text-xs font-bold text-white">{currentDay.activities.length}</span>
                  </div>
                  <div className="py-1 px-1.5 rounded-xl bg-slate-900/60 border border-slate-750 flex items-center justify-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">Est:</span>
                    <span className="text-[11px] sm:text-xs font-bold text-emerald-400">
                      INR{currentDay.activities.reduce((acc, a) => acc + (a.estimatedCost || 0), 0)}
                    </span>
                  </div>
                  <div className="py-1 px-1.5 rounded-xl bg-slate-900/60 border border-slate-750 flex items-center justify-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">Done:</span>
                    <span className="text-[11px] sm:text-xs font-bold text-teal-300">
                      {currentDay.activities.filter(a => a.completed).length}/{currentDay.activities.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTIVE ACTIVITY / DAY COMPLETION COCKPIT */}
            {isAllCompleted ? (
              <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.25)] space-y-5 text-center relative overflow-hidden">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-3xl border border-emerald-500/40 shadow-inner">
                  🎉
                </div>
                <div className="space-y-1.5">
                  <span className="px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-sm">
                    Day {currentDay.dayNumber} Itinerary Complete
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white pt-1">
                    All {totalCount} Places Visited!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                    Awesome job! You have checked in at all scheduled places for Day {currentDay.dayNumber}.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {currentDay.dayNumber < trip.durationDays ? (
                    <button
                      onClick={() => {
                        setSelectedMapActivityId(null);
                        onSelectDay(currentDay.dayNumber + 1);
                      }}
                      className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                    >
                      <span>Proceed to Day {currentDay.dayNumber + 1}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-bold text-xs inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Entire Trip Complete! Time to celebrate!</span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      activities.forEach(a => {
                        if (a.completed) onToggleActivityCompleted(a.id);
                      });
                      setSelectedMapActivityId(null);
                      setNavAlert(`↺ Reset all stops for Day ${currentDay.dayNumber}. Ready to explore again!`);
                      setTimeout(() => setNavAlert(null), 5000);
                    }}
                    className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                  >
                    Reset Day {currentDay.dayNumber} Stops
                  </button>
                </div>
              </div>
            ) : activeCardActivity ? (
              <div className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 border border-slate-750 shadow-2xl relative overflow-hidden space-y-3.5 text-left">
                {/* Top status bar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {activeCardActivity.completed ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-500/40 flex items-center gap-1.5 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Visited</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-sm">
                        NEXT UP
                      </span>
                    )}
                    {activeCardActivity.travelTimeFromPrev && activeCardActivity.travelTimeFromPrev !== 'N/A' && (
                      <span className="text-xs text-emerald-300 font-bold flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>{activeCardActivity.travelTimeFromPrev}</span>
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-black text-emerald-400 bg-slate-950/80 border border-slate-800 px-3 py-1 rounded-xl shadow-xs">
                    {activeCardActivity.time}
                  </span>
                </div>

                {/* High-Visibility Place Overview Row */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <img
                    src={activeCardActivity.imageUrl && activeCardActivity.imageUrl.startsWith('http') && !activeCardActivity.imageUrl.includes('example.com')
                      ? activeCardActivity.imageUrl
                      : resolvePlaceImage(activeCardActivity.title, activeCardActivity.category, activeCardActivity.location, trip.destination)}
                    alt={activeCardActivity.title}
                    onError={(e) => handleImageError(e, activeCardActivity.category)}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-emerald-500/40 shrink-0 shadow-md"
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                      {activeCardActivity.title}
                    </h3>
                    <p className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{activeCardActivity.location}</span>
                    </p>
                    <p className="text-xs text-slate-200 leading-relaxed line-clamp-2">
                      {activeCardActivity.description}
                    </p>
                  </div>
                </div>

                {/* Multi-Modal Travel & Transit Switch Options */}
                {transitOptions.length > 0 && (
                  <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-2.5 sm:p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-extrabold text-white">
                        <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Transit & Transfer</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-300 truncate max-w-[200px]">
                        {prevActivity ? `From ${prevActivity.title}` : 'From start'}
                      </span>
                    </div>

                    {/* Travel Mode Pills */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {transitOptions.map((opt) => {
                        const isSelected = selectedTravelMode === opt.mode;
                        return (
                          <button
                            key={opt.mode}
                            onClick={() => setSelectedTravelMode(opt.mode)}
                            className={`py-1.5 px-2 rounded-xl text-center border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-xs ring-1 ring-emerald-400/50'
                                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1 text-xs font-extrabold">
                              <span>{opt.icon}</span>
                              <span className={isSelected ? 'text-emerald-300' : 'text-slate-200'}>{opt.duration}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Stop Actions Toolbar */}
                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={() => handleStartNav(activeCardActivity, selectedTravelMode)}
                    className="flex-1 py-2.5 px-4 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-98 transition-all cursor-pointer truncate"
                  >
                    <Navigation className="w-4 h-4 shrink-0" />
                    <span className="truncate">Navigate ({activeTransitOption?.label.split(' ')[0] || 'Drive'})</span>
                  </button>

                  <button
                    onClick={() => {
                      onToggleActivityCompleted(activeCardActivity.id);
                      if (!activeCardActivity.completed) {
                        const nextRemaining = activities.filter(a => a.id !== activeCardActivity.id && !a.completed);
                        if (nextRemaining.length > 0) {
                          setSelectedMapActivityId(nextRemaining[0].id);
                          setNavAlert(`🎉 Arrived at ${activeCardActivity.title}! Next stop: ${nextRemaining[0].title} (${nextRemaining[0].time})`);
                        } else {
                          setSelectedMapActivityId(null);
                          setNavAlert(`🎉 Outstanding! You have completed all scheduled stops for Day ${currentDay.dayNumber}!`);
                        }
                      } else {
                        setNavAlert(`↺ Unmarked ${activeCardActivity.title} as visited.`);
                      }
                      setTimeout(() => setNavAlert(null), 6000);
                    }}
                    className={`py-2.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer border shrink-0 ${
                      activeCardActivity.completed
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-500/50 shadow-sm'
                    }`}
                    title={activeCardActivity.completed ? 'Unmark as visited' : 'Mark this stop as visited / arrived'}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${activeCardActivity.completed ? 'text-slate-400' : 'text-emerald-400'}`} />
                    <span>{activeCardActivity.completed ? 'Unmark' : 'Arrived'}</span>
                  </button>

                  {onReplaceActivity && (
                    <button
                      onClick={() => onReplaceActivity(activeCardActivity.id)}
                      className="w-10 h-10 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold border border-slate-700 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                      title="Replace with alternative stop"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={onOpenAdapt}
                    className="w-10 h-10 rounded-2xl bg-slate-800 hover:bg-slate-700 text-teal-400 font-semibold border border-slate-700 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                    title="Adapt Itinerary"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : null}

            {/* LIVE DAY ROUTE MAP (Directly below Next Up Card) */}
            <div className="rounded-2xl overflow-hidden border border-slate-700/80 shadow-xl bg-slate-900/90">
              <TripRouteMap
                trip={trip}
                currentDay={currentDay}
                selectedActivityId={selectedMapActivityId || activeCardActivity?.id}
                onSelectActivity={(act) => {
                  setSelectedMapActivityId(act.id);
                  onOpenActivityDetails(act);
                }}
                onStartNavigation={handleStartNav}
              />
            </div>

            {/* TODAY'S ROUTE SEQUENCE CHECKLIST */}
            {activities.length > 0 && (
              <div className="bg-slate-950/90 backdrop-blur-xl rounded-3xl p-5 border border-slate-700/80 shadow-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <h3 className="text-sm font-extrabold text-white">Today's Stop Sequence</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {visitedCount}/{totalCount} visited
                  </span>
                </div>

                <div className="space-y-2">
                  {activities.map((act, index) => {
                    const isSelected = activeCardActivity?.id === act.id;
                    const isDone = act.completed;
                    return (
                      <div
                        key={act.id}
                        onClick={() => setSelectedMapActivityId(act.id)}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-400/80 shadow-md ring-1 ring-emerald-500/30'
                            : isDone
                            ? 'bg-slate-900/60 border-slate-800/80 opacity-75'
                            : 'bg-slate-900/90 hover:bg-slate-850 border-slate-750 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleActivityCompleted(act.id);
                            }}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                              isDone
                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                : 'border-2 border-slate-600 hover:border-emerald-400 text-transparent'
                            }`}
                            title={isDone ? 'Mark unvisited' : 'Mark visited'}
                          >
                            {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 text-slate-500" />}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-emerald-400">{act.time}</span>
                              <span className="text-slate-500 text-xs">•</span>
                              <span className="text-[11px] text-slate-400">{act.category}</span>
                            </div>
                            <h4 className={`text-xs sm:text-sm font-bold truncate ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                              {index + 1}. {act.title}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {act.estimatedCost ? (
                            <span className="text-xs font-semibold text-slate-400">
                              INR{act.estimatedCost}
                            </span>
                          ) : null}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartNav(act);
                            }}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 transition-colors cursor-pointer"
                            title="Navigate"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Persistent Floating Quick Adapt Bar */}
      <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-40">
        <div className="bg-slate-950/95 backdrop-blur-lg border border-slate-700/90 rounded-2xl p-2.5 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 pl-2">
            <span className="text-base">⚡</span>
            <span className="text-xs font-semibold text-slate-200">Something changed?</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAdapt}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Adapt Itinerary Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active GPS Navigation HUD Modal */}
      {navigatingActivity && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/60 rounded-3xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.3)] text-white space-y-5 relative overflow-hidden text-left"
          >
            {/* Pulsing GPS Radar Background */}
            <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-20">
              <div className="w-32 h-32 rounded-full border-2 border-emerald-400 animate-ping" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#10b981]" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Live GPS Route Navigation
                </span>
              </div>
              <button
                onClick={() => setNavigatingActivity(null)}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Minimize Navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Destination Info */}
            <div className="flex items-start gap-4">
              <img
                src={navigatingActivity.imageUrl && navigatingActivity.imageUrl.startsWith('http') && !navigatingActivity.imageUrl.includes('example.com')
                  ? navigatingActivity.imageUrl
                  : resolvePlaceImage(navigatingActivity.title, navigatingActivity.category, navigatingActivity.location, trip.destination)}
                alt={navigatingActivity.title}
                onError={(e) => handleImageError(e, navigatingActivity.category)}
                className="w-20 h-20 rounded-2xl object-cover border border-emerald-500/40 shrink-0"
              />
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Scheduled: {navigatingActivity.time} • {navigatingActivity.travelTimeFromPrev || '15 min drive'}</span>
                </span>
                <h3 className="text-lg font-black text-white truncate">
                  {navigatingActivity.title}
                </h3>
                <p className="text-xs text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{navigatingActivity.location}</span>
                </p>
              </div>
            </div>

            {/* Live Navigation Step Indicator */}
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Live Direction</span>
                  <span className="text-xs font-bold text-white">Follow Google Maps turn-by-turn route</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                Active
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <a
                href={getGoogleMapsNavUrl(navigatingActivity)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-98 transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in Google Maps App</span>
              </a>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onToggleActivityCompleted(navigatingActivity.id);
                    setNavigatingActivity(null);
                    setNavAlert(`🎉 Arrived at ${navigatingActivity.title}! Checked in successfully.`);
                    setTimeout(() => setNavAlert(null), 5000);
                  }}
                  className="py-3 rounded-xl bg-teal-950/90 border border-teal-500/40 hover:bg-teal-900 text-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I've Arrived</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNavigatingActivity(null)}
                  className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
                >
                  Close HUD
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
