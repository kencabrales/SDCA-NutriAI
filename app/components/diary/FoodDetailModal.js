'use client';

import { useState, useEffect } from 'react';
import { X, Cpu, Activity } from 'lucide-react';

export default function FoodDetailModal({ isOpen, foodName, mealType, initialData, onClose, onConfirmLog, onUpdateLog }) {
  const [servings, setServings] = useState(1);
  const [unit, setUnit] = useState('g');
  const [weightValue, setWeightValue] = useState(100);

  // Sync modal state when it opens or when data profiles swap
  useEffect(() => {
    if (isOpen) {
      if (initialData && (initialData._id || initialData.id) && !initialData.caloriesPer100g) {
        // CASE 1: We are EDITING an existing logged document from MongoDB
        setWeightValue(initialData.amount || 100);
        setServings(1);
        setUnit(initialData.unit || 'g');
      } else {
        // CASE 2: We are LOGGING a fresh item selected via autocomplete search or fresh baseline
        setWeightValue(100);
        setServings(1);
        setUnit('g');
      }
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // --- NUTRITIONAL MATHEMATICS ENGINE ---
  // Determine if we are analyzing a database search item vs an existing item log document
  const isEditing = initialData && (initialData._id || initialData.id) && !initialData.caloriesPer100g;

  let baseCalRef = 1.5;
  let baseCarbRef = 0.18;
  let baseProRef = 0.12;
  let baseFatRef = 0.04;

  if (isEditing) {
    // Read the exact raw macro numbers saved inside the historical log entry
    const denominator = initialData.amount || 100;
    baseCalRef = initialData.calories / denominator;
    baseCarbRef = initialData.carbs / denominator;
    baseProRef = initialData.protein / denominator;
    baseFatRef = initialData.fat / denominator;
  } else if (initialData && initialData.caloriesPer100g !== undefined) {
    // Read the 100g ratio properties streaming out from the autocomplete database search engine
    baseCalRef = initialData.caloriesPer100g / 100;
    baseCarbRef = initialData.carbsPer100g / 100;
    baseProRef = initialData.proteinPer100g / 100;
    baseFatRef = initialData.fatPer100g / 100;
  }

  // Calculate dynamic real-time target totals
  const dynamicAmount = weightValue * servings;
  const baseCalories = Math.round(dynamicAmount * baseCalRef);
  const baseCarbs = parseFloat((dynamicAmount * baseCarbRef).toFixed(1));
  const baseProtein = parseFloat((dynamicAmount * baseProRef).toFixed(1));
  const baseFat = parseFloat((dynamicAmount * baseFatRef).toFixed(1));

  const handleSave = () => {
    const payload = {
      foodName,
      amount: dynamicAmount,
      unit,
      mealType,
      calories: baseCalories,
      carbs: baseCarbs,
      protein: baseProtein,
      fat: baseFat
    };

    if (isEditing) {
      // Safely extract the valid database string identifier
      const logId = initialData._id || initialData.id;
      onUpdateLog(logId, payload);
    } else {
      onConfirmLog(payload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121A2A] border border-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header Block Section */}
        <div className="p-4 border-b border-gray-800/60 bg-[#161F30]/40 flex justify-between items-center">
          <div>
            <h3 className="text-[10px] font-mono text-[#00A86B] font-bold uppercase tracking-widest">
              {isEditing ? 'Modify Food Record' : 'Macro Analysis'}
            </h3>
            <h2 className="text-sm font-black tracking-tight text-white mt-0.5 truncate max-w-[240px]">{foodName}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#1C2638] rounded-xl text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1">
          {/* IoT Scale Sync Banner */}
          <div className="bg-cyan-950/10 border border-cyan-900/40 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <div>
                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">IoT Scale Interface</p>
                <p className="text-[9px] text-gray-500 font-mono">Ready for Bluetooth hardware stream...</p>
              </div>
            </div>
            <Cpu className="w-4 h-4 text-cyan-500/60" />
          </div>

          {/* Input Controls */}
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-[#1C2638]/40 border border-gray-800/60 rounded-xl px-4 py-2.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Metric Unit</label>
              <select 
                value={unit} 
                onChange={(e) => setUnit(e.target.value)}
                className="bg-[#1C2638] border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#00A86B]"
              >
                <option value="g">Grams (g)</option>
                <option value="ml">Milliliters (ml)</option>
                <option value="oz">Ounces (oz)</option>
              </select>
            </div>

            <div className="flex justify-between items-center bg-[#1C2638]/40 border border-gray-800/60 rounded-xl px-4 py-2.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unit Weight Amount</label>
              <input 
                type="number" 
                value={weightValue} 
                onChange={(e) => setWeightValue(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-20 text-right bg-[#1C2638] border border-gray-800 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#00A86B]"
              />
            </div>

            <div className="flex justify-between items-center bg-[#1C2638]/40 border border-gray-800/60 rounded-xl px-4 py-2.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Multiplier Servings</label>
              <input 
                type="number" 
                step="0.1"
                value={servings} 
                onChange={(e) => setServings(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-20 text-right bg-[#1C2638] border border-gray-800 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#00A86B]"
              />
            </div>
          </div>

          {/* Macros Preview Module */}
          <div className="border-t border-gray-800/60 pt-4 grid grid-cols-4 gap-2 text-center">
            <div className="bg-[#161F30]/30 border border-gray-800/40 p-2 rounded-xl flex flex-col justify-center">
              <p className="text-sm font-black text-amber-500 font-mono">{baseCalories}</p>
              <p className="text-[8px] uppercase tracking-widest text-gray-500 font-bold mt-0.5">Cal</p>
            </div>
            <div className="bg-[#161F30]/30 border border-gray-800/40 p-2 rounded-xl">
              <p className="text-xs font-bold text-cyan-400 font-mono">{baseCarbs}g</p>
              <p className="text-[8px] uppercase tracking-widest text-gray-500 font-bold mt-0.5">Carbs</p>
            </div>
            <div className="bg-[#161F30]/30 border border-gray-800/40 p-2 rounded-xl">
              <p className="text-xs font-bold text-purple-400 font-mono">{baseFat}g</p>
              <p className="text-[8px] uppercase tracking-widest text-gray-500 font-bold mt-0.5">Fat</p>
            </div>
            <div className="bg-[#161F30]/30 border border-gray-800/40 p-2 rounded-xl">
              <p className="text-xs font-bold text-emerald-400 font-mono">{baseProtein}g</p>
              <p className="text-[8px] uppercase tracking-widest text-gray-500 font-bold mt-0.5">Protein</p>
            </div>
          </div>
        </div>

        {/* Confirmation Button */}
        <div className="p-3 bg-[#161F30]/40 border-t border-gray-800/60 flex space-x-2">
          <button 
            onClick={handleSave}
            className="flex-1 bg-[#00A86B] hover:bg-[#00945D] text-white text-xs uppercase tracking-wider font-bold py-3 rounded-xl transition-all shadow-md shadow-[#00A86B]/10 flex items-center justify-center space-x-1.5"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Update Log Entry' : 'Confirm Log Entry'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}