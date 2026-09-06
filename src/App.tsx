import React, { useState, useEffect } from 'react';
import { Trip, Activity, PackingItem, UserPreferences, TravelCompanion, TravelMode, BudgetTier, ThemeId, ExpenseItem, SavedPlace } from './types';

import { generateTripFromInputs, adaptTripPlanWithAI } from './services/aiPlanner';
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
import { WhyRoamAIPage } from './components/WhyRoamAIPage';
import { AuthPage } from './components/AuthPage';

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
      localStorage.setItem('roamai_theme_id', newThemeId);
    }
    const themeObj = getTheme(newThemeId);
    addToast('ai', `${themeObj.name} Applied`, `${themeObj.name} is now active.`);
  };

  // User trips state (loaded from Supabase / localStorage)
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string>('');
  const [currentView, setCurrentView] = useState<'landing' | 'wizard' | 'itinerary' | 'trip_mode' | 'my_trips' | 'map_search' | 'why_roamai' | 'auth'>('landing');
  const [wizardDestId, setWizardDestId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatingDestName, setGeneratingDestName] = useState<string>('');
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
              setTrips(loadedTrips);
              // Only set active trip if we don't already have one, or if current is invalid
              setActiveTripId((prev) => prev && loadedTrips.some(t => t.id === prev) ? prev : loadedTrips[0].id);
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
          setTrips(loadedTrips);
          if (user) {
            setActiveTripId(loadedTrips[0].id);
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
  const activeTrip = activeTripId ? trips.find((t) => t.id === activeTripId) : (session ? trips[0] : null);
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
    if (!session) {
      setInitialAuthMode('signin');
      setIntendedView('wizard');
      setCurrentView('auth');
    } else {
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
      setIsGenerating(false);
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
      setIsGenerating(false);
      const msg = error?.message || 'There was an issue planning your trip. Please check your Gemini API key.';
      addToast('warning', 'Generation Failed', msg);
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

  // Add custom activity
  const handleAddCustomActivity = (dayNumber: number) => {
    if (!activeTrip) return;
    const newAct: Activity = {
      id: `custom-act-${crypto.randomUUID()}`,
      time: '04:30 PM',
      title: 'Spontaneous Scenic Stop & Local Tasting',
      category: 'Sightseeing',
      location: `${activeTrip.destination} Area`,
      estimatedCost: 300,
      travelTimeFromPrev: '10 min walk',
      duration: '1 hr',
      description: 'Relaxed scenic spot discovering local viewpoints and refreshments.',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
      recommendationReason: 'Added by traveller during trip customization.',
      isIndoor: false,
      isRainSafe: false
    };

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

    addToast('success', 'Stop Added', 'New spot added to today’s schedule.');
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

  return (
    <div 
      className="min-h-screen font-sans antialiased text-slate-900 flex flex-col transition-colors duration-300 relative"
      style={{ backgroundColor: currentTheme.canvasBg }}
    >
      {/* Full-Page Dynamic Photographic Scenic Backdrop across Discover, My Trips, Itinerary, etc. */}
      <ThemeHeroBackdrop currentTheme={currentTheme} isDark={false} />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Global Ambient Snowfall when Snow Theme is active */}
      {themeId === 'snow' && (
        <SnowfallEffect fullScreen={true} density="gentle" />
      )}

      {/* Full AI Generation Loading Screen */}
      {isGenerating && (
        <AIGenerationLoader
          destinationName={generatingDestName}
        />
      )}

      {/* Main App Layout */}
      {!isGenerating && (
        <>
          {/* Top Global Navigation */}
          {currentView !== 'trip_mode' && currentView !== 'auth' && (
            <Navbar
              currentView={currentView}
              onNavigate={(view) => setCurrentView(view)}
              activeTrip={activeTrip}
              savedTripsCount={trips.length}
              currentTheme={currentTheme}
              onOpenThemeModal={() => setIsThemeModalOpen(true)}
              session={session}
              onRequireAuth={() => {
                setInitialAuthMode('signin');
                setIntendedView('landing');
                setCurrentView('auth');
              }}
              onPlanTrip={() => handleStartPlanning()}
            />
          )}

          {/* Body Views */}
          <main className="flex-1">
            {/* VIEW 1: LANDING PAGE */}
            {currentView === 'landing' && (
              <LandingPage
                currentTheme={currentTheme}
                recentTrip={recentPlannedTrip}
                onOpenTrip={handleOpenTrip}
                onStartPlanning={handleStartPlanning}
                onOpenThemeModal={() => setIsThemeModalOpen(true)}
                onOpenMapSearch={() => setCurrentView('map_search')}
                onNavigateToWhyRoamAI={() => setCurrentView('why_roamai')}
              />
            )}

            {/* VIEW 2: CREATE TRIP WIZARD */}
            {currentView === 'wizard' && (
              <CreateTripWizard
                initialDestinationId={wizardDestId}
                onGenerateTrip={handleGenerateTrip}
                onCancel={() => setCurrentView('landing')}
              />
            )}

            {/* VIEW 3: PERSONALIZED ITINERARY DASHBOARD */}
            {currentView === 'itinerary' && activeTrip && (
              <div className="px-4 sm:px-6 lg:px-8 pt-6">
                <ItineraryView
                  trip={activeTrip}
                  activeDayNumber={activeDayNumber}
                  onSelectDay={(dayNum) => setActiveDayNumber(dayNum)}
                  onEnterTripMode={() => setCurrentView('trip_mode')}
                  onOpenActivityDetails={(act) => setSelectedActivityForModal(act)}
                  onReplaceActivity={handleReplaceActivity}
                  onMoveActivityUp={handleMoveActivityUp}
                  onMoveActivityDown={handleMoveActivityDown}
                  onRemoveActivity={handleRemoveActivity}
                  onAddCustomActivity={handleAddCustomActivity}
                  onTogglePackingItem={handleTogglePackingItem}
                  onAddPackingItem={handleAddPackingItem}
                  onOpenMapSearch={() => setCurrentView('map_search')}
                />
              </div>
            )}

            {/* VIEW 4: TRIP MODE (LIVE ADAPTIVE COMPANION) */}
            {currentView === 'trip_mode' && activeTrip && (
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
                onExitTripMode={() => setCurrentView('itinerary')}
              />
            )}

            {/* VIEW 5: MY TRIPS */}
            {currentView === 'my_trips' && (
              <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-16">
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
                  onPlanNewTrip={() => handleStartPlanning()}
                  onDeleteTrip={handleDeleteTrip}
                />
              </div>
            )}

            {/* VIEW 6: GOOGLE PLACES & MAP SEARCH */}
            {currentView === 'map_search' && (
              <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-16">
                <MapPlaceSearchView
                  activeTrip={activeTrip}
                  onAddPlaceToTrip={handleAddPlaceToTrip}
                />
              </div>
            )}

            {/* VIEW 7: WHY ROAMAI & COMPLETE TRAVEL LIFECYCLE */}
            {currentView === 'why_roamai' && (
              <WhyRoamAIPage
                currentTheme={currentTheme}
                onStartPlanning={() => handleStartPlanning()}
                onOpenMapSearch={() => setCurrentView('map_search')}
              />
            )}

            {/* VIEW 8: AUTHENTICATION */}
            {currentView === 'auth' && (
              <AuthPage
                currentTheme={currentTheme}
                initialAuthMode={initialAuthMode}
                onAuthSuccess={() => {
                  setCurrentView(intendedView || 'landing');
                  setIntendedView(null);
                  setInitialAuthMode('signin'); // reset for future
                }}
                onCancel={() => {
                  setCurrentView('landing');
                  setIntendedView(null);
                  setInitialAuthMode('signin'); // reset for future
                }}
              />
            )}
          </main>

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
