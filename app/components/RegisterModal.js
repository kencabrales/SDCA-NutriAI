'use client';

import { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, X, ArrowRight, Sparkles, Scale, Ruler, Flame, Percent } from 'lucide-react';

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }) {
  const [step, setStep] = useState(1);
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  // Account Form States
  const [accountForm, setAccountForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  const [biometricsForm, setBiometricsForm] = useState({ 
    age: '', 
    sex: 'male', 
    weight: '', 
    weightUnit: 'kg', 
    heightInput: '', 
    heightUnit: 'cm', 
    goal: 'maintenance',
    activityLevel: 'sedentary', 
    bodyFat: ''                 
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Handle Step 1 Submission: Account Creation
  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (accountForm.password !== accountForm.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: accountForm.firstName,
          lastName: accountForm.lastName,
          email: accountForm.email,
          password: accountForm.password
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      setRegisteredEmail(data.email);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2 Submission: Biometrics Onboarding
  const handleBiometricsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isBiometricsStep: true,
          email: registeredEmail,
          ...biometricsForm
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update fitness goals');

      onSwitchToLogin(registeredEmail);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="w-full max-w-md bg-[#121A2A] border border-gray-800/60 rounded-2xl p-8 shadow-2xl relative my-auto">
        
        {/* Close Window Trigger */}
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors p-1">
          <X className="w-5 h-5" />
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {/* --- WINDOW STEP 1: CREATE BASE ACCOUNT --- */}
        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold text-center text-white mb-1">Create Account</h2>
            <p className="text-center text-xs text-gray-400 mb-8">Step 1 of 2: Setup secure access credentials</p>

            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input 
                    type="text" required placeholder="First Name" value={accountForm.firstName}
                    className="w-full bg-[#1C2638] border border-gray-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#00A86B] transition-colors" 
                    onChange={(e) => setAccountForm({ ...accountForm, firstName: e.target.value })} 
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input 
                    type="text" required placeholder="Last Name" value={accountForm.lastName}
                    className="w-full bg-[#1C2638] border border-gray-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#00A86B] transition-colors" 
                    onChange={(e) => setAccountForm({ ...accountForm, lastName: e.target.value })} 
                  />
                </div>
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input 
                  type="email" required placeholder="Email Address" value={accountForm.email}
                  className="w-full bg-[#1C2638] border border-gray-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#00A86B] transition-colors" 
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} 
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input 
                  type={showPassword ? "text" : "password"} required minLength={6} placeholder="Password" value={accountForm.password}
                  className="w-full bg-[#1C2638] border border-gray-800 rounded-xl pl-11 pr-11 py-3.5 text-sm text-white focus:outline-none focus:border-[#00A86B] transition-colors" 
                  onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} 
                />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input 
                  type="password" required placeholder="Confirm Password" value={accountForm.confirmPassword}
                  className="w-full bg-[#1C2638] border border-gray-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#00A86B] transition-colors" 
                  onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })} 
                />
              </div>

              <button type="submit" disabled={loading} className="w-full bg-[#00A86B] hover:bg-[#00945D] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center space-x-2 text-sm mt-2">
                <span>{loading ? 'Creating Baseline Account...' : 'Continue'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Already have an account? <button onClick={() => onSwitchToLogin('')} className="text-[#00A86B] hover:underline font-semibold ml-1">Log in here</button>
            </p>
          </>
        )}

        {/* --- WINDOW STEP 2: METRICS & CONFIGURATION TARGETS --- */}
        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold text-center text-white mb-1">Biometrics Profile</h2>
            <p className="text-center text-xs text-purple-400 mb-6">Step 2 of 2: Configure BMI & TDEE Engines</p>

            <form onSubmit={handleBiometricsSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Age</label>
                  <input 
                    type="number" required min="1" max="120" placeholder="Years" value={biometricsForm.age}
                    className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#00A86B]" 
                    onChange={(e) => setBiometricsForm({ ...biometricsForm, age: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Biological Sex</label>
                  <select 
                    value={biometricsForm.sex}
                    className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-3 py-3.5 text-sm text-white focus:outline-none focus:border-[#00A86B]"
                    onChange={(e) => setBiometricsForm({ ...biometricsForm, sex: e.target.value })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              {/* FLEXIBLE WEIGHT MODULE BLOCK */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                    <Scale className="w-3.5 h-3.5 text-purple-400" />
                    <span>Current Weight</span>
                  </label>
                  <div className="flex space-x-1 text-xs">
                    <button type="button" onClick={() => setBiometricsForm({...biometricsForm, weightUnit: 'kg'})} className={`px-2 py-0.5 rounded transition-colors ${biometricsForm.weightUnit === 'kg' ? 'bg-[#00A86B] text-white font-bold' : 'text-gray-500 bg-[#1C2638]'}`}>KG</button>
                    <button type="button" onClick={() => setBiometricsForm({...biometricsForm, weightUnit: 'lbs'})} className={`px-2 py-0.5 rounded transition-colors ${biometricsForm.weightUnit === 'lbs' ? 'bg-[#00A86B] text-white font-bold' : 'text-gray-500 bg-[#1C2638]'}`}>LBS</button>
                  </div>
                </div>
                <div className="relative">
                  <input 
                    type="number" required step="0.1" placeholder={`Weight entry in ${biometricsForm.weightUnit}`} value={biometricsForm.weight}
                    className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#00A86B]" 
                    onChange={(e) => setBiometricsForm({ ...biometricsForm, weight: e.target.value })} 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500 uppercase">{biometricsForm.weightUnit}</span>
                </div>
              </div>

              {/* FLEXIBLE HEIGHT MODULE BLOCK */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                    <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Current Height</span>
                  </label>
                  <div className="flex space-x-1 text-xs">
                    <button type="button" onClick={() => setBiometricsForm({...biometricsForm, heightUnit: 'cm'})} className={`px-2 py-0.5 rounded transition-colors ${biometricsForm.heightUnit === 'cm' ? 'bg-[#00A86B] text-white font-bold' : 'text-gray-500 bg-[#1C2638]'}`}>CM</button>
                    <button type="button" onClick={() => setBiometricsForm({...biometricsForm, heightUnit: 'ft'})} className={`px-2 py-0.5 rounded transition-colors ${biometricsForm.heightUnit === 'ft' ? 'bg-[#00A86B] text-white font-bold' : 'text-gray-500 bg-[#1C2638]'}`}>FT/IN</button>
                  </div>
                </div>
                <div className="relative">
                  <input 
                    type="number" required placeholder={biometricsForm.heightUnit === 'cm' ? "Height in cm (e.g. 175)" : "Total Inches (e.g. 69 for 5'9\")"} value={biometricsForm.heightInput}
                    className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#00A86B]" 
                    onChange={(e) => setBiometricsForm({ ...biometricsForm, heightInput: e.target.value })} 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500 uppercase">{biometricsForm.heightUnit === 'cm' ? 'cm' : 'in'}</span>
                </div>
              </div>

              {/* TDEE CALCULATOR ACTIVITY LEVEL DROPDOWN */}
              <div>
                <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5 mb-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#00A86B]" />
                  <span>Activity Level</span>
                </label>
                <select 
                  value={biometricsForm.activityLevel}
                  className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-3 py-3.5 text-sm text-white focus:outline-none focus:border-[#00A86B]"
                  onChange={(e) => setBiometricsForm({ ...biometricsForm, activityLevel: e.target.value })}
                >
                  <option value="sedentary">Sedentary (Office job, little to no exercise)</option>
                  <option value="light">Lightly Active (Light exercise 1-3 days/week)</option>
                  <option value="moderate">Moderately Active (Moderate gym 3-5 days/week)</option>
                  <option value="active">Very Active (Heavy training 6-7 days/week)</option>
                  <option value="vactive">Extremely Active (Physical labor / Athlete)</option>
                </select>
              </div>

              {/* OPTIONAL BODY FAT PERCENTAGE */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                    <Percent className="w-3.5 h-3.5 text-amber-500" />
                    <span>Body Fat Percentage</span>
                  </label>
                  <span className="text-[10px] text-gray-500 font-mono tracking-wider uppercase bg-[#161F30] px-2 py-0.5 rounded border border-gray-800/40">Optional</span>
                </div>
                <div className="relative">
                  <input 
                    type="number" step="0.1" min="2" max="60" placeholder="Leave empty for baseline calculations" value={biometricsForm.bodyFat}
                    className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00A86B]" 
                    onChange={(e) => setBiometricsForm({ ...biometricsForm, bodyFat: e.target.value })} 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">%</span>
                </div>
              </div>

              {/* FITNESS GOAL TARGET PROFILE SELECTOR */}
              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Select Nutrition Strategy</label>
                <select 
                  value={biometricsForm.goal}
                  className="w-full bg-[#1C2638] border border-gray-800 rounded-xl px-3 py-3.5 text-sm text-white focus:outline-none focus:border-[#00A86B]"
                  onChange={(e) => setBiometricsForm({ ...biometricsForm, goal: e.target.value })}
                >
                  <option value="cutting">Lose Weight / Cut (-500 kcal)</option>
                  <option value="maintenance">Maintain Weight (TDEE Baseline)</option>
                  <option value="bulking">Build Muscle / Bulk (+300 kcal)</option>
                </select>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-[#00A86B] hover:bg-[#00945D] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 mt-4 text-sm flex items-center justify-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Processing Fitness Matrix...' : 'Calculate Intake & Finish'}</span>
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}