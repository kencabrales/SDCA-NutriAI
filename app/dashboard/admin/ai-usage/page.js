'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, BrainCircuit, CheckCircle2, Clock3, Users, Zap } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const number = (value) => (Number(value) || 0).toLocaleString();

export default function AIUsageAdminPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem('user');
    if (!session) { router.replace('/'); return; }
    let parsed;
    try { parsed = JSON.parse(session); } catch { router.replace('/'); return; }
    if (!(parsed.role === 'admin' || parsed.isAdmin === true)) {
      setError('This page is available to administrator accounts only.');
      setLoading(false);
      return;
    }
    fetch(`/api/admin/ai-usage?userId=${encodeURIComponent(parsed.id || parsed._id)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load monitoring data.');
        setData(result);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  const cards = data ? [
    { label: 'Gemini requests', value: number(data.summary.requests), icon: Zap, detail: 'Successful and failed attempts' },
    { label: 'Cached responses', value: number(data.summary.cachedResponses), icon: Clock3, detail: 'Served without a Gemini call' },
    { label: 'Failed requests', value: number(data.summary.failedRequests), icon: Activity, detail: 'Non-quota failures' },
    { label: 'Quota errors', value: number(data.summary.quotaErrors), icon: BrainCircuit, detail: 'Gemini limit responses' },
    { label: 'Estimated tokens', value: number(data.summary.estimatedTokens), icon: CheckCircle2, detail: 'Approx. characters ÷ 4' },
  ] : [];

  return (
    <main className="min-h-screen bg-[#0B121F] text-white p-4 md:p-7">
      <div className="max-w-6xl mx-auto space-y-6">
        <button onClick={() => router.push('/dashboard')} className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </button>
        <header>
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-400 font-bold">Administration / Monitoring</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">AI Usage Overview</h1>
          <p className="text-sm text-gray-400 mt-1">Gemini activity over the last 30 days. Cached responses are counted separately.</p>
        </header>

        {loading && <p className="text-sm text-gray-400">Loading AI usage...</p>}
        {error && <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">{error}</div>}

        {data && <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {cards.map(({ label, value, icon: Icon, detail }) => (
              <div key={label} className="rounded-2xl border border-gray-800 bg-[#121A2A] p-4">
                <div className="flex items-center justify-between text-gray-400"><span className="text-xs">{label}</span><Icon className="w-4 h-4 text-cyan-400" /></div>
                <p className="text-2xl font-bold mt-3 tabular-nums">{value}</p>
                <p className="text-[10px] text-gray-500 mt-1">{detail}</p>
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-gray-800 bg-[#121A2A] p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-cyan-400" /><h2 className="font-semibold">Daily Gemini activity</h2></div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
                  <CartesianGrid stroke="#263246" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#8290A5" fontSize={10} tickFormatter={(value) => value.slice(5)} />
                  <YAxis stroke="#8290A5" fontSize={10} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#121A2A', border: '1px solid #334155', borderRadius: 12 }} />
                  <Bar dataKey="requests" name="Gemini requests" fill="#06B6D4" radius={[4,4,0,0]} />
                  <Bar dataKey="cached" name="Cached responses" fill="#10B981" radius={[4,4,0,0]} />
                  <Bar dataKey="failed" name="Failed" fill="#F59E0B" radius={[4,4,0,0]} />
                  <Bar dataKey="quota" name="Quota errors" fill="#EF4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-[#121A2A] p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4"><Users className="w-4 h-4 text-cyan-400" /><h2 className="font-semibold">Usage per user</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800"><tr><th className="py-3 pr-3">User</th><th className="py-3 px-3">Requests</th><th className="py-3 px-3">Cached</th><th className="py-3 px-3">Failures</th><th className="py-3 pl-3 text-right">Est. tokens</th></tr></thead>
                <tbody>{data.perUser.map((item) => <tr key={item.userId} className="border-b border-gray-800/60 last:border-0"><td className="py-3 pr-3">{item.user}</td><td className="py-3 px-3 tabular-nums">{number(item.requests)}</td><td className="py-3 px-3 tabular-nums">{number(item.cached)}</td><td className="py-3 px-3 tabular-nums">{number(item.failed)}</td><td className="py-3 pl-3 text-right tabular-nums">{number(item.tokens)}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
          <p className="text-[10px] text-gray-600">Token counts are estimates based on text length, not Gemini's official usage metadata. Monitoring starts after this feature is deployed; it does not reconstruct older requests.</p>
        </>}
      </div>
    </main>
  );
}
