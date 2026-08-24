//components/diary/CreateRecipeModal.js

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft, ArrowRight, Trash2, ChefHat } from 'lucide-react';
import FoodDetailModal from './FoodDetailModal';

export default function CreateRecipeModal({
  isOpen,
  onClose,
  onSave,
  onSaveAndLog,
  onOpenFoodLog,
  ingredients = [],
  setIngredients,
  showToastNotification,
  userId,
  existingRecipe = null,
  onDeleteRecipe
}) {
  const [step, setStep] = useState('info'); // 'info' | 'ingredients' | 'save'
  const [recipeName, setRecipeName] = useState('');
  const [servings, setServings] = useState(1);
  const [privacy, setPrivacy] = useState('Public');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingIngredient, setEditingIngredient] = useState(null);
  const [isEditIngredientOpen, setIsEditIngredientOpen] = useState(false);

  const isEditingRecipe = !!existingRecipe?._id;
  const prevExistingRecipeId = useRef(null);

  useEffect(() => {
    const currentId = existingRecipe?._id || null;
    if (currentId !== prevExistingRecipeId.current) {
      prevExistingRecipeId.current = currentId;
      if (existingRecipe) {
        setRecipeName(existingRecipe.name || '');
        setServings(existingRecipe.servings || 1);
        setPrivacy(existingRecipe.privacy || 'Public');
        setIngredients(existingRecipe.ingredients || []);
        setStep('ingredients');
      } else {
        setRecipeName('');
        setServings(1);
        setPrivacy('Public');
        setStep('info');
      }
    }
  }, [existingRecipe]);

  if (!isOpen) return null;

  const safeServings = Number(servings) > 0 ? Number(servings) : 1;

  const sum = (field) => ingredients.reduce((acc, i) => acc + (Number(i[field]) || 0), 0);
  const totalCalories = sum('calories');
  const totalCarbs = sum('carbs');
  const totalFat = sum('fat');
  const totalProtein = sum('protein');
  const totalSodium = sum('sodium');
  const totalSugar = sum('sugar');
  const totalFiber = sum('fiber');
  const totalCholesterol = sum('cholesterol');
  const totalPotassium = sum('potassium');
  const totalSatFat = sum('satFat');
  const totalPolyFat = sum('polyFat');
  const totalMonoFat = sum('monoFat');
  const totalTransFat = sum('transFat');
  const totalVitaminA = sum('vitaminA');
  const totalVitaminC = sum('vitaminC');
  const totalCalcium = sum('calcium');
  const totalIron = sum('iron');
  const totalVitaminB12 = sum('vitaminB12');
  const totalVitaminD = sum('vitaminD');

  const perServing = (total) => Math.round((total / safeServings) * 10) / 10;
  const perServingCalories = Math.round(totalCalories / safeServings);
  const perServingCarbs = perServing(totalCarbs);
  const perServingFat = perServing(totalFat);
  const perServingProtein = perServing(totalProtein);

  const handleRemoveIngredient = (id) => {
    setIngredients((prev) => prev.filter((item) => item.id !== id && item._id !== id));
  };

  const handleUpdateIngredient = (itemId, payload) => {
    setIngredients((prev) => prev.map((item) => {
      const matches = (item.id && item.id === itemId) || (item._id && item._id === itemId);
      return matches ? { ...item, ...payload, id: item.id || item._id } : item;
    }));
    setIsEditIngredientOpen(false);
    setEditingIngredient(null);
    showToastNotification?.('Ingredient Updated', `Updated ${payload.foodName} in recipe.`, 'success');
  };

  const buildRecipePayload = () => ({
    userId,
    name: recipeName,
    servings: safeServings,
    privacy,
    ingredients,
  });

  const handleDeleteClick = async () => {
    if (!existingRecipe || !onDeleteRecipe || isSubmitting) return;
    const wasDeleted = await onDeleteRecipe(existingRecipe);
    if (wasDeleted) onClose();
  };

  const saveRecipe = async () => {
    const url = isEditingRecipe ? `/api/recipes?id=${existingRecipe._id}` : '/api/recipes';
    const method = isEditingRecipe ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRecipePayload()),
    });

    const savedData = await res.json();
    if (!res.ok) throw new Error(savedData.error || 'Failed to save recipe');
    return savedData;
  };

  const handleSaveRecipe = async () => {
    if (!recipeName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const savedData = await saveRecipe();
      if (onSave) onSave(savedData);
      onClose();
    } catch (err) {
      console.error('Error saving recipe:', err);
      showToastNotification?.('Error', err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndLog = async () => {
    if (!recipeName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const savedData = await saveRecipe();
      if (onSaveAndLog) onSaveAndLog(savedData.recipe);
      onClose();
    } catch (err) {
      console.error('Error saving recipe:', err);
      showToastNotification?.('Error', err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyles = "w-full bg-[#1C2638] border border-gray-800 rounded-xl px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-cyan-500";

  const bottomBar = (
    <div className="px-5 py-3 border-t border-gray-800/60 bg-[#161F30]/40 text-center">
      <span className="text-xs font-bold text-cyan-400">
        {perServingCalories} calories per serving
      </span>
      <span className="text-xs text-gray-500"> · {safeServings} serving{safeServings > 1 ? 's' : ''}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 font-sans">
      <div className="w-full max-w-md h-[85vh] bg-[#121A2A] border border-gray-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60">
          {step === 'info' ? (
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-all">
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setStep(step === 'save' ? 'ingredients' : 'info')}
              className="p-1 text-gray-400 hover:text-white transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <h2 className="text-sm font-black text-white tracking-wide">
            {step === 'info' && (isEditingRecipe ? 'Edit Recipe' : 'Add Recipe')}
            {step === 'ingredients' && 'Ingredients'}
            {step === 'save' && 'Save Recipe'}
          </h2>

          {step === 'info' && (
            <button
              onClick={() => {
                if (!recipeName.trim()) {
                  showToastNotification?.('Name required', 'Give your recipe a title first.', 'error');
                  return;
                }
                setStep('ingredients');
              }}
              className="p-1 text-cyan-400 hover:text-cyan-300 transition-all"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          {step === 'ingredients' && isEditingRecipe && (
            <button
              onClick={handleDeleteClick}
              className="p-1 text-gray-400 hover:text-red-400 transition-all"
              title="Delete Recipe"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {step === 'ingredients' && !isEditingRecipe && <div className="w-6" />}
          {step === 'save' && <div className="w-6" />}
        </div>

        {/* STEP: Recipe Info */}
        {step === 'info' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Title</label>
              <input
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="Recipe name"
                className={inputStyles}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Servings</label>
              <input
                type="number"
                min="1"
                step="1"
                value={servings}
                onChange={(e) => setServings(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                className={inputStyles}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Share with</label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="bg-[#1C2638] border border-gray-800 rounded-lg px-3 py-1.5 text-xs font-bold text-cyan-400 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="Public" className="bg-[#161F30] text-white">Public</option>
                <option value="Private" className="bg-[#161F30] text-white">Private</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP: Ingredients */}
        {step === 'ingredients' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {ingredients.length === 0 ? (
                <p className="text-xs text-gray-500 font-mono text-center py-10">No ingredients yet.</p>
              ) : (
                ingredients.map((item) => (
                  <div
                    key={item.id || item._id}
                    onClick={() => {
                      setEditingIngredient(item);
                      setIsEditIngredientOpen(true);
                    }}
                    className="w-full flex items-center justify-between bg-[#161F30] border border-gray-800 hover:border-gray-700 p-3 rounded-2xl transition-all cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <h5 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors truncate">
                        {item.foodName || item.name}
                      </h5>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                        {item.amount}{item.unit} • <span className="text-emerald-400 font-bold">{item.calories} kcal</span>
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveIngredient(item.id || item._id);
                      }}
                      className="w-8 h-8 rounded-full bg-[#1C2638] hover:bg-red-500/20 text-gray-400 hover:text-red-400 flex items-center justify-center transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}

              <button
                onClick={onOpenFoodLog}
                className="w-full p-3.5 bg-[#161F30] border border-dashed border-gray-700 hover:border-cyan-500 rounded-2xl text-cyan-400 font-bold text-xs transition-all mt-2"
              >
                + Add Ingredient
              </button>
            </div>

            <div className="p-3 border-t border-gray-800/60">
              <button
                onClick={() => {
                  if (ingredients.length === 0) {
                    showToastNotification?.('No ingredients', 'Add at least one ingredient first.', 'error');
                    return;
                  }
                  setStep('save');
                }}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs uppercase tracking-wider font-bold py-3 rounded-xl transition-all"
              >
                Done Editing
              </button>
            </div>
            {bottomBar}
          </>
        )}

        {/* STEP: Save Recipe */}
        {step === 'save' && (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 flex-shrink-0 flex flex-col items-center justify-center bg-[#161F30]">
                  <ChefHat className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">{recipeName}</h3>
                  <p className="text-xs text-gray-500">{safeServings} serving{safeServings > 1 ? 's' : ''}</p>
                </div>
              </div>

              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pt-2">Nutrition Facts (per 1 Serving)</p>
              <div className="bg-[#161F30] border border-gray-800/60 rounded-xl text-[11px] font-mono text-gray-300 divide-y divide-gray-800/50 overflow-hidden">
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Calories</span><span className="font-bold text-emerald-400">{perServingCalories}</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Carbs</span><span className="font-semibold text-cyan-400">{perServingCarbs} g</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Fat</span><span className="font-semibold text-purple-400">{perServingFat} g</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Protein</span><span className="font-semibold text-amber-400">{perServingProtein} g</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Saturated Fat</span><span className="font-semibold">{perServing(totalSatFat)} g</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Trans Fat</span><span className="font-semibold">{perServing(totalTransFat)} g</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Cholesterol</span><span className="font-semibold">{perServing(totalCholesterol)} mg</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Sodium</span><span className="font-semibold">{perServing(totalSodium)} mg</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Potassium</span><span className="font-semibold">{perServing(totalPotassium)} mg</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Dietary Fiber</span><span className="font-semibold">{perServing(totalFiber)} g</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Sugars</span><span className="font-semibold">{perServing(totalSugar)} g</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Vitamin A</span><span className="font-semibold">{perServing(totalVitaminA)} mcg</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Vitamin C</span><span className="font-semibold">{perServing(totalVitaminC)} mg</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Calcium</span><span className="font-semibold">{perServing(totalCalcium)} mg</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Iron</span><span className="font-semibold">{perServing(totalIron)} mg</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Vitamin B12</span><span className="font-semibold">{perServing(totalVitaminB12)} mcg</span></div>
                <div className="flex justify-between px-3.5 py-2"><span className="text-gray-400">Vitamin D</span><span className="font-semibold">{perServing(totalVitaminD)} mcg</span></div>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                * Values are calculated automatically from your ingredients, divided by number of servings.
              </p>
            </div>

            <div className="p-3 bg-[#161F30]/40 border-t border-gray-800/60 flex gap-2">
              <button
                onClick={handleSaveRecipe}
                disabled={isSubmitting}
                className="flex-1 bg-[#1C2638] hover:bg-[#232F45] border border-gray-700 disabled:opacity-40 text-white text-xs uppercase tracking-wider font-bold py-3 rounded-xl transition-all"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleSaveAndLog}
                disabled={isSubmitting}
                className="flex-1 bg-[#00A86B] hover:bg-[#00945D] disabled:opacity-40 text-white text-xs uppercase tracking-wider font-bold py-3 rounded-xl transition-all shadow-md shadow-[#00A86B]/10"
              >
                {isSubmitting ? 'Saving...' : 'Save & Log'}
              </button>
            </div>
          </>
        )}
      </div>

      <FoodDetailModal
        isOpen={isEditIngredientOpen}
        foodName={editingIngredient?.foodName || editingIngredient?.name}
        mealType={null}
        initialData={editingIngredient}
        showToastNotification={showToastNotification}
        onClose={() => {
          setIsEditIngredientOpen(false);
          setEditingIngredient(null);
        }}
        onConfirmLog={() => {}}
        onUpdateLog={handleUpdateIngredient}
      />
    </div>
  );
}