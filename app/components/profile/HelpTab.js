'use client';

import { CircleHelp, BookOpen, RefreshCw } from 'lucide-react';

const faqs = [
  {
    question: 'How do I log a meal?',
    answer: 'Open Food Diary from the dashboard, choose the date and meal, then search for a food or select one of your saved foods. Check the serving size and amount before adding it to your diary.',
  },
  {
    question: 'How do I track my water intake?',
    answer: 'Use the water tracker on the dashboard or in Food Diary. Choose a quick-add amount to update your daily total. Your saved total remains available when you return to that date.',
  },
  {
    question: 'Where can I update my profile and goals?',
    answer: 'Open Profile from the dashboard. Choose My Profile to edit your account details and photo, or choose Goals to adjust your nutrition and weight targets.',
  },
  {
    question: 'Why is an AI analysis or suggestion unavailable?',
    answer: 'AI services can temporarily be busy or reach their usage limits. Try again later. You can continue logging food, water, and progress even when AI features are unavailable.',
  },
  {
    question: 'What should I do if my latest changes are not showing?',
    answer: 'Check that you are signed in to the correct account and have an internet connection, then refresh the page. Reopen the relevant diary date or profile section to check the saved information.',
  },
];

export default function HelpTab() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4">
        <div className="mb-2 flex items-center gap-2">
          <CircleHelp className="h-5 w-5 text-teal-300" />
          <h3 className="text-sm font-bold text-white">How can we help?</h3>
        </div>
        <p className="text-xs leading-relaxed text-gray-300">
          Find quick answers to common questions about using NutriAI.
        </p>
      </div>

      <section className="space-y-2">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Frequently asked questions</h4>
        </div>
        {faqs.map(({ question, answer }) => (
          <details key={question} className="group rounded-xl border border-gray-800 bg-[#0E1726] p-4">
            <summary className="cursor-pointer list-none text-xs font-semibold text-white marker:hidden">
              <span className="flex items-center justify-between gap-3">
                {question}
                <span className="text-lg leading-none text-gray-500 transition-transform group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="mt-3 border-t border-gray-800 pt-3 text-xs leading-relaxed text-gray-400">
              {answer}
            </p>
          </details>
        ))}
      </section>

      <div className="rounded-xl border border-gray-800 bg-[#0E1726] p-4">
        <div className="mb-1 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-white">Quick troubleshooting</h4>
        </div>
        <p className="text-xs leading-relaxed text-gray-400">
          When a screen does not update, check your connection and refresh the page. For AI-only errors, wait and retry later; your regular tracking tools remain available.
        </p>
      </div>
    </div>
  );
}
