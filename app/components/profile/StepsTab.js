'use client';

import { useState, useMemo } from 'react';
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

// INITIAL DUMMY LOGS
const MOCK_STEP_DATA = [
  { _id: '1', dateStr: '8/15', fullDate: 'Friday, August 15, 2026', dayName: 'Friday', steps: 1750, isoDate: '2026-08-15' },
  { _id: '2', dateStr: '8/16', fullDate: 'Saturday, August 16, 2026', dayName: 'Saturday', steps: 250, isoDate: '2026-08-16' },
  { _id: '3', dateStr: '8/17', fullDate: 'Sunday, August 17, 2026', dayName: 'Sunday', steps: 2850, isoDate: '2026-08-17' },
  { _id: '4', dateStr: '8/18', fullDate: 'Monday, August 18, 2026', dayName: 'Monday', steps: 8060, isoDate: '2026-08-18' },
  { _id: '5', dateStr: '8/19', fullDate: 'Tuesday, August 19, 2026', dayName: 'Tuesday', steps: 5487, isoDate: '2026-08-19' },
  { _id: '6', dateStr: '8/20', fullDate: 'Wednesday, August 20, 2026', dayName: 'Wednesday', steps: 2648, isoDate: '2026-08-20' },
  { _id: '7', dateStr: '8/21', fullDate: 'Thursday, August 21, 2026', dayName: 'Thursday', steps: 740, isoDate: '2026-08-21' },
];

const TARGET_STEP_GOAL = 10000;

export default function StepsTab({ initialData = MOCK_STEP_DATA, goal = TARGET_STEP_GOAL }) {
  const [data, setData] = useState(initialData);
  const [timeRange, setTimeRange] = useState('1W');
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [newSteps, setNewSteps] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

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

  // Handle Add Entry Form Submit
  const handleAddLog = (e) => {
    e.preventDefault();
    if (!newSteps) return;

    setSubmitting(true);
    const dateObj = new Date(newDate);
    
    const newEntry = {
      _id: Date.now().toString(),
      dateStr: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
      fullDate: dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      dayName: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
      steps: Number(newSteps),
      isoDate: newDate,
    };

    // Replace if date exists, else append
    setData((prev) => {
      const existsIndex = prev.findIndex((item) => item.isoDate === newDate);
      if (existsIndex > -1) {
        const updated = [...prev];
        updated[existsIndex] = newEntry;
        return updated;
      }
      return [...prev, newEntry];
    });

    setSubmitting(false);
    setIsModalOpen(false);
    setNewSteps('');
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

      {/* RED BAR GRAPH SECTION */}
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

                {/* Step Goal Line */}
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
                disabled={submitting}z
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