'use client';

import { Database, UserRound, Utensils, Sparkles, Image as ImageIcon, ShieldCheck } from 'lucide-react';

const sections = [
  {
    icon: UserRound,
    title: 'Account and profile information',
    description: 'Your name, email address, goals, measurements, and profile photo are connected to your account so NutriAI can personalize your profile.',
  },
  {
    icon: Utensils,
    title: 'Nutrition and progress records',
    description: 'Food entries, water intake, weight progress, and related tracking information are used to show your diary, dashboard, and reports.',
  },
  {
    icon: Sparkles,
    title: 'AI features',
    description: 'When you request an AI analysis or suggestion, the nutrition context needed for that feature is sent to the AI provider configured for NutriAI. AI availability does not prevent you from using food or water tracking.',
  },
  {
    icon: ImageIcon,
    title: 'Profile photo',
    description: 'The photo you upload is resized before it is saved with your account and is displayed in your profile areas. You can replace or remove it from My Profile.',
  },
];

export default function PrivacyTab({ user }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-blue-300">
          <ShieldCheck className="h-5 w-5" />
          <h3 className="text-sm font-bold text-white">Privacy and data overview</h3>
        </div>
        <p className="text-xs leading-relaxed text-gray-300">
          NutriAI uses account information and the records you enter to provide your personal nutrition-tracking experience.
        </p>
        {user?.email && (
          <p className="mt-3 break-all text-[11px] text-gray-500">
            Signed in as <span className="font-semibold text-gray-300">{user.email}</span>
          </p>
        )}
      </div>

      <div className="space-y-3">
        {sections.map(({ icon: Icon, title, description }) => (
          <section key={title} className="rounded-xl border border-gray-800 bg-[#0E1726] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Icon className="h-4 w-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white">{title}</h4>
            </div>
            <p className="text-xs leading-relaxed text-gray-400">{description}</p>
          </section>
        ))}
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#0E1726] p-4">
        <div className="mb-1 flex items-center gap-2">
          <Database className="h-4 w-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-white">Managing your information</h4>
        </div>
        <p className="text-xs leading-relaxed text-gray-400">
          You can edit your personal details and profile photo in My Profile, update targets in Goals, and manage your nutrition entries from Food Diary. Review entries before saving to keep your records accurate.
        </p>
      </div>
    </div>
  );
}
