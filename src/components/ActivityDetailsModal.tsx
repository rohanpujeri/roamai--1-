import React from 'react';
import {
  X,
  MapPin,
  Clock,
  Sparkles,
  Camera,
  Compass,
  DollarSign,
  ShieldCheck,
  Share2,
  Navigation,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Activity } from '../types';
import { resolvePlaceImage, handleImageError } from '../utils/placeImages';

interface ActivityDetailsModalProps {
  activity: Activity | null;
  currency: string;
  onClose: () => void;
  onReplace: (activityId: string) => void;
}

export const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({
  activity,
  currency,
  onClose,
  onReplace
}) => {
  if (!activity) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col text-left">
        {/* Modal Image Banner */}
        <div className="relative h-56 shrink-0">
          <img
            src={activity.imageUrl && activity.imageUrl.startsWith('http') && !activity.imageUrl.includes('example.com')
              ? activity.imageUrl
              : resolvePlaceImage(activity.title, activity.category, activity.location)}
            alt={activity.title}
            onError={(e) => handleImageError(e, activity.category)}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-3 left-4 right-4 text-white">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wide">
              {activity.category}
            </span>
            <h3 className="text-xl font-bold mt-1 tracking-tight">{activity.title}</h3>
            <p className="text-xs text-slate-200 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{activity.location}</span>
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Key Metrics row */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Scheduled Time</span>
              <span className="text-xs font-bold text-slate-800">{activity.time}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Est. Duration</span>
              <span className="text-xs font-bold text-slate-800">{activity.duration}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Est. Cost</span>
              <span className="text-xs font-bold text-emerald-700">
                {activity.estimatedCost === 0 ? 'Free' : `${currency}${activity.estimatedCost.toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Overview
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              {activity.description}
            </p>
          </div>

          {/* Recommendation Reason Box */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Personalized Recommendation Context</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {activity.recommendationReason}
            </p>
          </div>

          {/* Insider Tips & Photo Spot */}
          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Camera className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700">
                <strong className="text-slate-900">Best Photo Spot: </strong>
                Arrive around 30 minutes before sunset or early morning for the best golden-hour lighting and low crowd volume.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700">
                <strong className="text-slate-900">Traveller Tip: </strong>
                Keep cash/UPI handy for local parking and regional snack stalls. Dress comfortably in breathable fabrics.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              onReplace(activity.id);
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Replace Stop</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
