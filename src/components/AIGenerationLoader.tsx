import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Check, Compass, MapPin } from 'lucide-react';
import { TravelMode, ThemeConfig } from '../types';

export interface AIGenerationLoaderProps {
  destinationName: string;
  startCity?: string;
  travelMode?: TravelMode;
  durationDays?: number;
  currentTheme?: ThemeConfig;
  onCancel?: () => void;
}

export const AIGenerationLoader: React.FC<AIGenerationLoaderProps> = ({
  destinationName,
  startCity,
  travelMode = 'Flight',
  durationDays = 3,
  currentTheme,
  onCancel
}) => {
  const [progress, setProgress] = useState<number>(12);

  // Smooth simulated progress that naturally advances while AI generates
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 96) return 96;
        if (prev < 30) return prev + Math.random() * 5 + 3;
        if (prev < 65) return prev + Math.random() * 3 + 1.5;
        if (prev < 85) return prev + Math.random() * 2 + 0.8;
        return prev + Math.random() * 0.8 + 0.3;
      });
    }, 400);

    return () => clearInterval(timer);
  }, []);

  // Determine stage text based on progress
  const stageInfo = useMemo(() => {
    const modeLabel = travelMode === 'Bike / Motorcycle' ? 'motorcycle highway route'
      : travelMode === 'Car / Road Trip' ? 'road trip corridor'
      : travelMode === 'Train' ? 'railway route'
      : travelMode === 'Bus' ? 'bus transit corridor'
      : 'flight trajectory';

    if (progress < 25) {
      return {
        label: 'Building itinerary',
        subtitle: `Analyzing ${modeLabel} from ${startCity || 'origin'} to ${destinationName || 'destination'}...`,
        transitChecked: false,
        staysChecked: false,
        activitiesChecked: false,
        weatherChecked: false
      };
    }
    if (progress < 50) {
      return {
        label: 'Optimizing route',
        subtitle: `Discovering authentic places & hidden gems in ${destinationName || 'your destination'}...`,
        transitChecked: true,
        staysChecked: false,
        activitiesChecked: false,
        weatherChecked: false
      };
    }
    if (progress < 75) {
      return {
        label: 'Curating stays',
        subtitle: `Calibrating authentic stays near each day's last stop with parking...`,
        transitChecked: true,
        staysChecked: true,
        activitiesChecked: false,
        weatherChecked: false
      };
    }
    if (progress < 90) {
      return {
        label: 'Fine-tuning schedule',
        subtitle: `Optimizing weather forecast, local meals & daily timing...`,
        transitChecked: true,
        staysChecked: true,
        activitiesChecked: true,
        weatherChecked: false
      };
    }
    return {
      label: 'Finalizing itinerary',
      subtitle: `Assembling your personalized ${durationDays}-day adventure...`,
      transitChecked: true,
      staysChecked: true,
      activitiesChecked: true,
      weatherChecked: true
    };
  }, [progress, travelMode, startCity, destinationName, durationDays]);

  // Mode-specific route configuration
  const transitModeConfig = useMemo(() => {
    switch (travelMode) {
      case 'Bike / Motorcycle':
        return {
          icon: '🏍️',
          badgeText: 'Bike Route',
          pathD: 'M 55 95 C 115 25, 175 140, 240 40 S 305 130, 345 95',
          originPoint: { x: 55, y: 95 },
          destPoint: { x: 345, y: 95 },
          duration: '3.2s'
        };
      case 'Car / Road Trip':
        return {
          icon: '🚗',
          badgeText: 'Road Route',
          pathD: 'M 55 95 C 130 35, 215 135, 345 95',
          originPoint: { x: 55, y: 95 },
          destPoint: { x: 345, y: 95 },
          duration: '3.5s'
        };
      case 'Train':
        return {
          icon: '🚆',
          badgeText: 'Rail Route',
          pathD: 'M 55 95 Q 200 30 345 95',
          originPoint: { x: 55, y: 95 },
          destPoint: { x: 345, y: 95 },
          duration: '3.0s'
        };
      case 'Bus':
        return {
          icon: '🚌',
          badgeText: 'Bus Route',
          pathD: 'M 55 95 C 130 45, 225 125, 345 95',
          originPoint: { x: 55, y: 95 },
          destPoint: { x: 345, y: 95 },
          duration: '3.8s'
        };
      case 'Self-Drive Rental':
        return {
          icon: '🚙',
          badgeText: 'Rental Drive',
          pathD: 'M 55 95 C 125 40, 220 130, 345 95',
          originPoint: { x: 55, y: 95 },
          destPoint: { x: 345, y: 95 },
          duration: '3.4s'
        };
      case 'Flight':
      default:
        return {
          icon: '✈️',
          badgeText: 'Flights',
          pathD: 'M 55 95 Q 200 10 345 95',
          originPoint: { x: 55, y: 95 },
          destPoint: { x: 345, y: 95 },
          duration: '3.2s'
        };
    }
  }, [travelMode]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 sm:p-6 select-none bg-black/30 backdrop-blur-[1.5px]">
      {/* Theme Atmospheric Ambient Glow */}
      {currentTheme?.primaryColor && (
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            background: `radial-gradient(ellipse at 50% 45%, ${currentTheme.primaryColor} 0%, transparent 65%)`
          }}
        />
      )}

      {/* Atmospheric Starry Sky Particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-1 h-1 bg-white/70 rounded-full animate-ping" />
        <div className="absolute top-[18%] left-[75%] w-1.5 h-1.5 bg-white/80 rounded-full opacity-80" />
        <div className="absolute top-[32%] left-[45%] w-1 h-1 bg-white/60 rounded-full" />
        <div className="absolute top-[25%] left-[88%] w-1 h-1 bg-white/50 rounded-full animate-pulse" />
        <div className="absolute top-[8%] left-[60%] w-1.5 h-1.5 bg-white/90 rounded-full" />
        <div className="absolute top-[40%] left-[12%] w-1 h-1 bg-white/70 rounded-full" />
      </div>

      {/* Brand Header top-left */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-20 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-800 shadow-lg">
        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white">
          <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '10s' }} />
        </div>
        <span className="text-sm font-extrabold text-white tracking-wide">
          TripWise<span className="text-amber-300">.</span>
        </span>
      </div>

      {/* Floating Polaroid 1: Top Left (Bali / Tropical) */}
      <motion.div
        animate={{ y: [-5, 6, -5], rotate: [-8, -6, -8] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden md:block absolute top-12 left-10 lg:left-16 z-10 pointer-events-none"
      >
        <div className="bg-white/95 dark:bg-white p-2.5 pb-3 rounded-2xl shadow-2xl backdrop-blur-md border border-white/40">
          <div className="w-28 lg:w-36 h-20 lg:h-24 rounded-xl overflow-hidden shadow-inner bg-slate-200">
            <img
              src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=400&q=80"
              alt="Bali, Indonesia"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-[10px] lg:text-[11px] font-bold text-slate-800 text-center mt-1.5 tracking-tight">
            Bali, Indonesia
          </p>
        </div>
      </motion.div>

      {/* Floating Polaroid 2: Top Right (Tokyo / Urban Skyline) */}
      <motion.div
        animate={{ y: [6, -6, 6], rotate: [8, 10, 8] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden md:block absolute top-14 right-10 lg:right-16 z-10 pointer-events-none"
      >
        <div className="bg-white/95 dark:bg-white p-2.5 pb-3 rounded-2xl shadow-2xl backdrop-blur-md border border-white/40">
          <div className="w-28 lg:w-36 h-20 lg:h-24 rounded-xl overflow-hidden shadow-inner bg-slate-200">
            <img
              src="https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80"
              alt="Tokyo, Japan"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-[10px] lg:text-[11px] font-bold text-slate-800 text-center mt-1.5 tracking-tight">
            Tokyo, Japan
          </p>
        </div>
      </motion.div>

      {/* Floating Polaroid 3: Bottom Left (Swiss Alps / Mountains) */}
      <motion.div
        animate={{ y: [-6, 5, -6], rotate: [6, 4, 6] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden md:block absolute bottom-12 left-12 lg:left-20 z-10 pointer-events-none"
      >
        <div className="bg-white/95 dark:bg-white p-2.5 pb-3 rounded-2xl shadow-2xl backdrop-blur-md border border-white/40">
          <div className="w-28 lg:w-36 h-20 lg:h-24 rounded-xl overflow-hidden shadow-inner bg-slate-200">
            <img
              src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80"
              alt="Swiss Alps"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-[10px] lg:text-[11px] font-bold text-slate-800 text-center mt-1.5 tracking-tight">
            Swiss Alps
          </p>
        </div>
      </motion.div>

      {/* Floating Polaroid 4: Bottom Right (Santorini / Coast) */}
      <motion.div
        animate={{ y: [5, -6, 5], rotate: [-7, -9, -7] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden md:block absolute bottom-12 right-12 lg:right-20 z-10 pointer-events-none"
      >
        <div className="bg-white/95 dark:bg-white p-2.5 pb-3 rounded-2xl shadow-2xl backdrop-blur-md border border-white/40">
          <div className="w-28 lg:w-36 h-20 lg:h-24 rounded-xl overflow-hidden shadow-inner bg-slate-200">
            <img
              src="https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=400&q=80"
              alt="Santorini, Greece"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-[10px] lg:text-[11px] font-bold text-slate-800 text-center mt-1.5 tracking-tight">
            Santorini, Greece
          </p>
        </div>
      </motion.div>

      {/* Main Glassmorphic Modal Card (Deep black card with subtle zinc border) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-20 max-w-lg sm:max-w-xl w-full bg-[#09090b]/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-9 border border-zinc-800 shadow-2xl shadow-black text-center space-y-6"
      >
        {/* Dynamic Mode-of-Travel Route Arc & Animated Vehicle */}
        <div className="relative w-full h-32 sm:h-36 flex items-center justify-center">
          <svg viewBox="0 0 400 130" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="50%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#fb7185" />
              </linearGradient>

              {/* Road Glow filter */}
              <filter id="roadGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Travel Path: Road Ribbon or Contrail */}
            {travelMode === 'Bike / Motorcycle' && (
              <>
                {/* Winding mountain road ribbon */}
                <path
                  d={transitModeConfig.pathD}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="20"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={transitModeConfig.pathD}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
              </>
            )}

            {travelMode === 'Car / Road Trip' && (
              <>
                {/* Expressway corridor road ribbon */}
                <path
                  d={transitModeConfig.pathD}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="22"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={transitModeConfig.pathD}
                  fill="none"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                />
              </>
            )}

            {travelMode === 'Train' && (
              <>
                {/* Railway track sleepers */}
                <path
                  d={transitModeConfig.pathD}
                  fill="none"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="6"
                  strokeDasharray="3 4"
                  strokeLinecap="butt"
                />
                {/* Rails */}
                <path
                  d={transitModeConfig.pathD}
                  fill="none"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth="1.5"
                />
              </>
            )}

            {travelMode === 'Bus' && (
              <>
                <path
                  d={transitModeConfig.pathD}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="20"
                  strokeLinecap="round"
                />
                <path
                  d={transitModeConfig.pathD}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />
              </>
            )}

            {travelMode === 'Self-Drive Rental' && (
              <>
                <path
                  d={transitModeConfig.pathD}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                <path
                  d={transitModeConfig.pathD}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />
              </>
            )}

            {/* Flight Flight Path Contrail (Default) */}
            {travelMode === 'Flight' && (
              <path
                id="flightTrajectory"
                d={transitModeConfig.pathD}
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="2.5"
                strokeDasharray="6 6"
                strokeLinecap="round"
              />
            )}

            {/* Hidden motion path target for animateMotion */}
            <path
              id="vehicleMotionPath"
              d={transitModeConfig.pathD}
              fill="none"
              stroke="transparent"
            />

            {/* Origin Pin (Left) - White Teardrop Pin matching mockup */}
            <g transform={`translate(${transitModeConfig.originPoint.x}, ${transitModeConfig.originPoint.y})`}>
              <circle cx="0" cy="0" r="10" fill="rgba(255,255,255,0.2)" className="animate-ping" />
              <path
                d="M 0 0 C -3.5 -3.5 -6.5 -7 -6.5 -11.5 A 6.5 6.5 0 1 1 6.5 -11.5 C 6.5 -7 3.5 -3.5 0 0 Z"
                fill="#ffffff"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
              />
              <circle cx="0" cy="-11.5" r="2.4" fill="#2d1b4e" />
            </g>

            {/* Destination Pin (Right) - Yellow Teardrop Pin matching mockup */}
            <g transform={`translate(${transitModeConfig.destPoint.x}, ${transitModeConfig.destPoint.y})`}>
              <circle cx="0" cy="0" r="12" fill="rgba(250, 204, 21, 0.25)" className="animate-ping" />
              <path
                d="M 0 0 C -3.5 -3.5 -6.5 -7 -6.5 -11.5 A 6.5 6.5 0 1 1 6.5 -11.5 C 6.5 -7 3.5 -3.5 0 0 Z"
                fill="#facc15"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
              />
              <circle cx="0" cy="-11.5" r="2.4" fill="#78350f" />
            </g>

            {/* Moving Vehicle along the Path */}
            <g>
              <animateMotion
                dur={transitModeConfig.duration}
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href="#vehicleMotionPath" />
              </animateMotion>

              {/* Mode-Specific SVG Vehicle Graphic Centered at (0,0) */}
              {travelMode === 'Flight' && (
                <g transform="translate(0, 0) rotate(0)">
                  {/* Airplane shadow/glow */}
                  <circle r="8" fill="rgba(255,255,255,0.3)" filter="url(#roadGlow)" />
                  {/* Airplane silhouette pointing forward */}
                  <path
                    d="M 14 0 L -8 -11 L -4 -2 L -14 -4 L -11 0 L -14 4 L -4 2 L -8 11 Z"
                    fill="#ffffff"
                    stroke="#1e1b4b"
                    strokeWidth="0.8"
                  />
                </g>
              )}

              {travelMode === 'Bike / Motorcycle' && (
                <g transform="translate(0, -3)">
                  <circle r="9" fill="rgba(250, 204, 21, 0.35)" filter="url(#roadGlow)" />
                  {/* Touring Motorcycle with Rider Helmet Silhouette */}
                  <g transform="scale(0.85) translate(-12, -10)">
                    {/* Front & Rear Wheels */}
                    <circle cx="5" cy="16" r="4.5" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="21" cy="16" r="4.5" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" />
                    {/* Frame & Engine */}
                    <path d="M 6 16 L 12 11 L 18 11 L 20 16" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                    {/* Fuel Tank & Body */}
                    <path d="M 11 11 L 15 9 L 18 11 Z" fill="#fbbf24" stroke="#ffffff" strokeWidth="0.8" />
                    {/* Handlebar & Windshield */}
                    <path d="M 17 9 L 19 6" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
                    {/* Rider Body & Helmet */}
                    <circle cx="12" cy="5.5" r="3" fill="#ffffff" />
                    <path d="M 12 8.5 L 14 12" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                  </g>
                </g>
              )}

              {travelMode === 'Car / Road Trip' && (
                <g transform="translate(0, -2)">
                  <circle r="9" fill="rgba(255, 255, 255, 0.3)" filter="url(#roadGlow)" />
                  {/* Modern Road Vehicle Silhouette */}
                  <g transform="scale(0.85) translate(-14, -8)">
                    {/* Car Body */}
                    <path
                      d="M 3 11 C 3 9, 6 8, 9 8 L 13 4 C 14 3, 16 3, 19 3 L 23 7 L 27 8 C 29 8, 30 10, 30 11 L 30 14 L 3 14 Z"
                      fill="#ffffff"
                    />
                    {/* Windows */}
                    <path d="M 13 7 L 17 5 L 21 5 L 22 7 Z" fill="#1e293b" />
                    {/* Wheels */}
                    <circle cx="8" cy="14" r="3.2" fill="#0f172a" stroke="#ffffff" strokeWidth="1.2" />
                    <circle cx="24" cy="14" r="3.2" fill="#0f172a" stroke="#ffffff" strokeWidth="1.2" />
                    {/* Headlights glow */}
                    <circle cx="29" cy="10" r="1.5" fill="#fef08a" />
                  </g>
                </g>
              )}

              {travelMode === 'Train' && (
                <g transform="translate(0, -2)">
                  <circle r="9" fill="rgba(255, 255, 255, 0.3)" filter="url(#roadGlow)" />
                  {/* Streamlined Train Locomotive */}
                  <g transform="scale(0.8) translate(-16, -8)">
                    <path
                      d="M 2 13 L 2 5 C 2 3, 4 3, 8 3 L 24 3 C 28 3, 31 7, 32 10 L 32 13 Z"
                      fill="#ffffff"
                    />
                    <path d="M 22 5 L 28 8 L 22 8 Z" fill="#0f172a" />
                    <circle cx="6" cy="14" r="2.5" fill="#0f172a" stroke="#ffffff" strokeWidth="1" />
                    <circle cx="14" cy="14" r="2.5" fill="#0f172a" stroke="#ffffff" strokeWidth="1" />
                    <circle cx="26" cy="14" r="2.5" fill="#0f172a" stroke="#ffffff" strokeWidth="1" />
                    <circle cx="30" cy="11" r="1.5" fill="#fef08a" />
                  </g>
                </g>
              )}

              {travelMode === 'Bus' && (
                <g transform="translate(0, -2)">
                  <circle r="9" fill="rgba(255, 255, 255, 0.3)" filter="url(#roadGlow)" />
                  {/* Sleek Bus Silhouette */}
                  <g transform="scale(0.8) translate(-16, -9)">
                    <rect x="2" y="3" width="29" height="11" rx="2.5" fill="#ffffff" />
                    <rect x="6" y="5" width="5" height="3.5" rx="0.5" fill="#0f172a" />
                    <rect x="13" y="5" width="5" height="3.5" rx="0.5" fill="#0f172a" />
                    <rect x="20" y="5" width="5" height="3.5" rx="0.5" fill="#0f172a" />
                    <circle cx="7" cy="14.5" r="3" fill="#0f172a" stroke="#ffffff" strokeWidth="1" />
                    <circle cx="24" cy="14.5" r="3" fill="#0f172a" stroke="#ffffff" strokeWidth="1" />
                  </g>
                </g>
              )}

              {travelMode === 'Self-Drive Rental' && (
                <g transform="translate(0, -2)">
                  <circle r="9" fill="rgba(56, 189, 248, 0.35)" filter="url(#roadGlow)" />
                  {/* SUV / Rental Vehicle */}
                  <g transform="scale(0.85) translate(-14, -8)">
                    <path
                      d="M 3 11 C 3 9, 5 7, 8 7 L 11 4 C 12 3, 14 3, 21 3 L 26 7 L 29 8 C 30 9, 31 10, 31 12 L 31 14 L 3 14 Z"
                      fill="#ffffff"
                    />
                    <path d="M 12 6 L 19 5 L 23 7 L 12 7 Z" fill="#0f172a" />
                    <circle cx="8" cy="14" r="3.5" fill="#0f172a" stroke="#ffffff" strokeWidth="1.2" />
                    <circle cx="25" cy="14" r="3.5" fill="#0f172a" stroke="#ffffff" strokeWidth="1.2" />
                  </g>
                </g>
              )}
            </g>
          </svg>

          {/* Route Labels below origin and destination */}
          <div className="absolute -bottom-1 left-2 sm:left-4 text-left">
            <span className="text-[10px] sm:text-xs font-extrabold text-white/90 drop-shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              {startCity || 'Origin'}
            </span>
          </div>
          <div className="absolute -bottom-1 right-2 sm:right-4 text-right">
            <span className="text-[10px] sm:text-xs font-extrabold text-amber-300 drop-shadow-sm flex items-center justify-end gap-1">
              <MapPin className="w-3 h-3 text-amber-400" />
              {destinationName || 'Destination'}
            </span>
          </div>
        </div>

        {/* Main Title & Dynamic Subtitle */}
        <div className="space-y-1.5 pt-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
            Crafting your perfect trip...
          </h2>
          <p className="text-xs sm:text-sm text-white/80 font-medium max-w-md mx-auto leading-snug min-h-[38px] flex items-center justify-center">
            {stageInfo.subtitle}
          </p>
        </div>

        {/* Multi-Color Gradient Progress Bar */}
        <div className="space-y-2 max-w-md mx-auto">
          <div className="w-full h-2.5 rounded-full bg-zinc-900 border border-zinc-800 p-0.5 overflow-hidden backdrop-blur-sm">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-amber-400 to-rose-400 shadow-sm shadow-amber-300/40 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(8, progress))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-300 px-1">
            <span>{stageInfo.label}</span>
            <span className="font-extrabold text-amber-300">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Interactive Milestone Check Badges matching mockup */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 pt-1 max-w-lg mx-auto">
          {/* Badge 1: Transit Mode */}
          <div
            className={`flex items-center gap-1.5 py-1.5 px-3 sm:px-3.5 rounded-full border text-xs font-bold transition-all backdrop-blur-md ${
              stageInfo.transitChecked
                ? 'bg-zinc-800/90 border-zinc-700 text-white shadow-sm'
                : 'bg-zinc-900/70 border-zinc-800/80 text-zinc-400'
            }`}
          >
            <span>{transitModeConfig.icon}</span>
            <span>{transitModeConfig.badgeText}</span>
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ml-0.5 transition-all ${
                stageInfo.transitChecked ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
            </span>
          </div>

          {/* Badge 2: Stays */}
          <div
            className={`flex items-center gap-1.5 py-1.5 px-3 sm:px-3.5 rounded-full border text-xs font-bold transition-all backdrop-blur-md ${
              stageInfo.staysChecked
                ? 'bg-zinc-800/90 border-zinc-700 text-white shadow-sm'
                : 'bg-zinc-900/70 border-zinc-800/80 text-zinc-400'
            }`}
          >
            <span>🛏️</span>
            <span>Stays</span>
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ml-0.5 transition-all ${
                stageInfo.staysChecked ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
            </span>
          </div>

          {/* Badge 3: Activities */}
          <div
            className={`flex items-center gap-1.5 py-1.5 px-3 sm:px-3.5 rounded-full border text-xs font-bold transition-all backdrop-blur-md ${
              stageInfo.activitiesChecked
                ? 'bg-zinc-800/90 border-zinc-700 text-white shadow-sm'
                : 'bg-zinc-900/70 border-zinc-800/80 text-zinc-400'
            }`}
          >
            <span>🏔️</span>
            <span>Activities</span>
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ml-0.5 transition-all ${
                stageInfo.activitiesChecked ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
            </span>
          </div>

          {/* Badge 4: Weather */}
          <div
            className={`flex items-center gap-1.5 py-1.5 px-3 sm:px-3.5 rounded-full border text-xs font-bold transition-all backdrop-blur-md ${
              stageInfo.weatherChecked
                ? 'bg-zinc-800/90 border-zinc-700 text-white shadow-sm'
                : 'bg-zinc-900/70 border-zinc-800/80 text-zinc-400'
            }`}
          >
            <span>🌤️</span>
            <span>Weather</span>
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ml-0.5 transition-all ${
                stageInfo.weatherChecked ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
            </span>
          </div>
        </div>

        {/* Footer & Cancel */}
        <div className="pt-2 text-center space-y-1.5">
          <p className="text-[11px] font-medium text-white/60">
            This usually takes a few seconds
          </p>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-semibold text-white/80 hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
