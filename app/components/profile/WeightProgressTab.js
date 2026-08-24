'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  Scale,
  Calendar,
  Plus,
  Image as ImageIcon,
  Loader2,
  X,
  Trash2,
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

export default function WeightProgressTab({ user, onUpdateUser }) {
  const isPreviewMode = !(user?._id || user?.id);

  const [logs, setLogs] = useState([]);
  // Real users get null (shown as "--") until they actually have data —
  // no placeholder numbers pretending to be their real weight/goal.
  // Preview mode (no logged-in user) keeps the old demo defaults.
  const [userSummary, setUserSummary] = useState({
    startingWeight: isPreviewMode ? 75.5 : (user?.startingWeight || null),
    currentWeight: isPreviewMode ? 72.5 : (user?.currentWeight || user?.weight || null),
    goalWeight: isPreviewMode ? 68.0 : (user?.goalWeight || null),
    unit: user?.weightUnit || 'kg',
  });
  const [range, setRange] = useState('1M');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [newWeight, setNewWeight] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPhoto, setNewPhoto] = useState('');

  const userId = user?._id || user?.id;

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
      // Use dummy data if no user session/id is present
      setLogs(DUMMY_LOGS);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/weight-log?userId=${userId}&range=${range}`);
      const data = await res.json();
      if (res.ok && data.logs && data.logs.length > 0) {
        setLogs(data.logs);
        if (data.userSummary) {
          setUserSummary({
            startingWeight: data.userSummary.startingWeight || user?.startingWeight || null,
            currentWeight: data.userSummary.currentWeight || user?.currentWeight || user?.weight || null,
            goalWeight: data.userSummary.goalWeight || user?.goalWeight || null,
            unit: data.userSummary.unit || user?.weightUnit || 'kg',
          });
        }
      } else {
        // No entries yet for this range — show an empty state, not dummy data,
        // once we know we actually have a real user.
        setLogs([]);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, range]);

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
        unit: userSummary.unit,
        date: new Date(newDate).toISOString(),
        photoUrl: newPhoto,
      };
      setLogs((prev) => [newEntry, ...prev]);
      setUserSummary((prev) => ({ ...prev, currentWeight: Number(newWeight) }));
      setIsModalOpen(false);
      setNewWeight('');
      setNewPhoto('');
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
          unit: userSummary.unit,
          date: newDate,
          photoUrl: newPhoto,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save entry');

      setIsModalOpen(false);
      setNewWeight('');
      setNewPhoto('');
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

  // Metrics Calculations — use null (not 0) when a value is genuinely unset,
  // so "no data yet" doesn't get silently rendered as a fake 0kg/0% change.
  const startWeight = userSummary.startingWeight ?? (logs.length ? logs[logs.length - 1].weight : null);
  const currentWeight = logs.length ? logs[0].weight : (userSummary.currentWeight ?? startWeight);
  const goalWeight = userSummary.goalWeight ?? null;

  const hasStartAndCurrent = startWeight !== null && currentWeight !== null;
  const diff = hasStartAndCurrent ? (currentWeight - startWeight).toFixed(1) : null;
  const pct = hasStartAndCurrent && startWeight > 0 ? ((diff / startWeight) * 100).toFixed(0) : null;

  // Format Recharts Data
  const { chartData, yDomain } = useMemo(() => {
    if (!logs.length) return { chartData: [], yDomain: [0, 100] };

    const sorted = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const formattedData = sorted.map((log) => ({
      ...log,
      dateStr: new Date(log.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      weight: log.weight,
    }));

    const weights = sorted.map((l) => l.weight);
    if (goalWeight > 0) weights.push(goalWeight);

    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const padding = Math.max((maxWeight - minWeight) * 0.25, 2);

    return {
      chartData: formattedData,
      yDomain: [
        Math.max(0, Math.floor(minWeight - padding)),
        Math.ceil(maxWeight + padding),
      ],
    };
  }, [logs, goalWeight]);

  return (
    <div
      className={`w-full bg-[#121A2A] text-white space-y-4 font-sans pb-6 max-h-[70vh] overflow-y-auto ${scrollbarClasses}`}
      style={scrollbarStyle}
    >
      
      {/* HEADER CONTROLS BAR */}
      <div className="grid grid-cols-2 divide-x divide-gray-800 border-b border-gray-800 bg-[#0f172a]/50 sticky top-0 z-10">
        <div className="flex items-center justify-center gap-2 py-3">
          <Scale className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-400">Weight</span>
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
            {startWeight ?? '--'} {startWeight !== null && <span className="text-[10px] font-normal text-gray-400">{userSummary.unit}</span>}
          </div>
          <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Start</div>
        </div>

        <div>
          <div className="text-xs sm:text-base font-bold font-mono text-white tracking-tight">
            {currentWeight ?? '--'} {currentWeight !== null && <span className="text-[10px] font-normal text-gray-400">{userSummary.unit}</span>}
          </div>
          <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Current</div>
        </div>

        <div>
          <div className="text-xs sm:text-base font-bold font-mono text-indigo-400 tracking-tight">
            {goalWeight ?? '--'} {goalWeight !== null && <span className="text-[10px] font-normal text-indigo-400/70">{userSummary.unit}</span>}
          </div>
          <div className="text-[9px] uppercase font-bold text-indigo-400/80 tracking-wider">Goal</div>
        </div>

        <div>
          <div className={`text-xs sm:text-base font-bold font-mono tracking-tight ${diff === null ? 'text-gray-500' : Number(diff) <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {diff === null ? '--' : Number(diff) > 0 ? `+${diff}` : diff} {diff !== null && <span className="text-[10px] font-normal text-gray-400">{userSummary.unit}</span>}
          </div>
          <div className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
            {pct !== null ? `Change (${pct}%)` : 'No data yet'}
          </div>
        </div>
      </div>

      {/* RECHARTS WEIGHT LINE GRAPH */}
      <div className="px-4 pt-2">
        <div className="h-48 w-full relative">
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
                <XAxis 
                  dataKey="dateStr" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={{ stroke: '#1e293b' }} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                  domain={yDomain}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#0f172a] border border-gray-700 p-2 rounded-lg text-xs font-mono shadow-lg">
                          <span className="text-indigo-400 font-bold">{payload[0].value}</span> {userSummary.unit}
                        </div>
                      );
                    }
                    return null;
                  }}
                />

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
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-500">
              No weight entries recorded.
            </div>
          )}
        </div>
      </div>

      {/* ENTRIES LIST HEADER */}
      <div className="px-5 pt-4 pb-1 border-b border-gray-800/60 flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Entries</h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-1 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-colors"
          title="Add weight entry"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* DETAILED LOGS LIST */}
      <div className="divide-y divide-gray-800/50">
        {logs.map((log) => (
          <div key={log._id} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#161F30] transition-colors">
            <div>
              <div className="text-xs font-semibold text-gray-200">
                {new Date(log.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold font-mono text-gray-100">
                {log.weight} {log.unit || userSummary.unit}
              </span>
              {log.photoUrl ? (
                <img src={log.photoUrl} alt="Progress" className="w-7 h-7 rounded object-cover border border-gray-700" />
              ) : (
                <ImageIcon className="w-4 h-4 text-gray-600" />
              )}
              <button onClick={() => handleDeleteLog(log._id)} className="text-gray-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
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
                <label className="block text-gray-400 mb-1 font-medium">Weight ({userSummary.unit})</label>
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

              <div>
                <label className="block text-gray-400 mb-1 font-medium">Photo URL (Optional)</label>
                <input
                  type="url"
                  value={newPhoto}
                  onChange={(e) => setNewPhoto(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#121A2A] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
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