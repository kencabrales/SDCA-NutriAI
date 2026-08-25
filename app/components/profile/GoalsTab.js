//components/profile/GoalsTab.js
'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  Save,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Toast from '../Toast';

// Recalculates the SUGGESTED calorie target from biometrics using the
// Mifflin-St Jeor equation (or Katch-McArdle if body fat % is known),
// then applies activity level and cut/maintain/bulk strategy adjustments.
// This is a pure function — it never touches macro grams.
export const calculateAutoTargets = (data, weightUnit = 'kg') => {
  const rawWeight = Number(data?.currentWeight || data?.weight) || 0;
  const weightKg = weightUnit === 'lbs' ? rawWeight * 0.45359237 : rawWeight;
  const heightCm = Number(data?.heightCm || data?.height) || 170;

  let userAge = Number(data?.age) || 25;
  if (data?.dateOfBirth || data?.dob) {
    const dobDate = new Date(data.dateOfBirth || data.dob);
    if (!isNaN(dobDate.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const monthDiff = today.getMonth() - dobDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }
      userAge = age > 0 ? age : userAge;
    }
  }

  const userSex = String(data?.sex || data?.biologicalSex || 'male').toLowerCase();
  if (weightKg <= 0) return null;

  let bmr = 0;
  const rawBodyFat = data?.bodyFat;
  const numericBodyFat = rawBodyFat !== '' && rawBodyFat !== null && rawBodyFat !== undefined
    ? parseFloat(rawBodyFat)
    : NaN;

  if (!isNaN(numericBodyFat) && numericBodyFat > 0 && numericBodyFat < 100) {
    // Katch-McArdle (uses known lean body mass — more accurate when body fat % is known)
    const leanMass = weightKg * (1 - numericBodyFat / 100);
    bmr = 370 + 21.6 * leanMass;
  } else {
    // Mifflin-St Jeor
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * userAge;
    bmr = userSex === 'female' ? bmr - 161 : bmr + 5;
  }

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    heavy: 1.725,
  };

  const strategyCalorieAdjustments = {
    cut: -500,
    maintain: 0,
    bulk: 500,
  };

  const actMult = activityMultipliers[data?.activityLevel] || 1.2;
  const selectedStrategy = data?.nutritionalStrategy || data?.weeklyPace || data?.weeklyGoal || 'cut';
  const paceAdj = strategyCalorieAdjustments[selectedStrategy] ?? 0;

  const tdee = Math.round(bmr * actMult);
  const minSafeCalories = 1200;
  const targetCalories = Math.max(minSafeCalories, tdee + paceAdj);

  return {
    bmi: parseFloat((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1)),
    bmr: Math.round(bmr),
    tdee,
    targetCalories,
    waterGoalMl: Math.round(weightKg * 35),
    fiberGoal: Math.round((targetCalories / 1000) * 14),
    satFatGoal: Math.round((targetCalories * 0.10) / 9),
    sugarGoal: Math.round((targetCalories * 0.10) / 4),
    cholesterolGoal: userAge > 50 ? 200 : 300,
    sodiumGoal: userAge > 50 ? 1500 : 2300,
    potassiumGoal: userSex === 'female' ? 2600 : 3400,
    vitaminAGoal: userSex === 'female' ? 700 : 900,
    vitaminCGoal: userSex === 'female' ? 75 : 90,
    calciumGoal: (userSex === 'female' && userAge > 50) || userAge > 70 ? 1200 : 1000,
    ironGoal: userSex === 'female' && userAge <= 50 ? 18 : 8,
    vitaminB12Goal: 2.4,
    vitaminDGoal: userAge > 70 ? 800 : 600,
  };
};

