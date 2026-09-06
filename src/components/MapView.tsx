import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Clock,
  ExternalLink,
  Sparkles,
  Layers,
  ChevronRight,
  Route,
  Compass,
  CheckCircle2,
  Settings,
  Car,
  Eye,
  Info,
  Maximize2,
  LocateFixed
} from 'lucide-react';
import { Trip, Activity } from '../types';
import { resolvePlaceImage, handleImageError } from '../utils/placeImages';
import { getActivityCoordinates, getDestinationMapCenter, LatLng } from '../utils/geoCoordinates';
import { MapRoutePolyline } from './MapRoutePolyline';

interface MapViewProps {
  trip: Trip;
  activeDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  onSelectActivity: (activity: Activity) => void;
  onOpenMapSearch?: () => void;
}

// Category color configurations
const CATEGORY_STYLES: Record<string, { bg: string; text: string; pinBg: string; glyphColor: string }> = {
  Sightseeing: { bg: 'bg-emerald-500', text: 'text-white', pinBg: '#10b981', glyphColor: '#ffffff' },
  Food: { bg: 'bg-amber-500', text: 'text-white', pinBg: '#f59e0b', glyphColor: '#ffffff' },
  Adventure: { bg: 'bg-rose-500', text: 'text-white', pinBg: '#f43f5e', glyphColor: '#ffffff' },
  Relaxation: { bg: 'bg-sky-500', text: 'text-white', pinBg: '#0ea5e9', glyphColor: '#ffffff' },
  Culture: { bg: 'bg-purple-500', text: 'text-white', pinBg: '#a855f7', glyphColor: '#ffffff' },
  Nightlife: { bg: 'bg-indigo-500', text: 'text-white', pinBg: '#6366f1', glyphColor: '#ffffff' },
  Shopping: { bg: 'bg-pink-500', text: 'text-white', pinBg: '#ec4899', glyphColor: '#ffffff' },
  Transit: { bg: 'bg-slate-600', text: 'text-white', pinBg: '#475569', glyphColor: '#ffffff' }
};

