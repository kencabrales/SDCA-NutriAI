'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8 || password.length > 128 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Use at least 8 characters, including one uppercase letter and one number.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to reset your password.');
      setMessage(data.message || 'Your password has been reset. You can now sign in.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B121F] text-white flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#121A2A] p-7 shadow-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-7">
          <ArrowLeft className="w-4 h-4" /> Back to NutriAI
        </Link>
        <div className="mb-6">
          <div className="mb-4 inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-400"><Lock className="w-6 h-6" /></div>
          <h1 className="text-2xl font-bold">Create a new password</h1>
          <p className="mt-2 text-sm text-gray-400">Your password must be at least 8 characters, with one uppercase letter and one number. Special characters are optional.</p>
        </div>
        {message ? (
          <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4 text-sm leading-relaxed text-emerald-200" role="status">
            <CheckCircle2 className="inline w-4 h-4 mr-2" />{message}
            <div className="mt-4"><Link href="/" className="font-semibold text-emerald-300 hover:underline">Return to login</Link></div>
          </div>
        ) : !token ? (
          <p className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-4 text-sm text-amber-200">This password reset link is missing or invalid. Request a new one from the login page.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-xs font-semibold text-gray-300" htmlFor="new-password">New password</label>
            <input id="new-password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-gray-700 bg-[#1C2638] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" />
            <label className="block text-xs font-semibold text-gray-300" htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-gray-700 bg-[#1C2638] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" />
            {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-[#00A86B] py-3 text-sm font-bold text-white hover:bg-[#00945D] disabled:opacity-50">{loading ? 'Updating…' : 'Reset password'}</button>
          </form>
        )}
      </section>
    </main>
  );
}
