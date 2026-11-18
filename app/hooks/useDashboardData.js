//hooks/useDashboardData.js
'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getLogs, cacheLogs, getWater, saveWater } from '@/lib/offlineStore';
import {
  getTodayPH,
  dateStringToUTCAnchor,
  utcAnchorToDateString,
  addDaysUTC,
  getUTCDayOfWeek,
  getWeekdayLabel,
  getMonthDayLabel,
} from '@/lib/dateUtils';

export function useDashboardData() {
  const router = useRouter();
  
  const [user, setUser] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Philippine "today", not the browser/server's local or UTC date
  const [selectedDate, setSelectedDate] = useState(() => getTodayPH());

  const [loggedDates, setLoggedDates] = useState([]);
  const [streakCount, setStreakCount] = useState(0);

  const [todayLogs, setTodayLogs] = useState([]);
  const [todayWater, setTodayWater] = useState(0);
  const [todaySteps, setTodaySteps] = useState(0);
  const [mealSuggestion, setMealSuggestion] = useState(null);
  const [behaviorInsight, setBehaviorInsight] = useState(null);
  const [healthRisk, setHealthRisk] = useState(null);
  const [insightsMessage, setInsightsMessage] = useState('');
  const [insightsError, setInsightsError] = useState('');
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const insightsRequestInFlight = useRef(false);
  const savedInsightsLoadedForUser = useRef(null);

  // --- CALENDAR LOGIC (all via UTC-anchored calendar math — see lib/dateUtils.js) ---
  const weekDays = useMemo(() => {
    const anchor = dateStringToUTCAnchor(selectedDate);
    const dayOfWeek = getUTCDayOfWeek(anchor);
    const weekStartAnchor = addDaysUTC(anchor, -dayOfWeek);
    const todayStr = getTodayPH();

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayAnchor = addDaysUTC(weekStartAnchor, i);
      const isoDate = utcAnchorToDateString(dayAnchor);
      days.push({
        dateStr: isoDate,
        label: getWeekdayLabel(isoDate),
        dayNum: dayAnchor.getUTCDate(),
        isToday: isoDate === todayStr,
      });
    }
    return days;
  }, [selectedDate]);

  const handlePrevWeek = () => {
    const anchor = dateStringToUTCAnchor(selectedDate);
    setSelectedDate(utcAnchorToDateString(addDaysUTC(anchor, -7)));
  };

  const handleNextWeek = () => {
    const anchor = dateStringToUTCAnchor(selectedDate);
    setSelectedDate(utcAnchorToDateString(addDaysUTC(anchor, 7)));
  };

  // --- DATA FETCHING ---
  const fetchDashboardData = useCallback(async (userId, dateStr) => {
    if (!userId) return;

    // Render the last saved local snapshot first. It remains usable when the
    // device is offline or Atlas DNS/server selection is temporarily failing.
    const cachedLogs = await getLogs(userId, dateStr).catch(() => []);
    setTodayLogs(cachedLogs);
    const cachedWater = await getWater(userId, dateStr).catch(() => 0);
    setTodayWater(cachedWater);

    const savedSteps = localStorage.getItem(`steps_${userId}_${dateStr}`);
    setTodaySteps(savedSteps ? parseInt(savedSteps, 10) : 0);

    if (!navigator.onLine) {
      if (cachedLogs.length) {
        setLoggedDates((previous) => previous.includes(dateStr) ? previous : [...previous, dateStr]);
      }
      return;
    }

    try {
      const res = await fetch(`/api/food-log?userId=${encodeURIComponent(userId)}&date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        await cacheLogs(userId, dateStr, data.logs || []).catch(() => {});
        setTodayLogs(await getLogs(userId, dateStr).catch(() => data.logs || []));
      }

      try {
        const waterRes = await fetch(`/api/water-log?userId=${encodeURIComponent(userId)}&date=${dateStr}`, { cache: 'no-store' });
        if (waterRes.ok) {
          const waterData = await waterRes.json().catch(() => ({}));
          const amount = Number(waterData.log?.amountMl) || 0;
          setTodayWater(amount);
          await saveWater(userId, dateStr, amount, false).catch(() => {});
        }
      } catch (waterError) {
        console.warn('Water data is unavailable; retaining the local copy.', waterError);
      }

      const dateAnchor = dateStringToUTCAnchor(dateStr);
      const rangeEndAnchor = addDaysUTC(dateAnchor, 14);
      const rangeStartAnchor = addDaysUTC(dateAnchor, -60);
      const startStr = utcAnchorToDateString(rangeStartAnchor);
      const endStr = utcAnchorToDateString(rangeEndAnchor);

      try {
        const historyRes = await fetch(`/api/food-log/history?userId=${encodeURIComponent(userId)}&start=${startStr}&end=${endStr}`);
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setLoggedDates(historyData.loggedDates || []);
        }
      } catch (historyError) {
        console.warn('Food history is unavailable offline; retaining the local view.', historyError);
      }

      try {
        const streakRes = await fetch(`/api/user/streak?userId=${encodeURIComponent(userId)}`);
        if (streakRes.ok) {
          const streakData = await streakRes.json();
          setStreakCount(streakData.streak || 0);
        }
      } catch (streakError) {
        console.warn('Streak data is unavailable; retaining the last value.', streakError);
      }
    } catch (err) {
      console.warn('Dashboard sync unavailable; showing locally cached data.', err);
    }
  }, []);

  const fetchInsights = useCallback(async (
    userId,
    { forceRefresh = false, generate = true, silent = false } = {}
  ) => {
    if (!userId || insightsRequestInFlight.current) return;
    if (!navigator.onLine) {
      setInsightsMessage('AI analysis needs an internet connection. Your saved nutrition data is still available offline.');
      setInsightsError('');
      return;
    }
    insightsRequestInFlight.current = true;
    if (!silent) setIsLoadingInsights(true);
    if (!silent) setInsightsError('');
    try {
      const params = new URLSearchParams({
        userId: String(userId),
        generate: generate ? 'true' : 'false',
      });
      if (forceRefresh) params.set('refresh', 'true');
      const res = await fetch('/api/ai/insights?' + params.toString(), { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));

      // Keep already-rendered cards visible if a refresh fails.
      if (res.ok) {
        setMealSuggestion(data.mealSuggestion || null);
        setBehaviorInsight(data.behaviorInsight || null);
        setHealthRisk(data.healthRisk || null);
      }
      setInsightsMessage(data.message || data.warning || '');

      if (!res.ok) {
        setInsightsError(data.error || data.warning || 'NutriAI analysis is temporarily unavailable.');
      }
    } catch (err) {
      console.error('Failed to load AI insights:', err);
      if (!silent) {
        setInsightsError(err?.message || 'Could not connect to the NutriAI analysis service.');
        setInsightsMessage('');
      }
    } finally {
      insightsRequestInFlight.current = false;
      if (!silent) setIsLoadingInsights(false);
    }
  }, []);

  const refreshDashboardData = useCallback(async () => {
    const userId = user?.id || user?._id;
    if (!userId) return;
    await fetchDashboardData(userId, selectedDate);
  }, [user, selectedDate, fetchDashboardData]);

  // --- INITIAL HYDRATION & DATA FETCH ---
  useEffect(() => {
    const session = localStorage.getItem('user');
    if (!session) {
      router.push('/'); 
      return;
    }

        const parsedUser = JSON.parse(session);
    setUser(parsedUser);

    const userId = parsedUser.id || parsedUser._id;
    fetchDashboardData(userId, selectedDate);

    // Restore the saved analysis without calling Gemini again.
    const userKey = String(userId || '');
    if (userKey && savedInsightsLoadedForUser.current !== userKey) {
      savedInsightsLoadedForUser.current = userKey;
      fetchInsights(userId, { generate: false, silent: true });
    }

    setIsHydrated(true);
  }, [router, selectedDate, fetchDashboardData, fetchInsights]);

  // --- RE-FETCH ON TAB FOCUS ---
  useEffect(() => {
    const handleFocus = () => {
      const session = localStorage.getItem('user');
      if (session) {
        const parsedUser = JSON.parse(session);
        const userId = parsedUser.id || parsedUser._id;
        fetchDashboardData(userId, selectedDate);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedDate, fetchDashboardData]);

  // --- HANDLERS & CALCULATIONS ---
  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

    const handleUpdateUserData = (updatedUser) => {
    if (!updatedUser) return;

    setUser((prev) => {
      const merged = { ...prev, ...updatedUser };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  };

const handleWaterAdd = async (amount) => {
  const uid = user?.id || user?._id;
  if (!uid || !Number.isFinite(Number(amount))) return;

  const previousWater = todayWater;
  const updated = Math.max(0, previousWater + Number(amount));
  setTodayWater(updated);

  if (!navigator.onLine) {
    await saveWater(uid, selectedDate, updated, true).catch((error) => {
      console.error('Could not save water intake locally:', error);
      setTodayWater(previousWater);
    });
    return;
  }

  try {
    const res = await fetch('/api/water-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: uid,
        date: selectedDate,
        amountMl: Number(amount) < 0 ? updated : Number(amount),
        mode: Number(amount) < 0 ? 'set' : 'increment',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.error || 'Could not save water intake');
      error.status = res.status;
      throw error;
    }
    const total = Number(data.log?.amountMl) || 0;
    setTodayWater(total);
    await saveWater(uid, selectedDate, total, false).catch(() => {});
  } catch (error) {
    console.warn('Water sync failed; preserving the local amount.', error);
    if (!navigator.onLine || error instanceof TypeError || error.status >= 500) {
      await saveWater(uid, selectedDate, updated, true);
      setTodayWater(updated);
    } else {
      setTodayWater(previousWater);
    }
  }
};

  const calorieGoal = Number(user?.targetCalories) || 2000;

  const consumedCalories = todayLogs.reduce((acc, item) => acc + (item.calories || 0), 0);
  const totalCarbs = todayLogs.reduce((acc, item) => acc + (item.carbs || 0), 0);
  const totalProtein = todayLogs.reduce((acc, item) => acc + (item.protein || 0), 0);
  const totalFat = todayLogs.reduce((acc, item) => acc + (item.fat || 0), 0);
  const remainingCalories = calorieGoal - consumedCalories;

  const carbGoal = Number(user?.targetCarbs || user?.carbsGrams || Math.round((calorieGoal * 0.40) / 4) || 200);
  const proteinGoal = Number(user?.targetProtein || user?.proteinGrams || Math.round((calorieGoal * 0.30) / 4) || 150);
  const fatGoal = Number(user?.targetFat || user?.fatGrams || Math.round((calorieGoal * 0.30) / 9) || 67);

  const mealBreakdown = useMemo(() => {
    const types = ['breakfast', 'lunch', 'dinner', 'snacks'];
    const result = {};
    types.forEach((type) => {
      const filtered = todayLogs.filter((item) => item.mealType === type);
      result[type] = {
        calories: filtered.reduce((acc, item) => acc + (item.calories || 0), 0)
      };
    });
    return result;
  }, [todayLogs]);

  const displayDateHeader = useMemo(() => {
    if (selectedDate === getTodayPH()) return 'Today';
    return getMonthDayLabel(selectedDate);
  }, [selectedDate]);

  return {
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
    refreshInsights: fetchInsights,
    refreshDashboardData,
    router
  };
}