'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
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

  const photoInputRef = useRef(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoMessage, setPhotoMessage] = useState('');

  const persistProfilePhoto = async (profilePhoto) => {
    setPhotoSaving(true);
    setPhotoMessage('');
    setError('');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?._id || user?.id,
          profilePhoto,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Could not save your profile photo.');
      }

      // Update the shared dashboard/profile user state without copying private
      // fields returned by the existing profile endpoint into localStorage.
      if (onUpdateUser) {
        await onUpdateUser({ profilePhoto });
      }
      setPhotoMessage(profilePhoto ? 'Profile photo updated.' : 'Profile photo removed.');
    } catch (photoError) {
      setError(photoError.message || 'Could not save your profile photo.');
    } finally {
      setPhotoSaving(false);
    }
  };

  const handlePhotoFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Choose an image smaller than 8 MB.');
      return;
    }

    setPhotoSaving(true);
    setPhotoMessage('');
    setError('');

    try {
      const compressedPhoto = await new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new window.Image();

        image.onload = () => {
          try {
            const maxDimension = 384;
            const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Your browser could not process this image.');

            context.drawImage(image, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
            URL.revokeObjectURL(objectUrl);

            if (dataUrl.length > 700000) {
              reject(new Error('This image is still too large after compression. Try a simpler image.'));
              return;
            }
            resolve(dataUrl);
          } catch (processingError) {
            URL.revokeObjectURL(objectUrl);
            reject(processingError);
          }
        };

        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('The selected image could not be opened.'));
        };
        image.src = objectUrl;
      });

      await persistProfilePhoto(compressedPhoto);
    } catch (photoError) {
      setError(photoError.message || 'Could not process this image.');
      setPhotoSaving(false);
    }
  };

  const handleRemoveProfilePhoto = async () => {
    await persistProfilePhoto('');
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
        <div className="flex items-center justify-between gap-4 py-3 px-2 border-b border-gray-800/50">
          <span className="text-xs sm:text-sm font-medium text-gray-300">Profile Photo</span>
          <div className="flex min-w-0 items-center gap-3">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoFileChange}
              className="hidden"
              aria-label="Choose a profile photo"
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={!isEditing || photoSaving}
              aria-label="Upload profile photo"
              className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 disabled:cursor-not-allowed"
              title={isEditing ? 'Change profile photo' : 'Select Edit Profile to change your photo'}
            >
              {user?.profilePhoto ? (
                <Image
                  src={user.profilePhoto}
                  alt="Current profile photo"
                  width={48}
                  height={48}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="mx-auto h-6 w-6" />
              )}
              {isEditing && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white">
                  <Camera className="h-4 w-4" />
                </span>
              )}
            </button>
            <div className="min-w-0 text-right">
              {isEditing ? (
                <>
                  <p className="text-[10px] text-gray-500">JPG, PNG or WebP · up to 8 MB</p>
                  {user?.profilePhoto && (
                    <button
                      type="button"
                      onClick={handleRemoveProfilePhoto}
                      disabled={photoSaving}
                      className="mt-1 text-[11px] font-semibold text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      Remove photo
                    </button>
                  )}
                </>
              ) : (
                <span className="text-xs text-gray-500">
                  {user?.profilePhoto ? 'Photo saved' : 'No photo added'}
                </span>
              )}
              {photoSaving && <p className="mt-1 text-[10px] text-emerald-400">Saving photo…</p>}
              {photoMessage && <p className="mt-1 text-[10px] text-emerald-400">{photoMessage}</p>}
            </div>
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