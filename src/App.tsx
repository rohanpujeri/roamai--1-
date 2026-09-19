import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trip, Activity, DayItinerary, PackingItem, UserPreferences, TravelCompanion, TravelMode, BudgetTier, ThemeId, ExpenseItem, SavedPlace, HotelStayRecommendation, RequirementDocument, BookingItem } from './types';

import { generateTripFromInputs, adaptTripPlanWithAI, fetchRealPlaceForDay } from './services/aiPlanner';
import { getSupabaseClient, fetchUserTrips, saveTripToBackend, deleteTripFromBackend, getCurrentUser } from './services/supabaseClient';
import { getTheme, applyThemeToDocument, getSavedThemeId } from './services/theme';
import { Session } from '@supabase/supabase-js';

// Subcomponents
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { CreateTripWizard } from './components/CreateTripWizard';
import { AIGenerationLoader } from './components/AIGenerationLoader';
import { ItineraryView } from './components/ItineraryView';
import { TripModeView } from './components/TripModeView';
import { MyTripsView } from './components/MyTripsView';
import { MapPlaceSearchView } from './components/MapPlaceSearchView';
import { ActivityDetailsModal } from './components/ActivityDetailsModal';
import { AdaptModal } from './components/AdaptModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { ReplaceActivityModal } from './components/ReplaceActivityModal';
import { AlternativePlaceOption } from './services/alternativePlaces';
import { ToastContainer, ToastMessage } from './components/Toast';
import { SnowfallEffect } from './components/SnowfallAtmosphere';
import { ThemeHeroBackdrop } from './components/ThemeHeroBackdrop';
import { WhyTripWisePage } from './components/WhyRoamAIPage';
import { AuthPage } from './components/AuthPage';
import { UserProfileView } from './components/UserProfileView';
import { BottomNavBar } from './components/BottomNavBar';
import { TrailsView } from './components/TrailsView';
import { TravellerSearchModal } from './components/TravellerSearchModal';
import { TravellerSearchView } from './components/TravellerSearchView';

function normalizeTripPreparation(trip: Trip): Trip {
  if (!trip) return trip;
  let modified = false;

  const requirements = (trip.requirements || []).map((req) => {
    if ((req.status as string) === 'Completed') {
      modified = true;
      return { ...req, status: 'Action Required' as RequirementDocument['status'] };
    }
    return req;
  });

  const bookings = (trip.bookings || []).map((bk) => {
    if ((bk.status as string) === 'Confirmed') {
      modified = true;
      return { ...bk, status: 'Pending' as BookingItem['status'] };
    }
    return bk;
  });

  let packingList = trip.packingList || [];
  // If every item was initialized as checked (legacy AI generation bug), uncheck all
  if (
    packingList.length > 0 &&
    packingList.every((item) => item.checked) &&
    !(trip as any)._userExplicitlyPackedAll
  ) {
    modified = true;
    packingList = packingList.map((item) => ({ ...item, checked: false }));
  }

  if (!modified) return trip;

  return {
    ...trip,
    requirements,
    bookings,
    packingList
  };
}

