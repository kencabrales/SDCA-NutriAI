// components/Toast.js
'use client';

import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function Toast({ show, title, message, type = 'error', onClose }) {
  if (!show) return null;

  const isSuccess = type === 'success';

  return (
    <div 
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl max-w-sm w-11/12 border transition-all animate-in fade-in slide-in-from-bottom-5 ${
        isSuccess 
          ? 'bg-[#161F30] border-emerald-500/40 text-white' 
          : 'bg-[#2A1215] border-red-600/80 text-white'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      )}
      
      <div className="flex-1 min-w-0">
        {title && (
          <h5 className={`text-xs font-bold mb-0.5 ${isSuccess ? 'text-white' : 'text-red-200'}`}>
            {title}
          </h5>
        )}
        <p className={`text-xs leading-snug ${isSuccess ? 'text-gray-300' : 'text-red-100/90'}`}>
          {message}
        </p>
      </div>

      <button 
        onClick={onClose} 
        className={`p-0.5 transition-colors ${
          isSuccess ? 'text-gray-400 hover:text-white' : 'text-red-300 hover:text-white'
        }`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}