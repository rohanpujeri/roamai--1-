import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  MapPin,
  Clock,
  Plus,
  Search,
  RefreshCw,
  ShieldCheck,
  Compass,
  Footprints,
  ExternalLink,
  DollarSign,
  Layers,
  ChevronRight,
  Info,
  CheckCircle2
} from 'lucide-react';
import { Activity, TravelStyle, BudgetTier } from '../types';
import { NearbyPlaceRecommendation, fetchNearbyRecommendations } from '../services/nearbyPlaces';
import { handleImageError } from '../utils/placeImages';

interface AddNearbyPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayNumber: number;
  destination: string;
  destinationStateOrCountry?: string;
  currency?: string;
  lastActivity?: Activity | null;
  excludedPlaces: string[];
  travelStyles?: TravelStyle[];
  budgetTier?: BudgetTier;
  onAddActivity: (activity: Activity) => void;
}

export const AddNearbyPlaceModal: React.FC<AddNearbyPlaceModalProps> = ({
  isOpen,
  onClose,
  dayNumber,
  destination,
  destinationStateOrCountry = '',
  currency = 'INR',
  lastActivity,
  excludedPlaces,
  travelStyles = [],
  budgetTier = 'Moderate',
  onAddActivity
}) => {
  const [recommendations, setRecommendations] = useState<NearbyPlaceRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeView, setActiveView] = useState<'recommendations' | 'custom'>('recommendations');

  // Custom place inputs
  const [customTitle, setCustomTitle] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [customCategory, setCustomCategory] = useState<Activity['category']>('Sightseeing');
  const [customCost, setCustomCost] = useState('300');
  const [customDuration, setCustomDuration] = useState('1.5 hours');
  const [customDesc, setCustomDesc] = useState('');

  // Load nearby recommendations when modal opens or anchor place changes
  const loadRecommendations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchNearbyRecommendations({
        destination,
        destinationStateOrCountry,
        nearPlace: lastActivity
          ? {
              title: lastActivity.title,
              location: lastActivity.location,
              category: lastActivity.category,
              coordinates: lastActivity.coordinates
            }
          : undefined,
        excludedPlaces,
        travelStyles,
        budgetTier,
        dayNumber
      });
      setRecommendations(data);
    } catch (err) {
      console.warn('Failed to load nearby recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [destination, destinationStateOrCountry, lastActivity, excludedPlaces, travelStyles, budgetTier, dayNumber]);

  useEffect(() => {
    if (isOpen) {
      loadRecommendations();
      setActiveView('recommendations');
      setSearchQuery('');
      setSelectedCategory('All');
    }
  }, [isOpen, loadRecommendations]);

  // Compute smart time slots following the last activity
  const computeNextTimeSlot = (): { time: string; endTime: string } => {
    if (!lastActivity || !lastActivity.time) {
      return { time: '04:30 PM', endTime: '06:00 PM' };
    }

    const t = (lastActivity.endTime || lastActivity.time).toUpperCase();
    if (t.includes('09:') || t.includes('10:') || t.includes('11:')) {
      return { time: '01:30 PM', endTime: '03:00 PM' };
    }
    if (t.includes('01:') || t.includes('02:') || t.includes('03:')) {
      return { time: '04:30 PM', endTime: '06:00 PM' };
    }
    if (t.includes('04:') || t.includes('05:') || t.includes('06:')) {
      return { time: '07:30 PM', endTime: '09:30 PM' };
    }
    if (t.includes('07:') || t.includes('08:') || t.includes('09:')) {
      return { time: '09:30 PM', endTime: '11:00 PM' };
    }
    return { time: '05:00 PM', endTime: '06:30 PM' };
  };

  // Add a recommended place to the day itinerary
  const handleSelectRecommendation = (rec: NearbyPlaceRecommendation) => {
    const { time, endTime } = computeNextTimeSlot();
    const newAct: Activity = {
      id: `act-nearby-${crypto.randomUUID()}`,
      time,
      endTime,
      title: rec.title,
      category: rec.category,
      location: rec.location,
      coordinates: rec.coordinates,
      duration: rec.duration || '1.5 hours',
      travelTimeFromPrev: rec.travelTimeFromPrev || '10 min walk',
      estimatedCost: rec.estimatedCost,
      description: rec.description,
      imageUrl: rec.imageUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
      rating: rec.rating || 4.7,
      recommendationReason: rec.recommendationReason || `Curated nearby stop added after ${lastActivity?.title || destination}.`,
      isIndoor: rec.isIndoor,
      isRainSafe: rec.isRainSafe,
      isUpdated: true,
      updatedReason: lastActivity
        ? `📍 Added nearby to "${lastActivity.title}"`
        : `✨ Curated stop for Day ${dayNumber}`
    };

    onAddActivity(newAct);
    onClose();
  };

  // Add custom entered place
  const handleAddCustomPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const { time, endTime } = computeNextTimeSlot();
    const newAct: Activity = {
      id: `act-custom-${crypto.randomUUID()}`,
      time,
      endTime,
      title: customTitle.trim(),
      category: customCategory,
      location: customLocation.trim() || `${destination} Area`,
      duration: customDuration.trim() || '1.5 hours',
      travelTimeFromPrev: '15 min cab',
      estimatedCost: Number(customCost) || 0,
      description: customDesc.trim() || `Custom stop added to Day ${dayNumber} in ${destination}.`,
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
      rating: 4.8,
      recommendationReason: `Custom place added directly to your itinerary for Day ${dayNumber}.`,
      isUpdated: true,
      updatedReason: `✨ Custom spot added`
    };

    onAddActivity(newAct);
    onClose();
  };

  // Filter recommendations
  const filtered = useMemo(() => {
    return recommendations.filter((rec) => {
      const matchCat = selectedCategory === 'All' || rec.category === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [recommendations, selectedCategory, searchQuery]);

  const categoryPillClass = (cat: string) => {
    switch (cat) {
      case 'Food':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Sightseeing':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Adventure':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Culture':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Relaxation':
        return 'bg-teal-100 dark:bg-teal-950/60 text-teal-900 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      case 'Nightlife':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col text-left"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shrink-0 mt-0.5">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    Add a Place to Day {dayNumber}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 text-[11px] font-extrabold uppercase tracking-wide">
                    AI Concierge
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 flex flex-wrap items-center gap-1.5">
                  {lastActivity ? (
                    <>
                      <span>Recommended nearby to</span>
                      <span className="font-bold text-slate-900 dark:text-white underline decoration-emerald-500 underline-offset-2">
                        {lastActivity.title}
                      </span>
                      <span className="text-slate-400">({lastActivity.location})</span>
                    </>
                  ) : (
                    <span>Top curated recommendations for {destination}</span>
                  )}
                </p>

                {/* Excluded Future Days Pill */}
                {excludedPlaces.length > 0 && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700/60 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      <strong className="text-slate-900 dark:text-white">{excludedPlaces.length}</strong> future day spots excluded to avoid repeats
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* View Mode Tabs (AI Recommendations vs Custom Place) */}
          <div className="px-6 pt-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('recommendations')}
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'recommendations'
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nearby Recommendations ({recommendations.length})</span>
              </button>

              <button
                onClick={() => setActiveView('custom')}
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'custom'
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Custom Place</span>
              </button>
            </div>

            {activeView === 'recommendations' && (
              <button
                onClick={loadRecommendations}
                disabled={isLoading}
                className="pb-3 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Get fresh AI recommendations"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh Spots</span>
              </button>
            )}
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {activeView === 'recommendations' ? (
              <>
                {/* Search & Category Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter nearby places or keywords..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    {['All', 'Food', 'Sightseeing', 'Culture', 'Relaxation', 'Nightlife'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          selectedCategory === cat
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 animate-pulse">
                      <Sparkles className="w-6 h-6 animate-spin" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Curating spots near {lastActivity?.title || destination}...
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Excluding future day stops and finding walking-distance gems.
                      </p>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!isLoading && filtered.length === 0 && (
                  <div className="py-10 text-center space-y-3">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No nearby spots match your current filter.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCategory('All');
                        setSearchQuery('');
                      }}
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                )}

                {/* Recommendation Cards List */}
                {!isLoading && filtered.length > 0 && (
                  <div className="space-y-3">
                    {filtered.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-500/60 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4 group"
                      >
                        {/* Image */}
                        <div className="relative w-full sm:w-28 h-32 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-700 shadow-xs">
                          <img
                            src={rec.imageUrl}
                            alt={rec.title}
                            onError={(e) => handleImageError(e, rec.category)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {rec.badge && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-xs text-[10px] font-bold text-white uppercase tracking-wider">
                              {rec.badge}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${categoryPillClass(rec.category)}`}>
                              {rec.category}
                            </span>

                            {/* Proximity Badge */}
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                              <Footprints className="w-3 h-3 shrink-0" />
                              <span>{rec.distanceFromNearPlace}</span>
                            </span>

                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{rec.duration}</span>
                            </span>

                            {rec.rating && (
                              <span className="text-[11px] font-bold text-amber-500 flex items-center gap-0.5">
                                ★ {rec.rating.toFixed(1)}
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {rec.title}
                          </h3>

                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                            <span className="truncate">{rec.location}</span>
                            {rec.estimatedCost > 0 && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {currency === 'INR' ? '₹' : '$'}
                                  {rec.estimatedCost.toLocaleString()}
                                </span>
                              </>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            {rec.description}
                          </p>

                          {rec.recommendationReason && (
                            <div className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 p-1.5 px-2.5 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40">
                              <span className="font-bold">Why next: </span>
                              <span>{rec.recommendationReason}</span>
                            </div>
                          )}
                        </div>

                        {/* Add Button */}
                        <div className="w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => handleSelectRecommendation(rec)}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add to Day {dayNumber}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Custom Place Form */
              <form onSubmit={handleAddCustomPlace} className="space-y-4 max-w-xl mx-auto py-2">
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    Enter any landmark, restaurant, or activity you'd like to add below the last place of Day {dayNumber}. It will be sequenced right after your current stops.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Place or Activity Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Curlies Beach Shack, Royal Opera House, Local Night Market"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Sightseeing">Sightseeing</option>
                      <option value="Food">Food / Dining</option>
                      <option value="Culture">Culture & Heritage</option>
                      <option value="Relaxation">Relaxation</option>
                      <option value="Adventure">Adventure</option>
                      <option value="Nightlife">Nightlife</option>
                      <option value="Shopping">Shopping</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Area or Location
                    </label>
                    <input
                      type="text"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder={`e.g. Near ${lastActivity?.title || destination}`}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Estimated Cost ({currency === 'INR' ? '₹' : '$'})
                    </label>
                    <input
                      type="number"
                      value={customCost}
                      onChange={(e) => setCustomCost(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      placeholder="e.g. 1.5 hours"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notes / Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    placeholder="Short description or reminder for this activity..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!customTitle.trim()}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Custom Place to Day {dayNumber}</span>
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
