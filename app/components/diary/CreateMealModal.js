// components/diary/CreateMealModal.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2,
  GripVertical,
  Edit2,
  Check
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import FoodDetailModal from './FoodDetailModal';

export default function CreateMealModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onOpenFoodLog, 
  mealItems = [], 
  setMealItems,
  showToastNotification,
  userId,
  existingMeal = null,
  onDeleteMeal
}) {
  const [mealName, setMealName] = useState('');
  const [privacy, setPrivacy] = useState('Public');
  const [showNutritionFacts, setShowNutritionFacts] = useState(false);
  const [directions, setDirections] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newDirection, setNewDirection] = useState('');
  const [showDirectionInput, setShowDirectionInput] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');

  const [editingMealItem, setEditingMealItem] = useState(null);
  const [isEditItemDetailOpen, setIsEditItemDetailOpen] = useState(false);

  const isEditingMeal = !!existingMeal?._id;

  const prevExistingMealId = useRef(null);

useEffect(() => {
  const currentId = existingMeal?._id || null;
  if (currentId !== prevExistingMealId.current) {
    prevExistingMealId.current = currentId;
    if (existingMeal) {
      setMealName(existingMeal.name || '');
      setPrivacy(existingMeal.privacy || 'Public');
      setDirections(existingMeal.directions || []);
      setPhotoPreview(existingMeal.photoUrl || null);
      setMealItems(existingMeal.items || []);
    } else {
      setMealName('');
      setPrivacy('Public');
      setDirections([]);
      setPhotoPreview(null);
    }
  }
}, [existingMeal]);

  if (!isOpen) return null;

  const totalCalories = mealItems.reduce((acc, item) => acc + (Number(item.calories) || 0), 0);
  const totalCarbs = mealItems.reduce((acc, item) => acc + (Number(item.carbs) || 0), 0);
  const totalFat = mealItems.reduce((acc, item) => acc + (Number(item.fat) || 0), 0);
  const totalProtein = mealItems.reduce((acc, item) => acc + (Number(item.protein) || 0), 0);

  const totalSodium = mealItems.reduce((acc, item) => acc + (Number(item.sodium) || 0), 0);
  const totalSugar = mealItems.reduce((acc, item) => acc + (Number(item.sugar) || 0), 0);
  const totalFiber = mealItems.reduce((acc, item) => acc + (Number(item.fiber) || 0), 0);
  const totalCholesterol = mealItems.reduce((acc, item) => acc + (Number(item.cholesterol) || 0), 0);
  const totalPotassium = mealItems.reduce((acc, item) => acc + (Number(item.potassium) || 0), 0);
  const totalSatFat = mealItems.reduce((acc, item) => acc + (Number(item.satFat) || 0), 0);
  const totalPolyFat = mealItems.reduce((acc, item) => acc + (Number(item.polyFat) || 0), 0);
  const totalMonoFat = mealItems.reduce((acc, item) => acc + (Number(item.monoFat) || 0), 0);
  const totalTransFat = mealItems.reduce((acc, item) => acc + (Number(item.transFat) || 0), 0);
  const totalVitaminA = mealItems.reduce((acc, item) => acc + (Number(item.vitaminA) || 0), 0);
  const totalVitaminC = mealItems.reduce((acc, item) => acc + (Number(item.vitaminC) || 0), 0);
  const totalCalcium = mealItems.reduce((acc, item) => acc + (Number(item.calcium) || 0), 0);
  const totalIron = mealItems.reduce((acc, item) => acc + (Number(item.iron) || 0), 0);
  const totalVitaminB12 = mealItems.reduce((acc, item) => acc + (Number(item.vitaminB12) || 0), 0);
  const totalVitaminD = mealItems.reduce((acc, item) => acc + (Number(item.vitaminD) || 0), 0);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemoveMealItem = (id) => {
    setMealItems((prev) => prev.filter((item) => item.id !== id && item._id !== id));
  };

  const handleUpdateMealItem = (itemId, payload) => {
    setMealItems((prev) => prev.map((item) => {
      const matches = (item.id && item.id === itemId) || (item._id && item._id === itemId);
      return matches ? { ...item, ...payload, id: item.id || item._id } : item;
    }));
    setIsEditItemDetailOpen(false);
    setEditingMealItem(null);
    showToastNotification?.('Item Updated', `Updated ${payload.foodName} in meal draft.`, 'success');
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(directions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setDirections(items);
  };

  const handleAddDirection = () => {
    if (!newDirection.trim()) return;
    setDirections((prev) => [...prev, newDirection.trim()]);
    setNewDirection('');
    setShowDirectionInput(false);
  };

  const handleSaveEditDirection = (index) => {
    if (!editText.trim()) return;
    const updated = [...directions];
    updated[index] = editText.trim();
    setDirections(updated);
    setEditingIndex(null);
  };

  const handleRemoveDirection = (indexToRemove) => {
    setDirections((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleDeleteClick = async () => {
  if (!existingMeal || !onDeleteMeal || isSubmitting) return;
  const wasDeleted = await onDeleteMeal(existingMeal);
  if (wasDeleted) {
    onClose();
  }
};

  const handleSaveMeal = async () => {
    if (!mealName.trim() || isSubmitting) return;
    setIsSubmitting(true);

    const mealPayload = {
      userId,
      name: mealName,
      privacy,
      photoUrl: photoPreview,
      items: mealItems,
      directions,
    };

    console.log('mealPayload being sent:', mealPayload);

    const url = isEditingMeal ? `/api/meals?id=${existingMeal._id}` : '/api/meals';
    const method = isEditingMeal ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mealPayload),
      });

      const savedData = await res.json();
      if (!res.ok) throw new Error(savedData.error || 'Failed to save meal');

      if (onSave) onSave(savedData);
      onClose();
    } catch (err) {
      console.error('Error saving meal:', err);
      showToastNotification?.('Error', err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 font-sans">
      <div className="w-full max-w-md bg-[#121A2A] border border-gray-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[88vh] relative">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60 relative z-20">
  <div className="flex items-center gap-1">
    <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-all">
      <X className="w-5 h-5" />
    </button>
    {isEditingMeal && (
      <button 
        onClick={handleDeleteClick}
        className="p-1 text-gray-400 hover:text-red-400 transition-all"
        title="Delete Meal"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    )}
  </div>
  <h2 className="text-sm font-black text-white capitalize tracking-wide">
    {isEditingMeal ? 'Edit Meal' : 'Create Meal'}
  </h2>
  <button 
    onClick={handleSaveMeal}
    disabled={!mealName.trim() || isSubmitting}
    className="text-xs font-bold text-cyan-400 disabled:opacity-40 hover:text-cyan-300 transition-colors"
  >
    {isSubmitting ? 'Saving...' : (isEditingMeal ? 'Update' : 'Save')}
  </button>
</div>

        <div className="flex-1 overflow-y-auto space-y-4 p-4 pb-6">

          <div className="bg-[#161F30] border border-gray-800/80 rounded-2xl py-6 flex flex-col items-center justify-center relative">
            <label className="cursor-pointer group flex flex-col items-center gap-2">
              {photoPreview ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-cyan-500 shadow-lg">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-[#121A2A] border border-gray-700/80 flex items-center justify-center text-gray-400 group-hover:border-cyan-500 group-hover:text-cyan-400 transition-all shadow-inner">
                  <Camera className="w-6 h-6" />
                </div>
              )}
              <span className="text-xs font-semibold text-gray-400 group-hover:text-white transition-colors">
                {photoPreview ? 'Change Photo' : 'Add Photo'}
              </span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          <div className="bg-[#161F30] border border-gray-800/80 rounded-2xl divide-y divide-gray-800/60 overflow-hidden">
            <div className="px-4 py-3">
              <input 
                type="text"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                placeholder="Name Your Meal"
                className="w-full bg-transparent text-xs font-semibold text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">Share with</span>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="bg-transparent text-xs font-bold text-cyan-400 focus:outline-none cursor-pointer"
              >
                <option value="Public" className="bg-[#161F30] text-white">Public</option>
                <option value="Private" className="bg-[#161F30] text-white">Private</option>
              </select>
            </div>
          </div>

                    <div className="bg-[#161F30] border border-gray-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" stroke="#1C2638" strokeWidth="7" fill="transparent" />
                  {totalCalories > 0 && (
                    <>
                      {(() => {
                        const circumference = 2 * Math.PI * 34;
                        const carbCal = totalCarbs * 4;
                        const fatCal = totalFat * 9;
                        const proteinCal = totalProtein * 4;
                        const totalMacroCal = carbCal + fatCal + proteinCal || 1;
                        const carbDash = (carbCal / totalMacroCal) * circumference;
                        const fatDash = (fatCal / totalMacroCal) * circumference;
                        const proteinDash = (proteinCal / totalMacroCal) * circumference;
                        return (
                          <>
                            {carbDash > 0 && (
                              <circle cx="40" cy="40" r="34" stroke="#22d3ee" strokeWidth="7" fill="transparent"
                                strokeDasharray={`${carbDash} ${circumference - carbDash}`}
                                strokeLinecap="round" />
                            )}
                            {fatDash > 0 && (
                              <circle cx="40" cy="40" r="34" stroke="#c084fc" strokeWidth="7" fill="transparent"
                                strokeDasharray={`${fatDash} ${circumference - fatDash}`}
                                strokeDashoffset={-carbDash}
                                strokeLinecap="round" />
                            )}
                            {proteinDash > 0 && (
                              <circle cx="40" cy="40" r="34" stroke="#fbbf24" strokeWidth="7" fill="transparent"
                                strokeDasharray={`${proteinDash} ${circumference - proteinDash}`}
                                strokeDashoffset={-(carbDash + fatDash)}
                                strokeLinecap="round" />
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-white leading-none">{totalCalories}</span>
                  <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">cal</span>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-3 gap-2">
                <div className="bg-[#121A2A] border border-gray-800/60 rounded-xl py-2.5 text-center">
                  <div className="text-sm font-black font-mono text-cyan-400">{totalCarbs}g</div>
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Carbs</div>
                </div>
                <div className="bg-[#121A2A] border border-gray-800/60 rounded-xl py-2.5 text-center">
                  <div className="text-sm font-black font-mono text-purple-400">{totalFat}g</div>
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Fat</div>
                </div>
                <div className="bg-[#121A2A] border border-gray-800/60 rounded-xl py-2.5 text-center">
                  <div className="text-sm font-black font-mono text-amber-400">{totalProtein}g</div>
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Protein</div>
                </div>
              </div>
            </div>

            <div className="pt-1 border-t border-gray-800/60">
              <button
                onClick={() => setShowNutritionFacts(!showNutritionFacts)}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-white transition-colors py-2"
              >
                <span>{showNutritionFacts ? 'Hide Nutrition Facts' : 'Show Nutrition Facts'}</span>
                {showNutritionFacts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showNutritionFacts && (
                <div className="mt-1 p-3.5 bg-[#121A2A] rounded-xl text-[11px] font-mono text-gray-300 border border-gray-800/60 divide-y divide-gray-800/50">
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Saturated Fat</span><span className="font-semibold">{totalSatFat.toFixed(1)} g</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Polyunsaturated Fat</span><span className="font-semibold">{totalPolyFat.toFixed(1)} g</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Monounsaturated Fat</span><span className="font-semibold">{totalMonoFat.toFixed(1)} g</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Trans Fat</span><span className="font-semibold">{totalTransFat.toFixed(1)} g</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Cholesterol</span><span className="font-semibold">{Math.round(totalCholesterol)} mg</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Sodium</span><span className="font-semibold">{Math.round(totalSodium)} mg</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Potassium</span><span className="font-semibold">{Math.round(totalPotassium)} mg</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Dietary Fiber</span><span className="font-semibold">{totalFiber.toFixed(1)} g</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Sugars</span><span className="font-semibold">{totalSugar.toFixed(1)} g</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Vitamin A</span><span className="font-semibold">{totalVitaminA.toFixed(1)} mcg</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Vitamin C</span><span className="font-semibold">{totalVitaminC.toFixed(1)} mg</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Calcium</span><span className="font-semibold">{Math.round(totalCalcium)} mg</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Iron</span><span className="font-semibold">{totalIron.toFixed(1)} mg</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Vitamin B12</span><span className="font-semibold">{totalVitaminB12.toFixed(1)} mcg</span></div>
                  <div className="flex justify-between py-1.5"><span className="text-gray-400">Vitamin D</span><span className="font-semibold">{totalVitaminD.toFixed(1)} mcg</span></div>
                </div>
              )}
            </div>
          </div>

                    <div className="bg-[#161F30] border border-gray-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Meal Items</h3>
              <button 
                onClick={onOpenFoodLog}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Food</span>
              </button>
            </div>

            {mealItems.length > 0 ? (
              <div className="space-y-2">
                {mealItems.map((item) => (
                  <div 
                    key={item.id || item._id} 
                    onClick={() => {
                      setEditingMealItem(item);
                      setIsEditItemDetailOpen(true);
                    }}
                    className="w-full flex items-center justify-between bg-[#121A2A] border border-gray-800 hover:border-gray-700 p-3 rounded-2xl transition-all cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <h5 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors truncate">
                        {item.foodName || item.name}
                      </h5>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                        {item.amount}{item.unit} • <span className="text-emerald-400 font-bold">{item.calories} kcal</span> • <span className="text-cyan-400 font-bold">C:</span>{item.carbs}g <span className="text-purple-400 font-bold">F:</span>{item.fat}g <span className="text-amber-400 font-bold">P:</span>{item.protein}g
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMealItem(item.id || item._id);
                      }}
                      className="w-8 h-8 rounded-full bg-[#1C2638] hover:bg-red-500/20 text-gray-400 hover:text-red-400 flex items-center justify-center transition-colors flex-shrink-0"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 font-mono">No items added to this meal yet.</p>
            )}
          </div>

          <div className="bg-[#161F30] border border-gray-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Directions</h3>
              <button 
                onClick={() => setShowDirectionInput(!showDirectionInput)}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Step</span>
              </button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="directions-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {directions.map((step, idx) => (
                      <Draggable key={`step-${idx}`} draggableId={`step-${idx}`} index={idx}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-[#121A2A] p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-shadow ${
                              snapshot.isDragging ? 'border-cyan-500 shadow-lg' : 'border-gray-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div {...provided.dragHandleProps} className="text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-cyan-400 font-mono text-xs">{idx + 1}.</span>

                              {editingIndex === idx ? (
                                <input 
                                  type="text"
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="flex-1 bg-[#161F30] border border-cyan-500/50 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                                  autoFocus
                                />
                              ) : (
                                <span className="text-xs text-gray-300 truncate">{step}</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {editingIndex === idx ? (
                                <button onClick={() => handleSaveEditDirection(idx)} className="p-1 text-emerald-400 hover:text-emerald-300">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button 
                                  onClick={() => { setEditingIndex(idx); setEditText(step); }} 
                                  className="p-1 text-gray-500 hover:text-cyan-400"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => handleRemoveDirection(idx)} className="p-1 text-gray-500 hover:text-red-400">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {showDirectionInput && (
              <div className="space-y-2 pt-2">
                <textarea 
                  rows={2}
                  placeholder="Enter step direction..."
                  value={newDirection}
                  onChange={(e) => setNewDirection(e.target.value)}
                  className="w-full bg-[#121A2A] border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowDirectionInput(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">
                    Cancel
                  </button>
                  <button onClick={handleAddDirection} className="px-3 py-1.5 text-xs font-bold bg-cyan-600 rounded-lg text-white hover:bg-cyan-500">
                    Save Step
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      <FoodDetailModal
        isOpen={isEditItemDetailOpen}
        foodName={editingMealItem?.foodName || editingMealItem?.name}
        mealType={null}
        initialData={editingMealItem}
        showToastNotification={showToastNotification}
        onClose={() => {
          setIsEditItemDetailOpen(false);
          setEditingMealItem(null);
        }}
        onConfirmLog={() => {}}
        onUpdateLog={handleUpdateMealItem}
      />
    </div>
  );
}