// Pure: turns whatever calories currently are (auto-calculated OR manually typed)
// into gram targets using the current carb/protein/fat percentage split.
// Default split is the 40/30/30 standard, fully editable by the user.
export const calculateMacrosFromCalories = (calories, carbsPct = 40, proteinPct = 30, fatPct = 30) => {
  const kcal = Number(calories) || 0;
  const carbsGrams = Math.round((kcal * (Number(carbsPct) / 100)) / 4);
  const proteinGrams = Math.round((kcal * (Number(proteinPct) / 100)) / 4);
  const fatGrams = Math.round((kcal * (Number(fatPct) / 100)) / 9);
  return {
    carbsGrams,
    proteinGrams,
    fatGrams,
    targetCarbs: carbsGrams,
    targetProtein: proteinGrams,
    targetFat: fatGrams,
  };
};

const deriveStrategyFromWeights = (current, goal) => {
  const c = Number(current);
  const g = Number(goal);
  if (!c || !g || isNaN(c) || isNaN(g)) return null;
  const diff = g - c;
  if (Math.abs(diff) < 0.05) return 'maintain'; // treat as equal within rounding
  return diff < 0 ? 'cut' : 'bulk';
};

// Backward-compatible combined helper, kept in case anything else imports the old name.
export const calculateNutrientGoals = (data, weightUnit = 'kg') => {
  const auto = calculateAutoTargets(data, weightUnit);
  if (!auto) return null;
  const carbsPct = Number(data?.carbsPct) || 40;
  const proteinPct = Number(data?.proteinPct) || 30;
  const fatPct = Number(data?.fatPct) || 30;
  const macros = calculateMacrosFromCalories(auto.targetCalories, carbsPct, proteinPct, fatPct);
  return { ...auto, ...macros };
};

