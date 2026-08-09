'use client';

import { useState, useEffect } from 'react'; 
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, X } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onSwitchToRegister, initialEmail }) {
  const [form, setForm] = useState({ email: initialEmail || '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (initialEmail && form.email === '') {
      setForm((prev) => ({ ...prev, email: initialEmail }));
    }
  }, [initialEmail]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid email or password');

      localStorage.setItem('user', JSON.stringify(data.user));
      onClose();
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-[#121A2A] border border-gray-800/60 rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Close Button */}
        <button onClick={onClose} className="absolute right-4 top-4 text-emerald-200/60 hover:text-white transition-colors p-1 z-10">
          <X className="w-5 h-5" />
        </button>
        
        {/* Header Banner Area */}
        <div className="bg-[#00A86B] px-8 py-6 text-center">
          <h2 className="text-3xl font-extrabold text-white tracking-wide">NutriAI</h2>
          <p className="text-emerald-100/80 text-xs font-medium mt-1">Login to your AI Coach</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm mb-6 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input 
                type="email" required placeholder="Email" value={form.email} 
                className="w-full bg-[#1C2638] border border-gray-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00A86B] transition-colors" 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input 
                type={showPassword ? "text" : "password"} required placeholder="Password" value={form.password} 
                className="w-full bg-[#1C2638] border border-gray-800 rounded-xl pl-11 pr-11 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00A86B] transition-colors" 
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
              />
              <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-[#00A86B] hover:bg-[#00945D] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 mt-2 text-sm">
              {loading ? 'Verifying...' : 'Login'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            No account? <button onClick={onSwitchToRegister} className="text-[#00A86B] hover:underline font-semibold ml-1">Sign up</button>
          </p>
        </div>
      </div>
    </div>
  );
}