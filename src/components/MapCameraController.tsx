import React, { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { LatLng } from '../utils/geoCoordinates';

export interface MapCameraControllerProps {
  centerCoords: LatLng;
  activitiesCoords: LatLng[];
  selectedCoord?: LatLng | null;
  padding?: number | { top?: number; bottom?: number; left?: number; right?: number };
  selectedZoom?: number;
  defaultZoom?: number;
}

/**
 * Shared camera controller for Google Maps that handles panning to selected coordinates
 * or fitting bounds around multiple activity markers.
 */
export const MapCameraController: React.FC<MapCameraControllerProps> = ({
  centerCoords,
  activitiesCoords,
  selectedCoord,
  padding = 60,
  selectedZoom = 14,
  defaultZoom = 13,
}) => {
  const map = useMap();
  const lastPannedCoordRef = React.useRef<{ lat: number; lng: number } | null>(null);

  const selLat = selectedCoord?.lat;
  const selLng = selectedCoord?.lng;

  useEffect(() => {
    if (!map) return;

    if (selLat !== undefined && selLng !== undefined) {
      if (
        !lastPannedCoordRef.current ||
        Math.abs(lastPannedCoordRef.current.lat - selLat) > 0.00001 ||
        Math.abs(lastPannedCoordRef.current.lng - selLng) > 0.00001
      ) {
        lastPannedCoordRef.current = { lat: selLat, lng: selLng };
        map.panTo({ lat: selLat, lng: selLng });
        map.setZoom(selectedZoom);
      }
      return;
    }

    if (activitiesCoords.length > 1 && typeof google !== 'undefined' && google.maps) {
      const bounds = new google.maps.LatLngBounds();
      activitiesCoords.forEach((coord) => bounds.extend(coord));
      const fitPadding =
        typeof padding === 'number'
          ? { top: padding, bottom: padding, left: padding, right: padding }
          : padding;
      map.fitBounds(bounds, fitPadding);
      lastPannedCoordRef.current = null;
    } else if (centerCoords) {
      map.panTo(centerCoords);
      map.setZoom(defaultZoom);
      lastPannedCoordRef.current = null;
    }
  }, [map, centerCoords?.lat, centerCoords?.lng, activitiesCoords, selLat, selLng, padding, selectedZoom, defaultZoom]);

  return null;
};
