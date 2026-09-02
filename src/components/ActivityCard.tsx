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
  ExternalLink
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
  onToggleComplete
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
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl border transition-all duration-200 text-left overflow-hidden shadow-xl hover:shadow-2xl ${
      activity.isUpdated
        ? 'border-teal-400 ring-2 ring-teal-400/30'
        : 'border-white/80 dark:border-white/15 hover:border-white'
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

      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          
          {/* Activity Image */}
          <div
            onClick={() => onOpenDetails(activity)}
            className="w-full sm:w-36 h-36 sm:h-28 rounded-xl overflow-hidden relative shrink-0 cursor-pointer group shadow-sm"
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
            <div className="absolute top-2 left-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-xs ${getCategoryColor(activity.category)}`}>
                {activity.category}
              </span>
            </div>
            {activity.rating && (
              <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                <span>★</span>
                <span>{activity.rating}</span>
              </div>
            )}
          </div>

          {/* Activity Main Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                {/* Time & Duration badge */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    {activity.time}
                  </span>
                  <span>•</span>
                  <span>{activity.duration}</span>
                  {activity.travelTimeFromPrev && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                        {activity.travelTimeFromPrev}
                      </span>
                    </>
                  )}
                </div>

                {/* Title */}
                <h4
                  onClick={() => onOpenDetails(activity)}
                  className="text-base font-bold text-slate-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {activity.title}
                </h4>
              </div>

              {/* Cost Pill */}
              <div className="text-right shrink-0">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                  {activity.estimatedCost === 0 ? 'Free' : `${currency}${activity.estimatedCost.toLocaleString()}`}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">est. cost</span>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{activity.location}</span>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {activity.description}
            </p>

            {/* "Why this was recommended" AI callout */}
            <div className="p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-950 dark:text-emerald-200 font-medium leading-relaxed">
                <strong className="text-emerald-900 dark:text-emerald-300">Why recommended: </strong>
                {activity.recommendationReason}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Interactive Toolbar */}
        <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          
          {/* Checkbox completion (Only rendered if onToggleComplete is provided, e.g. in Live/Trip modes) */}
          {onToggleComplete ? (
            <button
              onClick={() => onToggleComplete(activity.id)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                activity.completed
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {activity.completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="w-4 h-4 text-slate-400" />
              )}
              <span>{activity.completed ? 'Completed' : 'Mark Visited'}</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenDetails(activity)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Place Details & Tips</span>
            </button>
          )}

          {/* Quick action buttons */}
          <div className="flex items-center gap-1">
            {onToggleComplete && (
              <button
                onClick={() => onOpenDetails(activity)}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Details</span>
              </button>
            )}

            <button
              onClick={() => onReplace(activity.id)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="Replace with alternative place"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replace</span>
            </button>

            {/* Reorder Up/Down */}
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <button
                disabled={isFirst}
                onClick={() => onMoveUp(activity.id)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Move earlier"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={isLast}
                onClick={() => onMoveDown(activity.id)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Move later"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => onRemove(activity.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
              title="Remove activity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
