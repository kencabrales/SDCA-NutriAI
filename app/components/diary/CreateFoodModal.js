//components/diary/CreateFoodModal.js
'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, Check, Loader2, ChevronDown } from 'lucide-react';

const MICRO_FIELDS = [
  { label: 'Saturated Fat (g)', name: 'satFat' },
  { label: 'Polyunsaturated Fat (g)', name: 'polyFat' },
  { label: 'Monounsaturated Fat (g)', name: 'monoFat' },
  { label: 'Trans Fat (g)', name: 'transFat' },
  { label: 'Cholesterol (mg)', name: 'cholesterol' },
  { label: 'Sodium (mg)', name: 'sodium' },
  { label: 'Potassium (mg)', name: 'potassium' },
  { label: 'Dietary Fiber (g)', name: 'fiber' },
  { label: 'Sugars (g)', name: 'sugar' },
  { label: 'Vitamin A (%)', name: 'vitaminA' },
  { label: 'Vitamin C (%)', name: 'vitaminC' },
  { label: 'Calcium (%)', name: 'calcium' },
  { label: 'Iron (%)', name: 'iron' },
  { label: 'Vitamin B12 (%)', name: 'vitaminB12' },
  { label: 'Vitamin D (%)', name: 'vitaminD' },
];

const UNITS = ['g', 'ml', 'cup', 'tbsp', 'tsp', 'oz', 'serving', 'pcs', 'slice', 'packet', 'scoop'];

const INITIAL_FORM = {
  brandName: '',
  privacy: 'Public',
  description: '',
  servingAmount: '1',
  servingUnit: 'cup',
  servingsPerContainer: '1',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  satFat: '',
  polyFat: '',
  monoFat: '',
  transFat: '',
  cholesterol: '',
  sodium: '',
  potassium: '',
  fiber: '',
  sugar: '',
  vitaminA: '',
  vitaminC: '',
  calcium: '',
  iron: '',
  vitaminB12: '',
  vitaminD: ''
};

