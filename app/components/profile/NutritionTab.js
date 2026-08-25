// components/profile/NutritionTab.js
'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { ChevronLeft, ChevronRight, Loader2, Droplet, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getPHDateParts,
  dateStringToUTCAnchor,
  utcAnchorToDateString,
  addDaysUTC,
  getUTCDayOfWeek,
  getShortMonthLabel,
} from '@/lib/dateUtils';

// Goals pulled straight from the same user fields Goals already manages — no
// separate goal system. When a specific micronutrient goal hasn't been set,
// falls back to the same age/sex-aware RDA-ish default GoalsTab's
// calculateAutoTargets() uses, instead of one flat number for everyone.
function deriveUserGoals(user) {
  let age = Number(user?.age) || 25;
  const dobRaw = user?.dob || user?.dateOfBirth;
  if (dobRaw) { 
    const dob = new Date(dobRaw);
    if (!isNaN(dob.getTime())) {
      const today = new Date();
      let computedAge = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) computedAge--;
      if (computedAge > 0) age = computedAge;
    }
  }
  const sex = String(user?.sex || user?.gender || 'male').toLowerCase();

  return {
    calories: Number(user?.targetCalories) || 2000,
    carbs: Number(user?.targetCarbs ?? user?.carbsGrams) || 200,
    protein: Number(user?.targetProtein ?? user?.proteinGrams) || 150,
    fat: Number(user?.targetFat ?? user?.fatGrams) || 67,
    waterMl: Number(user?.waterGoalMl) || 2500,
    fiber: Number(user?.fiberGoal) || 28,
    sugar: Number(user?.sugarGoal) || 50,
    potassium: Number(user?.potassiumGoal) || (sex === 'female' ? 2600 : 3400),
    sodium: Number(user?.sodiumGoal) || (age > 50 ? 1500 : 2300),
    saturatedFat: Number(user?.satFatGoal) || 22,
    transFat: Number(user?.transFatGoal) || 2,
    cholesterol: Number(user?.cholesterolGoal) || (age > 50 ? 200 : 300),
    vitaminA: Number(user?.vitaminAGoal) || (sex === 'female' ? 700 : 900),
    vitaminC: Number(user?.vitaminCGoal) || (sex === 'female' ? 75 : 90),
    calcium: Number(user?.calciumGoal) || ((sex === 'female' && age > 50) || age > 70 ? 1200 : 1000),
    iron: Number(user?.ironGoal) || (sex === 'female' && age <= 50 ? 18 : 8),
    vitaminB12: Number(user?.vitaminB12Goal) || 2.4,
    vitaminD: Number(user?.vitaminDGoal) || (age > 70 ? 800 : 600),
  };
}

const MEAL_GREEN_COLORS = {
  Breakfast: '#86EFAC',
  Lunch: '#10B981',
  Dinner: '#047857',
  Snacks: '#A3E635'
};

const NUMERIC_KEYS = [
  'calories', 'carbs', 'fat', 'protein', 'breakfast', 'lunch', 'dinner', 'snack',
  'fiber', 'sugar', 'potassium', 'sodium', 'satFat', 'transFat', 'cholesterol',
  'vitaminA', 'vitaminC', 'calcium', 'iron', 'vitaminB12', 'vitaminD',
];

