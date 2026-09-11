import React from 'react';

interface TripWiseLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  textColor?: string;
  primaryColor?: string;
}

export const TripWiseLogo: React.FC<TripWiseLogoProps> = ({
  size = 'md',
  className = '',
  showText = true,
  textColor,
  primaryColor = '#059669'
}) => {
  const sizeMap = {
    sm: { img: 'w-7 h-7', text: 'text-lg', sub: 'text-[9px]' },
    md: { img: 'w-9 h-9', text: 'text-xl', sub: 'text-[10px]' },
    lg: { img: 'w-12 h-12', text: 'text-2xl', sub: 'text-xs' },
    xl: { img: 'w-16 h-16', text: 'text-3xl', sub: 'text-sm' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className={`${currentSize.img} rounded-xl overflow-hidden shadow-md shrink-0 ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-105`}>
        <img
          src="/logo.png"
          alt="TripWise Logo"
          className="w-full h-full object-cover"
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span 
            className={`font-black tracking-tight font-sans leading-none ${currentSize.text}`}
            style={{ color: textColor || 'inherit' }}
          >
            Trip<span style={{ color: primaryColor }}>Wise</span>
          </span>
          <span className={`font-medium opacity-75 leading-tight ${currentSize.sub}`}>
            Smart AI Travel
          </span>
        </div>
      )}
    </div>
  );
};