export default function CreateFoodModal({
  isOpen,
  userId,
  onClose,
  onSuccess,
  showToastNotification,
  foodToEdit = null
}) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (foodToEdit && isOpen) {
      let parsedAmount = foodToEdit.amount ? String(foodToEdit.amount) : '1';
      let parsedUnit = foodToEdit.unit || 'cup';

      if (foodToEdit.servingSize && !foodToEdit.amount) {
        const parts = foodToEdit.servingSize.split(' ');
        if (parts.length >= 2) {
          parsedAmount = parts[0];
          parsedUnit = parts.slice(1).join(' ');
        }
      }

      setForm({
        ...INITIAL_FORM,
        brandName: foodToEdit.brandName || '',
        privacy: foodToEdit.privacy || 'Public',
        description: foodToEdit.foodName || foodToEdit.description || foodToEdit.name || '',
        servingAmount: parsedAmount,
        servingUnit: parsedUnit,
        servingsPerContainer: foodToEdit.servingsPerContainer ? String(foodToEdit.servingsPerContainer) : '1',
        calories: foodToEdit.calories !== undefined ? String(foodToEdit.calories) : '',
        protein: foodToEdit.protein !== undefined ? String(foodToEdit.protein) : '',
        carbs: foodToEdit.carbs !== undefined ? String(foodToEdit.carbs) : '',
        fat: foodToEdit.fat !== undefined ? String(foodToEdit.fat) : '',
        satFat: String(foodToEdit.satFatGoal ?? foodToEdit.satFat ?? ''),
        polyFat: String(foodToEdit.polyFatGoal ?? foodToEdit.polyFat ?? ''),
        monoFat: String(foodToEdit.monoFatGoal ?? foodToEdit.monoFat ?? ''),
        transFat: String(foodToEdit.transFatGoal ?? foodToEdit.transFat ?? ''),
        cholesterol: String(foodToEdit.cholesterolGoal ?? foodToEdit.cholesterol ?? ''),
        sodium: String(foodToEdit.sodiumGoal ?? foodToEdit.sodium ?? ''),
        potassium: String(foodToEdit.potassiumGoal ?? foodToEdit.potassium ?? ''),
        fiber: String(foodToEdit.fiberGoal ?? foodToEdit.fiber ?? ''),
        sugar: String(foodToEdit.sugarGoal ?? foodToEdit.sugar ?? ''),
        vitaminA: String(foodToEdit.vitaminAGoal ?? foodToEdit.vitaminA ?? ''),
        vitaminC: String(foodToEdit.vitaminCGoal ?? foodToEdit.vitaminC ?? ''),
        calcium: String(foodToEdit.calciumGoal ?? foodToEdit.calcium ?? ''),
        iron: String(foodToEdit.ironGoal ?? foodToEdit.iron ?? ''),
        vitaminB12: String(foodToEdit.vitaminB12Goal ?? foodToEdit.vitaminB12 ?? ''),
        vitaminD: String(foodToEdit.vitaminDGoal ?? foodToEdit.vitaminD ?? '')
      });
    } else if (!isOpen) {
      setForm(INITIAL_FORM);
      setStep(1);
    }
  }, [foodToEdit, isOpen]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleClose = useCallback(() => {
    setStep(1);
    setForm(INITIAL_FORM);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.servingAmount.trim()) {
      showToastNotification?.('Required Field', 'Please fill in description and serving size.', 'error');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.calories === '' || form.protein === '' || form.carbs === '' || form.fat === '') {
      showToastNotification?.('Missing Macros', 'Calories, Protein, Carbs, and Fat are required.', 'error');
      return;
    }

    setIsSubmitting(true);
    const parseNum = (val) => (val !== '' && !isNaN(val) ? Number(val) : null);

    const payload = {
      ...(foodToEdit?._id ? { id: foodToEdit._id } : {}),
      userId,
      brandName: form.brandName.trim() || null,
      privacy: form.privacy,
      foodName: form.description.trim(),
      servingSize: `${form.servingAmount.trim()} ${form.servingUnit}`,
      amount: Number(form.servingAmount) || 1,
      unit: form.servingUnit,
      servingsPerContainer: parseNum(form.servingsPerContainer) || 1,
      calories: Number(form.calories),
      protein: Number(form.protein),
      carbs: Number(form.carbs),
      fat: Number(form.fat),
      satFatGoal: parseNum(form.satFat),
      polyFatGoal: parseNum(form.polyFat),
      monoFatGoal: parseNum(form.monoFat),
      transFatGoal: parseNum(form.transFat),
      cholesterolGoal: parseNum(form.cholesterol),
      sodiumGoal: parseNum(form.sodium),
      potassiumGoal: parseNum(form.potassium),
      fiberGoal: parseNum(form.fiber),
      sugarGoal: parseNum(form.sugar),
      vitaminAGoal: parseNum(form.vitaminA),
      vitaminCGoal: parseNum(form.vitaminC),
      calciumGoal: parseNum(form.calcium),
      ironGoal: parseNum(form.iron),
      vitaminB12Goal: parseNum(form.vitaminB12),
      vitaminDGoal: parseNum(form.vitaminD)
    };

    try {
      const res = await fetch('/api/custom-food', {
        method: foodToEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToastNotification?.(
          foodToEdit ? 'Food Updated' : 'Food Created',
          `Successfully ${foodToEdit ? 'updated' : 'added'} "${payload.foodName}" to database.`,
          'success'
        );
        onSuccess?.(data.food || payload);
        handleClose();
      } else {
        showToastNotification?.('Error', data.message || 'Failed to save custom food.', 'error');
      }
    } catch (err) {
      console.error('Error saving custom food:', err);
      showToastNotification?.('Error', 'Network error while saving custom food.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
      <div className="w-full max-w-md bg-[#121A2A] border border-gray-800 rounded-3xl shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-[#121A2A] sticky top-0 z-20">
          <button onClick={step === 2 ? () => setStep(1) : handleClose} className="p-1 text-gray-400 hover:text-white" type="button">
            {step === 2 ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
          <h3 className="text-base font-bold text-white tracking-wide">
            {foodToEdit ? 'Edit Custom Food' : 'Create Food'}
          </h3>
          {step === 1 ? (
            <button onClick={handleNextStep} className="p-1 text-cyan-400 hover:text-cyan-300 font-bold" type="button">
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isSubmitting} className="p-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-50" type="button">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 divide-y divide-gray-800/60 font-sans [overflow-anchor:none]">
          {step === 1 ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="block text-sm font-semibold text-white">Brand Name</label>
                  <span className="text-[10px] text-gray-500">Optional</span>
                </div>
                <input
                  type="text"
                  name="brandName"
                  placeholder="ex. Campbell's"
                  value={form.brandName}
                  onChange={handleChange}
                  className="bg-transparent text-right text-sm text-cyan-400 placeholder-gray-600 focus:outline-none w-1/2"
                />
              </div>
              <div className="flex items-center justify-between py-2">
  <label className="block text-sm font-semibold text-white">Share with</label>
  <select
    name="privacy"
    value={form.privacy}
    onChange={handleChange}
    className="bg-[#1C2638] border border-gray-700/80 rounded-xl px-3 py-1.5 text-xs font-bold text-cyan-400 focus:outline-none cursor-pointer"
  >
    <option value="Public" className="bg-[#161F30] text-white">Public</option>
    <option value="Private" className="bg-[#161F30] text-white">Private</option>
  </select>
</div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="block text-sm font-semibold text-white">Description</label>
                  <span className="text-[10px] text-cyan-400">Required</span>
                </div>
                <input
                  type="text"
                  name="description"
                  placeholder="ex. Chicken Soup"
                  value={form.description}
                  onChange={handleChange}
                  className="bg-transparent text-right text-sm text-cyan-400 placeholder-gray-600 focus:outline-none w-1/2"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="block text-sm font-semibold text-white">Serving Size</label>
                  <span className="text-[10px] text-cyan-400">Required</span>
                </div>
                <div className="flex items-center gap-2 w-1/2 justify-end">
                  <input
                    type="number"
                    name="servingAmount"
                    placeholder="1"
                    value={form.servingAmount}
                    onChange={handleChange}
                    className="w-16 bg-transparent text-right text-sm font-bold text-cyan-400 placeholder-gray-600 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                      className="flex items-center gap-1 bg-[#161F30] border border-gray-700/80 px-2.5 py-1 rounded-xl text-xs font-bold text-cyan-400"
                    >
                      <span>{form.servingUnit}</span>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>

                    {isUnitDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsUnitDropdownOpen(false)} />
                        <div className="absolute right-0 mt-1 w-28 bg-[#161F30] border border-gray-700 rounded-xl shadow-xl overflow-hidden z-40 max-h-40 overflow-y-auto">
                          {UNITS.map((unit) => (
                            <button
                              key={unit}
                              type="button"
                              onClick={() => {
                                setForm((prev) => ({ ...prev, servingUnit: unit }));
                                setIsUnitDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold ${
                                form.servingUnit === unit ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-300 hover:bg-[#1C2638]'
                              }`}
                            >
                              {unit}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="block text-sm font-semibold text-white">Servings per container</label>
                  <span className="text-[10px] text-cyan-400">Required</span>
                </div>
                <input
                  type="number"
                  name="servingsPerContainer"
                  placeholder="1"
                  value={form.servingsPerContainer}
                  onChange={handleChange}
                  className="bg-transparent text-right text-sm text-cyan-400 placeholder-gray-600 focus:outline-none w-1/4 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider py-1">Nutrition Facts</p>

              <div className="space-y-3 pb-3 border-b border-gray-800">
                {[
                  { label: 'Calories', name: 'calories', unit: 'kcal', color: 'text-cyan-400' },
                  { label: 'Protein', name: 'protein', unit: 'g', color: 'text-emerald-400' },
                  { label: 'Total Carbs', name: 'carbs', unit: 'g', color: 'text-cyan-400' },
                  { label: 'Total Fat', name: 'fat', unit: 'g', color: 'text-purple-400' },
                ].map((macro) => (
                  <div key={macro.name} className="flex items-center justify-between py-1">
                    <span className="text-sm font-bold text-white">{macro.label}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        name={macro.name}
                        placeholder="Required"
                        value={form[macro.name]}
                        onChange={handleChange}
                        className={`bg-transparent text-right text-sm font-bold ${macro.color} placeholder-gray-600 focus:outline-none w-28 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      />
                      <span className="text-xs text-gray-500 font-semibold">{macro.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-2">Detailed Micronutrients (Optional)</p>

              {MICRO_FIELDS.map((item) => (
                <div key={item.name} className="flex items-center justify-between py-1.5">
                  <span className="text-xs font-medium text-gray-300">{item.label}</span>
                  <input
                    type="number"
                    name={item.name}
                    placeholder="Optional"
                    value={form[item.name]}
                    onChange={handleChange}
                    className="bg-transparent text-right text-xs text-gray-400 placeholder-gray-600 focus:outline-none w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#121A2A]">
          {step === 1 ? (
            <button
              onClick={handleNextStep}
              className="w-full py-3 bg-[#00A86B] hover:bg-[#00945D] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all active:scale-[0.98]"
            >
              Next: Nutrition Facts
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3 bg-[#00A86B] hover:bg-[#00945D] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Food...</span>
                </>
              ) : (
                <span>{foodToEdit ? 'Update Custom Food' : 'Save Custom Food'}</span>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}