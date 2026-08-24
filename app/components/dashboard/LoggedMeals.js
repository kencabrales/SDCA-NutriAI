import { Utensils, Plus } from 'lucide-react';

export default function LoggedMeals({ mealBreakdown, router }) {
  return (
    <div className="bg-[#121A2A] border border-gray-800/80 rounded-2xl p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Utensils className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-bold text-gray-200 tracking-wider uppercase">Logged Meals</h2>
        </div>
        <span className="text-[10px] text-gray-500 font-medium">Quick Log</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { id: 'breakfast', name: 'Breakfast' },
          { id: 'lunch', name: 'Lunch' },
          { id: 'dinner', name: 'Dinner' },
          { id: 'snacks', name: 'Snacks' }
        ].map((meal) => {
          const data = mealBreakdown[meal.id] || { calories: 0 };
          const hasLogged = data.calories > 0;

          return (
            <button
              key={meal.id}
              onClick={() => router.push('/dashboard/diary')}
              className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all duration-200 group ${
                hasLogged
                  ? 'bg-[#0B121F] border-gray-800 hover:border-gray-600'
                  : 'bg-[#0B121F]/40 border-gray-800/50 hover:bg-[#0B121F] hover:border-gray-700'
              }`}
            >
              <div className="flex justify-between items-center w-full mb-1">
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors">{meal.name}</span>
                <Plus className="w-3 h-3 text-gray-600 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-tight">{data.calories}</p>
                <p className="text-[8px] text-gray-500 font-semibold uppercase">kcal</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}