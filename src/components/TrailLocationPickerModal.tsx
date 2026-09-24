import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import {
  X,
  Search,
  MapPin,
  Compass,
  Navigation,
  Check,
  Loader2,
  Sparkles,
  Map as MapIcon
} from 'lucide-react';
import { getGooglePlacesPredictions, getGooglePlaceDetails, AutocompleteSuggestion } from '../services/placesService';
import { ErrorBoundary } from './ErrorBoundary';

export interface SelectedTrailLocation {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

interface TrailLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: SelectedTrailLocation) => void;
  initialLocation?: string;
}

// Popular quick picks for fast selection
const POPULAR_LOCATIONS = [
  { name: 'Goa', address: 'Goa, India', lat: 15.2993, lng: 74.1240 },
  { name: 'Manali', address: 'Himachal Pradesh, India', lat: 32.2396, lng: 77.1887 },
  { name: 'Bangalore', address: 'Karnataka, India', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', address: 'Maharashtra, India', lat: 19.0760, lng: 72.8777 },
  { name: 'Ladakh (Leh)', address: 'Ladakh, India', lat: 34.1526, lng: 77.5771 },
  { name: 'Bali', address: 'Indonesia', lat: -8.4095, lng: 115.1889 },
  { name: 'Paris', address: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Tokyo', address: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Swiss Alps', address: 'Switzerland', lat: 46.6863, lng: 7.8632 },
  { name: 'Dubai', address: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { name: 'New York', address: 'NY, USA', lat: 40.7128, lng: -74.0060 },
  { name: 'Kerala', address: 'India', lat: 9.4981, lng: 76.3388 }
];

// Helper to smoothly fly/pan the map camera
const MapCameraController: React.FC<{
  target: { lat: number; lng: number } | null;
  zoom?: number;
}> = ({ target, zoom = 14 }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    if (typeof target.lat !== 'number' || typeof target.lng !== 'number' || isNaN(target.lat) || isNaN(target.lng)) return;
    try {
      if (typeof map.panTo === 'function') {
        map.panTo(target);
      }
      if (typeof map.setZoom === 'function') {
        map.setZoom(zoom);
      }
    } catch (e) {
      console.warn('MapCameraController pan error:', e);
    }
  }, [map, target, zoom]);

  return null;
};

// Robust reverse geocoding using Google Geocoder with Nominatim fallback
async function reverseGeocode(lat: number, lng: number): Promise<{ name: string; address: string }> {
  // 1. Google Maps Geocoder if loaded
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
              name: placeName || 'Selected Location',
              address: best.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
            });
          } else {
            resolve(null);
          }
        });
      });
      if (res) return res;
    } catch (e) {
      console.warn('Google reverse geocoding failed:', e);
    }
  }

  // 2. Fallback to OpenStreetMap Nominatim
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
        data.name ||
        data.display_name.split(',')[0];
      return {
        name: name || 'Selected Location',
        address: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      };
    }
  } catch (e) {
    console.warn('Nominatim reverse geocode fallback failed:', e);
  }

  return {
    name: 'Selected Pin Location',
    address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  };
}

