import React from 'react';

export interface PlanTripIconProps {
  className?: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number;
}

/**
 * PlanTripIcon - Two location pins connected through an S-curve route
 * Exactly matching the Option 3 "ROUTE" travel button design from the showcase.
 */
export const PlanTripIcon: React.FC<PlanTripIconProps> = ({
  className = 'w-6 h-6',
  size = 24,
  color = 'currentColor',
  strokeWidth = 7
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      className={className}
    >
      {/* S-curve Route line */}
      <path
        d="M 36 71.5 L 53.5 71.5 A 7.75 7.75 0 0 0 53.5 56 L 47.5 56 A 7.75 7.75 0 0 1 47.5 40.5 L 61 40.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom-Left Location Pin (Hollow center hole) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 34 46.5 A 8.5 8.5 0 0 1 42.5 55 C 42.5 61.5 34 72 34 72 C 34 72 25.5 61.5 25.5 55 A 8.5 8.5 0 0 1 34 46.5 Z M 34 51.5 A 3.5 3.5 0 1 0 34 58.5 A 3.5 3.5 0 1 0 34 51.5 Z"
        fill={color}
      />

      {/* Top-Right Location Pin (Hollow center hole) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 61 15 A 8.5 8.5 0 0 1 69.5 23.5 C 69.5 30 61 40.5 61 40.5 C 61 40.5 52.5 30 52.5 23.5 A 8.5 8.5 0 0 1 61 15 Z M 61 20 A 3.5 3.5 0 1 0 61 27 A 3.5 3.5 0 1 0 61 20 Z"
        fill={color}
      />
    </svg>
  );
};

export default PlanTripIcon;
