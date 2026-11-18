'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import {
  Scale,
  Calendar,
  Plus,
  Loader2,
  X,
  Trash2,
  ChevronDown,
} from 'lucide-react';

// DUMMY/FALLBACK DATA FOR PREVIEW (only used when there's no logged-in user)
const DUMMY_LOGS = [
  { _id: '1', weight: 72.5, unit: 'kg', date: '2026-08-21T00:00:00.000Z', photoUrl: '' },
  { _id: '2', weight: 73.1, unit: 'kg', date: '2026-08-18T00:00:00.000Z', photoUrl: '' },
  { _id: '3', weight: 73.8, unit: 'kg', date: '2026-08-14T00:00:00.000Z', photoUrl: '' },
  { _id: '4', weight: 74.2, unit: 'kg', date: '2026-08-10T00:00:00.000Z', photoUrl: '' },
  { _id: '5', weight: 74.9, unit: 'kg', date: '2026-08-05T00:00:00.000Z', photoUrl: '' },
  { _id: '6', weight: 75.5, unit: 'kg', date: '2026-08-01T00:00:00.000Z', photoUrl: '' },
];

// Shared themed scrollbar (Chromium/WebKit) + Firefox fallback, matching the app's dark palette.
const scrollbarClasses =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-600";
const scrollbarStyle = { scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' };
const KG_PER_LB = 0.45359237;
const DEFAULT_WEEKLY_RATE_KG = KG_PER_LB;
const WEEKLY_RATE_OPTIONS_LB = [0.5, 0.75, 1, 1.5, 2];

function convertWeight(value, fromUnit, toUnit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (fromUnit === toUnit) return number;
  return fromUnit === 'kg' ? number / KG_PER_LB : number * KG_PER_LB;
}

function parseLocalDate(value) {
  if (!value) return null;
  const dateOnly = String(value).slice(0, 10);
  const parts = dateOnly.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const date = new Date(parts[0], parts[1] - 1, parts[2], 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonthsClamped(date, months) {
  const day = date.getDate();
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1, 12);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatWeightDate(date, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return date.toLocaleDateString('en-US', options);
}

function formatWeekDayDuration(totalDays) {
  if (totalDays <= 0) return '0 days';
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  const parts = [];
  if (weeks) parts.push(`${weeks} ${weeks === 1 ? 'week' : 'weeks'}`);
  if (days) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  return parts.join(', ') || 'Less than a day';
}

function formatCalendarDuration(startDate, endDate) {
  let months = 0;
  while (months < 120 && addMonthsClamped(startDate, months + 1) <= endDate) {
    months += 1;
  }
  const monthAnchor = addMonthsClamped(startDate, months);
  const remainingDays = Math.max(0, Math.round((endDate - monthAnchor) / 86400000));
  const parts = [];
  if (months) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (remainingDays) parts.push(`${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`);
  return parts.join(', ') || 'Less than a month';
}

export default function WeightProgressTab({ user, onUpdateUser }) {
  const isPreviewMode = !(user?._id || user?.id);
  const userId = user?._id || user?.id;

  const [logs, setLogs] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [showWeightDetails, setShowWeightDetails] = useState(false);
  const [userSummary, setUserSummary] = useState({
    startingWeight: isPreviewMode ? 75.5 : (user?.startingWeight ?? null),
    startingWeightDate: user?.startingWeightDate || null,
    currentWeight: isPreviewMode ? 72.5 : (user?.currentWeight ?? user?.weight ?? null),
    lastWeighInDate: user?.lastWeighInDate || null,
    goalWeight: isPreviewMode ? 68.0 : (user?.goalWeight ?? null),
    unit: user?.weightUnit || 'kg',
    weeklyWeightRateKg: Number(user?.weeklyWeightRateKg) || DEFAULT_WEEKLY_RATE_KG,
    nutritionalStrategy: user?.nutritionalStrategy || user?.weeklyPace || user?.weeklyGoal || '',
  });
  const [displayUnit, setDisplayUnit] = useState(user?.weightUnit === 'lbs' ? 'lbs' : 'kg');
  const [weeklyRateKg, setWeeklyRateKg] = useState(Number(user?.weeklyWeightRateKg) || DEFAULT_WEEKLY_RATE_KG);
  const [savingUnit, setSavingUnit] = useState(false);
  const [savingPace, setSavingPace] = useState(false);
  const [range, setRange] = useState('1M');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [newWeight, setNewWeight] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  // Reject a weigh-in date set in the future (server re-validates independently on submit).
  const dateError = useMemo(() => {
    if (!newDate) return '';
    const picked = new Date(newDate);
    const today = new Date();
    picked.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (isNaN(picked.getTime())) return 'Invalid date.';
    if (picked.getTime() > today.getTime()) return 'Date cannot be in the future.';
    return '';
  }, [newDate]);

  const fetchLogs = async () => {
    if (!userId) {
      setLogs(DUMMY_LOGS);
      setRecentLogs(DUMMY_LOGS.slice(0, 2));
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/weight-log?userId=${encodeURIComponent(userId)}&range=${range}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load weight history');

      const summary = data.userSummary || {};
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setRecentLogs(Array.isArray(data.recentLogs) ? data.recentLogs : (Array.isArray(data.logs) ? data.logs.slice(0, 2) : []));
      setUserSummary({
        startingWeight: summary.startingWeight ?? user?.startingWeight ?? null,
        startingWeightDate: summary.startingWeightDate || user?.startingWeightDate || null,
        currentWeight: summary.currentWeight ?? user?.currentWeight ?? user?.weight ?? null,
        lastWeighInDate: summary.lastWeighInDate || user?.lastWeighInDate || null,
        goalWeight: summary.goalWeight ?? user?.goalWeight ?? null,
        unit: summary.unit || user?.weightUnit || 'kg',
        weeklyWeightRateKg: Number(summary.weeklyWeightRateKg || user?.weeklyWeightRateKg) || DEFAULT_WEEKLY_RATE_KG,
        nutritionalStrategy: summary.nutritionalStrategy || user?.nutritionalStrategy || user?.weeklyPace || user?.weeklyGoal || '',
      });
      setWeeklyRateKg(Number(summary.weeklyWeightRateKg || user?.weeklyWeightRateKg) || DEFAULT_WEEKLY_RATE_KG);
      setDisplayUnit(summary.unit || user?.weightUnit || 'kg');
    } catch (err) {
      console.error('Error fetching weight logs:', err);
      setError(err.message || 'Unable to load weight history.');
      setLogs([]);
      setRecentLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, range]);

  useEffect(() => {
    if (!user) return;
    const preferredUnit = user.weightUnit === 'lbs' ? 'lbs' : 'kg';
    setDisplayUnit(preferredUnit);
    setWeeklyRateKg(Number(user.weeklyWeightRateKg) || DEFAULT_WEEKLY_RATE_KG);
  }, [user?.weightUnit, user?.weeklyWeightRateKg]);


  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!newWeight || dateError) return;
    setSubmitting(true);
    setError('');

    if (!userId) {
      // Local state update when using dummy data mode (no logged-in user)
      const newEntry = {
        _id: Date.now().toString(),
        weight: Number(newWeight),
        unit: displayUnit,
        date: new Date(newDate).toISOString(),
      };
      setLogs((prev) => [newEntry, ...prev]);
      setUserSummary((prev) => ({ ...prev, currentWeight: Number(newWeight) }));
      setIsModalOpen(false);
      setNewWeight('');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/weight-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          weight: Number(newWeight),
          unit: displayUnit,
          date: newDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save entry');

      setIsModalOpen(false);
      setNewWeight('');
      await fetchLogs();

      // Trust the server's returned user object rather than hand-constructing
      // a patch — keeps this in sync with whatever the backend actually saved.
      if (onUpdateUser && data.user) {
        onUpdateUser(data.user);
      }
    } catch (err) {
      console.error('Error adding weight:', err);
      setError(err.message || 'Failed to save entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (id) => {
    if (!confirm('Are you sure you want to delete this weight entry?')) return;
    if (!userId) {
      setLogs((prev) => prev.filter((item) => item._id !== id));
      return;
    }
    try {
      const res = await fetch(`/api/weight-log?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        await fetchLogs();
        if (onUpdateUser && data.user) {
          onUpdateUser(data.user);
        }
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };

  // Convert every stored measurement into the selected display unit before
  // calculating metrics or drawing the chart. Historical log units stay intact.
  const sortByMostRecent = (items) => [...items].sort((a, b) => {
    const dateDifference = new Date(b.date) - new Date(a.date);
    if (dateDifference !== 0) return dateDifference;
    return new Date(b.createdAt || b.updatedAt || b.date) - new Date(a.createdAt || a.updatedAt || a.date);
  });
  const sortedLogsNewestFirst = useMemo(() => sortByMostRecent(logs), [logs]);
  const sortedRecentLogsNewestFirst = useMemo(
    () => sortByMostRecent(recentLogs.length ? recentLogs : logs).slice(0, 2),
    [recentLogs, logs]
  );
  const latestLog = sortedRecentLogsNewestFirst[0] || null;
  const previousLog = sortedRecentLogsNewestFirst[1] || null;
  const earliestLog = sortedLogsNewestFirst[sortedLogsNewestFirst.length - 1] || null;
  const sourceUnit = userSummary.unit || 'kg';

  // If the account has a current profile weight but no separate WeightLog
  // document, still show that saved snapshot and its known measurement date.
  const profileWeightValue = userSummary.currentWeight ?? userSummary.weight ?? null;
  const profileWeightRecord = profileWeightValue !== null && Number(profileWeightValue) > 0
    ? {
        _id: 'profile-weight-snapshot',
        weight: Number(profileWeightValue),
        unit: sourceUnit,
        date: userSummary.lastWeighInDate || null,
        isProfileSnapshot: true,
      }
    : null;
  const latestMeasurement = latestLog || profileWeightRecord;
  const latestMeasurementWeight = latestMeasurement
    ? convertWeight(latestMeasurement.weight, latestMeasurement.unit || sourceUnit, displayUnit)
    : null;
  const latestMeasurementDate = latestLog
    ? parseLocalDate(latestLog.date)
    : parseLocalDate(profileWeightRecord?.date);
  const latestLogWeight = latestLog
    ? convertWeight(latestLog.weight, latestLog.unit || sourceUnit, displayUnit)
    : null;
  const previousLogWeight = previousLog
    ? convertWeight(previousLog.weight, previousLog.unit || sourceUnit, displayUnit)
    : null;
  const changeSincePrevious = latestLogWeight !== null && previousLogWeight !== null
    ? Number((latestLogWeight - previousLogWeight).toFixed(1))
    : null;

  const startWeight = userSummary.startingWeight !== null && userSummary.startingWeight !== undefined
    ? convertWeight(userSummary.startingWeight, sourceUnit, displayUnit)
    : (earliestLog ? convertWeight(earliestLog.weight, earliestLog.unit || sourceUnit, displayUnit) : null);
  const currentWeight = latestLogWeight !== null
    ? latestLogWeight
    : (userSummary.currentWeight !== null && userSummary.currentWeight !== undefined
      ? convertWeight(userSummary.currentWeight, sourceUnit, displayUnit)
      : startWeight);
  const goalWeight = userSummary.goalWeight !== null && userSummary.goalWeight !== undefined
    ? convertWeight(userSummary.goalWeight, sourceUnit, displayUnit)
    : null;

  const hasStartAndCurrent = startWeight !== null && currentWeight !== null;
  const diff = hasStartAndCurrent ? Number((currentWeight - startWeight).toFixed(1)) : null;
  const pct = hasStartAndCurrent && startWeight > 0 ? Math.round((diff / startWeight) * 100) : null;

  const forecast = useMemo(() => {
    if (!(currentWeight > 0) || !(goalWeight > 0) || !(weeklyRateKg > 0)) return null;

    const deltaKg = Math.abs(convertWeight(goalWeight, displayUnit, 'kg') - convertWeight(currentWeight, displayUnit, 'kg'));
    const today = parseLocalDate(toDateKey(new Date()));
    const hasCurrentProfileWeight = userSummary.currentWeight !== null && userSummary.currentWeight !== undefined;
    const savedBaselineDate = latestLog
      ? parseLocalDate(latestLog.date)
      : hasCurrentProfileWeight
        ? parseLocalDate(userSummary.lastWeighInDate)
        : parseLocalDate(userSummary.startingWeightDate || userSummary.lastWeighInDate);
    const baselineDate = savedBaselineDate || today;
    const baselineDateWasAssumed = !savedBaselineDate;
    const daysSinceBaseline = Math.max(0, Math.floor((today.getTime() - baselineDate.getTime()) / 86400000));

    if (deltaKg < 0.01) {
      return {
        alreadyReached: true,
        expectedDate: baselineDate,
        startDate: baselineDate,
        weeks: 0,
        days: 0,
        daysSinceBaseline,
        isStale: daysSinceBaseline > 14,
        isExpired: false,
        daysPast: 0,
        baselineDateWasAssumed,
        direction: 'maintain',
        milestones: [],
        points: [{ date: baselineDate, dateKey: toDateKey(baselineDate), projectedWeight: currentWeight }],
      };
    }

    const direction = goalWeight < currentWeight ? 'lose' : 'gain';
    const weeks = deltaKg / weeklyRateKg;
    const days = Math.max(1, Math.ceil(weeks * 7));
    const expectedDate = addDays(baselineDate, days);
    const isExpired = expectedDate < today;
    const daysPast = isExpired
      ? Math.floor((today.getTime() - expectedDate.getTime()) / 86400000)
      : 0;
    const isStale = daysSinceBaseline > 14;
    const movementSign = direction === 'lose' ? -1 : 1;
    const rateDisplayPerWeek = displayUnit === 'lbs' ? weeklyRateKg / KG_PER_LB : weeklyRateKg;
    const baselineKg = convertWeight(currentWeight, displayUnit, 'kg');
    const goalKg = convertWeight(goalWeight, displayUnit, 'kg');

    const estimateAt = (date) => {
      const elapsedWeeks = Math.max(0, (date.getTime() - baselineDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const valueKg = baselineKg + movementSign * weeklyRateKg * elapsedWeeks;
      const boundedKg = direction === 'lose' ? Math.max(goalKg, valueKg) : Math.min(goalKg, valueKg);
      return convertWeight(boundedKg, 'kg', displayUnit);
    };

    const milestones = [];
    for (let month = 1; month <= 36; month += 1) {
      const date = addMonthsClamped(baselineDate, month);
      if (date >= expectedDate) break;
      milestones.push({ date, weight: estimateAt(date) });
    }
    milestones.push({ date: expectedDate, weight: goalWeight, isGoal: true });

    // Do not draw a forecast as if it were still upcoming once its target date
    // has passed. Keep the original calculation visible as a historical estimate.
    const points = isExpired ? [] : [
      { date: baselineDate, dateKey: toDateKey(baselineDate), projectedWeight: currentWeight },
      ...milestones.map((milestone) => ({
        date: milestone.date,
        dateKey: toDateKey(milestone.date),
        projectedWeight: Number(milestone.weight.toFixed(1)),
      })),
    ];

    return {
      alreadyReached: false,
      expectedDate,
      startDate: baselineDate,
      weeks,
      days,
      daysSinceBaseline,
      isStale,
      isExpired,
      daysPast,
      baselineDateWasAssumed,
      direction,
      rateDisplayPerWeek,
      milestones,
      points,
    };
  }, [currentWeight, goalWeight, weeklyRateKg, displayUnit, userSummary.lastWeighInDate, userSummary.startingWeightDate, userSummary.currentWeight, latestLog]);

  const chartData = useMemo(() => {
    const byDate = new Map();
    for (const log of [...sortedLogsNewestFirst].reverse()) {
      const date = new Date(log.date);
      const dateKey = toDateKey(date);
      const existing = byDate.get(dateKey);
      const isLatest = String(log._id) === String(latestLog?._id);
      const isPrevious = String(log._id) === String(previousLog?._id);
      byDate.set(dateKey, {
        ...existing,
        ...log,
        date,
        dateKey,
        dateStr: formatWeightDate(date, { month: 'short', day: 'numeric' }),
        weight: Number(convertWeight(log.weight, log.unit || sourceUnit, displayUnit)?.toFixed(1)),
        isLatest: Boolean(existing?.isLatest || isLatest),
        isPrevious: Boolean(existing?.isPrevious || isPrevious),
      });
    }
    for (const point of forecast?.points || []) {
      const existing = byDate.get(point.dateKey) || {
        date: point.date,
        dateKey: point.dateKey,
        dateStr: formatWeightDate(point.date, { month: 'short', day: 'numeric' }),
      };
      existing.projectedWeight = point.projectedWeight;
      byDate.set(point.dateKey, existing);
    }

    return [...byDate.values()].sort((a, b) => a.date - b.date);
  }, [logs, forecast, sourceUnit, displayUnit, sortedLogsNewestFirst, latestLog, previousLog]);

  const latestChartPoint = chartData.find((point) => point.isLatest && Number.isFinite(point.weight));
  const latestLogDateKey = latestLog ? toDateKey(new Date(latestLog.date)) : null;
  const previousChartPoint = chartData.find((point) => point.isPrevious && point.dateKey !== latestLogDateKey && Number.isFinite(point.weight));

  const yDomain = useMemo(() => {
    const values = chartData.flatMap((point) => [
      Number.isFinite(point.weight) ? point.weight : null,
      Number.isFinite(point.projectedWeight) ? point.projectedWeight : null,
    ]).filter((value) => value !== null);
    if (goalWeight !== null) values.push(goalWeight);
    if (!values.length) return [0, 100];
    const minWeight = Math.min(...values);
    const maxWeight = Math.max(...values);
    const padding = Math.max((maxWeight - minWeight) * 0.2, 1);
    return [Math.max(0, Math.floor(minWeight - padding)), Math.ceil(maxWeight + padding)];
  }, [chartData, goalWeight]);

  const handleUnitChange = async (targetUnit) => {
    if (targetUnit === displayUnit || savingUnit) return;
    const oldUnit = userSummary.unit || user?.weightUnit || 'kg';

    if (!userId) {
      setDisplayUnit(targetUnit);
      return;
    }

    setSavingUnit(true);
    setError('');
    const profileValue = (field, fallback) => user?.[field] ?? fallback;
    const payload = { userId, weightUnit: targetUnit };

    const fields = {
      startingWeight: profileValue('startingWeight', userSummary.startingWeight),
      currentWeight: profileValue('currentWeight', userSummary.currentWeight),
      weight: profileValue('weight', user?.currentWeight ?? userSummary.currentWeight),
      goalWeight: profileValue('goalWeight', userSummary.goalWeight),
    };

    Object.entries(fields).forEach(([field, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        payload[field] = Number(convertWeight(value, oldUnit, targetUnit).toFixed(2));
      }
    });

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.user) throw new Error(data.error || 'Unable to save unit preference.');

      const updated = data.user;
      setDisplayUnit(targetUnit);
      setUserSummary((previous) => ({
        ...previous,
        startingWeight: updated.startingWeight ?? null,
        currentWeight: updated.currentWeight ?? updated.weight ?? null,
        goalWeight: updated.goalWeight ?? null,
        unit: targetUnit,
      }));
      onUpdateUser?.(updated);
    } catch (unitError) {
      setError(unitError.message || 'Unable to change weight units.');
    } finally {
      setSavingUnit(false);
    }
  };

  const openCurrentWeighIn = () => {
    setNewDate(toDateKey(new Date()));
    setNewWeight('');
    setIsModalOpen(true);
  };

  const handlePaceChange = async (value) => {
    const nextRate = Number(value);
    if (!(nextRate > 0) || savingPace) return;
    setWeeklyRateKg(nextRate);
    setUserSummary((previous) => ({ ...previous, weeklyWeightRateKg: nextRate }));

    if (!userId) return;
    setSavingPace(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, weeklyWeightRateKg: nextRate }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to save weekly pace.');
      if (data.user) onUpdateUser?.(data.user);
    } catch (paceError) {
      setError(paceError.message || 'Unable to save weekly pace.');
    } finally {
      setSavingPace(false);
    }
  };



  return (
    <div
      className={`w-full bg-[#121A2A] text-white space-y-4 font-sans pb-6 max-h-[70vh] overflow-y-auto ${scrollbarClasses}`}
      style={scrollbarStyle}
    >
      
      {/* HEADER CONTROLS BAR */}
      <div className="grid grid-cols-3 divide-x divide-gray-800 border-b border-gray-800 bg-[#0f172a]/50 sticky top-0 z-10">
        <div className="flex items-center justify-center gap-2 py-3">
          <Scale className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-400">Weight</span>
        </div>
        <div className="flex items-center justify-center gap-1 py-3">
          {['kg', 'lbs'].map((unit) => (
            <button
              key={unit}
              type="button"
              disabled={savingUnit}
              onClick={() => handleUnitChange(unit)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${displayUnit === unit ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-gray-400 hover:text-white'} disabled:opacity-50`}
            >
              {unit.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 py-3">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-indigo-400 focus:outline-none cursor-pointer"
          >
            <option value="1M" className="bg-[#121A2A] text-white">1 Month</option>
            <option value="3M" className="bg-[#121A2A] text-white">3 Months</option>
            <option value="6M" className="bg-[#121A2A] text-white">6 Months</option>
            <option value="1Y" className="bg-[#121A2A] text-white">1 Year</option>
            <option value="ALL" className="bg-[#121A2A] text-white">All Time</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mx-4 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* METRICS SUMMARY ROW */}
      <div className="grid grid-cols-4 text-center px-2 py-2 border-b border-gray-800/60">
        <div>
          <div className="text-xs sm:text-base font-bold font-mono text-white tracking-tight">
            {startWeight !== null ? startWeight.toFixed(1) : '--'} {startWeight !== null && <span className="text-[10px] font-normal text-gray-400">{displayUnit}</span>}
          </div>
          <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Start</div>
        </div>

        <div>
          <div className="text-xs sm:text-base font-bold font-mono text-white tracking-tight">
            {currentWeight !== null ? currentWeight.toFixed(1) : '--'} {currentWeight !== null && <span className="text-[10px] font-normal text-gray-400">{displayUnit}</span>}
          </div>
          <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Current</div>
        </div>

        <div>
          <div className="text-xs sm:text-base font-bold font-mono text-indigo-400 tracking-tight">
            {goalWeight !== null ? goalWeight.toFixed(1) : '--'} {goalWeight !== null && <span className="text-[10px] font-normal text-indigo-400/70">{displayUnit}</span>}
          </div>
          <div className="text-[9px] uppercase font-bold text-indigo-400/80 tracking-wider">Goal</div>
        </div>

        <div>
          <div className={`text-xs sm:text-base font-bold font-mono tracking-tight ${diff === null ? 'text-gray-500' : Number(diff) <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {diff === null ? '--' : Number(diff) > 0 ? `+${diff}` : diff} {diff !== null && <span className="text-[10px] font-normal text-gray-400">{displayUnit}</span>}
          </div>
          <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
            {pct !== null ? `Change (${pct}%)` : 'No data yet'}
          </div>
        </div>
      </div>

      {/* COMPACT LATEST WEIGHT UPDATE */}
      {latestMeasurement && (
        <div className="mx-4 rounded-xl border border-gray-800 bg-[#0D1524] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowWeightDetails((value) => !value)}
            aria-expanded={showWeightDetails}
            aria-controls="weight-update-details"
            className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-[#121D30] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 transition-colors"
            title="Show previous weigh-in and weight change"
          >
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                {latestLog ? 'Latest weigh-in' : 'Current profile weight'}
              </p>
              <p className="mt-0.5 text-[10px] text-gray-500 truncate">
                {latestMeasurementDate ? formatWeightDate(latestMeasurementDate) : 'Measurement date not recorded'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-base font-bold font-mono text-white">
                {latestMeasurementWeight?.toFixed(1)} <span className="text-[10px] text-gray-400">{displayUnit}</span>
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showWeightDetails ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {showWeightDetails && (
            <div id="weight-update-details" className="border-t border-gray-800 px-3.5 py-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-gray-400">Latest recorded weight</span>
                <span className="text-[10px] font-semibold text-white">{latestMeasurementWeight?.toFixed(1)} {displayUnit}</span>
              </div>
              {previousLog ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-gray-400">Previous weigh-in · {formatWeightDate(parseLocalDate(previousLog.date))}</span>
                    <span className="text-[10px] font-semibold text-white">{previousLogWeight?.toFixed(1)} {displayUnit}</span>
                  </div>
                  {changeSincePrevious !== null && (
                    <div className="flex items-center justify-between gap-3 border-t border-gray-800 pt-2">
                      <span className="text-[10px] text-gray-400">Change since previous</span>
                      <span className={`text-[10px] font-bold ${changeSincePrevious < 0 ? 'text-emerald-300' : changeSincePrevious > 0 ? 'text-amber-300' : 'text-gray-300'}`}>
                        {changeSincePrevious > 0 ? '+' : ''}{changeSincePrevious.toFixed(1)} {displayUnit}
                        {changeSincePrevious < 0 ? ' down' : changeSincePrevious > 0 ? ' up' : ' no change'}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[10px] text-gray-500">
                  No earlier weigh-in is recorded yet. Add another entry to compare your progress.
                </p>
              )}
              {latestMeasurementDate && (
                <p className="text-[9px] text-gray-500">
                  Last measurement was {Math.max(0, Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(latestMeasurementDate).setHours(0, 0, 0, 0)) / 86400000))} days ago.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* WEIGHT HISTORY + PROJECTED GOAL LINE */}
      <div className="px-4 pt-2">
        <div className="h-52 w-full relative">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dateStr" stroke="#64748b" fontSize={10} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} domain={yDomain} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const point = payload[0]?.payload || {};
                      const value = point.projectedWeight ?? point.weight;
                      if (value === undefined || value === null) return null;
                      return (
                        <div className="bg-[#0f172a] border border-gray-700 p-2 rounded-lg text-xs font-mono shadow-lg">
                          <span className="text-indigo-400 font-bold">{Number(value).toFixed(1)}</span> {displayUnit}
                          {point.projectedWeight !== undefined && <span className="block text-[10px] text-gray-400 mt-1">Projected</span>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {previousChartPoint && (
                  <ReferenceDot
                    x={previousChartPoint.dateStr}
                    y={previousChartPoint.weight}
                    r={5}
                    fill="#60a5fa"
                    stroke="#0f172a"
                    strokeWidth={2}
                    label={{ value: 'PREVIOUS', fill: '#93c5fd', fontSize: 8, position: 'bottom' }}
                  />
                )}
                {latestChartPoint && (
                  <ReferenceDot
                    x={latestChartPoint.dateStr}
                    y={latestChartPoint.weight}
                    r={6}
                    fill="#34d399"
                    stroke="#0f172a"
                    strokeWidth={2}
                    label={{ value: 'LATEST', fill: '#6ee7b7', fontSize: 8, position: 'top' }}
                  />
                )}
                {goalWeight > 0 && (
                  <ReferenceLine
                    y={goalWeight}
                    stroke="#818cf8"
                    strokeDasharray="3 3"
                    label={{ value: 'GOAL', fill: '#818cf8', fontSize: 9, position: 'insideTopRight' }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#weightGradient)"
                  activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 1.5 }}
                  connectNulls={false}
                />
                {forecast && !forecast.alreadyReached && !forecast.isExpired && (
                  <Line
                    type="monotone"
                    dataKey="projectedWeight"
                    name="Projected"
                    stroke="#a5b4fc"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 4, fill: '#a5b4fc', stroke: '#fff', strokeWidth: 1 }}
                    connectNulls
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-500">
              No weight entries recorded.
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-4 text-[9px] text-gray-500 mt-1">
          <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-indigo-500" /> Recorded</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 border-t border-dashed border-indigo-300" /> Projection</span>
        </div>
      </div>

      {/* GOAL TIMELINE */}
      <div className="mx-4 rounded-2xl border border-gray-800 bg-[#0D1524] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-white">Goal timeline</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">Calculated from your latest recorded weight</p>
          </div>
          <div className="text-right">
            <label htmlFor="weekly-weight-pace" className="block text-[9px] text-gray-500 mb-1">Weekly pace</label>
            <select
              id="weekly-weight-pace"
              value={weeklyRateKg}
              onChange={(e) => handlePaceChange(e.target.value)}
              disabled={savingPace}
              className="bg-[#1C2638] border border-gray-700 rounded-lg px-2 py-1.5 text-[10px] font-bold text-indigo-300 focus:outline-none disabled:opacity-50"
            >
              {WEEKLY_RATE_OPTIONS_LB.map((rateLbs) => {
                const rateKg = rateLbs * KG_PER_LB;
                const displayRate = displayUnit === 'lbs' ? rateLbs : rateKg;
                return (
                  <option key={rateLbs} value={rateKg} className="bg-[#121A2A] text-white">
                    {displayRate.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} {displayUnit}/week
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {forecast?.alreadyReached ? (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
            <p className="text-xs font-bold text-emerald-300">Your recorded weight matches your goal.</p>
            <p className="text-[10px] text-gray-400 mt-1">
              {forecast.isStale
                ? `This measurement is ${forecast.daysSinceBaseline} days old. Log a new weight to confirm your current progress.`
                : 'Keep logging your weight to track how it changes over time.'}
            </p>
            <button type="button" onClick={openCurrentWeighIn} className="mt-2 text-[10px] font-bold text-indigo-300 hover:text-white">
              Log current weight
            </button>
          </div>
        ) : forecast?.isExpired ? (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 space-y-2">
            <div>
              <p className="text-xs font-bold text-amber-300">Previous estimate has passed</p>
              <p className="text-sm font-bold text-white mt-1">{formatWeightDate(forecast.expectedDate)}</p>
              <p className="text-[10px] text-amber-200/80">
                That date was {forecast.daysPast} {forecast.daysPast === 1 ? 'day' : 'days'} ago.
              </p>
            </div>
            <p className="text-[10px] leading-relaxed text-gray-300">
              This estimate was calculated from {currentWeight.toFixed(1)} {displayUnit} on {formatWeightDate(forecast.startDate)}.
              {forecast.daysSinceBaseline > 0 ? ` The last measurement is now ${forecast.daysSinceBaseline} days old.` : ''}
              {' '}NutriAI cannot know your current weight without a newer measurement, so it will not invent a new completion date.
            </p>
            <p className="text-[10px] text-gray-400">
              Original estimated duration: {formatWeekDayDuration(forecast.days)} ({forecast.days} days).
            </p>
            <button
              type="button"
              onClick={openCurrentWeighIn}
              className="w-full rounded-lg bg-amber-400/15 border border-amber-400/25 px-3 py-2 text-[10px] font-bold text-amber-200 hover:bg-amber-400/20 transition-colors"
            >
              Log a new weight to refresh estimate
            </button>
          </div>
        ) : forecast ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#121A2A] border border-gray-800 p-3">
                <p className="text-[9px] text-gray-500 uppercase tracking-wide">Estimated goal date</p>
                <p className="text-sm font-bold text-indigo-300 mt-1">{formatWeightDate(forecast.expectedDate)}</p>
              </div>
              <div className="rounded-xl bg-[#121A2A] border border-gray-800 p-3">
                <p className="text-[9px] text-gray-500 uppercase tracking-wide">Time from last weight</p>
                <p className="text-sm font-bold text-white mt-1">{formatWeekDayDuration(forecast.days)}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">
                  {formatCalendarDuration(forecast.startDate, forecast.expectedDate)} · {forecast.days} days total
                </p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400">
              Starting at {currentWeight.toFixed(1)} {displayUnit} on {formatWeightDate(forecast.startDate)} ·
              {' '}{forecast.direction === 'lose' ? 'losing' : 'gaining'} about {forecast.rateDisplayPerWeek.toFixed(2)} {displayUnit}/week.
            </p>
            {forecast.isStale && (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 space-y-1">
                <p className="text-[10px] font-bold text-amber-300">Your weight record may be out of date</p>
                <p className="text-[10px] text-gray-400">
                  The last measurement was {forecast.daysSinceBaseline} days ago. Log a new weight to refresh the goal estimate.
                </p>
                <button type="button" onClick={openCurrentWeighIn} className="text-[10px] font-bold text-amber-200 hover:text-white">
                  Update weight
                </button>
              </div>
            )}
            {forecast.baselineDateWasAssumed && (
              <p className="text-[10px] text-amber-300">
                No measurement date is saved. This estimate starts today using the current profile weight.
              </p>
            )}
            {userSummary.nutritionalStrategy && (
              <p className="text-[10px] text-gray-500">
                Nutritional strategy: <span className="text-gray-300 capitalize">{userSummary.nutritionalStrategy}</span>
              </p>
            )}
            <div className="border-t border-gray-800 pt-3 space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Monthly milestones</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {forecast.milestones.map((milestone, index) => (
                  <div key={index} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className={milestone.isGoal ? 'text-indigo-300 font-bold' : 'text-gray-400'}>
                      {formatWeightDate(milestone.date, { month: 'short', day: 'numeric' })}
                      {milestone.isGoal ? ' · Goal' : ''}
                    </span>
                    <span className="text-white font-mono">{milestone.weight.toFixed(1)} {displayUnit}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-[10px] text-gray-400">
            Add a current weight and goal weight in Goals to see your estimated date and monthly milestones.
          </p>
        )}

        <p className="text-[9px] leading-relaxed text-gray-500">
          This is a straight-line estimate, not a promise. Actual progress varies with nutrition, activity, health, and normal weight fluctuations.
          The selected pace is a planning assumption, not a nutrition recommendation. A suitable pace depends on the person's health and circumstances.
        </p>
      </div>

      {/* ENTRIES LIST HEADER */}
      <div className="px-5 pt-4 pb-1 border-b border-gray-800/60 flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Entries</h3>
        <button 
          onClick={openCurrentWeighIn}
          className="p-1 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-colors"
          title="Add weight entry"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* DETAILED LOGS LIST */}
      <div className="divide-y divide-gray-800/50">
        {logs.map((log) => {
          const convertedWeight = convertWeight(log.weight, log.unit || userSummary.unit, displayUnit);
          return (
            <div key={log._id} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#161F30] transition-colors">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-xs font-semibold text-gray-200">
                    {new Date(log.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  {String(log._id) === String(latestLog?._id) && (
                    <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-300">LATEST</span>
                  )}
                  {String(log._id) === String(previousLog?._id) && (
                    <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-bold text-blue-300">PREVIOUS</span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold font-mono text-gray-100">
                  {convertedWeight?.toFixed(1)} {displayUnit}
                </span>
                <button onClick={() => handleDeleteLog(log._id)} className="text-gray-600 hover:text-red-400 transition-colors" title="Delete weight entry">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* LOG WEIGHT MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#162032] border border-gray-800 rounded-2xl w-full max-w-sm p-5 relative shadow-2xl">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold text-white mb-4">Log Weight Entry</h3>

            <form onSubmit={handleAddLog} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Weight ({displayUnit})</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
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
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
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
  );
}