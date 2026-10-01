import React, { useState, useEffect, useRef } from 'react';
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
  Compass,
  MapPinned,
  Check
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

// Retained for programmatic fallback matching
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

// Robust reverse geocoding with Google Geocoder & Nominatim fallback
async function reverseGeocode(lat: number, lng: number): Promise<{ name: string; address: string }> {
  // 1. Google Maps Geocoder if available in window
  if (typeof (window as any).google !== 'undefined' && (window as any).google.maps?.Geocoder) {
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      const res = await new Promise<{ name: string; address: string } | null>((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any[], status: any) => {
          if (status === 'OK' && results && results.length > 0) {
            const best = results[0];
            let placeName = '';
            for (const comp of best.address_components || []) {
              if (
                comp.types.includes('point_of_interest') ||
                comp.types.includes('establishment') ||
                comp.types.includes('natural_feature') ||
                comp.types.includes('sublocality') ||
                comp.types.includes('locality')
              ) {
                placeName = comp.long_name;
                break;
              }
            }
            if (!placeName) {
              placeName = best.formatted_address.split(',')[0].trim();
            }
            resolve({
              name: placeName || 'Pinned Destination',
              address: best.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
            });
          } else {
            resolve(null);
          }
        });
      });
      if (res) return res;
    } catch (e) {
      console.warn('Google reverse geocoding failed, trying Nominatim fallback:', e);
    }
  }

  // 2. OpenStreetMap Nominatim reverse geocoder fallback
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (resp.ok) {
      const data = await resp.json();
      const addr = data.address || {};
      const name =
        addr.tourism ||
        addr.amenity ||
        addr.leisure ||
        addr.building ||
        addr.suburb ||
        addr.city ||
        addr.town ||
        addr.village ||
        data.display_name?.split(',')[0] ||
        'Pinned Destination';
      return {
        name,
        address: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      };
    }
  } catch (err) {
    console.warn('Nominatim reverse geocode error:', err);
  }

  return {
    name: 'Pinned Destination',
    address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  };
}

