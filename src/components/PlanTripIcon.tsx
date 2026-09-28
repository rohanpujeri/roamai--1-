import React from 'react';

export interface PlanTripIconProps {
  className?: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number;
}

/**
 * PlanTripIcon - Two location pins connected through a travel route
 * Matching Option 3 from the design showcase.
 */
export const PlanTripIcon: React.FC<PlanTripIconProps> = ({
  className = 'w-6 h-6',
  size = 24,
  color = 'currentColor',
  strokeWidth = 2.2
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* S-curved route connecting start pin to destination pin */}
      <path d="M 6 18.5 C 11.5 18.5, 12 11.5, 18 11.5" />

      {/* Start Location Pin (Bottom-Left) */}
      <path d="M 6 10.5 A 3.2 3.2 0 0 1 9.2 13.7 C 9.2 15.9, 6 18.5, 6 18.5 C 6 18.5, 2.8 15.9, 2.8 13.7 A 3.2 3.2 0 0 1 6 10.5 Z" />
      <circle cx="6" cy="13.7" r="1.1" fill={color} stroke="none" />

      {/* Destination Location Pin (Top-Right) */}
      <path d="M 18 3.5 A 3.2 3.2 0 0 1 21.2 6.7 C 21.2 8.9, 18 11.5, 18 11.5 C 18 11.5, 14.8 8.9, 14.8 6.7 A 3.2 3.2 0 0 1 18 3.5 Z" />
      <circle cx="18" cy="6.7" r="1.1" fill={color} stroke="none" />
    </svg>
  );
};

export default PlanTripIcon;
