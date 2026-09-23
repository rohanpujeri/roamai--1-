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
  onToggleAllPacking?: (allPacked: boolean) => void;
  onAddPackingItem: (name: string, category: PackingItem['category']) => void;
  onToggleRequirement?: (docId: string) => void;
  onToggleBooking?: (bookingId: string) => void;
}

export const PreparationView: React.FC<PreparationViewProps> = ({
  trip,
  onTogglePackingItem,
  onToggleAllPacking,
  onAddPackingItem,
  onToggleRequirement,
  onToggleBooking
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
          <div className="bg-black/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-zinc-800 space-y-5 text-white">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-center font-bold shrink-0">
                  <Luggage className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Personalized Packing List</h3>
                  <p className="text-xs text-zinc-400">Based on {trip.durationDays} days in {trip.destination}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {packingList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onToggleAllPacking && onToggleAllPacking(checkedCount === 0)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title={checkedCount > 0 ? "Unpack all items to start fresh" : "Mark all items as packed"}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{checkedCount > 0 ? 'Unpack All' : 'Pack All'}</span>
                  </button>
                )}

                <button
                  onClick={() => setIsAdding(!isAdding)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            {/* Add item form */}
            {isAdding && (
              <form onSubmit={handleAddNew} className="p-3.5 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Item name (e.g., Extra camera battery)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-700 bg-black text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="px-3 py-2 text-xs rounded-xl border border-zinc-700 bg-black text-zinc-200 font-medium cursor-pointer"
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
                    className="px-3 py-1 text-xs text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Save Item
                  </button>
                </div>
              </form>
            )}

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 border-b border-zinc-800 pb-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
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
                      ? 'bg-zinc-950/60 border-zinc-800/80 opacity-55 hover:opacity-80'
                      : 'bg-zinc-900/90 border-zinc-800 hover:border-emerald-500/60 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="shrink-0">
                      {item.checked ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className={`text-xs font-semibold block truncate ${item.checked ? 'line-through text-zinc-500' : 'text-white'}`}>
                        {item.name}
                      </span>
                      {item.reason && (
                        <p className="text-[10px] text-zinc-400 truncate">{item.reason}</p>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md shrink-0 border border-zinc-700/60">
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
          <div className="bg-black/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-zinc-800 space-y-4 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-950 text-amber-300 border border-amber-800 flex items-center justify-center font-bold shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Government & Official Permits</h3>
                <p className="text-xs text-zinc-400">Mandatory verification & permits</p>
              </div>
            </div>

            <div className="space-y-3">
              {trip.requirements.map((doc) => {
                const isDone = (doc.status as string) === 'Ready' || (doc.status as string) === 'Completed';

                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2.5 transition-colors hover:border-zinc-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                          {doc.type}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-0.5">{doc.title}</h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleRequirement && onToggleRequirement(doc.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 border flex items-center gap-1.5 transition-all cursor-pointer ${
                          isDone
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900 shadow-sm'
                            : 'bg-amber-950 text-amber-300 border-amber-700 hover:bg-amber-900 shadow-sm'
                        }`}
                        title={isDone ? "Click to mark as Action Required" : "Click to mark as Ready / Completed"}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Completed</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Action Required</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {doc.notes}
                    </p>

                    {doc.officialWebsite && (
                      <a
                        href={doc.officialWebsite}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black border border-zinc-800 hover:border-emerald-500 text-xs font-semibold text-emerald-400 transition-colors shadow-2xs"
                      >
                        <span>Official Portal Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Things to Book Checklist */}
          <div className="bg-black/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-zinc-800 space-y-4 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-950 text-teal-300 border border-teal-800 flex items-center justify-center font-bold shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Things to Book</h3>
                <p className="text-xs text-zinc-400">Stays, vehicles & experiences</p>
              </div>
            </div>

            <div className="space-y-3">
              {trip.bookings.map((booking) => {
                const isBooked = booking.status === 'Booked' || (booking.status as string) === 'Confirmed';

                return (
                  <div
                    key={booking.id}
                    className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-900 transition-colors flex items-center justify-between"
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{booking.title}</span>
                        <button
                          type="button"
                          onClick={() => onToggleBooking && onToggleBooking(booking.id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                            isBooked
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                              : 'bg-teal-950 text-teal-300 border-teal-700 hover:bg-teal-900'
                          }`}
                          title={isBooked ? "Click to mark as To Book" : "Click to mark as Confirmed"}
                        >
                          {isBooked ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                              <span>Confirmed</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-2.5 h-2.5 text-teal-400 shrink-0" />
                              <span>To Book</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {booking.provider} • {booking.notes}
                      </p>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs font-extrabold text-white block">
                        {trip.currency}{booking.estimatedCost.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium">approx</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
