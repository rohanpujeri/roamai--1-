import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import {
  Navigation,
  MapPin,
  Route,
  Layers,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Clock,
  Compass,
  CheckCircle2,
  Car
} from 'lucide-react';
import { Activity, DayItinerary, Trip } from '../types';
import { getActivityCoordinates, getDestinationMapCenter, LatLng } from '../utils/geoCoordinates';
import { MapRoutePolyline } from './MapRoutePolyline';

interface TripRouteMapProps {
  trip: Trip;
  currentDay: DayItinerary;
  selectedActivityId?: string | null;
  onSelectActivity?: (activity: Activity) => void;
  onStartNavigation: (activity: Activity) => void;
}

// Camera Auto-Fitter
const CameraAutoFit: React.FC<{
  centerCoords: LatLng;
  activitiesCoords: LatLng[];
  selectedCoord?: LatLng | null;
}> = ({ centerCoords, activitiesCoords, selectedCoord }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (selectedCoord) {
      map.panTo(selectedCoord);
      map.setZoom(15);
      return;
    }

    if (activitiesCoords.length > 1 && typeof google !== 'undefined' && google.maps) {
      const bounds = new google.maps.LatLngBounds();
      activitiesCoords.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    } else if (centerCoords) {
      map.panTo(centerCoords);
      map.setZoom(13);
    }
  }, [map, centerCoords, activitiesCoords, selectedCoord]);

  return null;
};

