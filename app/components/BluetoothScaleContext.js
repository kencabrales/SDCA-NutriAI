'use client';

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const BluetoothScaleContext = createContext(null);

export function BluetoothScaleProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Tap to Connect Scale');
  const [liveWeightGrams, setLiveWeightGrams] = useState(null);
  const [tareOffsetGrams, setTareOffsetGrams] = useState(0);
  const [lastPacketHex, setLastPacketHex] = useState('');

  const serverRef = useRef(null);
  const charRef = useRef(null);
  const latestWeightRef = useRef(null);

  const handleWeightPacket = useCallback((event) => {
    const data = event.target.value;
    if (!data || data.byteLength < 10) return;

    // Keep the packet visible while validating the scale's sign encoding.
    const packetHex = Array.from(
      { length: data.byteLength },
      (_, index) => data.getUint8(index).toString(16).padStart(2, '0')
    ).join(' ').toUpperCase();
    setLastPacketHex(packetHex);

    // Existing device packet layout: bytes 8-9, big-endian.
    // Int16 reads two's-complement signed values instead of converting
    // negative values into a large unsigned integer.
    const weight = data.getInt16(8, false);
    latestWeightRef.current = weight;
    setLiveWeightGrams(weight);
  }, []);

  const tare = useCallback(() => {
    const currentWeight = latestWeightRef.current;
    if (!isConnected || !Number.isFinite(currentWeight)) return false;

    // Software tare: remember the current reading as the empty-container
    // baseline. Future readings display current raw weight minus this value.
    setTareOffsetGrams(currentWeight);
    return true;
  }, [isConnected]);

  const clearTare = useCallback(() => {
    setTareOffsetGrams(0);
  }, []);

  const disconnect = useCallback(() => {
    try {
      charRef.current?.removeEventListener('characteristicvaluechanged', handleWeightPacket);
      if (serverRef.current?.connected) serverRef.current.disconnect();
    } catch (err) {
      console.error('BLE disconnect error:', err);
    }

    serverRef.current = null;
    charRef.current = null;
    latestWeightRef.current = null;
    setIsConnected(false);
    setLiveWeightGrams(null);
    setTareOffsetGrams(0);
    setLastPacketHex('');
    setStatus('Tap to Connect Scale');
  }, [handleWeightPacket]);

  const connect = useCallback(async () => {
    if (isConnected) return;

    if (!navigator.bluetooth) {
      alert('Web Bluetooth is not supported on this browser/device. Please use Google Chrome or Edge.');
      return;
    }

    try {
      setTareOffsetGrams(0);
      setLastPacketHex('');
      setStatus('Scanning...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [0xFFF0] }],
        optionalServices: [0xFFF0],
      });

      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setLiveWeightGrams(null);
        setTareOffsetGrams(0);
        setLastPacketHex('');
        latestWeightRef.current = null;
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
      setLiveWeightGrams(null);
      setTareOffsetGrams(0);
      latestWeightRef.current = null;
    }
  }, [isConnected, handleWeightPacket]);

  // Keep the active BLE connection scoped to the dashboard provider.
  useEffect(() => {
    return () => {
      try {
        charRef.current?.removeEventListener('characteristicvaluechanged', handleWeightPacket);
        if (serverRef.current?.connected) serverRef.current.disconnect();
      } catch (err) {
        console.error('BLE cleanup error:', err);
      }
    };
  }, [handleWeightPacket]);

  const netWeightGrams = liveWeightGrams === null
    ? null
    : liveWeightGrams - tareOffsetGrams;

  return (
    <BluetoothScaleContext.Provider
      value={{
        isConnected,
        status,
        liveWeightGrams,
        tareOffsetGrams,
        netWeightGrams,
        lastPacketHex,
        tare,
        clearTare,
        connect,
        disconnect,
      }}
    >
      {children}
    </BluetoothScaleContext.Provider>
  );
}

export function useBluetoothScale() {
  const ctx = useContext(BluetoothScaleContext);
  if (!ctx) throw new Error('useBluetoothScale must be used inside <BluetoothScaleProvider>');
  return ctx;
}
