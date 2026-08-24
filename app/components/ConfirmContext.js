'use client';

import { createContext, useContext, useState } from 'react';

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    resolvePromise: null
  });

  const confirm = (options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || 'Are you sure?',
        message: options.message || '',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'danger',
        resolvePromise: resolve
      });
    });
  };

  const handleClose = (result) => {
    if (confirmState.resolvePromise) {
      confirmState.resolvePromise(result);
    }
    setConfirmState((prev) => ({ ...prev, isOpen: false, resolvePromise: null }));
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-sm bg-[#161F30] border border-gray-800 rounded-2xl p-5 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-white mb-2">{confirmState.title}</h3>
            <p className="text-sm text-gray-300 mb-6">{confirmState.message}</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleClose(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                {confirmState.cancelText}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={`flex-1 font-bold py-2.5 rounded-xl text-sm transition-colors ${
                  confirmState.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-black'
                }`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}