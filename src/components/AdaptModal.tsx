import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Zap,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { ADAPT_OPTIONS, AdaptOption } from '../services/aiPlanner';

interface AdaptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyAdaptation: (triggerId: string) => void;
  activeDayNumber: number;
}

export const AdaptModal: React.FC<AdaptModalProps> = ({
  isOpen,
  onClose,
  onApplyAdaptation,
  activeDayNumber
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAdapting, setIsAdapting] = useState<boolean>(false);
  const [adaptingStep, setAdaptingStep] = useState<string>('');

  if (!isOpen) return null;

  const handleTrigger = (optionId: string) => {
    setSelectedOptionId(optionId);
    setIsAdapting(true);
    setAdaptingStep('Analyzing real-time conditions…');

    setTimeout(() => {
      setAdaptingStep('Finding optimal alternative spots…');
    }, 600);

    setTimeout(() => {
      setAdaptingStep('Re-routing day schedule & travel times…');
    }, 1200);

    setTimeout(() => {
      setIsAdapting(false);
      onApplyAdaptation(optionId);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="wizard-container-card rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col text-left">
        {/* Header */}
        <div className="wizard-step-card p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900">Something Changed?</h3>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                  Day {activeDayNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Select your changing circumstance to auto-adapt your itinerary.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isAdapting}
            className="w-8 h-8 rounded-full wizard-option-btn text-slate-600 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {isAdapting ? (
            <div className="py-12 text-center space-y-4">
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 blur-lg opacity-40 animate-pulse" />
                <div className="relative w-full h-full rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-xl">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Updating your itinerary…</h4>
                <p className="text-xs text-emerald-700 font-semibold mt-1 font-mono">{adaptingStep}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ADAPT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleTrigger(opt.id)}
                  className="wizard-option-btn p-3.5 rounded-2xl border text-left transition-all group flex flex-col justify-between space-y-2 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">{opt.icon}</span>
                    {opt.badge && (
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                      {opt.label}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-tight mt-1">
                      {opt.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="wizard-step-card p-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI preserves travel logic, open timings & budget.</span>
          </span>
          <button
            onClick={onClose}
            disabled={isAdapting}
            className="wizard-option-btn px-4 py-1.5 rounded-xl border border-slate-200 font-semibold text-slate-700 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
