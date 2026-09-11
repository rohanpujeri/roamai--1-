import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Sparkles,
  MapPin,
  Star,
  ExternalLink,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Check,
  Calendar,
  DollarSign,
  Coffee,
  Wifi,
  Tv,
  Waves,
  Flame,
  ShieldCheck,
  Search,
  BedDouble,
  HeartHandshake,
  Tag,
  Info,
  ChevronDown
} from 'lucide-react';
import { Trip, HotelStayRecommendation, BudgetTier } from '../types';
import {
  fetchAiHotelSuggestions,
  getFallbackHotelRecommendations,
  generateHotelBookingUrls
} from '../services/aiHotelAdvisor';

interface HotelsAndStaysViewProps {
  trip: Trip;
  activeDayNumber?: number;
  onSelectDay?: (dayNum: number) => void;
  onSaveHotelToTrip?: (hotel: HotelStayRecommendation, dayNumber?: number) => void;
}

export const HotelsAndStaysView: React.FC<HotelsAndStaysViewProps> = ({
  trip,
  activeDayNumber = 1,
  onSelectDay,
  onSaveHotelToTrip
}) => {
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all'>(activeDayNumber || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);

  // Enforce the trip's chosen budget tier strictly
  const tripBudgetTier: BudgetTier = trip.budgetTier || 'Budget';
  const activeBudgetTier = tripBudgetTier;

  const [hotelList, setHotelList] = useState<HotelStayRecommendation[]>(() => {
    if (trip.hotelRecommendations && trip.hotelRecommendations.length > 0) {
      return trip.hotelRecommendations.filter((h) => !h.budgetTier || h.budgetTier === tripBudgetTier);
    }
    return getFallbackHotelRecommendations({
      destination: trip.destination,
      budgetTier: tripBudgetTier,
      durationDays: trip.durationDays || 3,
      travellersCount: trip.travellersCount || 2,
      companionType: trip.companionType,
      travelStyles: trip.preferences?.styles,
      daysInfo: trip.days?.map((d) => ({ dayNumber: d.dayNumber, theme: d.theme }))
    });
  });

  const [selectedHotelIds, setSelectedHotelIds] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    trip.days?.forEach((d) => {
      if (d.suggestedStay?.id) {
        initial[d.dayNumber] = d.suggestedStay.id;
      }
    });
    return initial;
  });

  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [customHotelName, setCustomHotelName] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<HotelStayRecommendation['category']>('Resort');
  const [customLocation, setCustomLocation] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<string>('1200');
  const [customDay, setCustomDay] = useState<number>(1);
  const [customNotes, setCustomNotes] = useState<string>('');

  // Categories adapted strictly to the selected budget tier
  const categories = useMemo(() => {
    if (tripBudgetTier === 'Budget') {
      return ['All', 'Hostel / Budget', 'Homestay / Villa', 'Eco-Lodge'];
    }
    if (tripBudgetTier === 'Luxury') {
      return ['All', 'Luxury Hotel', 'Resort'];
    }
    if (tripBudgetTier === 'Premium') {
      return ['All', 'Resort', 'Boutique Hotel', 'Homestay / Villa', 'Eco-Lodge'];
    }
    return ['All', 'Boutique Hotel', 'Homestay / Villa', 'Resort', 'Eco-Lodge'];
  }, [tripBudgetTier]);

  // Fetch or refresh hotels via AI strictly for the trip's budget tier
  const loadHotels = async () => {
    setIsLoadingAi(true);
    try {
      const results = await fetchAiHotelSuggestions({
        destination: trip.destination,
        budgetTier: tripBudgetTier,
        durationDays: trip.durationDays || 3,
        travellersCount: trip.travellersCount || 2,
        companionType: trip.companionType,
        travelStyles: trip.preferences?.styles,
        daysInfo: trip.days?.map((d) => ({ dayNumber: d.dayNumber, theme: d.theme }))
      });
      setHotelList(results);
    } catch (err) {
      console.warn('Failed to load hotels from AI:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  useEffect(() => {
    loadHotels();
  }, [trip.destination, tripBudgetTier]);

  const filteredHotels = useMemo(() => {
    return hotelList.filter((hotel) => {
      // Strictly enforce trip budget tier
      if (hotel.budgetTier && hotel.budgetTier !== tripBudgetTier && !hotel.isCustomAdded) {
        return false;
      }
      // Day filter
      if (selectedDayFilter !== 'all' && hotel.dayNumber !== selectedDayFilter) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'All' && hotel.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = hotel.name.toLowerCase().includes(q);
        const matchesArea = hotel.locationArea.toLowerCase().includes(q);
        const matchesAmenity = hotel.amenities.some((a) => a.toLowerCase().includes(q));
        const matchesReason = hotel.matchReason.toLowerCase().includes(q);
        if (!matchesName && !matchesArea && !matchesAmenity && !matchesReason) {
          return false;
        }
      }
      return true;
    });
  }, [hotelList, tripBudgetTier, selectedDayFilter, selectedCategory, searchQuery]);

  const handleSelectHotelForDay = (hotel: HotelStayRecommendation, dayNum?: number) => {
    const targetDay = dayNum || hotel.dayNumber || 1;
    setSelectedHotelIds((prev) => ({ ...prev, [targetDay]: hotel.id }));
    if (onSaveHotelToTrip) {
      onSaveHotelToTrip(hotel, targetDay);
    }
  };

  const handleAddCustomStay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customHotelName.trim()) return;

    const priceNum = parseInt(customPrice.replace(/[^0-9]/g, ''), 10) || 3000;
    const googleQuery = encodeURIComponent(`${customHotelName} ${trip.destination} hotels booking`);
    const newStay: HotelStayRecommendation = {
      id: `custom_stay_${Date.now()}`,
      dayNumber: customDay,
      name: customHotelName.trim(),
      category: customCategory,
      budgetTier: activeBudgetTier,
      pricePerNight: priceNum,
      priceFormatted: `₹${priceNum.toLocaleString('en-IN')} / night`,
      locationArea: customLocation.trim() || `${trip.destination} Center`,
      rating: 4.8,
      reviewCount: 1,
      reviewSnippet: customNotes.trim() || 'Custom booked accommodation added to trip.',
      amenities: ['Private Room', 'Confirmed Booking'],
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      bookingSearchUrl: `https://www.google.com/travel/hotels?q=${googleQuery}`,
      recommendedFor: 'Custom guest selection',
      matchReason: 'Custom stay booked for your itinerary',
      isCustomAdded: true,
      notes: customNotes.trim()
    };

    setHotelList((prev) => [newStay, ...prev]);
    handleSelectHotelForDay(newStay, customDay);
    setIsCustomModalOpen(false);
    setCustomHotelName('');
    setCustomLocation('');
    setCustomNotes('');
  };

  return (
    <div className="space-y-8 text-left max-w-6xl mx-auto">
      {/* Top Banner: Hotel & Stays Overview */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-white/20">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-2.5">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-300" />
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-200">
                Curated Accommodations & Resorts
              </span>
            </div>
            <h3 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              Recommended Stays in {trip.destination}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-50/90 leading-relaxed max-w-2xl font-normal">
              Tailored for your <strong>{activeBudgetTier}</strong> tier (~₹
              {activeBudgetTier === 'Budget' ? '900–₹1,600' : activeBudgetTier === 'Moderate' ? '2,800–₹4,500' : activeBudgetTier === 'Premium' ? '6,500–₹11,000' : '16,000–₹28,000+'}/night) for {trip.durationDays} days and {trip.travellersCount} travelers.
            </p>
          </div>

          <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-3">
            <button
              type="button"
              onClick={() => loadHotels()}
              disabled={isLoadingAi}
              className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm border border-white/30 backdrop-blur-md shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-300 ${isLoadingAi ? 'animate-spin' : ''}`} />
              <span>{isLoadingAi ? 'AI Calibrating...' : 'Regenerate Stays'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCustomModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Booked Hotel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Controls: Day Filter, Category Filter, and Budget Tier Switcher */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-xl border border-white/80 dark:border-white/15 space-y-5">
        
        {/* Row 1: Locked Budget Tier Badge & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Trip Budget Tier
            </label>
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-700/80 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                {tripBudgetTier} Tier Only
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-md">
                {tripBudgetTier === 'Budget' ? '₹800–₹1,800/night' : tripBudgetTier === 'Moderate' ? '₹2,500–₹5,000/night' : tripBudgetTier === 'Premium' ? '₹6,500–₹13,000/night' : '₹16,000–₹45,000+/night'}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                🔒 Strict Match
              </span>
            </div>
          </div>

          <div className="w-full lg:w-72">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Search Stays & Amenities
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pool, Wifi, Mountain View..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Filter by Day */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
            Filter by Day & Itinerary Stage
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedDayFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedDayFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 font-black shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              All Days ({hotelList.length})
            </button>
            {trip.days?.map((day) => {
              const isSelected = selectedDayFilter === day.dayNumber;
              const hasSelectedStay = !!selectedHotelIds[day.dayNumber];
              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  onClick={() => setSelectedDayFilter(day.dayNumber)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-black shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>Day {day.dayNumber}</span>
                  {hasSelectedStay && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="Stay Selected" />
                  )}
                  <span className="text-[10px] opacity-70 truncate max-w-[120px]">
                    ({day.theme.slice(0, 18)}...)
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Category Pills */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
            Stay Category
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'bg-white/60 hover:bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {cat === 'Resort' && '🌴 Resort'}
                  {cat === 'Boutique Hotel' && '🏰 Boutique Hotel'}
                  {cat === 'Homestay / Villa' && '🏡 Homestay / Villa'}
                  {cat === 'Hostel / Budget' && '🎒 Hostel / Budget'}
                  {cat === 'Luxury Hotel' && '✨ Luxury Hotel'}
                  {cat === 'Eco-Lodge' && '🌿 Eco-Lodge'}
                  {cat === 'All' && 'All Types'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hotels & Resorts Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Available Stays ({filteredHotels.length})</span>
          </h4>
          <span className="text-xs text-slate-500 font-semibold">
            Prices calibrated for {activeBudgetTier} Tier
          </span>
        </div>

        {filteredHotels.length === 0 ? (
          <div className="p-12 text-center bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
            <h5 className="text-base font-bold text-slate-700 dark:text-slate-300">
              No stays matching filters
            </h5>
            <p className="text-xs text-slate-500">
              Try changing the category or clearing the search query.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
                setSelectedDayFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredHotels.map((hotel) => {
              const isSelectedForAnyDay = Object.values(selectedHotelIds).includes(hotel.id);
              const assignedDay = Object.entries(selectedHotelIds).find(([_, id]) => id === hotel.id)?.[0];

              return (
                <div
                  key={hotel.id}
                  className={`rounded-3xl overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border transition-all duration-300 flex flex-col justify-between shadow-xl hover:shadow-2xl ${
                    isSelectedForAnyDay
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-white/80 dark:border-white/15 hover:border-emerald-400'
                  }`}
                >
                  <div>
                    {/* Hotel Image Banner */}
                    <div className="relative h-48 w-full overflow-hidden group">
                      <img
                        src={hotel.imageUrl}
                        alt={hotel.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold border border-white/20">
                          {hotel.category}
                        </span>
                        {hotel.dayNumber && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-[11px] font-extrabold border border-emerald-400/40">
                            Day {hotel.dayNumber} Stay
                          </span>
                        )}
                      </div>

                      {/* Rating Badge */}
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/95 text-slate-950 font-black text-xs shadow-md">
                        <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                        <span>{hotel.rating.toFixed(1)}</span>
                      </div>

                      {/* Bottom Info inside image */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                        <div className="space-y-0.5">
                          <h4 className="text-base sm:text-lg font-black tracking-tight drop-shadow-md">
                            {hotel.name}
                          </h4>
                          <p className="text-xs text-slate-200 flex items-center gap-1 drop-shadow-sm font-medium">
                            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{hotel.locationArea}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-5 space-y-4">
                      {/* Price & Rating Summary */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-lg font-black text-slate-900 dark:text-emerald-400">
                            {hotel.priceFormatted}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                            Est. {trip.durationDays} nights: ₹{(hotel.pricePerNight * trip.durationDays).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {hotel.reviewCount ? `${hotel.reviewCount}+ verified reviews` : 'Top guest rated'}
                          </span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                            {hotel.budgetTier} Tier Match
                          </span>
                        </div>
                      </div>

                      {/* Review Highlight */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                        "{hotel.reviewSnippet}"
                      </p>

                      {/* Match Reason */}
                      <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200 font-medium">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{hotel.matchReason}</span>
                      </div>

                      {/* Amenities Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {hotel.amenities.slice(0, 5).map((amenity, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>{amenity}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Live Booking Redirection Footer */}
                  {(() => {
                    const bookingUrls = generateHotelBookingUrls(
                      hotel.name,
                      trip.destination,
                      trip.startDate,
                      trip.endDate,
                      trip.travellersCount
                    );

                    return (
                      <div className="p-5 pt-0 space-y-3">
                        {/* Direct Booking Redirect Row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={bookingUrls.googleHotels}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-[160px] py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                            title="Check live dates, rooms, and real-time availability across all booking providers"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Check Live Availability</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleSelectHotelForDay(hotel, selectedDayFilter === 'all' ? hotel.dayNumber : selectedDayFilter)}
                            className={`py-2.5 px-3.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isSelectedForAnyDay
                                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            }`}
                          >
                            {isSelectedForAnyDay ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span>Pinned (Day {assignedDay || hotel.dayNumber || 1})</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                <span>Select for Day {selectedDayFilter === 'all' ? hotel.dayNumber || 1 : selectedDayFilter}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Quick Provider Deep-links */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Book Directly On:</span>
                          <div className="flex items-center gap-1.5">
                            <a
                              href={bookingUrls.bookingCom}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center gap-1 transition-colors"
                              title="Book on Booking.com"
                            >
                              <span>Booking.com</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                            <a
                              href={bookingUrls.agoda}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900 flex items-center gap-1 transition-colors"
                              title="Book on Agoda"
                            >
                              <span>Agoda</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                            <a
                              href={bookingUrls.makeMyTrip}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-1 transition-colors"
                              title="Book on MakeMyTrip"
                            >
                              <span>MakeMyTrip</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Add Custom Booked Hotel */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Add Your Booked Hotel / Stay
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomStay} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Hotel or Resort Name *
                </label>
                <input
                  type="text"
                  required
                  value={customHotelName}
                  onChange={(e) => setCustomHotelName(e.target.value)}
                  placeholder="e.g. The Serai Resort / Zostel / Airbnb Villa"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Resort">Resort</option>
                    <option value="Boutique Hotel">Boutique Hotel</option>
                    <option value="Homestay / Villa">Homestay / Villa</option>
                    <option value="Hostel / Budget">Hostel / Budget</option>
                    <option value="Luxury Hotel">Luxury Hotel</option>
                    <option value="Eco-Lodge">Eco-Lodge</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Assigned Day
                  </label>
                  <select
                    value={customDay}
                    onChange={(e) => setCustomDay(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {trip.days?.map((d) => (
                      <option key={d.dayNumber} value={d.dayNumber}>
                        Day {d.dayNumber} ({d.theme.slice(0, 20)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Location Area
                  </label>
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="e.g. Hilltop / City Center"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Price per Night (₹)
                  </label>
                  <input
                    type="text"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="3500"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Confirmation / Booking Notes
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Check-in 2:00 PM, booking reference #ABC123..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md cursor-pointer"
                >
                  Save to Itinerary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