export default function GoalsTab({
  formData = {},
  handleChange = () => {},
  weightUnit = 'kg',
  handleWeightUnitToggle,
  onClose,
  onSaveSuccess,
}) {
  const [showNutritionEditor, setShowNutritionEditor] = useState(false);
  const [showAdditionalNutrients, setShowAdditionalNutrients] = useState(false);
  const [saving, setSaving] = useState(false);

  // Toast state
  const [toast, setToast] = useState({
    show: false,
    title: '',
    message: '',
    type: 'success',
  });

  const triggerToast = (title, message, type = 'success') => {
    setToast({ show: true, title, message, type });
  };

  const activityLabels = {
    sedentary: 'Sedentary (Office Job)',
    light: 'Light (1-2 Days/Week)',
    moderate: 'Moderate (3-5 Days/Week)',
    heavy: 'Heavy (6-7 Days/Wk)',
  };

  const strategyLabels = {
    cut: 'Cut (-500 kcal)',
    maintain: 'Maintain',
    bulk: 'Bulk (+500 kcal)',
  };

  const triggerChange = (name, value) => {
    handleChange({ target: { name, value } });
  };

  const handleUnitToggle = (targetUnit) => {
    if (targetUnit === weightUnit) return;

    const convertValue = (val) => {
      if (val === undefined || val === null || val === '' || isNaN(val)) return val;
      const num = Number(val);
      return targetUnit === 'lbs'
        ? (num * 2.20462).toFixed(1)
        : (num / 2.20462).toFixed(1);
    };

    if (formData?.startingWeight) triggerChange('startingWeight', convertValue(formData.startingWeight));
    if (formData?.currentWeight) triggerChange('currentWeight', convertValue(formData.currentWeight));
    if (formData?.weight) triggerChange('weight', convertValue(formData.weight));
    if (formData?.goalWeight) triggerChange('goalWeight', convertValue(formData.goalWeight));

    handleWeightUnitToggle?.(targetUnit);
  };

  const currentWeight = formData?.currentWeight || formData?.weight;
  const nutritionalStrategy = formData?.nutritionalStrategy || formData?.weeklyPace || formData?.weeklyGoal || 'cut';
  const activityLevel = formData?.activityLevel || 'sedentary';
  const carbsPct = formData?.carbsPct;
  const proteinPct = formData?.proteinPct;
  const fatPct = formData?.fatPct;
  const height = formData?.heightCm || formData?.height;
  const age = formData?.age;
  const dob = formData?.dob || formData?.dateOfBirth;
  const sex = formData?.sex || formData?.biologicalSex;
  const bodyFat = formData?.bodyFat;

  // Recomputes the suggested calorie target (Mifflin-St Jeor + activity + strategy)
  // and applies it immediately. Called ONLY from the onChange handlers below —
  // never from a passive effect — so a saved or manually-typed calorie value can
  // never be silently overwritten just because the component (re)mounted.
  const recalcCalorieTarget = (overrides = {}) => {
    const snapshot = {
      currentWeight: overrides.currentWeight ?? currentWeight,
      nutritionalStrategy: overrides.nutritionalStrategy ?? nutritionalStrategy,
      activityLevel: overrides.activityLevel ?? activityLevel,
      height,
      age,
      dob,
      sex,
      bodyFat: overrides.bodyFat ?? bodyFat,
    };
    const auto = calculateAutoTargets(snapshot, weightUnit);
    if (!auto) return;
    Object.entries(auto).forEach(([key, value]) => {
      if (formData?.[key] !== value) triggerChange(key, value);
    });
  };

  // Macros always follow whatever calories + % split currently are — whether
  // calories got there via recalcCalorieTarget above or a manual edit to the
  // calories field. Safe to run passively: inputs (calories, %) and outputs
  // (grams) never overlap, so this effect can never trigger itself in a loop.
  useEffect(() => {
    const kcal = Number(formData?.targetCalories);
    if (!kcal || kcal <= 0) return;

    const macros = calculateMacrosFromCalories(
      kcal,
      Number(carbsPct) || 40,
      Number(proteinPct) || 30,
      Number(fatPct) || 30
    );

    Object.entries(macros).forEach(([key, value]) => {
      if (formData?.[key] !== value) triggerChange(key, value);
    });
  }, [formData?.targetCalories, carbsPct, proteinPct, fatPct]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const safeUserId = formData._id || formData.id || formData.userId;

      const parsedBodyFat =
        formData.bodyFat !== '' && formData.bodyFat !== null && formData.bodyFat !== undefined && !isNaN(formData.bodyFat)
          ? Number(formData.bodyFat)
          : null;

      const payload = {
        ...formData,
        weightUnit,
        userId: safeUserId,
        weight: Number(formData.currentWeight || formData.weight || 0),
        goalWeight: formData.goalWeight !== '' && formData.goalWeight !== null && !isNaN(formData.goalWeight) ? Number(formData.goalWeight) : null,
        bodyFat: parsedBodyFat,
        nutritionalStrategy: formData.nutritionalStrategy || 'cut',
        activityLevel: formData.activityLevel || 'sedentary',
      };

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save goals');

      if (onSaveSuccess && result.user) {
        onSaveSuccess(result.user);
      }

      triggerToast('Success', 'Goals updated successfully!', 'success');

      // Closes modal after a brief delay so the user sees the confirmation Toast
      setTimeout(() => {
        if (typeof onClose === 'function') {
          onClose();
        }
      }, 500);
    } catch (err) {
      console.error('Failed to save goals:', err);
      triggerToast('Error', err.message || 'Something went wrong while saving.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const numberInputStyles = "w-20 bg-[#1C2638] text-white border border-gray-800 rounded-lg px-2.5 py-1 text-right text-xs font-bold focus:outline-none focus:border-[#00A86B] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <>
      <form onSubmit={handleFormSubmit} className="space-y-6 pb-4 relative text-white">
        {/* UNIT PREFERENCES */}
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Unit Preferences
          </span>
          <div className="flex items-center bg-[#1C2638] border border-gray-800 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => handleUnitToggle('kg')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                weightUnit === 'kg'
                  ? 'bg-[#00A86B]/20 text-[#00A86B] border border-[#00A86B]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              KG
            </button>
            <button
              type="button"
              onClick={() => handleUnitToggle('lbs')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                weightUnit === 'lbs'
                  ? 'bg-[#00A86B]/20 text-[#00A86B] border border-[#00A86B]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              LBS
            </button>
          </div>
        </div>

        {/* 1. WEIGHT & STRATEGY GOALS */}
        <div className="bg-[#0D1320] border border-gray-800/80 rounded-2xl overflow-hidden divide-y divide-gray-800/60">
          <div className="p-4 flex items-center justify-between hover:bg-[#121A2A]/40 transition-colors">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-gray-200">Starting Weight</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 bg-[#1C2638] border border-gray-800 rounded-lg px-2 py-1">
                <input
                  type="date"
                  name="startingWeightDate"
                  value={formData?.startingWeightDate ?? ''}
                  onChange={handleChange}
                  className="bg-transparent text-[11px] font-medium text-gray-300 focus:outline-none"
                />
              </div>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  step="0.1"
                  name="startingWeight"
                  value={formData?.startingWeight ?? ''}
                  onChange={handleChange}
                  placeholder="0.0"
                  className={numberInputStyles}
                />
                <span className="text-xs font-semibold text-gray-400">{weightUnit}</span>
              </div>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-[#121A2A]/40 transition-colors">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-gray-200">Current Weight</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <input
                type="number"
                step="0.1"
                name="currentWeight"
                value={formData?.currentWeight ?? formData?.weight ?? ''}
                                onChange={(e) => {
                  handleChange(e);
                  triggerChange('weight', e.target.value);
                  const newStrategy = deriveStrategyFromWeights(e.target.value, formData?.goalWeight);
                  if (newStrategy) {
                    triggerChange('nutritionalStrategy', newStrategy);
                    triggerChange('weeklyPace', newStrategy);
                    triggerChange('weeklyGoal', newStrategy);
                    recalcCalorieTarget({ currentWeight: e.target.value, nutritionalStrategy: newStrategy });
                  } else {
                    recalcCalorieTarget({ currentWeight: e.target.value });
                  }
                }}
                placeholder="0.0"
                className={numberInputStyles}
              />
              <span className="text-xs font-semibold text-gray-400">{weightUnit}</span>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-[#121A2A]/40 transition-colors">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-gray-200">Goal Weight</span>
            </div>
            <div className="flex items-center space-x-1.5">
                            <input
                type="number"
                step="0.1"
                name="goalWeight"
                value={formData?.goalWeight ?? ''}
                onChange={(e) => {
                  handleChange(e);
                  const newStrategy = deriveStrategyFromWeights(currentWeight, e.target.value);
                  if (newStrategy) {
                    triggerChange('nutritionalStrategy', newStrategy);
                    triggerChange('weeklyPace', newStrategy);
                    triggerChange('weeklyGoal', newStrategy);
                    recalcCalorieTarget({ nutritionalStrategy: newStrategy });
                  }
                }}
                placeholder="0.0"
                className={numberInputStyles}
              />
              <span className="text-xs font-semibold text-gray-400">{weightUnit}</span>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-[#121A2A]/40 transition-colors">
            <div className="flex items-center space-x-3">
              <div>
                <span className="text-xs font-semibold text-gray-200 block">Body Fat %</span>
                <span className="text-[10px] text-gray-400 font-normal">Optional</span>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <input
                type="number"
                step="0.1"
                name="bodyFat"
                value={formData?.bodyFat ?? ''}
                onChange={(e) => {
                  handleChange(e);
                  recalcCalorieTarget({ bodyFat: e.target.value });
                }}
                placeholder="Optional"
                className={numberInputStyles}
              />
              <span className="text-xs font-semibold text-gray-400">%</span>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-[#121A2A]/40 transition-colors">
            <span className="text-xs font-semibold text-gray-200">Nutritional Strategy</span>
            <select
              name="nutritionalStrategy"
              value={formData?.nutritionalStrategy ?? formData?.weeklyPace ?? formData?.weeklyGoal ?? 'cut'}
              onChange={(e) => {
                handleChange(e);
                triggerChange('weeklyPace', e.target.value);
                triggerChange('weeklyGoal', e.target.value);
                recalcCalorieTarget({ nutritionalStrategy: e.target.value });
              }}
              className="bg-[#1C2638] border border-gray-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-amber-400 focus:outline-none focus:border-[#00A86B] cursor-pointer"
            >
              {Object.entries(strategyLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-[#121A2A]/40 transition-colors">
            <span className="text-xs font-semibold text-gray-200">Activity Level</span>
            <select
              name="activityLevel"
              value={formData?.activityLevel ?? 'sedentary'}
              onChange={(e) => {
                handleChange(e);
                recalcCalorieTarget({ activityLevel: e.target.value });
              }}
              className="bg-[#1C2638] border border-gray-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-amber-400 focus:outline-none focus:border-[#00A86B] cursor-pointer"
            >
              {Object.entries(activityLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. NUTRITION GOALS */}
        <div className="space-y-2">
          <div className="px-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Nutrition Goals
            </span>
          </div>

          <div className="bg-[#0D1320] border border-gray-800/80 rounded-2xl overflow-hidden divide-y divide-gray-800/60">
            <div className="p-4 hover:bg-[#121A2A]/40 transition-colors">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowNutritionEditor(!showNutritionEditor)}
              >
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Calorie, Carbs, Protein and Fat Goals
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    Calculated automatically or custom daily goals.
                  </span>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    showNutritionEditor ? 'rotate-90' : ''
                  }`}
                />
              </div>

              {showNutritionEditor && (
                <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                 <div className="flex items-center justify-between">
  <span className="text-xs text-gray-300 font-semibold">Target Calories:</span>
  <div className="flex items-center space-x-1">
    <input
      type="number"
      name="targetCalories"
      value={formData?.targetCalories ?? 2000}
      onChange={(e) => {
        handleChange(e);
        const kcal = Number(e.target.value) || 0;
        triggerChange('fiberGoal', Math.round((kcal / 1000) * 14));
        triggerChange('satFatGoal', Math.round((kcal * 0.10) / 9));
        triggerChange('sugarGoal', Math.round((kcal * 0.10) / 4));
      }}
      className={numberInputStyles}
    />
    <span className="text-xs text-gray-400">kcal</span>
  </div>
</div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#1C2638] border border-gray-800 rounded-xl p-2.5 text-center">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase block">Carbs</span>
                      <div className="flex items-center justify-center gap-1 my-1">
                        <input
                          type="number"
                          name="carbsPct"
                          value={formData?.carbsPct ?? 40}
                          onChange={handleChange}
                          className="w-10 bg-transparent text-center font-bold text-white text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] text-gray-400">%</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">
                        {formData?.carbsGrams ?? formData?.targetCarbs ?? 0}g
                      </span>
                    </div>

                    <div className="bg-[#1C2638] border border-gray-800 rounded-xl p-2.5 text-center">
                      <span className="text-[10px] font-bold text-amber-400 uppercase block">Protein</span>
                      <div className="flex items-center justify-center gap-1 my-1">
                        <input
                          type="number"
                          name="proteinPct"
                          value={formData?.proteinPct ?? 30}
                          onChange={handleChange}
                          className="w-10 bg-transparent text-center font-bold text-white text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] text-gray-400">%</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">
                        {formData?.proteinGrams ?? formData?.targetProtein ?? 0}g
                      </span>
                    </div>

                    <div className="bg-[#1C2638] border border-gray-800 rounded-xl p-2.5 text-center">
                      <span className="text-[10px] font-bold text-purple-400 uppercase block">Fat</span>
                      <div className="flex items-center justify-center gap-1 my-1">
                        <input
                          type="number"
                          name="fatPct"
                          value={formData?.fatPct ?? 30}
                          onChange={handleChange}
                          className="w-10 bg-transparent text-center font-bold text-white text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[10px] text-gray-400">%</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">
                        {formData?.fatGrams ?? formData?.targetFat ?? 0}g
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 hover:bg-[#121A2A]/40 transition-colors">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowAdditionalNutrients(!showAdditionalNutrients)}
              >
                <div>
                  <span className="text-xs font-semibold text-gray-200 block">
                    Additional Nutrient Goals
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    Advance nutrient goals for water, fiber, sugar, vitamins and minerals.
                  </span>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    showAdditionalNutrients ? 'rotate-90' : ''
                  }`}
                />
              </div>

              {showAdditionalNutrients && (
                <div className="mt-4 pt-4 border-t border-gray-800 divide-y divide-gray-800/50">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Water</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        name="waterGoalMl"
                        value={formData?.waterGoalMl ?? 2500}
                        onChange={handleChange}
                        className={numberInputStyles}
                      />
                      <span className="text-xs text-gray-400">ml</span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Fiber</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        name="fiberGoal"
                        value={formData?.fiberGoal ?? 28}
                        onChange={handleChange}
                        className={numberInputStyles}
                      />
                      <span className="text-xs text-gray-400">g</span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Sugar (Max)</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        name="sugarGoal"
                        value={formData?.sugarGoal ?? 50}
                        onChange={handleChange}
                        className={numberInputStyles}
                      />
                      <span className="text-xs text-gray-400">g</span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Saturated Fat (Max)</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        name="satFatGoal"
                        value={formData?.satFatGoal ?? 22}
                        onChange={handleChange}
                        className={numberInputStyles}
                      />
                      <span className="text-xs text-gray-400">g</span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Cholesterol</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        name="cholesterolGoal"
                        value={formData?.cholesterolGoal ?? 300}
                        onChange={handleChange}
                        className={numberInputStyles}
                      />
                      <span className="text-xs text-gray-400">mg</span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Sodium</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        name="sodiumGoal"
                        value={formData?.sodiumGoal ?? 2300}
                        onChange={handleChange}
                        className={numberInputStyles}
                      />
                      <span className="text-xs text-gray-400">mg</span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Potassium</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        name="potassiumGoal"
                        value={formData?.potassiumGoal ?? 3400}
                        onChange={handleChange}
                        className={numberInputStyles}
                      />
                      <span className="text-xs text-gray-400">mg</span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Vitamin A</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        name="vitaminAGoal"
                        value={formData?.vitaminAGoal ?? 900}
                        onChange={handleChange}
                        className={numberInputStyles}
                      />
                      <span className="text-xs text-gray-400">mcg</span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Vitamin C</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        name="vitaminCGoal"
                        value={formData?.vitaminCGoal ?? 90}
                        onChange={handleChange}
                        className={numberInputStyles}
                      />
                      <span className="text-xs text-gray-400">mg</span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Calcium</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        name="calciumGoal"
                        value={formData?.calciumGoal ?? 1000}
                        onChange={handleChange}
                        className={numberInputStyles}
                      />
                      <span className="text-xs text-gray-400">mg</span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Iron</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        name="ironGoal"
                        value={formData?.ironGoal ?? 8}
                        onChange={handleChange}
                        className={numberInputStyles}
                      />
                      <span className="text-xs text-gray-400">mg</span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Vitamin B12</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        step="0.1"
                        name="vitaminB12Goal"
                        value={formData?.vitaminB12Goal ?? 2.4}
                        onChange={handleChange}
                        className={numberInputStyles}
                      />
                      <span className="text-xs text-gray-400">mcg</span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Vitamin D</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        name="vitaminDGoal"
                        value={formData?.vitaminDGoal ?? 600}
                        onChange={handleChange}
                        className={numberInputStyles}
                      />
                      <span className="text-xs text-gray-400">IU</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SAVE BUTTONS */}
        <div className="flex justify-end pt-2 space-x-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white hover:bg-[#1C2638] text-xs font-bold transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="bg-[#00A86B] hover:bg-[#00945D] text-white font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 text-xs flex items-center space-x-2 shadow-lg shadow-[#00A86B]/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>

      {/* TOAST MOUNT */}
      <Toast
        show={toast.show}
        title={toast.title}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </>
  );
}