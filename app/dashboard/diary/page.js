'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Apple, Sun, Moon, Cookie, Droplet, Search, Edit2, Trash2, BarChart3, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

// Relative path modular popup elements
import CreateFoodModal from '../../components/diary/CreateFoodModal';
import SearchFoodModal from '../../components/diary/SearchFoodModal';
import FoodDetailModal from '../../components/diary/FoodDetailModal';
import CreateRecipeModal from '../../components/diary/CreateRecipeModal'; // Added Import cleanly here

export default function FoodDiary() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [waterAmount, setWaterAmount] = useState(0);
  const [customWater, setCustomWater] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [isHydrated, setIsHydrated] = useState(false); // Eliminates page flash & boot lag
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRecipeCreateOpen, setIsRecipeCreateOpen] = useState(false); // Added State Hook for Recipe Modal
  const [targetFoodMacros, setTargetFoodMacros] = useState(null);

  // Modals UI Layout Chaining State Hooks
  const [activeMealType, setActiveMealType] = useState('breakfast');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedFoodName, setSelectedFoodName] = useState('');
  
  // Holds the document log record if the user clicks Edit
  const [editingLogItem, setEditingLogItem] = useState(null);

  const router = useRouter();
  const mealCategories = ['breakfast', 'lunch', 'dinner', 'snacks'];

  // Wrap query tracking to run flawlessly inside both useEffect sequences
  const fetchDailyLogs = useCallback(async (userId, dateStr) => {
    if (!dateStr) return;
    try {
      const res = await fetch(`/api/food-log?userId=${userId}&date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Database tracking sync crash:", err);
    }
  }, []);

  // Phase 1: Authentication and baseline mounting lookups
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setCurrentDate(today);

    const session = localStorage.getItem('user');
    if (!session) {
      router.push('/');
    } else {
      const parsedUser = JSON.parse(session);
      setUser(parsedUser);
      fetchDailyLogs(parsedUser.id, today);
      
      const savedWater = localStorage.getItem(`water_${today}`);
      if (savedWater) setWaterAmount(parseInt(savedWater, 10));
      setIsHydrated(true);
    }
  }, [router, fetchDailyLogs]);

  // Phase 2: Dynamic timeline triggers when shifting back and forth through dates
  const handleDateChange = (newDateStr) => {
    setCurrentDate(newDateStr);
    if (user) {
      fetchDailyLogs(user.id, newDateStr);
      const savedWater = localStorage.getItem(`water_${newDateStr}`);
      setWaterAmount(savedWater ? parseInt(savedWater, 10) : 0);
    }
  };

  const adjustDateOffset = (offsetAmount) => {
    const current = new Date(currentDate);
    current.setDate(current.getDate() + offsetAmount);
    const calculatedISO = current.toISOString().split('T')[0];
    handleDateChange(calculatedISO);
  };

  const getDisplayDateText = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterdayObj = new Date();
    yesterdayObj.setDate(new Date().getDate() - 1);
    const yesterday = yesterdayObj.toISOString().split('T')[0];
    
    const tomorrowObj = new Date();
    tomorrowObj.setDate(new Date().getDate() + 1);
    const tomorrow = tomorrowObj.toISOString().split('T')[0];

    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    if (dateStr === tomorrow) return 'Tomorrow';

    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleConfirmAddFood = async (foodPayload) => {
    if (!currentDate) return;
    setLoading(true);
    try {
      const res = await fetch('/api/food-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, date: currentDate, ...foodPayload })
      });
      if (res.ok) fetchDailyLogs(user.id, currentDate);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFoodLog = async (logId, updatedPayload) => {
    try {
      const res = await fetch(`/api/food-log/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });
      if (res.ok) fetchDailyLogs(user.id, currentDate);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFoodLog = async (logId) => {
    try {
      const res = await fetch(`/api/food-log/${logId}`, { method: 'DELETE' });
      if (res.ok) fetchDailyLogs(user.id, currentDate);
    } catch (err) {
      console.error(err);
    }
  };

  const quickLogWater = (amountInMl) => {
    if (!currentDate || isNaN(amountInMl) || amountInMl <= 0) return;
    const total = waterAmount + amountInMl;
    setWaterAmount(total);
    localStorage.setItem(`water_${currentDate}`, total);
  };

  const handleCustomWaterSubmit = (e) => {
    e.preventDefault();
    const amount = parseInt(customWater, 10);
    if (!isNaN(amount) && amount > 0) {
      quickLogWater(amount);
      setCustomWater('');
    }
  };

  // Nutrition Totals Math Engine
  const totalCalories = logs.reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = logs.reduce((sum, item) => sum + item.protein, 0);
  const totalCarbs = logs.reduce((sum, item) => sum + item.carbs, 0);
  const totalFat = logs.reduce((sum, item) => sum + item.fat, 0);

  const goalCalories = user?.targetCalories || 2339;
  const remainingCalories = goalCalories - totalCalories;

  const targets = { c: 234, p: 175, f: 78 };

  const getMealIcon = (type) => {
    switch(type) {
      case 'breakfast': return <Apple className="w-3.5 h-3.5 text-emerald-400" />;
      case 'lunch': return <Sun className="w-3.5 h-3.5 text-amber-400" />;
      case 'dinner': return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
      default: return <Cookie className="w-3.5 h-3.5 text-orange-400" />;
    }
  };

  const MacroCircle = ({ current, target, colorClass, label }) => {
    const percentage = Math.min((current / target) * 100, 100) || 0;
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center bg-[#161F30]/40 border border-gray-800/50 rounded-xl p-3 flex-1">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="28" cy="28" r={radius} stroke="#1C2638" strokeWidth="3.5" fill="transparent" />
            <circle 
              cx="28" cy="28" r={radius} strokeWidth="3.5" fill="transparent"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              className={`${colorClass} transition-all duration-500 ease-out`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-[10px] font-mono font-bold text-white">{Math.round(percentage)}%</div>
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1.5">{label}</p>
        <p className="text-xs font-mono font-bold text-white mt-0.5">{Math.round(current)}g<span className="text-gray-500 font-normal text-[10px]">/{target}g</span></p>
      </div>
    );
  };

  if (!isHydrated || !currentDate) {
    return <div className="min-h-screen bg-[#0B121F] text-white p-8 font-mono text-xs animate-pulse">Synchronizing Diary Session Matrix...</div>;
  }

  return (
    <main className="min-h-screen bg-[#0B121F] text-white p-4 md:p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Compact Navigation Bar */}
        <button onClick={() => router.push('/dashboard')} className="flex items-center space-x-2 text-gray-400 hover:text-white mb-4 text-xs font-bold uppercase tracking-wider transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>

        {/* --- DYNAMIC DATE NAVIGATOR ROW --- */}
        <div className="flex items-center justify-between bg-[#121A2A] border border-gray-800/80 rounded-2xl p-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#161F30] border border-gray-800 rounded-xl">
              <Calendar className="w-4 h-4 text-[#00A86B]" />
            </div>
            <div>
              <h4 className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">Selected Log Period</h4>
              <p className="text-xs font-black text-white mt-0.5">{getDisplayDateText(currentDate)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1.5">
            <button 
              onClick={() => adjustDateOffset(-1)}
              className="p-1.5 bg-[#161F30] hover:bg-[#1C2638] border border-gray-800 text-gray-400 hover:text-white rounded-lg transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input 
              type="date" 
              value={currentDate} 
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-[#161F30] border border-gray-800 rounded-xl px-2.5 py-1 text-[11px] font-mono font-bold text-white focus:outline-none focus:border-[#00A86B] cursor-pointer"
            />
            <button 
              onClick={() => adjustDateOffset(1)}
              className="p-1.5 bg-[#161F30] hover:bg-[#1C2638] border border-gray-800 text-gray-400 hover:text-white rounded-lg transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* --- DASHBOARD HEADER MATRIX --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          
          {/* Calories Remaining Card */}
          <div className="bg-[#121A2A] border border-gray-800/80 rounded-2xl p-4 flex flex-col justify-center items-center md:col-span-1">
            <p className="text-3xl font-black tracking-tight text-white">{remainingCalories.toLocaleString()}</p>
            <p className="text-[10px] text-[#00A86B] font-mono uppercase tracking-widest mt-0.5 font-bold">Remaining Kcal</p>
            
            <div className="flex items-center justify-between w-full border-t border-gray-800/80 mt-3 pt-2 text-[11px] text-gray-400 font-mono">
              <div>Goal: <span className="text-white font-bold">{goalCalories}</span></div>
              <div className="text-gray-700">•</div>
              <div>Food: <span className="text-amber-500 font-bold">{totalCalories}</span></div>
            </div>
          </div>

          {/* Macro Circles Grid */}
          <div className="md:col-span-2 flex space-x-3 bg-[#121A2A] border border-gray-800/80 rounded-2xl p-3">
            <MacroCircle current={totalCarbs} target={targets.c} colorClass="stroke-cyan-500" label="Carbs" />
            <MacroCircle current={totalProtein} target={targets.p} colorClass="stroke-emerald-500" label="Protein" />
            <MacroCircle current={totalFat} target={targets.f} colorClass="stroke-purple-500" label="Fats" />
          </div>

        </div>

        {/* --- INTERACTIVE LOGGING CORE WORKSPACE --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* CONTROL CARDS PANEL */}
          <div className="space-y-4 col-span-1">
            
            {/* Database Assistant Box */}
            <div className="bg-[#121A2A] border border-gray-800 rounded-2xl p-4 space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Database Assistant</h3>
              <p className="text-[11px] text-gray-500 leading-normal mb-1">Browse standard verification listings to seamlessly allocate macro components.</p>
              
              <button 
                onClick={() => {
                  setEditingLogItem(null);
                  setActiveMealType('breakfast');
                  setIsSearchOpen(true);
                }} 
                className="w-full bg-[#00A86B] hover:bg-[#00945D] text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Browse Food</span>
              </button>

              {/* Added: Custom Recipe Creator Trigger Button */}
              <button 
                onClick={() => setIsRecipeCreateOpen(true)}
                className="w-full bg-emerald-950/40 border border-dashed border-emerald-800/80 text-emerald-400 hover:bg-emerald-950/70 font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-3 h-3 text-[#00A86B]" />
                <span>Create Custom Recipe</span>
              </button>

              {/* Custom Food Creator Trigger */}
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="w-full border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-3 h-3" />
                <span>Create Custom Food Entry</span>
              </button>

              {/* Graphical Macro Analytics Navigation Button */}
              <button 
                onClick={() => router.push('/dashboard/analytics')}
                className="w-full bg-[#1C2638] border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 pt-2"
              >
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>View Macro Analytics & History</span>
              </button>
            </div>

            {/* Water Log Module */}
            <div className="bg-[#121A2A] border border-gray-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-gray-800/40 pb-2">
                <div className="flex items-center space-x-1.5">
                  <Droplet className="w-3.5 h-3.5 text-cyan-400" />
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-white">Water Intake</h4>
                </div>
                <p className="text-[11px] font-mono font-bold text-cyan-400">{waterAmount}ml</p>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => quickLogWater(250)} className="bg-[#1C2638]/70 border border-gray-800 hover:border-cyan-800 hover:text-cyan-400 text-[10px] font-bold py-2 rounded-xl transition-all">+250 ml</button>
                <button onClick={() => quickLogWater(500)} className="bg-[#1C2638]/70 border border-gray-800 hover:border-cyan-800 hover:text-cyan-400 text-[10px] font-bold py-2 rounded-xl transition-all">+500 ml</button>
              </div>

              {/* Custom Input */}
              <form onSubmit={handleCustomWaterSubmit} className="relative flex items-center mt-2">
                <input 
                  type="number" 
                  min="1" 
                  placeholder="Exact amount (ml)" 
                  value={customWater}
                  onChange={(e) => setCustomWater(e.target.value)}
                  className="w-full bg-[#1C2638] border border-gray-800 rounded-xl pl-3 pr-16 py-2 text-[11px] text-white focus:outline-none focus:border-cyan-500 placeholder-gray-600 font-mono"
                />
                <button 
                  type="submit" 
                  className="absolute right-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase transition-all"
                >
                  + Add
                </button>
              </form>

              <button onClick={() => setWaterAmount(0) || localStorage.setItem(`water_${currentDate}`, 0)} className="w-full text-center text-[9px] font-mono text-gray-600 hover:text-red-400 transition-colors uppercase pt-1 block tracking-wider">Reset Water</button>
            </div>

          </div>

          {/* CHRONOLOGICAL MEAL CATEGORY BLOCKS */}
          <div className="md:col-span-2 space-y-3">
            {mealCategories.map((category) => {
              const categoryLogs = logs.filter(item => item.mealType === category);
              const categoryCalories = categoryLogs.reduce((sum, item) => sum + item.calories, 0);

              return (
                <div key={category} className="bg-[#121A2A] border border-gray-800/70 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b border-gray-800/40 pb-2 mb-2">
                      <div className="flex items-center space-x-2">
                        {getMealIcon(category)}
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-white capitalize">{category}</h4>
                      </div>
                      <p className="text-xs font-mono font-bold text-gray-400">{categoryCalories} kcal</p>
                    </div>

                    {categoryLogs.length === 0 ? (
                      <p className="text-[11px] text-gray-600 italic py-1 mb-1">Awaiting entries...</p>
                    ) : (
                      <div className="space-y-1.5 mb-2">
                        {categoryLogs.map((item) => (
                          <div 
                            key={item._id || item.id} 
                            className="group flex justify-between items-center bg-[#161F30]/20 border border-gray-800/40 p-3 rounded-xl hover:border-gray-700/80 hover:bg-[#161F30]/40 transition-all"
                          >
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="font-semibold text-xs text-gray-200 truncate">{item.foodName}</p>
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                {item.amount}{item.unit} • C:{Math.round(item.carbs)}g P:{Math.round(item.protein)}g F:{Math.round(item.fat)}g
                              </p>
                            </div>
                            
                            <div className="flex items-center space-x-3 flex-shrink-0">
                              <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center space-x-2 transition-all duration-150">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingLogItem(item);
                                    setSelectedFoodName(item.foodName);
                                    setActiveMealType(item.mealType);
                                    setIsDetailOpen(true);
                                  }}
                                  className="p-1.5 hover:bg-[#1C2638] text-gray-400 hover:text-emerald-400 rounded-lg transition-colors"
                                  title="Edit Log"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFoodLog(item._id || item.id);
                                  }}
                                  className="p-1.5 hover:bg-[#1C2638] text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                                  title="Delete Log"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <p className="text-xs font-mono font-bold text-amber-500 min-w-[55px] text-right">
                                +{item.calories} kcal
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      setEditingLogItem(null);
                      setActiveMealType(category);
                      setIsSearchOpen(true);
                    }}
                    className="w-full border border-dashed border-gray-800 hover:border-gray-700 hover:bg-[#161F30]/20 py-2 rounded-xl text-[10px] font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-all flex items-center justify-center space-x-1 mt-1"
                  >
                    <Plus className="w-3 h-3 text-[#00A86B]" />
                    <span>Add Food</span>
                  </button>
                </div>
              );
            })}
          </div>

        </div>

        {/* --- OVERLAY POPUP LAYER CONTROLLERS --- */}
        <SearchFoodModal
          isOpen={isSearchOpen}
          mealType={activeMealType}
          onClose={() => setIsSearchOpen(false)}
          onSelectFood={(foodItemData) => {
            setIsSearchOpen(false);
            setSelectedFoodName(foodItemData.foodName);
            
            setTargetFoodMacros({
              foodName: `${foodItemData.brand !== 'Generic' ? `[${foodItemData.brand}] ` : ''}${foodItemData.foodName}`,
              caloriesPer100g: foodItemData.calories,
              carbsPer100g: foodItemData.carbs,
              proteinPer100g: foodItemData.protein,
              fatPer100g: foodItemData.fat
            });
            
            setIsDetailOpen(true);
          }}
        />

        <FoodDetailModal
          isOpen={isDetailOpen}
          foodName={selectedFoodName}
          mealType={activeMealType}
          initialData={editingLogItem || targetFoodMacros} 
          onClose={() => {
            setIsDetailOpen(false);
            setEditingLogItem(null);
            setTargetFoodMacros(null); 
          }}
          onConfirmLog={handleConfirmAddFood}
          onUpdateLog={handleUpdateFoodLog} 
        />

        <CreateFoodModal 
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          userId={user.id}
          onFoodCreated={() => fetchDailyLogs(user.id, currentDate)}
        />

        {/* Added: Mounted CreateRecipeModal Hook Layer cleanly here */}
        <CreateRecipeModal
          isOpen={isRecipeCreateOpen}
          onClose={() => setIsRecipeCreateOpen(false)}
          userId={user.id}
          onRecipeCreated={() => fetchDailyLogs(user.id, currentDate)}
        />

      </div>
    </main>
  );
}