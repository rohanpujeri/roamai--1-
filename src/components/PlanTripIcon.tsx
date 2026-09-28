import React from 'react';

export interface PlanTripIconProps {
  className?: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number;
}

/**
 * PlanTripIcon - Two location pins connected through an S-curve route
 * Large, bold, and distinct with clean separation (route does NOT touch pins).
 */
export const PlanTripIcon: React.FC<PlanTripIconProps> = ({
  className = 'w-6.5 h-6.5 sm:w-7.5 sm:h-7.5',
  size = 28,
  color = 'currentColor',
  strokeWidth = 8
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* S-curve Route line with clear separation (does not touch pins) */}
      <path
        d="M 43 78 L 64 78 A 12 12 0 0 0 64 54 L 46 54 A 12 12 0 0 1 46 30 L 61 30"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom-Left Location Pin (Large, bold with hollow center) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 24 45 A 13 13 0 0 1 37 58 C 37 68 24 81 24 81 C 24 81 11 68 11 58 A 13 13 0 0 1 24 45 Z M 24 53 A 5 5 0 1 0 24 63 A 5 5 0 1 0 24 53 Z"
        fill={color}
      />

      {/* Top-Right Location Pin (Large, bold with hollow center) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 76 13 A 13 13 0 0 1 89 26 C 89 36 76 49 76 49 C 76 49 63 36 63 26 A 13 13 0 0 1 76 13 Z M 76 21 A 5 5 0 1 0 76 31 A 5 5 0 1 0 76 21 Z"
        fill={color}
      />
    </svg>
  );
};

export default PlanTripIcon;
