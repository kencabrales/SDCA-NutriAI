'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles, PlusCircle, Check, Loader2 } from 'lucide-react';

export default function MacroRecommendations({ userId, selectedDate, onLogSuccess }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingId, setLoggingId] = useState(null);
  const [loggedItems, setLoggedItems] = useState({});

  const fetchRecommendations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const date = selectedDate || new Date().toISOString().split('T')[0];
      const res = await fetch(
        `/api/ai/macro-recommendations?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`,
        { cache: 'no-store' }
      );
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Could not load meal recommendations.');
      }
      setData(result);
    } catch (err) {
      console.error('Failed to load AI meal recommendations:', err);
      setError(err.message || 'AI recommendations are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDate]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleQuickLog = async (item) => {
    if (!userId) return;
    const itemId = item.name;
    setLoggingId(itemId);

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
          mealType: item.mealType || 'snacks',
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Could not log this recommendation.');

      setLoggedItems((prev) => ({ ...prev, [itemId]: true }));
      await onLogSuccess?.();
      await fetchRecommendations();
    } catch (err) {
      console.error('Quick Log error:', err);
      setError(err.message || 'Unable to log this meal.');
    } finally {
      setLoggingId(null);
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-400 text-xs">NutriAI is preparing personalized meal ideas...</div>;
  }

  if (error && !data) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white my-4">
        <p className="text-sm text-amber-300">{error}</p>
        <button onClick={fetchRecommendations} className="mt-2 text-xs text-emerald-400 hover:text-emerald-300">
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;
  const { deficit, suggestions = [] } = data;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white my-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <h3 className="font-semibold text-lg">NutriAI Meal Recommendations</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 bg-slate-800/50 p-3 rounded-lg text-sm">
        <div><span className="text-gray-400 block text-xs">Remaining Cal</span><span className="font-bold text-amber-400">{Math.round(deficit?.calories || 0)} kcal</span></div>
        <div><span className="text-gray-400 block text-xs">Remaining Protein</span><span className="font-bold text-emerald-400">{Math.round(deficit?.protein || 0)}g</span></div>
        <div><span className="text-gray-400 block text-xs">Remaining Carbs</span><span className="font-bold text-blue-400">{Math.round(deficit?.carbs || 0)}g</span></div>
        <div><span className="text-gray-400 block text-xs">Remaining Fat</span><span className="font-bold text-rose-400">{Math.round(deficit?.fat || 0)}g</span></div>
      </div>

      <div className="space-y-2">
        {suggestions.length ? suggestions.map((item) => {
          const itemId = item.name;
          const isLogging = loggingId === itemId;
          const isLogged = loggedItems[itemId];

          return (
            <div key={itemId} className="flex items-center justify-between gap-3 p-3 bg-slate-800/80 rounded-lg">
              <div className="min-w-0">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-gray-400">
                  {item.calories} kcal | {item.protein}g protein | {item.carbs}g carbs | {item.fat}g fat
                </p>
                {item.reason && <p className="text-xs text-gray-500 mt-1">{item.reason}</p>}
              </div>
              <button
                onClick={() => handleQuickLog(item)}
                disabled={isLogging || isLogged}
                className={`flex shrink-0 items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition font-medium ${isLogged ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
              >
                {isLogging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isLogged ? <><Check className="w-3.5 h-3.5" />Logged</> : <><PlusCircle className="w-3.5 h-3.5" />Log meal</>}
              </button>
            </div>
          );
        }) : <p className="text-sm text-gray-400">No meal suggestions are available right now.</p>}
      </div>
      {error && <p className="text-xs text-amber-300 mt-3">{error}</p>}
    </div>
  );
}
