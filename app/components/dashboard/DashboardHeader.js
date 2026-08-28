import { Target, User, BarChart3, Apple, LogOut } from 'lucide-react';
import { useMemo } from 'react';

export default function DashboardHeader({ user, calorieGoal, onOpenProfile, onLogout, router }) {
  const goalAnalysis = useMemo(() => {
    if (!user) return { mode: 'Maintenance', tagColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', diffText: '0 kcal' };

    const calculatedTDEE = user.tdee || (() => {
      if (!user.weight || !user.height || !user.age) return 2200;
      const isMale = user.gender !== 'female';
      const bmr = isMale
        ? 10 * user.weight + 6.25 * user.height - 5 * user.age + 5
        : 10 * user.weight + 6.25 * user.height - 5 * user.age - 161;
      const activityMultipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, extreme: 1.9 };
      return Math.round(bmr * (activityMultipliers[user.activityLevel] || 1.375));
    })();

    const delta = calorieGoal - calculatedTDEE;

    if (delta <= -150) {
      return { mode: 'CALORIE DEFICIT', diffText: `${delta} KCAL/DAY`, tagColor: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' };
    } else if (delta >= 150) {
      return { mode: 'CALORIE SURPLUS', diffText: `+${delta} KCAL/DAY`, tagColor: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' };
    } else {
      return { mode: 'WEIGHT MAINTENANCE', diffText: 'BALANCED', tagColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' };
    }
  }, [user, calorieGoal]);

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800/60 pb-3 gap-3">
      <div>
        <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">
          Welcome back, {user?.firstName || 'User'}!
        </h1>
        
        {/* <div className="mt-1 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${goalAnalysis.bgColor} ${goalAnalysis.borderColor} ${goalAnalysis.tagColor}`}>
            <Target className="w-3 h-3" />
            <span>GOAL: {goalAnalysis.mode} ({goalAnalysis.diffText})</span>
          </span>
        </div> */}
      </div>
      
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
        <button onClick={onOpenProfile} className="flex items-center space-x-1.5 bg-[#161F30] hover:bg-[#1C2638] text-gray-300 hover:text-white px-2.5 py-1 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all border border-gray-800">
          <User className="w-3.5 h-3.5 text-emerald-400" />
          <span>Profile</span>
        </button>

        {/* <button onClick={() => router.push('/dashboard/analytics')} className="flex items-center space-x-1.5 bg-[#121A2A] hover:bg-[#1C2638] text-gray-300 hover:text-white px-2.5 py-1 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all border border-gray-800">
          <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Analytics</span>
        </button> */}

        <button onClick={() => router.push('/dashboard/diary')} className="flex items-center space-x-1.5 bg-[#00A86B] hover:bg-[#00945D] text-white px-2.5 py-1 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all shadow-md shadow-[#00A86B]/10">
          <Apple className="w-3.5 h-3.5" />
          <span>Food Diary</span>
        </button>
      </div>
    </header>
  );
}