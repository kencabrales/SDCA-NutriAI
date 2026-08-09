'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LayoutDashboard, BarChart3, TrendingUp, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Calendar, Sliders, Droplet } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// 1. TOOLTIP FOR CALORIE TIMELINE GRAPH (Meal Breakdown)
const CalorieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    if (data.isAvgColumn) {
      return (
        <div className="bg-[#121A2A] border border-gray-800 p-3 rounded-xl shadow-xl font-sans text-xs min-w-[160px]">
          <p className="font-mono text-[10px] text-gray-400 uppercase tracking-wider mb-2 font-black border-b border-gray-800 pb-1">
            Timeframe Summary
          </p>
          <div className="space-y-1 text-gray-300">
            <div className="flex justify-between"><span className="text-gray-400">Avg Calories:</span> <span className="font-mono font-bold text-white">{data.calories} kcal</span></div>
            <div className="flex justify-between border-t border-gray-800/60 mt-1 pt-1 font-bold text-[#00A86B]"><span className="text-gray-400">Total Period:</span> <span>{data.totalPeriodCalories?.toLocaleString()} kcal</span></div>
          </div>
        </div>
      );
    }

    const dateObj = new Date(data.date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'long', 
      day: 'numeric' 
    });

    return (
      <div className="bg-[#121A2A] border border-gray-800 p-3 rounded-xl shadow-xl font-sans text-xs min-w-[160px] space-y-2">
        <p className="font-bold text-white border-b border-gray-800 pb-1 text-center">{formattedDate}</p>
        <div className="space-y-0.5 text-gray-300">
          <div className="flex justify-between"><span className="text-gray-400">Breakfast:</span> <span className="font-mono text-white">{data.breakfast}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Lunch:</span> <span className="font-mono text-white">{data.lunch}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Dinner:</span> <span className="font-mono text-white">{data.dinner}</span></div>
          <div className="flex justify-between mb-1.5"><span className="text-gray-400">Snack:</span> <span className="font-mono text-white">{data.snacks}</span></div>
          
          <div className="flex justify-between border-t border-gray-800/80 pt-1 text-[11px] font-bold">
            <span className="text-gray-400">Total Calories:</span>
            <span className="font-mono text-[#00A86B]">{data.calories} kcal</span>
          </div>
          <div className="flex justify-between border-t border-gray-800/40 pt-1 text-[11px] font-bold text-blue-400">
            <span className="flex items-center gap-1"><Droplet className="w-3 h-3 fill-current" /> Water:</span>
            <span className="font-mono">{data.water} ml</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// 2. TOOLTIP FOR MACRONUTRIENT GRAPH (Carbs, Fats, Protein Breakdown)
const MacroTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    if (data.isAvgColumn) {
      return (
        <div className="bg-[#121A2A] border border-gray-800 p-3 rounded-xl shadow-xl font-sans text-xs min-w-[170px]">
          <p className="font-mono text-[10px] text-gray-400 uppercase tracking-wider mb-2 font-black border-b border-gray-800 pb-1">
            Timeframe Summary
          </p>
          <div className="space-y-1 text-gray-300">
            <div className="flex justify-between font-bold text-gray-400 border-b border-gray-800/40 pb-0.5"><span>Macro</span> <span>Avg</span> <span>Total</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Carbs:</span> <span className="font-mono text-[#06B6D4]">{Math.round(data.carbs)}g</span> <span className="font-mono text-gray-400">{Math.round(data.totalPeriodCarbs)}g</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Fats:</span> <span className="font-mono text-[#8B5CF6]">{Math.round(data.fat)}g</span> <span className="font-mono text-gray-400">{Math.round(data.totalPeriodFat)}g</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Protein:</span> <span className="font-mono text-[#10B981]">{Math.round(data.protein)}g</span> <span className="font-mono text-gray-400">{Math.round(data.totalPeriodProtein)}g</span></div>
          </div>
        </div>
      );
    }

    const dateObj = new Date(data.date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'long', 
      day: 'numeric' 
    });

    return (
      <div className="bg-[#121A2A] border border-gray-800 p-3 rounded-xl shadow-xl font-sans text-xs min-w-[160px] space-y-2">
        <p className="font-bold text-white border-b border-gray-800 pb-1 text-center">{formattedDate}</p>
        <div className="space-y-0.5 text-gray-300">
          <div className="flex justify-between"><span className="text-gray-400">Carbs:</span> <span className="font-mono font-bold text-[#06B6D4]">{Math.round(data.carbs)}g</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Fats:</span> <span className="font-mono font-bold text-[#8B5CF6]">{Math.round(data.fat)}g</span></div>
          <div className="flex justify-between mb-1.5"><span className="text-gray-400">Protein:</span> <span className="font-mono font-bold text-[#10B981]">{Math.round(data.protein)}g</span></div>
          
          <div className="flex justify-between border-t border-gray-800/40 pt-1 text-[11px] font-bold text-blue-400">
            <span className="flex items-center gap-1"><Droplet className="w-3 h-3 fill-current" /> Water:</span>
            <span className="font-mono">{data.water} ml</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function AnalyticsDashboard() {
  const [timeframe, setTimeframe] = useState(7);
  const [anchorDate, setAnchorDate] = useState('');
  const [chartData, setChartData] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const dateInputRef = useRef(null);
  const targets = { calories: 2339, protein: 175, carbs: 234, fat: 78 };

  const generateDateRange = useCallback((startDateStr, daysCount) => {
    const dates = [];
    const start = new Date(startDateStr);
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  const fetchAnalytics = useCallback(async (userId, baseDate, days) => {
    setLoading(true);
    try {
      const dateSequence = generateDateRange(baseDate, days);
      const lastRangeDate = dateSequence[dateSequence.length - 1];
      
      const res = await fetch(`/api/analytics?userId=${userId}&days=${days}&startDate=${baseDate}&endDate=${lastRangeDate}`);
      if (!res.ok) throw new Error('Network analytics framework retrieval crash');
      
      const resData = await res.json();
      const rawLogs = resData.data || resData.logs || [];

      const processedDays = dateSequence.map(dateStr => {
        const dailyItems = rawLogs.filter(item => {
          const logItemDate = (item.date || item.logDate || '');
          return logItemDate.split('T')[0] === dateStr;
        });
        
        const dayMap = {
          date: dateStr,
          displayDay: new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
          displayNum: dateStr.split('-')[2],
          calories: 0,
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          snacks: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          water: 0
        };

        dailyItems.forEach(item => {
          if (item.type === 'water' || item.waterVolume) {
            dayMap.water += Math.round(item.waterVolume || item.amount || 0);
            return;
          }

          const mType = (item.mealType || 'snacks').toLowerCase().trim();
          const kcals = Math.round(item.calories || 0);
          dayMap.calories += kcals;
          dayMap.protein += item.protein || 0;
          dayMap.carbs += item.carbs || 0;
          dayMap.fat += item.fat || 0;
          if (item.water) dayMap.water += Math.round(item.water);

          if (mType === 'breakfast') dayMap.breakfast += kcals;
          else if (mType === 'lunch') dayMap.lunch += kcals;
          else if (mType === 'dinner') dayMap.dinner += kcals;
          else dayMap.snacks += kcals;
        });

        return dayMap;
      });

      const totalCalories = processedDays.reduce((s, d) => s + d.calories, 0);
      const totalBreakfast = processedDays.reduce((s, d) => s + d.breakfast, 0);
      const totalLunch = processedDays.reduce((s, d) => s + d.lunch, 0);
      const totalDinner = processedDays.reduce((s, d) => s + d.dinner, 0);
      const totalSnacks = processedDays.reduce((s, d) => s + d.snacks, 0);
      const totalProtein = processedDays.reduce((s, d) => s + d.protein, 0);
      const totalCarbs = processedDays.reduce((s, d) => s + d.carbs, 0);
      const totalFat = processedDays.reduce((s, d) => s + d.fat, 0);
      const totalWater = processedDays.reduce((s, d) => s + d.water, 0);

      const count = processedDays.length || 1;

      setChartData([
        ...processedDays,
        {
          date: 'avg',
          displayDay: 'Avg',
          displayNum: '',
          calories: Math.round(totalCalories / count),
          breakfast: Math.round(totalBreakfast / count),
          lunch: Math.round(totalLunch / count),
          dinner: Math.round(totalDinner / count),
          snacks: Math.round(totalSnacks / count),
          protein: Math.round(totalProtein / count),
          carbs: Math.round(totalCarbs / count),
          fat: Math.round(totalFat / count),
          water: Math.round(totalWater / count),
          totalPeriodCalories: totalCalories,
          totalPeriodProtein: totalProtein,
          totalPeriodCarbs: totalCarbs,
          totalPeriodFat: totalFat,
          totalPeriodWater: totalWater,
          isAvgColumn: true
        }
      ]);

    } catch (err) {
      console.error("Data ingestion failure:", err);
    } finally {
      setLoading(false);
    }
  }, [generateDateRange]);

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (!session) return router.push('/');
    
    const parsedUser = JSON.parse(session);
    setUser(parsedUser);
    
    const todayStr = new Date().toISOString().split('T')[0];
    setAnchorDate(todayStr);
    
    fetchAnalytics(parsedUser.id, todayStr, timeframe);
  }, [timeframe, router, fetchAnalytics]);

  const shiftTimeWindow = (direction) => {
    const current = new Date(anchorDate);
    current.setDate(current.getDate() + (direction * timeframe));
    const nextDateStr = current.toISOString().split('T')[0];
    setAnchorDate(nextDateStr);
    if (user) fetchAnalytics(user.id, nextDateStr, timeframe);
  };

  const handleCalendarChange = (e) => {
    const selectedValue = e.target.value;
    if (!selectedValue) return;
    setAnchorDate(selectedValue);
    if (user) fetchAnalytics(user.id, selectedValue, timeframe);
  };

  const handleTimeframeChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) return;
    setTimeframe(val);
    if (user && anchorDate) fetchAnalytics(user.id, anchorDate, val);
  };

  const openCalendarPicker = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch (err) {
        dateInputRef.current.focus();
      }
    }
  };

  const clearDaysOnly = chartData.filter(d => !d.isAvgColumn);
  const totalDaysCount = clearDaysOnly.length || 1;
  
  const sumProtein = clearDaysOnly.reduce((sum, d) => sum + d.protein, 0);
  const sumCarbs = clearDaysOnly.reduce((sum, d) => sum + d.carbs, 0);
  const sumFat = clearDaysOnly.reduce((sum, d) => sum + d.fat, 0);
  const sumWater = clearDaysOnly.reduce((sum, d) => sum + d.water, 0);

  const avgProtein = sumProtein / totalDaysCount;
  const avgCarbs = sumCarbs / totalDaysCount;
  const avgFat = sumFat / totalDaysCount;
  const avgWater = sumWater / totalDaysCount;

  const getTimelineString = () => {
    if (clearDaysOnly.length === 0) return '';
    const start = new Date(clearDaysOnly[0].date);
    const end = new Date(clearDaysOnly[clearDaysOnly.length - 1].date);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  if (!user || loading) return <div className="p-8 font-mono text-xs text-white">Generating Stats...</div>;

  return (
    <main className="min-h-screen bg-[#0B121F] text-white p-4 md:p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation header row */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-[#121A2A] p-4 rounded-2xl border border-gray-800/60">
          
          {/* Action Navigation Buttons */}
          <div className="flex items-center space-x-3 shrink-0">
            <button onClick={() => router.push('/dashboard/diary')} className="flex items-center space-x-2 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back To Diary</span>
            </button>
            <span className="text-gray-700">|</span>
            <button onClick={() => router.push('/dashboard')} className="flex items-center space-x-2 text-gray-400 hover:text-[#00A86B] text-xs font-bold uppercase tracking-wider transition-colors">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          </div>

          {/* DataNavigator Center Block */}
          <div className="flex items-center space-x-4 bg-[#0B121F] px-4 py-1.5 rounded-xl border border-gray-800 shrink-0">
            <button onClick={() => shiftTimeWindow(-1)} className="p-1 text-gray-400 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div onClick={openCalendarPicker} className="text-center min-w-[140px] cursor-pointer hover:opacity-80 active:scale-95 transition-all">
              <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest flex items-center justify-center gap-1">
                <Calendar className="w-2.5 h-2.5 text-[#00A86B]" /> Starts On Date
              </p>
              <p className="text-xs font-bold text-white mt-0.5 border-b border-dashed border-gray-600">
                {getTimelineString()}
              </p>
              <input ref={dateInputRef} type="date" value={anchorDate} onChange={handleCalendarChange} className="pointer-events-none absolute opacity-0 w-0 h-0" />
            </div>

            <button onClick={() => shiftTimeWindow(1)} className="p-1 text-gray-400 hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Control Presets */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex bg-[#0B121F] p-1 rounded-xl border border-gray-800">
              <button onClick={() => setTimeframe(7)} className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-wider rounded-lg transition-all ${timeframe === 7 ? 'bg-[#00A86B] text-white' : 'text-gray-400 hover:text-white'}`}>Weekly View</button>
              <button onClick={() => setTimeframe(30)} className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-wider rounded-lg transition-all ${timeframe === 30 ? 'bg-[#00A86B] text-white' : 'text-gray-400 hover:text-white'}`}>Monthly View</button>
            </div>

            <div className="flex items-center space-x-2 bg-[#0B121F] p-1.5 px-3 rounded-xl border border-gray-800">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <input type="number" min="1" max="90" value={timeframe} onChange={handleTimeframeChange} className="w-10 bg-[#121A2A] border border-gray-700 rounded px-1 py-0.5 font-mono text-xs text-center font-bold text-white focus:outline-none focus:border-cyan-400" />
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">Days Custom</span>
            </div>
          </div>
        </div>

        {/* Info Cards Matrix displaying both Avg and Totals */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#121A2A] border border-gray-800/80 rounded-2xl p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Protein Compliance</p>
            <p className="text-2xl font-mono font-black text-white">{Math.round(avgProtein)}g <span className="text-xs text-gray-500">avg</span></p>
            <p className="text-xs font-mono font-bold text-gray-400">Total: {Math.round(sumProtein)}g</p>
            {avgProtein < targets.protein ? (
              <p className="text-[10px] text-red-400 flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3" /> Lacking {Math.round(targets.protein - avgProtein)}g</p>
            ) : (
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1"><CheckCircle className="w-3 h-3" /> Meeting baseline goals</p>
            )}
          </div>

          <div className="bg-[#121A2A] border border-gray-800/80 rounded-2xl p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Carbohydrate Metrics</p>
            <p className="text-2xl font-mono font-black text-white">{Math.round(avgCarbs)}g <span className="text-xs text-gray-500">avg</span></p>
            <p className="text-xs font-mono font-bold text-gray-400">Total: {Math.round(sumCarbs)}g</p>
            {avgCarbs < targets.carbs ? (
              <p className="text-[10px] text-cyan-400 flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3" /> Under optimal loading</p>
            ) : (
              <p className="text-[10px] text-amber-500 flex items-center gap-1 mt-1"><CheckCircle className="w-3 h-3" /> Energy saturation high</p>
            )}
          </div>

          <div className="bg-[#121A2A] border border-gray-800/80 rounded-2xl p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Fat Distributions</p>
            <p className="text-2xl font-mono font-black text-white">{Math.round(avgFat)}g <span className="text-xs text-gray-500">avg</span></p>
            <p className="text-xs font-mono font-bold text-gray-400">Total: {Math.round(sumFat)}g</p>
            {avgFat < targets.fat ? (
              <p className="text-[10px] text-purple-400 flex items-center gap-1 mt-1"><CheckCircle className="w-3 h-3" /> Lean lipid maintained</p>
            ) : (
              <p className="text-[10px] text-red-400 flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3" /> Exceeding max limits</p>
            )}
          </div>

          <div className="bg-[#121A2A] border border-gray-800/80 rounded-2xl p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-wider font-blue-400 flex items-center gap-1"><Droplet className="w-3 h-3 fill-current" /> Fluid Hydration</p>
            <p className="text-2xl font-mono font-black text-white">{Math.round(avgWater)}ml <span className="text-xs text-gray-500">avg</span></p>
            <p className="text-xs font-mono font-bold text-blue-400">Total: {(sumWater / 1000).toFixed(1)}L</p>
            <p className="text-[10px] text-gray-500 mt-1">Tracked consumption volume</p>
          </div>
        </div>

        {/* GRAPH 1: STACKED CALORIE MEAL ANALYSIS */}
        <div className="bg-[#121A2A] border border-gray-800 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-300 mb-4 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-[#00A86B]" /> Calorie Timeline Log Analysis</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1C2638" vertical={false} />
                <XAxis dataKey="displayDay" stroke="#4B5563" fontSize={9} />
                <YAxis stroke="#4B5563" fontSize={9} />
                <Tooltip content={<CalorieTooltip />} />
                <Bar dataKey="breakfast" name="Breakfast" stackId="caloryStack" fill="#3B82F6" />
                <Bar dataKey="lunch" name="Lunch" stackId="caloryStack" fill="#60A5FA" />
                <Bar dataKey="dinner" name="Dinner" stackId="caloryStack" fill="#2563EB" />
                <Bar dataKey="snacks" name="Snacks" stackId="caloryStack" fill="#1D4ED8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 2: STACKED MACRONUTRIENT BALANCE MATRIX */}
        <div className="bg-[#121A2A] border border-gray-800 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-300 mb-4 flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-cyan-400" /> Macronutrient Balance Allocation Comparison</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1C2638" vertical={false} />
                <XAxis dataKey="displayDay" stroke="#4B5563" fontSize={9} />
                <YAxis stroke="#4B5563" fontSize={9} />
                <Tooltip content={<MacroTooltip />} />
                <Bar dataKey="carbs" name="Carbs (g)" stackId="macroStack" fill="#06B6D4" />
                <Bar dataKey="fat" name="Fats (g)" stackId="macroStack" fill="#8B5CF6" />
                <Bar dataKey="protein" name="Protein (g)" stackId="macroStack" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </main>
  );
}