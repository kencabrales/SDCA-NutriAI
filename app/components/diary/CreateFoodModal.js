// app/components/diary/CreateFoodModal.js
'use client';
import { useState } from 'react';
import { X, Sparkles, Loader2, PlusCircle, Layers } from 'lucide-react';

export default function CreateFoodModal({ isOpen, onClose, userId, onFoodCreated }) {
  const [mode, setMode] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [variations, setVariations] = useState([]); // Array state for AI variants
  const [form, setForm] = useState({ foodName: '', brand: 'Generic', calories: '', carbs: '', protein: '', fat: '' });

  if (!isOpen) return null;

  const handleAiAssist = async () => {
    if (!form.foodName.trim()) return;
    setLoading(true);
    setVariations([]); // Reset options wrapper
    
    try {
      const res = await fetch('/api/custom-food/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName: form.foodName, brand: form.brand, mode })
      });
      const result = await res.json();
      
      if (result.success && result.variations.length > 0) {
        setVariations(result.variations);
        // Automatically pre-fill the form with the first variant option as default initial choice
        applyVariation(result.variations[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyVariation = (variant) => {
    setForm({
      foodName: variant.label,
      brand: variant.brand || form.brand,
      calories: variant.calories,
      carbs: variant.carbs,
      protein: variant.protein,
      fat: variant.fat
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/custom-food/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, createdBy: userId })
      });
      if (res.ok) {
        onFoodCreated();
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#121A2A] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-800/60">
          <h3 className="text-xs font-black uppercase text-white tracking-wider">Custom Food Creator</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex border-b border-gray-800/40 bg-[#0F1624]">
          <button type="button" onClick={() => setMode('manual')} className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 ${mode === 'manual' ? 'text-emerald-400 border-emerald-500' : 'text-gray-500 border-transparent'}`}>Manual Input</button>
          <button type="button" onClick={() => setMode('auto')} className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 ${mode === 'auto' ? 'text-cyan-400 border-cyan-500' : 'text-gray-500 border-transparent'}`}>AI Automatic</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {/* Brand Name Input - Moved UP so AI can read it contextually before suggest clicks */}
          <div>
            <label className="text-[9px] uppercase tracking-wider text-gray-400 block mb-1">Brand Name</label>
            <input type="text" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00A86B]" placeholder="Generic (e.g., Purefoods, Century)" />
          </div>

          <div>
            <label className="text-[9px] uppercase tracking-wider text-gray-400 block mb-1">Food Name Keyword</label>
            <div className="flex space-x-2">
              <input type="text" required value={form.foodName} onChange={e => setForm({...form, foodName: e.target.value})} className="flex-1 bg-[#1C2638] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00A86B]" placeholder="e.g., Chicken Breast" />
              <button type="button" onClick={handleAiAssist} disabled={loading} className="bg-emerald-950 border border-emerald-800 text-emerald-400 p-2 rounded-xl text-xs flex items-center space-x-1 hover:bg-emerald-900 transition-all">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span className="text-[10px] uppercase font-bold px-1">{mode === 'auto' ? 'Generate' : 'Suggest'}</span>
              </button>
            </div>
          </div>

          {/* --- INTERACTIVE AI VARIATIONS CHIPS PANEL --- */}
          {variations.length > 0 && (
            <div className="bg-[#151F32]/60 border border-gray-800/80 rounded-xl p-3 space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Select AI Suggested Variation:
              </p>
              <div className="flex flex-col gap-1.5">
                {variations.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyVariation(v)}
                    className={`w-full text-left p-2 rounded-lg text-[11px] font-medium border transition-all flex justify-between items-center ${
                      form.foodName === v.label 
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300' 
                        : 'bg-[#1C2638]/50 border-gray-800/60 text-gray-400 hover:border-gray-700 hover:text-white'
                    }`}
                  >
                    <span>{v.label}</span>
                    <span className="font-mono text-[10px] text-amber-500 font-bold">{v.calories} kcal</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] uppercase tracking-wider text-gray-400 block mb-1">Calories (kcal/100g)</label>
              <input type="number" required value={form.calories} onChange={e => setForm({...form, calories: e.target.value})} className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-gray-400 block mb-1">Carbs (g)</label>
              <input type="number" required value={form.carbs} onChange={e => setForm({...form, carbs: e.target.value})} className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-gray-400 block mb-1">Protein (g)</label>
              <input type="number" required value={form.protein} onChange={e => setForm({...form, protein: e.target.value})} className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-gray-400 block mb-1">Fats (g)</label>
              <input type="number" required value={form.fat} onChange={e => setForm({...form, fat: e.target.value})} className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none" />
            </div>
          </div>

          <button type="submit" className="w-full bg-[#00A86B] hover:bg-[#00945D] text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all mt-2 flex items-center justify-center space-x-1.5">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Save & Release Globally</span>
          </button>
        </form>
      </div>
    </div>
  );
}