import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  RefreshCw,
  Check,
  MapPin,
  Clock,
  DollarSign,
  ArrowRight,
  Filter,
  Layers,
  ChevronRight,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { Activity, TravelStyle } from '../types';
import { resolvePlaceImage, handleImageError } from '../utils/placeImages';
import { AlternativePlaceOption, getAlternativeOptionsForActivity } from '../services/alternativePlaces';

interface ReplaceActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
  destination: string;
  currency: string;
  userStyles?: TravelStyle[];
  onConfirmReplace: (oldActivityId: string, chosenAlternative: AlternativePlaceOption) => void;
}

export const ReplaceActivityModal: React.FC<ReplaceActivityModalProps> = ({
  isOpen,
  onClose,
  activity,
  destination,
  currency,
  userStyles = [],
  onConfirmReplace
}) => {
  if (!isOpen || !activity) return null;

  // Initial alternatives generated for this activity & destination
  const [seed, setSeed] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

  // Generate options based on destination, activity and seed
  const rawAlternatives = useMemo(() => {
    return getAlternativeOptionsForActivity(destination, activity, userStyles);
  }, [destination, activity, seed]);

  // Filter alternatives by category
  const filteredAlternatives = useMemo(() => {
    if (selectedCategory === 'All') return rawAlternatives;
    return rawAlternatives.filter((opt) => opt.category === selectedCategory);
  }, [rawAlternatives, selectedCategory]);

  // Set default selection to first item if none selected or if filtered out
  const activeOption = useMemo(() => {
    const found = filteredAlternatives.find((opt) => opt.id === selectedOptionId);
    return found || filteredAlternatives[0] || null;
  }, [filteredAlternatives, selectedOptionId]);

  const categories = useMemo(() => {
    const cats = new Set<string>(['All']);
    rawAlternatives.forEach((a) => cats.add(a.category));
    return Array.from(cats);
  }, [rawAlternatives]);

  const handleRegenerateMore = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      setSeed((prev) => prev + 1);
      setIsRegenerating(false);
    }, 450);
  };

  const handleConfirm = () => {
    if (activeOption) {
      onConfirmReplace(activity.id, activeOption);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="wizard-container-card rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200/90 max-h-[92vh] flex flex-col text-left animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="wizard-step-card p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shrink-0 mt-0.5">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold uppercase tracking-wider">
                  AI Place Alternatives
                </span>
                <span className="text-xs font-semibold text-slate-500">• {destination}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                Choose an Alternative Place
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Replacing <strong className="text-slate-800 font-semibold">{activity.title}</strong> ({activity.time}) with a curated option that matches your travel vibe.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full wizard-option-btn text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Place Pill Preview */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2 truncate">
            <span className="text-slate-400 font-medium shrink-0">Current:</span>
            <span className="font-bold text-slate-800 truncate">{activity.title}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold shrink-0">
              {activity.category}
            </span>
          </div>
          <span className="font-semibold text-slate-500 shrink-0">
            {activity.estimatedCost === 0 ? 'Free' : `${currency}${activity.estimatedCost.toLocaleString()}`}
          </span>
        </div>

        {/* Category Filters Bar */}
        <div className="px-5 sm:px-6 pt-3 pb-2 flex items-center justify-between gap-3 border-b border-slate-100/80 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`wizard-option-btn px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'is-selected font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={handleRegenerateMore}
            disabled={isRegenerating}
            className="wizard-option-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>{isRegenerating ? 'Generating…' : 'AI Refresh'}</span>
          </button>
        </div>

        {/* Options List / Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1 max-h-[480px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredAlternatives.map((option) => {
              const isSelected = activeOption?.id === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => setSelectedOptionId(option.id)}
                  className={`wizard-option-card p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group ${
                    isSelected
                      ? 'is-selected border-emerald-600 bg-emerald-50/60 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  {/* Top Image + Quick info row */}
                  <div className="flex items-start gap-3">
                    <div className="w-20 h-20 rounded-xl overflow-hidden relative shrink-0 bg-slate-100">
                      <img
                        src={option.imageUrl && option.imageUrl.startsWith('http') && !option.imageUrl.includes('example.com')
                          ? option.imageUrl
                          : resolvePlaceImage(option.title, option.category, option.location, destination)}
                        alt={option.title}
                        onError={(e) => handleImageError(e, option.category)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-1 left-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900/80 text-white backdrop-blur-xs">
                          {option.category}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors">
                          {option.title}
                        </h4>
                        <div className="shrink-0 flex items-center gap-1">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded-md">
                              {option.matchScore}% Match
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{option.location}</span>
                      </p>

                      <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-slate-600">
                        <span>★ {option.rating}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">
                          {option.estimatedCost === 0 ? 'Free' : `${currency}${option.estimatedCost.toLocaleString()}`}
                        </span>
                        <span>•</span>
                        <span>{option.duration}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {option.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {option.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60"
                      >
                        {tag}
                      </span>
                    ))}
                    {option.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 border border-teal-200/80 ml-auto">
                        {option.badge}
                      </span>
                    )}
                  </div>

                  {/* Why recommended callout */}
                  <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-[11px] text-emerald-950 flex items-start gap-1.5 leading-tight">
                    <Sparkles className="w-3 h-3 text-emerald-700 shrink-0 mt-0.5" />
                    <span>{option.recommendationReason}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAlternatives.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm font-semibold text-slate-600">No alternatives found for {selectedCategory}.</p>
              <button
                onClick={() => setSelectedCategory('All')}
                className="text-xs font-bold text-emerald-700 underline"
              >
                View all categories
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="wizard-step-card p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 hidden sm:block">
            {activeOption ? (
              <span>Selected: <strong className="text-slate-800 font-bold">{activeOption.title}</strong></span>
            ) : (
              <span>Select an option to replace current place</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="wizard-option-btn px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirm}
              disabled={!activeOption}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Confirm & Swap Place</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
