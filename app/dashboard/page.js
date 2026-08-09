'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Activity, Scale, Brain, Flame, Target, Apple, BarChart3, User, Droplet, ChevronRight } from 'lucide-react';

import ProfileSettingsModal from '../components/dashboard/ProfileSettingsModal';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Biometric state tracking
  const [calorieGoal, setCalorieGoal] = useState(2339);
  const [strategy, setStrategy] = useState('Maintenance');

  // Live Today's Summary States
  const [todayLogs, setTodayLogs] = useState([]);
  const [todayWater, setTodayWater] = useState(0);

  const router = useRouter();

  const fetchDailyLogs = useCallback(async (userId) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const res = await fetch(`/api/food-log?userId=${userId}&date=${today}`);
      if (res.ok) {
        const data = await res.json();
        setTodayLogs(data.logs || []);
      }
      const savedWater = localStorage.getItem(`water_${today}`);
      if (savedWater) setTodayWater(parseInt(savedWater, 10));
    } catch (err) {
      console.error("Failed to load today's food summary:", err);
    }
  }, []);

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (!session) {
      router.push('/'); 
    } else {
      const parsedUser = JSON.parse(session);
      setUser(parsedUser);
      
      if (parsedUser?.targetCalories) setCalorieGoal(parsedUser.targetCalories);
      if (parsedUser?.goal) {
        setStrategy(parsedUser.goal.charAt(0).toUpperCase() + parsedUser.goal.slice(1));
      }

      fetchDailyLogs(parsedUser.id);
    }
    setIsHydrated(true);
  }, [router, fetchDailyLogs]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleUpdateUserData = (updatedUser) => {
    setUser(updatedUser);
    setCalorieGoal(updatedUser.targetCalories);
    setStrategy(updatedUser.goal.charAt(0).toUpperCase() + updatedUser.goal.slice(1));
  };

  // Math Calculations for Summary Display
  const consumedCalories = todayLogs.reduce((acc, item) => acc + (item.calories || 0), 0);
  const totalCarbs = todayLogs.reduce((acc, item) => acc + (item.carbs || 0), 0);
  const totalProtein = todayLogs.reduce((acc, item) => acc + (item.protein || 0), 0);
  const totalFat = todayLogs.reduce((acc, item) => acc + (item.fat || 0), 0);
  const remainingCalories = calorieGoal - consumedCalories;

  const mealTotals = {
    breakfast: todayLogs.filter(i => i.mealType === 'breakfast').reduce((a, b) => a + b.calories, 0),
    lunch: todayLogs.filter(i => i.mealType === 'lunch').reduce((a, b) => a + b.calories, 0),
    dinner: todayLogs.filter(i => i.mealType === 'dinner').reduce((a, b) => a + b.calories, 0),
    snacks: todayLogs.filter(i => i.mealType === 'snacks').reduce((a, b) => a + b.calories, 0),
  };

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[#0B121F] text-white p-6 md:p-8 animate-pulse">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-10 w-48 bg-gray-800 rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="h-32 bg-[#121A2A] rounded-2xl" />
            <div className="h-32 bg-[#121A2A] rounded-2xl" />
            <div className="h-32 bg-[#121A2A] rounded-2xl" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B121F] text-white p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800/60 pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome back, {user?.firstName || 'User'}!
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              NutriAI Ecosystem Base • Database status: <span className="text-[#00A86B] font-mono font-medium">Connected</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center space-x-2 bg-[#161F30] hover:bg-[#1C2638] text-gray-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border border-gray-800"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Edit Profile</span>
            </button>

            <button 
              onClick={() => router.push('/dashboard/analytics')}
              className="flex items-center space-x-2 bg-[#121A2A] hover:bg-[#1C2638] text-gray-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border border-gray-800"
            >
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Analytics</span>
            </button>

            <button 
              onClick={() => router.push('/dashboard/diary')}
              className="flex items-center space-x-2 bg-[#00A86B] hover:bg-[#00945D] text-white px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-md shadow-[#00A86B]/10"
            >
              <Apple className="w-3.5 h-3.5" />
              <span>Open Food Diary</span>
            </button>

            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-[#161F30] hover:bg-red-950/20 border border-gray-800 hover:border-red-900/40 text-gray-300 hover:text-red-400 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Biometrics Display Grid (Static View-Only Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          
          {/* Calorie Budget Card */}
          <div className="bg-[#121A2A] border border-gray-800/60 p-5 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Flame className="w-16 h-16 text-[#00A86B]" />
            </div>
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-[#00A86B]/10 rounded-lg">
                <Flame className="text-[#00A86B] w-5 h-5" />
              </div>
              <h3 className="text-gray-400 font-semibold text-xs uppercase tracking-wider">Calorie Budget</h3>
            </div>
            <p className="text-2xl font-black text-white">
              {calorieGoal.toLocaleString()}{' '}
              <span className="text-xs text-gray-500 font-medium">kcal / day</span>
            </p>
          </div>

          {/* Registered BMI */}
          <div className="bg-[#121A2A] border border-gray-800/60 p-5 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Scale className="w-16 h-16 text-purple-400" />
            </div>
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Scale className="text-purple-400 w-5 h-5" />
              </div>
              <h3 className="text-gray-400 font-semibold text-xs uppercase tracking-wider">Registered BMI</h3>
            </div>
            <p className="text-2xl font-black text-white">
              {user?.bmi || '22.2'} <span className="text-xs text-gray-500 font-medium">Index ({user?.weight || 70}kg)</span>
            </p>
          </div>

          {/* Target Objective Strategy */}
          <div className="bg-[#121A2A] border border-gray-800/60 p-5 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Target className="w-16 h-16 text-cyan-400" />
            </div>
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Target className="text-cyan-400 w-5 h-5" />
              </div>
              <h3 className="text-gray-400 font-semibold text-xs uppercase tracking-wider">Current Strategy</h3>
            </div>
            <p className="text-2xl font-black text-white capitalize">
              {strategy === 'Deficit' ? 'Cutting' : strategy === 'Surplus' ? 'Bulking' : strategy}
            </p>
          </div>

        </div>

        {/* --- TODAY'S FOOD & INTAKE SUMMARY DASHBOARD PANEL --- */}
        <div className="bg-[#121A2A] border border-gray-800/60 rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-800/60 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Apple className="w-4 h-4 text-[#00A86B]" />
                <span>Today's Nutrition & Intake Summary</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Real-time breakdown of logged food and water items for today.</p>
            </div>
            <button 
              onClick={() => router.push('/dashboard/diary')}
              className="text-xs text-[#00A86B] font-bold hover:underline flex items-center gap-1 uppercase tracking-wider"
            >
              <span>Full Diary</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0B121F] border border-gray-800/80 p-3.5 rounded-xl">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Consumed</p>
              <p className="text-xl font-black text-white mt-1">{consumedCalories} <span className="text-xs text-gray-500 font-normal">kcal</span></p>
            </div>

            <div className="bg-[#0B121F] border border-gray-800/80 p-3.5 rounded-xl">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Remaining</p>
              <p className={`text-xl font-black mt-1 ${remainingCalories < 0 ? 'text-red-400' : 'text-[#00A86B]'}`}>
                {remainingCalories} <span className="text-xs text-gray-500 font-normal">kcal</span>
              </p>
            </div>

            <div className="bg-[#0B121F] border border-gray-800/80 p-3.5 rounded-xl">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Macros (P / C / F)</p>
              <p className="text-xs font-mono font-bold text-white mt-2">
                <span className="text-emerald-400">{Math.round(totalProtein)}g</span> / <span className="text-cyan-400">{Math.round(totalCarbs)}g</span> / <span className="text-purple-400">{Math.round(totalFat)}g</span>
              </p>
            </div>

            <div className="bg-[#0B121F] border border-gray-800/80 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Water Intake</p>
                <p className="text-xl font-black text-cyan-400 mt-1">{todayWater} <span className="text-xs text-gray-500 font-normal">ml</span></p>
              </div>
              <Droplet className="w-5 h-5 text-cyan-400/50" />
            </div>
          </div>

          {/* Meal Breakdown Progress Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { name: 'Breakfast', val: mealTotals.breakfast, color: 'border-emerald-500/30' },
              { name: 'Lunch', val: mealTotals.lunch, color: 'border-amber-500/30' },
              { name: 'Dinner', val: mealTotals.dinner, color: 'border-indigo-500/30' },
              { name: 'Snacks', val: mealTotals.snacks, color: 'border-orange-500/30' }
            ].map((meal) => (
              <div key={meal.name} className={`bg-[#161F30]/30 border ${meal.color} p-3 rounded-xl flex justify-between items-center`}>
                <span className="text-xs font-bold text-gray-300">{meal.name}</span>
                <span className="text-xs font-mono font-black text-white">{meal.val} kcal</span>
              </div>
            ))}
          </div>

        </div>

        {/* Hardware IoT Device Monitoring Station */}
        <div className="bg-[#121A2A] border border-gray-800/60 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="text-[#00A86B] w-5 h-5" />
            <h2 className="text-base font-bold text-white">IoT Scale & Portion Station</h2>
          </div>
          <div className="border border-dashed border-gray-800 rounded-xl p-8 text-center bg-[#161F30]/30">
            <Brain className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400">Hardware Interface Bridge Offline</p>
            <p className="text-xs text-gray-600 mt-1">Awaiting local scale sync parameters via Web Bluetooth stream.</p>
          </div>
        </div>

        {/* Isolated Profile Settings Modal */}
        <ProfileSettingsModal 
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
          onUpdateUser={handleUpdateUserData}
        />

      </div>
    </main>
  );
}