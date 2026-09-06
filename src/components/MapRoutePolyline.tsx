import React, { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { LatLng } from '../utils/geoCoordinates';

interface MapRoutePolylineProps {
  coordinates: LatLng[];
  strokeColor?: string;
  strokeWeight?: number;
  strokeOpacity?: number;
}

export const MapRoutePolyline: React.FC<MapRoutePolylineProps> = ({
  coordinates,
  strokeColor = '#10b981',
  strokeWeight = 4,
  strokeOpacity = 0.85
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps || coordinates.length < 2) {
      return;
    }

    const polyline = new google.maps.Polyline({
      path: coordinates,
      geodesic: true,
      strokeColor,
      strokeOpacity,
      strokeWeight,
      icons: [
        {
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 2.5,
            fillColor: strokeColor,
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: '#ffffff'
          },
          offset: '50%',
          repeat: '120px'
        }
      ],
      map
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, coordinates, strokeColor, strokeWeight, strokeOpacity]);

  return null;
};
