import React, { useState } from 'react';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  PieChart,
  Calendar,
  DollarSign,
  Plus,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Sparkles,
  Layers,
  ArrowRight,
  Trash2,
  Clock,
  User
} from 'lucide-react';
import { Trip, ExpenseItem, ExpenseCategory } from '../types';

interface BudgetOverviewTabProps {
  trip: Trip;
  activeDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  onAddExpense: (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => void;
  onDeleteExpense: (expenseId: string) => void;
}

const CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; text: string; icon: string; hex: string }> = {
  Food: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-600', icon: '🍽️', hex: '#f59e0b' },
  Transit: { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-600', icon: '🚕', hex: '#3b82f6' },
  Sightseeing: { bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-600', icon: '🏛️', hex: '#8b5cf6' },
  Adventure: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-600', icon: '🧗', hex: '#10b981' },
  Relaxation: { bg: 'bg-teal-50 text-teal-700 border-teal-200', text: 'text-teal-600', icon: '💆', hex: '#14b8a6' },
  Nightlife: { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-600', icon: '🍹', hex: '#f43f5e' },
  Shopping: { bg: 'bg-pink-50 text-pink-700 border-pink-200', text: 'text-pink-600', icon: '🛍️', hex: '#ec4899' },
  Stay: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-600', icon: '🏨', hex: '#6366f1' },
  Culture: { bg: 'bg-orange-50 text-orange-700 border-orange-200', text: 'text-orange-600', icon: '🎨', hex: '#f97316' },
  Other: { bg: 'bg-slate-50 text-slate-700 border-slate-200', text: 'text-slate-600', icon: '📦', hex: '#64748b' }
};

export const BudgetOverviewTab: React.FC<BudgetOverviewTabProps> = ({
  trip,
  activeDayNumber,
  onSelectDay,
  onAddExpense,
  onDeleteExpense
}) => {
  const currency = trip.currency || '₹';
  const expenses = trip.expenses || [];

  // Totals
  const totalActivitiesCost = trip.days.reduce(
    (acc, day) => acc + day.activities.reduce((dAcc, a) => dAcc + a.estimatedCost, 0),
    0
  );
  const totalBookingsCost = trip.bookings.reduce((acc, b) => acc + b.estimatedCost, 0);
  const totalEstimatedCost = totalActivitiesCost + totalBookingsCost;
  const totalActualSpent = expenses.reduce((acc, e) => acc + e.amount, 0);
  const tripTargetBudget = trip.targetBudget || totalEstimatedCost;

  const totalDifference = tripTargetBudget - totalActualSpent;
  const isTripUnderBudget = totalDifference >= 0;
  const totalPercentageSpent = tripTargetBudget > 0 ? Math.round((totalActualSpent / tripTargetBudget) * 100) : 0;

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  // Average daily burn calculations
  const avgDailyTarget = Math.round(tripTargetBudget / Math.max(1, trip.durationDays));
  const daysWithExpenses = new Set(expenses.map(e => e.dayNumber)).size || 1;
  const currentDailyBurn = Math.round(totalActualSpent / Math.max(1, daysWithExpenses));

  return (
    <div className="space-y-6">
      {/* AI Budget Intelligence Banner */}
      <div className="bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-slate-900 rounded-3xl p-5 sm:p-6 border border-emerald-500/40 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3" />
                <span>AI Budget Intelligence</span>
              </span>
              <span className="text-xs font-semibold text-emerald-300">
                Optimized for {trip.destination}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Trip Budget & Live Expense Planner
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Real-time telemetry tracking your planned expenditure against on-the-ground spending across all {trip.durationDays} days.
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 bg-slate-900/60 sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-slate-800 sm:border-0">
            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Daily Target Cap</span>
              <span className="text-base sm:text-lg font-black text-emerald-400">
                {currency}{avgDailyTarget.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ day</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Pace</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                currentDailyBurn <= avgDailyTarget
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {currency}{currentDailyBurn.toLocaleString()} / active day
              </span>
            </div>
          </div>
        </div>

        {/* AI Travel Budget Insights Bar */}
        <div className="mt-4 pt-3 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5 mb-1">
              <span>💳</span> Local Payments Advice
            </span>
            <p className="text-[11px] text-slate-300">
              Keep 20% in cash for local markets, street food & auto-rickshaws; cards/UPI work for 80% of stays & cafes.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
            <span className="font-bold text-teal-300 flex items-center gap-1.5 mb-1">
              <span>⚡</span> Transit Cost Optimization
            </span>
            <p className="text-[11px] text-slate-300">
              Book rental scooters or day passes for local travel to cut city transit expenses by up to 35%.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
            <span className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
              <span>🍽️</span> Dining & Buffer Guard
            </span>
            <p className="text-[11px] text-slate-300">
              Allocating {currency}{Math.round(totalActivitiesCost * 0.4).toLocaleString()} for dining leaves a healthy emergency buffer.
            </p>
          </div>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Target Budget */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-5 shadow-xl border border-white/80 dark:border-white/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Trip Target Budget
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {currency}{tripTargetBudget.toLocaleString()}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Planned: {currency}{totalEstimatedCost.toLocaleString()}
            </span>
            {trip.travelMode && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <span>{trip.travelMode === 'Flight' ? '✈️' : trip.travelMode === 'Train' ? '🚆' : trip.travelMode === 'Car / Road Trip' ? '🚗' : trip.travelMode === 'Bus' ? '🚌' : trip.travelMode === 'Bike / Motorcycle' ? '🏍️' : '🚙'}</span>
                <span>{trip.travelMode}</span>
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Actual Spent Across Trip */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-5 shadow-xl border border-white/80 dark:border-white/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Actual Spent
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {currency}{totalActualSpent.toLocaleString()}
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalPercentageSpent > 100
                  ? 'bg-rose-500'
                  : totalPercentageSpent > 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, totalPercentageSpent)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex justify-between">
            <span>{totalPercentageSpent}% of target budget</span>
            <span>{expenses.length} entries recorded</span>
          </p>
        </div>

        {/* Card 3: Remaining Balance / Variance */}
        <div
          className={`rounded-3xl p-5 shadow-xl border transition-all ${
            isTripUnderBudget
              ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Remaining Balance
            </span>
            <div
              className={`p-2 rounded-xl ${
                isTripUnderBudget ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {isTripUnderBudget ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            </div>
          </div>
          <div
            className={`text-3xl font-extrabold ${
              isTripUnderBudget ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
            }`}
          >
            {isTripUnderBudget ? '+' : '-'}{currency}{Math.abs(totalDifference).toLocaleString()}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {isTripUnderBudget
              ? `You are currently saving ${currency}${totalDifference.toLocaleString()}!`
              : `Budget exceeded by ${currency}${Math.abs(totalDifference).toLocaleString()}`}
          </p>
        </div>
      </div>

      {/* Day-by-Day Budget Comparison Table & Progress */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-xl border border-white/80 dark:border-white/15">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-600" />
          <span>Day-by-Day Budget vs Actual Expenses Comparison</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Breakdown of planned daily estimates versus actual money spent per day
        </p>

        <div className="space-y-3">
          {trip.days.map((day) => {
            const dayEstimated = day.activities.reduce((a, act) => a + act.estimatedCost, 0);
            const dayActual = expenses
              .filter((e) => e.dayNumber === day.dayNumber)
              .reduce((a, e) => a + e.amount, 0);
            const dayDiff = dayEstimated - dayActual;
            const isDayUnder = dayDiff >= 0;
            const dayPercent = dayEstimated > 0 ? Math.round((dayActual / dayEstimated) * 100) : 0;

            return (
              <div
                key={day.dayNumber}
                className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 sm:w-1/3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                      Day {day.dayNumber}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {day.theme}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {day.activities.length} planned stops
                  </p>
                </div>

                {/* Progress bar and values */}
                <div className="sm:w-1/3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-400">
                      Actual: {currency}{dayActual.toLocaleString()}
                    </span>
                    <span className="text-slate-400 font-normal">
                      Est: {currency}{dayEstimated.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        dayPercent > 100 ? 'bg-rose-500' : dayPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, dayPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Difference Badge & Action */}
                <div className="sm:w-1/3 flex items-center justify-between sm:justify-end gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      isDayUnder
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {isDayUnder ? '+' : '-'}{currency}{Math.abs(dayDiff).toLocaleString()}{' '}
                    {isDayUnder ? 'saved' : 'over'}
                  </span>

                  <button
                    onClick={() => onSelectDay(day.dayNumber)}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Day {day.dayNumber}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Breakdown & Bookings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-xl border border-white/80 dark:border-white/15">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-600" />
            <span>Spending by Category</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Actual expense distribution
          </p>

          {Object.keys(categoryTotals).length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No expenses recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(categoryTotals).map(([cat, amount]) => {
                const catKey = cat as ExpenseCategory;
                const catConf = CATEGORY_COLORS[catKey] || CATEGORY_COLORS.Other;
                const percent = totalActualSpent > 0 ? Math.round((amount / totalActualSpent) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <span>{catConf.icon}</span>
                        <span>{cat}</span>
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {currency}{amount.toLocaleString()} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${percent}%`, backgroundColor: catConf.hex }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Planned Fixed Bookings / Reservations */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-xl border border-white/80 dark:border-white/15">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Fixed Bookings & Reservations</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Pre-booked accommodation, flights, and rentals ({currency}{totalBookingsCost.toLocaleString()})
          </p>

          <div className="space-y-2.5">
            {trip.bookings.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-800/60 flex items-center justify-between gap-3"
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    {b.title}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {b.type} • {b.provider || 'Confirmed'}
                  </span>
                </div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                  {currency}{b.estimatedCost.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Trip Recorded Expenses Ledger with Delete capability */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-xl border border-white/80 dark:border-white/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-teal-600" />
              <span>All Recorded Expenses Across Trip ({expenses.length})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage and delete individual expense transactions
            </p>
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Total Logged: {currency}{totalActualSpent.toLocaleString()}
          </span>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No expenses logged yet across the trip.
          </div>
        ) : (
          <div className="space-y-2.5">
            {expenses.map((expense) => {
              const catKey = expense.category as ExpenseCategory;
              const catConf = CATEGORY_COLORS[catKey] || CATEGORY_COLORS.Other;
              return (
                <div
                  key={expense.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0" role="img" aria-label={expense.category}>
                      {catConf.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                          Day {expense.dayNumber}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {expense.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catConf.bg}`}>
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
                          <span className="truncate max-w-[220px] italic text-slate-400">
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
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Delete this expense"
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
