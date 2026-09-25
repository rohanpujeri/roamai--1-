import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import {
  Search,
  MapPin,
  X,
  Loader2,
  Navigation,
  Sparkles,
  Compass,
  MapPinned
} from 'lucide-react';
import { getGooglePlacesPredictions, getGooglePlaceDetails, AutocompleteSuggestion } from '../services/placesService';
import { ErrorBoundary } from './ErrorBoundary';

export interface SelectedDestinationPlace {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  photoUrl?: string;
}

export interface PopularDestinationQuickPick {
  name: string;
  region: string;
  lat: number;
  lng: number;
}

export const POPULAR_QUICK_PICKS: PopularDestinationQuickPick[] = [
  { name: 'Goa', region: 'India', lat: 15.2993, lng: 74.1240 },
  { name: 'Manali', region: 'Himachal Pradesh, India', lat: 32.2396, lng: 77.1887 },
  { name: 'Ladakh (Leh)', region: 'India', lat: 34.1526, lng: 77.5771 },
  { name: 'Jaipur', region: 'Rajasthan, India', lat: 26.9124, lng: 75.7873 },
  { name: 'Paris', region: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Tokyo', region: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Bali', region: 'Indonesia', lat: -8.4095, lng: 115.1889 },
  { name: 'Dubai', region: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { name: 'Kerala', region: 'India', lat: 9.4981, lng: 76.3388 },
  { name: 'Swiss Alps', region: 'Switzerland', lat: 46.6863, lng: 7.8632 }
];

interface Step1DestinationSearchProps {
  selectedPlace: SelectedDestinationPlace | null;
  onSelectPlace: (place: SelectedDestinationPlace) => void;
  onClearPlace: () => void;
}

// Camera controller component to smoothly pan & zoom map when destination changes
const MapCameraUpdater: React.FC<{
  targetLocation: { lat: number; lng: number } | null;
  zoomLevel?: number;
}> = ({ targetLocation, zoomLevel = 14 }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !targetLocation) return;
    if (typeof targetLocation.lat !== 'number' || typeof targetLocation.lng !== 'number' || isNaN(targetLocation.lat) || isNaN(targetLocation.lng)) return;
    try {
      if (typeof map.panTo === 'function') {
        map.panTo(targetLocation);
      }
      if (typeof map.setZoom === 'function') {
        map.setZoom(zoomLevel);
      }
    } catch (e) {
      console.warn('Map camera update error:', e);
    }
  }, [map, targetLocation, zoomLevel]);

  return null;
};

