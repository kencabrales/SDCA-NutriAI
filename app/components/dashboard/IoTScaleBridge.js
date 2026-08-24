import { Activity, Brain } from 'lucide-react';

export default function IoTScaleBridge({ status = 'Offline' }) {
  return (
    <div className="bg-[#121A2A] border border-gray-800/80 rounded-2xl p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-[#00A86B]/10 border border-[#00A86B]/20 text-[#00A86B]">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">NutriAI Scale & Portion Station</h3>
            <p className="text-[10px] text-gray-500">Live IoT Weighing Scale telemetry and smart portion syncing</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0B121F] border border-gray-800 px-2.5 py-0.5 rounded-full">
          {status === 'Offline' && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
          )}
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{status}</span>
        </div>
      </div>

      <div className="border border-dashed border-gray-800 rounded-xl p-3 text-center bg-[#0B121F]/50 flex items-center justify-center gap-3">
        <div className="p-1.5 bg-[#161F30] rounded-lg border border-gray-800">
          <Brain className="w-4 h-4 text-gray-500" />
        </div>
        <div className="text-left">
          <p className="text-xs font-bold text-gray-300">NutriAI Scale Interface Standing By</p>
          <p className="text-[10px] text-gray-500">
            Awaiting local load cell telemetry streams via Web Bluetooth or WiFi bridge.
          </p>
        </div>
      </div>
    </div>
  );
}