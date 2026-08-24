//components/dashboard/MacroCards for dashboard
import { Flame, PieChart, ChevronRight } from 'lucide-react';

export default function MacroCards({ 
  consumedCalories, 
  calorieGoal, 
  remainingCalories, 
  totalProtein, 
  proteinGoal, 
  totalCarbs, 
  carbGoal, 
  totalFat, 
  fatGoal, 
  router 
}) {
  // Calculate dynamic macro calories
  const carbCal = totalCarbs * 4;
  const fatCal = totalFat * 9;
  const proteinCal = totalProtein * 4;
  const totalMacroCal = carbCal + fatCal + proteinCal || 1;

  // Percentage contributions to total calories consumed
  const carbPct = (carbCal / totalMacroCal) * 100;
  const fatPct = (fatCal / totalMacroCal) * 100;
  const proteinPct = (proteinCal / totalMacroCal) * 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
      
      {/* ENERGY INTAKE CARD */}
      <div className="lg:col-span-7 bg-[#121A2A] border border-gray-800/80 rounded-2xl p-4 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[#00A86B]">
              <Flame className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-bold text-gray-200 tracking-wider uppercase">Energy Intake</h2>
          </div>
          <button 
            onClick={() => router.push('/dashboard/diary')}
            className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-white font-bold transition-colors bg-[#161F30] px-2 py-0.5 rounded-lg border border-gray-800"
          >
            <span>Diary</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center justify-between my-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white tracking-tight">{consumedCalories}</span>
              <span className="text-xs text-gray-400 font-bold">/ {calorieGoal} kcal</span>
            </div>
            <p className="text-[10px] text-gray-500">Consumed today</p>
          </div>
        </div>

        {/* DYNAMIC MULTI-COLOR MACRO PROGRESS BAR */}
        <div className="space-y-1">
          <div className="w-full bg-[#0B121F] h-2.5 rounded-full overflow-hidden border border-gray-800/80 flex">
            {consumedCalories > 0 && (
              <>
                <div 
                  className="bg-[#22d3ee] h-full transition-all duration-500" 
                  style={{ width: `${(carbPct * Math.min(100, (consumedCalories / calorieGoal) * 100)) / 100}%` }}
                />
                <div 
                  className="bg-[#c084fc] h-full transition-all duration-500" 
                  style={{ width: `${(fatPct * Math.min(100, (consumedCalories / calorieGoal) * 100)) / 100}%` }}
                />
                <div 
                  className="bg-[#fbbf24] h-full transition-all duration-500" 
                  style={{ width: `${(proteinPct * Math.min(100, (consumedCalories / calorieGoal) * 100)) / 100}%` }}
                />
              </>
            )}
          </div>
          <div className="flex justify-between items-center text-[9px] font-bold text-gray-500">
            <span>0%</span>
            <span>{Math.round((consumedCalories / calorieGoal) * 100)}% Goal Reached</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* MACROS CARD */}
      <div className="lg:col-span-5 bg-[#121A2A] border border-gray-800/80 rounded-2xl p-3.5 flex flex-col justify-between">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <PieChart className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-bold text-gray-200 tracking-wider uppercase">Macros</h2>
          </div>
          <span className="text-[10px] font-mono text-gray-500">P / C / F</span>
        </div>

        <div className="grid grid-cols-3 gap-1 py-1 items-center text-center">
          {[
            { name: 'Protein', color: '#fbbf24', current: Math.round(totalProtein), goal: proteinGoal },
            { name: 'Carbs', color: '#22d3ee', current: Math.round(totalCarbs), goal: carbGoal },
            { name: 'Fat', color: '#c084fc', current: Math.round(totalFat), goal: fatGoal }
          ].map((macro) => {
            const pct = Math.min(100, Math.round((macro.current / macro.goal) * 100));
            const radius = 17;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (pct / 100) * circumference;

            return (
              <div key={macro.name} className="flex flex-col items-center justify-center space-y-1">
                <div className="relative w-11 h-11 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r={radius} className="text-[#0B121F]" strokeWidth="3.5" stroke="currentColor" fill="transparent" />
                    <circle cx="22" cy="22" r={radius} stroke={macro.color} strokeWidth="3.5" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" fill="transparent" className="transition-all duration-500 ease-out" />
                  </svg>
                  <span className="absolute text-[9px] font-black text-white leading-none">
                    {macro.current}g
                  </span>
                </div>

                <div>
                  <p className="text-[9px] font-bold tracking-wider uppercase" style={{ color: macro.color }}>
                    {macro.name}
                  </p>
                  <p className="text-[8px] text-gray-500 font-medium">/ {macro.goal}g</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}