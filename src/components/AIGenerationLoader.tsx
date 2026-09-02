import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Loader2 } from 'lucide-react';

interface AIGenerationLoaderProps {
  destinationName: string;
}

export const AIGenerationLoader: React.FC<AIGenerationLoaderProps> = ({
  destinationName
}) => {
  return (
    <div className="min-h-screen bg-slate-900/95 backdrop-blur-md text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-gradient-to-tr from-emerald-600/20 via-teal-500/20 to-cyan-500/20 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-sm w-full bg-slate-800/90 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/80 shadow-2xl relative z-10 text-center space-y-5">
        {/* Animated Icon */}
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-2xl bg-emerald-500/20 border border-emerald-500/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Generating Itinerary
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            {destinationName ? `Creating your personalized plan for ${destinationName}...` : 'Preparing your personalized trip plan...'}
          </p>
        </div>

        {/* Minimal spinner */}
        <div className="flex items-center justify-center gap-2 pt-2 text-xs text-emerald-400 font-semibold">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Finalizing authentic places & route...</span>
        </div>
      </div>
    </div>
  );
};

