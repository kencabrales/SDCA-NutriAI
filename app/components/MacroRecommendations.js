"use client";

import { useEffect, useState } from "react";
import { Sparkles, PlusCircle, Check, Loader2 } from "lucide-react";

export default function MacroRecommendations({ userId, selectedDate, onLogSuccess }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingId, setLoggingId] = useState(null);
  const [loggedItems, setLoggedItems] = useState({});

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setLoading(true);
        const res = await fetch(`/api/ai/macro-recommendations?userId=${userId}`);
        const result = await res.json();
        if (result.success) setData(result);
      } catch (err) {
        console.error("Failed to load recommendations:", err);
      } finally {
        setLoading(false);
      }
    }
    if (userId) fetchRecommendations();
  }, [userId]);

  const handleQuickLog = async (item) => {
    if (!userId) return;
    const itemId = item._id || item.id || item.name;
    setLoggingId(itemId);

    try {
      const res = await fetch("/api/food-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          date: selectedDate || new Date().toISOString().split("T")[0],
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          mealType: item.mealType || "snacks",
        }),
      });

      if (res.ok) {
        setLoggedItems((prev) => ({ ...prev, [itemId]: true }));
        if (onLogSuccess) {
          onLogSuccess(); // Triggers real-time dashboard data refresh
        }
      }
    } catch (err) {
      console.error("Quick Log error:", err);
    } finally {
      setLoggingId(null);
    }
  };

  if (loading) return <div className="p-4 text-gray-400">Loading AI Macro Suggestions...</div>;
  if (!data) return null;

  const { deficit, suggestions } = data;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white my-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <h3 className="font-semibold text-lg">Real-Time Macro Optimization</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 bg-slate-800/50 p-3 rounded-lg text-sm">
        <div>
          <span className="text-gray-400 block text-xs">Remaining Cal</span>
          <span className="font-bold text-amber-400">{Math.round(deficit?.calories || 0)} kcal</span>
        </div>
        <div>
          <span className="text-gray-400 block text-xs">Remaining Protein</span>
          <span className="font-bold text-emerald-400">{Math.round(deficit?.protein || 0)}g</span>
        </div>
        <div>
          <span className="text-gray-400 block text-xs">Remaining Carbs</span>
          <span className="font-bold text-blue-400">{Math.round(deficit?.carbs || 0)}g</span>
        </div>
        <div>
          <span className="text-gray-400 block text-xs">Remaining Fat</span>
          <span className="font-bold text-rose-400">{Math.round(deficit?.fat || 0)}g</span>
        </div>
      </div>

      <h4 className="text-xs uppercase text-gray-400 tracking-wider font-bold mb-3">
        Suggested Smart Meals
      </h4>

      <div className="space-y-2">
        {suggestions && suggestions.length > 0 ? (
          suggestions.map((item) => {
            const itemId = item._id || item.id || item.name;
            const isLogging = loggingId === itemId;
            const isLogged = loggedItems[itemId];

            return (
              <div
                key={itemId}
                className="flex items-center justify-between p-3 bg-slate-800/80 rounded-lg hover:bg-slate-800 transition"
              >
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-gray-400">
                    {item.calories} kcal | {item.protein}g Protein | {item.carbs}g Carbs
                  </p>
                </div>
                <button
                  onClick={() => handleQuickLog(item)}
                  disabled={isLogging || isLogged}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition font-medium ${
                    isLogged
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  {isLogging ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isLogged ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Logged
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      Quick Log
                    </>
                  )}
                </button>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-400">Daily macro targets reached!</p>
        )}
      </div>
    </div>
  );
}