const PERIOD_LABELS = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0f172a] border border-slate-700/80 p-3 rounded-xl shadow-xl font-sans text-xs space-y-1 text-slate-200">
        <p className="font-bold text-slate-100 border-b border-slate-800 pb-1 mb-1 font-mono">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-400 capitalize">{entry.name}:</span>
            </span>
            <span className="font-mono font-semibold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function NutritionTab({ user }) {
  const userId = user?._id || user?.id;

  const [activeTab, setActiveTab] = useState('calories');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Weekly / Monthly / Yearly view, each with its own offset from "now"
  // (0 = current period, -1 = previous period, etc.)
  const [period, setPeriod] = useState('weekly');
  const [rangeOffset, setRangeOffset] = useState(0);

  const [analyticsData, setAnalyticsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userGoals = useMemo(() => deriveUserGoals(user), [user]);

  // Reset the offset whenever you switch period types, so flipping from
  // Weekly to Monthly doesn't leave you looking at "3 months ago" by accident.
  useEffect(() => {
    setRangeOffset(0);
  }, [period]);

  // The date window being viewed — computed entirely in Philippine time via
  // lib/dateUtils.js, then anchored to neutral UTC-noon Dates for the actual
  // day-math so nothing here can drift a day depending on server/browser tz.
  const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    const todayParts = getPHDateParts();

    if (period === 'yearly') {
      const year = todayParts.year + rangeOffset;
      const startAnchor = new Date(Date.UTC(year, 0, 1));
      const endAnchor = new Date(Date.UTC(year, 11, 31));
      return {
        rangeStart: utcAnchorToDateString(startAnchor),
        rangeEnd: utcAnchorToDateString(endAnchor),
        rangeLabel: `${year}`,
      };
    }

    if (period === 'monthly') {
      const totalMonthIndex = todayParts.year * 12 + (todayParts.month - 1) + rangeOffset;
      const year = Math.floor(totalMonthIndex / 12);
      const month = ((totalMonthIndex % 12) + 12) % 12; // 0-11, safe for negative offsets
      const startAnchor = new Date(Date.UTC(year, month, 1));
      const endAnchor = new Date(Date.UTC(year, month + 1, 0)); // day 0 of next month = last day of this one
      const label = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(startAnchor);
      return {
        rangeStart: utcAnchorToDateString(startAnchor),
        rangeEnd: utcAnchorToDateString(endAnchor),
        rangeLabel: label,
      };
    }

    // weekly (default) — Sunday-to-Saturday, anchored to PH "today"
    const todayAnchor = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day));
    const base = addDaysUTC(todayAnchor, rangeOffset * 7);
    const dayOfWeek = getUTCDayOfWeek(base);
    const startAnchor = addDaysUTC(base, -dayOfWeek);
    const endAnchor = addDaysUTC(startAnchor, 6);
    const fmt = (a) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(a);
    return {
      rangeStart: utcAnchorToDateString(startAnchor),
      rangeEnd: utcAnchorToDateString(endAnchor),
      rangeLabel: `${fmt(startAnchor)} — ${fmt(endAnchor)}`,
    };
  }, [period, rangeOffset]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setAnalyticsData([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    fetch(`/api/nutrition-analytics?userId=${userId}&start=${rangeStart}&end=${rangeEnd}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load nutrition data');
        return data;
      })
      .then((data) => {
        if (!cancelled) setAnalyticsData(data.analyticsData || []);
      })
      .catch((err) => {
        console.error('Nutrition analytics fetch error:', err);
        if (!cancelled) setError(err.message || 'Failed to load nutrition data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId, rangeStart, rangeEnd]);

  const chartData = useMemo(() => {
    if (!analyticsData.length) return [];

    const startAnchor = dateStringToUTCAnchor(rangeStart);
    const withDates = analyticsData.map((row, index) => {
      const rowDate = row.fullDate || utcAnchorToDateString(addDaysUTC(startAnchor, index));
      return { ...row, __date: rowDate };
    });

    if (period === 'yearly') {
      const buckets = Array.from({ length: 12 }, (_, i) => {
        const b = { day: getShortMonthLabel(i), _count: 0 };
        NUMERIC_KEYS.forEach((k) => { b[k] = 0; });
        return b;
      });

      withDates.forEach((row) => {
        const monthIdx = Number(row.__date.split('-')[1]) - 1;
        const bucket = buckets[monthIdx];
        if (!bucket) return;
        NUMERIC_KEYS.forEach((k) => { bucket[k] += Number(row[k]) || 0; });
        bucket._count += 1;
      });

      // Show monthly AVERAGES so the yearly view is comparable month-to-month
      // regardless of how many days were actually logged in each one.
      return buckets.map((b) => {
        const count = b._count || 1;
        const out = { day: b.day };
        NUMERIC_KEYS.forEach((k) => { out[k] = Math.round((b[k] / count) * 10) / 10; });
        return out;
      });
    }

    return withDates.map((row) => {
      const anchor = dateStringToUTCAnchor(row.__date);
      const label = period === 'monthly'
        ? String(anchor.getUTCDate())
        : new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(anchor).toUpperCase();
      const { __date, ...rest } = row;
      return { ...rest, day: label };
    });
  }, [analyticsData, period, rangeStart]);

  // Best-effort water average over the viewed range — water isn't stored in
  // the database anywhere in this app yet (only per-day localStorage on the
  // dashboard), so this only reflects days logged on THIS browser/device.
  const avgWaterMl = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    let total = 0;
    let daysWithData = 0;
    let totalDaysInRange = 0;
    let cursor = dateStringToUTCAnchor(rangeStart);
    const endAnchor = dateStringToUTCAnchor(rangeEnd);
    while (cursor.getTime() <= endAnchor.getTime()) {
      totalDaysInRange++;
      const key = utcAnchorToDateString(cursor);
      const val = localStorage.getItem(`water_${key}`);
      if (val !== null) {
        total += parseInt(val, 10) || 0;
        daysWithData++;
      }
      cursor = addDaysUTC(cursor, 1);
    }
    return totalDaysInRange > 0 ? Math.round(total / totalDaysInRange) : 0;
  }, [rangeStart, rangeEnd, analyticsData]);

  const totals = useMemo(() => {
    const count = analyticsData.length || 1;
    const sum = (key) => analyticsData.reduce((a, b) => a + (b[key] || 0), 0);

    const sumCal = sum('calories');
    const sumCarbs = sum('carbs');
    const sumFat = sum('fat');
    const sumProtein = sum('protein');

    const sumBreakfast = sum('breakfast');
    const sumLunch = sum('lunch');
    const sumDinner = sum('dinner');
    const sumSnack = sum('snack');

    const avgCal = Math.round(sumCal / count);
    const avgCarbs = Math.round(sumCarbs / count);
    const avgFat = Math.round(sumFat / count);
    const avgProtein = Math.round(sumProtein / count);

    const avgFiber = Math.round(sum('fiber') / count);
    const avgSugar = Math.round(sum('sugar') / count);
    const avgPotassium = Math.round(sum('potassium') / count);
    const avgSodium = Math.round(sum('sodium') / count);
    const avgSatFat = Math.round(sum('satFat') / count);
    const avgTransFat = parseFloat((sum('transFat') / count).toFixed(1));
    const avgCholesterol = Math.round(sum('cholesterol') / count);
    const avgVitaminA = Math.round(sum('vitaminA') / count);
    const avgVitaminC = Math.round(sum('vitaminC') / count);
    const avgCalcium = Math.round(sum('calcium') / count);
    const avgIron = parseFloat((sum('iron') / count).toFixed(1));
    const avgVitaminB12 = parseFloat((sum('vitaminB12') / count).toFixed(1));
    const avgVitaminD = parseFloat((sum('vitaminD') / count).toFixed(1));

    const totalMealCal = sumBreakfast + sumLunch + sumDinner + sumSnack || 1;

    const avgMealMacros = ['breakfast', 'lunch', 'dinner', 'snack'].reduce((acc, meal) => {
      acc[meal] = {
        protein: Math.round(analyticsData.reduce((a, b) => a + (b.mealMacros?.[meal]?.protein || 0), 0) / count),
        carbs: Math.round(analyticsData.reduce((a, b) => a + (b.mealMacros?.[meal]?.carbs || 0), 0) / count),
        fat: Math.round(analyticsData.reduce((a, b) => a + (b.mealMacros?.[meal]?.fat || 0), 0) / count),
      };
      return acc;
    }, {});

    const totalMacroGrams = avgCarbs + avgFat + avgProtein || 1;
    const hasAnyData = sumCal > 0;

    return {
      sumCal,
      avgCal,
      avgCarbs,
      avgFat,
      avgProtein,
      avgFiber,
      avgSugar,
      avgPotassium,
      avgSodium,
      avgSatFat,
      avgTransFat,
      avgCholesterol,
      avgVitaminA,
      avgVitaminC,
      avgCalcium,
      avgIron,
      avgVitaminB12,
      avgVitaminD,
      sumBreakfast,
      sumLunch,
      sumDinner,
      sumSnack,
      avgMealMacros,
      hasAnyData,
      breakfastPct: totalMealCal > 1 ? Math.round((sumBreakfast / totalMealCal) * 100) : 0,
      lunchPct: totalMealCal > 1 ? Math.round((sumLunch / totalMealCal) * 100) : 0,
      dinnerPct: totalMealCal > 1 ? Math.round((sumDinner / totalMealCal) * 100) : 0,
      snackPct: totalMealCal > 1 ? Math.round((sumSnack / totalMealCal) * 100) : 0,
      carbsPct: Math.round((avgCarbs / totalMacroGrams) * 100),
      fatPct: Math.round((avgFat / totalMacroGrams) * 100),
      proteinPct: Math.round((avgProtein / totalMacroGrams) * 100),
      // Scales with however many days are actually in the viewed range
      // (7 for weekly, 28-31 for monthly, 365/366 for yearly) instead of a
      // hardcoded 7, so this stays correct across all three period types.
      calUnderGoal: (userGoals.calories * count) - sumCal,
    };
  }, [analyticsData, userGoals]);

  const mealDistributionData = useMemo(() => {
    return chartData.map((d) => ({
      day: d.day,
      Breakfast: d.breakfast || 0,
      Lunch: d.lunch || 0,
      Dinner: d.dinner || 0,
      Snacks: d.snack || 0,
    }));
  }, [chartData]);

  const mealMacroComparisonData = useMemo(() => {
    if (!totals.avgMealMacros?.breakfast) return [];
    return [
      { meal: 'Breakfast', Protein: totals.avgMealMacros.breakfast.protein, Carbs: totals.avgMealMacros.breakfast.carbs, Fat: totals.avgMealMacros.breakfast.fat },
      { meal: 'Lunch', Protein: totals.avgMealMacros.lunch.protein, Carbs: totals.avgMealMacros.lunch.carbs, Fat: totals.avgMealMacros.lunch.fat },
      { meal: 'Dinner', Protein: totals.avgMealMacros.dinner.protein, Carbs: totals.avgMealMacros.dinner.carbs, Fat: totals.avgMealMacros.dinner.fat },
      { meal: 'Snack', Protein: totals.avgMealMacros.snack.protein, Carbs: totals.avgMealMacros.snack.carbs, Fat: totals.avgMealMacros.snack.fat },
    ];
  }, [totals]);

  if (!userId) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-[#0b0f17] text-white border border-slate-800/80 rounded-3xl p-8 text-center text-sm text-slate-400">
        Sign in to see your nutrition trends.
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#0b0f17] text-white border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-6 font-sans shadow-2xl relative overflow-hidden">

      {/* Controls Header */}
      <div className="flex flex-col gap-3 pb-4 border-b border-slate-800/80 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="bg-[#121824] p-1.5 rounded-2xl border border-slate-800 flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('calories')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'calories'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>Energy Intake</span>
            </button>

            <button
              onClick={() => setActiveTab('nutrients')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === 'nutrients'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>Nutrients</span>
            </button>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs bg-[#121824] px-3.5 py-2 rounded-2xl border border-slate-800">
            <button
              onClick={() => setRangeOffset((w) => w - 1)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300 font-medium tracking-wide">{rangeLabel}</span>
            <button
              onClick={() => setRangeOffset((w) => Math.min(0, w + 1))}
              disabled={rangeOffset >= 0}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekly / Monthly / Yearly Period Picker */}
        <div className="bg-[#121824] p-1 rounded-2xl border border-slate-800 flex items-center self-start">
          {(['weekly', 'monthly', 'yearly']).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 ${
                period === p
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold text-center">
          {error}
        </div>
      ) : (
        <>
          {!totals.hasAnyData && (
            <div className="px-4 py-3 bg-[#121824] border border-slate-800/80 rounded-xl text-xs text-slate-400 text-center">
              No meals logged for this {period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : 'year'} yet — your trends will appear here once you start logging.
            </div>
          )}

          {/* TAB 1: ENERGY INTAKE */}
          {activeTab === 'calories' && (
            <div className="space-y-6 relative z-10">

              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#121824] border border-slate-800/80 p-3.5 rounded-2xl flex flex-col justify-between hover:border-slate-700/80 transition-all">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Daily Average</span>
                  <div className="mt-1 flex items-baseline space-x-1">
                    <span className="text-xl font-extrabold font-mono text-white tracking-tight">{totals.avgCal}</span>
                    <span className="text-[10px] font-semibold text-slate-400">kcal</span>
                  </div>
                </div>

                <div className="bg-[#121824] border border-slate-800/80 p-3.5 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 transition-all">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Target Goal</span>
                  <div className="mt-1 flex items-baseline space-x-1">
                    <span className="text-xl font-extrabold font-mono text-emerald-400 tracking-tight">{userGoals.calories}</span>
                    <span className="text-[10px] font-semibold text-slate-400">kcal</span>
                  </div>
                </div>

                <div className="bg-[#121824] border border-slate-800/80 p-3.5 rounded-2xl flex flex-col justify-between hover:border-cyan-500/30 transition-all">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{PERIOD_LABELS[period]} {totals.calUnderGoal >= 0 ? 'Deficit' : 'Surplus'}</span>
                  <div className="mt-1 flex items-baseline space-x-1">
                    <span className="text-xl font-extrabold font-mono text-cyan-400 tracking-tight">{Math.abs(totals.calUnderGoal)}</span>
                    <span className="text-[10px] font-semibold text-slate-400">kcal</span>
                  </div>
                </div>
              </div>

              {/* Calorie Trend Chart */}
              <div className="bg-[#121824] border border-slate-800/80 rounded-2xl p-4 pt-5 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <span>Calorie Trend</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {period === 'weekly' ? '7-Day Intake' : period === 'monthly' ? 'Daily Intake' : 'Monthly Average'}
                  </span>
                </div>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="calGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" stroke="#475569" fontSize={11} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="calories" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#calGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Meal Distribution Breakdown */}
              <div className="bg-[#121824] border border-slate-800/80 rounded-2xl p-4 pt-5 space-y-2">
                <div className="flex items-center justify-between px-1 border-b border-slate-800/60 pb-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <span>Meal Distribution Breakdown</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">kcal per Meal</span>
                </div>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mealDistributionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="day" stroke="#475569" fontSize={11} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Breakfast" fill={MEAL_GREEN_COLORS.Breakfast} radius={[4, 4, 0, 0]} name="Breakfast (kcal)" />
                      <Bar dataKey="Lunch" fill={MEAL_GREEN_COLORS.Lunch} radius={[4, 4, 0, 0]} name="Lunch (kcal)" />
                      <Bar dataKey="Dinner" fill={MEAL_GREEN_COLORS.Dinner} radius={[4, 4, 0, 0]} name="Dinner (kcal)" />
                      <Bar dataKey="Snacks" fill={MEAL_GREEN_COLORS.Snacks} radius={[4, 4, 0, 0]} name="Snacks (kcal)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-between px-2 pt-3 border-t border-slate-800/60">
                  {[
                    { label: 'Breakfast', color: MEAL_GREEN_COLORS.Breakfast, pct: totals.breakfastPct },
                    { label: 'Lunch', color: MEAL_GREEN_COLORS.Lunch, pct: totals.lunchPct },
                    { label: 'Dinner', color: MEAL_GREEN_COLORS.Dinner, pct: totals.dinnerPct },
                    { label: 'Snacks', color: MEAL_GREEN_COLORS.Snacks, pct: totals.snackPct }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-medium text-slate-400">{item.label}</span>
                      <span className="text-[10px] font-mono text-slate-200 font-semibold">{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Water Intake Banner */}
              <div className="bg-[#121824] border border-blue-500/20 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 shrink-0">
                    <Droplet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Daily Water Average</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      <span className="text-blue-400 font-bold">{avgWaterMl} ml</span> / {userGoals.waterMl} ml goal
                    </div>
                  </div>
                </div>

                <div className="w-24 sm:w-36 bg-slate-800/80 h-2 rounded-full overflow-hidden p-0.5 border border-slate-700/50 shrink-0">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((avgWaterMl / userGoals.waterMl) * 100))}%` }}
                  />
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: NUTRIENTS */}
          {activeTab === 'nutrients' && (
            <div className="space-y-6 relative z-10">

              {/* Main Macro Chart */}
              <div className="bg-[#121824] border border-slate-800/80 rounded-2xl p-4 pt-5 space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{PERIOD_LABELS[period]} Macro Breakdown</span>
                  <span className="text-[10px] font-mono text-slate-500">{period === 'yearly' ? 'Monthly Avg Grams' : 'Daily Grams'}</span>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="day" stroke="#475569" fontSize={11} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="protein" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Protein (g)" />
                      <Bar dataKey="carbs" fill="#06B6D4" radius={[4, 4, 0, 0]} name="Carbs (g)" />
                      <Bar dataKey="fat" fill="#A855F7" radius={[4, 4, 0, 0]} name="Fat (g)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Meal Macro Comparison */}
              <div className="bg-[#121824] border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <span>Daily Macro Breakdown</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Average Grams / Meal</span>
                </div>

                <div className="h-52 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mealMacroComparisonData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="meal" stroke="#475569" fontSize={11} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="Protein" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Carbs" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Fat" fill="#A855F7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Core Macro Progress Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#121824] border border-slate-800 p-3.5 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-amber-400">Protein</span>
                    <span className="text-[10px] font-mono text-slate-400">{totals.proteinPct}%</span>
                  </div>
                  <p className="text-lg font-extrabold font-mono text-white tracking-tight">{totals.avgProtein}g <span className="text-[10px] text-slate-500 font-normal">avg</span></p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full transition-all duration-300" style={{ width: `${totals.proteinPct}%` }} />
                  </div>
                </div>

                <div className="bg-[#121824] border border-slate-800 p-3.5 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-cyan-400">Carbs</span>
                    <span className="text-[10px] font-mono text-slate-400">{totals.carbsPct}%</span>
                  </div>
                  <p className="text-lg font-extrabold font-mono text-white tracking-tight">{totals.avgCarbs}g <span className="text-[10px] text-slate-500 font-normal">avg</span></p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full rounded-full transition-all duration-300" style={{ width: `${totals.carbsPct}%` }} />
                  </div>
                </div>

                <div className="bg-[#121824] border border-slate-800 p-3.5 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-purple-400">Fat</span>
                    <span className="text-[10px] font-mono text-slate-400">{totals.fatPct}%</span>
                  </div>
                  <p className="text-lg font-extrabold font-mono text-white tracking-tight">{totals.avgFat}g <span className="text-[10px] text-slate-500 font-normal">avg</span></p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-400 h-full rounded-full transition-all duration-300" style={{ width: `${totals.fatPct}%` }} />
                  </div>
                </div>
              </div>

              {/* Micro-Nutrients Drawer — now sourced entirely from real FoodLog data */}
              <div className="border-t border-slate-800/80 pt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between p-3.5 bg-[#121824] hover:bg-[#161e2e] border border-slate-800 rounded-2xl transition-all group"
                >
                  <span className="text-xs font-bold text-slate-300 group-hover:text-cyan-400 transition-colors">
                    Advanced Nutrients & Micro Breakdown Average
                  </span>
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="mt-3 p-4 bg-[#121824] border border-slate-800/60 rounded-2xl space-y-3.5">
                    {[
                      { name: 'Fiber', unit: 'g', val: totals.avgFiber, goal: userGoals.fiber, color: 'bg-emerald-400' },
                      { name: 'Sugar', unit: 'g', val: totals.avgSugar, goal: userGoals.sugar, color: 'bg-rose-400' },
                      { name: 'Potassium', unit: 'mg', val: totals.avgPotassium, goal: userGoals.potassium, color: 'bg-blue-400' },
                      { name: 'Sodium', unit: 'mg', val: totals.avgSodium, goal: userGoals.sodium, color: 'bg-amber-400' },
                      { name: 'Saturated Fat', unit: 'g', val: totals.avgSatFat, goal: userGoals.saturatedFat, color: 'bg-purple-400' },
                      { name: 'Trans Fat', unit: 'g', val: totals.avgTransFat, goal: userGoals.transFat, color: 'bg-red-500' },
                      { name: 'Cholesterol', unit: 'mg', val: totals.avgCholesterol, goal: userGoals.cholesterol, color: 'bg-orange-400' },
                      { name: 'Vitamin A', unit: 'mcg', val: totals.avgVitaminA, goal: userGoals.vitaminA, color: 'bg-yellow-400' },
                      { name: 'Vitamin C', unit: 'mg', val: totals.avgVitaminC, goal: userGoals.vitaminC, color: 'bg-lime-400' },
                      { name: 'Calcium', unit: 'mg', val: totals.avgCalcium, goal: userGoals.calcium, color: 'bg-slate-300' },
                      { name: 'Iron', unit: 'mg', val: totals.avgIron, goal: userGoals.iron, color: 'bg-red-400' },
                      { name: 'Vitamin B12', unit: 'mcg', val: totals.avgVitaminB12, goal: userGoals.vitaminB12, color: 'bg-pink-400' },
                      { name: 'Vitamin D', unit: 'mcg', val: totals.avgVitaminD, goal: userGoals.vitaminD, color: 'bg-teal-400' },
                    ].map((item, idx) => {
                      const progressPct = item.goal > 0 ? Math.min(100, Math.round((item.val / item.goal) * 100)) : 0;

                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-medium">
                            <span className="text-slate-300 font-semibold">{item.name}</span>
                            <div className="font-mono text-slate-400 text-[11px]">
                              <span className="text-white font-bold">{item.val}</span>
                              <span> / {item.goal}{item.unit}</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${item.color} rounded-full transition-all duration-300`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </>
      )}

    </div>
  );
}