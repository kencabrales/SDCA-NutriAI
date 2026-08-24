'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Camera,
  CheckCircle2,
  ChevronRight,
  Target,
  Edit2,
  Save
} from 'lucide-react';

export default function MyProfileTab({ user, onUpdateUser, onNavigateToGoals }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    height: '',
    heightUnit: 'cm',
    weight: '',
    weightUnit: 'kg',
    sex: 'male',
    dob: '',
    location: '',
    email: '',
  });

  useEffect(() => {
    if (!user) return;

    // Parse DOB reliably without timezone shifts
    let formattedDob = '';
    const rawDob = user.dob || user.dateOfBirth;

    if (rawDob) {
      if (typeof rawDob === 'string') {
        formattedDob = rawDob.split('T')[0];
      } else {
        try {
          formattedDob = new Date(rawDob).toISOString().split('T')[0];
        } catch {
          formattedDob = '';
        }
      }
    }

    const userHeightUnit = user.heightUnit || 'cm';
    const userWeightUnit = user.weightUnit || 'kg';

    // Extract numerical height (handling 0 or undefined as empty)
    const rawHeight = user.height || user.heightInput;
    let displayHeight = rawHeight && Number(rawHeight) > 0 ? String(rawHeight) : '';
    if (userHeightUnit === 'in' && displayHeight) {
      displayHeight = (parseFloat(displayHeight) / 2.54).toFixed(1);
    }

    // Extract numerical weight (handling 0 or undefined as empty)
    const rawWeight = user.weight || user.weightInput || user.currentWeight;
    let displayWeight = rawWeight && Number(rawWeight) > 0 ? String(rawWeight) : '';
    if (userWeightUnit === 'lbs' && displayWeight) {
      displayWeight = (parseFloat(displayWeight) * 2.20462).toFixed(1);
    }

    setFormData({
      username:
        user.username ||
        (user.firstName
          ? `${user.firstName.toLowerCase()}${user.lastName?.toLowerCase() || ''}`
          : user.email?.split('@')[0] || ''),
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      height: displayHeight,
      heightUnit: userHeightUnit,
      weight: displayWeight,
      weightUnit: userWeightUnit,
      sex: user.sex || user.gender || 'male',
      dob: formattedDob,
      location: user.location || user.country || '',
      email: user.email || '',
    });
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError('');

    try {
      // Standardize back to metric before pushing updates to MongoDB
      const parsedHeight = parseFloat(formData.height);
      let standardizedHeight = isNaN(parsedHeight) ? 0 : parsedHeight;
      if (formData.heightUnit === 'in' && standardizedHeight > 0) {
        standardizedHeight = parseFloat((standardizedHeight * 2.54).toFixed(1));
      }

      const parsedWeight = parseFloat(formData.weight);
      let standardizedWeight = isNaN(parsedWeight) ? 0 : parsedWeight;
      if (formData.weightUnit === 'lbs' && standardizedWeight > 0) {
        standardizedWeight = parseFloat((standardizedWeight * 0.45359237).toFixed(2));
      }

      const payload = {
        userId: user?._id || user?.id,
        email: formData.email,
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        height: standardizedHeight,
        heightUnit: formData.heightUnit,
        weight: standardizedWeight,
        weightUnit: formData.weightUnit,
        sex: formData.sex,
        dob: formData.dob,
        location: formData.location,
      };

      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      if (onUpdateUser) {
        await onUpdateUser(data.user || payload);
      }

      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'Not set';
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      return isNaN(date.getTime())
        ? dateString
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateString;
  };

  return (
    <div className="space-y-6 p-1">
      {saveSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Personal Details
        </span>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#00A86B] hover:text-emerald-400 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-1">
        {/* USER NAME */}
        <div className="flex items-center justify-between py-3.5 px-2 border-b border-gray-800/50">
          <span className="text-xs sm:text-sm font-medium text-gray-300">User Name</span>
          {isEditing ? (
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="bg-[#1C2638] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white text-right focus:outline-none focus:border-[#00A86B]"
            />
          ) : (
            <span className="text-xs sm:text-sm font-semibold text-emerald-400">
              {formData.username || 'Not set'}
            </span>
          )}
        </div>

        {/* PROFILE PHOTO */}
        <div className="flex items-center justify-between py-3 px-2 border-b border-gray-800/50">
          <span className="text-xs sm:text-sm font-medium text-gray-300">Profile Photo</span>
          <div className="relative group cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <User className="w-5 h-5" />
            </div>
            {isEditing && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white">
                <Camera className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>

        {/* HEIGHT */}
        <div className="flex items-center justify-between py-3.5 px-2 border-b border-gray-800/50">
          <span className="text-xs sm:text-sm font-medium text-gray-300">Height</span>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                name="height"
                value={formData.height}
                onChange={handleChange}
                placeholder="175"
                className="w-20 bg-[#1C2638] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white text-right focus:outline-none focus:border-[#00A86B]"
              />
              <select
                name="heightUnit"
                value={formData.heightUnit}
                onChange={handleChange}
                className="bg-[#1C2638] border border-gray-700 rounded-lg px-1.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-[#00A86B]"
              >
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </div>
          ) : (
            <span className="text-xs sm:text-sm font-semibold text-emerald-400">
              {formData.height ? `${formData.height} ${formData.heightUnit}` : 'Not set'}
            </span>
          )}
        </div>

        {/* CURRENT WEIGHT */}
        <div className="flex items-center justify-between py-3.5 px-2 border-b border-gray-800/50">
          <span className="text-xs sm:text-sm font-medium text-gray-300">Current Weight</span>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="70"
                className="w-20 bg-[#1C2638] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white text-right focus:outline-none focus:border-[#00A86B]"
              />
              <select
                name="weightUnit"
                value={formData.weightUnit}
                onChange={handleChange}
                className="bg-[#1C2638] border border-gray-700 rounded-lg px-1.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-[#00A86B]"
              >
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            </div>
          ) : (
            <span className="text-xs sm:text-sm font-semibold text-emerald-400">
              {formData.weight ? `${formData.weight} ${formData.weightUnit}` : 'Not set'}
            </span>
          )}
        </div>

        {/* SEX */}
        <div className="flex items-center justify-between py-3.5 px-2 border-b border-gray-800/50">
          <span className="text-xs sm:text-sm font-medium text-gray-300">Sex</span>
          {isEditing ? (
            <select
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              className="bg-[#1C2638] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#00A86B]"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          ) : (
            <span className="text-xs sm:text-sm font-semibold text-emerald-400 capitalize">
              {formData.sex || 'Not set'}
            </span>
          )}
        </div>

        {/* DATE OF BIRTH */}
        <div className="flex items-center justify-between py-3.5 px-2 border-b border-gray-800/50">
          <span className="text-xs sm:text-sm font-medium text-gray-300">Date of Birth</span>
          {isEditing ? (
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className="bg-[#1C2638] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#00A86B]"
            />
          ) : (
            <span className="text-xs sm:text-sm font-semibold text-emerald-400">
              {formatDateDisplay(formData.dob)}
            </span>
          )}
        </div>

        {/* LOCATION */}
        <div className="flex items-center justify-between py-3.5 px-2 border-b border-gray-800/50">
          <span className="text-xs sm:text-sm font-medium text-gray-300">Location</span>
          {isEditing ? (
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="bg-[#1C2638] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white text-right focus:outline-none focus:border-[#00A86B]"
            />
          ) : (
            <span className="text-xs sm:text-sm font-semibold text-emerald-400">
              {formData.location || 'Not set'}
            </span>
          )}
        </div>

        {/* EMAIL ADDRESS */}
        <div className="flex items-center justify-between py-3.5 px-2 border-b border-gray-800/50">
          <span className="text-xs sm:text-sm font-medium text-gray-300">Email Address</span>
          {isEditing ? (
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="bg-[#1C2638] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white text-right focus:outline-none focus:border-[#00A86B]"
            />
          ) : (
            <span className="text-xs sm:text-sm font-semibold text-emerald-400 truncate max-w-[200px]">
              {formData.email}
            </span>
          )}
        </div>

        {/* SAVE BUTTON */}
        {isEditing && (
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#00A86B] hover:bg-[#00945D] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </form>

      {/* GOALS LINK */}
      <div className="pt-4 border-t border-gray-800">
        <button
          type="button"
          onClick={onNavigateToGoals}
          className="w-full bg-[#161F30] hover:bg-[#1C2638] border border-gray-800/80 rounded-xl p-4 flex items-center justify-between transition-colors text-left group"
        >
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Target className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-white">Goals</span>
            </div>
            <p className="text-xs text-gray-400">
              Update your target weight, calorie goals, and fitness plan.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
}