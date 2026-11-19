'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to request a password reset.');
      setMessage(data.message || 'If an account with that email exists, a password reset link will be sent shortly.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to request a password reset.');
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
          <div className="mb-4 inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">Forgot Password?</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">Enter the email address associated with your NutriAI account. We will send a password reset link when an account matches.</p>
        </div>
        {message ? (
          <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4 text-sm leading-relaxed text-emerald-200" role="status">
            <CheckCircle2 className="inline w-4 h-4 mr-2" />{message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-xs font-semibold text-gray-300" htmlFor="reset-email">Email address</label>
            <input
              id="reset-email" type="email" required maxLength={254} autoComplete="email"
              value={email} onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-700 bg-[#1C2638] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
            />
            {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-[#00A86B] py-3 text-sm font-bold text-white hover:bg-[#00945D] disabled:opacity-50">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-xs text-gray-400">Remembered your password? <Link href="/" className="font-semibold text-emerald-400 hover:underline">Return to login</Link></p>
      </section>
    </main>
  );
}
