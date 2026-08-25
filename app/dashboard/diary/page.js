// app/dashboard/diary/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Apple, Sun, Moon, Cookie, Droplet, Edit2, Trash2, ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react';

import CreateFoodModal from '../../components/diary/CreateFoodModal';
import SearchFoodModal from '../../components/diary/LogFoodModal';
import FoodDetailModal from '../../components/diary/FoodDetailModal';
import CreateRecipeModal from '../../components/diary/CreateRecipeModal';
import CreateMealModal from '../../components/diary/CreateMealModal';
import Toast from '../../components/Toast';
import { ConfirmProvider, useConfirm } from '../../components/ConfirmContext';
import {
  getTodayPH,
  dateStringToUTCAnchor,
  utcAnchorToDateString,
  addDaysUTC,
} from '@/lib/dateUtils';

function FoodDiaryContent() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [waterAmount, setWaterAmount] = useState(0);
  const [customWater, setCustomWater] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [mealSuggestion, setMealSuggestion] = useState(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  
  // Modals and Food Editing State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFoodItem, setEditingFoodItem] = useState(null);
  const [isRecipeCreateOpen, setIsRecipeCreateOpen] = useState(false);
  const [isMealCreateOpen, setIsMealCreateOpen] = useState(false);
  const [targetFoodMacros, setTargetFoodMacros] = useState(null);

  const confirm = useConfirm();

  // Global Toast State
  const [toast, setToast] = useState({
    show: false,
    title: '',
    message: '',
    type: 'error'
  });

  const showToastNotification = useCallback((title, message, type = 'error') => {
    setToast({ show: true, title, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  }, []);

  const [activeMealType, setActiveMealType] = useState('breakfast');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedFoodName, setSelectedFoodName] = useState('');
  const [editingLogItem, setEditingLogItem] = useState(null);

  const router = useRouter();
  const mealCategories = ['breakfast', 'lunch', 'dinner', 'snacks'];

const fetchDailyLogs = useCallback(async (userId, dateStr) => {
  if (!dateStr || !userId) return;
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

// AI meal suggestion always analyzes TODAY (Philippine time), full stop.
// It intentionally does NOT accept a date argument — that's what let the
// calendar navigation drag it into re-analyzing past days and firing on
// every click. `forceRefresh` should only be true when a food log actually
// changed for today; a plain page load/refresh leaves it false so the
// backend serves its cached result instead of spending another AI call.
const fetchMealSuggestion = useCallback(async (userId, forceRefresh = false) => {
  if (!userId) return;
  setIsLoadingSuggestion(true);
  try {
    const todayStr = getTodayPH();
    const refreshParam = forceRefresh ? '&refresh=true' : '';
    const res = await fetch(`/api/ai/insights?userId=${userId}&date=${todayStr}${refreshParam}`);
    if (res.ok) {
      const data = await res.json();
      setMealSuggestion(data.mealSuggestion || null);
    }
  } catch (err) {
    console.error("Failed to fetch meal suggestion:", err);
  } finally {
    setIsLoadingSuggestion(false);
  }
}, []);

useEffect(() => {
  const today = getTodayPH();
  setCurrentDate(today);

  const session = localStorage.getItem('user');
  if (!session) {
    router.push('/');
  } else {
    const parsedUser = JSON.parse(session);
    setUser(parsedUser);
    fetchDailyLogs(parsedUser.id || parsedUser._id, today);
    fetchMealSuggestion(parsedUser.id || parsedUser._id);
    
    const savedWater = localStorage.getItem(`water_${today}`);
    if (savedWater) setWaterAmount(parseInt(savedWater, 10));
    setIsHydrated(true);
  }
}, [router, fetchDailyLogs, fetchMealSuggestion]);

  // Browsing the calendar only ever changes which day's LOGS you're looking
  // at. It never touches the AI suggestion — that stays pinned to today.
  const handleDateChange = (newDateStr) => {
    setCurrentDate(newDateStr);
    if (user) {
      fetchDailyLogs(user.id || user._id, newDateStr);
      const savedWater = localStorage.getItem(`water_${newDateStr}`);
      setWaterAmount(savedWater ? parseInt(savedWater, 10) : 0);
    }
  };

  const adjustDateOffset = (offsetAmount) => {
    const anchor = dateStringToUTCAnchor(currentDate);
    const calculatedISO = utcAnchorToDateString(addDaysUTC(anchor, offsetAmount));
    handleDateChange(calculatedISO);
  };

  const getDisplayDateText = (dateStr) => {
    const today = getTodayPH();
    const todayAnchor = dateStringToUTCAnchor(today);
    const yesterday = utcAnchorToDateString(addDaysUTC(todayAnchor, -1));
    const tomorrow = utcAnchorToDateString(addDaysUTC(todayAnchor, 1));

    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    if (dateStr === tomorrow) return 'Tomorrow';

    const anchor = dateStringToUTCAnchor(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    }).format(anchor);
  };

  const handleConfirmAddFood = async (foodPayload) => {
    if (!currentDate || !user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/food-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id || user._id, date: currentDate, ...foodPayload })
      });

if (res.ok) {
  fetchDailyLogs(user.id || user._id, currentDate);
  // Only refresh the AI suggestion if the log we just added actually
  // belongs to today — logging a food entry to a past date shouldn't
  // touch today's suggestion at all.
  if (currentDate === getTodayPH()) {
    fetchMealSuggestion(user.id || user._id, true);
  }
  const userRes = await fetch(`/api/user/profile?userId=${user.id || user._id}`);
        if (userRes.ok) {
          const updatedUserData = await userRes.json();
          const newUserObj = { ...user, ...updatedUserData };
          setUser(newUserObj);
          localStorage.setItem('user', JSON.stringify(newUserObj));
        }

        showToastNotification('Food Logged!', `Added to ${foodPayload.mealType || activeMealType}.`, 'success');
      } else {
        const errorData = await res.json().catch(() => ({}));
        showToastNotification('Error Logging Food', errorData.message || 'Failed to log food entry.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToastNotification('Network Error', 'Could not connect to the server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFoodLog = async (logId, updatedPayload) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/food-log/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });
      if (res.ok) {
        fetchDailyLogs(user.id || user._id, currentDate);
        if (currentDate === getTodayPH()) {
          fetchMealSuggestion(user.id || user._id, true);
        }
        showToastNotification('Log Updated', 'Your entry was updated successfully.', 'success');
      } else {
        showToastNotification('Error Updating', 'Failed to update entry.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToastNotification('Error', 'Network error while updating.', 'error');
    }
  };

  const handleDeleteFoodLog = async (logId) => {
    if (!user) return;

    const isConfirmed = await confirm({
      title: 'Delete Entry?',
      message: 'Are you sure you want to remove this item from your diary?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/food-log/${logId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDailyLogs(user.id || user._id, currentDate);
        if (currentDate === getTodayPH()) {
          fetchMealSuggestion(user.id || user._id, true);
        }
        
        const userRes = await fetch(`/api/user/profile?userId=${user.id || user._id}`);
        if (userRes.ok) {
          const updatedUserData = await userRes.json();
          const newUserObj = { ...user, ...updatedUserData };
          setUser(newUserObj);
          localStorage.setItem('user', JSON.stringify(newUserObj));
        }

        showToastNotification('Entry Deleted', 'Item removed and streak updated.', 'success');
      } else {
        showToastNotification('Error', 'Failed to remove entry.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToastNotification('Error', 'Network error while deleting entry.', 'error');
    }
  };

  const handleDeleteCustomFood = async (foodId, foodName) => {
    const isConfirmed = await confirm({
      title: 'Delete Custom Food?',
      message: `Are you sure you want to permanently delete "${foodName}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/custom-food?id=${foodId}&userId=${user.id || user._id}`, {
      method: 'DELETE'
      });

      if (res.ok) {
        showToastNotification('Food Deleted', `Removed "${foodName}" from your foods.`, 'success');
        // Re-trigger search modal state to update the custom foods list dynamically
        setIsSearchOpen(false);
        setTimeout(() => setIsSearchOpen(true), 50);
      } else {
        showToastNotification('Error', 'Failed to delete custom food.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToastNotification('Error', 'Network error while deleting custom food.', 'error');
    }
  };

  const handleConfirmDeleteMeal = async (mealName) => {
    return await confirm({
      title: 'Delete Meal?',
      message: `Are you sure you want to delete "${mealName}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
  };

  const quickLogWater = (amountInMl) => {
    if (!currentDate || isNaN(amountInMl) || amountInMl <= 0) return;
    const total = waterAmount + amountInMl;
    setWaterAmount(total);
    localStorage.setItem(`water_${currentDate}`, total);
    showToastNotification('Hydration Tracked', `+${amountInMl} ml water added.`, 'success');
  };

  const handleCustomWaterSubmit = (e) => {
    e.preventDefault();
    const amount = parseInt(customWater, 10);
    if (!isNaN(amount) && amount > 0) {
      quickLogWater(amount);
      setCustomWater('');
    } else {
      showToastNotification('Invalid Amount', 'Please enter a valid amount of water.', 'error');
    }
  };

  const totalCalories = logs.reduce((sum, item) => sum + (item.calories || 0), 0);
  const totalProtein = logs.reduce((sum, item) => sum + (item.protein || 0), 0);
  const totalCarbs = logs.reduce((sum, item) => sum + (item.carbs || 0), 0);
  const totalFat = logs.reduce((sum, item) => sum + (item.fat || 0), 0);

  const goalCalories = Number(user?.targetCalories || 2000);

  const targets = {
    c: Number(user?.targetCarbs || user?.carbsGrams || Math.round(((goalCalories * ((user?.carbsPct || 40) / 100)) / 4)) || 250),
    p: Number(user?.targetProtein || user?.proteinGrams || Math.round(((goalCalories * ((user?.proteinPct || 30) / 100)) / 4)) || 150),
    f: Number(user?.targetFat || user?.fatGrams || Math.round(((goalCalories * ((user?.fatPct || 30) / 100)) / 9)) || 44)
  };

  const remainingCarbs = targets.c - Math.round(totalCarbs);
  const remainingFat = targets.f - Math.round(totalFat);
  const remainingProtein = targets.p - Math.round(totalProtein);

  const carbCalories = totalCarbs * 4;
  const fatCalories = totalFat * 9;
  const proteinCalories = totalProtein * 4;

  const totalMacroCalories = carbCalories + fatCalories + proteinCalories || 1; 

  const circleRadius = 46;
  const circleCircumference = 2 * Math.PI * circleRadius;
  
  const overallProgressFactor = Math.min(totalCalories / goalCalories, 1);
  const totalFilledDash = overallProgressFactor * circleCircumference;

  const carbDash = (carbCalories / totalMacroCalories) * totalFilledDash;
  const fatDash = (fatCalories / totalMacroCalories) * totalFilledDash;
  const proteinDash = (proteinCalories / totalMacroCalories) * totalFilledDash;

  const getMealIcon = (type) => {
    switch(type) {
      case 'breakfast': return <Apple className="w-4 h-4 text-[#00A86B]" />;
      case 'lunch': return <Sun className="w-4 h-4 text-amber-400" />;
      case 'dinner': return <Moon className="w-4 h-4 text-indigo-400" />;
      default: return <Cookie className="w-4 h-4 text-orange-400" />;
    }
  };

  if (!isHydrated || !currentDate) {
    return <div className="min-h-screen bg-[#0B121F] text-white p-8 font-mono text-xs animate-pulse">Loading Food Diary...</div>;
  }

  return (
    <main className="min-h-screen bg-[#0B121F] text-white p-4 md:p-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-5">
        
        {/* Navigation Bar */}
        <button onClick={() => router.push('/dashboard')} className="flex items-center space-x-2 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>

        {/* Date Navigator */}
        <div className="flex items-center justify-between bg-[#121A2A] border border-gray-800/80 rounded-2xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#161F30] border border-gray-800 rounded-xl">
              <Calendar className="w-4 h-4 text-[#00A86B]" />
            </div>
            <div>
              <h4 className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">Log Period</h4>
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

        {/* AI Suggestion only ever reflects TODAY — shown regardless of which
            day you're browsing in the calendar above, so it never appears to
            "follow" the date picker. */}
        {(isLoadingSuggestion || mealSuggestion) && (
          <div className="bg-gradient-to-br from-emerald-950/40 to-[#121A2A] border border-emerald-800/40 rounded-2xl p-4 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">AI Suggestion &middot; Today</h4>
              {isLoadingSuggestion ? (
                <p className="text-xs text-gray-500 font-mono">Thinking...</p>
              ) : (
                <p className="text-xs text-gray-300 leading-relaxed">{mealSuggestion}</p>
              )}
            </div>
          </div>
        )}

        {/* MINIMALIST CALORIE & MACRO DASHBOARD */}
        <div className="bg-[#121A2A] border border-gray-800/80 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r={circleRadius} stroke="#161F30" strokeWidth="8" fill="transparent" />
                
                {carbDash > 0 && (
                  <circle 
                    cx="56" cy="56" r={circleRadius} strokeWidth="8" fill="transparent"
                    stroke="#22d3ee"
                    strokeDasharray={`${carbDash} ${circleCircumference - carbDash}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                  />
                )}

                {fatDash > 0 && (
                  <circle 
                    cx="56" cy="56" r={circleRadius} strokeWidth="8" fill="transparent"
                    stroke="#c084fc"
                    strokeDasharray={`${fatDash} ${circleCircumference - fatDash}`}
                    strokeDashoffset={-carbDash}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                  />
                )}

                {proteinDash > 0 && (
                  <circle 
                    cx="56" cy="56" r={circleRadius} strokeWidth="8" fill="transparent"
                    stroke="#fbbf24"
                    strokeDasharray={`${proteinDash} ${circleCircumference - proteinDash}`}
                    strokeDashoffset={-(carbDash + fatDash)}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                  />
                )}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-white">{totalCalories}</span>
                <span className="text-[10px] font-medium text-green-400">/ {goalCalories} cal</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-sm font-bold text-cyan-400">
                  {targets.c > 0 ? Math.round((totalCarbs / targets.c) * 100) : 0}%
                </p>
                <p className="text-xs font-semibold text-gray-400 mt-0.5">Carbs</p>
                <p className="text-[10px] font-mono font-bold text-gray-500 mt-0.5">
                  {remainingCarbs}g
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-purple-400">
                  {targets.f > 0 ? Math.round((totalFat / targets.f) * 100) : 0}%
                </p>
                <p className="text-xs font-semibold text-gray-400 mt-0.5">Fat</p>
                <p className="text-[10px] font-mono font-bold text-gray-500 mt-0.5">
                  {remainingFat}g
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-amber-400">
                  {targets.p > 0 ? Math.round((totalProtein / targets.p) * 100) : 0}%
                </p>
                <p className="text-xs font-semibold text-gray-400 mt-0.5">Protein</p>
                <p className="text-[10px] font-mono font-bold text-gray-500 mt-0.5">
                  {remainingProtein}g
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MEAL CATEGORIES */}
        <div className="space-y-3">
          {mealCategories.map((category) => {
            const categoryLogs = logs.filter(item => item.mealType === category);
            const categoryCalories = categoryLogs.reduce((sum, item) => sum + (item.calories || 0), 0);

            return (
              <div key={category} className="bg-[#121A2A] border border-gray-800/70 rounded-2xl p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2.5">
                    {getMealIcon(category)}
                    <h3 className="font-bold text-sm text-white capitalize">{category}</h3>
                    {categoryCalories > 0 && (
                      <span className="text-xs font-mono text-gray-400 ml-2">({categoryCalories} cal)</span>
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      setEditingLogItem(null);
                      setActiveMealType(category);
                      setIsSearchOpen(true);
                    }}
                    className="bg-[#161F30] hover:bg-[#1C2638] text-cyan-400 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-gray-800/80"
                  >
                    Log food
                  </button>
                </div>

                {categoryLogs.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-gray-800/60 pt-3">
                    {categoryLogs.map((item) => (
                      <div 
                        key={item._id || item.id} 
                        className="group flex justify-between items-center bg-[#0B121F]/60 border border-gray-800/40 p-3 rounded-xl hover:border-gray-700/80 transition-all"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-semibold text-xs text-gray-200 truncate">{item.foodName}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                            {item.amount}{item.unit} • <span className="text-cyan-400 font-bold">C:</span>{Math.round(item.carbs)}g <span className="text-amber-400 font-bold">P:</span>{Math.round(item.protein)}g <span className="text-purple-400 font-bold">F:</span>{Math.round(item.fat)}g
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-3 flex-shrink-0">
                          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-2 transition-all">
                            <button 
                              onClick={() => {
                                setEditingLogItem(item);
                                setSelectedFoodName(item.foodName);
                                setActiveMealType(item.mealType);
                                setIsDetailOpen(true);
                              }}
                              className="p-1 hover:bg-[#1C2638] text-gray-400 hover:text-emerald-400 rounded-lg"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            
                            <button 
                              onClick={() => handleDeleteFoodLog(item._id || item.id)}
                              className="p-1 hover:bg-[#1C2638] text-gray-400 hover:text-red-400 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-xs font-mono font-bold text-green-500">
                            +{item.calories} cal
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* WATER INTAKE TRACKER */}
        <div className="bg-[#121A2A] border border-gray-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-gray-800/60 pb-2">
            <div className="flex items-center space-x-2">
              <Droplet className="w-4 h-4 text-cyan-400" />
              <h4 className="font-bold text-xs text-white uppercase tracking-wider">Water Intake</h4>
            </div>
            <p className="text-xs font-mono font-bold text-cyan-400">{waterAmount} ml</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => quickLogWater(250)} className="bg-[#161F30] border border-gray-800 hover:border-cyan-800 hover:text-cyan-400 text-xs font-bold py-2 rounded-xl transition-all">+250 ml</button>
            <button onClick={() => quickLogWater(500)} className="bg-[#161F30] border border-gray-800 hover:border-cyan-800 hover:text-cyan-400 text-xs font-bold py-2 rounded-xl transition-all">+500 ml</button>
          </div>

          <form onSubmit={handleCustomWaterSubmit} className="relative flex items-center">
            <input 
              type="number" 
              min="1" 
              placeholder="Exact amount (ml)" 
              value={customWater}
              onChange={(e) => setCustomWater(e.target.value)}
              className="w-full bg-[#161F30] border border-gray-800 rounded-xl pl-3 pr-16 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder-gray-600 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button 
              type="submit" 
              className="absolute right-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase transition-all"
            >
              + Add
            </button>
          </form>
        </div>

        {/* OVERLAY POPUP MODALS */}
        <SearchFoodModal
          isOpen={isSearchOpen}
          mealType={activeMealType}
          userId={user?.id || user?._id}
          showToastNotification={showToastNotification}
          onClose={() => setIsSearchOpen(false)}
          
          onSelectFood={(foodItemData, updatedMealType) => {
            setIsSearchOpen(false);

            const finalMealType = updatedMealType || foodItemData.mealType || activeMealType;
            setActiveMealType(finalMealType.toLowerCase());

            setSelectedFoodName(foodItemData.foodName || foodItemData.recipeName || foodItemData.title);
            
            const isWholeItemAggregate = foodItemData.isMealAggregate || foodItemData.isRecipeAggregate;

            if (isWholeItemAggregate) {
              setTargetFoodMacros({
                name: foodItemData.foodName || foodItemData.name,
                totalCalories: foodItemData.calories || 0,
                totalCarbs: foodItemData.carbs || 0,
                totalProtein: foodItemData.protein || 0,
                totalFat: foodItemData.fat || 0,
                totalSodium: foodItemData.sodium || 0,
                totalSugar: foodItemData.sugar || 0,
                totalFiber: foodItemData.fiber || 0,
                totalCholesterol: foodItemData.cholesterol || 0,
                totalPotassium: foodItemData.potassium || 0,
                totalSatFat: foodItemData.satFat || 0,
                totalPolyFat: foodItemData.polyFat || 0,
                totalMonoFat: foodItemData.monoFat || 0,
                totalTransFat: foodItemData.transFat || 0,
                totalVitaminA: foodItemData.vitaminA || 0,
                totalVitaminC: foodItemData.vitaminC || 0,
                totalCalcium: foodItemData.calcium || 0,
                totalIron: foodItemData.iron || 0,
                totalVitaminB12: foodItemData.vitaminB12 || 0,
                totalVitaminD: foodItemData.vitaminD || 0,
              });
} else {
  setTargetFoodMacros({
    foodName: `${foodItemData.brand && foodItemData.brand !== 'Generic' ? `[${foodItemData.brand}] ` : ''}${foodItemData.foodName || foodItemData.recipeName || foodItemData.title}`,
    calories: foodItemData.calories || 0,
    carbs: foodItemData.carbs || 0,
    protein: foodItemData.protein || 0,
    fat: foodItemData.fat || 0,
    sodium: foodItemData.sodium || 0,
    sugar: foodItemData.sugar || 0,
    fiber: foodItemData.fiber || 0,
    cholesterol: foodItemData.cholesterol || 0,
    potassium: foodItemData.potassium || 0,
    satFat: foodItemData.satFat || 0,
    polyFat: foodItemData.polyFat || 0,
    monoFat: foodItemData.monoFat || 0,
    transFat: foodItemData.transFat || 0,
    vitaminA: foodItemData.vitaminA || 0,
    vitaminC: foodItemData.vitaminC || 0,
    calcium: foodItemData.calcium || 0,
    iron: foodItemData.iron || 0,
    vitaminB12: foodItemData.vitaminB12 || 0,
    vitaminD: foodItemData.vitaminD || 0,
    amount: foodItemData.amount || 100,
    defaultServingAmount: foodItemData.defaultServingAmount || foodItemData.amount || 100,
    unit: foodItemData.unit || 'g',
    numberOfServings: foodItemData.numberOfServings || 1,
  });
}
            
            setIsDetailOpen(true);
          }}
          
          onCreateCustomFood={(foodItem = null) => {
            setIsSearchOpen(false);
            setEditingFoodItem(foodItem);
            setIsCreateOpen(true);
          }}

          onDeleteCustomFood={handleDeleteCustomFood}

          onCreateRecipe={() => {
            setIsSearchOpen(false);
            setIsRecipeCreateOpen(true);
          }}
        />

        <FoodDetailModal
          isOpen={isDetailOpen}
          foodName={selectedFoodName}
          mealType={activeMealType}
          initialData={editingLogItem || targetFoodMacros} 
          showToastNotification={showToastNotification}
          onClose={() => {
            setIsDetailOpen(false);
            setEditingLogItem(null);
            setTargetFoodMacros(null); 
          }}
          onConfirmLog={handleConfirmAddFood}
          onUpdateLog={handleUpdateFoodLog} 
        />

        {user && (
          <>
            <CreateFoodModal 
              isOpen={isCreateOpen}
              onClose={() => {
                setIsCreateOpen(false);
                setEditingFoodItem(null);
              }}
              userId={user.id || user._id}
              foodToEdit={editingFoodItem}
              showToastNotification={showToastNotification}
              onFoodCreated={() => {
                fetchDailyLogs(user.id || user._id, currentDate);
                showToastNotification(
                  editingFoodItem ? 'Custom Food Updated' : 'Custom Food Created', 
                  editingFoodItem ? 'Your changes were saved.' : 'Your food item is saved.', 
                  'success'
                );
                setEditingFoodItem(null);
              }}
            />

            <CreateRecipeModal
              isOpen={isRecipeCreateOpen}
              onClose={() => setIsRecipeCreateOpen(false)}
              userId={user.id || user._id}
              showToastNotification={showToastNotification}
              onRecipeCreated={() => {
                fetchDailyLogs(user.id || user._id, currentDate);
                showToastNotification('Recipe Created', 'Your recipe has been saved.', 'success');
              }}
            />

            <CreateMealModal
              isOpen={isMealCreateOpen}
              onClose={() => setIsMealCreateOpen(false)}
              userId={user.id || user._id}
              showToastNotification={showToastNotification}
              onConfirmDelete={handleConfirmDeleteMeal}
              onSaveSuccess={() => fetchDailyLogs(user.id || user._id, currentDate)}
            />
          </>
        )}

        {/* Global Toast Notification */}
        <Toast
          show={toast.show}
          title={toast.title}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />

      </div>
    </main>
  );
}

export default function FoodDiary() {
  return (
    <ConfirmProvider>
      <FoodDiaryContent />
    </ConfirmProvider>
  );
}