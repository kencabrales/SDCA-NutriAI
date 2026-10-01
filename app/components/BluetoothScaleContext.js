'use client';

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const BluetoothScaleContext = createContext(null);

export function BluetoothScaleProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Tap to Connect Scale');
  const [liveWeightGrams, setLiveWeightGrams] = useState(null);

  const serverRef = useRef(null);
  const charRef = useRef(null);

  const handleWeightPacket = useCallback((event) => {
    const data = event.target.value;
    if (data.byteLength >= 10) {
      setLiveWeightGrams(data.getUint16(8, false));
    }
  }, []);

  const disconnect = useCallback(() => {
    try {
      charRef.current?.removeEventListener('characteristicvaluechanged', handleWeightPacket);
      if (serverRef.current?.connected) serverRef.current.disconnect();
    } catch (err) {
      console.error('BLE disconnect error:', err);
    }
    setIsConnected(false);
    setLiveWeightGrams(null);
    setStatus('Tap to Connect Scale');
  }, [handleWeightPacket]);

  const connect = useCallback(async () => {
    if (isConnected) return;

    if (!navigator.bluetooth) {
      alert('Web Bluetooth is not supported on this browser/device. Please use Google Chrome or Edge.');
      return;
    }

    try {
      setStatus('Scanning...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [0xFFF0] }],
        optionalServices: [0xFFF0],
      });

      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setLiveWeightGrams(null);
        setStatus('Disconnected. Tap to Reconnect');
      });

      setStatus('Connecting...');
      const server = await device.gatt.connect();
      serverRef.current = server;

      const service = await server.getPrimaryService(0xFFF0);
      const characteristic = await service.getCharacteristic(0xFFF1);
      charRef.current = characteristic;

      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleWeightPacket);

      setIsConnected(true);
      setStatus('Connected Live');
    } catch (err) {
      console.error('BLE Error:', err);
      setStatus('Connection Failed. Retry?');
      setIsConnected(false);
    }
  }, [isConnected, handleWeightPacket]);

  // Only disconnect when leaving /dashboard entirely
  useEffect(() => {
    return () => {
      try {
        if (serverRef.current?.connected) serverRef.current.disconnect();
      } catch {}
    };
  }, []);

  return (
    <BluetoothScaleContext.Provider value={{ isConnected, status, liveWeightGrams, connect, disconnect }}>
      {children}
    </BluetoothScaleContext.Provider>
  );
}

export function useBluetoothScale() {
  const ctx = useContext(BluetoothScaleContext);
  if (!ctx) throw new Error('useBluetoothScale must be used inside <BluetoothScaleProvider>');
  return ctx;
}