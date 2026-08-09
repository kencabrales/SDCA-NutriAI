'use client';

import { useState } from 'react';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';

export default function Home() {
  const [activeModal, setActiveModal] = useState('none'); // 'none', 'login', or 'register'
  const [passedEmail, setPassedEmail] = useState('');

  const openLogin = (email = '') => {
    setPassedEmail(email);
    setActiveModal('login');
  };

  return (
    <main className="min-h-screen bg-[#0B121F] text-white flex flex-col justify-between selection:bg-[#00A86B]/30 selection:text-white">

      {/* Navbar */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-[#00A86B] text-xl font-bold tracking-tight">logo</span>
          <span className="text-xl font-bold tracking-tight text-white">NutriAI</span>
        </div>
        <button 
          onClick={() => openLogin('')} 
          className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          Login
        </button>
      </header>

      {/* Hero Content */}
      <section className="max-w-4xl mx-auto px-6 text-center my-auto py-12 flex flex-col items-center">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
          Your Personal <br />
          <span className="text-[#00A86B]">AI Nutritionist</span>
        </h1>
        
        <p className="text-gray-400 text-base md:text-lg max-w-2xl mb-8 leading-relaxed">
          Connect your smart scale via Bluetooth, weigh your food, and let AI analyze your nutrition instantly. No more manual guessing.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center mb-16">
          <button 
            onClick={() => setActiveModal('register')}
            className="inline-flex items-center justify-center bg-[#00A86B] text-white font-semibold px-6 py-3.5 rounded-xl shadow-[0_0_20px_rgba(0,168,107,0.3)] hover:bg-[#00945D] transition-all group text-sm"
          >
            Get Started
            <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <button 
            onClick={() => openLogin('')}
            className="bg-[#1A2333] border border-gray-800 text-gray-200 font-semibold px-6 py-3.5 rounded-xl hover:bg-[#222D42] hover:text-white transition-colors text-center text-sm"
          >
            I have an account
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left max-w-5xl mt-4">
          <div className="bg-[#121A2A] border border-gray-900 rounded-2xl p-6">
            <div className="w-10 h-10 bg-[#1A2333] rounded-xl flex items-center justify-center mb-4 text-[#00A86B] text-lg">🌐</div>
            <h3 className="font-bold text-lg text-white mb-2">IoT Enabled</h3>
            <p className="text-gray-400 text-sm">Connects directly to Bluetooth scales for real-time precision weighing.</p>
          </div>
          <div className="bg-[#121A2A] border border-gray-900 rounded-2xl p-6">
            <div className="w-10 h-10 bg-[#1A2333] rounded-xl flex items-center justify-center mb-4 text-purple-400 text-lg">🧠</div>
            <h3 className="font-bold text-lg text-white mb-2">AI Powered</h3>
            <p className="text-gray-400 text-sm">AI Nutritionist calculates macros and gives personalized health advice.</p>
          </div>
          <div className="bg-[#121A2A] border border-gray-900 rounded-2xl p-6">
            <div className="w-10 h-10 bg-[#1A2333] rounded-xl flex items-center justify-center mb-4 text-emerald-400 text-lg">⚖️</div>
            <h3 className="font-bold text-lg text-white mb-2">Smart Tracking</h3>
            <p className="text-gray-400 text-sm">Offline-capable PWA that syncs your progress when back online.</p>
          </div>
        </div>
      </section>

      <footer className="py-4 text-center text-xs text-gray-600">
        &copy; {new Date().getFullYear()} NutriAI. All rights reserved.
      </footer>

      {/* Registration at Login modal sa baba */}
      <RegisterModal 
        isOpen={activeModal === 'register'} 
        onClose={() => setActiveModal('none')} 
        onSwitchToLogin={(email) => openLogin(email)} 
      />

      <LoginModal 
        isOpen={activeModal === 'login'} 
        onClose={() => setActiveModal('none')} 
        onSwitchToRegister={() => setActiveModal('register')} 
        initialEmail={passedEmail}
      />
    </main>
  );
}