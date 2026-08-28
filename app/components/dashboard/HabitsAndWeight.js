'use client';

import { useState } from 'react';
import { Scale, Droplet, Dumbbell, Footprints, ChevronRight, Plus, X, Loader2 } from 'lucide-react';

export default function HabitsAndWeight({ 
  user, 
  selectedDate, 
  onOpenWeightTab,
  onUpdateUser,
  todayWater, 
  todaySteps, 
  waterSubtitle, 
  handleWaterAdd, 
  router 
}) {
  // Same field priority as everywhere else in the app (Goals, WeightProgressTab,
  // ProfileHeader): currentWeight is the live source of truth, falling back to
  // the legacy `weight` field. No hardcoded placeholder numbers.
  const currentWeight = user?.currentWeight ?? user?.weight ?? null;
  const goalWeight = user?.goalWeight ?? user?.targetWeight ?? null;
  const unit = user?.weightUnit || 'kg';
  const userId = user?._id || user?.id;

  // Format the real last weigh-in date (stamped by the weight-log API), not
  // whatever date happens to be selected on the dashboard calendar.
  const lastWeighInLabel = (() => {
    if (!user?.lastWeighInDate) return null;
    const parsed = new Date(user.lastWeighInDate);
    if (isNaN(parsed.getTime())) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    if (user.lastWeighInDate === todayStr) return 'Last recorded today';
    return `Last recorded ${parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  })();

  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [quickWeight, setQuickWeight] = useState('');
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const dateError = (() => {
    if (!quickDate) return '';
    const picked = new Date(quickDate);
    const today = new Date();
    picked.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (isNaN(picked.getTime())) return 'Invalid date.';
    if (picked.getTime() > today.getTime()) return 'Date cannot be in the future.';
    return '';
  })();

  const openQuickLog = (e) => {
    e.stopPropagation(); // don't also trigger the card's "open Weight Progress tab" click
    setQuickWeight(currentWeight !== null ? String(currentWeight) : '');
    setQuickDate(new Date().toISOString().split('T')[0]);
    setError('');
    setIsQuickLogOpen(true);
  };

  const closeQuickLog = (e) => {
    e?.stopPropagation();
    setIsQuickLogOpen(false);
  };

  const handleQuickLogSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!quickWeight || dateError || !userId) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/weight-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          weight: Number(quickWeight),
          unit,
          date: quickDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save entry');

      // Same pattern as WeightProgressTab: trust the server's returned user
      // object so this card, Goals, MyProfile, and ProfileHeader all reflect
      // exactly what got saved, in one round trip.
      if (onUpdateUser && data.user) {
        onUpdateUser(data.user);
      }

      setIsQuickLogOpen(false);
      setQuickWeight('');
    } catch (err) {
      console.error('Quick weight log error:', err);
      setError(err.message || 'Failed to save entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
      
      {/* LEFT COLUMN: WEIGHT PROGRESS */}
      <div 
        onClick={onOpenWeightTab}
        className="lg:col-span-6 bg-[#121A2A] border border-gray-800/80 rounded-2xl p-3.5 flex flex-col justify-between hover:border-gray-700 transition-all cursor-pointer group h-full relative"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Weight Progress</h3>
              <p className="text-[9px] text-gray-500">Tap to view history, or + to log now</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openQuickLog}
              title="Log weight"
              className="p-1 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-indigo-400 transition-colors" />
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white tracking-tight">
              {currentWeight ?? '--'}
            </span>
            {currentWeight !== null && (
              <span className="text-xs font-bold text-gray-400">{unit}</span>
            )}
          </div>
          <p className="text-[9px] text-gray-500 mt-0.5">
            {currentWeight !== null
              ? (lastWeighInLabel || 'Weight on file')
              : 'No weight logged yet — tap + to add one'}
          </p>
        </div>

        <div className="bg-[#0B121F] px-2.5 py-1.5 rounded-xl border border-gray-800/80 flex items-center justify-between text-[10px]">
          <span className="text-gray-400">Goal</span>
          <span className="font-bold text-indigo-400">
            {goalWeight !== null ? `${goalWeight} ${unit}` : 'Not set'}
          </span>
        </div>

        {/* QUICK LOG MODAL */}
        {isQuickLogOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <div className="bg-[#162032] border border-gray-800 rounded-2xl w-full max-w-sm p-5 relative shadow-2xl">
              <button onClick={closeQuickLog} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-bold text-white mb-4">Log Weight Entry</h3>

              {error && (
                <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
                  {error}
                </div>
              )}

              <form onSubmit={handleQuickLogSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Weight ({unit})</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    autoFocus
                    value={quickWeight}
                    onChange={(e) => setQuickWeight(e.target.value)}
                    placeholder="e.g. 72.0"
                    className="w-full bg-[#121A2A] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-medium">Date</label>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={quickDate}
                    onChange={(e) => setQuickDate(e.target.value)}
                    className="w-full bg-[#121A2A] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                  {dateError && (
                    <span className="text-[10px] text-red-400 mt-1 block">{dateError}</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !!dateError}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-2.5 rounded-xl text-white transition-all disabled:opacity-50 flex items-center justify-center space-x-2 mt-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Entry</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: HEALTHY HABITS */}
      <div className="lg:col-span-6 bg-[#121A2A] border border-gray-800/80 rounded-2xl p-3.5 space-y-2.5 h-full">
        <h2 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Healthy habits</h2>

        {/* Water Metric Item */}
        <div className="group flex items-center justify-between p-2 rounded-xl bg-[#0B121F]/60 border border-gray-800/50 hover:border-cyan-500/30 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Droplet className="w-3.5 h-3.5 fill-cyan-400/20" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Water</h3>
              <p className="text-[9px] text-gray-400">{waterSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleWaterAdd(250)}
              className="px-1.5 py-0.5 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 text-[9px] font-bold transition-all"
            >
              +250
            </button>
            <button 
              onClick={() => handleWaterAdd(500)}
              className="px-1.5 py-0.5 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 text-[9px] font-bold transition-all"
            >
              +500
            </button>
            {todayWater > 0 && (
              <button 
                onClick={() => handleWaterAdd(-todayWater)}
                className="px-1 py-0.5 rounded-md bg-gray-800 hover:bg-red-950/40 text-gray-400 hover:text-red-400 text-[9px] transition-all"
                title="Reset Water"
              >
                ×
              </button>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-cyan-400 transition-colors ml-0.5" />
          </div>
        </div>


        {/* Steps Metric Item
        <div className="group flex items-center justify-between p-2 rounded-xl bg-[#0B121F]/60 border border-gray-800/50 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Footprints className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Steps</h3>
              <p className="text-[9px] text-gray-400">{todaySteps.toLocaleString()} steps today</p>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-emerald-400 transition-colors" />
        </div> */}

      </div>

    </div>
  );
}