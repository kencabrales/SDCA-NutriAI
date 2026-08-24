// RegisterModal.js
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  X,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  Info
} from 'lucide-react';

// Small reusable info tooltip — works on hover (desktop) AND tap (mobile),
// since mobile devices never fire mouseenter/mouseleave.
function InfoTooltip({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label={`About ${title}`}
        className="ml-1 text-gray-500 hover:text-emerald-400 transition-colors"
      >
        <Info className="w-3 h-3" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 bg-[#0B121F] border border-gray-700 rounded-lg p-2.5 shadow-2xl text-left"
        >
          <p className="text-[10px] font-bold text-white mb-1">{title}</p>
          <div className="text-[9px] text-gray-300 leading-relaxed space-y-0.5">
            {children}
          </div>
          {/* little arrow pointing down at the icon */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-[#0B121F] border-r border-b border-gray-700 rotate-45 -mt-1" />
        </div>
      )}
    </span>
  );
}

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1 State
  const [accountForm, setAccountForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Step 2 State
  const [biometricsForm, setBiometricsForm] = useState({
    dob: '',
    sex: 'male',
    weight: '',
    weightUnit: 'kg',
    heightCm: '',
    heightUnit: 'cm',
    feet: '',
    inches: '',
    bodyFat: '', // Optional field
    activityLevel: 'sedentary',
    goal: 'maintain',
  });

  const handleAccountChange = useCallback((e) => {
    const { name, value } = e.target;
    setAccountForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleBiometricsChange = useCallback((e) => {
    const { name, value } = e.target;
    setBiometricsForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleWeightUnitToggle = useCallback((newUnit) => {
    setBiometricsForm((prev) => {
      if (prev.weightUnit === newUnit) return prev;
      let updatedWeight = prev.weight;
      if (updatedWeight && !isNaN(updatedWeight)) {
        updatedWeight = newUnit === 'lbs'
          ? (parseFloat(updatedWeight) * 2.20462).toFixed(1)
          : (parseFloat(updatedWeight) * 0.45359237).toFixed(1);
      }
      return { ...prev, weightUnit: newUnit, weight: updatedWeight };
    });
  }, []);

  const handleHeightUnitToggle = useCallback((newUnit) => {
    setBiometricsForm((prev) => {
      if (prev.heightUnit === newUnit) return prev;
      if (newUnit === 'ft') {
        const totalInches = (parseFloat(prev.heightCm) || 0) / 2.54;
        return {
          ...prev,
          heightUnit: 'ft',
          feet: Math.floor(totalInches / 12) || '',
          inches: Math.round(totalInches % 12) || ''
        };
      } else {
        const totalInches = ((parseInt(prev.feet) || 0) * 12) + (parseInt(prev.inches) || 0);
        return {
          ...prev,
          heightUnit: 'cm',
          heightCm: Math.round(totalInches * 2.54) || ''
        };
      }
    });
  }, []);

  const handleFeetInchesChange = useCallback((feetVal, inchesVal) => {
    const f = parseInt(feetVal) || 0;
    const i = parseInt(inchesVal) || 0;
    const totalInches = (f * 12) + i;
    const cm = Math.round(totalInches * 2.54);

    setBiometricsForm((prev) => ({
      ...prev,
      feet: feetVal,
      inches: inchesVal,
      heightCm: cm || ''
    }));
  }, []);

  // Optimized target calculation
  const calculatedTarget = useMemo(() => {
    const {
      dob, sex, weight, weightUnit, heightCm, heightUnit,
      feet, inches, bodyFat, activityLevel, goal
    } = biometricsForm;

    const zeroState = {
      bmi: 0, bmr: 0, tdee: 0, calories: 0,
      carbsPct: 40, proteinPct: 30, fatPct: 30,
      carbsGrams: 0, proteinGrams: 0, fatGrams: 0
    };

    if (!dob) return zeroState;

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) return zeroState;

    let heightInCm = 0;
    if (heightUnit === 'cm') {
      heightInCm = parseFloat(heightCm);
    } else {
      const f = parseFloat(feet) || 0;
      const i = parseFloat(inches) || 0;
      heightInCm = (f * 12 + i) * 2.54;
    }
    if (isNaN(heightInCm) || heightInCm <= 0) return zeroState;

    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return zeroState;

    const today = new Date();
    if (birthDate.getTime() > today.getTime()) return zeroState; // future DOB guard

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age <= 0 || age > 120) return zeroState;

    const weightKg = weightUnit === 'lbs' ? parsedWeight * 0.45359237 : parsedWeight;
    const heightM = heightInCm / 100;
    const bmiVal = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

    let bmrVal = 0;
    const numericBodyFat = parseFloat(bodyFat);

    // Body Fat is optional: use Katch-McArdle only if valid numeric value is present
    if (!isNaN(numericBodyFat) && numericBodyFat > 0 && numericBodyFat < 100) {
      const leanMass = weightKg * (1 - (numericBodyFat / 100));
      bmrVal = 370 + (21.6 * leanMass);
    } else {
      bmrVal = (10 * weightKg) + (6.25 * heightInCm) - (5 * age);
      bmrVal = sex === 'male' ? bmrVal + 5 : bmrVal - 161;
    }

    const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, heavy: 1.725 };
    const tdeeVal = Math.round(bmrVal * (multipliers[activityLevel] || 1.2));

    let finalCalories = tdeeVal;
    if (goal === 'cut') finalCalories -= 500;
    else if (goal === 'bulk') finalCalories += 500;

    finalCalories = Math.max(1200, finalCalories);

    // Standard split: 40% carbs / 30% protein / 30% fat
    const carbsPctVal = 40;
    const proteinPctVal = 30;
    const fatPctVal = 30;

    return {
      bmi: bmiVal,
      bmr: Math.round(bmrVal),
      tdee: tdeeVal,
      calories: finalCalories,
      carbsPct: carbsPctVal,
      proteinPct: proteinPctVal,
      fatPct: fatPctVal,
      carbsGrams: Math.round((finalCalories * (carbsPctVal / 100)) / 4),
      proteinGrams: Math.round((finalCalories * (proteinPctVal / 100)) / 4),
      fatGrams: Math.round((finalCalories * (fatPctVal / 100)) / 9)
    };
  }, [biometricsForm]);

  // Reject a birth date set in the future
  const dobError = useMemo(() => {
    if (!biometricsForm.dob) return '';
    const picked = new Date(biometricsForm.dob);
    const today = new Date();
    picked.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (isNaN(picked.getTime())) return 'Invalid date.';
    if (picked.getTime() > today.getTime()) return 'Date of birth cannot be in the future.';
    return '';
  }, [biometricsForm.dob]);

  if (!isOpen) return null;

  const handleNextStep = (e) => {
    e.preventDefault();
    setError('');

    if (accountForm.password !== accountForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (accountForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();

    if (dobError) {
      setError(dobError);
      return;
    }

    setLoading(true);
    setError('');

    let standardizedWeight = parseFloat(biometricsForm.weight) || 0;
    if (biometricsForm.weightUnit === 'lbs') {
      standardizedWeight = parseFloat((standardizedWeight * 0.45359237).toFixed(2));
    }

    // Process Body Fat safely as null if omitted
    const parsedBodyFat = parseFloat(biometricsForm.bodyFat);
    const validBodyFat = !isNaN(parsedBodyFat) && parsedBodyFat > 0 ? parsedBodyFat : null;

    try {
      const payload = {
        firstName: accountForm.firstName,
        lastName: accountForm.lastName,
        username: `${accountForm.firstName.toLowerCase()}${accountForm.lastName.toLowerCase()}`,
        email: accountForm.email,
        password: accountForm.password,
        dob: biometricsForm.dob,
        sex: biometricsForm.sex,
        weight: standardizedWeight,
        weightUnit: biometricsForm.weightUnit,
        height: parseFloat(biometricsForm.heightCm) || 0,
        heightUnit: biometricsForm.heightUnit,
        goal: biometricsForm.goal,
        activityLevel: biometricsForm.activityLevel,
        bodyFat: validBodyFat, // Safely optional
        targetCalories: calculatedTarget.calories,
        targetCarbs: calculatedTarget.carbsGrams,
        targetProtein: calculatedTarget.proteinGrams,
        targetFat: calculatedTarget.fatGrams,
        carbsPct: calculatedTarget.carbsPct,
        proteinPct: calculatedTarget.proteinPct,
        fatPct: calculatedTarget.fatPct,
        bmi: calculatedTarget.bmi,
        bmr: calculatedTarget.bmr,
        tdee: calculatedTarget.tdee
      };

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete registration');

      onSwitchToLogin(accountForm.email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#121A2A] border border-gray-800 rounded-2xl p-6 shadow-2xl relative my-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800/50 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs font-semibold mb-4 text-center">
            {error}
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold text-center text-white mb-1 tracking-tight">Create Account</h2>
            <p className="text-center text-xs text-gray-400 mb-6">Step 1 of 2: Basic account details</p>

            <form onSubmit={handleNextStep} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input
                    type="text"
                    required
                    name="firstName"
                    placeholder="First Name"
                    value={accountForm.firstName}
                    onChange={handleAccountChange}
                    className="w-full bg-[#1C2638] border border-gray-800 rounded-xl pl-10 pr-3 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00A86B]"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input
                    type="text"
                    required
                    name="lastName"
                    placeholder="Last Name"
                    value={accountForm.lastName}
                    onChange={handleAccountChange}
                    className="w-full bg-[#1C2638] border border-gray-800 rounded-xl pl-10 pr-3 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00A86B]"
                  />
                </div>
              </div>

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="email"
                  required
                  name="email"
                  placeholder="Email Address"
                  value={accountForm.email}
                  onChange={handleAccountChange}
                  className="w-full bg-[#1C2638] border border-gray-800 rounded-xl pl-10 pr-3 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00A86B]"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  name="password"
                  placeholder="Password"
                  value={accountForm.password}
                  onChange={handleAccountChange}
                  className="w-full bg-[#1C2638] border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00A86B]"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="password"
                  required
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={accountForm.confirmPassword}
                  onChange={handleAccountChange}
                  className="w-full bg-[#1C2638] border border-gray-800 rounded-xl pl-10 pr-3 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00A86B]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#00A86B] hover:bg-[#00945D] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-wider mt-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-5">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onSwitchToLogin('')}
                className="text-[#00A86B] hover:underline font-semibold ml-1"
              >
                Log in here
              </button>
            </p>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            {/* pr-10 keeps "STEP 2 OF 2" clear of the absolutely-positioned X
                button in the top-right corner — without it, the badge's right
                edge sits directly under the close button and gets clipped. */}
            <div className="flex justify-between items-center pb-3 pr-10 border-b border-gray-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Step 2 of 2 <span className="text-xs text-gray-400 mb-6">Onboarding</span>
              </span>
            </div>

            <form onSubmit={handleFinalSubmit} className="space-y-1 mt-3">
              {/* DATE OF BIRTH */}
              <div className="flex items-center justify-between py-2.5 px-2 border-b border-gray-800/50">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Date of Birth</span>
                <div className="flex flex-col items-end">
                  <input
                    type="date"
                    required
                    name="dob"
                    max={new Date().toISOString().split('T')[0]}
                    value={biometricsForm.dob}
                    onChange={handleBiometricsChange}
                    className="bg-[#1C2638] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#00A86B]"
                  />
                  {dobError && (
                    <span className="text-[10px] text-red-400 mt-1">{dobError}</span>
                  )}
                </div>
              </div>

              {/* BIOLOGICAL SEX */}
              <div className="flex items-center justify-between py-2.5 px-2 border-b border-gray-800/50">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Biological Sex</span>
                <select
                  name="sex"
                  value={biometricsForm.sex}
                  onChange={handleBiometricsChange}
                  className="bg-[#1C2638] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#00A86B]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {/* WEIGHT */}
              <div className="flex items-center justify-between py-2.5 px-2 border-b border-gray-800/50">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Current Weight</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    required
                    step="0.1"
                    name="weight"
                    placeholder="70"
                    value={biometricsForm.weight}
                    onChange={handleBiometricsChange}
                    className="w-20 bg-[#1C2638] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white text-right focus:outline-none focus:border-[#00A86B] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleWeightUnitToggle(biometricsForm.weightUnit === 'kg' ? 'lbs' : 'kg')}
                    className="bg-[#1C2638] border border-gray-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-400 hover:text-white"
                  >
                    {biometricsForm.weightUnit}
                  </button>
                </div>
              </div>

              {/* HEIGHT */}
              <div className="flex items-center justify-between py-2.5 px-2 border-b border-gray-800/50">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Current Height</span>
                <div className="flex items-center gap-1">
                  {biometricsForm.heightUnit === 'cm' ? (
                    <input
                      type="number"
                      required
                      name="heightCm"
                      placeholder="175"
                      value={biometricsForm.heightCm}
                      onChange={handleBiometricsChange}
                      className="w-20 bg-[#1C2638] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white text-right focus:outline-none focus:border-[#00A86B] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        required
                        placeholder="5"
                        value={biometricsForm.feet}
                        onChange={(e) => handleFeetInchesChange(e.target.value, biometricsForm.inches)}
                        className="w-10 bg-[#1C2638] border border-gray-700 rounded-lg px-1 py-1.5 text-xs text-white text-center focus:outline-none focus:border-[#00A86B] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-gray-400">ft</span>
                      <input
                        type="number"
                        required
                        placeholder="9"
                        value={biometricsForm.inches}
                        onChange={(e) => handleFeetInchesChange(biometricsForm.feet, e.target.value)}
                        className="w-10 bg-[#1C2638] border border-gray-700 rounded-lg px-1 py-1.5 text-xs text-white text-center focus:outline-none focus:border-[#00A86B] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-gray-400">in</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleHeightUnitToggle(biometricsForm.heightUnit === 'cm' ? 'ft' : 'cm')}
                    className="bg-[#1C2638] border border-gray-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-400 hover:text-white"
                  >
                    {biometricsForm.heightUnit}
                  </button>
                </div>
              </div>

              {/* BODY FAT (OPTIONAL) */}
              <div className="flex items-center justify-between py-2.5 px-2 border-b border-gray-800/50">
                <span className="text-xs sm:text-sm font-medium text-gray-300">
                  Body Fat % <span className="text-gray-500 text-[10px]">(Optional)</span>
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="2"
                    max="60"
                    name="bodyFat"
                    placeholder="Optional"
                    value={biometricsForm.bodyFat}
                    onChange={handleBiometricsChange}
                    className="w-20 bg-[#1C2638] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white text-right focus:outline-none focus:border-[#00A86B] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-gray-400 px-1">%</span>
                </div>
              </div>

              {/* ACTIVITY LEVEL */}
              <div className="flex items-center justify-between py-2.5 px-2 border-b border-gray-800/50">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Activity Level</span>
                <select
                  name="activityLevel"
                  value={biometricsForm.activityLevel}
                  onChange={handleBiometricsChange}
                  className="bg-[#1C2638] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#00A86B]"
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light (1-2 Days/Week)</option>
                  <option value="moderate">Moderate (3-5 Days/Week)</option>
                  <option value="heavy">Heavy (6-7 Days/Week)</option>
                </select>
              </div>

              {/* NUTRITIONAL STRATEGY */}
              <div className="flex items-center justify-between py-2.5 px-2 border-b border-gray-800/50">
                <span className="text-xs sm:text-sm font-medium text-gray-300">Goal Strategy</span>
                <select
                  name="goal"
                  value={biometricsForm.goal}
                  onChange={handleBiometricsChange}
                  className="bg-[#1C2638] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#00A86B]"
                >
                  <option value="cut">Cut (-500 kcal)</option>
                  <option value="maintain">Maintain</option>
                  <option value="bulk">Bulk (+500 kcal)</option>
                </select>
              </div>

              {/* LIVE TARGET PREVIEW PANEL */}
              <div className="bg-[#161F30] border border-emerald-500/30 rounded-xl p-3.5 space-y-3 !mt-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="text-xs font-bold text-gray-300">Calculated Daily Target</span>
                  <span className="text-base font-black text-emerald-400">
                    {calculatedTarget.calories} <span className="text-[10px] text-gray-400 font-normal">kcal/day</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                  <div className="flex justify-between border-b border-gray-800/50 pb-1">
                    <span className="text-gray-400 flex items-center">
                      BMI:
                      <InfoTooltip title="Body Mass Index (BMI)">
                        <div>&lt; 18.5 — Underweight</div>
                        <div>18.5 – 24.9 — Normal</div>
                        <div>25 – 29.9 — Overweight</div>
                        <div>≥ 30 — Obese</div>
                      </InfoTooltip>
                    </span>
                    <span className="font-bold text-white">{calculatedTarget.bmi || '--'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-800/50 pb-1">
                    <span className="text-gray-400 flex items-center">
                      Maintain:
                      <InfoTooltip title="TDEE (Total Daily Energy Expenditure)">
                        <div>The calories your body burns per day at your current activity level — your maintenance number, before any cut or bulk adjustment.</div>
                      </InfoTooltip>
                    </span>
                    <span className="font-bold text-white">{calculatedTarget.tdee} kcal</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-[#1C2638] p-2 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Carbs</div>
                    <div className="text-xs font-bold text-white mt-0.5">{calculatedTarget.carbsGrams}g</div>
                  </div>
                  <div className="bg-[#1C2638] p-2 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Protein</div>
                    <div className="text-xs font-bold text-white mt-0.5">{calculatedTarget.proteinGrams}g</div>
                  </div>
                  <div className="bg-[#1C2638] p-2 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Fat</div>
                    <div className="text-xs font-bold text-white mt-0.5">{calculatedTarget.fatGrams}g</div>
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading || !!dobError}
                  className="w-full bg-[#00A86B] hover:bg-[#00945D] text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
                >
                  <span>{loading ? 'Registering...' : 'Complete Registration'}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}