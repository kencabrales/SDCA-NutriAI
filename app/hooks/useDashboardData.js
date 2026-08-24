//hooks/useDashboardData.js
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
    
    try {
      const res = await fetch(`/api/food-log?userId=${userId}&date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setTodayLogs(data.logs || []);
      } else {
        setTodayLogs([]);
      }

      const savedWater = localStorage.getItem(`water_${dateStr}`);
      setTodayWater(savedWater ? parseInt(savedWater, 10) : 0);

      const savedSteps = localStorage.getItem(`steps_${dateStr}`);
      setTodaySteps(savedSteps ? parseInt(savedSteps, 10) : 2825);

      // Fetch 60 days of history using explicit start/end dates to keep past dots working
      const dateAnchor = dateStringToUTCAnchor(dateStr);
      const rangeEndAnchor = addDaysUTC(dateAnchor, 14); // Cover future week dates
      const rangeStartAnchor = addDaysUTC(dateAnchor, -60); // Cover 60 days into the past

      const startStr = utcAnchorToDateString(rangeStartAnchor);
      const endStr = utcAnchorToDateString(rangeEndAnchor);

      const historyRes = await fetch(`/api/food-log/history?userId=${userId}&start=${startStr}&end=${endStr}`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setLoggedDates(historyData.loggedDates || []);
      }

      const streakRes = await fetch(`/api/user/streak?userId=${userId}`);
      if (streakRes.ok) {
        const streakData = await streakRes.json();
        setStreakCount(streakData.streak || 0);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setTodayLogs([]);
    }
  }, []);

  // --- INITIAL HYDRATION & DATA FETCH ---
  useEffect(() => {
    const session = localStorage.getItem('user');
    if (!session) {
      router.push('/'); 
      return;
    }

        const parsedUser = JSON.parse(session);
    setUser(parsedUser);

    fetchDashboardData(parsedUser.id || parsedUser._id, selectedDate);
    setIsHydrated(true);
  }, [router, selectedDate, fetchDashboardData]);

  // --- RE-FETCH ON TAB FOCUS ---
  useEffect(() => {
    const handleFocus = () => {
      const session = localStorage.getItem('user');
      if (session) {
        const parsedUser = JSON.parse(session);
        fetchDashboardData(parsedUser.id || parsedUser._id, selectedDate);
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

  const handleWaterAdd = (amount) => {
    const updated = Math.max(0, todayWater + amount);
    setTodayWater(updated);
    localStorage.setItem(`water_${selectedDate}`, updated.toString());
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
    router
  };
}