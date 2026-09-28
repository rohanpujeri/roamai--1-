import React from 'react';
import { Route } from 'lucide-react';

export interface PlanTripIconProps {
  className?: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number;
}

/**
 * PlanTripIcon - Route Itinerary symbol for Roamai's "Plan My Trip"
 */
export const PlanTripIcon: React.FC<PlanTripIconProps> = ({
  className = 'w-5 h-5 sm:w-6 sm:h-6',
  size,
  color,
  strokeWidth = 2.2
}) => {
  return (
    <Route
      className={className}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default PlanTripIcon;
