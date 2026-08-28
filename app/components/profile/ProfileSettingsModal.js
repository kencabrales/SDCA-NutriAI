//components/profile/ProfileSettingsModal.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  User,
  Target,
  Scale,
  Footprints,
  PieChart,
  Utensils,
  Bell,
  ShieldCheck,
  HelpCircle,
  LogOut,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import ProfileHeader from './ProfileHeader';
import MyProfileTab from './MyProfileTab';
import GoalsTab from './GoalsTab';
import MyMealsTab from './MyMealsTab';
import RecipesTab from './RecipesTab';
import WeightProgressTab from './WeightProgressTab';
import NutritionTab from './NutritionTab';
import StepsTab from './StepsTab';

// Shared themed scrollbar (Chromium/WebKit) + Firefox fallback, matching the app's dark palette.
const scrollbarClasses =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-600";
const scrollbarStyle = { scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' };

export default function ProfileSettingsModal({ isOpen, onClose, user, onUpdateUser }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('menu');
  const [saving, setSaving] = useState(false);

const [formData, setFormData] = useState({ ...user });
const [heightUnit, setHeightUnit] = useState('cm');
const [weightUnit, setWeightUnit] = useState('kg');

useEffect(() => {
  if (isOpen && user) {
    setFormData({ ...user });
  }
}, [isOpen, user]);

if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    if (onClose) onClose();
    router.push('/');
  };

  const menuItems = [
    {
      id: 'profile',
      label: 'My Profile',
      icon: User,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      action: () => setActiveTab('profile_edit'),
    },
    {
      id: 'goals',
      label: 'Goals',
      icon: Target,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      action: () => setActiveTab('goals'),
    },
    {
      id: 'weight-progress',
      label: 'Weight Progress',
      icon: Scale,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      action: () => setActiveTab('weight'),
    },
    
    {
      id: 'nutrition',
      label: 'Nutrition',
      icon: PieChart,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      action: () => setActiveTab('nutrition'),
    },
    // {
    //   id: 'my-meals',
    //   label: 'My Meals, Recipes & Foods',
    //   icon: Utensils,
    //   color: 'text-orange-400',
    //   bgColor: 'bg-orange-500/10',
    //   action: () => setActiveTab('meals'),
    // },
    {
      id: 'reminders',
      label: 'Reminders',
      icon: Bell,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      action: () => setActiveTab('reminders'),
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: ShieldCheck,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      action: () => setActiveTab('privacy'),
    },
    {
      id: 'help',
      label: 'Help',
      icon: HelpCircle,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/10',
      action: () => setActiveTab('help'),
    },
  ];

  // WeightProgressTab manages its own internal scroll container (it needs a
  // sticky header inside it), so this wrapper must NOT also scroll for that
  // tab — otherwise you'd get two nested scrollbars.
  const wrapperScrollClasses = activeTab === 'weight' ? '' : `max-h-[70vh] overflow-y-auto ${scrollbarClasses}`;
  const wrapperScrollStyle = activeTab === 'weight' ? {} : scrollbarStyle;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="w-full max-w-xl bg-[#121A2A] border border-gray-800/80 rounded-2xl shadow-2xl overflow-hidden relative my-auto">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-gray-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {activeTab !== 'menu' && (
              <button
                type="button"
                onClick={() => setActiveTab('menu')}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1C2638] mr-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-base font-bold text-white tracking-tight">
              {activeTab === 'menu'
                ? 'More'
                : activeTab === 'profile_edit'
                ? 'Profile'
                : activeTab === 'weight'
                ? 'Measurements'
                : activeTab === 'nutrition'
                ? 'Nutrition'
                : activeTab.toUpperCase()}
            </h2>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#1C2638]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PROFILE HEADER BANNER */}
        {activeTab === 'menu' && (
          <ProfileHeader user={user} targetCalories={user?.targetCalories || 2000} />
        )}

        {/* VIEW CONTENTS */}
        <div
          className={`${activeTab === 'weight' ? 'p-0' : ''} ${wrapperScrollClasses}`}
          style={wrapperScrollStyle}
        >
          {activeTab === 'menu' && (
            <div className="divide-y divide-gray-800/60">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-[#161F30] transition-colors group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${item.bgColor} border border-gray-800`}>
                        <Icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors" />
                  </button>
                );
              })}

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-3.5 hover:bg-red-950/20 transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-red-500/10 border border-gray-800">
                    <LogOut className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-red-400 group-hover:text-red-300 transition-colors">
                    Log out
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-red-400 transition-colors" />
              </button>
            </div>
          )}

          {activeTab === 'profile_edit' && (
            <div className="p-5">
              <MyProfileTab
                user={user}
                onUpdateUser={onUpdateUser}
                onNavigateToGoals={() => setActiveTab('goals')}
              />
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="p-5">
              <GoalsTab
                formData={formData}
                handleChange={handleChange}
                weightUnit={weightUnit}
                handleWeightUnitToggle={setWeightUnit}
                onClose={onClose}
                onSaveSuccess={(updatedUser) => {
                  setFormData((prev) => ({
                    ...prev,
                    ...updatedUser,
                  }));
                  if (typeof onUpdateUser === 'function') {
                    onUpdateUser(updatedUser);
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'weight' && (
            <WeightProgressTab user={user} onUpdateUser={onUpdateUser} />
          )}

          {activeTab === 'nutrition' && (
            <div className="p-5">
              <NutritionTab user={user} />
            </div>
          )}

          {activeTab === 'meals' && (
            <div className="p-5 space-y-6">
              <MyMealsTab />
              <RecipesTab />
            </div>
          )}

          {activeTab === 'steps' && (
            <StepsTab user={user} />
          )}
        </div>

      </div>
    </div>
  );
}