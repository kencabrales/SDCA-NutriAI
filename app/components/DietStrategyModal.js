// Components/DietStrategyModal.js
'use client';

import { Settings, X, ChevronUp, ChevronDown, Check } from 'lucide-react';

export default function DietStrategyModal({
  isOpen,
  onClose,
  strategy,
  setStrategy,
  calorieGoal,
  setCalorieGoal,
  dietType,
  setDietType,
  macroSplit,
  setMacroSplit
}) {
  if (!isOpen) return null;

  // Real-time macro weight conversions based on calorie values
  // Proteins & Carbs: 4 kcal per gram | Fats: 9 kcal per gram
  const calculateGrams = (percentage, isFat = false) => {
    const allocatedCalories = (calorieGoal * percentage) / 100;
    const divider = isFat ? 9 : 4;
    return Math.round(allocatedCalories / divider);
  };

  const handleStrategyChange = (mode) => {
    setStrategy(mode);
    if (mode === 'Deficit') setCalorieGoal(1839);
    else if (mode === 'Maintenance') setCalorieGoal(2339);
    else if (mode === 'Surplus') setCalorieGoal(2839);
  };

  const handleDietPresetChange = (preset) => {
    setDietType(preset);
    if (preset === 'Moderate') setMacroSplit([30, 35, 35]);
    if (preset === 'Lower') setMacroSplit([40, 40, 20]);
    if (preset === 'Higher') setMacroSplit([30, 20, 50]);
  };

  const handleMacroScroll = (e, index) => {
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    adjustMacroValue(index, direction);
  };

  const adjustMacroValue = (index, direction) => {
    setDietType('Custom');
    setMacroSplit(prev => {
      const nextSplit = [...prev];
      const newVal = Math.max(0, Math.min(100, nextSplit[index] + (direction * 5)));
      nextSplit[index] = newVal;
      return nextSplit;
    });
  };

  const totalMacrosPercent = macroSplit[0] + macroSplit[1] + macroSplit[2];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      {/* Clean container without harsh white borders */}
      <div className="bg-[#121A2A] border border-gray-800/80 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        
        {/* Modal Head */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#162136]/40">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">
              Goal & Diet Strategy Settings
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Strategy Select */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Strategy Focus Objective
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Deficit', 'Maintenance', 'Surplus', 'Custom'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleStrategyChange(mode)}
                    className={`py-2 px-1 text-[10px] font-bold uppercase tracking-wider rounded-xl border transition-all ${
                      strategy === mode 
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' 
                        : 'bg-[#0B121F] border-gray-800/80 text-gray-400 hover:text-white'
                    }`}
                  >
                    {mode === 'Deficit' ? 'Cutting' : mode === 'Surplus' ? 'Bulking' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Calorie Target input */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Daily Calorie Target Goal
              </label>
              <div className="relative rounded-xl border border-gray-800 bg-[#0B121F] p-1.5 flex items-center">
                <input 
                  type="number" 
                  value={calorieGoal} 
                  disabled={strategy !== 'Custom'}
                  onChange={(e) => setCalorieGoal(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className={`w-full bg-transparent border-0 font-mono font-bold text-lg px-2 focus:outline-none focus:ring-0 ${strategy === 'Custom' ? 'text-white' : 'text-gray-500'}`} 
                />
                <span className="text-xs font-mono text-gray-500 pr-2 select-none">kcal/day</span>
              </div>
              {strategy !== 'Custom' && (
                <p className="text-[9px] text-cyan-400/80 italic">Unlock target editing by switching strategy to Custom.</p>
              )}
            </div>

          </div>

          {/* Diet Blueprint Recommendations */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Suggested Dietary Blueprint Recommendations
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { key: 'Moderate', name: 'Moderate Carb', desc: '30/35/35 Split' },
                { key: 'Lower', name: 'Lower Carb', desc: '40/40/20 Split' },
                { key: 'Higher', name: 'Higher Carb', desc: '30/20/50 Split' }
              ].map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handleDietPresetChange(preset.key)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    dietType === preset.key 
                      ? 'bg-[#00A86B]/10 border-[#00A86B] text-white' 
                      : 'bg-[#0B121F] border-gray-800/80 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span className="font-bold text-[11px]">{preset.name}</span>
                  <span className="text-[9px] text-gray-500 font-mono mt-0.5">{preset.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-800 pt-4 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
                  Dynamic Macro Allocation Split Selector
                </h4>
                <p className="text-[10px] text-gray-500">
                  Hover & scroll up/down <span className="text-purple-400 font-mono font-bold">↕</span> on target values to shift allocations by 5%.
                </p>
              </div>
              <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${totalMacrosPercent === 100 ? 'bg-emerald-950/80 text-emerald-400' : 'bg-red-950/80 text-red-400'}`}>
                Sum Total: {totalMacrosPercent}% {totalMacrosPercent === 100 ? '(Valid)' : '(Must equal 100%)'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-[#0B121F] p-2.5 rounded-xl border border-gray-800/80">
              {[
                { label: 'Protein', color: 'text-emerald-400', isFat: false },
                { label: 'Fats', color: 'text-purple-400', isFat: true },
                { label: 'Carbs', color: 'text-cyan-400', isFat: false }
              ].map((macro, idx) => (
                <div 
                  key={macro.label} 
                  onWheel={(e) => handleMacroScroll(e, idx)}
                  className="bg-[#121A2A] border border-gray-800/80 rounded-lg p-2 text-center select-none group relative overflow-hidden"
                >
                  <span className={`text-[9px] font-bold uppercase block tracking-wider mb-1 ${macro.color}`}>
                    {macro.label}
                  </span>
                  
                  {/* Dynamic Gram Track Weight Display */}
                  <div className="text-white text-xs font-mono font-bold mb-1 bg-[#0B121F]/60 rounded py-0.5 mx-2">
                    {calculateGrams(macroSplit[idx], macro.isFat)}g
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <button 
                      type="button" 
                      onClick={() => adjustMacroValue(idx, 1)} 
                      className="text-gray-500 hover:text-white transition p-0.5"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    
                    <span className="font-mono text-sm font-black text-gray-300">
                      {macroSplit[idx]}%
                    </span>
                    
                    <button 
                      type="button" 
                      onClick={() => adjustMacroValue(idx, -1)} 
                      className="text-gray-500 hover:text-white transition p-0.5"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Foot */}
        <div className="p-4 bg-[#162136]/20 border-t border-gray-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-[#00A86B] hover:bg-[#00945D] text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            Save Strategy
          </button>
        </div>

      </div>
    </div>
  );
}