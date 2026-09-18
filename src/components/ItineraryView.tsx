import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Navigation,
  MapPin,
  Calendar,
  CalendarDays,
  Sun,
  Plus,
  ArrowRight,
  ArrowLeft,
  Share2,
  Download,
  Info,
  CheckCircle2,
  Compass,
  Building2,
  BedDouble,
  ExternalLink,
  Loader2,
  Zap,
  Play,
  CornerDownRight,
  LayoutGrid,
  Snowflake,
  Cloud,
  CloudRain
} from 'lucide-react';
import { Trip, Activity, DayItinerary, PackingItem, ExpenseItem, HotelStayRecommendation } from '../types';
import { ActivityCard } from './ActivityCard';
import { SerpentineItineraryTimeline } from './SerpentineItineraryTimeline';
import { PreparationView } from './PreparationView';
import { MapView } from './MapView';
import { HotelsAndStaysView } from './HotelsAndStaysView';
import { AddNearbyPlaceModal } from './AddNearbyPlaceModal';
import { getTravelModeTransitCost } from './CreateTripWizard';
import { generateHotelBookingUrls } from '../services/aiHotelAdvisor';

interface ItineraryViewProps {
  trip: Trip;
  activeDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  onEnterTripMode: () => void;
  onBackToStep6?: () => void;
  onNavigateHome?: () => void;
  onNavigateToMyTrips?: () => void;
  onOpenActivityDetails: (activity: Activity) => void;
  onReplaceActivity: (activityId: string) => void;
  onMoveActivityUp: (activityId: string) => void;
  onMoveActivityDown: (activityId: string) => void;
  onRemoveActivity: (activityId: string) => void;
  onToggleActivityComplete?: (activityId: string) => void;
  onAddCustomActivity: (dayNumber: number) => void;
  onAddActivityToDay?: (dayNumber: number, activity: Activity) => void;
  onTogglePackingItem: (itemId: string) => void;
  onToggleAllPacking?: (allPacked: boolean) => void;
  onAddPackingItem: (name: string, category: PackingItem['category']) => void;
  onToggleRequirement?: (docId: string) => void;
  onToggleBooking?: (bookingId: string) => void;
  onOpenMapSearch?: () => void;
  onSaveHotelToTrip?: (hotel: HotelStayRecommendation, dayNumber?: number) => void;
  onAddExpense?: (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onAddDay?: () => void;
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  trip,
  activeDayNumber,
  onSelectDay,
  onEnterTripMode,
  onBackToStep6,
  onNavigateHome,
  onNavigateToMyTrips,
  onOpenActivityDetails,
  onReplaceActivity,
  onMoveActivityUp,
  onMoveActivityDown,
  onRemoveActivity,
  onToggleActivityComplete,
  onAddCustomActivity,
  onAddActivityToDay,
  onTogglePackingItem,
  onToggleAllPacking,
  onAddPackingItem,
  onToggleRequirement,
  onToggleBooking,
  onOpenMapSearch,
  onSaveHotelToTrip,
  onAddExpense,
  onDeleteExpense,
  onAddDay
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'map' | 'preparation' | 'hotels'>('itinerary');
  const [showStayForDay, setShowStayForDay] = useState<Record<number, boolean>>({});
  const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState<boolean>(false);
  const [itineraryLayoutMode, setItineraryLayoutMode] = useState<'serpentine' | 'cards'>('serpentine');

  const days = trip?.days || [];
  const currentDay = days.find(d => d.dayNumber === activeDayNumber) || days[0] || {
    dayNumber: 1,
    date: 'Day 1',
    theme: `${trip?.destination || 'Destination'} Highlights`,
    vibe: 'Scenic landmarks & culture',
    weatherForecast: { temp: '26°C', condition: 'Sunny', icon: 'Sun', rainChance: 10 },
    activities: []
  };

  const currentDayActivities = currentDay?.activities || [];
  const lastActivity = currentDayActivities.length > 0
    ? currentDayActivities[currentDayActivities.length - 1]
    : null;

  // Strict list of places to exclude: all activities in future days + earlier/current stops to prevent repetition
  const excludedPlaces = useMemo(() => {
    const targetDayNum = currentDay?.dayNumber || activeDayNumber;
    // Future days stops
    const future = days
      .filter((d) => d.dayNumber > targetDayNum)
      .flatMap((d) => (d.activities || []).map((a) => a.title));
    // Earlier & current days stops
    const existing = days
      .filter((d) => d.dayNumber <= targetDayNum)
      .flatMap((d) => (d.activities || []).map((a) => a.title));

    return Array.from(new Set([...future, ...existing].filter(Boolean)));
  }, [days, currentDay, activeDayNumber]);

  const currentDayStays = useMemo(() => {
    if (!trip.hotelRecommendations || !currentDay) return [];
    return trip.hotelRecommendations.filter((h) => h.dayNumber === (currentDay?.dayNumber || 1));
  }, [trip.hotelRecommendations, currentDay?.dayNumber]);

  const isStayVisible = !!showStayForDay[currentDay?.dayNumber || activeDayNumber];

  const totalTransitCost = getTravelModeTransitCost(
    trip?.travelMode || 'Flight',
    trip?.budgetTier || 'Moderate',
    trip?.durationDays || 3,
    trip?.travellersCount || 1,
    trip?.routeSummary?.distanceKm || 600,
    trip?.destination || ''
  );

  const getFormattedDayDate = (
    tripStartDate?: string,
    dayNumber: number = 1,
    rawDayDate?: string
  ): string => {
    if (rawDayDate) {
      const trimmed = rawDayDate.trim();
      const hasMonthOrSlash = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/i.test(trimmed);
      if (hasMonthOrSlash) {
        return trimmed;
      }
    }

    if (tripStartDate) {
      const parts = tripStartDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          const dateObj = new Date(y, m, d + (dayNumber - 1));
          return dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        }
      }

      const parsed = new Date(tripStartDate);
      if (!isNaN(parsed.getTime())) {
        const dateObj = new Date(parsed);
        dateObj.setDate(dateObj.getDate() + (dayNumber - 1));
        return dateObj.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    }

    const now = new Date();
    now.setDate(now.getDate() + (dayNumber - 1));
    return now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getWeatherIcon = (condition?: string, temp?: string) => {
    const c = (condition || '').toLowerCase();
    const t = parseInt(temp || '20', 10);
    if (c.includes('snow') || c.includes('ice') || t <= 5) {
      return <Snowflake className="w-3.5 h-3.5 shrink-0" />;
    }
    if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) {
      return <CloudRain className="w-3.5 h-3.5 shrink-0" />;
    }
    if (c.includes('cloud') || c.includes('overcast') || c.includes('fog')) {
      return <Cloud className="w-3.5 h-3.5 shrink-0" />;
    }
    return <Sun className="w-3.5 h-3.5 shrink-0" />;
  };

