'use client';

import { UtensilsCrossed } from 'lucide-react';

export default function MyMealsTab() {
  return (
    <div className="space-y-4">
      <div className="text-center py-12 bg-[#0D1320] border border-gray-800/80 rounded-2xl text-gray-400 text-sm flex flex-col items-center justify-center space-y-3">
        <div className="p-3 bg-[#1C2638] rounded-xl border border-gray-800 text-[#00A86B]">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <p className="font-semibold text-white">Custom Meal Templates</p>
        <p className="text-xs text-gray-500 max-w-sm">
          Saved custom meals and quick-add combinations will appear here for easy daily logging.
        </p>
      </div>
    </div>
  );
}