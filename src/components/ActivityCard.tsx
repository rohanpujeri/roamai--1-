import React from 'react';
import {
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  MoreVertical,
  RefreshCw,
  Trash2,
  ChevronUp,
  ChevronDown,
  Info,
  CheckCircle2,
  Circle,
  ExternalLink,
  Plus
} from 'lucide-react';
import { Activity } from '../types';
import { resolvePlaceImage, handleImageError } from '../utils/placeImages';

interface ActivityCardProps {
  activity: Activity;
  currency: string;
  isFirst: boolean;
  isLast: boolean;
  onOpenDetails: (activity: Activity) => void;
  onReplace: (activityId: string) => void;
  onMoveUp: (activityId: string) => void;
  onMoveDown: (activityId: string) => void;
  onRemove: (activityId: string) => void;
  onToggleComplete?: (activityId: string) => void;
  onAddPlace?: () => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  currency,
  isFirst,
  isLast,
  onOpenDetails,
  onReplace,
  onMoveUp,
  onMoveDown,
  onRemove,
  onToggleComplete,
  onAddPlace
}) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Food':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'Sightseeing':
        return 'bg-blue-100 text-blue-900 border-blue-200';
      case 'Adventure':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'Relaxation':
        return 'bg-teal-100 text-teal-900 border-teal-200';
      case 'Culture':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'Nightlife':
        return 'bg-rose-100 text-rose-900 border-rose-200';
      case 'Shopping':
        return 'bg-cyan-100 text-cyan-900 border-cyan-200';
      case 'Transit':
      case 'Logistics':
        return 'bg-indigo-100 text-indigo-900 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className={`bg-black dark:bg-black backdrop-blur-2xl rounded-2xl border transition-all duration-200 text-left overflow-hidden shadow-2xl hover:shadow-emerald-950/20 ${
      activity.isUpdated
        ? 'border-teal-400 ring-2 ring-teal-400/30'
        : 'border-zinc-800 hover:border-zinc-700'
    }`}>
      {/* Updated AI adaptation notification banner */}
      {activity.isUpdated && (
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-1.5 text-white flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{activity.updatedReason || '✨ AI Adapted Activity'}</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Updated
          </span>
        </div>
      )}

      <div className="p-2 sm:p-2.5">
        <div className="flex flex-row items-start gap-2 sm:gap-2.5">
          
          {/* Activity Image */}
          <div
            onClick={() => onOpenDetails(activity)}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden relative shrink-0 cursor-pointer group shadow-xs"
          >
            <img
              src={activity.imageUrl && activity.imageUrl.startsWith('http') && !activity.imageUrl.includes('example.com')
                ? activity.imageUrl
                : resolvePlaceImage(activity.title, activity.category, activity.location)}
              alt={activity.title}
              onError={(e) => handleImageError(e, activity.category)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
            <div className="absolute top-1 left-1">
              <span className={`text-[8px] font-extrabold px-1 py-0.2 rounded border shadow-xs ${getCategoryColor(activity.category)}`}>
                {activity.category}
              </span>
            </div>
            {activity.rating && (
              <div className="absolute bottom-1 left-1 bg-slate-900/80 backdrop-blur-xs text-white text-[8px] font-bold px-1 py-0.2 rounded flex items-center gap-0.5">
                <span>★</span>
                <span>{activity.rating}</span>
              </div>
            )}
          </div>

          {/* Activity Main Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0 flex-1">
                {/* Time & Duration badge */}
                <div className="flex flex-wrap items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-zinc-400 mb-0.5">
                  <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-200 border border-zinc-800 font-bold flex items-center gap-0.5 text-[9px]">
                    <Clock className="w-2.5 h-2.5 text-emerald-400" />
                    {activity.time}
                  </span>
                  <span>•</span>
                  <span>{activity.duration}</span>
                  {activity.travelTimeFromPrev && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-medium">
                        {activity.travelTimeFromPrev}
                      </span>
                    </>
                  )}
                </div>

                {/* Title */}
                <h4
                  onClick={() => onOpenDetails(activity)}
                  className="text-xs sm:text-[13px] font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer leading-tight truncate"
                  title={activity.title}
                >
                  {activity.title}
                </h4>
              </div>

              {/* Cost Pill */}
              <div className="text-right shrink-0">
                <span className="text-[11px] sm:text-xs font-black text-white block leading-none">
                  {activity.estimatedCost === 0 ? 'Free' : `${currency}${activity.estimatedCost.toLocaleString()}`}
                </span>
                <span className="text-[8px] text-zinc-400 font-medium">est. cost</span>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
              <MapPin className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
              <span className="truncate">{activity.location}</span>
            </div>

            {/* Description */}
            <p className="text-[10px] text-zinc-300 line-clamp-1 leading-normal">
              {activity.description}
            </p>

            {/* "Why this was recommended" AI callout */}
            <div className="p-1 rounded bg-emerald-950/60 border border-emerald-800/80 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
              <p className="text-[9px] text-emerald-200 font-medium truncate leading-tight">
                <strong className="text-emerald-300">Why: </strong>
                {activity.recommendationReason}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Interactive Toolbar */}
        <div className="mt-1.5 pt-1.5 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-1">
          
          {/* Checkbox completion */}
          {onToggleComplete ? (
            <button
              onClick={() => onToggleComplete(activity.id)}
              className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                activity.completed
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                  : 'text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              {activity.completed ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <Circle className="w-3 h-3 text-zinc-500" />
              )}
              <span>{activity.completed ? 'Visited' : 'Check-in'}</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenDetails(activity)}
              className="px-1.5 py-0.5 text-[10px] font-semibold text-zinc-200 hover:text-emerald-400 hover:bg-zinc-900 rounded transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-2.5 h-2.5" />
              <span>Details & Tips</span>
            </button>
          )}

          {/* Quick action buttons */}
          <div className="flex items-center gap-1">
            {onToggleComplete && (
              <button
                onClick={() => onOpenDetails(activity)}
                className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Info className="w-2.5 h-2.5" />
                <span>Tips</span>
              </button>
            )}

            {isLast && onAddPlace && (
              <button
                type="button"
                onClick={onAddPlace}
                className="px-2.5 py-1 text-[11px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                title="Add a place nearby to this stop"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add a Place</span>
              </button>
            )}

            <button
              onClick={() => onReplace(activity.id)}
              className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded transition-colors flex items-center gap-1 cursor-pointer"
              title="Replace with alternative place"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Replace</span>
            </button>

            {/* Reorder Up/Down */}
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
              <button
                disabled={isFirst}
                onClick={() => onMoveUp(activity.id)}
                className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Move earlier"
              >
                <ChevronUp className="w-2.5 h-2.5" />
              </button>
              <button
                disabled={isLast}
                onClick={() => onMoveDown(activity.id)}
                className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Move later"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>

            <button
              onClick={() => onRemove(activity.id)}
              className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
              title="Remove activity"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
