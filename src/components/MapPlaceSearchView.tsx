import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import {
  Search,
  MapPin,
  Navigation,
  Copy,
  Check,
  Compass,
  AlertTriangle,
  Loader2,
  Bookmark,
  Trash2,
  ExternalLink,
  Layers,
  Utensils,
  Plane,
  ShoppingBag,
  Coffee,
  Building,
  HelpCircle,
  Locate,
  LocateFixed,
  Plus
} from 'lucide-react';
import { PlaceSearchResult, SavedPlace, Trip } from '../types';
import {
  getGooglePlacesPredictions,
  getGooglePlaceDetails,
  searchPlacesByQuery,
  getSavedPlaces,
  savePlaceToStorage,
  removeSavedPlace,
  AutocompleteSuggestion,
  calculateDistanceKm
} from '../services/placesService';
import { GoogleCloudSetupModal } from './GoogleCloudSetupModal';

interface MapPlaceSearchViewProps {
  onAddPlaceToTrip?: (place: SavedPlace) => void;
  activeTrip?: Trip | null;
}

// Interactive Camera Panner & Zoomer
const MapCameraUpdater: React.FC<{
  targetLocation: { lat: number; lng: number } | null;
  zoomLevel?: number;
}> = ({ targetLocation, zoomLevel = 15 }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !targetLocation) return;
    map.panTo(targetLocation);
    map.setZoom(zoomLevel);
  }, [map, targetLocation, zoomLevel]);

  return null;
};

// Preset Quick Filter categories
const QUICK_SEARCH_CATEGORIES = [
  { label: 'Restaurants near me', icon: Utensils, query: 'restaurants near me' },
  { label: 'Airports', icon: Plane, query: 'international airport' },
  { label: 'Shopping Malls', icon: ShoppingBag, query: 'shopping mall' },
  { label: 'Coffee & Cafes', icon: Coffee, query: 'cafe coffee shop' },
  { label: 'Popular Landmarks', icon: Building, query: 'tourist attractions landmarks' }
];

