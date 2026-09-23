import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trip, Activity, DayItinerary, PackingItem, UserPreferences, TravelCompanion, TravelMode, BudgetTier, ThemeId, ExpenseItem, SavedPlace, HotelStayRecommendation, RequirementDocument, BookingItem } from './types';

import { generateTripFromInputs, adaptTripPlanWithAI, fetchRealPlaceForDay } from './services/aiPlanner';
import { getSupabaseClient, fetchUserTrips, saveTripToBackend, deleteTripFromBackend, getCurrentUser } from './services/supabaseClient';
import { getTheme, applyThemeToDocument, getSavedThemeId } from './services/theme';
import { Session } from '@supabase/supabase-js';
import { isTripCompleted, setTripCompletedLocal } from './utils/tripCompletion';

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
import { WhyTripWisePage } from './components/WhyTripWise';
import { AuthPage } from './components/AuthPage';
import { UserProfileView } from './components/UserProfileView';
import { BottomNavBar } from './components/BottomNavBar';
import { TrailsView } from './components/TrailsView';
import { TravellerSearchModal } from './components/TravellerSearchModal';
import { TravellerSearchView } from './components/TravellerSearchView';
import { SavedTrailsView } from './components/SavedTrailsView';
import { UploadTrailView } from './components/UploadTrailView';

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
  const [currentView, setCurrentView] = useState<'landing' | 'wizard' | 'itinerary' | 'trip_mode' | 'my_trips' | 'map_search' | 'why_tripwise' | 'why_roamai' | 'auth' | 'profile' | 'trails' | 'travellers_search' | 'saved_trails' | 'upload_trail'>('landing');
  const [uploadTrailFile, setUploadTrailFile] = useState<File | null>(null);
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

  // Toggle trip completion
  const handleToggleTripCompleted = (tripId: string) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t;
        const willBeCompleted = !isTripCompleted(t);
        setTripCompletedLocal(t.id, willBeCompleted);
        const updated: Trip = {
          ...t,
          isCompleted: willBeCompleted,
          completedAt: willBeCompleted ? new Date().toISOString() : undefined
        };
        saveTripToBackend(updated).catch(console.warn);
        addToast(
          'success',
          willBeCompleted ? 'Trip Completed! 🎉' : 'Trip Marked as Planned',
          willBeCompleted
            ? `Congratulations! ${t.destination} has been added to your completed journeys.`
            : `${t.destination} is now marked as an upcoming trip.`
        );
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

  const isBottomNavView = BOTTOM_NAV_ORDER.includes(currentView as any);

  const sliderRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScroll = useRef(false);
  const programmaticScrollTimer = useRef<any>(null);
  const isUserSwipeRef = useRef(false);
  const scrollSettleTimer = useRef<any>(null);

  const scrollToTab = (index: number, smooth = true) => {
    const targetView = BOTTOM_NAV_ORDER[index];
    if (!targetView) return;

    if (targetView !== 'trails') {
      window.dispatchEvent(new CustomEvent('roamai_pause_trails'));
    }

    if (targetView === 'trails' && !session) {
      setIntendedView('trails');
      setCurrentView('auth');
      return;
    }

    if (targetView === 'wizard') {
      setWizardDestId('');
      setWizardEditingTrip(null);
      setWizardInitialStep(1);
    }

    if (!sliderRef.current) {
      setCurrentView(targetView);
      return;
    }

    // Mark programmatic scroll so scroll listeners know this is intentional
    isProgrammaticScroll.current = true;
    isUserSwipeRef.current = false;

    if (programmaticScrollTimer.current) {
      clearTimeout(programmaticScrollTimer.current);
    }
    if (scrollSettleTimer.current) {
      clearTimeout(scrollSettleTimer.current);
    }

    const width = sliderRef.current.clientWidth;
    const targetLeft = index * width;

    // Smoothly or instantly scroll directly to the target slide (native snap-always allows programmatic scrollTo to pass)
    sliderRef.current.scrollTo({
      left: targetLeft,
      behavior: smooth ? 'smooth' : 'instant',
    });

    setCurrentView(targetView);

    programmaticScrollTimer.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, smooth ? 450 : 50);
  };

  const handleSliderScroll = () => {
    if (!sliderRef.current) return;

    // Immediately cut off trails audio if user scrolls away from Slide 1 (Trails)
    const { scrollLeft, clientWidth } = sliderRef.current;
    if (clientWidth) {
      const currentScrollRatio = scrollLeft / clientWidth;
      // If user moved more than 15% away from slide 1, immediately pause trails
      if (Math.abs(currentScrollRatio - 1) > 0.15) {
        window.dispatchEvent(new CustomEvent('roamai_pause_trails'));
      }
    }

    if (isProgrammaticScroll.current) return;

    isUserSwipeRef.current = true;

    if (scrollSettleTimer.current) {
      clearTimeout(scrollSettleTimer.current);
    }

    // Debounce state updates so App doesn't re-render mid-gesture
    scrollSettleTimer.current = setTimeout(() => {
      if (!sliderRef.current || isProgrammaticScroll.current) {
        isUserSwipeRef.current = false;
        return;
      }
      const { scrollLeft, clientWidth } = sliderRef.current;
      if (!clientWidth) {
        isUserSwipeRef.current = false;
        return;
      }
      const newIndex = Math.round(scrollLeft / clientWidth);
      if (newIndex >= 0 && newIndex < BOTTOM_NAV_ORDER.length) {
        const targetView = BOTTOM_NAV_ORDER[newIndex];
        if (targetView === 'trails' && !session) {
          setIntendedView('trails');
          setCurrentView('auth');
          return;
        }
        if (targetView !== currentView) {
          setCurrentView(targetView);
        }
      }
      setTimeout(() => {
        isUserSwipeRef.current = false;
      }, 100);
    }, 120);
  };

  // Modern scrollend listener for instantaneous and jitter-free settle detection
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const handleScrollEnd = () => {
      if (isProgrammaticScroll.current) {
        isProgrammaticScroll.current = false;
        if (programmaticScrollTimer.current) {
          clearTimeout(programmaticScrollTimer.current);
        }
        return;
      }

      if (isUserSwipeRef.current) {
        if (scrollSettleTimer.current) {
          clearTimeout(scrollSettleTimer.current);
        }
        const { scrollLeft, clientWidth } = slider;
        if (clientWidth) {
          const newIndex = Math.round(scrollLeft / clientWidth);
          if (newIndex >= 0 && newIndex < BOTTOM_NAV_ORDER.length) {
            const targetView = BOTTOM_NAV_ORDER[newIndex];
            if (targetView === 'trails' && !session) {
              setIntendedView('trails');
              setCurrentView('auth');
              return;
            }
            if (targetView !== currentView) {
              setCurrentView(targetView);
            }
          }
        }
        setTimeout(() => {
          isUserSwipeRef.current = false;
        }, 100);
      }
    };

    slider.addEventListener('scrollend', handleScrollEnd);
    return () => {
      slider.removeEventListener('scrollend', handleScrollEnd);
    };
  }, [currentView]);

  // Only sync slider position when mounting into bottom-nav view from a non-bottom-nav view (e.g. returning from itinerary/auth to profile)
  const prevIsBottomNavView = useRef(isBottomNavView);
  useEffect(() => {
    if (!prevIsBottomNavView.current && isBottomNavView && sliderRef.current) {
      const index = BOTTOM_NAV_ORDER.indexOf(currentView as any);
      if (index > 0) {
        sliderRef.current.scrollTo({
          left: index * sliderRef.current.clientWidth,
          behavior: 'instant',
        });
      }
    }
    prevIsBottomNavView.current = isBottomNavView;
  }, [isBottomNavView, currentView]);

  // Adjust scroll on window resize (e.g. rotation)
  useEffect(() => {
    const handleResize = () => {
      if (!sliderRef.current || !isBottomNavView) return;
      const index = BOTTOM_NAV_ORDER.indexOf(currentView as any);
      if (index !== -1) {
        sliderRef.current.scrollTo({
          left: index * sliderRef.current.clientWidth,
          behavior: 'instant',
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentView, isBottomNavView]);

  // Pause trails video whenever user leaves the trails view
  useEffect(() => {
    if (currentView !== 'trails') {
      window.dispatchEvent(new CustomEvent('roamai_pause_trails'));
    }
  }, [currentView]);

  // Keyboard navigation for desktop power users
  useEffect(() => {
    if (!isBottomNavView) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowRight') {
        const idx = BOTTOM_NAV_ORDER.indexOf(currentView as any);
        if (idx < BOTTOM_NAV_ORDER.length - 1) scrollToTab(idx + 1);
      } else if (e.key === 'ArrowLeft') {
        const idx = BOTTOM_NAV_ORDER.indexOf(currentView as any);
        if (idx > 0) scrollToTab(idx - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, isBottomNavView]);

  const isNoThemeBgView = 
    currentView === 'trails' || 
    currentView === 'profile' || 
    currentView === 'travellers_search' ||
    currentView === 'upload_trail';

  const renderNonBottomNavView = () => {
    switch (currentView) {
      case 'itinerary':
        return activeTrip ? (
          <div className="px-1.5 sm:px-6 lg:px-8 pt-2 sm:pt-6">
            <ItineraryView
              trip={activeTrip}
              activeDayNumber={activeDayNumber}
              onSelectDay={(dayNum) => setActiveDayNumber(dayNum)}
              onEnterTripMode={() => setCurrentView('trip_mode')}
              onBackToStep6={handleBackToStep6}
              onNavigateHome={() => scrollToTab(0)}
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
              onToggleTripCompleted={handleToggleTripCompleted}
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
              onPlanNewTrip={() => scrollToTab(2)}
              onDeleteTrip={handleDeleteTrip}
              onToggleTripCompleted={handleToggleTripCompleted}
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
            onStartPlanning={() => scrollToTab(2)}
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
      case 'saved_trails':
        return (
          <SavedTrailsView
            currentTheme={currentTheme}
            onBack={() => scrollToTab(0)}
            onOpenTrailsTab={() => scrollToTab(1)}
            onStartPlanning={(dest) => {
              setWizardDestId(dest || '');
              setWizardEditingTrip(null);
              scrollToTab(2);
            }}
          />
        );
      case 'upload_trail':
        return (
          <UploadTrailView
            initialFile={uploadTrailFile}
            session={session}
            onBack={() => {
              setUploadTrailFile(null);
              scrollToTab(1);
            }}
            onSuccess={() => {
              setUploadTrailFile(null);
              scrollToTab(1);
              addToast('ai', 'Trail Shared!', 'Your new trail is now live.');
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className={`font-sans antialiased text-slate-900 flex flex-col relative ${
        isBottomNavView ? 'h-[100dvh] h-screen w-full overflow-hidden' : 'min-h-screen'
      }`}
      style={{
        backgroundColor: isBottomNavView
          ? '#09090b'
          : currentView === 'profile'
          ? '#09090b'
          : isNoThemeBgView
          ? '#0a0a0f'
          : currentTheme.canvasBg,
      }}
    >
      {/* Full-Page Dynamic Photographic Scenic Backdrop - ONLY for non-bottom-nav pages */}
      {!isBottomNavView && !isNoThemeBgView && (
        <ThemeHeroBackdrop currentTheme={currentTheme} isDark={currentTheme.isDark} />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Global Ambient Snowfall when Snow Theme is active - ONLY for non-bottom-nav pages */}
      {!isBottomNavView && !isNoThemeBgView && themeId === 'snow' && (
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
          {/* Top Global Navigation for non-bottom-nav pages */}
          {!isBottomNavView && 
           currentView !== 'trip_mode' && 
           currentView !== 'auth' && 
           currentView !== 'upload_trail' && (
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
              onPlanTrip={() => scrollToTab(2)}
            />
          )}

          {/* Body Views */}
          {isBottomNavView ? (
            /* TRUE HORIZONTAL SWIPE / SLIDE VIEW-PAGER FOR ALL 5 BOTTOM NAV PAGES */
            <div
              ref={sliderRef}
              onScroll={handleSliderScroll}
              className="w-full h-full flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory touch-pan-x"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorX: 'contain',
              }}
            >
              {/* SLIDE 0: LANDING PAGE */}
              <div 
                className="w-full min-w-full h-full overflow-y-auto shrink-0 snap-start snap-always relative"
                style={{ backgroundColor: currentTheme.canvasBg }}
              >
                {/* Full Dynamic Photographic Scenic Backdrop - Stays pinned across full vertical scroll, swipes smoothly with slide */}
                <ThemeHeroBackdrop isSticky currentTheme={currentTheme} isDark={currentTheme.isDark} />

                <div className="relative z-10">
                  <Navbar
                    currentView="landing"
                    onNavigate={(view) => {
                      const idx = BOTTOM_NAV_ORDER.indexOf(view as any);
                      if (idx !== -1) {
                        scrollToTab(idx);
                      } else {
                        setCurrentView(view);
                      }
                    }}
                    activeTrip={activeTrip}
                    savedTripsCount={trips.length}
                    currentTheme={currentTheme}
                    onOpenThemeModal={() => setIsThemeModalOpen(true)}
                    session={session}
                    onRequireAuth={() => {
                      setIntendedView('landing');
                      setCurrentView('auth');
                    }}
                    onPlanTrip={() => scrollToTab(2)}
                  />
                  <LandingPage
                    currentTheme={currentTheme}
                    recentTrip={recentPlannedTrip}
                    trips={trips}
                    onOpenTrip={handleOpenTrip}
                    onStartPlanning={handleStartPlanning}
                    onOpenThemeModal={() => setIsThemeModalOpen(true)}
                    onOpenMapSearch={() => setCurrentView('map_search')}
                    onNavigateToWhyTripWise={() => setCurrentView('why_roamai')}
                  />
                  <div className="h-28" />
                </div>
              </div>

              {/* SLIDE 1: TRAILS (REELS VIDEO FEED & UPLOAD) */}
              <div className="w-full min-w-full h-full overflow-hidden shrink-0 snap-start snap-always bg-[#0a0a0f] relative">
                <TrailsView
                  currentTheme={currentTheme}
                  session={session}
                  isActive={currentView === 'trails'}
                  onRequireAuth={() => {
                    setIntendedView('trails');
                    setCurrentView('auth');
                  }}
                  onOpenUploadPage={(file) => {
                    setUploadTrailFile(file || null);
                    setCurrentView('upload_trail');
                  }}
                  onStartPlanning={(dest) => {
                    setWizardDestId(dest || '');
                    setWizardEditingTrip(null);
                    scrollToTab(2);
                  }}
                  onBack={() => scrollToTab(0)}
                />
              </div>

              {/* SLIDE 2: CREATE TRIP WIZARD (+ Button with Theme Background) */}
              <div 
                className="w-full min-w-full h-full overflow-y-auto shrink-0 snap-start snap-always relative"
                style={{ backgroundColor: currentTheme.canvasBg }}
              >
                {/* Full Photographic Scenic Backdrop - Stays pinned across full vertical scroll, swipes smoothly with slide */}
                <ThemeHeroBackdrop isSticky currentTheme={currentTheme} isDark={currentTheme.isDark} />

                <div className="relative z-10">
                  <CreateTripWizard
                    initialDestinationId={wizardDestId}
                    initialStep={wizardInitialStep}
                    initialTrip={wizardEditingTrip}
                    onGenerateTrip={handleGenerateTrip}
                    onCancel={() => {
                      if (wizardEditingTrip) {
                        setCurrentView('itinerary');
                      } else {
                        scrollToTab(0);
                      }
                    }}
                  />
                </div>
                <div className="h-28" />
              </div>

              {/* SLIDE 3: TRAVELLERS SEARCH */}
              <div className="w-full min-w-full h-full overflow-y-auto shrink-0 snap-start snap-always bg-[#0a0a0f] relative">
                <TravellerSearchView
                  currentTheme={currentTheme}
                  session={session}
                  onSelectTraveller={() => {}}
                  onOpenOwnProfile={() => scrollToTab(4)}
                  onOpenTrail={() => scrollToTab(1)}
                  onStartPlanning={(destination) => {
                    setWizardDestId(destination || '');
                    setWizardEditingTrip(null);
                    scrollToTab(2);
                  }}
                  onBack={() => scrollToTab(0)}
                  onRequireAuth={() => {
                    setInitialAuthMode('signin');
                    setCurrentView('auth');
                  }}
                />
                <div className="h-28" />
              </div>

              {/* SLIDE 4: USER TRAVEL PROFILE */}
              <div className="w-full min-w-full h-full overflow-y-auto shrink-0 snap-start snap-always bg-black relative">
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
                    scrollToTab(2);
                  }}
                  onToggleTripCompleted={handleToggleTripCompleted}
                  onBack={() => scrollToTab(0)}
                  onRequireAuth={() => {
                    setIntendedView('profile');
                    setCurrentView('auth');
                  }}
                  onNavigate={(view) => {
                    const idx = BOTTOM_NAV_ORDER.indexOf(view as any);
                    if (idx !== -1) {
                      scrollToTab(idx);
                    } else {
                      setCurrentView(view);
                    }
                  }}
                  onOpenThemeModal={() => setIsThemeModalOpen(true)}
                  onOpenUploadPage={() => setCurrentView('upload_trail')}
                />
                <div className="h-28" />
              </div>
            </div>
          ) : (
            <main className="flex-1">
              {renderNonBottomNavView()}
            </main>
          )}

          {/* Floating Bottom Navigation Bar (Accessible across all separate pages, hidden in trip_mode, auth, and upload_trail) */}
          {currentView !== 'trip_mode' && currentView !== 'auth' && currentView !== 'upload_trail' && (
            <BottomNavBar
              currentView={currentView}
              onNavigate={(v) => {
                if (v === 'trails' && !session) {
                  setIntendedView('trails');
                  setCurrentView('auth');
                  return;
                }
                const idx = BOTTOM_NAV_ORDER.indexOf(v);
                if (idx !== -1) {
                  scrollToTab(idx);
                } else {
                  setCurrentView(v);
                }
              }}
              onStartPlanning={() => scrollToTab(2)}
              onOpenTravellerSearch={() => scrollToTab(3)}
              session={session}
              currentTheme={currentTheme}
              onRequireAuth={() => {
                setIntendedView('trails');
                setCurrentView('auth');
              }}
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
