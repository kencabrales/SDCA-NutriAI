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
import MacroRecommendations from '../components/MacroRecommendations';
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
    mealSuggestion,
    behaviorInsight,
    healthRisk,
    insightsMessage,
    insightsError,
    isLoadingInsights,
    refreshInsights,
    refreshDashboardData,
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
        
        {user && (user.role === 'admin' || user.isAdmin === true) && (
          <div className="flex justify-end">
            <button onClick={() => router.push('/dashboard/admin/ai-usage')}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-800/60 bg-cyan-950/30 px-3 py-2 text-[11px] font-bold text-cyan-300 hover:bg-cyan-900/40 transition-colors">
              <Sparkles className="w-3.5 h-3.5" /> AI Usage Monitor
            </button>
          </div>
        )}

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

{/* NUTRIAI DAILY ANALYST — rendered for every signed-in user */}
<section className="rounded-2xl border border-cyan-900/60 bg-[#111b2b] p-4 md:p-5 space-y-4">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2">
        <Sparkles className="h-4 w-4 text-cyan-300" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-white">NutriAI Daily Analyst</h2>
        <p className="mt-1 text-xs text-slate-400">Personalized observations from your recent food logs and nutrition goals.</p>
      </div>
    </div>
    <button
      type="button"
      onClick={() => refreshInsights(user?.id || user?._id, { forceRefresh: true })}
      disabled={isLoadingInsights}
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-800/70 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-900/50 disabled:cursor-wait disabled:opacity-50"
    >
      <Sparkles className={`h-3.5 w-3.5 ${isLoadingInsights ? 'animate-pulse' : ''}`} />
      {isLoadingInsights ? 'Analyzing…' : 'Refresh analysis'}
    </button>
  </div>

  {isLoadingInsights && (
    <div className="rounded-xl border border-slate-700/70 bg-[#0b1422]/70 p-3 text-xs text-slate-300" role="status">
      NutriAI is reviewing your recent food logs…
    </div>
  )}
  {insightsError && (
    <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-200" role="alert">
      {insightsError}
    </div>
  )}
  {insightsMessage && !insightsError && (
    <div className="rounded-xl border border-slate-700/70 bg-[#0b1422]/70 p-3 text-xs leading-relaxed text-slate-300" role="status">
      {insightsMessage}
    </div>
  )}
  {mealSuggestion && (
    <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Next meal suggestion</p>
      <p className="text-sm leading-relaxed text-slate-100">{mealSuggestion}</p>
    </div>
  )}
  {behaviorInsight && (
    <div className="rounded-xl border border-slate-700/70 bg-[#0b1422]/70 p-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">Your nutrition patterns</p>
      <p className="text-sm leading-relaxed text-slate-200">{behaviorInsight}</p>
    </div>
  )}
  {healthRisk && (
    <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-3">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5" /> Nutrition observation
      </div>
      <p className="text-xs leading-relaxed text-amber-100">{healthRisk}</p>
    </div>
  )}
  {!isLoadingInsights && !insightsError && !insightsMessage && !mealSuggestion && !behaviorInsight && (
    <p className="rounded-xl border border-dashed border-slate-700 p-3 text-xs text-slate-400">
      Your analyst will appear here when enough food-log data is available. Refresh after adding meals.
    </p>
  )}
  <p className="text-[10px] text-slate-500">AI suggestions are general nutrition information, not medical advice. Availability depends on the shared Gemini service and account usage allowance.</p>
</section>

<MacroRecommendations
  userId={user?.id || user?._id}
  selectedDate={selectedDate}
  onLogSuccess={refreshDashboardData}
/>

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

        <IoTScaleBridge />

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