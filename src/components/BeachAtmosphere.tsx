import React from 'react';

interface BeachAtmosphereProps {
  primaryColor?: string;
  secondaryColor?: string;
}

export const BeachAtmosphere: React.FC<BeachAtmosphereProps> = ({
  primaryColor = '#0284c7',
  secondaryColor = '#0d9488',
}) => {
  return (
    <BeachBackgroundEffects primaryColor={primaryColor} secondaryColor={secondaryColor} />
  );
};

export const BeachBackgroundEffects: React.FC<{
  primaryColor?: string;
  secondaryColor?: string;
}> = ({
  primaryColor = '#0284c7',
  secondaryColor = '#0d9488',
}) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* Gentle Floating Sunlit Sea Sparkles */}
      <div className="absolute top-10 left-[18%] w-2 h-2 rounded-full bg-amber-300/50 blur-[0.5px] animate-pulse" style={{ animationDuration: '3.5s' }} />
      <div className="absolute top-28 right-[24%] w-1.5 h-1.5 rounded-full bg-cyan-300/60 blur-[0.5px] animate-ping" style={{ animationDuration: '5.5s' }} />
      <div className="absolute top-[45%] left-[10%] w-2.5 h-2.5 rounded-full bg-teal-300/35 blur-[1px] animate-pulse" style={{ animationDuration: '4.8s' }} />
      <div className="absolute top-[35%] right-[15%] w-2 h-2 rounded-full bg-amber-400/40 blur-[0.5px] animate-pulse" style={{ animationDuration: '4.2s' }} />
      <div className="absolute bottom-20 left-[38%] w-2 h-2 rounded-full bg-sky-300/50 blur-[0.5px] animate-ping" style={{ animationDuration: '6.5s' }} />
      <div className="absolute top-16 right-[40%] w-1.5 h-1.5 rounded-full bg-amber-200/60 blur-[0.5px] animate-pulse" style={{ animationDuration: '3s' }} />

      {/* Gentle Ambient Coastal Water Ripples (Layered SVG Waves at bottom) */}
      <div className="absolute -bottom-1 left-0 right-0 h-16 sm:h-24 w-full overflow-hidden opacity-30">
        <svg
          className="absolute bottom-0 w-[200%] h-full animate-[waveFlow_16s_ease-in-out_infinite_alternate]"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0,45 C150,85 350,10 500,45 C650,80 850,20 1000,50 C1150,80 1200,45 1200,45 L1200,120 L0,120 Z"
            fill={primaryColor}
            fillOpacity="0.18"
          />
        </svg>
        <svg
          className="absolute -bottom-1 w-[200%] h-full animate-[waveFlow_22s_ease-in-out_infinite_alternate-reverse]"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0,60 C200,20 380,85 580,45 C780,10 950,75 1200,35 L1200,120 L0,120 Z"
            fill={secondaryColor}
            fillOpacity="0.15"
          />
        </svg>
      </div>
    </div>
  );
};

