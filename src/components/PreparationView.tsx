import React, { useState } from 'react';
import {
  FileText,
  Luggage,
  CalendarCheck,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ExternalLink,
  Plus,
  Shirt,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { Trip, PackingItem } from '../types';

interface PreparationViewProps {
  trip: Trip;
  onTogglePackingItem: (itemId: string) => void;
  onAddPackingItem: (name: string, category: PackingItem['category']) => void;
}

export const PreparationView: React.FC<PreparationViewProps> = ({
  trip,
  onTogglePackingItem,
  onAddPackingItem
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemCategory, setNewItemCategory] = useState<PackingItem['category']>('Clothing');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const categories: ('All' | PackingItem['category'])[] = [
    'All',
    'Clothing',
    'Electronics',
    'Documents',
    'Toiletries',
    'Health & Essentials'
  ];

  const packingList = trip?.packingList || [];
  const filteredPacking = selectedCategory === 'All'
    ? packingList
    : packingList.filter(item => item.category === selectedCategory);

  const checkedCount = packingList.filter(i => i.checked).length;
  const totalCount = packingList.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      onAddPackingItem(newItemName.trim(), newItemCategory);
      setNewItemName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-8 text-left max-w-6xl mx-auto">
      
      {/* Top Banner: Climate & Clothing Advice */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-2">
            <div className="flex items-center gap-2">
              <Shirt className="w-5 h-5 text-emerald-200" />
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-100">
                Weather & Clothing Advisory
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              Prepared for {trip.destination}’s Climate
            </h3>
            <p className="text-sm text-emerald-50 leading-relaxed max-w-2xl font-normal">
              {trip.clothingAdvice}
            </p>
          </div>

          {/* Packing Progress Ring Card */}
          <div className="md:col-span-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-100 block">Packing Readiness</span>
              <span className="text-2xl font-extrabold">{progressPercent}%</span>
              <p className="text-[11px] text-emerald-200 mt-0.5">{checkedCount} of {totalCount} items packed</p>
            </div>
            <div className="w-14 h-14 rounded-full border-4 border-white/20 border-t-white flex items-center justify-center font-bold text-sm">
              {checkedCount}/{totalCount}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Packing Checklist */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-6 shadow-xl border border-white/80 dark:border-white/15 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                  <Luggage className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Personalized Packing List</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Based on {trip.durationDays} days in {trip.destination}</p>
                </div>
              </div>

              <button
                onClick={() => setIsAdding(!isAdding)}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Add item form */}
            {isAdding && (
              <form onSubmit={handleAddNew} className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Item name (e.g., Extra camera battery)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium"
                  >
                    <option value="Clothing">Clothing</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Documents">Documents</option>
                    <option value="Toiletries">Toiletries</option>
                    <option value="Health & Essentials">Health & Essentials</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-3 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Save Item
                  </button>
                </div>
              </form>
            )}

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200/70 dark:border-slate-800 pb-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-slate-900 dark:bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Packing items list */}
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {filteredPacking.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onTogglePackingItem(item.id)}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    item.checked
                      ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-60'
                      : 'bg-white/90 dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700 hover:border-emerald-400 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      {item.checked ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div>
                      <span className={`text-xs font-semibold ${item.checked ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                        {item.name}
                      </span>
                      {item.reason && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.reason}</p>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                    {item.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Documents, Official Permits & Bookings */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Government & Official Requirements */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-6 shadow-xl border border-white/80 dark:border-white/15 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Government & Official Permits</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">Mandatory verification & permits</p>
              </div>
            </div>

            <div className="space-y-3">
              {trip.requirements.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        {doc.type}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{doc.title}</h4>
                    </div>

                    {doc.isPermit ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-bold shrink-0 border border-amber-200 dark:border-amber-800">
                        Permit required
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold shrink-0 border border-emerald-200 dark:border-emerald-800">
                        {doc.status}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {doc.notes}
                  </p>

                  {doc.officialWebsite && (
                    <a
                      href={doc.officialWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-colors shadow-2xs"
                    >
                      <span>Official Portal Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Things to Book Checklist */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-6 shadow-xl border border-white/80 dark:border-white/15 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 flex items-center justify-center font-bold">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Things to Book</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">Stays, vehicles & experiences</p>
              </div>
            </div>

            <div className="space-y-3">
              {trip.bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{booking.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        booking.status === 'Booked'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          : 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {booking.provider} • {booking.notes}
                    </p>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                      {trip.currency}{booking.estimatedCost.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">approx</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
