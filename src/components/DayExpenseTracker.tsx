import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Trash2,
  Receipt,
  DollarSign,
  PieChart,
  Tag,
  Clock,
  User,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { Trip, DayItinerary, ExpenseItem, ExpenseCategory } from '../types';

interface DayExpenseTrackerProps {
  trip: Trip;
  day: DayItinerary;
  onAddExpense: (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => void;
  onDeleteExpense: (expenseId: string) => void;
  className?: string;
}

const CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; text: string; icon: string }> = {
  Food: { bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800', text: 'text-amber-600', icon: '🍽️' },
  Transit: { bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', text: 'text-blue-600', icon: '🚕' },
  Sightseeing: { bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800', text: 'text-purple-600', icon: '🏛️' },
  Adventure: { bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', text: 'text-emerald-600', icon: '🧗' },
  Relaxation: { bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800', text: 'text-teal-600', icon: '💆' },
  Nightlife: { bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800', text: 'text-rose-600', icon: '🍹' },
  Shopping: { bg: 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800', text: 'text-pink-600', icon: '🛍️' },
  Stay: { bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', text: 'text-indigo-600', icon: '🏨' },
  Culture: { bg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800', text: 'text-orange-600', icon: '🎨' },
  Other: { bg: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700', text: 'text-slate-600', icon: '📦' }
};

export const DayExpenseTracker: React.FC<DayExpenseTrackerProps> = ({
  trip,
  day,
  onAddExpense,
  onDeleteExpense,
  className = ''
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [paidBy, setPaidBy] = useState<string>('Me');
  const [customPaidBy, setCustomPaidBy] = useState<string>('');
  const [isCustomPaidBy, setIsCustomPaidBy] = useState<boolean>(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [quickLogModalActivity, setQuickLogModalActivity] = useState<{
    id: string;
    title: string;
    estimatedCost: number;
    category: string;
  } | null>(null);
  const [quickLogAmount, setQuickLogAmount] = useState<string>('');
  const [quickLogPaidBy, setQuickLogPaidBy] = useState<string>('Me');
  const [quickLogCustomPaidBy, setQuickLogCustomPaidBy] = useState<string>('');
  const [quickLogIsCustomPaidBy, setQuickLogIsCustomPaidBy] = useState<boolean>(false);

  const currency = trip.currency || '₹';

  // Calculate day metrics
  const dayEstimatedCost = day.activities.reduce((acc, act) => acc + act.estimatedCost, 0);
  const allExpenses = trip.expenses || [];
  const dayExpenses = allExpenses.filter((e) => e.dayNumber === day.dayNumber);
  const dayActualCost = dayExpenses.reduce((acc, e) => acc + e.amount, 0);

  const difference = dayEstimatedCost - dayActualCost;
  const isUnderBudget = difference >= 0;
  const percentageSpent = dayEstimatedCost > 0 ? Math.round((dayActualCost / dayEstimatedCost) * 100) : 0;

  // Group members for 'Paid by'
  const groupMembers = trip.preferences.groupMembers || [];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) return;

    const finalPaidBy = isCustomPaidBy ? (customPaidBy.trim() || 'Me') : paidBy;

    onAddExpense({
      dayNumber: day.dayNumber,
      title: title.trim(),
      amount: numAmount,
      category,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paidBy: finalPaidBy,
      activityId: selectedActivityId || undefined,
      notes: notes.trim() || undefined
    });

    // Reset
    setTitle('');
    setAmount('');
    setNotes('');
    setPaidBy('Me');
    setCustomPaidBy('');
    setIsCustomPaidBy(false);
    setSelectedActivityId('');
    setIsFormOpen(false);
  };

  const openQuickLogModal = (activityTitle: string, estimatedCost: number, actCategory: string, actId: string) => {
    setQuickLogModalActivity({
      id: actId,
      title: activityTitle,
      estimatedCost,
      category: actCategory
    });
    setQuickLogAmount(estimatedCost ? estimatedCost.toString() : '');
    setQuickLogPaidBy('Me');
    setQuickLogCustomPaidBy('');
    setQuickLogIsCustomPaidBy(false);
  };

  const handleConfirmQuickLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLogModalActivity) return;

    const numAmount = parseFloat(quickLogAmount);
    if (isNaN(numAmount) || numAmount < 0) return;

    let mappedCat: ExpenseCategory = 'Other';
    if (['Food', 'Sightseeing', 'Adventure', 'Relaxation', 'Culture', 'Nightlife', 'Shopping', 'Transit'].includes(quickLogModalActivity.category)) {
      mappedCat = quickLogModalActivity.category as ExpenseCategory;
    }

    const finalPaidBy = quickLogIsCustomPaidBy
      ? (quickLogCustomPaidBy.trim() || 'Me')
      : quickLogPaidBy;

    onAddExpense({
      dayNumber: day.dayNumber,
      title: quickLogModalActivity.title,
      amount: numAmount,
      category: mappedCat,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paidBy: finalPaidBy,
      activityId: quickLogModalActivity.id,
      notes: 'Logged from planned itinerary activity'
    });

    setQuickLogModalActivity(null);
  };

  return (
    <div className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-xl border border-white/80 dark:border-white/15 transition-all ${className}`}>
      {/* Header: Budget vs Actual Comparison */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Day {day.dayNumber} Expense Tracker & Budget Comparison
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compare actual spending today against estimated day budget
              </p>
            </div>
          </div>
        </div>

        {/* Quick Add Expense Trigger Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm shadow-teal-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isFormOpen ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Close Form</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>+ Input Expense for Today</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Comparison Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3 my-4">
        {/* Card 1: Estimated Budget for the Day */}
        <div className="min-w-0 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl p-3.5 sm:p-4 border border-teal-200/80 dark:border-teal-800/60 overflow-hidden">
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 block mb-1 truncate">
            Planned Day Budget
          </span>
          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 min-w-0">
            <span className="text-xl sm:text-2xl lg:text-xl xl:text-2xl font-extrabold text-teal-700 dark:text-teal-300 tracking-tight">
              {currency}{dayEstimatedCost.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-teal-600/80 dark:text-teal-400/80 whitespace-nowrap">estimated</span>
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1.5 leading-snug">
            Based on {day.activities.length} planned activities
          </p>
        </div>

        {/* Card 2: Actual Spent Today */}
        <div className="min-w-0 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl p-3.5 sm:p-4 border border-teal-200/80 dark:border-teal-800/60 overflow-hidden">
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 block mb-1 truncate">
            Actual Spent Today
          </span>
          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 min-w-0">
            <span className="text-xl sm:text-2xl lg:text-xl xl:text-2xl font-extrabold text-teal-700 dark:text-teal-300 tracking-tight">
              {currency}{dayActualCost.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-teal-600/80 dark:text-teal-400/80 whitespace-nowrap">({dayExpenses.length} entries)</span>
          </div>
          <div className="w-full bg-teal-100 dark:bg-teal-900/50 h-1.5 rounded-full overflow-hidden mt-2.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentageSpent > 100
                  ? 'bg-rose-500'
                  : percentageSpent > 80
                  ? 'bg-amber-500'
                  : 'bg-teal-600'
              }`}
              style={{ width: `${Math.min(100, percentageSpent)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Difference / Savings vs Budget */}
        <div
          className={`min-w-0 rounded-2xl p-3.5 sm:p-4 border transition-all overflow-hidden ${
            isUnderBudget
              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70'
              : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/70'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between gap-1">
            <span className="truncate">Budget Status</span>
            {isUnderBudget ? (
              <span className="text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1 font-bold whitespace-nowrap">
                <TrendingDown className="w-3.5 h-3.5 shrink-0" /> Under
              </span>
            ) : (
              <span className="text-rose-700 dark:text-rose-400 text-xs flex items-center gap-1 font-bold whitespace-nowrap">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" /> Over
              </span>
            )}
          </div>
          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 min-w-0">
            <span
              className={`text-xl sm:text-2xl lg:text-xl xl:text-2xl font-extrabold tracking-tight ${
                isUnderBudget ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {isUnderBudget ? '+' : '-'}{currency}{Math.abs(difference).toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
              {isUnderBudget ? 'saved' : 'exceeded'}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
            {isUnderBudget
              ? `${Math.max(0, 100 - percentageSpent)}% of today's budget left`
              : `Exceeded estimated budget by ${percentageSpent - 100}%`}
          </p>
        </div>
      </div>

      {/* Expandable Expense Input Form */}
      {isFormOpen && (
        <form
          onSubmit={handleFormSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border-2 border-teal-500/40 dark:border-teal-500/50 shadow-md shadow-teal-900/5 mb-5 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <span className="p-1 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                <Receipt className="w-4 h-4" />
              </span>
              <span>Log Expense for Day {day.dayNumber}</span>
            </h4>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {day.date}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3.5">
            {/* Expense Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Expense Description *
              </label>
              <input
                type="text"
                placeholder="e.g. Seafood lunch, cab fare, tickets"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-slate-900 shadow-xs"
              />
            </div>

            {/* Expense Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Amount ({currency}) *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-700 font-extrabold text-sm pointer-events-none z-10">
                  {currency}
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-slate-900 shadow-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-4">
            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-slate-900 cursor-pointer shadow-xs"
              >
                <option value="Food" className="bg-white text-slate-900">🍽️ Food & Dining</option>
                <option value="Transit" className="bg-white text-slate-900">🚕 Transit & Cabs</option>
                <option value="Sightseeing" className="bg-white text-slate-900">🏛️ Sightseeing & Entry</option>
                <option value="Adventure" className="bg-white text-slate-900">🧗 Adventure & Sports</option>
                <option value="Relaxation" className="bg-white text-slate-900">💆 Relaxation & Wellness</option>
                <option value="Nightlife" className="bg-white text-slate-900">🍹 Nightlife & Bars</option>
                <option value="Shopping" className="bg-white text-slate-900">🛍️ Shopping & Souvenirs</option>
                <option value="Stay" className="bg-white text-slate-900">🏨 Stay & Hotel</option>
                <option value="Culture" className="bg-white text-slate-900">🎨 Culture & Heritage</option>
                <option value="Other" className="bg-white text-slate-900">📦 Other</option>
              </select>
            </div>

            {/* Paid By */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Paid By
              </label>
              <select
                value={isCustomPaidBy ? '__custom__' : paidBy}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustomPaidBy(true);
                  } else {
                    setIsCustomPaidBy(false);
                    setPaidBy(e.target.value);
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-slate-900 cursor-pointer shadow-xs"
              >
                <option value="Me" className="bg-white text-slate-900">Me</option>
                {groupMembers.map((m) => (
                  <option key={m.id} value={m.name} className="bg-white text-slate-900">
                    {m.name} (Collaborator)
                  </option>
                ))}
                <option value="__custom__" className="bg-white text-slate-900">✏️ Enter Custom Name...</option>
              </select>

              {isCustomPaidBy && (
                <input
                  type="text"
                  placeholder="Enter payer's name..."
                  value={customPaidBy}
                  onChange={(e) => setCustomPaidBy(e.target.value)}
                  required
                  className="w-full mt-2 px-3 py-2 rounded-xl border border-teal-500 bg-white text-slate-900 placeholder:text-slate-400 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-slate-900 shadow-xs animate-in fade-in duration-150"
                  autoFocus
                />
              )}
            </div>

            {/* Link to Activity (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Link to Activity
              </label>
              <select
                value={selectedActivityId}
                onChange={(e) => {
                  setSelectedActivityId(e.target.value);
                  const found = day.activities.find((a) => a.id === e.target.value);
                  if (found && !title) {
                    setTitle(found.title);
                    if (!amount) setAmount(found.estimatedCost.toString());
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-slate-900 cursor-pointer truncate shadow-xs"
              >
                <option value="" className="bg-white text-slate-900">-- General Day Expense --</option>
                {day.activities.map((a) => (
                  <option key={a.id} value={a.id} className="bg-white text-slate-900">
                    {a.time} - {a.title} ({currency}{a.estimatedCost})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              Save Expense Entry
            </button>
          </div>
        </form>
      )}

      {/* Quick-Log Suggestions from Planned Itinerary */}
      {day.activities.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick-Log Planned Activities:
            </span>
            <span className="text-[11px] text-slate-400">Click stop to log actual cost & payer</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {day.activities.map((act) => {
              const isAlreadyLogged = dayExpenses.some((e) => e.activityId === act.id || e.title === act.title);
              return (
                <button
                  key={act.id}
                  onClick={() => {
                    if (!isAlreadyLogged) {
                      openQuickLogModal(act.title, act.estimatedCost, act.category, act.id);
                    }
                  }}
                  disabled={isAlreadyLogged}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 shrink-0 transition-all ${
                    isAlreadyLogged
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 opacity-80 cursor-default'
                      : 'bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-300 cursor-pointer'
                  }`}
                >
                  {isAlreadyLogged ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  )}
                  <span className="truncate max-w-[160px]">{act.title}</span>
                  <span className="font-bold text-teal-700 dark:text-teal-400">
                    {currency}{act.estimatedCost}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick-Log Interactive Modal Prompt */}
      {quickLogModalActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 w-full max-w-md border-2 border-teal-500 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Quick-Log Stop Expense
                  </h4>
                  <p className="text-xs font-semibold text-slate-500 truncate max-w-[240px]">
                    {quickLogModalActivity.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickLogModalActivity(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmQuickLog} className="space-y-4">
              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Actual Amount Paid ({currency}) *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-700 font-extrabold text-sm pointer-events-none z-10">
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter amount paid"
                    value={quickLogAmount}
                    onChange={(e) => setQuickLogAmount(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-slate-900 shadow-xs"
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-500 mt-1">
                  Estimated cost was {currency}{quickLogModalActivity.estimatedCost}
                </p>
              </div>

              {/* Paid By Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Paid By *
                </label>
                <select
                  value={quickLogIsCustomPaidBy ? '__custom__' : quickLogPaidBy}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setQuickLogIsCustomPaidBy(true);
                    } else {
                      setQuickLogIsCustomPaidBy(false);
                      setQuickLogPaidBy(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-slate-900 cursor-pointer shadow-xs"
                >
                  <option value="Me" className="bg-white text-slate-900">Me</option>
                  {groupMembers.map((m) => (
                    <option key={m.id} value={m.name} className="bg-white text-slate-900">
                      {m.name} (Collaborator)
                    </option>
                  ))}
                  <option value="__custom__" className="bg-white text-slate-900">✏️ Enter Custom Name...</option>
                </select>

                {quickLogIsCustomPaidBy && (
                  <input
                    type="text"
                    placeholder="Enter payer's name..."
                    value={quickLogCustomPaidBy}
                    onChange={(e) => setQuickLogCustomPaidBy(e.target.value)}
                    required
                    className="w-full mt-2 px-3 py-2 rounded-xl border border-teal-500 bg-white text-slate-900 placeholder:text-slate-400 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white focus:text-slate-900 shadow-xs"
                    autoFocus
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickLogModalActivity(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  Confirm & Log Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logged Expenses List for the Day */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recorded Expenses for Day {day.dayNumber} ({dayExpenses.length})
          </h4>
          {dayExpenses.length > 0 && (
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Total Today: {currency}{dayActualCost.toLocaleString()}
            </span>
          )}
        </div>

        {dayExpenses.length === 0 ? (
          <div className="text-center py-6 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30">
            <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              No expenses recorded for Day {day.dayNumber} yet.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">
              Click "+ Input Expense for Today" or use the 1-click quick-log buttons above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayExpenses.map((expense) => {
              const catConfig = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.Other;
              return (
                <div
                  key={expense.id}
                  className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0" role="img" aria-label={expense.category}>
                      {catConfig.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {expense.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catConfig.bg}`}>
                          {expense.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {expense.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {expense.time}
                          </span>
                        )}
                        {expense.paidBy && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Paid by {expense.paidBy}
                          </span>
                        )}
                        {expense.notes && (
                          <span className="truncate max-w-[200px] italic text-slate-400">
                            • {expense.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                      {currency}{expense.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => onDeleteExpense(expense.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                      title="Delete expense entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
