'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Cpu, Activity, ChevronDown, ChevronUp } from 'lucide-react';

export default function FoodDetailModal({ isOpen, foodName, mealType, initialData, onClose, onConfirmLog, onUpdateLog }) {
  const [servings, setServings] = useState(1);
  const [unit, setUnit] = useState('g');
  const [showNutritionFacts, setShowNutritionFacts] = useState(false);
  
  // The absolute source of truth to prevent conversion drift
  const [weightInGrams, setWeightInGrams] = useState(100);
  // The visual value shown in the input box
  const [inputValue, setInputValue] = useState(100);

  // Detect data source type
  const isEditing = initialData && (initialData._id || initialData.id) && !initialData.caloriesPer100g && !initialData.items && initialData.totalCalories === undefined;
  const isMeal = initialData && (initialData.items || initialData.totalCalories !== undefined);

  useEffect(() => {
    if (isOpen) {
      setShowNutritionFacts(false);
      if (isMeal) {
        setServings(1);
        setWeightInGrams(100);
        setInputValue(100);
        setUnit('serving');
      } else if (isEditing) {
        const initAmount = initialData.amount || 100;
        const initUnit = initialData.unit || 'g';
        
        setInputValue(initAmount);
        setUnit(initUnit);
        setServings(1);
        
        if (initUnit === 'oz') {
          setWeightInGrams(initAmount * 28.34952);
        } else {
          setWeightInGrams(initAmount);
        }
      } else {
        // Plain search-result / normalizeItem-shaped data (custom foods and
        // API foods alike). `amount` here is the nutrition-math reference
        // (e.g. 100 for Open Food Facts' per-100g values, or the food's true
        // serving for custom foods). `defaultServingAmount` is the food's
        // real-world serving size, used purely to pre-fill what the user
        // sees — it does NOT change how the nutrition math is scaled below,
        // since that still reads `initialData.amount` as the reference.
        const defaultAmount = Number(
          initialData?.defaultServingAmount || initialData?.amount || initialData?.servingAmount || 100
        );
        setWeightInGrams(defaultAmount);
        setInputValue(defaultAmount);
        setServings(Number(initialData?.numberOfServings || 1));
        setUnit(initialData?.unit || 'g');
      }
    }
  }, [initialData, isOpen, isEditing, isMeal]);

  // Handle Input Changes directly
  const handleInputChange = (e) => {
    const rawValue = e.target.value;
    setInputValue(rawValue);
    
    const numVal = parseFloat(rawValue) || 0;
    if (unit === 'oz') {
      setWeightInGrams(numVal * 28.34952);
    } else {
      setWeightInGrams(numVal);
    }
  };

  // Handle Unit Switching by deriving strictly from the exact grams
  const handleUnitChange = (newUnit) => {
    if (newUnit === unit) return;
    
    setUnit(newUnit);
    if (newUnit === 'oz') {
      // Round Ounces to max 1 decimal place (e.g., 3.5)
      setInputValue(Number((weightInGrams / 28.34952).toFixed(1)));
    } else {
      // Round Grams/ml to whole numbers (no doubles)
      setInputValue(Math.round(weightInGrams));
    }
  };

  // --- NUTRITIONAL MATHEMATICS ENGINE (Memoized for zero lag) ---
  // Scales ALL 15 tracked nutrients (not just the 4 macros + 4 micros this
  // used to stop at) so nothing gets silently dropped between "how much did
  // you actually log" and what reaches /api/food-log.
  const {
    baseCalories, baseCarbs, baseProtein, baseFat,
    baseSodium, baseSugar, baseFiber, baseCholesterol,
    basePotassium, baseSatFat, basePolyFat, baseMonoFat, baseTransFat,
    baseVitaminA, baseVitaminC, baseCalcium, baseIron, baseVitaminB12, baseVitaminD
  } = useMemo(() => {
    let cal = 0, carbs = 0, pro = 0, fat = 0;
    let sodium = 0, sugar = 0, fiber = 0, cholesterol = 0;
    let potassium = 0, satFat = 0, polyFat = 0, monoFat = 0, transFat = 0;
    let vitaminA = 0, vitaminC = 0, calcium = 0, iron = 0, vitaminB12 = 0, vitaminD = 0;

    const currentServings = Number(servings) || 1;
    const dynamicGrams = weightInGrams * currentServings;
    const round1 = (n) => parseFloat((n || 0).toFixed(1));

    if (isMeal) {
      // Meal documents (lib/Meals.js) store these as total*Goal-free plain
      // aggregate fields: totalSodium, totalPotassium, totalSatFat, etc.
      cal = Math.round((initialData?.totalCalories || 0) * currentServings);
      carbs = round1((initialData?.totalCarbs || 0) * currentServings);
      pro = round1((initialData?.totalProtein || 0) * currentServings);
      fat = round1((initialData?.totalFat || 0) * currentServings);
      sodium = round1((initialData?.totalSodium || 0) * currentServings);
      sugar = round1((initialData?.totalSugar || 0) * currentServings);
      fiber = round1((initialData?.totalFiber || 0) * currentServings);
      cholesterol = round1((initialData?.totalCholesterol || 0) * currentServings);
      potassium = round1((initialData?.totalPotassium || 0) * currentServings);
      satFat = round1((initialData?.totalSatFat || 0) * currentServings);
      polyFat = round1((initialData?.totalPolyFat || 0) * currentServings);
      monoFat = round1((initialData?.totalMonoFat || 0) * currentServings);
      transFat = round1((initialData?.totalTransFat || 0) * currentServings);
      vitaminA = round1((initialData?.totalVitaminA || 0) * currentServings);
      vitaminC = round1((initialData?.totalVitaminC || 0) * currentServings);
      calcium = round1((initialData?.totalCalcium || 0) * currentServings);
      iron = round1((initialData?.totalIron || 0) * currentServings);
      vitaminB12 = round1((initialData?.totalVitaminB12 || 0) * currentServings);
      vitaminD = round1((initialData?.totalVitaminD || 0) * currentServings);
    } else if (isEditing) {
      // Editing an existing FoodLog entry — its fields are the plain names
      // FoodLog's schema uses (item.sodium, item.potassium, ...).
      const originalGrams = (initialData?.unit === 'oz') 
        ? (initialData.amount * 28.34952) 
        : (initialData?.amount || 100);

      const per = (field) => (initialData?.[field] || 0) / originalGrams;

      cal = Math.round(dynamicGrams * per('calories'));
      carbs = round1(dynamicGrams * per('carbs'));
      pro = round1(dynamicGrams * per('protein'));
      fat = round1(dynamicGrams * per('fat'));
      sodium = round1(dynamicGrams * per('sodium'));
      sugar = round1(dynamicGrams * per('sugar'));
      fiber = round1(dynamicGrams * per('fiber'));
      cholesterol = round1(dynamicGrams * per('cholesterol'));
      potassium = round1(dynamicGrams * per('potassium'));
      satFat = round1(dynamicGrams * per('satFat'));
      polyFat = round1(dynamicGrams * per('polyFat'));
      monoFat = round1(dynamicGrams * per('monoFat'));
      transFat = round1(dynamicGrams * per('transFat'));
      vitaminA = round1(dynamicGrams * per('vitaminA'));
      vitaminC = round1(dynamicGrams * per('vitaminC'));
      calcium = round1(dynamicGrams * per('calcium'));
      iron = round1(dynamicGrams * per('iron'));
      vitaminB12 = round1(dynamicGrams * per('vitaminB12'));
      vitaminD = round1(dynamicGrams * per('vitaminD'));
    } else if (initialData && initialData.caloriesPer100g !== undefined) {
      // A `*Per100g`-shaped data source (not currently produced by any known
      // caller, but supported defensively in case one exists elsewhere).
      const per = (field) => (initialData[`${field}Per100g`] || 0) / 100;

      cal = Math.round(dynamicGrams * per('calories'));
      carbs = round1(dynamicGrams * per('carbs'));
      pro = round1(dynamicGrams * per('protein'));
      fat = round1(dynamicGrams * per('fat'));
      sodium = round1(dynamicGrams * per('sodium'));
      sugar = round1(dynamicGrams * per('sugar'));
      fiber = round1(dynamicGrams * per('fiber'));
      cholesterol = round1(dynamicGrams * per('cholesterol'));
      potassium = round1(dynamicGrams * per('potassium'));
      satFat = round1(dynamicGrams * per('satFat'));
      polyFat = round1(dynamicGrams * per('polyFat'));
      monoFat = round1(dynamicGrams * per('monoFat'));
      transFat = round1(dynamicGrams * per('transFat'));
      vitaminA = round1(dynamicGrams * per('vitaminA'));
      vitaminC = round1(dynamicGrams * per('vitaminC'));
      calcium = round1(dynamicGrams * per('calcium'));
      iron = round1(dynamicGrams * per('iron'));
      vitaminB12 = round1(dynamicGrams * per('vitaminB12'));
      vitaminD = round1(dynamicGrams * per('vitaminD'));
    } else {
      // Robust fallback: search results, LogFoodModal.normalizeItem output,
      // and anything else shaped with plain field names + a reference amount.
      // NOTE: referenceBaseAmount intentionally reads `amount` (the
      // nutrition-math reference, e.g. 100 for per-100g API data), NOT
      // `defaultServingAmount` (the display-only real-world serving) — mixing
      // those up would silently corrupt the scaling math.
      const rawCal = Number(initialData?.calories || initialData?.nf_calories || initialData?.energy || 0);
      const rawCarbs = Number(initialData?.carbs || initialData?.carbohydrates || initialData?.nf_total_carbohydrate || 0);
      const rawPro = Number(initialData?.protein || initialData?.nf_protein || 0);
      const rawFat = Number(initialData?.fat || initialData?.totalFat || initialData?.nf_total_fat || 0);
      const rawSodium = Number(initialData?.sodium || initialData?.nf_sodium || 0);
      const rawSugar = Number(initialData?.sugar || initialData?.nf_sugars || 0);
      const rawFiber = Number(initialData?.fiber || initialData?.nf_dietary_fiber || 0);
      const rawChol = Number(initialData?.cholesterol || initialData?.nf_cholesterol || 0);
      const rawPotassium = Number(initialData?.potassium || 0);
      const rawSatFat = Number(initialData?.satFat || 0);
      const rawPolyFat = Number(initialData?.polyFat || 0);
      const rawMonoFat = Number(initialData?.monoFat || 0);
      const rawTransFat = Number(initialData?.transFat || 0);
      const rawVitaminA = Number(initialData?.vitaminA || 0);
      const rawVitaminC = Number(initialData?.vitaminC || 0);
      const rawCalcium = Number(initialData?.calcium || 0);
      const rawIron = Number(initialData?.iron || 0);
      const rawVitaminB12 = Number(initialData?.vitaminB12 || 0);
      const rawVitaminD = Number(initialData?.vitaminD || 0);
      
      const referenceBaseAmount = Number(initialData?.amount || initialData?.servingAmount || 100);
      const scaleFactor = referenceBaseAmount > 0 ? dynamicGrams / referenceBaseAmount : 1;

      cal = Math.round(rawCal * scaleFactor * currentServings);
      carbs = round1(rawCarbs * scaleFactor * currentServings);
      pro = round1(rawPro * scaleFactor * currentServings);
      fat = round1(rawFat * scaleFactor * currentServings);
      sodium = round1(rawSodium * scaleFactor * currentServings);
      sugar = round1(rawSugar * scaleFactor * currentServings);
      fiber = round1(rawFiber * scaleFactor * currentServings);
      cholesterol = round1(rawChol * scaleFactor * currentServings);
      potassium = round1(rawPotassium * scaleFactor * currentServings);
      satFat = round1(rawSatFat * scaleFactor * currentServings);
      polyFat = round1(rawPolyFat * scaleFactor * currentServings);
      monoFat = round1(rawMonoFat * scaleFactor * currentServings);
      transFat = round1(rawTransFat * scaleFactor * currentServings);
      vitaminA = round1(rawVitaminA * scaleFactor * currentServings);
      vitaminC = round1(rawVitaminC * scaleFactor * currentServings);
      calcium = round1(rawCalcium * scaleFactor * currentServings);
      iron = round1(rawIron * scaleFactor * currentServings);
      vitaminB12 = round1(rawVitaminB12 * scaleFactor * currentServings);
      vitaminD = round1(rawVitaminD * scaleFactor * currentServings);
    }

    return { 
      baseCalories: cal, baseCarbs: carbs, baseProtein: pro, baseFat: fat,
      baseSodium: sodium, baseSugar: sugar, baseFiber: fiber, baseCholesterol: cholesterol,
      basePotassium: potassium, baseSatFat: satFat, basePolyFat: polyFat, baseMonoFat: monoFat, baseTransFat: transFat,
      baseVitaminA: vitaminA, baseVitaminC: vitaminC, baseCalcium: calcium, baseIron: iron, baseVitaminB12: vitaminB12, baseVitaminD: vitaminD
    };
  }, [initialData, isMeal, isEditing, weightInGrams, servings]);

  // Early return placed AFTER all hooks have been invoked to satisfy React Hook rules
  if (!isOpen) return null;

  const handleSave = () => {
    const finalAmount = isMeal ? servings : Number((parseFloat(inputValue) * (Number(servings) || 1)).toFixed(2));
    
    const payload = {
      foodName: isMeal ? (initialData?.name || foodName) : (initialData?.foodName || foodName),
      amount: finalAmount,
      unit: isMeal ? 'serving' : unit,
      mealType,
      calories: baseCalories,
      carbs: baseCarbs,
      protein: baseProtein,
      fat: baseFat,
      sodium: baseSodium,
      sugar: baseSugar,
      fiber: baseFiber,
      cholesterol: baseCholesterol,
      potassium: basePotassium,
      satFat: baseSatFat,
      polyFat: basePolyFat,
      monoFat: baseMonoFat,
      transFat: baseTransFat,
      vitaminA: baseVitaminA,
      vitaminC: baseVitaminC,
      calcium: baseCalcium,
      iron: baseIron,
      vitaminB12: baseVitaminB12,
      vitaminD: baseVitaminD,
      isMeal: isMeal || false
    };

    if (isEditing) {
      const logId = initialData._id || initialData.id;
      onUpdateLog(logId, payload);
    } else {
      onConfirmLog(payload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121A2A] border border-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header Section */}
        <div className="p-4 border-b border-gray-800/60 bg-[#161F30]/40 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-[10px] font-mono text-[#00A86B] font-bold uppercase tracking-widest">
              {isMeal ? 'Meal Entry Analysis' : (isEditing ? 'Modify Food Record' : 'Macro Analysis')}
            </h3>
            <h2 className="text-sm font-black tracking-tight text-white mt-0.5 truncate max-w-[240px]">
              {isMeal ? (initialData?.name || foodName) : (initialData?.foodName || foodName)}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#1C2638] rounded-xl text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
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
            {!isMeal ? (
              <>
                <div className="flex justify-between items-center bg-[#1C2638]/40 border border-gray-800/60 rounded-xl px-4 py-2.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Metric Unit</label>
                  <select 
                    value={unit} 
                    onChange={(e) => handleUnitChange(e.target.value)}
                    className="bg-[#1C2638] border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#00A86B]"
                  >
                    <option value="g">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="oz">Ounces (oz)</option>
                    <option value="lb">Pounds (lb)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="l">Liters (l)</option>
                    <option value="fl oz">Fluid Ounces (fl oz)</option>
                    <option value="cup">Cups</option>
                    <option value="tbsp">Tablespoons (tbsp)</option>
                    <option value="tsp">Teaspoons (tsp)</option>
                    <option value="serving">Servings</option>
                  </select>
                </div>

                <div className="flex justify-between items-center bg-[#1C2638]/40 border border-gray-800/60 rounded-xl px-4 py-2.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unit Weight Amount</label>
                  <input 
                    type="number" 
                    step="any"
                    value={inputValue} 
                    onChange={handleInputChange}
                    className="w-24 text-right bg-[#1C2638] border border-gray-800 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#00A86B] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </>
                        ) : initialData?.items?.length > 0 ? (
              <div className="bg-[#161F30] border border-gray-800 rounded-xl p-3 text-xs text-gray-400">
                <p className="font-bold text-white mb-1">Items in this Meal:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px]">
                  {initialData.items.map((item, idx) => (
                    <li key={idx}>
                      {item.foodName} - <span className="text-amber-400">{item.calories} cal</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex justify-between items-center bg-[#1C2638]/40 border border-gray-800/60 rounded-xl px-4 py-2.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {isMeal ? 'Meal Servings' : 'Multiplier Servings'}
              </label>
              <input 
                type="number" 
                step="0.1"
                value={servings} 
                onChange={(e) => setServings(e.target.value === '' ? '' : Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-24 text-right bg-[#1C2638] border border-gray-800 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#00A86B] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Macros Preview Module */}
          <div className="border-t border-gray-800/60 pt-4 grid grid-cols-4 gap-2 text-center">
            <div className="bg-[#161F30]/30 border border-gray-800/40 p-2 rounded-xl flex flex-col justify-center">
              <p className="text-sm font-black text-emerald-500 font-mono">{baseCalories}</p>
              <p className="text-[8px] uppercase tracking-widest text-gray-500 font-bold mt-0.5">KCal</p>
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
              <p className="text-xs font-bold text-amber-400 font-mono">{baseProtein}g</p>
              <p className="text-[8px] uppercase tracking-widest text-gray-500 font-bold mt-0.5">Protein</p>
            </div>
          </div>

          {/* Show Nutrition Facts — collapsible micronutrient breakdown */}
          <div className="border-t border-gray-800/60 pt-3">
            <button
              type="button"
              onClick={() => setShowNutritionFacts((prev) => !prev)}
              className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-white transition-colors py-1.5"
            >
              <span>{showNutritionFacts ? 'Hide Nutrition Facts' : 'Show Nutrition Facts'}</span>
              {showNutritionFacts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showNutritionFacts && (
              <div className="mt-1 p-3.5 bg-[#161F30]/40 rounded-xl text-[11px] font-mono text-gray-300 border border-gray-800/60 divide-y divide-gray-800/50">
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Saturated Fat</span><span className="font-semibold">{baseSatFat} g</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Polyunsaturated Fat</span><span className="font-semibold">{basePolyFat} g</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Monounsaturated Fat</span><span className="font-semibold">{baseMonoFat} g</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Trans Fat</span><span className="font-semibold">{baseTransFat} g</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Cholesterol</span><span className="font-semibold">{baseCholesterol} mg</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Sodium</span><span className="font-semibold">{baseSodium} mg</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Potassium</span><span className="font-semibold">{basePotassium} mg</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Dietary Fiber</span><span className="font-semibold">{baseFiber} g</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Sugars</span><span className="font-semibold">{baseSugar} g</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Vitamin A</span><span className="font-semibold">{baseVitaminA} mcg</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Vitamin C</span><span className="font-semibold">{baseVitaminC} mg</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Calcium</span><span className="font-semibold">{baseCalcium} mg</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Iron</span><span className="font-semibold">{baseIron} mg</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Vitamin B12</span><span className="font-semibold">{baseVitaminB12} mcg</span></div>
                <div className="flex justify-between py-1.5"><span className="text-gray-400">Vitamin D</span><span className="font-semibold">{baseVitaminD} mcg</span></div>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Button */}
        <div className="p-3 bg-[#161F30]/40 border-t border-gray-800/60 flex space-x-2 flex-shrink-0">
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