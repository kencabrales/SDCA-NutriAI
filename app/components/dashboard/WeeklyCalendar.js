//components/dashboard/WeeklyCalendar.js
import { ChevronDown, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTodayPH } from '@/lib/dateUtils';

export default function WeeklyCalendar({ 
  displayDateHeader, 
  selectedDate, 
  setSelectedDate, 
  streakCount = 0, 
  weekDays, 
  handlePrevWeek, 
  handleNextWeek, 
  loggedDates = [] 
}) {
  // Philippine "today" — not the device's system timezone, so this stays
  // correct even if the browser/OS clock is set to something else.
  const todayStr = getTodayPH();

  const normalizedLoggedSet = new Set(
    loggedDates.map((d) => d.split('T')[0])
  );

  const isTodayLogged = normalizedLoggedSet.has(todayStr);

  const displayStreak = Number(streakCount) || 0;

  const isStreakActive = isTodayLogged && displayStreak >= 2;

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="relative flex items-center gap-1.5 cursor-pointer group">
          <span className="text-lg md:text-xl font-bold text-white">{displayDateHeader}</span>
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
          />
        </div>

        {/* STREAK BADGE */}
        <div className="relative flex items-center justify-center">
          {isStreakActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="animate-ping [animation-duration:2.5s] inline-flex h-full w-full rounded-full bg-amber-400/40 transform scale-105"></span>
            </div>
          )}
          <div className={`relative flex items-center gap-1 bg-[#121A2A] border px-2.5 py-1 rounded-full transition-all ${
            isStreakActive 
              ? 'border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
              : 'border-gray-800 shadow-sm'
          }`}>
            <span className={`text-xs font-bold ${isStreakActive ? 'text-amber-400' : 'text-gray-400'}`}>
              {displayStreak}
            </span>
            <Zap className={`w-3.5 h-3.5 transition-colors ${
              isStreakActive 
                ? 'text-amber-400 fill-amber-400' 
                : 'text-gray-500 fill-gray-500'
            }`} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button onClick={handlePrevWeek} className="p-1.5 bg-[#121A2A] hover:bg-[#161F30] border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-all">
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex gap-1.5 sm:gap-2">
          {weekDays.map((day) => {
            const isSelected = day.dateStr === selectedDate;
            const hasLoggedData = normalizedLoggedSet.has(day.dateStr);

            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`relative flex flex-col items-center justify-center w-10 h-12 sm:w-12 sm:h-14 rounded-xl transition-all duration-200 border flex-shrink-0 ${
                  isSelected 
                    ? 'bg-white border-white text-black shadow-[0_0_12px_rgba(255,255,255,0.15)]' 
                    : 'bg-[#121A2A] border-gray-800/80 text-gray-400 hover:border-gray-600 hover:bg-[#161F30]'
                }`}
              >
                {/* Orange Dot Indicator */}
                {hasLoggedData && (
                  <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                  </span>
                )}
                <span className={`text-[9px] sm:text-[10px] font-bold tracking-wider uppercase ${isSelected ? 'text-gray-500' : 'text-gray-500'}`}>
                  {day.label}
                </span>
                <span className={`text-xs sm:text-base font-black leading-none mt-0.5 ${isSelected ? 'text-[#0B121F]' : 'text-gray-200'}`}>
                  {day.dayNum}
                </span>
              </button>
            );
          })}
        </div>

        <button onClick={handleNextWeek} className="p-1.5 bg-[#121A2A] hover:bg-[#161F30] border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-all">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}