export const Step1DestinationSearch: React.FC<Step1DestinationSearchProps> = ({
  selectedPlace,
  onSelectPlace,
  onClearPlace
}) => {
  const [searchInput, setSearchInput] = useState<string>(selectedPlace?.name || '');
  const [predictions, setPredictions] = useState<AutocompleteSuggestion[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [showInfoWindow, setShowInfoWindow] = useState<boolean>(true);
  const [isResolvingDetails, setIsResolvingDetails] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Google Maps API Key
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

  // Default initial map center (India or World Overview if no place is selected)
  const defaultCenter = { lat: 20.5937, lng: 78.9629 };
  const currentCenter = selectedPlace && typeof selectedPlace.latitude === 'number' && typeof selectedPlace.longitude === 'number' && !isNaN(selectedPlace.latitude) && !isNaN(selectedPlace.longitude) && (selectedPlace.latitude !== 0 || selectedPlace.longitude !== 0)
    ? { lat: selectedPlace.latitude, lng: selectedPlace.longitude }
    : defaultCenter;

  // Sync search input if selectedPlace changes externally
  useEffect(() => {
    if (selectedPlace) {
      setSearchInput(selectedPlace.name || '');
      setShowInfoWindow(true);

      // If coordinates are missing (0, 0), resolve them dynamically
      if (selectedPlace.latitude === 0 && selectedPlace.longitude === 0 && (selectedPlace.name || selectedPlace.address)) {
        const query = selectedPlace.address || selectedPlace.name;
        getGooglePlacesPredictions(query).then((preds) => {
          if (preds && preds.length > 0) {
            getGooglePlaceDetails(preds[0].placeId).then((details) => {
              if (details && (details.latitude !== 0 || details.longitude !== 0)) {
                onSelectPlace({
                  ...selectedPlace,
                  placeId: details.placeId || selectedPlace.placeId,
                  latitude: details.latitude,
                  longitude: details.longitude,
                  address: details.address || selectedPlace.address,
                  photoUrl: details.photoUrl || selectedPlace.photoUrl
                });
              }
            }).catch(() => {});
          }
        }).catch(() => {});
      }
    }
  }, [selectedPlace?.name, selectedPlace?.address]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle user typing with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchInput(query);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setPredictions([]);
      setIsDropdownOpen(false);
      setIsLoadingPredictions(false);
      return;
    }

    setIsLoadingPredictions(true);
    setIsDropdownOpen(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await getGooglePlacesPredictions(query);
        setPredictions(results || []);
      } catch (err) {
        console.error('Failed to fetch predictions:', err);
        setPredictions([]);
      } finally {
        setIsLoadingPredictions(false);
      }
    }, 250);
  };

  // Handle selecting an autocomplete suggestion
  const handleSelectPrediction = async (suggestion: AutocompleteSuggestion) => {
    setIsDropdownOpen(false);
    setIsResolvingDetails(true);

    try {
      // If prediction already has lat/lng (e.g. from fallback geocoder), use it directly
      if (typeof suggestion.lat === 'number' && typeof suggestion.lng === 'number' && !isNaN(suggestion.lat) && !isNaN(suggestion.lng)) {
        const placeData: SelectedDestinationPlace = {
          placeId: suggestion.placeId || `dest-${Date.now()}`,
          name: suggestion.mainText || suggestion.description || 'Destination',
          address: suggestion.secondaryText || suggestion.description || suggestion.mainText || 'Destination Area',
          latitude: suggestion.lat,
          longitude: suggestion.lng
        };
        onSelectPlace(placeData);
        setSearchInput(placeData.name);
        setShowInfoWindow(true);
        setIsResolvingDetails(false);
        return;
      }

      // Otherwise fetch place details via Google PlacesService / Geocoder
      const details = await getGooglePlaceDetails(suggestion.placeId);
      const placeData: SelectedDestinationPlace = {
        placeId: details.placeId || suggestion.placeId || `dest-${Date.now()}`,
        name: details.name || suggestion.mainText || 'Destination',
        address: details.address || suggestion.secondaryText || suggestion.description || 'Destination Area',
        latitude: typeof details.latitude === 'number' && !isNaN(details.latitude) ? details.latitude : 15.2993,
        longitude: typeof details.longitude === 'number' && !isNaN(details.longitude) ? details.longitude : 74.1240,
        photoUrl: details.photoUrl
      };

      onSelectPlace(placeData);
      setSearchInput(placeData.name);
      setShowInfoWindow(true);
    } catch (err) {
      console.warn('Place details fetch error, using best-effort approximation:', err);
      // Fallback place data
      const placeData: SelectedDestinationPlace = {
        placeId: suggestion.placeId || `dest-${Date.now()}`,
        name: suggestion.mainText || 'Destination',
        address: suggestion.secondaryText || suggestion.description || 'Destination Area',
        latitude: typeof suggestion.lat === 'number' && !isNaN(suggestion.lat) ? suggestion.lat : 15.2993,
        longitude: typeof suggestion.lng === 'number' && !isNaN(suggestion.lng) ? suggestion.lng : 74.1240
      };
      onSelectPlace(placeData);
      setSearchInput(placeData.name);
      setShowInfoWindow(true);
    } finally {
      setIsResolvingDetails(false);
    }
  };

  // Clear current search and selection
  const handleClear = () => {
    setSearchInput('');
    setPredictions([]);
    setIsDropdownOpen(false);
    onClearPlace();
  };

  const hasValidSelectedCoords = Boolean(
    selectedPlace &&
    typeof selectedPlace.latitude === 'number' &&
    typeof selectedPlace.longitude === 'number' &&
    !isNaN(selectedPlace.latitude) &&
    !isNaN(selectedPlace.longitude) &&
    (selectedPlace.latitude !== 0 || selectedPlace.longitude !== 0)
  );

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* 1. Large Search Input Field */}
      <div className="relative z-20">
        <div className="relative flex items-center">
          <div className="absolute left-4 pointer-events-none text-slate-400">
            {isResolvingDetails || isLoadingPredictions ? (
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>

          <input
            id="destination-autocomplete-search-input"
            type="text"
            value={searchInput}
            onChange={handleInputChange}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (predictions.length > 0) {
                  handleSelectPrediction(predictions[0]);
                } else if (searchInput.trim()) {
                  try {
                    const freshPreds = await getGooglePlacesPredictions(searchInput.trim());
                    if (freshPreds && freshPreds.length > 0) {
                      handleSelectPrediction(freshPreds[0]);
                    }
                  } catch (err) {
                    console.warn('Enter key search error:', err);
                  }
                }
              }
            }}
            onFocus={() => {
              if (predictions.length > 0) setIsDropdownOpen(true);
            }}
            placeholder="Search for any city, place, landmark, hotel, or address..."
            className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:focus:ring-emerald-400/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-base font-medium shadow-sm transition-all outline-none"
          />

          {searchInput && (
            <button
              id="clear-destination-search-btn"
              type="button"
              onClick={handleClear}
              className="absolute right-3.5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 2. Autocomplete Suggestions Dropdown */}
        {isDropdownOpen && predictions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-30 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-150">
            {predictions.map((item) => (
              <button
                key={item.placeId}
                type="button"
                onClick={() => handleSelectPrediction(item)}
                className="w-full px-4 py-3.5 text-left flex items-start gap-3 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition-colors group cursor-pointer"
              >
                <div className="mt-0.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 truncate">
                    {item.mainText}
                  </p>
                  {item.secondaryText && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.secondaryText}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {isDropdownOpen && !isLoadingPredictions && searchInput.trim().length > 1 && predictions.length === 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 text-center z-30">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No matching places found. Try typing a specific city or landmark name.
            </p>
          </div>
        )}

        {/* Popular Destination Quick-Pick Chips */}
        {!selectedPlace && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              Popular:
            </span>
            {POPULAR_QUICK_PICKS.map((dest) => (
              <button
                key={dest.name}
                type="button"
                onClick={() => {
                  const placeData: SelectedDestinationPlace = {
                    placeId: `dest-${dest.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    name: dest.name,
                    address: `${dest.name}, ${dest.region}`,
                    latitude: dest.lat,
                    longitude: dest.lng
                  };
                  onSelectPlace(placeData);
                  setSearchInput(dest.name);
                  setShowInfoWindow(true);
                }}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                title={`${dest.name}, ${dest.region}`}
              >
                {dest.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Small Selected Location Card */}
      {selectedPlace && (
        <div
          id="selected-destination-card"
          className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/30 backdrop-blur-md flex items-start justify-between gap-4 shadow-sm animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm shrink-0 mt-0.5">
              <MapPinned className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {selectedPlace.name || 'Selected Destination'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-1">
                {selectedPlace.address || selectedPlace.name}
              </p>
            </div>
          </div>

          <button
            id="change-selected-destination-btn"
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold shrink-0 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            title="Search another location"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear / Change</span>
          </button>
        </div>
      )}

      {/* 4. Interactive Google Map Container */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-slate-200/80 dark:border-slate-700/80 shadow-lg h-[380px] sm:h-[420px] bg-slate-100 dark:bg-slate-950">
        <ErrorBoundary
          name="Step1DestinationMap"
          fallback={
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 text-center space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <MapPin className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedPlace ? selectedPlace.name : 'Destination Map Preview'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                {selectedPlace?.address || 'Map preview is active. Select your destination above to proceed.'}
              </p>
            </div>
          }
        >
          <APIProvider apiKey={apiKey} libraries={['places', 'marker', 'geometry']}>
            <Map
              defaultCenter={currentCenter}
              defaultZoom={hasValidSelectedCoords ? 14 : 5}
              mapId="STEP1_DESTINATION_MAP"
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={false}
              className="w-full h-full"
            >
              {/* Camera updater that smoothly pans and zooms when location is selected */}
              <MapCameraUpdater
                targetLocation={
                  hasValidSelectedCoords ? { lat: selectedPlace!.latitude, lng: selectedPlace!.longitude } : null
                }
                zoomLevel={14}
              />

              {/* Pin and marker for selected location */}
              {hasValidSelectedCoords && (
                <AdvancedMarker
                  position={{ lat: selectedPlace!.latitude, lng: selectedPlace!.longitude }}
                  title={selectedPlace!.name}
                  onClick={() => setShowInfoWindow(!showInfoWindow)}
                >
                  <div className="relative flex items-center justify-center cursor-pointer group">
                    <div className="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping" />
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 ring-2 ring-emerald-500/40">
                      <MapPin className="w-5 h-5" />
                    </div>
                  </div>
                </AdvancedMarker>
              )}

              {/* InfoWindow for selected location */}
              {hasValidSelectedCoords && showInfoWindow && (
                <InfoWindow
                  position={{ lat: selectedPlace!.latitude, lng: selectedPlace!.longitude }}
                  onCloseClick={() => setShowInfoWindow(false)}
                  pixelOffset={[0, -36]}
                >
                  <div className="p-2 max-w-xs text-left">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Destination Selected</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">{selectedPlace!.name}</h4>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">{selectedPlace!.address}</p>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        </ErrorBoundary>

        {/* Informational overlay when no place is chosen yet */}
        {!selectedPlace && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 pointer-events-none">
            <Compass className="w-4 h-4 text-emerald-600 animate-spin" style={{ animationDuration: '8s' }} />
            <span>Search any destination above to preview on the interactive map</span>
          </div>
        )}
      </div>
    </div>
  );
};
