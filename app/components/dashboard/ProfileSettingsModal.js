'use client';

import { useState, useEffect } from 'react';
import { 
  X, Sparkles, Target, Flame, UtensilsCrossed, 
  ChefHat, Scale, Save, Loader2, CheckCircle2 
} from 'lucide-react';

export default function ProfileModal({ isOpen, onClose, user, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState('goals');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  const [formData, setFormData] = useState({
    targetCalories: 2000,
    carbsPct: 50,
    proteinPct: 30,
    fatPct: 20,
    startingWeight: 0,
    currentWeight: 0,
    goalWeight: 0,
    weeklyPace: 'maintain',
    activityLevel: 'sedentary',
  });

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        targetCalories: user.targetCalories ?? 2000,
        carbsPct: user.carbsPct ?? 50,
        proteinPct: user.proteinPct ?? 30,
        fatPct: user.fatPct ?? 20,
        startingWeight: user.startingWeight ?? 0,
        currentWeight: user.weight ?? user.currentWeight ?? 0,
        goalWeight: user.goalWeight ?? 0,
        weeklyPace: user.weeklyGoal ?? user.weeklyPace ?? 'maintain',
        activityLevel: user.activityLevel ?? 'sedentary',
      });
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleWheelChange = (e, field) => {
    e.preventDefault();
    const step = 5;
    const direction = e.deltaY < 0 ? 1 : -1;
    const currentValue = Number(formData[field]) || 0;
    const newValue = Math.min(100, Math.max(0, currentValue + direction * step));
    setFormData((prev) => ({ ...prev, [field]: newValue }));
  };

  const totalMacroPct = 
    Number(formData.carbsPct) + 
    Number(formData.proteinPct) + 
    Number(formData.fatPct);

  const carbsGrams = Math.round(((Number(formData.targetCalories) * (Number(formData.carbsPct) / 100)) / 4) || 0);
  const proteinGrams = Math.round(((Number(formData.targetCalories) * (Number(formData.proteinPct) / 100)) / 4) || 0);
  const fatGrams = Math.round(((Number(formData.targetCalories) * (Number(formData.fatPct) / 100)) / 9) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    if (totalMacroPct !== 100) {
      setErrorMsg(`Macro percentages must equal 100%. Current total: ${totalMacroPct}%`);
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?._id || user?.id,
          email: user?.email,

          targetCalories: Number(formData.targetCalories),
          carbsPct: Number(formData.carbsPct),
          proteinPct: Number(formData.proteinPct),
          fatPct: Number(formData.fatPct),

          carbsGrams,
          proteinGrams,
          fatGrams,

          // Weights and Weekly Targets
          startingWeight: Number(formData.startingWeight),
          weight: Number(formData.currentWeight), 
          goalWeight: Number(formData.goalWeight),
          weeklyGoal: formData.weeklyPace,  
          activityLevel: formData.activityLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile settings.');
      }

      const updatedUser = data.user || data;

      if (typeof window !== 'undefined') {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...storedUser, ...updatedUser }));
      }

      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }

      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        onClose();
      }, 1200);

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">

      {/* FLOATING SUCCESS TOAST */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-[#00A86B] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/20 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <div className="text-xs">
            <p className="font-bold">Changes Saved!</p>
            <p className="opacity-90 text-[11px]">Your goals and macro targets have been updated.</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl bg-[#121A2A] border border-gray-800/60 rounded-2xl shadow-2xl overflow-hidden relative my-auto">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-gray-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#00A86B]/10 rounded-xl border border-[#00A86B]/20">
              <Sparkles className="w-5 h-5 text-[#00A86B]" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Profile & Goals</h2>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#1C2638]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STREAK BANNER */}
        <div className="p-6 bg-[#0D1320]/60 border-b border-gray-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1C2638] border border-gray-800 flex items-center justify-center text-white font-bold text-2xl shadow-inner">
              {user?.firstName 
                ? user.firstName.charAt(0).toUpperCase() 
                : user?.name 
                ? user.name.charAt(0).toUpperCase() 
                : 'U'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {user?.firstName 
                  ? `${user.firstName} ${user.lastName || ''}`.trim() 
                  : user?.name || 'User Profile'}
              </h3>
              <div className="inline-flex items-center space-x-1.5 bg-[#00A86B]/15 border border-[#00A86B]/30 px-2.5 py-0.5 rounded-full mt-1">
                <span className="w-2 h-2 rounded-full bg-[#00A86B] animate-pulse"></span>
                <span className="text-xs font-semibold text-[#00A86B]">
                  {formData.targetCalories} kcal / day
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#1C2638] border border-gray-800 rounded-2xl px-5 py-3 flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Flame className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block">
                Logging Streak
              </span>
              <span className="text-sm font-bold text-white">
                {user?.streakCount || user?.streak || 0} Days Logged
              </span>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION BAR */}
        <div className="flex border-b border-gray-800 bg-[#0F1624] px-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('goals')}
            className={`py-3.5 px-4 flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'goals' 
                ? 'border-[#00A86B] text-[#00A86B] font-bold' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Goals</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('meals')}
            className={`py-3.5 px-4 flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'meals' 
                ? 'border-[#00A86B] text-[#00A86B] font-bold' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>My Meals</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recipes')}
            className={`py-3.5 px-4 flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'recipes' 
                ? 'border-[#00A86B] text-[#00A86B] font-bold' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Recipes & Foods</span>
          </button>
        </div>

        {/* MAIN CONTENT CONTAINER */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs text-center font-semibold">
              {errorMsg}
            </div>
          )}

          {/* GOALS */}
          {activeTab === 'goals' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/*  WEIGHT & WEEKLY TARGETS */}
              <div className="bg-[#0D1320] border border-gray-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center space-x-2 text-[#00A86B]">
                  <Scale className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Weight & Weekly Targets
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-400 text-xs font-semibold mb-1.5">
                      Starting (kg)
                    </label>
                    <input 
                      type="number" step="0.1"
                      name="startingWeight"
                      value={formData.startingWeight}
                      onChange={handleChange}
                      className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00A86B]" 
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs font-semibold mb-1.5">
                      Current (kg)
                    </label>
                    <input 
                      type="number" step="0.1"
                      name="currentWeight"
                      value={formData.currentWeight}
                      onChange={handleChange}
                      className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00A86B]" 
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs font-semibold mb-1.5">
                      Goal Weight (kg)
                    </label>
                    <input 
                      type="number" step="0.1"
                      name="goalWeight"
                      value={formData.goalWeight}
                      onChange={handleChange}
                      className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00A86B]" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-gray-400 text-xs font-semibold mb-1.5">
                      Weekly Pace
                    </label>
                    <select 
                      name="weeklyPace"
                      value={formData.weeklyPace}
                      onChange={handleChange}
                      className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-[#00A86B]"
                    >
                      <option value="lose_0.5">Lose 0.5 kg / week</option>
                      <option value="lose_0.25">Lose 0.25 kg / week</option>
                      <option value="maintain">Maintain Weight</option>
                      <option value="gain_0.25">Gain 0.25 kg / week</option>
                      <option value="gain_0.5">Gain 0.5 kg / week</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs font-semibold mb-1.5">
                      Activity Level
                    </label>
                    <select 
                      name="activityLevel"
                      value={formData.activityLevel}
                      onChange={handleChange}
                      className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-[#00A86B]"
                    >
                      <option value="sedentary">Sedentary (Little/no exercise)</option>
                      <option value="lightly_active">Lightly Active (1-3 days/wk)</option>
                      <option value="moderately_active">Moderately Active (3-5 days/wk)</option>
                      <option value="very_active">Very Active (6-7 days/wk)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* NUTRITION GOALS & MACROS */}
              <div className="bg-[#0D1320] border border-gray-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 text-[#00A86B]">
                    <Target className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Nutrition Goals
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 bg-[#1C2638] px-2.5 py-1 rounded-md border border-gray-800 font-mono">
                    Auto calculated (Editable)
                  </span>
                </div>

                <div>
                  <label className="block text-gray-400 text-xs font-semibold mb-1.5">
                    Target Calories (kcal/day)
                  </label>
                  <input 
                    type="number"
                    name="targetCalories"
                    value={formData.targetCalories}
                    onChange={handleChange}
                    className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-4 py-3 text-sm text-[#00A86B] font-bold focus:outline-none focus:border-[#00A86B]" 
                    required
                  />
                </div>

                {/* MACRO RATIOS */}
                <div className="pt-2 border-t border-gray-800/60">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      Macro Ratios (% & Grams)
                    </label>
                    <span className={`text-[11px] font-mono font-bold ${totalMacroPct === 100 ? 'text-[#00A86B]' : 'text-amber-400'}`}>
                      Total: {totalMacroPct}% {totalMacroPct !== 100 && '(Adjust to 100%)'}
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-500 mb-3">
                    Scroll mouse wheel inside inputs to increment/decrement by 5%.
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {/* CARBS */}
                    <div className="bg-[#1C2638] border border-gray-800 rounded-xl p-3 text-center">
                      <span className="text-xs font-bold text-cyan-400 uppercase block mb-1">
                        Carbs
                      </span>
                      <div className="flex items-center justify-center space-x-1">
                        <input 
                          type="number"
                          step="5" min="0" max="100"
                          name="carbsPct"
                          value={formData.carbsPct}
                          onWheel={(e) => handleWheelChange(e, 'carbsPct')}
                          onChange={handleChange}
                          className="w-12 bg-transparent text-center font-bold text-white text-base focus:outline-none"
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                      <span className="text-[11px] font-mono text-gray-400 block mt-1">
                        {carbsGrams}g
                      </span>
                    </div>

                    {/* PROTEIN */}
                    <div className="bg-[#1C2638] border border-gray-800 rounded-xl p-3 text-center">
                      <span className="text-xs font-bold text-purple-400 uppercase block mb-1">
                        Protein
                      </span>
                      <div className="flex items-center justify-center space-x-1">
                        <input 
                          type="number"
                          step="5" min="0" max="100"
                          name="proteinPct"
                          value={formData.proteinPct}
                          onWheel={(e) => handleWheelChange(e, 'proteinPct')}
                          onChange={handleChange}
                          className="w-12 bg-transparent text-center font-bold text-white text-base focus:outline-none"
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                      <span className="text-[11px] font-mono text-gray-400 block mt-1">
                        {proteinGrams}g
                      </span>
                    </div>

                    {/* FAT */}
                    <div className="bg-[#1C2638] border border-gray-800 rounded-xl p-3 text-center">
                      <span className="text-xs font-bold text-amber-400 uppercase block mb-1">
                        Fat
                      </span>
                      <div className="flex items-center justify-center space-x-1">
                        <input 
                          type="number"
                          step="5" min="0" max="100"
                          name="fatPct"
                          value={formData.fatPct}
                          onWheel={(e) => handleWheelChange(e, 'fatPct')}
                          onChange={handleChange}
                          className="w-12 bg-transparent text-center font-bold text-white text-base focus:outline-none"
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                      <span className="text-[11px] font-mono text-gray-400 block mt-1">
                        {fatGrams}g
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl border border-gray-800 text-gray-400 hover:text-white hover:bg-[#1C2638] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="bg-[#00A86B] hover:bg-[#00945D] text-white font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-50 text-sm flex items-center space-x-2 shadow-lg shadow-[#00A86B]/20"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {/*MY MEALS */}
          {activeTab === 'meals' && (
            <div className="text-center py-12 bg-[#0D1320] border border-gray-800/80 rounded-2xl text-gray-400 text-sm">
              Saved custom meals will appear here.
            </div>
          )}

          {/* RECIPES */}
          {activeTab === 'recipes' && (
            <div className="text-center py-12 bg-[#0D1320] border border-gray-800/80 rounded-2xl text-gray-400 text-sm">
              Custom recipes and food database entries will appear here.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}