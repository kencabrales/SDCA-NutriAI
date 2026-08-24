'use client';

import { useState, useEffect } from 'react';
import { User, Zap, Flame, TrendingDown } from 'lucide-react';

export default function ProfileHeader({ user, targetCalories }) {
  const [liveStreak, setLiveStreak] = useState(user?.streakCount || user?.streak || 0);
  const [isTodayLogged, setIsTodayLogged] = useState(false);

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (!userId) return;

    async function fetchStreak() {
      try {
        const res = await fetch(`/api/user/streak?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.streak !== undefined) {
            setLiveStreak(data.streak);
          }
          setIsTodayLogged(!!data.isTodayLogged);
        }
      } catch (err) {
        console.error('Failed to fetch streak in ProfileHeader:', err);
      }
    }

    fetchStreak();
  }, [user]);

  const isStreakActive = isTodayLogged && liveStreak >= 2;

  const getDisplayName = () => {
    if (user?.username) return user.username;
    if (user?.firstName) return `${user.firstName} ${user.lastName || ''}`.trim();
    return user?.name || 'kencabrales4';
  };

  // Same field priority used everywhere else in the app (Goals, WeightProgressTab):
  // currentWeight is the live source of truth once weight-log entries exist,
  // falling back to the legacy `weight` field for older/未-migrated accounts.
  const startingWeight = Number(user?.startingWeight) || Number(user?.currentWeight || user?.weight) || 0;
  const currentWeight = Number(user?.currentWeight || user?.weight) || 0;

  // Keep this as a number throughout — comparing/formatting a string with `>`
  // does lexical comparison ("9.0" > "10.0" is true), not numeric comparison.
  const weightDifference = Number((startingWeight - currentWeight).toFixed(1));
  const kgsLostDisplay = weightDifference > 0 ? `${weightDifference} kg` : '0 kg';

  return (
    <div className="bg-[#121A2A] border-b border-gray-800/80 p-5">
      <div className="grid grid-cols-3 items-center">

        {/* Left: Streak */}
        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Streak
          </span>
          <div className="flex items-center gap-1 my-0.5">
            <span className={`text-xl font-black ${isStreakActive ? 'text-white' : 'text-gray-400'}`}>
              {liveStreak}
            </span>
            <Zap className={`w-4 h-4 ${isStreakActive ? 'text-amber-400 fill-amber-400' : 'text-gray-500 fill-gray-500'}`} />
          </div>
          <span className="text-[10px] text-gray-500 font-medium">days</span>
        </div>

        {/* Center: Avatar, Username & Calorie Goal */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-md mb-2">
            <div className="w-full h-full rounded-full bg-[#0B121F] flex items-center justify-center">
              <User className="w-8 h-8 text-emerald-400" />
            </div>
          </div>

          <h2 className="text-base font-bold text-white leading-tight">
            {getDisplayName()}
          </h2>

          <div className="flex items-center gap-1 mt-1 bg-[#0B121F] px-2.5 py-0.5 rounded-full border border-gray-800">
            <Flame className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] font-semibold text-gray-300">
              {targetCalories || 2000} kcal
            </span>
          </div>
        </div>

        {/* Right: Progress (kg lost) */}
        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Progress
          </span>
          <div className="flex items-center gap-1 my-0.5">
            <span className="text-xl font-black text-white">{kgsLostDisplay}</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-[10px] text-gray-500 font-medium">kgs lost</span>
        </div>

      </div>
    </div>
  );
}