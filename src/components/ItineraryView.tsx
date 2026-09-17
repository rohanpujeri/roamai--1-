import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Navigation,
  MapPin,
  Calendar,
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
  Zap
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
  onOpenActivityDetails: (activity: Activity) => void;
  onReplaceActivity: (activityId: string) => void;
  onMoveActivityUp: (activityId: string) => void;
  onMoveActivityDown: (activityId: string) => void;
  onRemoveActivity: (activityId: string) => void;
  onToggleActivityComplete?: (activityId: string) => void;
  onAddCustomActivity: (dayNumber: number) => void;
  onAddActivityToDay?: (dayNumber: number, activity: Activity) => void;
  onTogglePackingItem: (itemId: string) => void;
  onAddPackingItem: (name: string, category: PackingItem['category']) => void;
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
  onOpenActivityDetails,
  onReplaceActivity,
  onMoveActivityUp,
  onMoveActivityDown,
  onRemoveActivity,
  onToggleActivityComplete,
  onAddCustomActivity,
  onAddActivityToDay,
  onTogglePackingItem,
  onAddPackingItem,
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-left">
      
      {/* Top Hero Banner */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-slate-200/90 bg-slate-900 text-white">
        <div className="relative h-36 sm:h-44 w-full">
          <img
            src={trip.heroImage}
            alt={trip.destination}
            className="w-full h-full object-cover"
          />
          {/* Image with subtle overlay */}
          <div className="absolute inset-0 bg-slate-950/30 pointer-events-none" />

          {/* Hero Content */}
          <div className="absolute bottom-3.5 left-4 right-4 sm:bottom-4 sm:left-6 sm:right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] truncate">
                {trip.title}
              </h1>

              <p className="text-[11px] sm:text-xs text-slate-200 font-medium flex flex-wrap items-center gap-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{trip.startCity ? `${trip.startCity} ➔ ${trip.destination}` : trip.destination}, {trip.destinationStateOrCountry}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 shrink-0">
                  <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{trip.startDate} to {trip.endDate}</span>
                </span>
              </p>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onBackToStep6 && (
                <button
                  id="back-to-step-6-btn"
                  onClick={onBackToStep6}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/90 hover:bg-white text-slate-800 dark:bg-slate-800/90 dark:hover:bg-slate-800 dark:text-slate-100 font-bold text-xs border border-white/60 dark:border-slate-700 backdrop-blur-md shadow-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  title="Back to Step 6 to edit styles and preferences"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Back to Step 6</span>
                </button>
              )}

              <button
                id="enter-trip-mode-btn"
                onClick={onEnterTripMode}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-bold text-xs border border-emerald-500/50 backdrop-blur-md shadow-[0_0_14px_rgba(45,106,79,0.55)] hover:shadow-[0_0_20px_rgba(45,106,79,0.75)] ring-2 ring-emerald-400/30 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span>Enter Trip Mode</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation Bar */}
      <div className="bg-black/95 dark:bg-black/95 backdrop-blur-2xl rounded-2xl p-2 shadow-xl border border-zinc-800">
        <div className="flex overflow-x-auto no-scrollbar sm:flex-wrap items-center gap-1.5 sm:gap-2 pb-0.5 sm:pb-0">
          {(
            [
              { id: 'itinerary', label: 'Day Itinerary', icon: Calendar },
              { id: 'map', label: 'Route Map', icon: MapPin },
              { id: 'preparation', label: 'Preparation & Packing', icon: CheckCircle2 },
              { id: 'hotels', label: 'Hotels & Stays', icon: Building2, badge: 'Stays' },
              { id: 'overview', label: 'Trip Overview', icon: Sparkles }
            ] as { id: 'itinerary' | 'overview' | 'map' | 'preparation' | 'hotels'; label: string; icon: any; badge?: string }[]
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-md ring-1 ring-emerald-400/40 border border-emerald-500/40'
                    : 'text-zinc-300 hover:text-white bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                    isActive ? 'bg-emerald-500/30 text-emerald-300' : 'bg-zinc-800 text-zinc-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENTS */}

      {/* TAB 1: DAY ITINERARY */}
      {activeTab === 'itinerary' && (
        <div className="space-y-4">
          {/* Horizontal Day Selector Bar (Day 1, Day 2, Day 3... + Add a Day) */}
          <div className="bg-black/95 dark:bg-black/95 backdrop-blur-2xl rounded-2xl p-2.5 sm:p-3 shadow-md border border-zinc-800 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 scrollbar-none flex-1 min-w-0">
              {days.map((day) => {
                const isActive = day.dayNumber === activeDayNumber;
                return (
                  <button
                    key={day.dayNumber}
                    id={`day-tab-btn-${day.dayNumber}`}
                    onClick={() => onSelectDay(day.dayNumber)}
                    className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-400'
                        : 'bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                    }`}
                  >
                    <span className="font-extrabold">Day {day.dayNumber}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-emerald-700/60 text-emerald-100' : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {day.weatherForecast?.temp || '26°C'}
                    </span>
                  </button>
                );
              })}
            </div>

            {onAddDay && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  id="btn-add-a-day"
                  type="button"
                  onClick={onAddDay}
                  className="px-3 sm:px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                  title="Add a new day to itinerary"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add a Day</span>
                </button>
              </div>
            )}
          </div>

          {/* Day Date & Stay Recommendation Header Bar */}
          <div
            id="current-day-date-card"
            className="w-full bg-black/95 dark:bg-black/95 backdrop-blur-2xl rounded-2xl p-2.5 sm:p-3 shadow-md border border-zinc-800 flex items-center justify-between gap-3"
          >
            {/* Left: Date & Stops Info */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 shrink-0">
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-white whitespace-nowrap">
                  {getFormattedDayDate(trip?.startDate, currentDay?.dayNumber || 1, currentDay?.date)}
                </span>
              </div>

              <span className="text-xs text-zinc-400 font-semibold px-1 hidden sm:inline truncate">
                • {(currentDay?.activities || []).length} {(currentDay?.activities || []).length === 1 ? 'stop' : 'stops'} planned
              </span>
            </div>

            {/* Center: Serpentine Route vs Classic Cards Toggle */}
            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 shrink-0">
              <button
                type="button"
                onClick={() => setItineraryLayoutMode('serpentine')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  itineraryLayoutMode === 'serpentine'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Cinematic serpentine animated route view"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Serpentine Flow</span>
                <span className="sm:hidden">Route</span>
              </button>
              <button
                type="button"
                onClick={() => setItineraryLayoutMode('cards')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  itineraryLayoutMode === 'cards'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Standard activity cards view"
              >
                <span className="hidden sm:inline">Classic Cards</span>
                <span className="sm:hidden">Cards</span>
              </button>
            </div>

            {/* Right: Repositioned Recommend a Stay Button */}
            <button
              id="toggle-recommend-stay-btn"
              type="button"
              onClick={() =>
                setShowStayForDay(prev => ({
                  ...prev,
                  [currentDay?.dayNumber || activeDayNumber]: !prev[currentDay?.dayNumber || activeDayNumber]
                }))
              }
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 whitespace-nowrap border ${
                isStayVisible
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 ring-1 ring-zinc-400/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 hover:shadow-md ring-1 ring-emerald-400/40'
              }`}
              title="Click to view or hide recommended stay for this day"
            >
              <Building2 className="w-3.5 h-3.5 text-white shrink-0" />
              <span>{isStayVisible ? 'Hide Stay' : 'Recommend a Stay'}</span>
              <span className="text-[10px] ml-0.5 font-black opacity-80">
                {isStayVisible ? '▲' : '▼'}
              </span>
            </button>
          </div>

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
          onAddPackingItem={onAddPackingItem}
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