export const TrailLocationPickerModal: React.FC<TrailLocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialLocation = ''
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const [activeTab, setActiveTab] = useState<'search' | 'map'>('search');
  const [searchQuery, setSearchQuery] = useState(initialLocation);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Selected state
  const [selectedLocation, setSelectedLocation] = useState<SelectedTrailLocation | null>(() => {
    if (initialLocation && initialLocation.trim()) {
      return {
        name: initialLocation.trim(),
        address: initialLocation.trim()
      };
    }
    return null;
  });

  // Map pin position
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>({
    lat: 15.2993,
    lng: 74.1240 // Default to Goa
  });

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initial location when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialLocation && initialLocation.trim()) {
        setSearchQuery(initialLocation);
        setSelectedLocation({
          name: initialLocation.trim(),
          address: initialLocation.trim()
        });
      }
    }
  }, [isOpen, initialLocation]);

  // Handle place predictions autocomplete
  const fetchPredictions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const preds = await getGooglePlacesPredictions(query.trim());
      setSuggestions(preds);
    } catch (e) {
      console.error('Error fetching place predictions:', e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      fetchPredictions(val);
    }, 250);
  };

  // User clicked a suggestion
  const handleSelectSuggestion = async (sug: AutocompleteSuggestion) => {
    setIsSearching(true);
    try {
      let lat = sug.lat;
      let lng = sug.lng;
      let fullAddress = sug.description || sug.secondaryText || sug.mainText;
      let placeName = sug.mainText;

      if (!lat || !lng) {
        try {
          const details = await getGooglePlaceDetails(sug.placeId);
          if (details) {
            lat = details.latitude;
            lng = details.longitude;
            fullAddress = details.address || fullAddress;
            placeName = details.name || placeName;
          }
        } catch (err) {
          console.warn('Place details fetch failed, continuing with suggestion coords:', err);
        }
      }

      const loc: SelectedTrailLocation = {
        name: placeName,
        address: fullAddress,
        latitude: lat,
        longitude: lng
      };

      setSelectedLocation(loc);
      if (lat && lng) {
        setPinCoords({ lat, lng });
      }
      setSearchQuery(placeName);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  // User picked a popular quick pick
  const handleSelectPopular = (pop: typeof POPULAR_LOCATIONS[0]) => {
    const loc: SelectedTrailLocation = {
      name: pop.name,
      address: pop.address,
      latitude: pop.lat,
      longitude: pop.lng
    };
    setSelectedLocation(loc);
    setPinCoords({ lat: pop.lat, lng: pop.lng });
    setSearchQuery(pop.name);
    setSuggestions([]);
  };

  // Map click handler to drop/move pin
  const handleMapClick = async (e: any) => {
    const latLng = e.detail?.latLng;
    if (!latLng) return;

    const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
    const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

    setPinCoords({ lat, lng });
    setIsGeocoding(true);

    try {
      const geo = await reverseGeocode(lat, lng);
      setSelectedLocation({
        name: geo.name,
        address: geo.address,
        latitude: lat,
        longitude: lng
      });
      setSearchQuery(geo.name);
    } catch (err) {
      console.warn('Reverse geocode error:', err);
      setSelectedLocation({
        name: 'Selected Pin Location',
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        latitude: lat,
        longitude: lng
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  // Locate me button handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPinCoords({ lat, lng });

        try {
          const geo = await reverseGeocode(lat, lng);
          setSelectedLocation({
            name: geo.name,
            address: geo.address,
            latitude: lat,
            longitude: lng
          });
          setSearchQuery(geo.name);
        } catch {
          setSelectedLocation({
            name: 'Current Location',
            address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            latitude: lat,
            longitude: lng
          });
        } finally {
          setIsGeocoding(false);
        }
      },
      (err) => {
        setIsGeocoding(false);
        alert('Could not retrieve your location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Final confirm
  const handleConfirm = () => {
    if (!selectedLocation || !selectedLocation.name.trim()) {
      alert('Please select or search for a location first.');
      return;
    }
    onSelectLocation(selectedLocation);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      data-cover-action="true"
      data-location-action="true"
      className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[92vh] bg-[#141418] border border-white/10 rounded-3xl shadow-2xl flex flex-col text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0 bg-[#18181f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white leading-tight">Add Trail Location</h3>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Required
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-snug">
                Search place name or tap anywhere on the map
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-zinc-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switchers: Search Place / Select on Map */}
        <div className="px-5 pt-3 pb-2 bg-[#141418] shrink-0">
          <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Search Place</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Select on Map</span>
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          {activeTab === 'search' ? (
            <div className="p-5 space-y-4 flex-1">
              {/* Search input field */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  placeholder="Search city, landmark, beach, cafe..."
                  className="w-full bg-[#1e1e24] border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSuggestions([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Suggestions dropdown list */}
              {isSearching ? (
                <div className="py-6 flex items-center justify-center gap-2 text-zinc-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Searching places...</span>
                </div>
              ) : suggestions.length > 0 ? (
                <div className="bg-[#1a1a22] border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                  {suggestions.map((sug) => (
                    <button
                      key={sug.placeId}
                      type="button"
                      onClick={() => handleSelectSuggestion(sug)}
                      className="w-full p-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-semibold text-white truncate">
                          {sug.mainText}
                        </p>
                        {sug.secondaryText && (
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {sug.secondaryText}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Quick Popular Picks */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Popular Travel Spots</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_LOCATIONS.map((pop) => {
                    const isSelected = selectedLocation?.name === pop.name;
                    return (
                      <button
                        key={pop.name}
                        type="button"
                        onClick={() => handleSelectPopular(pop)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-500 font-semibold shadow-md shadow-emerald-950/40'
                            : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/5'
                        }`}
                      >
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>{pop.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick switch to map helper */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Compass className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">Prefer using a map?</p>
                    <p className="text-[11px] text-zinc-400">Pinpoint any specific beach, peak, or hidden spot.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('map')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shrink-0 transition-all"
                >
                  Open Map
                </button>
              </div>
            </div>
          ) : (
            /* MAP TAB */
            <div className="relative flex-1 min-h-[340px] sm:min-h-[420px] flex flex-col">
              {/* Map Floating Search Bar & Locate Me */}
              <div className="absolute top-3 inset-x-3 z-10 flex items-center gap-2 pointer-events-auto">
                <div className="relative flex-1 shadow-xl">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    placeholder="Search place on map..."
                    className="w-full bg-[#18181fb3] backdrop-blur-md border border-white/20 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSuggestions([]);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {/* Dropdown overlay on map search */}
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#18181f] border border-white/15 rounded-xl shadow-2xl divide-y divide-white/10 z-20">
                      {suggestions.map((sug) => (
                        <button
                          key={sug.placeId}
                          type="button"
                          onClick={() => handleSelectSuggestion(sug)}
                          className="w-full p-2.5 flex items-start gap-2 hover:bg-white/10 text-left cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white truncate">{sug.mainText}</p>
                            {sug.secondaryText && (
                              <p className="text-[10px] text-zinc-400 truncate">{sug.secondaryText}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Locate Me button */}
                <button
                  type="button"
                  onClick={handleLocateMe}
                  title="Use current location"
                  className="w-9 h-9 rounded-xl bg-[#18181fb3] backdrop-blur-md border border-white/20 hover:bg-white/20 text-white flex items-center justify-center shadow-xl cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <Navigation className="w-4 h-4 text-emerald-400" />
                </button>
              </div>

              {/* Interactive Google Map */}
              <div className="w-full h-full flex-1 min-h-[300px] bg-zinc-900">
                <ErrorBoundary
                  fallback={
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-400 space-y-2 bg-[#121216]">
                      <MapPin className="w-10 h-10 text-rose-500" />
                      <p className="text-sm font-semibold text-white">Interactive map is temporarily unavailable</p>
                      <p className="text-xs max-w-xs">Please use the Search Place tab above to pick your location.</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('search')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Switch to Search
                      </button>
                    </div>
                  }
                >
                  <APIProvider apiKey={apiKey} libraries={['places', 'marker', 'geometry']}>
                    <Map
                      defaultCenter={pinCoords}
                      defaultZoom={13}
                      mapId="TRAIL_LOCATION_PICKER_MAP"
                      gestureHandling="greedy"
                      disableDefaultUI={false}
                      mapTypeControl={false}
                      streetViewControl={false}
                      fullscreenControl={false}
                      className="w-full h-full"
                      onClick={handleMapClick}
                    >
                      <MapCameraController target={pinCoords} zoom={14} />

                      {/* Pin Marker */}
                      <AdvancedMarker position={pinCoords}>
                        <div className="relative flex items-center justify-center cursor-pointer group">
                          <div className="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping" />
                          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-emerald-500/40">
                            <MapPin className="w-5 h-5 fill-white" />
                          </div>
                        </div>
                      </AdvancedMarker>
                    </Map>
                  </APIProvider>
                </ErrorBoundary>
              </div>

              {/* Pin instructions overlay */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
                <div className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[11px] text-zinc-300 font-medium shadow-lg">
                  Tap anywhere on the map to place pin
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER: Selected Location Card & Confirm Button */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#18181f] shrink-0 space-y-3">
          {selectedLocation ? (
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  {isGeocoding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {selectedLocation.name}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                      Selected
                    </span>
                  </div>
                  {selectedLocation.address && selectedLocation.address !== selectedLocation.name && (
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {selectedLocation.address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Please search or tap the map to choose a location (Mandatory).</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold text-xs sm:text-sm cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedLocation || !selectedLocation.name.trim() || isGeocoding}
              className="flex-1 py-3 px-5 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 transition-all active:scale-98 disabled:opacity-40 disabled:pointer-events-none"
            >
              {isGeocoding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm Location</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default TrailLocationPickerModal;
