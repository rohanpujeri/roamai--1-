import React, { useState } from 'react';
import {
  Sparkles,
  Navigation,
  MapPin,
  Calendar,
  Sun,
  Plus,
  ArrowRight,
  Share2,
  Download,
  Info,
  CheckCircle2,
  Compass
} from 'lucide-react';
import { Trip, Activity, DayItinerary, PackingItem, ExpenseItem } from '../types';
import { ActivityCard } from './ActivityCard';
import { PreparationView } from './PreparationView';
import { MapView } from './MapView';

interface ItineraryViewProps {
  trip: Trip;
  activeDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  onEnterTripMode: () => void;
  onOpenActivityDetails: (activity: Activity) => void;
  onReplaceActivity: (activityId: string) => void;
  onMoveActivityUp: (activityId: string) => void;
  onMoveActivityDown: (activityId: string) => void;
  onRemoveActivity: (activityId: string) => void;
  onToggleActivityComplete?: (activityId: string) => void;
  onAddCustomActivity: (dayNumber: number) => void;
  onTogglePackingItem: (itemId: string) => void;
  onAddPackingItem: (name: string, category: PackingItem['category']) => void;
  onOpenMapSearch?: () => void;
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  trip,
  activeDayNumber,
  onSelectDay,
  onEnterTripMode,
  onOpenActivityDetails,
  onReplaceActivity,
  onMoveActivityUp,
  onMoveActivityDown,
  onRemoveActivity,
  onAddCustomActivity,
  onTogglePackingItem,
  onAddPackingItem,
  onOpenMapSearch
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'map' | 'preparation'>('itinerary');

