import React from 'react';
import {
  Calendar,
  Users,
  Wallet,
  MapPin,
  Sparkles,
  ArrowRight,
  Plus,
  Navigation,
  Trash2,
  Copy,
  Clock
} from 'lucide-react';
import { Trip } from '../types';

interface MyTripsViewProps {
  trips: Trip[];
  activeTripId: string | null;
  onSelectTrip: (tripId: string) => void;
  onEnterTripMode: (trip: Trip) => void;
  onPlanNewTrip: () => void;
  onDeleteTrip: (tripId: string) => void;
}

export const MyTripsView: React.FC<MyTripsViewProps> = ({
  trips,
  activeTripId,
  onSelectTrip,
  onEnterTripMode,
  onPlanNewTrip,
  onDeleteTrip
}) => {
  return (
    <div className="space-y-8 text-left max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/25 pb-6">
        <div>
          <h2 
            className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.65)' }}
          >
            My Planned Trips
          </h2>
          <p 
            className="text-white/90 text-sm mt-1 font-medium"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
          >
            Access your personalized itineraries, adaptive companion, and packing lists.
          </p>
        </div>

        <button
          onClick={onPlanNewTrip}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-emerald-400/40"
        >
          <Plus className="w-4 h-4" />
          <span>Plan New Trip</span>
        </button>
      </div>

      {/* Empty State */}
      {trips.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-xl space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Planned Trips Yet</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Start by searching any destination on Google Maps and let Gemini AI create a tailored itinerary for you.
          </p>
          <button
            onClick={onPlanNewTrip}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Plan Your First Trip</span>
          </button>
        </div>
      )}

      {/* Trips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.map((trip) => {
          const isActive = trip.id === activeTripId;

          return (
            <div
              key={trip.id}
              className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl overflow-hidden border transition-all flex flex-col justify-between group shadow-xl hover:shadow-2xl ${
                isActive ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-white/80 dark:border-white/15 hover:border-white'
              }`}
            >
              {/* Trip Image Banner */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={trip.heroImage}
                  alt={trip.destination}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                {isActive && (
                  <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                    Current Active Trip
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 block">
                    {trip.destinationStateOrCountry}
                  </span>
                  <h3 className="text-xl font-bold tracking-tight">{trip.title}</h3>
                </div>
              </div>

              {/* Trip Summary Details */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 text-center backdrop-blur-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Duration</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{trip.durationDays} Days</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Travellers</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{trip.travellersCount} People</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Budget</span>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {trip.currency}{trip.targetBudget.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Vibe Chips */}
                <div className="flex flex-wrap gap-1">
                  {trip.preferences.styles.slice(0, 3).map((style) => (
                    <span
                      key={style}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200/50 dark:border-slate-700"
                    >
                      {style}
                    </span>
                  ))}
                  {trip.preferences.styles.length > 3 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px]">
                      +{trip.preferences.styles.length - 3}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectTrip(trip.id)}
                      className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>View Itinerary</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onEnterTripMode(trip)}
                      className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer"
                      title="Enter Live Trip Mode"
                    >
                      <Navigation className="w-4 h-4" />
                    </button>

                    {trips.length > 1 && (
                      <button
                        onClick={() => onDeleteTrip(trip.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Delete Trip"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