  const getShortDayTitle = (day: DayItinerary) => {
    if (!day.theme) return `Day ${day.dayNumber}`;
    const parts = day.theme.split(/\s*[-&:]\s*/);
    if (parts.length > 1 && parts[0].length >= 3 && parts[0].length <= 18) {
      return parts[0].trim();
    }
    return day.theme;
  };

  const getShortDayDate = (tripStartDate?: string, dayNumber: number = 1, rawDate?: string): string => {
    if (tripStartDate) {
      const parts = tripStartDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          const dateObj = new Date(y, m, d + (dayNumber - 1));
          return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        }
      }
      const parsed = new Date(tripStartDate);
      if (!isNaN(parsed.getTime())) {
        parsed.setDate(parsed.getDate() + (dayNumber - 1));
        return parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      }
    }
    if (rawDate) {
      const trimmed = rawDate.trim();
      const m = trimmed.match(/\d{1,2}\s+[A-Za-z]{3}/);
      if (m) return m[0];
    }
    return `Day ${dayNumber}`;
  };

  const getFormattedFullDate = (tripStartDate?: string, dayNumber: number = 1, rawDate?: string): string => {
    if (tripStartDate) {
      const parts = tripStartDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          const dateObj = new Date(y, m, d + (dayNumber - 1));
          return dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
        }
      }
      const parsed = new Date(tripStartDate);
      if (!isNaN(parsed.getTime())) {
        parsed.setDate(parsed.getDate() + (dayNumber - 1));
        return parsed.toLocaleDateString('en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    }
    return getFormattedDayDate(tripStartDate, dayNumber, rawDate);
  };

  const formattedTripDateRange = useMemo(() => {
    if (!trip.startDate) return 'Upcoming Journey';
    const parseD = (s: string) => {
      const parts = s.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return new Date(y, m, d);
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };
    const d1 = parseD(trip.startDate);
    const d2 = trip.endDate ? parseD(trip.endDate) : null;
    if (d1 && d2) {
      const d1Str = d1.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const d2Str = d2.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${d1Str} – ${d2Str}`;
    }
    if (d1) {
      return d1.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return `${trip.startDate}${trip.endDate ? ` – ${trip.endDate}` : ''}`;
  }, [trip.startDate, trip.endDate]);

  const transitSummaryText = useMemo(() => {
    const km = trip.routeSummary?.distanceKm || Math.round((trip.durationDays || 3) * 140);
    const duration = trip.travelMode === 'Train'
      ? trip.routeSummary?.trainDuration
      : trip.travelMode === 'Flight'
      ? trip.routeSummary?.flightDuration
      : trip.routeSummary?.driveDuration;
    if (duration) {
      return `${km} km · ${duration}`;
    }
    const hours = Math.max(1, Math.round(km / 45));
    const modeText = trip.travelMode === 'Bike / Motorcycle' ? 'ride' : trip.travelMode === 'Train' ? 'train' : 'drive';
    return `${km} km · ${hours}h ${modeText}`;
  }, [trip.routeSummary, trip.durationDays, trip.travelMode]);

  return (
    <div className="space-y-3.5 sm:space-y-6 max-w-7xl mx-auto pb-16 text-left">
      {/* Upper Itinerary Header Dashboard Card (Compact Pure black card) */}
      <div className="bg-black/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-zinc-800 shadow-2xl space-y-2.5 sm:space-y-3 text-white">
        {/* Top Bar: Back to Step 6 (Left) & Enter Trip Mode (Right) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onNavigateHome && (
              <button
                onClick={onNavigateHome}
                className="p-1.5 rounded-lg sm:rounded-xl bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                title="Return to Home / Discover"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Home</span>
              </button>
            )}

            {onBackToStep6 && (
              <button
                id="back-to-step-6-btn"
                onClick={onBackToStep6}
                className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-black hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Back to Step 6 to edit styles and preferences"
              >
                <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400" />
                <span>Back to Step 6</span>
              </button>
            )}
          </div>

          <button
            id="enter-trip-mode-btn"
            onClick={onEnterTripMode}
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-[#10b981] hover:bg-emerald-400 text-white font-black text-xs flex items-center gap-1.5 sm:gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-white text-white ml-0.5" />
            </div>
            <span>Enter Trip Mode</span>
          </button>
        </div>

        {/* Hero Header: Title & Route Summary */}
        <div className="space-y-1 sm:space-y-1.5">
          <h1 className="font-['Playfair_Display',serif] text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
            {trip.title}
          </h1>

          <div 
            id="itinerary-route-metadata-bar"
            className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-zinc-400 font-medium select-none !bg-transparent"
            style={{ backgroundColor: 'transparent' }}
          >
            {/* Start -> Destination */}
            <span className="flex items-center gap-1 text-zinc-300">
              <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{trip.startCity ? `${trip.startCity} → ${trip.destination}` : trip.destination}</span>
            </span>

            <span className="text-zinc-600 font-bold">•</span>

            {/* Distance & Transit Time */}
            <span className="flex items-center gap-1 text-zinc-300">
              <CornerDownRight className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{transitSummaryText}</span>
            </span>

            <span className="text-zinc-600 font-bold">•</span>

            {/* Date Range */}
            <span className="flex items-center gap-1 text-zinc-300">
              <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{formattedTripDateRange}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs & (on Itinerary) Your Days Dashboard Card */}
      <div className="bg-black/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 border border-zinc-800 shadow-2xl space-y-2.5 sm:space-y-3 text-white">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-start overflow-x-auto no-scrollbar">
          <div className="bg-black p-1 rounded-xl border border-zinc-800 flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
            {[
              { id: 'itinerary', label: 'Day Itinerary', icon: CalendarDays },
              { id: 'map', label: 'Route Map', icon: MapPin },
              { id: 'preparation', label: 'Preparation', icon: CheckCircle2 },
              { id: 'hotels', label: 'Hotels', icon: BedDouble },
              { id: 'overview', label: 'Overview', icon: LayoutGrid }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#181a1e] text-white border border-zinc-700/60 shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                  }`}
                >
                  <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* When activeTab === 'itinerary': Your Days Carousel & Sub-header Controls */}
        {activeTab === 'itinerary' && (
          <div className="pt-2 border-t border-zinc-800/80 space-y-2 sm:space-y-3">
            {/* "Your Days" Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">Your Days</h2>
              {onAddDay && (
                <button
                  id="btn-add-a-day"
                  type="button"
                  onClick={onAddDay}
                  className="text-[11px] sm:text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Add a Day</span>
                </button>
              )}
            </div>

            {/* Horizontal Day Cards Carousel */}
            <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar pb-1 scroll-smooth">
              {days.map((day) => {
                const isActive = day.dayNumber === activeDayNumber;
                const weatherIcon = getWeatherIcon(day.weatherForecast?.condition, day.weatherForecast?.temp);
                const shortTheme = getShortDayTitle(day);
                const shortDate = getShortDayDate(trip.startDate, day.dayNumber, day.date);

                return (
                  <button
                    key={day.dayNumber}
                    id={`day-card-${day.dayNumber}`}
                    type="button"
                    onClick={() => onSelectDay(day.dayNumber)}
                    className={`w-28 sm:w-32 h-[68px] sm:h-[76px] p-2 sm:p-2.5 rounded-xl flex flex-col justify-between shrink-0 text-left transition-all duration-200 cursor-pointer select-none ${
                      isActive
                        ? 'bg-[#10b981] text-white shadow-[0_0_18px_rgba(16,185,129,0.35)] border border-emerald-400/50'
                        : 'bg-black hover:bg-zinc-950 text-white border border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {/* Top row: Day Number + Weather Icon */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-semibold ${isActive ? 'text-white/90' : 'text-zinc-400'}`}>
                        Day {day.dayNumber}
                      </span>
                      <span className={`text-xs ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                        {weatherIcon}
                      </span>
                    </div>

                    {/* Middle row: Short concise Title */}
                    <h4 className={`text-[11px] sm:text-xs font-bold truncate leading-tight ${isActive ? 'text-white font-black' : 'text-white'}`}>
                      {shortTheme}
                    </h4>

                    {/* Bottom row: Date · Temperature */}
                    <span className={`text-[9px] sm:text-[10px] font-medium truncate ${isActive ? 'text-white/90 font-semibold' : 'text-zinc-400'}`}>
                      {shortDate} · {day.weatherForecast?.temp || '22°C'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sub-header Bar (Date + Title + Stops + Controls) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-zinc-800/60">
              {/* Left: Date + Day Title + Stops planned */}
              <div>
                <p className="text-[10px] sm:text-[11px] font-medium text-zinc-400 mb-0.5">
                  {getFormattedFullDate(trip?.startDate, currentDay?.dayNumber || 1, currentDay?.date)}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm lg:text-base font-bold text-white tracking-tight">
                    {currentDay?.theme || `Day ${currentDay?.dayNumber || 1}`}
                  </h3>
                  <span className="text-zinc-600 font-bold hidden sm:inline">•</span>
                  <span className="text-emerald-400 font-bold text-[10px] sm:text-xs">
                    {(currentDay?.activities || []).length} {(currentDay?.activities || []).length === 1 ? 'stop' : 'stops'} planned
                  </span>
                </div>
              </div>

              {/* Right: Switch Toggle (Serpentine Flow vs Classic Cards) + Recommend a Stay Button */}
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pt-0.5 sm:pt-0">
                {/* Toggle Switch */}
                <div
                  onClick={() => setItineraryLayoutMode(prev => prev === 'serpentine' ? 'cards' : 'serpentine')}
                  className="bg-black border border-zinc-800 rounded-lg p-1 flex items-center gap-1.5 cursor-pointer select-none hover:border-zinc-700 transition-colors"
                  title="Toggle view between Serpentine Flow and Classic Cards"
                >
                  <div className={`w-7 h-4 rounded-full p-0.5 flex items-center transition-colors ${itineraryLayoutMode === 'serpentine' ? 'bg-emerald-500 justify-end' : 'bg-zinc-700 justify-start'}`}>
                    <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
                  </div>
                  <span className={`text-[10px] sm:text-xs font-bold transition-colors ${itineraryLayoutMode === 'serpentine' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    Serpentine Flow
                  </span>
                  <span className={`text-[10px] sm:text-xs font-medium transition-colors ${itineraryLayoutMode === 'cards' ? 'text-white' : 'text-zinc-500'}`}>
                    Classic Cards
                  </span>
                </div>

                {/* Recommend a Stay Button */}
                <button
                  id="toggle-recommend-stay-btn"
                  type="button"
                  onClick={() =>
                    setShowStayForDay(prev => ({
                      ...prev,
                      [currentDay?.dayNumber || activeDayNumber]: !prev[currentDay?.dayNumber || activeDayNumber]
                    }))
                  }
                  className="py-1 px-2.5 sm:py-1.5 sm:px-3 rounded-lg bg-black hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 text-[10px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Click to view or hide recommended stay for this day"
                >
                  <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                  <span>Recommend a Stay</span>
                  <span className="text-[9px] text-zinc-400">
                    {isStayVisible ? '▲' : '▼'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TAB CONTENTS */}

      {/* TAB 1: DAY ITINERARY */}
      {activeTab === 'itinerary' && (
        <div className="space-y-4 sm:space-y-6">

        {/* Day Stay Highlight / Quick Hotel Selector (Toggled by user) */}
        {isStayVisible && (
            <div
              id="tonight-recommended-stay-card"
              className="p-2.5 sm:p-3 rounded-xl bg-black/95 dark:bg-black/95 backdrop-blur-md border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm transition-all"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-400 block leading-tight">
                    Tonight's Recommended Stay (Day {currentDay?.dayNumber || 1})
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h5 className="text-xs sm:text-sm font-bold text-white leading-tight">
                      {currentDay?.suggestedStay?.name || `${trip.destination} Curated Resort & Stay`}
                    </h5>
                    {currentDay?.suggestedStay?.nearPlaceName && (
                      <span className="text-[9px] font-extrabold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <span>📍</span>
                        <span>{currentDay.suggestedStay.nearPlaceName}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    {currentDay?.suggestedStay
                      ? `${currentDay.suggestedStay.priceFormatted} • ${currentDay.suggestedStay.locationArea}`
                      : `Handpicked stays matching your ${trip.budgetTier || 'Moderate'} budget`}
                  </p>

                  {/* 4-5 Stays Quick Selector */}
                  {currentDayStays.length > 1 && (
                    <div className="flex items-center gap-1 pt-1.5 overflow-x-auto no-scrollbar max-w-full">
                      <span className="text-[10px] font-bold text-zinc-400 shrink-0 mr-1">
                        {currentDayStays.length} Stays:
                      </span>
                      {currentDayStays.map((stay, sIdx) => {
                        const isSelected = currentDay.suggestedStay?.id === stay.id;
                        return (
                          <button
                            key={stay.id}
                            type="button"
                            onClick={() => onSaveHotelToTrip && onSaveHotelToTrip(stay, currentDay.dayNumber)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer shrink-0 border ${
                              isSelected
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs font-black'
                                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                            }`}
                            title={`${stay.name} - ${stay.priceFormatted}`}
                          >
                            {sIdx + 1}. {stay.name.length > 16 ? `${stay.name.slice(0, 14)}...` : stay.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {currentDay?.suggestedStay && (() => {
                  const stayUrls = generateHotelBookingUrls(
                    currentDay.suggestedStay.name,
                    currentDay.suggestedStay.locationArea || trip.destination,
                    trip.startDate,
                    trip.endDate,
                    trip.travellersCount
                  );
                  return (
                    <a
                      href={stayUrls.primary}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-800"
                      title="Check live availability & rates on booking platforms"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Book / Rates</span>
                    </a>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => setActiveTab('hotels')}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <BedDouble className="w-3.5 h-3.5" />
                  <span>Explore Stays (Day {currentDay?.dayNumber || 1})</span>
                </button>
              </div>
            </div>
          )}

          {/* Scheduled Day Activities: Serpentine Journey Flow vs Classic Cards */}
          {itineraryLayoutMode === 'serpentine' ? (
            <div className="pb-24">
              <SerpentineItineraryTimeline
                activities={currentDayActivities}
                trip={trip}
                currency={trip?.currency || 'INR'}
                onOpenDetails={onOpenActivityDetails}
                onReplaceActivity={onReplaceActivity}
                onMoveActivityUp={onMoveActivityUp}
                onMoveActivityDown={onMoveActivityDown}
                onRemoveActivity={onRemoveActivity}
                onToggleActivityComplete={onToggleActivityComplete}
                onAddPlace={() => setIsAddPlaceModalOpen(true)}
              />
            </div>
          ) : (
            <div className="space-y-3 pb-24">
              {currentDayActivities.map((activity, index) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  currency={trip?.currency || 'INR'}
                  isFirst={index === 0}
                  isLast={index === currentDayActivities.length - 1}
                  onOpenDetails={onOpenActivityDetails}
                  onReplace={onReplaceActivity}
                  onMoveUp={onMoveActivityUp}
                  onMoveDown={onMoveActivityDown}
                  onRemove={onRemoveActivity}
                  onAddPlace={() => setIsAddPlaceModalOpen(true)}
                />
              ))}

              {/* "Add a Place" button directly below the last place of day itinerary */}
              <div className="pt-2">
                <button
                  id="btn-add-place-below-last-activity"
                  type="button"
                  onClick={() => setIsAddPlaceModalOpen(true)}
                  className="w-full group py-4 px-5 rounded-2xl border-2 border-dashed border-emerald-500 hover:border-emerald-400 bg-black/95 dark:bg-black/95 backdrop-blur-2xl transition-all duration-200 flex items-center justify-between text-left shadow-2xl cursor-pointer ring-1 ring-emerald-500/30 hover:ring-emerald-500/60"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-600 group-hover:bg-emerald-500 text-white flex items-center justify-center shadow-md transition-colors shrink-0">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-white group-hover:text-emerald-400 transition-colors">
                          Add a Place
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 border border-emerald-800">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          Nearby Recommendations
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-0.5 font-medium">
                        {lastActivity
                          ? `Explore curated spots nearby to "${lastActivity.title}" (excludes future day stops)`
                          : `Explore top curated spots in ${trip.destination}`}
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800">
                    <span>Explore Nearby</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRIP OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top Summary Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Trip Highlights & Logistics Card */}
            <div className="md:col-span-7 bg-black/95 dark:bg-black/95 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Trip Summary & Overview</h3>
                <span className="text-xs font-semibold text-emerald-300 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">
                  {trip.durationDays} Days • {trip.travellersCount} Travelers
                </span>
              </div>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {trip.clothingAdvice || `Curated ${trip.durationDays}-day personalized travel experience exploring authentic cultural landmarks, scenic landscapes, and culinary gems across ${trip.destination}.`}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Destination</span>
                  <span className="text-sm font-bold text-white mt-0.5 block">{trip.destination}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Transit Mode</span>
                    <span className="text-[9px] font-bold text-blue-300 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">
                      Total Travel Cost
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-sm font-bold text-emerald-400">{trip.travelMode || 'Flight'}</span>
                    <span className="text-sm font-black text-white">
                      ₹{totalTransitCost.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">
                    Roundtrip for {trip.travellersCount} {trip.travellersCount === 1 ? 'traveler' : 'travelers'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Planned Stops</span>
                  <span className="text-sm font-bold text-teal-400 mt-0.5 block">
                    {days.reduce((acc, d) => acc + (d.activities || []).length, 0)} Experiences
                  </span>
                </div>
              </div>
            </div>

            {/* Right Preferences Blueprint */}
            <div className="md:col-span-5 bg-black/95 dark:bg-black/95 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-zinc-800 space-y-4">
              <h3 className="text-base font-bold text-white">Personalization Blueprint</h3>

              <div className="space-y-3 text-xs">
                {trip.startCity && (
                  <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                    <span className="text-zinc-300 font-medium">Departure Hub</span>
                    <span className="font-extrabold text-emerald-300 flex items-center gap-1">
                      <span>{trip.travelMode === 'Bike / Motorcycle' ? '🏍️' : trip.travelMode === 'Car / Road Trip' ? '🚗' : trip.travelMode === 'Train' ? '🚆' : trip.travelMode === 'Bus' ? '🚌' : '🛫'}</span>
                      <span>{trip.startCity}</span>
                    </span>
                  </div>
                )}

                {trip.routeSummary && (
                  <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Route Distance</span>
                      <span className="font-bold text-white">{trip.routeSummary.distanceKm} km</span>
                    </div>
                    {trip.routeSummary.keyHighwayOrTrain && (
                      <p className="text-[11px] text-zinc-400 font-medium">
                        {trip.routeSummary.keyHighwayOrTrain}
                      </p>
                    )}
                  </div>
                )}

                <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-400">Travel Pace</span>
                  <span className="font-bold text-white">{trip.preferences.pace}</span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-400">Food Diet</span>
                  <span className="font-bold text-white">{trip.preferences.food}</span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-400">Alcohol Preference</span>
                  <span className="font-bold text-white">{trip.preferences.alcohol}</span>
                </div>

                <div>
                  <span className="text-zinc-400 block mb-1.5 font-medium">Selected Styles</span>
                  <div className="flex flex-wrap gap-1.5">
                    {trip.preferences.styles.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold text-[10px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Day by Day Cards Grid */}
          <div className="space-y-4">
            <h3 
              className="text-lg sm:text-xl font-bold text-white tracking-tight"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.65)' }}
            >
              Day by Day Highlights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {days.map((day) => (
                <div
                  key={day.dayNumber}
                  onClick={() => {
                    onSelectDay(day.dayNumber);
                    setActiveTab('itinerary');
                  }}
                  className="p-5 rounded-3xl bg-black/95 dark:bg-black/95 backdrop-blur-2xl border border-zinc-800 hover:border-emerald-500 shadow-2xl transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold">
                      Day {day.dayNumber}
                    </span>
                    <span className="text-xs text-zinc-300 font-semibold">{day.weatherForecast?.temp || '26°C'} ☀️</span>
                  </div>

                  <h4 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {day.theme}
                  </h4>
                  <p className="text-xs text-zinc-400 line-clamp-2">{day.vibe}</p>

                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs text-emerald-400 font-semibold">
                    <span>{(day.activities || []).length} planned stops</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MAP VIEW */}
      {activeTab === 'map' && (
        <MapView
          trip={trip}
          activeDayNumber={activeDayNumber}
          onSelectDay={onSelectDay}
          onSelectActivity={onOpenActivityDetails}
          onOpenMapSearch={onOpenMapSearch}
        />
      )}

      {/* TAB 4: PREPARATION & PACKING */}
      {activeTab === 'preparation' && (
        <PreparationView
          trip={trip}
          onTogglePackingItem={onTogglePackingItem}
          onToggleAllPacking={onToggleAllPacking}
          onAddPackingItem={onAddPackingItem}
          onToggleRequirement={onToggleRequirement}
          onToggleBooking={onToggleBooking}
        />
      )}

      {/* TAB 5: HOTELS, STAYS & RESORTS */}
      {activeTab === 'hotels' && (
        <HotelsAndStaysView
          trip={trip}
          activeDayNumber={activeDayNumber}
          onSelectDay={onSelectDay}
          onSaveHotelToTrip={onSaveHotelToTrip}
        />
      )}



      {/* Add Nearby Place Modal */}
      <AddNearbyPlaceModal
        isOpen={isAddPlaceModalOpen}
        onClose={() => setIsAddPlaceModalOpen(false)}
        dayNumber={currentDay?.dayNumber || activeDayNumber}
        destination={trip.destination}
        destinationStateOrCountry={trip.destinationStateOrCountry}
        currency={trip.currency || 'INR'}
        lastActivity={lastActivity}
        excludedPlaces={excludedPlaces}
        travelStyles={trip.preferences?.styles}
        budgetTier={trip.budgetTier}
        onAddActivity={(newAct) => {
          if (onAddActivityToDay) {
            onAddActivityToDay(currentDay?.dayNumber || activeDayNumber, newAct);
          } else {
            onAddCustomActivity(currentDay?.dayNumber || activeDayNumber);
          }
        }}
      />

    </div>
  );
};
