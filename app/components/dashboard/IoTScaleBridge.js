'use client';

import { Activity, Brain, Scale, RotateCcw } from 'lucide-react';
import { useBluetoothScale } from '../BluetoothScaleContext';

function formatGrams(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function IoTScaleBridge() {
  const {
    isConnected,
    status: btStatus,
    liveWeightGrams,
    tareOffsetGrams,
    netWeightGrams,
    lastPacketHex,
    tare,
    clearTare,
    connect,
    disconnect,
  } = useBluetoothScale();

  const status = isConnected ? 'Connected' : 'Offline';

  return (
    <div className="bg-[#121A2A] border border-gray-800/80 rounded-2xl p-3.5 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-[#00A86B]/10 border border-[#00A86B]/20 text-[#00A86B]">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">NutriAI Scale & Portion Station</h3>
            <p className="text-[10px] text-gray-500">Live Bluetooth weighing and portion measurement</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0B121F] border border-gray-800 px-2.5 py-0.5 rounded-full">
          {status === 'Offline' ? (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
          ) : (
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
          )}
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{status}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={isConnected ? disconnect : connect}
        className="w-full border border-dashed border-gray-800 rounded-xl p-3 text-center bg-[#0B121F]/50 flex items-center justify-center gap-3 hover:border-[#00A86B]/50 transition-colors"
      >
        <div className="p-1.5 bg-[#161F30] rounded-lg border border-gray-800">
          <Brain className="w-4 h-4 text-gray-500" />
        </div>
        <div className="text-left">
          <p className="text-xs font-bold text-gray-300">
            {isConnected ? 'Bluetooth scale connected' : 'Tap to connect your scale'}
          </p>
          <p className="text-[10px] text-gray-500">{btStatus}</p>
        </div>
      </button>

      {isConnected && (
        <>
          <div className="rounded-xl border border-gray-800 bg-[#0B121F] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Net weight</span>
              <span className="text-[10px] text-gray-500">grams</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-3xl font-black tabular-nums ${netWeightGrams !== null && netWeightGrams < 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                {formatGrams(netWeightGrams)}
              </span>
              <span className="text-xs font-semibold text-gray-500">g</span>
            </div>
            <p className="mt-2 text-[10px] text-gray-500">
              Raw scale: {formatGrams(liveWeightGrams)} g
              {tareOffsetGrams !== 0 ? ' · Software tare: ' + formatGrams(tareOffsetGrams) + ' g' : ' · No software tare'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={tare}
              disabled={liveWeightGrams === null}
              title="Subtract the current reading as the empty-container weight. This does not send a tare command to the scale."
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00A86B] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#00945D] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Scale className="h-3.5 w-3.5" />
              Software Tare
            </button>
            <button
              type="button"
              onClick={clearTare}
              disabled={tareOffsetGrams === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-700 bg-[#161F30] px-3 py-2.5 text-xs font-bold text-gray-300 transition hover:bg-[#1C2638] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Tare
            </button>
          </div>

          <div className="rounded-lg border border-gray-800 bg-[#0B121F]/70 p-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Bluetooth packet (diagnostic)</p>
            <p className="mt-1 break-all font-mono text-[10px] text-gray-400">{lastPacketHex || 'Waiting for packet…'}</p>
          </div>

          <p className="text-[10px] leading-relaxed text-gray-500">
            Software Tare subtracts the current container reading inside NutriAI. It does not physically zero the scale or send a command to the hardware.
          </p>
        </>
      )}
    </div>
  );
}
