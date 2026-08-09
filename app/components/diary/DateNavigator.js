// app/components/diary/DateNavigator.js
'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function DateNavigator({ selectedDate, onDateChange }) {
  // Format dates for friendly display text (e.g., "Today", "Yesterday", "Tomorrow")
  const getDisplayDateText = (dateStr) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const formatISO = (d) => d.toISOString().split('T')[0];
    
    if (dateStr === formatISO(today)) return 'Today';
    if (dateStr === formatISO(yesterday)) return 'Yesterday';
    if (dateStr === formatISO(tomorrow)) return 'Tomorrow';

    // Fallback formatting for older days: "July 9, 2026"
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const adjustDate = (daysOffset) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + daysOffset);
    const destinationString = current.toISOString().split('T')[0];
    onDateChange(destinationString);
  };

  return (
    <div className="flex items-center justify-between bg-[#121A2A] border border-gray-800/60 rounded-2xl p-4 mb-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-[#161F30] border border-gray-800 rounded-xl text-gray-400">
          <Calendar className="w-4 h-4 text-[#00A86B]" />
        </div>
        <div>
          <h4 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Time Matrix Horizon</h4>
          <p className="text-sm font-black text-white mt-0.5">{getDisplayDateText(selectedDate)}</p>
        </div>
      </div>

      {/* Navigation Switch Arrows */}
      <div className="flex items-center space-x-1.5">
        <button 
          onClick={() => adjustDate(-1)}
          className="p-2 bg-[#161F30] hover:bg-[#1C2638] border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white rounded-xl transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <input 
          type="date" 
          value={selectedDate} 
          onChange={(e) => onDateChange(e.target.value)}
          className="bg-[#161F30] border border-gray-800 hover:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-[#00A86B] cursor-pointer transition-all"
        />

        <button 
          onClick={() => adjustDate(1)}
          className="p-2 bg-[#161F30] hover:bg-[#1C2638] border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white rounded-xl transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}