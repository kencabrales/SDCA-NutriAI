'use client';

import { useState } from 'react';
import { Plus, Trash2, BookOpen } from 'lucide-react';

export default function CreateRecipeModal({ isOpen, onClose, userId, onRecipeCreated }) {
  const [recipeName, setRecipeName] = useState('');
  const [totalServings, setTotalServings] = useState(1);
  const [ingredients, setIngredients] = useState([]);
  
  // Temporary ingredient inputs state
  const [ingName, setIngName] = useState('');
  const [ingWeight, setIngWeight] = useState('');
  const [ingCal, setIngCal] = useState('');
  const [ingPro, setIngPro] = useState('');
  const [ingCarb, setIngCarb] = useState('');
  const [ingFat, setIngFat] = useState('');

  if (!isOpen) return null;

  const handleAddIngredient = (e) => {
    e.preventDefault();
    if (!ingName || !ingWeight) return;

    const newIngredient = {
      foodName: ingName,
      weightGrams: Number(ingWeight),
      calories: Number(ingCal || 0),
      protein: Number(ingPro || 0),
      carbs: Number(ingCarb || 0),
      fat: Number(ingFat || 0)
    };

    setIngredients([...ingredients, newIngredient]);
    
    // Reset individual item entry form fields
    setIngName('');
    setIngWeight('');
    setIngCal('');
    setIngPro('');
    setIngCarb('');
    setIngFat('');
  };

  const handleRemoveIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSaveRecipeSubmit = async () => {
    if (!recipeName || ingredients.length === 0) return;

    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          recipeName,
          totalServings: Number(totalServings),
          ingredients
        })
      });

      if (res.ok) {
        onRecipeCreated();
        // Reset full modal states on completion success
        setRecipeName('');
        setTotalServings(1);
        setIngredients([]);
        onClose();
      }
    } catch (err) {
      console.error("Failed creating recipe document payload:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#121A2A] border border-gray-800 rounded-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header section */}
        <div className="p-4 border-b border-gray-800/60 bg-[#0B121F] flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-[#00A86B]" />
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-white">Create Custom Batch Recipe</h3>
        </div>

        {/* Workspace panel content wrapper layout */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
          
          {/* Metadata Section */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-gray-400 uppercase font-bold tracking-wider text-[10px]">Recipe / Dish Name</label>
              <input 
                type="text" value={recipeName} onChange={(e) => setRecipeName(e.target.value)}
                className="w-full bg-[#0B121F] border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#00A86B]"
                placeholder="e.g., Lean Chicken Adobo Meal Prep"
              />
            </div>
            <div className="col-span-1 space-y-1">
              <label className="text-gray-400 uppercase font-bold tracking-wider text-[10px]">Total Servings</label>
              <input 
                type="number" min="1" value={totalServings} onChange={(e) => setTotalServings(e.target.value)}
                className="w-full bg-[#0B121F] border border-gray-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#00A86B]"
              />
            </div>
          </div>

          <hr className="border-gray-800/50" />

          {/* Add Ingredient Sub-Form */}
          <div className="bg-[#161F30]/40 border border-gray-800/60 p-3 rounded-xl space-y-3">
            <h4 className="font-bold text-[10px] uppercase text-emerald-400 tracking-widest">Add Raw Ingredient component</h4>
            
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="text" placeholder="Ingredient Name" value={ingName} onChange={(e) => setIngName(e.target.value)}
                className="bg-[#0B121F] border border-gray-800 rounded-lg px-2.5 py-1.5 text-white"
              />
              <input 
                type="number" placeholder="Raw Weight (grams)" value={ingWeight} onChange={(e) => setIngWeight(e.target.value)}
                className="bg-[#0B121F] border border-gray-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-4 gap-2 text-[10px]">
              <input type="number" placeholder="Kcal" value={ingCal} onChange={(e) => setIngCal(e.target.value)} className="bg-[#0B121F] border border-gray-800 rounded-lg p-1.5 text-white font-mono" />
              <input type="number" placeholder="Carb (g)" value={ingCarb} onChange={(e) => setIngCarb(e.target.value)} className="bg-[#0B121F] border border-gray-800 rounded-lg p-1.5 text-white font-mono" />
              <input type="number" placeholder="Prot (g)" value={ingPro} onChange={(e) => setIngPro(e.target.value)} className="bg-[#0B121F] border border-gray-800 rounded-lg p-1.5 text-white font-mono" />
              <input type="number" placeholder="Fat (g)" value={ingFat} onChange={(e) => setIngFat(e.target.value)} className="bg-[#0B121F] border border-gray-800 rounded-lg p-1.5 text-white font-mono" />
            </div>

            <button 
              onClick={handleAddIngredient}
              className="w-full bg-[#1C2638] hover:bg-[#243249] border border-gray-800 text-white font-bold py-1.5 rounded-xl uppercase tracking-wider text-[10px] flex items-center justify-center space-x-1"
            >
              <Plus className="w-3 h-3 text-[#00A86B]" />
              <span>Append Ingredient</span>
            </button>
          </div>

          {/* Render Active Recipe Content Stack List */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Current Recipe Manifest Matrix</h4>
            {ingredients.length === 0 ? (
              <p className="text-gray-600 italic py-2 text-center border border-dashed border-gray-800 rounded-xl">No ingredients loaded yet.</p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#0B121F] border border-gray-800/60 p-2 rounded-xl">
                    <div>
                      <p className="font-bold text-gray-300">{ing.foodName} <span className="text-gray-500 font-mono font-normal">({ing.weightGrams}g)</span></p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">C: {ing.carbs}g • P: {ing.protein}g • F: {ing.fat}g</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-amber-500 font-bold">{ing.calories} kcal</span>
                      <button onClick={() => handleRemoveIngredient(idx)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Submit Triggers Section */}
        <div className="p-4 border-t border-gray-800/60 bg-[#0B121F] flex gap-2">
          <button onClick={onClose} className="flex-1 bg-[#1C2638] border border-gray-800 text-gray-400 hover:text-white py-2 rounded-xl font-bold uppercase tracking-wider transition-colors">Cancel</button>
          <button 
            disabled={ingredients.length === 0 || !recipeName}
            onClick={handleSaveRecipeSubmit}
            className="flex-1 bg-[#00A86B] hover:bg-[#00945D] disabled:opacity-40 text-white py-2 rounded-xl font-bold uppercase tracking-wider transition-colors"
          >
            Save Recipe
          </button>
        </div>

      </div>
    </div>
  );
}