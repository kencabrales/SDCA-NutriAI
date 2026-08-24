//dashboard/page.js
'use client';

import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';

import DashboardHeader from '../components/dashboard/DashboardHeader';
import WeeklyCalendar from '../components/dashboard/WeeklyCalendar';
import MacroCards from '../components/dashboard/MacroCards';
import LoggedMeals from '../components/dashboard/LoggedMeals';
import HabitsAndWeight from '../components/dashboard/HabitsAndWeight';
import IoTScaleBridge from '../components/dashboard/IoTScaleBridge';
import ProfileSettingsModal from '../components/profile/ProfileSettingsModal';
import { useDashboardData } from '../hooks/useDashboardData';

// Steady Progress Banner integrated directly
function SteadyProgressBanner() {
  return (
    <div className="bg-[#121A2A] border border-gray-800/80 rounded-xl px-3.5 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="p-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
            STEADY PROGRESS
          </span>
          <p className="text-xs font-semibold text-gray-200">
            <span className="font-bold text-white">Optimal Consistency:</span> Your meal timing & caloric distribution are well-balanced across your daily schedule.
          </p>
        </div>
      </div>
    </div>
  );
}

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

        <SteadyProgressBanner />

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