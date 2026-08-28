// components/profile/StepsTab.js
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine,
  Cell
} from 'recharts';
import { Calendar, Plus, Footprints, X, Loader2 } from 'lucide-react';

const TARGET_STEP_GOAL = 10000;

// Converts a raw StepLog entry (userId, date: "YYYY-MM-DD", steps) into the
// display shape this component's chart/list already expect.
function toDisplayEntry(entry) {
  const dateObj = new Date(entry.date + 'T00:00:00Z');
  return {
    _id: entry._id,
    isoDate: entry.date,
    dateStr: `${dateObj.getUTCMonth() + 1}/${dateObj.getUTCDate()}`,
    fullDate: new Intl.DateTimeFormat('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    }).format(dateObj),
    dayName: new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(dateObj),
    steps: entry.steps,
  };
}

export default function StepsTab({ user, goal = TARGET_STEP_GOAL }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1W');
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [newSteps, setNewSteps] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  const userId = user?.id || user?._id;

  const fetchSteps = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90); // covers the "3M" range in one fetch

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      const res = await fetch(`/api/steps?userId=${userId}&start=${startStr}&end=${endStr}`);
      if (res.ok) {
        const result = await res.json();
        setData((result.entries || []).map(toDisplayEntry));
      }
    } catch (err) {
      console.error('Failed to load step entries:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  // Filter Data based on selected Range
  const filteredData = useMemo(() => {
    if (!data.length) return [];
    
    const sorted = [...data].sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));

    if (timeRange === '1W') {
      return sorted.slice(-7);
    } else if (timeRange === '1M') {
      return sorted.slice(-30);
    } else if (timeRange === '3M') {
      return sorted.slice(-90);
    }
    return sorted;
  }, [data, timeRange]);

  // Calculated Summary Metrics
  const metrics = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return { avg: 0, best: 0, bestDate: '--', total: 0 };
    }
    
    const total = filteredData.reduce((acc, curr) => acc + Number(curr.steps), 0);
    const avg = Math.round(total / filteredData.length);
    
    let bestObj = filteredData[0];
    filteredData.forEach((item) => {
      if (Number(item.steps) > Number(bestObj.steps)) bestObj = item;
    });

    return {
      avg,
      best: Number(bestObj.steps),
      bestDate: bestObj.dateStr,
      total
    };
  }, [filteredData]);

  // Dynamic Y-Axis Max Domain
  const yMax = useMemo(() => {
    if (!filteredData.length) return 10000;
    const maxSteps = Math.max(...filteredData.map((d) => Number(d.steps)));
    return Math.max(goal, Math.ceil((maxSteps + 2000) / 2500) * 2500);
  }, [filteredData, goal]);

  // Handle Add Entry Form Submit — POSTs to the real API (upsert: re-logging
  // the same date overwrites that day's entry, same as the old mock behavior)
  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!newSteps || !userId) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, steps: Number(newSteps), date: newDate }),
      });

      if (res.ok) {
        await fetchSteps();
        setIsModalOpen(false);
        setNewSteps('');
      }
    } catch (err) {
      console.error('Failed to save step entry:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#121A2A] text-white space-y-4 font-sans pb-6">
      
      {/* HEADER CONTROLS BAR */}
      <div className="grid grid-cols-2 divide-x divide-gray-800 border-b border-gray-800 bg-[#0f172a]/50">
        <div className="flex items-center justify-center gap-2 py-3">
          <Footprints className="w-4 h-4 text-rose-500" />
          <span className="text-xs font-semibold text-rose-500">Steps</span>
        </div>
        <div className="flex items-center justify-center gap-2 py-3">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-rose-400 focus:outline-none cursor-pointer"
          >
            <option value="1W" className="bg-[#121A2A] text-white">1 Week</option>
            <option value="1M" className="bg-[#121A2A] text-white">1 Month</option>
            <option value="3M" className="bg-[#121A2A] text-white">3 Months</option>
            <option value="ALL" className="bg-[#121A2A] text-white">All Time</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex items-center justify-center text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-xs font-mono">Loading steps...</span>
        </div>
      ) : (
        <>
          {/* METRICS SUMMARY ROW */}
          <div className="grid grid-cols-3 text-center px-4 py-2 border-b border-gray-800/60">
            <div>
              <div className="text-sm sm:text-base font-bold font-mono text-white tracking-tight">
                {metrics.avg.toLocaleString()}
              </div>
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Average
              </div>
            </div>

            <div>
              <div className="text-sm sm:text-base font-bold font-mono text-white tracking-tight">
                {metrics.best.toLocaleString()}
              </div>
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Best ({metrics.bestDate})
              </div>
            </div>

            <div>
              <div className="text-sm sm:text-base font-bold font-mono text-white tracking-tight">
                {metrics.total.toLocaleString()}
              </div>
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Total
              </div>
            </div>
          </div>

          {/* BAR GRAPH SECTION */}
          <div className="px-4 pt-2">
            <div className="h-48 w-full">
              {filteredData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
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
                      domain={[0, yMax]}
                    />
                    <Tooltip 
                      cursor={{ fill: '#1e293b', opacity: 0.4 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#0f172a] border border-gray-700 p-2 rounded-lg text-xs font-mono shadow-lg">
                              <span className="text-rose-400 font-bold">{payload[0].value.toLocaleString()}</span> steps
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    <ReferenceLine 
                      y={goal} 
                      stroke="#9f1239" 
                      strokeDasharray="3 3" 
                      label={{ value: 'GOAL', fill: '#f43f5e', fontSize: 9, position: 'insideTopRight' }}
                    />

                    <Bar 
                      dataKey="steps" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={46}
                      onClick={(entry) => setSelectedEntryId(entry._id)}
                      className="cursor-pointer"
                    >
                      {filteredData.map((entry) => (
                        <Cell 
                          key={entry._id || entry.isoDate} 
                          fill={selectedEntryId === entry._id ? '#fb7185' : '#f43f5e'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  No step entries recorded for this time period.
                </div>
              )}
            </div>
          </div>

          {/* ENTRIES LIST HEADER */}
          <div className="px-5 pt-4 pb-1 border-b border-gray-800/60 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Entries</h3>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Add step entry"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* REVERSE-ORDER DETAILED LOGS */}
          <div className="divide-y divide-gray-800/50">
            {[...filteredData].reverse().map((entry) => {
              const isSelected = selectedEntryId === entry._id;
              return (
                <div 
                  key={entry._id || entry.isoDate} 
                  onClick={() => setSelectedEntryId(entry._id)}
                  className={`px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected ? 'bg-rose-500/10 border-l-2 border-rose-500' : 'hover:bg-[#161F30]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-gray-200">{entry.fullDate}</div>
                    <div className="text-[11px] text-gray-500">{entry.dayName}</div>
                  </div>
                  <div className={`text-xs font-bold font-mono ${isSelected ? 'text-rose-400' : 'text-gray-100'}`}>
                    {Number(entry.steps).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ADD STEPS MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#162032] border border-gray-800 rounded-2xl w-full max-w-sm p-5 relative shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold text-white mb-4">Log Steps Entry</h3>

            <form onSubmit={handleAddLog} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Steps Count</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newSteps}
                  onChange={(e) => setNewSteps(e.target.value)}
                  placeholder="e.g. 8500"
                  className="w-full bg-[#121A2A] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500 text-sm font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-medium">Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-[#121A2A] border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-rose-600 hover:bg-rose-500 font-bold py-2.5 rounded-xl text-white transition-all disabled:opacity-50 flex items-center justify-center space-x-2 mt-2"
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