function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();

  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export const TripRouteMap: React.FC<TripRouteMapProps> = ({
  trip,
  currentDay,
  selectedActivityId,
  onSelectActivity,
  onStartNavigation
}) => {
  const activities = React.useMemo(() => {
    if (!currentDay?.activities) return [];
    return [...currentDay.activities].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  }, [currentDay]);

  const [selectedPinIndex, setSelectedPinIndex] = useState<number>(0);
  const [showInfoWindow, setShowInfoWindow] = useState<boolean>(true);
  const [showRouteLine, setShowRouteLine] = useState<boolean>(true);
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');

  // Google Maps API Key from env
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

  // Calculate coordinates for all activities of today
  const activitiesWithCoords = activities.map((act, index) => {
    const coords = getActivityCoordinates(act, trip.destination, index, activities.length);
    return { ...act, mapCoords: coords, stopIndex: index + 1 };
  });

  const { center } = getDestinationMapCenter(trip, activities);
  const polylineCoords = activitiesWithCoords.map((a) => a.mapCoords);

  // Sync selected activity when prop changes
  useEffect(() => {
    if (selectedActivityId) {
      const idx = activitiesWithCoords.findIndex((a) => a.id === selectedActivityId);
      if (idx !== -1) {
        setSelectedPinIndex(idx);
        setShowInfoWindow(true);
      }
    }
  }, [selectedActivityId, activitiesWithCoords]);

  const activeStop = activitiesWithCoords[selectedPinIndex] || activitiesWithCoords[0];

  // Open multi-stop day route in Google Maps
  const openFullDayRoute = () => {
    if (activities.length === 0) return;
    const origin = encodeURIComponent(activities[0].title + ', ' + (activities[0].location || trip.destination));
    const destination = encodeURIComponent(
      activities[activities.length - 1].title + ', ' + (activities[activities.length - 1].location || trip.destination)
    );
    const waypoints = activities
      .slice(1, -1)
      .map((a) => encodeURIComponent(a.title + ', ' + (a.location || trip.destination)))
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-slate-950 rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col h-[270px] sm:h-[290px] xl:h-[300px] relative">
      {/* Top Map Header & Controls */}
      <div className="p-3.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between z-10 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-white tracking-wide uppercase">
                Day {currentDay.dayNumber} Live Route Map
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {activities.length} Stops • {trip.destination}
            </p>
          </div>
        </div>

        {/* Map Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowRouteLine((prev) => !prev)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 border ${
              showRouteLine
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Route Polyline"
          >
            <Route className="w-3 h-3" />
            <span className="hidden sm:inline">Path</span>
          </button>

          <button
            onClick={() => setMapTypeId((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-1"
            title="Toggle Satellite / Roadmap"
          >
            <Layers className="w-3 h-3" />
            <span>{mapTypeId === 'roadmap' ? 'Satellite' : 'Road'}</span>
          </button>

          <button
            onClick={openFullDayRoute}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center gap-1 shadow-sm font-black"
            title="Open all stops in Google Maps"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Full Route</span>
          </button>
        </div>
      </div>

      {/* Map Body */}
      <div className="flex-1 relative w-full h-full bg-slate-950">
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={center}
              defaultZoom={13}
              mapId="DEMO_MAP_ID"
              mapTypeId={mapTypeId}
              className="w-full h-full"
              gestureHandling="greedy"
              disableDefaultUI={false}
              zoomControl={true}
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={true}
            >
              <CameraAutoFit
                centerCoords={center}
                activitiesCoords={polylineCoords}
                selectedCoord={activeStop?.mapCoords}
              />

              {/* Route Polyline */}
              {showRouteLine && polylineCoords.length > 1 && (
                <MapRoutePolyline
                  coordinates={polylineCoords}
                  strokeColor="#10b981"
                  strokeWeight={4}
                  strokeOpacity={0.9}
                />
              )}

              {/* Waypoint Markers */}
              {activitiesWithCoords.map((act, index) => {
                const isSelected = selectedPinIndex === index;
                const isCompleted = act.completed;

                return (
                  <AdvancedMarker
                    key={act.id || index}
                    position={act.mapCoords}
                    onClick={() => {
                      setSelectedPinIndex(index);
                      setShowInfoWindow(true);
                      onSelectActivity?.(act);
                    }}
                    title={`Stop ${index + 1}: ${act.title}`}
                  >
                    <div
                      className={`relative flex items-center justify-center rounded-full font-black text-xs transition-all transform cursor-pointer ${
                        isSelected
                          ? 'w-9 h-9 bg-emerald-400 text-slate-950 ring-4 ring-emerald-400/40 shadow-xl scale-125 z-30'
                          : isCompleted
                          ? 'w-7 h-7 bg-slate-700 text-slate-300 ring-2 ring-slate-600 shadow-md z-10'
                          : 'w-8 h-8 bg-emerald-600 text-white ring-2 ring-white shadow-lg z-20 hover:scale-110'
                      }`}
                    >
                      {isCompleted ? '✓' : index + 1}
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
                      )}
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* Active Stop Info Window Popup */}
              {showInfoWindow && activeStop && (
                <InfoWindow
                  position={activeStop.mapCoords}
                  onCloseClick={() => setShowInfoWindow(false)}
                >
                  <div className="p-2 text-slate-900 max-w-xs space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-extrabold text-[10px] flex items-center justify-center">
                        {selectedPinIndex + 1}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">
                        {activeStop.time} • {activeStop.category}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-xs text-slate-950 leading-tight">
                      {activeStop.title}
                    </h4>

                    {activeStop.location && (
                      <p className="text-[10px] text-slate-600 truncate flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        {activeStop.location}
                      </p>
                    )}

                    <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-700">
                        Cost: {activeStop.cost || 'Free'}
                      </span>
                      <button
                        onClick={() => onStartNavigation(activeStop)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm"
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
        ) : (
          /* Offline / OpenStreetMap Visual Interactive Map Fallback */
          <div className="w-full h-full relative overflow-hidden bg-slate-900 flex flex-col justify-between p-4">
            {/* Background Map Graphic Grid */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 50%, #10b981 1px, transparent 1px), linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)`,
                backgroundSize: '24px 24px, 48px 48px, 48px 48px'
              }}
            />

            {/* Visual Route Path Line */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <polyline
                points={activitiesWithCoords
                  .map((_, i) => {
                    const x = 15 + (i * 70) / Math.max(activitiesWithCoords.length - 1, 1);
                    const y = 30 + (i % 2 === 0 ? -10 : 15);
                    return `${x}%,${y}%`;
                  })
                  .join(' ')}
                fill="none"
                stroke="url(#routeGrad)"
                strokeWidth="4"
                strokeDasharray="6 4"
              />
            </svg>

            {/* Waypoint Interactive Nodes */}
            <div className="relative z-10 grid grid-cols-1 gap-2.5 overflow-y-auto max-h-[460px] pr-1">
              {activitiesWithCoords.map((act, index) => {
                const isSelected = selectedPinIndex === index;
                return (
                  <div
                    key={act.id || index}
                    onClick={() => {
                      setSelectedPinIndex(index);
                      onSelectActivity?.(act);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-500/30 shadow-lg'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                          isSelected
                            ? 'bg-emerald-400 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase">
                            {act.time}
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-[10px] text-slate-400">{act.category}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white leading-tight">
                          {act.title}
                        </h4>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartNavigation(act);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-extrabold flex items-center gap-1 shadow-sm shrink-0"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Start</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Google Maps Quick Launcher */}
            <div className="relative z-10 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                🚀 Ready to drive or transit?
              </span>
              <button
                onClick={openFullDayRoute}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Open Google Maps Directions</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Waypoints Strip in Google Maps Mode */}
      {apiKey && (
        <div className="p-2.5 bg-slate-900/95 border-t border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 z-10">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 pl-1">
            Stops:
          </span>
          {activitiesWithCoords.map((act, index) => {
            const isSelected = selectedPinIndex === index;
            return (
              <button
                key={act.id || index}
                onClick={() => {
                  setSelectedPinIndex(index);
                  setShowInfoWindow(true);
                  onSelectActivity?.(act);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-extrabold shadow-md'
                    : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="font-black">{index + 1}.</span>
                <span className="truncate max-w-[110px]">{act.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
