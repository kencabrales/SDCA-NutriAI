//dashboard/page.js
'use client';

import { useMemo, useState } from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';

import DashboardHeader from '../components/dashboard/DashboardHeader';
import WeeklyCalendar from '../components/dashboard/WeeklyCalendar';
import MacroCards from '../components/dashboard/MacroCards';
import LoggedMeals from '../components/dashboard/LoggedMeals';
import HabitsAndWeight from '../components/dashboard/HabitsAndWeight';
import IoTScaleBridge from '../components/dashboard/IoTScaleBridge';
import ProfileSettingsModal from '../components/profile/ProfileSettingsModal';
import { useDashboardData } from '../hooks/useDashboardData';


export default function Dashboard() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const {
    user,
    isHydrated,
    selectedDate,
    setSelectedDate,
    calorieGoal,
    streakCount,
    todayWater,
    todaySteps,
    loggedDates,
    weekDays,
    handlePrevWeek,
    handleNextWeek,
    handleLogout,
    handleUpdateUserData,
    handleWaterAdd,
    consumedCalories,
    remainingCalories,
    totalCarbs,
    totalProtein,
    totalFat,
    carbGoal,
    fatGoal,
    proteinGoal,
    mealBreakdown,
    displayDateHeader,
    behaviorInsight,
    healthRisk,
    isLoadingInsights,
    router
  } = useDashboardData();

  // Water subtitle calculation helper
  const waterSubtitle = useMemo(() => {
    if (todayWater === 0) return '0 ml (You must be thirsty!)';
    if (todayWater < 1000) return `${todayWater} ml tracked (Keep going!)`;
    if (todayWater < 2500) return `${todayWater} ml tracked (Good hydration standard)`;
    return `${todayWater} ml tracked (Daily goal achieved!)`;
  }, [todayWater]);

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[#0B121F] text-white p-4 md:p-6 animate-pulse">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="h-8 w-40 bg-gray-800 rounded-lg" />
          <div className="h-48 bg-[#121A2A] rounded-2xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B121F] text-white p-3 md:p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-3 md:space-y-4">
        
        <DashboardHeader 
          user={user} 
          calorieGoal={calorieGoal}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onLogout={handleLogout}
          router={router}
        />

        <WeeklyCalendar 
  displayDateHeader={displayDateHeader}
  selectedDate={selectedDate}
  setSelectedDate={setSelectedDate}
  streakCount={streakCount}
  weekDays={weekDays}
  handlePrevWeek={handlePrevWeek}
  handleNextWeek={handleNextWeek}
  loggedDates={loggedDates}
/>

{/* HEALTH RISK BANNER — only renders when a real risk was flagged */}
{healthRisk && (
  <div className="bg-amber-950/30 border border-amber-700/50 rounded-2xl p-4 flex items-start gap-3">
    <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex-shrink-0 mt-0.5">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
    </div>
    <div>
      <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Health Alert</h4>
      <p className="text-xs text-amber-100/90 leading-relaxed">{healthRisk}</p>
    </div>
  </div>
)}

{/* BEHAVIOR INSIGHT CARD */}
{(isLoadingInsights || behaviorInsight) && (
  <div className="bg-[#121A2A] border border-gray-800/80 rounded-2xl p-4 flex items-start gap-3">
    <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0 mt-0.5">
      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
    </div>
    <div>
      <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1">Your Patterns</h4>
      {isLoadingInsights ? (
        <p className="text-xs text-gray-500 font-mono">Analyzing...</p>
      ) : (
        <p className="text-xs text-gray-300 leading-relaxed">{behaviorInsight}</p>
      )}
    </div>
  </div>
)}

<MacroCards
          consumedCalories={consumedCalories}
          calorieGoal={calorieGoal}
          remainingCalories={remainingCalories}
          totalProtein={totalProtein}
          proteinGoal={proteinGoal}
          totalCarbs={totalCarbs}
          carbGoal={carbGoal}
          totalFat={totalFat}
          fatGoal={fatGoal}
          router={router}
        />

        <LoggedMeals 
          mealBreakdown={mealBreakdown}
          router={router}
        />

        <HabitsAndWeight 
          user={user}
          selectedDate={selectedDate}
          setIsProfileModalOpen={setIsProfileModalOpen}
          todayWater={todayWater}
          todaySteps={todaySteps}
          waterSubtitle={waterSubtitle}
          handleWaterAdd={handleWaterAdd}
          router={router}
        />

        <IoTScaleBridge status="Offline" />

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