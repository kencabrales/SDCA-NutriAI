'use client';

import { useState } from 'react';
import { Sparkles, PlusCircle, Check, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const MEAL_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snacks', label: 'Snack' },
];

export default function MacroRecommendations({ userId, selectedDate, onLogSuccess }) {
  const [expanded, setExpanded] = useState(false);
  const [mealType, setMealType] = useState('dinner');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState(null);
  const [loggingId, setLoggingId] = useState(null);
  const [loggedItems, setLoggedItems] = useState({});

  const fetchRecommendations = async () => {
    if (!userId || loading) return;
    setLoading(true);
    setError('');
    setData(null);

    try {
      const res = await fetch('/api/ai/macro-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          date: selectedDate,
          mealType,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        if (result.usage) setUsage(result.usage);
        throw new Error(result.error || 'Could not load meal recommendations.');
      }
      setData(result);
      setUsage(result.usage || null);
    } catch (err) {
      console.error('Failed to load AI meal recommendations:', err);
      setError(err.message || 'AI recommendations are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLog = async (item) => {
    if (!userId || loggingId) return;
    setLoggingId(item.name);

    try {
      const date = selectedDate || new Date().toISOString().split('T')[0];
      const res = await fetch('/api/food-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          date,
          foodName: item.name,
          amount: 1,
          unit: 'serving',
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          mealType,
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Could not log this recommendation.');

      setLoggedItems((prev) => ({ ...prev, [item.name]: true }));
      await onLogSuccess?.();
      // Do not regenerate suggestions after logging; that would spend another Gemini request.
    } catch (err) {
      console.error('Quick Log error:', err);
      setError(err.message || 'Unable to log this meal.');
    } finally {
      setLoggingId(null);
    }
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white my-4">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full flex items-center justify-between gap-3 text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>
            <span className="block font-semibold text-base">NutriAI Meal Recommendations</span>
            <span className="block text-xs text-gray-400 mt-1">Optional AI suggestions — only uses Gemini when you request them.</span>
          </span>
        </span>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="mt-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex-1 text-xs text-gray-400">
              Choose a meal
              <select
                value={mealType}
                onChange={(event) => { setMealType(event.target.value); setData(null); setError(''); }}
                disabled={loading}
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
              >
                {MEAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={fetchRecommendations}
              disabled={loading}
              className="self-end flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Get AI Suggestions</>}
            </button>
          </div>

          {usage && (
            <p className="text-[11px] text-gray-500 mt-2">
              {usage.remaining} of {usage.dailyLimit} new AI generations remaining today. Cached results do not use another generation.
            </p>
          )}
          {error && <p className="text-sm text-amber-300 mt-4">{error}</p>}

          {data && (
            <div className="mt-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 bg-slate-800/50 p-3 rounded-lg text-sm">
                <div><span className="text-gray-400 block text-xs">Remaining Cal</span><span className="font-bold text-amber-400">{Math.round(data.deficit?.calories || 0)} kcal</span></div>
                <div><span className="text-gray-400 block text-xs">Remaining Protein</span><span className="font-bold text-emerald-400">{Math.round(data.deficit?.protein || 0)}g</span></div>
                <div><span className="text-gray-400 block text-xs">Remaining Carbs</span><span className="font-bold text-blue-400">{Math.round(data.deficit?.carbs || 0)}g</span></div>
                <div><span className="text-gray-400 block text-xs">Remaining Fat</span><span className="font-bold text-rose-400">{Math.round(data.deficit?.fat || 0)}g</span></div>
              </div>

              <div className="space-y-2">
                {(data.suggestions || []).map((item) => {
                  const isLogging = loggingId === item.name;
                  const isLogged = loggedItems[item.name];
                  return (
                    <div key={item.name} className="flex items-center justify-between gap-3 p-3 bg-slate-800/80 rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.calories} kcal | {item.protein}g protein | {item.carbs}g carbs | {item.fat}g fat</p>
                        {item.reason && <p className="text-xs text-gray-500 mt-1">{item.reason}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickLog(item)}
                        disabled={isLogging || isLogged || Boolean(loggingId)}
                        className={`flex shrink-0 items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition font-medium ${isLogged ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                      >
                        {isLogging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isLogged ? <><Check className="w-3.5 h-3.5" />Logged</> : <><PlusCircle className="w-3.5 h-3.5" />Log meal</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