const MapPlaceSearchViewInner: React.FC<MapPlaceSearchViewProps> = ({
  onAddPlaceToTrip,
  activeTrip
}) => {
  const mapInstance = useMap();
  const placesLib = useMapsLibrary('places');

  // Search input and autocomplete state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [queryResults, setQueryResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Selected Place state (Replaces previous marker)
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 20.5937,
    lng: 78.9629
  });
  const [mapZoom, setMapZoom] = useState<number>(5);
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');

  // User Geolocation State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'prompt' | 'granted' | 'denied' | 'unsupported'
  >('idle');
  const [locationErrorMessage, setLocationErrorMessage] = useState<string>('');

  // Persistent Saved Places
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>(() => getSavedPlaces());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'details' | 'saved' | 'nearby'>('details');

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Request browser geolocation for nearby prioritization
  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      setLocationErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('prompt');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(coords);
        setLocationStatus('granted');
        setLocationErrorMessage('');

        // If no place is actively searched, bias view to user's location
        if (!hasSearched) {
          setMapCenter(coords);
          setMapZoom(14);
          setSelectedPlace({
            placeId: 'current-user-location',
            name: 'Your Current Location',
            address: `Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.lng.toFixed(5)}`,
            latitude: Number(coords.lat.toFixed(6)),
            longitude: Number(coords.lng.toFixed(6)),
            types: ['user_location']
          });
        }
      },
      (error) => {
        setLocationStatus('denied');
        if (error.code === error.PERMISSION_DENIED) {
          setLocationErrorMessage(
            'Location access was denied. Search is still fully functional worldwide; results will not be auto-biased to your immediate radius.'
          );
        } else {
          setLocationErrorMessage('Unable to determine location. You can search anywhere globally.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [hasSearched]);

  // Request location on initial component mount
  useEffect(() => {
    requestUserLocation();
  }, [requestUserLocation]);

  // Handle Autocomplete predictions with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const predictions = await getGooglePlacesPredictions(searchQuery, userLocation);
        setSuggestions(predictions);
        setIsDropdownOpen(true);
      } catch (err) {
        console.warn('Places prediction warning:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery, userLocation, placesLib]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selecting a prediction from Places Autocomplete
  const handleSelectPrediction = async (prediction: AutocompleteSuggestion) => {
    setIsDropdownOpen(false);
    setSearchQuery(prediction.mainText);
    setIsDetailLoading(true);
    setHasSearched(true);

    try {
      // If prediction already has lat/lng from fallback
      if (prediction.lat && prediction.lng) {
        const placeObj: PlaceSearchResult = {
          placeId: prediction.placeId,
          name: prediction.mainText,
          address: prediction.secondaryText || prediction.description,
          latitude: prediction.lat,
          longitude: prediction.lng,
          types: prediction.types,
          rating: 4.6
        };
        if (userLocation) {
          placeObj.distanceKm = calculateDistanceKm(userLocation.lat, userLocation.lng, placeObj.latitude, placeObj.longitude);
        }
        setSelectedPlace(placeObj);
        setMapCenter({ lat: placeObj.latitude, lng: placeObj.longitude });
        setMapZoom(16);
        savePlaceToStorage({
          placeId: placeObj.placeId,
          name: placeObj.name,
          address: placeObj.address,
          latitude: placeObj.latitude,
          longitude: placeObj.longitude,
          category: placeObj.types?.[0] || 'General',
          rating: placeObj.rating,
          source: 'places_autocomplete'
        });
        setSavedPlaces(getSavedPlaces());
        return;
      }

      const placeDetails = await getGooglePlaceDetails(prediction.placeId, mapInstance);
      
      // Calculate distance from user location if available
      if (userLocation) {
        placeDetails.distanceKm = calculateDistanceKm(
          userLocation.lat,
          userLocation.lng,
          placeDetails.latitude,
          placeDetails.longitude
        );
      }

      // Replace current marker and pan/zoom map
      setSelectedPlace(placeDetails);
      setMapCenter({ lat: placeDetails.latitude, lng: placeDetails.longitude });
      setMapZoom(16);

      // Auto-save place details to persistent store
      savePlaceToStorage({
        placeId: placeDetails.placeId,
        name: placeDetails.name,
        address: placeDetails.address,
        latitude: placeDetails.latitude,
        longitude: placeDetails.longitude,
        category: placeDetails.types?.[0] || 'General',
        rating: placeDetails.rating,
        photoUrl: placeDetails.photoUrl,
        source: 'places_autocomplete'
      });
      setSavedPlaces(getSavedPlaces());
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Perform a full category or text search query (e.g. "restaurants near me", "airport", "mall")
  const executeTextSearch = async (queryText: string) => {
    setSearchQuery(queryText);
    setIsDropdownOpen(false);
    setIsSearching(true);
    setHasSearched(true);
    setActiveTab('nearby');

    try {
      const results = await searchPlacesByQuery(queryText, userLocation, mapInstance);
      setQueryResults(results);

      if (results.length > 0) {
        const top = results[0];
        setSelectedPlace(top);
        setMapCenter({ lat: top.latitude, lng: top.longitude });
        setMapZoom(15);

        savePlaceToStorage({
          placeId: top.placeId,
          name: top.name,
          address: top.address,
          latitude: top.latitude,
          longitude: top.longitude,
          category: top.types?.[0] || 'Search Result',
          rating: top.rating,
          photoUrl: top.photoUrl,
          source: 'places_autocomplete'
        });
        setSavedPlaces(getSavedPlaces());
      }
    } catch (err) {
      console.error('Search query error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle pressing Enter in the search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      if (suggestions.length > 0) {
        handleSelectPrediction(suggestions[0]);
      } else {
        executeTextSearch(searchQuery);
      }
    }
  };

  // Handle selecting a saved place from the list
  const handleSelectSavedPlace = (place: SavedPlace) => {
    setSelectedPlace({
      placeId: place.placeId,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      rating: place.rating,
      photoUrl: place.photoUrl
    });
    setMapCenter({ lat: place.latitude, lng: place.longitude });
    setMapZoom(16);
    setActiveTab('details');
  };

  const handleDeleteSavedPlace = (e: React.MouseEvent, placeId: string) => {
    e.stopPropagation();
    const updated = removeSavedPlace(placeId);
    setSavedPlaces(updated);
  };

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isCurrentPlaceSaved = selectedPlace
    ? savedPlaces.some((p) => p.placeId === selectedPlace.placeId)
    : false;

  const toggleSaveCurrentPlace = () => {
    if (!selectedPlace) return;
    if (isCurrentPlaceSaved) {
      const updated = removeSavedPlace(selectedPlace.placeId);
      setSavedPlaces(updated);
    } else {
      savePlaceToStorage({
        placeId: selectedPlace.placeId,
        name: selectedPlace.name,
        address: selectedPlace.address,
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        category: selectedPlace.types?.[0] || 'Saved',
        rating: selectedPlace.rating,
        photoUrl: selectedPlace.photoUrl,
        source: 'manual'
      });
      setSavedPlaces(getSavedPlaces());
    }
  };

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header Banner & API Setup Trigger */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-7 shadow-xl border border-white/80 dark:border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Google Places Live Search</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Places API
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                Real-time autocomplete, location-biased geocoding &amp; persistent place cards
              </p>
            </div>
          </div>
        </div>

        {/* Location & Cloud Setup Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={requestUserLocation}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border ${
              locationStatus === 'granted'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
            title="Use current location for search biasing"
          >
            {locationStatus === 'granted' ? (
              <>
                <LocateFixed className="w-3.5 h-3.5 text-emerald-500" />
                <span>Location Active</span>
              </>
            ) : (
              <>
                <Locate className="w-3.5 h-3.5 text-slate-500" />
                <span>Enable Geolocation</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsSetupModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border border-slate-700"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Setup Instructions</span>
          </button>
        </div>
      </div>

      {/* Location Permission Denied / Warning Banner */}
      {locationStatus === 'denied' && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 shadow-sm animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Location Permission Not Granted</p>
            <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
              {locationErrorMessage} You can freely search any city, landmark, or address using the search bar below.
            </p>
          </div>
        </div>
      )}

      {/* Main Search Bar with Autocomplete Suggestions */}
      <div className="relative z-30" ref={searchContainerRef}>
        <div className="relative flex items-center shadow-xl rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/80 dark:border-emerald-500/60 focus-within:ring-4 focus-within:ring-emerald-500/20 transition-all">
          <div className="pl-4 pr-2 text-emerald-600 dark:text-emerald-400">
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setIsDropdownOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search any place, address, landmark, or business..."
            className="w-full py-4 pr-12 text-sm sm:text-base font-medium text-slate-900 dark:text-white bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSuggestions([]);
                setIsDropdownOpen(false);
              }}
              className="p-1.5 mr-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          )}

          <button
            onClick={() => {
              if (searchQuery.trim()) {
                executeTextSearch(searchQuery);
              }
            }}
            className="hidden sm:flex mr-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold items-center gap-1.5 transition-colors cursor-pointer shadow-md"
          >
            <span>Search</span>
            <Navigation className="w-3 h-3" />
          </button>
        </div>

        {/* Autocomplete Predictions Dropdown */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 max-h-80 overflow-y-auto">
            {suggestions.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Google Places Suggestions</span>
                  {userLocation && <span className="text-emerald-600 font-semibold">Location Biased</span>}
                </div>
                {suggestions.map((item) => (
                  <div
                    key={item.placeId}
                    onClick={() => handleSelectPrediction(item)}
                    className="p-3.5 hover:bg-emerald-50/70 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.mainText}
                      </p>
                      {item.secondaryText && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {item.secondaryText}
                        </p>
                      )}
                    </div>
                    <Navigation className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            ) : !isSearching && searchQuery.trim().length > 2 ? (
              /* No results state */
              <div className="p-6 text-center text-slate-500 dark:text-slate-400 space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No direct autocomplete match for &quot;{searchQuery}&quot;
                </p>
                <p className="text-xs">
                  Press enter to run a broader global text search or try searching by category.
                </p>
                <button
                  onClick={() => executeTextSearch(searchQuery)}
                  className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Global Places</span>
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Quick Search Preset Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0 mr-1">
          Quick Search:
        </span>
        {QUICK_SEARCH_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.label}
              onClick={() => executeTextSearch(cat.query)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-semibold transition-all flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
            >
              <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Map and Place Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Google Map Panel */}
        <div className="lg:col-span-8 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 relative min-h-[520px] flex flex-col justify-between">
          
          {/* Map Top Overlay Controls */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none gap-2">
            <div className="bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-700/80 text-xs font-medium text-slate-200 flex items-center gap-2 pointer-events-auto shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-emerald-300">
                {selectedPlace ? selectedPlace.name : 'Interactive Map'}
              </span>
              {selectedPlace?.distanceKm && (
                <span className="text-slate-400">• {selectedPlace.distanceKm} km away</span>
              )}
            </div>

            {/* Satellite / Roadmap toggle & Recenter */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                onClick={() => setMapTypeId((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-950/80 hover:bg-slate-900 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 shadow-lg cursor-pointer backdrop-blur-md"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{mapTypeId === 'roadmap' ? 'Satellite' : 'Roadmap'}</span>
              </button>

              {userLocation && (
                <button
                  onClick={() => {
                    setMapCenter(userLocation);
                    setMapZoom(16);
                  }}
                  className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-emerald-400 border border-slate-700 transition-all shadow-lg cursor-pointer backdrop-blur-md"
                  title="Recenter to my location"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Loading Overlay */}
          {isDetailLoading && (
            <div className="absolute inset-0 z-20 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Loading Place Geodata &amp; Coordinates...
                </span>
              </div>
            </div>
          )}

          {/* Interactive Google Map with Provider */}
          <div className="w-full h-full min-h-[520px] relative">
            <Map
              id="search-google-map"
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              defaultCenter={mapCenter}
              defaultZoom={mapZoom}
              mapTypeId={mapTypeId}
              gestureHandling={'greedy'}
              fullscreenControl={false}
              streetViewControl={true}
              mapTypeControl={false}
              zoomControl={true}
              style={{ width: '100%', height: '100%', minHeight: '520px' }}
            >
              {/* Pan and Zoom Camera Controller */}
              <MapCameraUpdater targetLocation={mapCenter} zoomLevel={mapZoom} />

              {/* Selected Place Marker (Replaces previous marker on new search) */}
              {selectedPlace && (
                <AdvancedMarker
                  position={{ lat: selectedPlace.latitude, lng: selectedPlace.longitude }}
                  title={selectedPlace.name}
                  zIndex={100}
                >
                  <div className="relative cursor-pointer scale-125 hover:scale-135 transition-transform duration-200">
                    <Pin
                      background="#059669"
                      borderColor="#ffffff"
                      glyphColor="#ffffff"
                      scale={1.2}
                    />
                    <span className="absolute -inset-1 rounded-full bg-emerald-400/30 animate-ping pointer-events-none" />
                  </div>
                </AdvancedMarker>
              )}

              {/* Optional Query Results markers if user browsed category */}
              {queryResults.slice(1, 6).map((item, idx) => (
                <AdvancedMarker
                  key={item.placeId || idx}
                  position={{ lat: item.latitude, lng: item.longitude }}
                  title={item.name}
                  onClick={() => {
                    setSelectedPlace(item);
                    setMapCenter({ lat: item.latitude, lng: item.longitude });
                    setMapZoom(16);
                  }}
                >
                  <Pin
                    background="#f59e0b"
                    borderColor="#ffffff"
                    glyphColor="#ffffff"
                    scale={0.9}
                  />
                </AdvancedMarker>
              ))}

              {/* Marker InfoWindow */}
              {selectedPlace && (
                <InfoWindow
                  position={{ lat: selectedPlace.latitude, lng: selectedPlace.longitude }}
                  pixelOffset={[0, -42]}
                >
                  <div className="p-1 max-w-[240px] text-slate-900 text-left">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                        Selected Place
                      </span>
                      {selectedPlace.rating && (
                        <span className="text-[11px] font-bold text-amber-600">
                          ★ {selectedPlace.rating}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {selectedPlace.name}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                      {selectedPlace.address}
                    </p>
                    <p className="text-[10px] font-mono text-emerald-700 mt-1">
                      {selectedPlace.latitude.toFixed(5)}, {selectedPlace.longitude.toFixed(5)}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </div>

          {/* Map Footer Bar */}
          <div className="p-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-mono text-[11px] text-slate-300">
                {selectedPlace
                  ? `Lat: ${selectedPlace.latitude.toFixed(5)} | Lng: ${selectedPlace.longitude.toFixed(5)}`
                  : 'Select any place to view coordinates'}
              </span>
            </div>
            <span className="text-emerald-400 font-semibold text-[11px]">
              Click any place to view details &amp; save
            </span>
          </div>

        </div>

        {/* Right Sidebar: Place Details Card & Saved Places Tabs */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Navigation Tab Header */}
          <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'details'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Place Details
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>Saved Places</span>
              <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] flex items-center justify-center font-bold">
                {savedPlaces.length}
              </span>
            </button>
            {queryResults.length > 0 && (
              <button
                onClick={() => setActiveTab('nearby')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'nearby'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Results ({queryResults.length})
              </button>
            )}
          </div>

          {/* TAB 1: Selected Place Card */}
          {activeTab === 'details' && selectedPlace && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-5 shadow-xl border border-white/80 dark:border-white/15 space-y-4 animate-fadeIn">
              
              {/* Photo or Category Header */}
              {selectedPlace.photoUrl ? (
                <div className="h-36 rounded-2xl overflow-hidden relative group">
                  <img
                    src={selectedPlace.photoUrl}
                    alt={selectedPlace.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3 text-white">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-[10px] font-bold uppercase tracking-wider mb-1 inline-block">
                      {selectedPlace.types?.[0]?.replace(/_/g, ' ') || 'Point of Interest'}
                    </span>
                    <h3 className="text-base font-bold truncate">{selectedPlace.name}</h3>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                        {selectedPlace.types?.[0]?.replace(/_/g, ' ') || 'Place Result'}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedPlace.name}
                      </h3>
                    </div>
                  </div>
                  {selectedPlace.rating && (
                    <span className="px-2 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold">
                      ★ {selectedPlace.rating}
                    </span>
                  )}
                </div>
              )}

              {/* Full Address */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Full Address
                </label>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-200 flex items-start justify-between gap-2">
                  <span className="leading-relaxed">{selectedPlace.address}</span>
                  <button
                    onClick={() => handleCopy(selectedPlace.address, 'address')}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
                    title="Copy full address"
                  >
                    {copiedField === 'address' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Latitude & Longitude */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Latitude</span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedPlace.latitude}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(String(selectedPlace.latitude), 'lat')}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 cursor-pointer"
                    title="Copy Latitude"
                  >
                    {copiedField === 'lat' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Longitude</span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedPlace.longitude}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(String(selectedPlace.longitude), 'lng')}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 cursor-pointer"
                    title="Copy Longitude"
                  >
                    {copiedField === 'lng' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Place ID Badge */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div className="truncate mr-2">
                  <span className="text-[10px] text-slate-400 font-bold block">Google Place ID</span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 truncate block">
                    {selectedPlace.placeId}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(selectedPlace.placeId, 'placeId')}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 cursor-pointer shrink-0"
                  title="Copy Place ID"
                >
                  {copiedField === 'placeId' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={toggleSaveCurrentPlace}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                      isCurrentPlaceSaved
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{isCurrentPlaceSaved ? 'Saved in List' : 'Save Place'}</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.latitude},${selectedPlace.longitude}&destination_place_id=${encodeURIComponent(
                      selectedPlace.name
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Directions</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>

                {onAddPlaceToTrip && activeTrip && (
                  <button
                    onClick={() => {
                      onAddPlaceToTrip({
                        placeId: selectedPlace.placeId,
                        name: selectedPlace.name,
                        address: selectedPlace.address,
                        latitude: selectedPlace.latitude,
                        longitude: selectedPlace.longitude,
                        savedAt: new Date().toISOString()
                      });
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add to &quot;{activeTrip.title}&quot; Itinerary</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Saved Places History */}
          {activeTab === 'saved' && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-5 shadow-xl border border-white/80 dark:border-white/15 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Saved Places Database ({savedPlaces.length})
                </h3>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Persistent Storage
                </span>
              </div>

              {savedPlaces.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <Bookmark className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold">No saved places yet</p>
                  <p className="text-[11px] text-slate-400">
                    Search any address or landmark and click &quot;Save Place&quot; to keep it handy.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {savedPlaces.map((p) => {
                    const isSelected = selectedPlace?.placeId === p.placeId;
                    return (
                      <div
                        key={p.placeId}
                        onClick={() => handleSelectSavedPlace(p)}
                        className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 shadow-sm'
                            : 'border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {p.name}
                            </h4>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {p.address}
                          </p>
                          <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                            {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDeleteSavedPlace(e, p.placeId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Remove saved place"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Nearby Query Results */}
          {activeTab === 'nearby' && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-5 shadow-xl border border-white/80 dark:border-white/15 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Search Results ({queryResults.length})
                </h3>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {queryResults.map((item) => {
                  const isSelected = selectedPlace?.placeId === item.placeId;
                  return (
                    <div
                      key={item.placeId}
                      onClick={() => {
                        setSelectedPlace(item);
                        setMapCenter({ lat: item.latitude, lng: item.longitude });
                        setMapZoom(16);
                        setActiveTab('details');
                      }}
                      className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 shadow-sm'
                          : 'border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.name}
                          </h4>
                          {item.rating && (
                            <span className="text-[10px] font-bold text-amber-600">
                              ★ {item.rating}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.address}
                        </p>
                        {item.distanceKm && (
                          <span className="text-[10px] font-semibold text-emerald-600 mt-1 inline-block">
                            {item.distanceKm} km away
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Google Cloud Setup Instructions Modal */}
      <GoogleCloudSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
      />
    </div>
  );
};

export const MapPlaceSearchView: React.FC<MapPlaceSearchViewProps> = (props) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'marker', 'geometry']}>
      <MapPlaceSearchViewInner {...props} />
    </APIProvider>
  );
};