export default function App() {
  // Theme state
  const [themeId, setThemeId] = useState<ThemeId>(() => getSavedThemeId());
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
  
  // Auth state
  const [session, setSession] = useState<Session | null>(null);
  const [intendedView, setIntendedView] = useState<any>(null);
  const [initialAuthMode, setInitialAuthMode] = useState<'signin' | 'signup' | 'forgot_password' | 'update_password'>('signin');

  const currentTheme = getTheme(themeId);

  useEffect(() => {
    applyThemeToDocument(currentTheme);
  }, [themeId]);

  const handleSelectTheme = (newThemeId: ThemeId) => {
    setThemeId(newThemeId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tripwise_theme_id', newThemeId);
    }
    const themeObj = getTheme(newThemeId);
    addToast('ai', `${themeObj.name} Applied`, `${themeObj.name} is now active.`);
  };

  // User trips state (loaded from Supabase / localStorage)
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string>('');
  const [currentView, setCurrentView] = useState<'landing' | 'wizard' | 'itinerary' | 'trip_mode' | 'my_trips' | 'map_search' | 'why_tripwise' | 'why_roamai' | 'auth' | 'profile' | 'trails' | 'travellers_search'>('landing');
  const [isTravellerSearchOpen, setIsTravellerSearchOpen] = useState<boolean>(false);
  const [wizardDestId, setWizardDestId] = useState<string>('');
  const [wizardInitialStep, setWizardInitialStep] = useState<number>(1);
  const [wizardEditingTrip, setWizardEditingTrip] = useState<Trip | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatingDestName, setGeneratingDestName] = useState<string>('');
  const [generatingParams, setGeneratingParams] = useState<{
    destinationName: string;
    startCity?: string;
    travelMode?: TravelMode;
    durationDays?: number;
  } | null>(null);
  const [activeDayNumber, setActiveDayNumber] = useState<number>(1);

  // Load user trips on initial mount from Supabase / local persistence
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);
        if (event === 'SIGNED_OUT') {
          setCurrentView((prev) => (['wizard', 'itinerary', 'trip_mode', 'my_trips'].includes(prev) ? 'landing' : prev));
          setIntendedView(null);
          setTrips([]);
          setActiveTripId('');
        } else if (event === 'SIGNED_IN') {
          fetchUserTrips().then((loadedTrips) => {
            if (loadedTrips && loadedTrips.length > 0) {
              const normalized = loadedTrips.map(normalizeTripPreparation);
              setTrips(normalized);
              // Only set active trip if we don't already have one, or if current is invalid
              setActiveTripId((prev) => prev && normalized.some(t => t.id === prev) ? prev : normalized[0].id);
            } else {
              setTrips([]);
              setActiveTripId('');
            }
          });
        } else if (event === 'PASSWORD_RECOVERY') {
          setInitialAuthMode('update_password');
          setCurrentView('auth');
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  useEffect(() => {
    getCurrentUser().then((user) => {
      fetchUserTrips().then((loadedTrips) => {
        if (loadedTrips && loadedTrips.length > 0) {
          const normalized = loadedTrips.map(normalizeTripPreparation);
          setTrips(normalized);
          if (user) {
            setActiveTripId(normalized[0].id);
          }
        }
      });
    });
  }, []);

  // Global View Protection Guard
  useEffect(() => {
    if (currentView === 'wizard' && session === null) {
      setIntendedView('wizard');
      setCurrentView('auth');
    }
  }, [currentView, session]);

  // Modals state
  const [selectedActivityForModal, setSelectedActivityForModal] = useState<Activity | null>(null);
  const [replacingActivity, setReplacingActivity] = useState<Activity | null>(null);
  const [isAdaptModalOpen, setIsAdaptModalOpen] = useState<boolean>(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${crypto.randomUUID()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Guests must explicitly open a trip to set activeTripId. If not set, do not auto-select trips[0].
  const rawActiveTrip = activeTripId ? trips.find((t) => t.id === activeTripId) : (session ? trips[0] : null);
  const activeTrip = rawActiveTrip ? normalizeTripPreparation(rawActiveTrip) : null;
  const recentPlannedTrip = activeTripId ? (trips.find((t) => t.id === activeTripId) || null) : (session ? (trips[0] || null) : null);

  // Open specific trip directly
  const handleOpenTrip = (tripId: string) => {
    setActiveTripId(tripId);
    setActiveDayNumber(1);
    setCurrentView('itinerary');
  };

  // Start planning from landing page
  const handleStartPlanning = (destId: string = '') => {
    setWizardDestId(destId);
    setWizardEditingTrip(null);
    setWizardInitialStep(1);
    if (!session) {
      setInitialAuthMode('signin');
      setIntendedView('wizard');
      setCurrentView('auth');
    } else {
      setCurrentView('wizard');
    }
  };

  // Back to Step 6 from generated Itinerary to edit preferences & regenerate
  const handleBackToStep6 = () => {
    if (activeTrip) {
      setWizardEditingTrip(activeTrip);
      setWizardDestId(activeTrip.destination);
      setWizardInitialStep(6);
      setCurrentView('wizard');
    }
  };

  // Generate trip with AI
  const handleGenerateTrip = async (params: {
    destinationId: string;
    destinationPlace?: {
      placeId: string;
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      photoUrl?: string;
    };
    startCity?: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    companionType: TravelCompanion;
    travellersCount: number;
    travelMode: TravelMode;
    budgetTier: BudgetTier;
    targetBudget: number;
    preferences: UserPreferences;
  }) => {
    const destinationName = params.destinationPlace?.name || params.destinationId || 'Destination';
    setGeneratingDestName(destinationName);
    setGeneratingParams({
      destinationName,
      startCity: params.startCity,
      travelMode: params.travelMode,
      durationDays: params.durationDays,
    });
    setIsGenerating(true);

    try {
      const generatedTrip = await generateTripFromInputs(params);

      let cloudSyncFailed = false;
      let cloudSyncErrorMsg = '';
      try {
        await saveTripToBackend(generatedTrip);
      } catch (saveError: any) {
        cloudSyncFailed = true;
        cloudSyncErrorMsg = saveError?.message || 'Cloud sync failed. Trip saved locally.';
        console.error("Cloud sync failed during trip generation:", saveError);
      }

      setTrips((prev) => [generatedTrip, ...prev.filter((t) => t.id !== generatedTrip.id)]);
      setActiveTripId(generatedTrip.id);
      setActiveDayNumber(1);
      setCurrentView('itinerary');
      
      if (cloudSyncFailed) {
        addToast(
          'warning',
          'Saved Locally Only',
          cloudSyncErrorMsg
        );
      } else {
        addToast(
          'ai',
          'Itinerary Generated!',
          `Personalized ${generatedTrip.destination} trip created with authentic places & live maps.`
        );
      }
    } catch (error: any) {
      console.error("AI Generation failed:", error);
      const msg = error?.message || 'There was an issue planning your trip. Please try again.';
      addToast('warning', 'Generation Failed', msg);
    } finally {
      setIsGenerating(false);
      setGeneratingParams(null);
    }
  };

  // Adapt Trip Plan with AI
  const handleApplyAdaptation = async (triggerId: string) => {
    if (!activeTrip) return;
    try {
      const { updatedTrip, summaryMessage } = await adaptTripPlanWithAI(
        activeTrip,
        triggerId,
        activeDayNumber
      );

      await saveTripToBackend(updatedTrip);
      setTrips((prev) => prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)));
      addToast('ai', 'Itinerary Adapted with AI!', summaryMessage);
    } catch (err) {
      console.error('Adaptation failed:', err);
    }
  };

  // Toggle activity complete
  const handleToggleActivityComplete = (activityId: string) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const newDays = t.days.map((d) => ({
          ...d,
          activities: d.activities.map((a) =>
            a.id === activityId ? { ...a, completed: !a.completed } : a
          )
        }));
        const updated = { ...t, days: newDays };
        saveTripToBackend(updated).catch(console.warn);
        return updated;
      })
    );
  };

  // Open Replace Activity Modal
  const handleReplaceActivity = (activityId: string) => {
    if (!activeTrip) return;
    let foundActivity: Activity | null = null;
    for (const day of activeTrip.days) {
      const act = day.activities.find((a) => a.id === activityId);
      if (act) {
        foundActivity = act;
        break;
      }
    }

    if (foundActivity) {
      setReplacingActivity(foundActivity);
    }
  };

  // Confirm alternative place selection
  const handleConfirmReplaceActivity = (
    oldActivityId: string,
    chosenAlternative: AlternativePlaceOption
  ) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const newDays = t.days.map((d) => ({
          ...d,
          activities: d.activities.map((a) => {
            if (a.id === oldActivityId) {
              return {
                ...a,
                title: chosenAlternative.title,
                category: chosenAlternative.category,
                description: chosenAlternative.description,
                imageUrl: chosenAlternative.imageUrl || a.imageUrl,
                location: chosenAlternative.location,
                estimatedCost: chosenAlternative.estimatedCost,
                duration: chosenAlternative.duration,
                rating: chosenAlternative.rating,
                recommendationReason: chosenAlternative.recommendationReason,
                isUpdated: true,
                updatedReason: `✨ Swapped for ${chosenAlternative.badge || 'chosen alternative'}`
              };
            }
            return a;
          })
        }));
        const updated = { ...t, days: newDays };
        saveTripToBackend(updated).catch(console.warn);
        return updated;
      })
    );

    addToast('success', 'Place Swapped Successfully', `Updated to "${chosenAlternative.title}".`);
  };

  // Move activity up
  const handleMoveActivityUp = (activityId: string) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const newDays = t.days.map((d) => {
          const idx = d.activities.findIndex((a) => a.id === activityId);
          if (idx > 0) {
            const newActs = [...d.activities];
            const temp = newActs[idx];
            newActs[idx] = newActs[idx - 1];
            newActs[idx - 1] = temp;
            return { ...d, activities: newActs };
          }
          return d;
        });
        const updated = { ...t, days: newDays };
        saveTripToBackend(updated).catch(console.warn);
        return updated;
      })
    );
  };

  // Move activity down
  const handleMoveActivityDown = (activityId: string) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const newDays = t.days.map((d) => {
          const idx = d.activities.findIndex((a) => a.id === activityId);
          if (idx !== -1 && idx < d.activities.length - 1) {
            const newActs = [...d.activities];
            const temp = newActs[idx];
            newActs[idx] = newActs[idx + 1];
            newActs[idx + 1] = temp;
            return { ...d, activities: newActs };
          }
          return d;
        });
        const updated = { ...t, days: newDays };
        saveTripToBackend(updated).catch(console.warn);
        return updated;
      })
    );
  };

  // Remove activity
  const handleRemoveActivity = (activityId: string) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const newDays = t.days.map((d) => ({
          ...d,
          activities: d.activities.filter((a) => a.id !== activityId)
        }));
        const updated = { ...t, days: newDays };
        saveTripToBackend(updated).catch(console.warn);
        return updated;
      })
    );
    addToast('info', 'Stop Removed', 'Itinerary updated.');
  };

  // Add custom real place activity
  const handleAddCustomActivity = async (dayNumber: number) => {
    if (!activeTrip) return;
    const currentDay = activeTrip.days.find(d => d.dayNumber === dayNumber) || activeTrip.days[0];

    addToast('info', 'Finding Real Spot...', `Curating an authentic place in ${activeTrip.destination}...`);

    try {
      const newAct = await fetchRealPlaceForDay({
        destination: activeTrip.destination,
        destinationStateOrCountry: activeTrip.destinationStateOrCountry,
        dayNumber,
        existingActivities: currentDay?.activities || [],
        travelStyles: activeTrip.preferences?.styles,
        budgetTier: activeTrip.budgetTier,
        travelMode: activeTrip.travelMode
      });

      setTrips((prev) =>
        prev.map((t) => {
          if (t.id !== activeTripId) return t;
          const newDays = t.days.map((d) => {
            if (d.dayNumber === dayNumber) {
              return {
                ...d,
                activities: [...d.activities, newAct]
              };
            }
            return d;
          });
          const updated = { ...t, days: newDays };
          saveTripToBackend(updated).catch(console.warn);
          return updated;
        })
      );

      addToast('ai', 'Real Stop Added!', `Added "${newAct.title}" to Day ${dayNumber}.`);
    } catch (err) {
      console.error('Failed to add real place:', err);
      addToast('warning', 'Could Not Add Spot', 'Please try again.');
    }
  };

  // Add specific activity directly to a day's itinerary
  const handleAddActivityToDay = (dayNumber: number, activity: Activity) => {
    if (!activeTrip) return;

    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const newDays = t.days.map((d) => {
          if (d.dayNumber === dayNumber) {
            return {
              ...d,
              activities: [...d.activities, activity]
            };
          }
          return d;
        });
        const updated = { ...t, days: newDays };
        saveTripToBackend(updated).catch(console.warn);
        return updated;
      })
    );

    addToast('ai', 'Place Added to Itinerary!', `"${activity.title}" added to Day ${dayNumber}.`);
  };

  // Toggle packing list item
  const handleTogglePackingItem = (itemId: string) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const newPacking = t.packingList.map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        );
        const updated = { ...t, packingList: newPacking };
        saveTripToBackend(updated).catch(console.warn);
        return updated;
      })
    );
  };

  // Add packing item
  const handleAddPackingItem = (name: string, category: PackingItem['category']) => {
    const newItem: PackingItem = {
      id: `p-${crypto.randomUUID()}`,
      name,
      category,
      checked: false
    };

    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const updated = { ...t, packingList: [...t.packingList, newItem] };
        saveTripToBackend(updated).catch(console.warn);
        return updated;
      })
    );

    addToast('success', 'Item Added', `"${name}" added to packing checklist.`);
  };

  // Toggle all packing list items
  const handleToggleAllPacking = (allPacked: boolean) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const newPacking = (t.packingList || []).map((item) => ({
          ...item,
          checked: allPacked
        }));
        const updated = {
          ...t,
          packingList: newPacking,
          _userExplicitlyPackedAll: allPacked
        };
        saveTripToBackend(updated).catch(console.warn);
        return updated;
      })
    );
  };

  // Toggle government / official requirement status
  const handleToggleRequirement = (docId: string) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const newRequirements = (t.requirements || []).map((req) => {
          if (req.id !== docId) return req;
          const isDone = req.status === 'Ready' || (req.status as string) === 'Completed';
          const nextStatus: RequirementDocument['status'] = isDone ? 'Action Required' : 'Ready';
          return { ...req, status: nextStatus };
        });
        const updated = { ...t, requirements: newRequirements };
        saveTripToBackend(updated).catch(console.warn);
        return updated;
      })
    );
  };

  // Toggle booking item status
  const handleToggleBooking = (bookingId: string) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const newBookings = (t.bookings || []).map((bk) => {
          if (bk.id !== bookingId) return bk;
          const isConfirmed = bk.status === 'Booked' || (bk.status as string) === 'Confirmed';
          const nextStatus: BookingItem['status'] = isConfirmed ? 'Pending' : 'Booked';
          return { ...bk, status: nextStatus };
        });
        const updated = { ...t, bookings: newBookings };
        saveTripToBackend(updated).catch(console.warn);
        return updated;
      })
    );
  };

  // Add Day Expense
  const handleAddExpense = (expenseData: Omit<ExpenseItem, 'id' | 'createdAt'>) => {
    if (!activeTrip) return;
    const newExpense: ExpenseItem = {
      ...expenseData,
      id: `exp-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString()
    };

    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const existingExpenses = t.expenses || [];
        const updated = {
          ...t,
          expenses: [newExpense, ...existingExpenses]
        };
        saveTripToBackend(updated).catch(console.warn);
        return updated;
      })
    );

    addToast(
      'success',
      'Expense Logged',
      `Recorded ${activeTrip.currency}${expenseData.amount.toLocaleString()} for Day ${expenseData.dayNumber}.`
    );
  };

  // Delete Day Expense
  const handleDeleteExpense = (expenseId: string) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const updated = {
          ...t,
          expenses: (t.expenses || []).filter((e) => e.id !== expenseId)
        };
        saveTripToBackend(updated).catch(console.warn);
        return updated;
      })
    );
    addToast('info', 'Expense Removed', 'Expense entry removed from day tracker.');
  };

  // Delete trip from My Trips
  const handleDeleteTrip = (tripId: string) => {
    deleteTripFromBackend(tripId).catch(console.warn);
    setTrips((prev) => prev.filter((t) => t.id !== tripId));
    if (activeTripId === tripId) {
      const remaining = trips.filter((t) => t.id !== tripId);
      if (remaining.length > 0) {
        setActiveTripId(remaining[0].id);
      } else {
        setActiveTripId('');
        setCurrentView('landing');
      }
    }
    addToast('info', 'Trip Removed', 'Trip deleted from your account.');
  };

  // Add Searched Place directly to current active day itinerary
  const handleAddPlaceToTrip = (place: SavedPlace) => {
    if (!activeTrip) return;

    const newActivity: Activity = {
      id: `act-search-${crypto.randomUUID()}`,
      time: '04:30 PM',
      title: place.name,
      location: place.address,
      coordinates: { lat: place.latitude, lng: place.longitude },
      description: `Discovered and added via Google Places Live Search: ${place.name}. Located at ${place.address}.`,
      duration: '1.5 hours',
      category: (['Food', 'Sightseeing', 'Adventure', 'Relaxation', 'Culture', 'Nightlife', 'Shopping', 'Transit'].includes(place.category || '')
        ? place.category
        : 'Sightseeing') as any,
      estimatedCost: 0,
      imageUrl: place.photoUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      rating: place.rating || 4.5,
      recommendationReason: 'Added from Google Places Search. Coordinates saved for direct GPS navigation.',
      tips: 'Exact location saved with latitude & longitude. Tap to view directions or log expenses.',
      travelTimeFromPrev: '15 min drive'
    };

    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTripId) return t;
        const updated = {
          ...t,
          days: t.days.map((d) => {
            if (d.dayNumber !== activeDayNumber) return d;
            return {
              ...d,
              activities: [...d.activities, newActivity]
            };
          })
        };
        saveTripToBackend(updated).catch(console.warn);
        return updated;
      })
    );

    addToast(
      'success',
      'Place Added to Itinerary',
      `"${place.name}" added to Day ${activeDayNumber} of ${activeTrip.destination}.`
    );
  };

  // Save or Pin Hotel Stay to Trip
  const handleSaveHotelToTrip = (hotel: HotelStayRecommendation, dayNumber?: number) => {
    if (!activeTrip) return;

    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTrip.id) return t;

        const updatedDays = t.days.map((d) => {
          if (dayNumber && d.dayNumber === dayNumber) {
            return {
              ...d,
              suggestedStay: hotel
            };
          }
          return d;
        });

        const currentRecs = t.hotelRecommendations || [];
        const updatedRecs = currentRecs.some((h) => h.id === hotel.id)
          ? currentRecs.map((h) => (h.id === hotel.id ? hotel : h))
          : [hotel, ...currentRecs];

        const updatedTrip = {
          ...t,
          days: updatedDays,
          hotelRecommendations: updatedRecs
        };

        saveTripToBackend(updatedTrip).catch(console.warn);
        return updatedTrip;
      })
    );

    addToast(
      'success',
      'Stay Pinned to Itinerary',
      `"${hotel.name}" saved as your stay for ${dayNumber ? `Day ${dayNumber}` : 'your trip'}.`
    );
  };

  // Add a new Day to active trip
  const handleAddDay = () => {
    if (!activeTrip) return;

    const newDayNumber = activeTrip.days.length + 1;
    let newDateStr = `Day ${newDayNumber}`;
    
    if (activeTrip.startDate) {
      try {
        const d = new Date(activeTrip.startDate);
        d.setDate(d.getDate() + (newDayNumber - 1));
        newDateStr = d.toISOString().split('T')[0];
      } catch {
        newDateStr = `Day ${newDayNumber}`;
      }
    }

    const lastDay = activeTrip.days[activeTrip.days.length - 1];
    const lastDayWeather = lastDay?.weatherForecast;

    const newDay: DayItinerary = {
      dayNumber: newDayNumber,
      date: newDateStr,
      theme: 'Exploration',
      vibe: 'Exploration & Leisure',
      weatherForecast: lastDayWeather ? { ...lastDayWeather } : {
        temp: '26°C',
        condition: 'Sunny',
        icon: '☀️',
        rainChance: 10
      },
      activities: []
    };

    const updatedTrip: Trip = {
      ...activeTrip,
      durationDays: newDayNumber,
      days: [...activeTrip.days, newDay]
    };

    setTrips((prev) => prev.map((t) => (t.id === activeTrip.id ? updatedTrip : t)));
    saveTripToBackend(updatedTrip).catch(console.warn);
    setActiveDayNumber(newDayNumber);

    addToast(
      'success',
      'Day Added',
      `Day ${newDayNumber} has been added to your itinerary for ${activeTrip.destination}.`
    );
  };

  const BOTTOM_NAV_ORDER = [
    'landing',
    'trails',
    'wizard',
    'travellers_search',
    'profile'
  ] as const;

  const [slideDirection, setSlideDirection] = useState<number>(0);

  const navigateBottomTab = (targetView: string, explicitDir?: number) => {
    const currentIndex = BOTTOM_NAV_ORDER.indexOf(currentView as any);
    const targetIndex = BOTTOM_NAV_ORDER.indexOf(targetView as any);

    let dir = explicitDir;
    if (dir === undefined) {
      if (currentIndex !== -1 && targetIndex !== -1) {
        dir = targetIndex >= currentIndex ? 1 : -1;
      } else {
        dir = 1;
      }
    }

    setSlideDirection(dir);

    if (targetView === 'wizard') {
      setWizardDestId('');
      setWizardEditingTrip(null);
      setWizardInitialStep(1);
      setCurrentView('wizard');
    } else {
      setCurrentView(targetView as any);
    }

    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const goToNextBottomTab = () => {
    const currentIndex = BOTTOM_NAV_ORDER.indexOf(currentView as any);
    if (currentIndex >= 0 && currentIndex < BOTTOM_NAV_ORDER.length - 1) {
      navigateBottomTab(BOTTOM_NAV_ORDER[currentIndex + 1], 1);
    }
  };

  const goToPrevBottomTab = () => {
    const currentIndex = BOTTOM_NAV_ORDER.indexOf(currentView as any);
    if (currentIndex > 0) {
      navigateBottomTab(BOTTOM_NAV_ORDER[currentIndex - 1], -1);
    }
  };

  // Swipe and Keyboard Navigation between Bottom Nav Pages
  useEffect(() => {
    if (!BOTTOM_NAV_ORDER.includes(currentView as any)) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isVertical = false;
    let isValidSwipe = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        target.closest(
          'input, textarea, select, [contenteditable="true"], [data-no-swipe], .overflow-x-auto, .overflow-x-scroll'
        )
      ) {
        isValidSwipe = false;
        return;
      }

      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      isVertical = false;
      isValidSwipe = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isValidSwipe || isVertical) return;
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // If vertical motion exceeds horizontal, lock to vertical scrolling
      if (absY > 8 && absY > absX) {
        isVertical = true;
        isValidSwipe = false;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isValidSwipe || isVertical) {
        isValidSwipe = false;
        return;
      }

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const dt = Date.now() - touchStartTime;

      if (absX >= 45 && absX > absY * 1.3 && dt < 800) {
        if (dx < 0) {
          goToNextBottomTab();
        } else {
          goToPrevBottomTab();
        }
      }
      isValidSwipe = false;
    };

    // Desktop mouse drag support
    let mouseStartX = 0;
    let mouseStartY = 0;
    let mouseStartTime = 0;
    let isMouseDown = false;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        target.closest(
          'input, textarea, select, button, a, [contenteditable="true"], [data-no-swipe], .overflow-x-auto, .overflow-x-scroll'
        )
      ) {
        isMouseDown = false;
        return;
      }
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
      mouseStartTime = Date.now();
      isMouseDown = true;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const dx = e.clientX - mouseStartX;
      const dy = e.clientY - mouseStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const dt = Date.now() - mouseStartTime;

      if (absX >= 60 && absX > absY * 1.5 && dt < 800) {
        if (dx < 0) {
          goToNextBottomTab();
        } else {
          goToPrevBottomTab();
        }
      }
      isMouseDown = false;
    };

    // Keyboard Arrow navigation
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('input, textarea, select, [contenteditable="true"]')) {
        return;
      }
      if (e.key === 'ArrowRight') {
        goToNextBottomTab();
      } else if (e.key === 'ArrowLeft') {
        goToPrevBottomTab();
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [currentView]);

  const isBottomNavView = BOTTOM_NAV_ORDER.includes(currentView as any);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : dir < 0 ? '-100%' : 0,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring', stiffness: 320, damping: 32, mass: 0.8 },
        opacity: { duration: 0.18 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : dir < 0 ? '100%' : 0,
      opacity: 0,
      transition: {
        x: { type: 'spring', stiffness: 320, damping: 32, mass: 0.8 },
        opacity: { duration: 0.18 },
      },
    }),
  };

  const isNoThemeBgView = 
    currentView === 'trails' || 
    currentView === 'profile' || 
    currentView === 'travellers_search' || 
    currentView === 'wizard';

  const renderCurrentView = () => {
    switch (currentView) {
      case 'landing':
        return (
          <LandingPage
            currentTheme={currentTheme}
            recentTrip={recentPlannedTrip}
            onOpenTrip={handleOpenTrip}
            onStartPlanning={handleStartPlanning}
            onOpenThemeModal={() => setIsThemeModalOpen(true)}
            onOpenMapSearch={() => setCurrentView('map_search')}
            onNavigateToWhyTripWise={() => setCurrentView('why_roamai')}
          />
        );
      case 'wizard':
        return (
          <CreateTripWizard
            initialDestinationId={wizardDestId}
            initialStep={wizardInitialStep}
            initialTrip={wizardEditingTrip}
            onGenerateTrip={handleGenerateTrip}
            onCancel={() => {
              if (wizardEditingTrip) {
                setCurrentView('itinerary');
              } else {
                navigateBottomTab('landing', -1);
              }
            }}
          />
        );
      case 'itinerary':
        return activeTrip ? (
          <div className="px-1.5 sm:px-6 lg:px-8 pt-2 sm:pt-6">
            <ItineraryView
              trip={activeTrip}
              activeDayNumber={activeDayNumber}
              onSelectDay={(dayNum) => setActiveDayNumber(dayNum)}
              onEnterTripMode={() => setCurrentView('trip_mode')}
              onBackToStep6={handleBackToStep6}
              onNavigateHome={() => navigateBottomTab('landing', -1)}
              onNavigateToMyTrips={() => setCurrentView('my_trips')}
              onOpenActivityDetails={(act) => setSelectedActivityForModal(act)}
              onReplaceActivity={handleReplaceActivity}
              onMoveActivityUp={handleMoveActivityUp}
              onMoveActivityDown={handleMoveActivityDown}
              onRemoveActivity={handleRemoveActivity}
              onAddCustomActivity={handleAddCustomActivity}
              onAddActivityToDay={handleAddActivityToDay}
              onTogglePackingItem={handleTogglePackingItem}
              onToggleAllPacking={handleToggleAllPacking}
              onAddPackingItem={handleAddPackingItem}
              onToggleRequirement={handleToggleRequirement}
              onToggleBooking={handleToggleBooking}
              onOpenMapSearch={() => setCurrentView('map_search')}
              onSaveHotelToTrip={handleSaveHotelToTrip}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onAddDay={handleAddDay}
            />
          </div>
        ) : null;
      case 'trip_mode':
        return activeTrip ? (
          <TripModeView
            trip={activeTrip}
            activeDayNumber={activeDayNumber}
            onSelectDay={(dayNum) => setActiveDayNumber(dayNum)}
            onOpenAdapt={() => setIsAdaptModalOpen(true)}
            onOpenActivityDetails={(act) => setSelectedActivityForModal(act)}
            onReplaceActivity={handleReplaceActivity}
            onToggleActivityCompleted={handleToggleActivityComplete}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onAddCustomActivity={handleAddCustomActivity}
            onExitTripMode={() => setCurrentView('itinerary')}
          />
        ) : null;
      case 'my_trips':
        return (
          <div className="px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-12">
            <MyTripsView
              trips={trips}
              activeTripId={activeTripId}
              onSelectTrip={(tripId) => {
                setActiveTripId(tripId);
                setActiveDayNumber(1);
                setCurrentView('itinerary');
              }}
              onEnterTripMode={(trip) => {
                setActiveTripId(trip.id);
                setActiveDayNumber(1);
                setCurrentView('trip_mode');
              }}
              onPlanNewTrip={() => navigateBottomTab('wizard', 1)}
              onDeleteTrip={handleDeleteTrip}
            />
          </div>
        );
      case 'map_search':
        return (
          <div className="px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-12">
            <MapPlaceSearchView
              activeTrip={activeTrip}
              onAddPlaceToTrip={handleAddPlaceToTrip}
            />
          </div>
        );
      case 'why_tripwise':
      case 'why_roamai':
        return (
          <WhyTripWisePage
            currentTheme={currentTheme}
            onStartPlanning={() => navigateBottomTab('wizard', 1)}
            onOpenMapSearch={() => setCurrentView('map_search')}
          />
        );
      case 'auth':
        return (
          <AuthPage
            currentTheme={currentTheme}
            initialAuthMode={initialAuthMode}
            onAuthSuccess={() => {
              setCurrentView(intendedView || 'landing');
              setIntendedView(null);
              setInitialAuthMode('signin');
            }}
            onCancel={() => {
              setCurrentView('landing');
              setIntendedView(null);
              setInitialAuthMode('signin');
            }}
          />
        );
      case 'profile':
        return (
          <UserProfileView
            session={session}
            currentTheme={currentTheme}
            trips={trips}
            onOpenTrip={(tripId) => {
              setActiveTripId(tripId);
              setActiveDayNumber(1);
              setCurrentView('itinerary');
            }}
            onStartPlanning={(dest) => {
              setWizardDestId(dest || '');
              setWizardEditingTrip(null);
              navigateBottomTab('wizard');
            }}
            onBack={() => navigateBottomTab('landing', -1)}
          />
        );
      case 'trails':
        return (
          <TrailsView
            currentTheme={currentTheme}
            session={session}
            onStartPlanning={(dest) => {
              setWizardDestId(dest || '');
              setWizardEditingTrip(null);
              navigateBottomTab('wizard');
            }}
            onBack={() => navigateBottomTab('landing', -1)}
          />
        );
      case 'travellers_search':
        return (
          <TravellerSearchView
            currentTheme={currentTheme}
            onSelectTraveller={() => navigateBottomTab('profile', 1)}
            onOpenTrail={() => navigateBottomTab('trails', -1)}
            onStartPlanning={(destination) => {
              setWizardDestId(destination || '');
              setWizardEditingTrip(null);
              navigateBottomTab('wizard');
            }}
            onBack={() => navigateBottomTab('landing', -1)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="min-h-screen font-sans antialiased text-slate-900 flex flex-col transition-colors duration-300 relative"
      style={{ backgroundColor: currentView === 'profile' ? '#09090b' : isNoThemeBgView ? '#0a0a0f' : currentTheme.canvasBg }}
    >
      {/* Full-Page Dynamic Photographic Scenic Backdrop - Disabled on separate bottom nav pages */}
      {!isNoThemeBgView && (
        <ThemeHeroBackdrop currentTheme={currentTheme} isDark={false} />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Global Ambient Snowfall when Snow Theme is active - Disabled on separate bottom nav pages */}
      {!isNoThemeBgView && themeId === 'snow' && (
        <SnowfallEffect fullScreen={true} density="gentle" />
      )}

      {/* Full AI Generation Loading Screen */}
      {isGenerating && (
        <AIGenerationLoader
          destinationName={generatingParams?.destinationName || generatingDestName}
          startCity={generatingParams?.startCity}
          travelMode={generatingParams?.travelMode || 'Flight'}
          durationDays={generatingParams?.durationDays || 3}
          currentTheme={currentTheme}
          onCancel={() => {
            setIsGenerating(false);
            setGeneratingParams(null);
          }}
        />
      )}

      {/* Main App Layout */}
      {!isGenerating && (
        <>
          {/* Top Global Navigation (Hidden on trails, travellers_search, and profile per user request) */}
          {currentView !== 'trip_mode' && 
           currentView !== 'auth' && 
           currentView !== 'trails' && 
           currentView !== 'travellers_search' && 
           currentView !== 'profile' && (
            <Navbar
              currentView={currentView}
              onNavigate={(view) => setCurrentView(view)}
              activeTrip={activeTrip}
              savedTripsCount={trips.length}
              currentTheme={currentTheme}
              onOpenThemeModal={() => setIsThemeModalOpen(true)}
              session={session}
              onRequireAuth={() => {
                setIntendedView(currentView);
                setCurrentView('auth');
              }}
              onPlanTrip={() => handleStartPlanning()}
            />
          )}

          {/* Body Views with horizontal slide support across bottom nav pages */}
          <main className="flex-1 overflow-x-hidden relative">
            {isBottomNavView ? (
              <AnimatePresence mode="wait" custom={slideDirection} initial={false}>
                <motion.div
                  key={currentView}
                  custom={slideDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="w-full min-h-full"
                >
                  {renderCurrentView()}
                </motion.div>
              </AnimatePresence>
            ) : (
              renderCurrentView()
            )}
          </main>

          {/* Floating Bottom Navigation Bar (Accessible across all separate pages, hidden in trip_mode & auth) */}
          {currentView !== 'trip_mode' && currentView !== 'auth' && (
            <BottomNavBar
              currentView={currentView}
              onNavigate={(v) => navigateBottomTab(v)}
              onStartPlanning={() => navigateBottomTab('wizard')}
              onOpenTravellerSearch={() => navigateBottomTab('travellers_search')}
              session={session}
            />
          )}

          {/* Travellers Profile Search Modal */}
          <TravellerSearchModal
            isOpen={isTravellerSearchOpen}
            onClose={() => setIsTravellerSearchOpen(false)}
            onSelectTraveller={() => {
              setIsTravellerSearchOpen(false);
              setCurrentView('profile');
            }}
          />

          {/* Activity Details Modal */}
          {selectedActivityForModal && (
            <ActivityDetailsModal
              activity={selectedActivityForModal}
              currency={activeTrip?.currency || 'INR'}
              onClose={() => setSelectedActivityForModal(null)}
              onReplace={handleReplaceActivity}
            />
          )}

          {/* Adapt Plan Modal */}
          <AdaptModal
            isOpen={isAdaptModalOpen}
            onClose={() => setIsAdaptModalOpen(false)}
            onApplyAdaptation={handleApplyAdaptation}
            activeDayNumber={activeDayNumber}
          />

          {/* Theme Selector Modal */}
          <ThemeSelectorModal
            isOpen={isThemeModalOpen}
            onClose={() => setIsThemeModalOpen(false)}
            currentTheme={currentTheme}
            onSelectTheme={handleSelectTheme}
          />

          {/* Interactive Replace Place Modal */}
          {replacingActivity && activeTrip && (
            <ReplaceActivityModal
              isOpen={Boolean(replacingActivity)}
              activity={replacingActivity}
              destination={activeTrip.destination}
              currency={activeTrip.currency}
              userStyles={activeTrip.preferences.styles}
              onClose={() => setReplacingActivity(null)}
              onConfirmReplace={handleConfirmReplaceActivity}
            />
          )}
        </>
      )}
    </div>
  );
}
