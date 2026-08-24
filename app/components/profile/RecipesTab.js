'use client';

import { ChefHat } from 'lucide-react';

export default function RecipesTab() {
  return (
    <div className="space-y-4">
      <div className="text-center py-12 bg-[#0D1320] border border-gray-800/80 rounded-2xl text-gray-400 text-sm flex flex-col items-center justify-center space-y-3">
        <div className="p-3 bg-[#1C2638] rounded-xl border border-gray-800 text-[#00A86B]">
          <ChefHat className="w-6 h-6" />
        </div>
        <p className="font-semibold text-white">Recipes & Custom Foods</p>
        <p className="text-xs text-gray-500 max-w-sm">
          Custom recipes and food database entries will appear here.
        </p>
      </div>
    </div>
  );
}