// Camera controller component to smoothly pan & zoom map when destination changes
const MapCameraUpdater: React.FC<{
  targetLocation: { lat: number; lng: number } | null;
  zoomLevel?: number;
}> = ({ targetLocation, zoomLevel = 13 }) => {
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
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);

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
      console.warn('Place details fetch error, using fallback:', err);
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

  // Pin on map by coordinates (click or drag)
  const handlePinCoordinates = async (lat: number, lng: number) => {
    setIsResolvingDetails(true);
    setIsDropdownOpen(false);

    try {
      const geo = await reverseGeocode(lat, lng);
      const placeData: SelectedDestinationPlace = {
        placeId: `pin_${lat.toFixed(5)}_${lng.toFixed(5)}`,
        name: geo.name,
        address: geo.address,
        latitude: lat,
        longitude: lng
      };
      onSelectPlace(placeData);
      setSearchInput(geo.name);
      setShowInfoWindow(true);
    } catch (err) {
      console.warn('Pin geocoding error:', err);
      const fallbackData: SelectedDestinationPlace = {
        placeId: `pin_${lat.toFixed(5)}_${lng.toFixed(5)}`,
        name: `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        latitude: lat,
        longitude: lng
      };
      onSelectPlace(fallbackData);
      setSearchInput(fallbackData.name);
      setShowInfoWindow(true);
    } finally {
      setIsResolvingDetails(false);
    }
  };

  // Handle map click
  const handleMapClick = async (e: any) => {
    let lat: number | undefined;
    let lng: number | undefined;

    if (e.detail?.latLng) {
      lat = typeof e.detail.latLng.lat === 'function' ? e.detail.latLng.lat() : e.detail.latLng.lat;
      lng = typeof e.detail.latLng.lng === 'function' ? e.detail.latLng.lng() : e.detail.latLng.lng;
    } else if (e.latLng) {
      lat = typeof e.latLng.lat === 'function' ? e.latLng.lat() : e.latLng.lat;
      lng = typeof e.latLng.lng === 'function' ? e.latLng.lng() : e.latLng.lng;
    }

    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      await handlePinCoordinates(lat, lng);
    }
  };

  // Handle GPS Locate Me button click
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocatingUser(false);
        const { latitude, longitude } = pos.coords;
        await handlePinCoordinates(latitude, longitude);
      },
      (err) => {
        setIsLocatingUser(false);
        console.warn('Geolocation error:', err);
        alert('Could not detect location. Please search or tap on the map.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
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
    <div className="relative w-full h-[520px] sm:h-[600px] overflow-hidden rounded-3xl bg-slate-950 select-none" ref={containerRef}>
      {/* 1. FLOATING SEARCH BAR & CONTROLS ON TOP OF MAP */}
      <div className="absolute top-4 inset-x-3 sm:inset-x-5 z-20 flex flex-col gap-2 pointer-events-auto">
        <div className="relative flex items-center gap-2">
          {/* Search Input Box */}
          <div className="relative flex-1 shadow-2xl">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              {isResolvingDetails || isLoadingPredictions ? (
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              ) : (
                <Search className="w-5 h-5 text-slate-400" />
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
              placeholder="Search destination, city, or address..."
              className="w-full pl-12 pr-10 py-3.5 sm:py-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/15 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/15 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base font-semibold shadow-2xl transition-all outline-none"
            />

            {searchInput && (
              <button
                id="clear-destination-search-btn"
                type="button"
                onClick={handleClear}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* GPS Quick Locate Button */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocatingUser}
            title="Pin My Current GPS Location"
            className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/15 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xl transition-all active:scale-95 cursor-pointer shrink-0"
          >
            {isLocatingUser ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 2. AUTOCOMPLETE SUGGESTIONS DROPDOWN */}
        {isDropdownOpen && predictions.length > 0 && (
          <div className="w-full bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/15 overflow-hidden z-30 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
            {predictions.map((item) => (
              <button
                key={item.placeId}
                type="button"
                onClick={() => handleSelectPrediction(item)}
                className="w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/50 transition-colors group cursor-pointer"
              >
                <div className="mt-0.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
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
      </div>

      {/* 3. FULL CARD INTERACTIVE GOOGLE MAP */}
      <div className="w-full h-full">
        <ErrorBoundary
          name="Step1DestinationMap"
          fallback={
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-900 text-center space-y-3">
              <div className="p-4 rounded-2xl bg-emerald-950 text-emerald-400">
                <MapPin className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white">
                {selectedPlace ? selectedPlace.name : 'Destination Map'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm">
                {selectedPlace?.address || 'Use the search box above or tap on the map to set your destination.'}
              </p>
            </div>
          }
        >
          <APIProvider apiKey={apiKey} libraries={['places', 'marker', 'geometry']}>
            <Map
              defaultCenter={currentCenter}
              defaultZoom={hasValidSelectedCoords ? 14 : 5}
              mapId="STEP1_DESTINATION_FULL_MAP"
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={false}
              onClick={handleMapClick}
              className="w-full h-full"
            >
              {/* Smooth Camera Pan & Zoom Controller */}
              <MapCameraUpdater
                targetLocation={
                  hasValidSelectedCoords ? { lat: selectedPlace!.latitude, lng: selectedPlace!.longitude } : null
                }
                zoomLevel={14}
              />

              {/* Pin on Map with Draggable Capability */}
              {hasValidSelectedCoords && (
                <AdvancedMarker
                  position={{ lat: selectedPlace!.latitude, lng: selectedPlace!.longitude }}
                  title={selectedPlace!.name}
                  onClick={() => setShowInfoWindow(!showInfoWindow)}
                >
                  <div className="relative flex items-center justify-center cursor-pointer group">
                    <div className="absolute -inset-2.5 rounded-full bg-emerald-500/40 animate-ping" />
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-2xl border-2 border-white dark:border-slate-900 ring-4 ring-emerald-500/30">
                      <MapPin className="w-5 h-5" />
                    </div>
                  </div>
                </AdvancedMarker>
              )}

              {/* Google Maps InfoWindow */}
              {hasValidSelectedCoords && showInfoWindow && (
                <InfoWindow
                  position={{ lat: selectedPlace!.latitude, lng: selectedPlace!.longitude }}
                  onCloseClick={() => setShowInfoWindow(false)}
                  pixelOffset={[0, -36]}
                >
                  <div className="p-1.5 max-w-xs text-left">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Destination Pinned</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">{selectedPlace!.name}</h4>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">{selectedPlace!.address}</p>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        </ErrorBoundary>
      </div>

      {/* 4. BOTTOM FLOATING BAR: SELECTION CONFIRMATION CARD OR PIN GUIDE */}
      <div className="absolute bottom-5 inset-x-3 sm:inset-x-5 z-20 pointer-events-none flex justify-center">
        {selectedPlace ? (
          <div
            id="selected-destination-card"
            className="w-full max-w-lg p-3 sm:p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-emerald-500/40 shadow-2xl flex items-center justify-between gap-3 pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shrink-0">
                <MapPinned className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Destination Set
                  </span>
                  <Check className="w-3 h-3 text-emerald-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {selectedPlace.name || 'Pinned Location'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {selectedPlace.address || selectedPlace.name}
                </p>
              </div>
            </div>

            <button
              id="change-selected-destination-btn"
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 text-xs font-semibold shrink-0 transition-colors shadow-xs cursor-pointer flex items-center gap-1"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              <span>Clear</span>
            </button>
          </div>
        ) : (
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 py-2.5 rounded-full shadow-2xl border border-slate-200/80 dark:border-white/15 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 pointer-events-auto animate-in fade-in duration-200">
            <Compass className="w-4 h-4 text-emerald-500 animate-spin" style={{ animationDuration: '8s' }} />
            <span>Search above or tap anywhere on the map to pin destination</span>
          </div>
        )}
      </div>
    </div>
  );
};
