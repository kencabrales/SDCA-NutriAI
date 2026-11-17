'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, ArrowLeft, BrainCircuit, CheckCircle2, Clock3, RefreshCw,
  RotateCcw, Save, Settings2, Users, Zap, AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const number = (value) => (Number(value) || 0).toLocaleString();
const percent = (value, limit) => limit > 0 ? Math.min(100, Math.round((value / limit) * 100)) : null;

function QuotaMeter({ label, used, limit, suffix = '' }) {
  const ratio = percent(used, limit);
  const warning = ratio !== null && ratio >= 80;
  const critical = ratio !== null && ratio >= 95;
  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-3 text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-semibold tabular-nums">{number(used)}{suffix}{limit ? ` / ${number(limit)}${suffix}` : ' / limit not set'}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${critical ? 'bg-red-500' : warning ? 'bg-amber-400' : 'bg-cyan-500'}`}
          style={{ width: `${ratio ?? 0}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-500">
        {ratio === null ? 'Enter the limit shown in Google AI Studio to enable forecasting.' : `${ratio}% of configured limit`}
      </p>
    </div>
  );
}

export default function AIUsageAdminPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState('');
  const [data, setData] = useState(null);
  const [selectedKey, setSelectedKey] = useState('');
  const [limits, setLimits] = useState({ rpmLimit: '', tpmLimit: '', rpdLimit: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async (id) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/ai-usage?userId=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load monitoring data.');
      setData(result);
      const first = result.scopes?.[0];
      if (first && !selectedKey) setSelectedKey(first.key);
      return result;
    } catch (err) {
      setError(err.message || 'Unable to load monitoring data.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedKey]);

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
    const id = parsed.id || parsed._id;
    if (!id) { setError('Administrator session is missing its user ID.'); setLoading(false); return; }
    setAdminId(id);
    loadData(id);
  }, [router, loadData]);

  const selectedScope = useMemo(
    () => data?.scopes?.find((scope) => scope.key === selectedKey) || data?.scopes?.[0] || null,
    [data, selectedKey]
  );

  useEffect(() => {
    const saved = data?.settings?.find((item) =>
      item.projectLabel === selectedScope?.projectLabel && item.model === selectedScope?.model
    );
    setLimits({
      rpmLimit: saved?.rpmLimit ?? '',
      tpmLimit: saved?.tpmLimit ?? '',
      rpdLimit: saved?.rpdLimit ?? '',
    });
  }, [data, selectedScope?.projectLabel, selectedScope?.model]);

  const saveLimits = async () => {
    if (!selectedScope || !adminId) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/ai-usage/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adminId,
          projectLabel: selectedScope.projectLabel,
          model: selectedScope.model,
          ...limits,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save limits.');
      setNotice('Quota thresholds saved for this project and model.');
      await loadData(adminId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetHistory = async () => {
    if (!adminId || resetting) return;
    const confirmed = window.confirm(
      'Reset all stored NutriAI AI usage monitoring events? This clears dashboard history for every user, but does NOT reset Google Gemini quotas or billing.'
    );
    if (!confirmed) return;
    setResetting(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/ai-usage/reset?userId=${encodeURIComponent(adminId)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to reset monitoring history.');
      setNotice(`Cleared ${number(result.deletedCount)} stored usage events. Google quota was not changed.`);
      await loadData(adminId);
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  };

  const cards = data ? [
    { label: 'Gemini requests', value: number(data.summary.requests), icon: Zap, detail: 'Recorded provider attempts' },
    { label: 'Cached responses', value: number(data.summary.cachedResponses), icon: Clock3, detail: 'No new Gemini generation' },
    { label: 'Failed requests', value: number(data.summary.failedRequests), icon: Activity, detail: 'Non-quota failures' },
    { label: 'Quota errors', value: number(data.summary.quotaErrors), icon: BrainCircuit, detail: 'Provider quota responses' },
    { label: 'Tracked tokens', value: number(data.summary.actualTokens + Math.max(0, data.summary.estimatedTokens - data.summary.actualTokens)), icon: CheckCircle2, detail: 'Actual where recorded; estimates otherwise' },
  ] : [];

  return (
    <main className="min-h-screen bg-[#0B121F] text-white p-4 md:p-7">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push('/dashboard')} className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </button>
          <div className="flex gap-2">
            <button onClick={() => loadData(adminId)} disabled={!adminId || loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-gray-300 hover:bg-slate-800 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={resetHistory} disabled={!adminId || resetting} className="inline-flex items-center gap-2 rounded-lg border border-red-800/70 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-950/60 disabled:opacity-50">
              <RotateCcw className="w-3.5 h-3.5" /> {resetting ? 'Resetting...' : 'Reset monitoring data'}
            </button>
          </div>
        </div>

        <header>
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-400 font-bold">Administration / Monitoring</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">AI Usage Overview</h1>
          <p className="text-sm text-gray-400 mt-1">Monitor Gemini requests, recorded tokens, and configured project limits.</p>
        </header>

        {error && <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">{error}</div>}
        {notice && <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-4 text-sm text-emerald-200">{notice}</div>}
        {loading && <p className="text-sm text-gray-400">Loading AI usage...</p>}

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

          <section className="rounded-2xl border border-gray-800 bg-[#121A2A] p-4 md:p-5 space-y-4">
            <div className="flex items-center gap-2"><Settings2 className="w-4 h-4 text-cyan-400" /><h2 className="font-semibold">Gemini project quota monitor</h2></div>
            {data.scopes?.length ? <>
              <label className="block max-w-xl">
                <span className="text-xs text-gray-400">Project and model</span>
                <select value={selectedScope?.key || ''} onChange={(event) => setSelectedKey(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
                  {data.scopes.map((scope) => <option key={scope.key} value={scope.key}>{scope.projectLabel} — {scope.model}</option>)}
                </select>
              </label>
              {selectedScope ? <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <QuotaMeter label="Requests per minute (rolling 60s)" used={selectedScope.rpm} limit={selectedScope.limits.rpm} />
                <QuotaMeter label="Tokens per minute (rolling 60s)" used={selectedScope.tpm} limit={selectedScope.limits.tpm} />
                <QuotaMeter label="Requests per day (Pacific day)" used={selectedScope.rpd} limit={selectedScope.limits.rpd} />
              </div> : null}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-800 pt-4">
                {[
                  ['rpmLimit', 'RPM limit'],
                  ['tpmLimit', 'TPM limit'],
                  ['rpdLimit', 'RPD limit'],
                ].map(([key, label]) => <label key={key} className="text-xs text-gray-400">
                  {label}
                  <input type="number" min="1" value={limits[key]} onChange={(event) => setLimits((current) => ({ ...current, [key]: event.target.value }))} placeholder="Enter AI Studio limit" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600" />
                </label>)}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[10px] text-gray-500">Copy these limits from Google AI Studio for the selected project and model.</p>
                <button onClick={saveLimits} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50">
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save quota limits'}
                </button>
              </div>
            </> : <p className="text-sm text-gray-400">No labelled Gemini project activity has been recorded yet. New requests will appear here once logged.</p>}
            <p className="text-[10px] text-amber-300/80">These are application-side estimates based on recorded requests. Google AI Studio is authoritative for actual quota consumption. Cached responses are excluded from provider request/token windows. Historical events created before project/model tagging appear as legacy / unlabelled.</p>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-[#121A2A] p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-cyan-400" /><h2 className="font-semibold">Daily Gemini activity (last 30 days)</h2></div>
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
                <thead className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-800"><tr><th className="py-3 pr-3">User</th><th className="py-3 px-3">Requests</th><th className="py-3 px-3">Cached</th><th className="py-3 px-3">Failures</th><th className="py-3 pl-3 text-right">Tracked tokens</th></tr></thead>
                <tbody>{data.perUser.map((item) => <tr key={item.userId} className="border-b border-gray-800/60 last:border-0"><td className="py-3 pr-3">{item.user}</td><td className="py-3 px-3 tabular-nums">{number(item.requests)}</td><td className="py-3 px-3 tabular-nums">{number(item.cached)}</td><td className="py-3 px-3 tabular-nums">{number(item.failed)}</td><td className="py-3 pl-3 text-right tabular-nums">{number(item.tokens)}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
          <p className="text-[10px] text-gray-600">Historical records are limited to the last 30 days and up to 10,000 events. Token totals use Gemini-reported usage when available and text-length estimates otherwise. This monitor does not read Google billing or quota APIs.</p>
        </>}
      </div>
    </main>
  );
}