  const days = trip?.days || [];
  const currentDay = days.find(d => d.dayNumber === activeDayNumber) || days[0] || {
    dayNumber: 1,
    date: 'Day 1',
    theme: `${trip?.destination || 'Destination'} Highlights`,
    vibe: 'Scenic landmarks & culture',
    weatherForecast: { temp: '26°C', condition: 'Sunny', icon: 'Sun', rainChance: 10 },
    activities: []
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-left">
      
      {/* Top Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200/90 bg-slate-900 text-white">
        <div className="relative h-64 sm:h-72 w-full">
          <img
            src={trip.heroImage}
            alt={trip.destination}
            className="w-full h-full object-cover"
          />
          {/* Image with subtle overlay */}
          <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />

          {/* Hero Content */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-sm shadow-emerald-500/30">
                  {trip.destination}
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-xs font-bold text-slate-100 border border-white/15">
                  {trip.durationDays} Days
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-xs font-bold text-slate-100 border border-white/15">
                  {trip.travellersCount} {trip.companionType}
                </span>
                {trip.startCity && (
                  <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-xs font-bold text-sky-200 border border-sky-400/40 flex items-center gap-1 shadow-xs">
                    <span>🛫</span>
                    <span>From {trip.startCity}</span>
                  </span>
                )}
                {trip.travelMode && (
                  <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-xs font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                    <span>{trip.travelMode === 'Flight' ? '✈️' : trip.travelMode === 'Train' ? '🚆' : trip.travelMode === 'Car / Road Trip' ? '🚗' : trip.travelMode === 'Bus' ? '🚌' : trip.travelMode === 'Bike / Motorcycle' ? '🏍️' : '🚙'}</span>
                    <span>{trip.travelMode}</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                {trip.title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-200 font-medium flex flex-wrap items-center gap-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{trip.startCity ? `${trip.startCity} ➔ ${trip.destination}` : trip.destination}, {trip.destinationStateOrCountry}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{trip.startDate} to {trip.endDate}</span>
                </span>
              </p>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                id="enter-trip-mode-btn"
                onClick={onEnterTripMode}
                className="px-5 py-3 rounded-2xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-bold text-xs sm:text-sm border border-emerald-500/50 backdrop-blur-md shadow-[0_0_18px_rgba(45,106,79,0.55)] hover:shadow-[0_0_24px_rgba(45,106,79,0.75)] ring-2 ring-emerald-400/30 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span>Enter Trip Mode</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation Bar */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-2xl p-2 shadow-xl border border-white/80 dark:border-white/15">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {(
            [
              { id: 'itinerary', label: 'Day Itinerary', icon: Calendar },
              { id: 'overview', label: 'Trip Overview', icon: Sparkles },
              { id: 'map', label: 'Route Map', icon: MapPin },
              { id: 'preparation', label: 'Preparation & Packing', icon: CheckCircle2 }
            ] as { id: 'itinerary' | 'overview' | 'map' | 'preparation'; label: string; icon: any; badge?: string }[]
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md ring-1 ring-emerald-400/40'
                    : 'text-slate-700 hover:text-slate-950 bg-white/60 hover:bg-white dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                    isActive ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
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
        <div className="space-y-6">
          {/* Day Selector Pills Bar */}
          <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 shadow-xl border border-white/80 dark:border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {days.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => onSelectDay(day.dayNumber)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                    day.dayNumber === activeDayNumber
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-white/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-white border border-slate-200/60'
                  }`}
                >
                  <span>Day {day.dayNumber}</span>
                  <span className="text-[10px] opacity-80">{day.weatherForecast?.temp || '26°C'}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onAddCustomActivity(currentDay?.dayNumber || 1)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stop</span>
              </button>
            </div>
          </div>

          {/* Current Day Vibe Header */}
          <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-cyan-500/15 backdrop-blur-2xl rounded-2xl p-4 sm:p-5 border border-white/60 dark:border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                {currentDay?.date || 'Day 1'}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {currentDay?.theme || 'Day Highlights'}
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                <strong>Today's Vibe:</strong> {currentDay?.vibe || 'Explore authentic highlights and culture'}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-emerald-200/60 shrink-0 shadow-xs">
              <Sun className="w-4 h-4 text-amber-500" />
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">{currentDay?.weatherForecast?.temp || '26°C'}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{currentDay?.weatherForecast?.condition || 'Sunny'}</span>
              </div>
            </div>
          </div>

          {/* Scheduled Day Activities Timeline */}
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 
                className="text-sm font-bold text-white flex items-center gap-2"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.65)' }}
              >
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Day {currentDay?.dayNumber || 1} Timeline & Stops</span>
              </h4>
              <span 
                className="text-xs font-semibold text-white/90"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.65)' }}
              >
                {(currentDay?.activities || []).length} planned stops
              </span>
            </div>

            {(currentDay?.activities || []).map((activity, index) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                currency={trip?.currency || 'INR'}
                isFirst={index === 0}
                isLast={index === (currentDay?.activities || []).length - 1}
                onOpenDetails={onOpenActivityDetails}
                onReplace={onReplaceActivity}
                onMoveUp={onMoveActivityUp}
                onMoveDown={onMoveActivityDown}
                onRemove={onRemoveActivity}
              />
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TRIP OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top Summary Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Trip Highlights & Logistics Card */}
            <div className="md:col-span-7 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-6 shadow-xl border border-white/80 dark:border-white/15 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Trip Summary & Overview</h3>
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {trip.durationDays} Days • {trip.travellersCount} Travelers
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {trip.clothingAdvice || `Curated ${trip.durationDays}-day personalized travel experience exploring authentic cultural landmarks, scenic landscapes, and culinary gems across ${trip.destination}.`}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Destination</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">{trip.destination}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Transit Mode</span>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block">{trip.travelMode || 'Flight'}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Total Planned Stops</span>
                  <span className="text-sm font-bold text-teal-600 dark:text-teal-400 mt-0.5 block">
                    {days.reduce((acc, d) => acc + (d.activities || []).length, 0)} Experiences
                  </span>
                </div>
              </div>
            </div>

            {/* Right Preferences Blueprint */}
            <div className="md:col-span-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-6 shadow-xl border border-white/80 dark:border-white/15 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Personalization Blueprint</h3>

              <div className="space-y-3 text-xs">
                {trip.startCity && (
                  <div className="p-3 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Departure Hub</span>
                    <span className="font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                      <span>🛫</span>
                      <span>{trip.startCity}</span>
                    </span>
                  </div>
                )}

                {trip.routeSummary && (
                  <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Route Distance</span>
                      <span className="font-bold text-slate-900 dark:text-white">{trip.routeSummary.distanceKm} km</span>
                    </div>
                    {trip.routeSummary.keyHighwayOrTrain && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        {trip.routeSummary.keyHighwayOrTrain}
                      </p>
                    )}
                  </div>
                )}

                <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Travel Pace</span>
                  <span className="font-bold text-slate-900 dark:text-white">{trip.preferences.pace}</span>
                </div>

                <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Food Diet</span>
                  <span className="font-bold text-slate-900 dark:text-white">{trip.preferences.food}</span>
                </div>

                <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Alcohol Preference</span>
                  <span className="font-bold text-slate-900 dark:text-white">{trip.preferences.alcohol}</span>
                </div>

                <div>
                  <span className="text-slate-600 dark:text-slate-400 block mb-1.5 font-medium">Selected Styles</span>
                  <div className="flex flex-wrap gap-1.5">
                    {trip.preferences.styles.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 font-semibold text-[10px]">
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
                  className="p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/80 dark:border-white/15 hover:border-emerald-500 shadow-xl hover:shadow-2xl transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                      Day {day.dayNumber}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">{day.weatherForecast?.temp || '26°C'} ☀️</span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {day.theme}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{day.vibe}</p>

                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
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

    </div>
  );
};