// Camera Controller helper component
const CameraController: React.FC<{
  centerCoords: LatLng;
  activitiesCoords: LatLng[];
  selectedCoord?: LatLng | null;
}> = ({ centerCoords, activitiesCoords, selectedCoord }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (selectedCoord) {
      map.panTo(selectedCoord);
      map.setZoom(14);
      return;
    }

    if (activitiesCoords.length > 1 && typeof google !== 'undefined' && google.maps) {
      const bounds = new google.maps.LatLngBounds();
      activitiesCoords.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
    } else if (centerCoords) {
      map.panTo(centerCoords);
      map.setZoom(13);
    }
  }, [map, centerCoords, activitiesCoords, selectedCoord]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({
  trip,
  activeDayNumber,
  onSelectDay,
  onSelectActivity,
  onOpenMapSearch
}) => {
  const days = trip?.days || [];
  const currentDay = days.find((d) => d.dayNumber === activeDayNumber) || days[0] || { dayNumber: 1, theme: `${trip?.destination || 'Destination'} Highlights`, activities: [] };
  const activities = currentDay.activities || [];

  const [selectedPinIndex, setSelectedPinIndex] = useState<number>(0);
  const [showInfoWindow, setShowInfoWindow] = useState<boolean>(true);
  const [showRouteLine, setShowRouteLine] = useState<boolean>(true);
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [trafficEnabled, setTrafficEnabled] = useState<boolean>(false);

  // User provided Maps API Key with env fallback
  const defaultApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const [customApiKey, setCustomApiKey] = useState<string>(defaultApiKey);

  // Map coordinates for all current day activities
  const activityCoordinates = useMemo(() => {
    return activities.map((act, index) =>
      getActivityCoordinates(act, trip.destination, index, activities.length)
    );
  }, [activities, trip.destination]);

  // Initial destination center
  const initialMapConfig = useMemo(() => {
    return getDestinationMapCenter(trip, activities);
  }, [trip, activities]);

  const selectedActivity = activities[selectedPinIndex] || activities[0];
  const selectedCoord = activityCoordinates[selectedPinIndex] || initialMapConfig.center;

  // Handle marker click
  const handleMarkerClick = useCallback((index: number) => {
    setSelectedPinIndex(index);
    setShowInfoWindow(true);
  }, []);

  // Open directions in external Google Maps
  const openExternalDirections = (lat: number, lng: number, placeName: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(
      placeName
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Open full day itinerary in Google Maps
  const openFullDayRoute = () => {
    if (activityCoordinates.length === 0) return;
    const origin = activityCoordinates[0];
    const destination = activityCoordinates[activityCoordinates.length - 1];
    const waypoints = activityCoordinates
      .slice(1, -1)
      .map((c) => `${c.lat},${c.lng}`)
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
    if (waypoints) {
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto">
      {/* Top Header & Day Navigation */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-4 sm:p-6 shadow-xl border border-white/80 dark:border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Google Maps Route Navigation</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live API
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            Day {currentDay.dayNumber}: {currentDay.theme} • {activities.length} Geo-located stops in {trip.destination}
          </p>
        </div>

        {/* Day switch buttons & Map Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {days.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => {
                  onSelectDay(day.dayNumber);
                  setSelectedPinIndex(0);
                  setShowInfoWindow(true);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  day.dayNumber === activeDayNumber
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700'
                }`}
              >
                Day {day.dayNumber}
              </button>
            ))}
          </div>

          {onOpenMapSearch && (
            <button
              onClick={onOpenMapSearch}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
              title="Search any place with Google Places Autocomplete"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Search Places</span>
            </button>
          )}

          <button
            onClick={() => setIsKeyModalOpen(true)}
            title="Google Maps API Settings"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Map View & Details Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Google Maps Container */}
        <div className="lg:col-span-8 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 relative min-h-[540px] flex flex-col justify-between">
          
          {/* Top Overlay Controls Toolbar */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none gap-2">
            <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 text-xs font-medium text-slate-200 flex items-center gap-2 pointer-events-auto shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-emerald-300">{activities.length} Stops</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">{trip.destination} Active Route</span>
            </div>

            {/* Map layers & polyline toggles */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                onClick={() => setShowRouteLine((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg cursor-pointer backdrop-blur-md border ${
                  showRouteLine
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-950/80 text-slate-300 border-slate-700 hover:bg-slate-900'
                }`}
              >
                <Route className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Path</span>
              </button>

              <button
                onClick={() => setMapTypeId((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-950/80 hover:bg-slate-900 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 shadow-lg cursor-pointer backdrop-blur-md"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{mapTypeId === 'roadmap' ? 'Satellite' : 'Roadmap'}</span>
              </button>

              <button
                onClick={openFullDayRoute}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-all flex items-center gap-1 shadow-lg cursor-pointer"
                title="Open full day route in Google Maps app"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Directions</span>
              </button>
            </div>
          </div>

          {/* Interactive Google Map with Provider */}
          <div className="w-full h-full min-h-[540px] relative">
            <APIProvider apiKey={customApiKey} libraries={['places', 'marker', 'geometry']}>
              <Map
                id="google-trip-map"
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                defaultCenter={initialMapConfig.center}
                defaultZoom={initialMapConfig.zoom}
                mapTypeId={mapTypeId}
                gestureHandling={'greedy'}
                fullscreenControl={false}
                streetViewControl={true}
                mapTypeControl={false}
                zoomControl={true}
                style={{ width: '100%', height: '100%', minHeight: '540px' }}
              >
                {/* Auto camera panning/bounds */}
                <CameraController
                  centerCoords={initialMapConfig.center}
                  activitiesCoords={activityCoordinates}
                  selectedCoord={activityCoordinates[selectedPinIndex]}
                />

                {/* Route sequence Polyline */}
                {showRouteLine && activityCoordinates.length > 1 && (
                  <MapRoutePolyline
                    coordinates={activityCoordinates}
                    strokeColor="#10b981"
                    strokeWeight={4}
                    strokeOpacity={0.9}
                  />
                )}

                {/* Advanced Markers for each stop */}
                {activities.map((act, index) => {
                  const coord = activityCoordinates[index];
                  const isSelected = selectedPinIndex === index;
                  const categoryStyle = CATEGORY_STYLES[act.category] || CATEGORY_STYLES.Sightseeing;

                  return (
                    <AdvancedMarker
                      key={act.id}
                      position={coord}
                      title={`${index + 1}. ${act.title}`}
                      onClick={() => handleMarkerClick(index)}
                      zIndex={isSelected ? 100 : 10 + index}
                    >
                      <div
                        className={`relative cursor-pointer transition-transform duration-200 ${
                          isSelected ? 'scale-125 z-50' : 'hover:scale-110'
                        }`}
                      >
                        <Pin
                          background={isSelected ? '#059669' : categoryStyle.pinBg}
                          borderColor={isSelected ? '#ffffff' : '#ffffff'}
                          glyphColor="#ffffff"
                          scale={isSelected ? 1.25 : 1.0}
                        >
                          <span className="text-[11px] font-black text-white">{index + 1}</span>
                        </Pin>

                        {/* Selected halo indicator */}
                        {isSelected && (
                          <span className="absolute -inset-1 rounded-full bg-emerald-400/30 animate-ping pointer-events-none" />
                        )}
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {/* Interactive InfoWindow for selected stop */}
                {showInfoWindow && selectedActivity && selectedCoord && (
                  <InfoWindow
                    position={selectedCoord}
                    onCloseClick={() => setShowInfoWindow(false)}
                    pixelOffset={[0, -40]}
                  >
                    <div className="p-1 max-w-[240px] text-slate-900">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                          Stop #{selectedPinIndex + 1}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600">
                          {selectedActivity.time}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                        {selectedActivity.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{selectedActivity.location}</span>
                      </p>

                      <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-emerald-700">
                          {selectedActivity.estimatedCost === 0
                            ? 'Free'
                            : `₹${selectedActivity.estimatedCost.toLocaleString()}`}
                        </span>

                        <button
                          onClick={() =>
                            openExternalDirections(
                              selectedCoord.lat,
                              selectedCoord.lng,
                              selectedActivity.title
                            )
                          }
                          className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Navigation className="w-2.5 h-2.5" />
                          <span>Navigate</span>
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          </div>

          {/* Map Footer Legend */}
          <div className="p-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Sightseeing
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Food & Cafe
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Adventure
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> Relaxation
              </span>
            </div>

            <span className="text-emerald-400 font-semibold text-[11px]">
              Tap any pin to view route & directions
            </span>
          </div>

        </div>

        {/* Right Sidebar: Selected Place Details & Full Day Sequence */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Selected Stop Card */}
          {selectedActivity && (
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-5 shadow-xl border border-white/80 dark:border-white/15 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Stop #{selectedPinIndex + 1} • {selectedActivity.time}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {selectedActivity.estimatedCost === 0
                    ? 'Free'
                    : `₹${selectedActivity.estimatedCost.toLocaleString()}`}
                </span>
              </div>

              {/* Photo Banner */}
              <div className="h-36 rounded-2xl overflow-hidden relative group">
                <img
                  src={selectedActivity.imageUrl && selectedActivity.imageUrl.startsWith('http') && !selectedActivity.imageUrl.includes('example.com')
                    ? selectedActivity.imageUrl
                    : resolvePlaceImage(selectedActivity.title, selectedActivity.category, selectedActivity.location, trip?.destination)}
                  alt={selectedActivity.title}
                  onError={(e) => handleImageError(e, selectedActivity.category)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 text-white">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-[10px] font-bold uppercase tracking-wider mb-1 inline-block">
                    {selectedActivity.category}
                  </span>
                  <h4 className="text-sm font-bold truncate">{selectedActivity.title}</h4>
                  <p className="text-[11px] text-slate-200 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>{selectedActivity.location}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Duration</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedActivity.duration}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Transit</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate block">
                    {selectedActivity.travelTimeFromPrev || '10 min'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                {selectedActivity.description}
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() =>
                    openExternalDirections(
                      selectedCoord.lat,
                      selectedCoord.lng,
                      selectedActivity.title
                    )
                  }
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Navigate</span>
                </button>

                <button
                  onClick={() => onSelectActivity(selectedActivity)}
                  className="py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Sequential Route Stop list */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-5 shadow-xl border border-white/80 dark:border-white/15 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Day {currentDay.dayNumber} Stops Sequence
              </h4>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {activities.length} stops
              </span>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {activities.map((act, i) => {
                const isSelected = selectedPinIndex === i;
                const catStyle = CATEGORY_STYLES[act.category] || CATEGORY_STYLES.Sightseeing;

                return (
                  <div
                    key={act.id}
                    onClick={() => {
                      setSelectedPinIndex(i);
                      setShowInfoWindow(true);
                    }}
                    className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 font-bold shadow-sm'
                        : 'border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-xl text-white text-[11px] font-extrabold flex items-center justify-center shrink-0 shadow-xs ${
                          isSelected ? 'bg-emerald-600 ring-2 ring-emerald-400/40' : catStyle.bg
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="truncate">
                        <p className="text-xs font-semibold truncate">{act.title}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span>{act.time}</span>
                          <span>•</span>
                          <span>{act.location}</span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Google Maps API Key Configuration Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                  <MapPin className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Google Maps API Configuration</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage your Maps Platform Key</p>
                </div>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Google Maps JavaScript API Active</span>
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Connected with Google Maps SDK (@vis.gl/react-google-maps), rendering AdvancedMarker elements, dynamic route polylines, and directions.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Maps API Key
              </label>
              <input
                type="text"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value.trim())}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setCustomApiKey(defaultApiKey);
                  setIsKeyModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Reset to Default
              </button>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-md"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
