'use client';

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const BluetoothScaleContext = createContext(null);

export function BluetoothScaleProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Tap to Connect Scale');
  const [liveWeightGrams, setLiveWeightGrams] = useState(null);
  const [lastPacketHex, setLastPacketHex] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [gattInventory, setGattInventory] = useState([]);

  const serverRef = useRef(null);
  const charRef = useRef(null);

  const handleWeightPacket = useCallback((event) => {
    const data = event.target.value;
    if (!data || data.byteLength < 10) return;

    // Capture the full manufacturer-specific frame for sign-byte inspection.
    // The scale uses a custom 0xFFF0/0xFFF1 protocol, so do not guess that
    // bytes 8-9 are two's-complement until the negative frame is verified.
    const packetHex = Array.from(
      { length: data.byteLength },
      (_, index) => data.getUint8(index).toString(16).padStart(2, '0')
    ).join(' ').toUpperCase();
    setLastPacketHex(packetHex);

    // Keep the already-working magnitude extraction unchanged for now.
    setLiveWeightGrams(data.getUint16(8, false));
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
    setLastPacketHex('');
    setDeviceName('');
    setGattInventory([]);
    setStatus('Tap to Connect Scale');
  }, [handleWeightPacket]);

  const connect = useCallback(async () => {
    if (isConnected) return;

    if (!navigator.bluetooth) {
      alert('Web Bluetooth is not supported on this browser/device. Please use Google Chrome or Edge.');
      return;
    }

    try {
      setLastPacketHex('');
      setGattInventory([]);
      setDeviceName('');
      setStatus('Scanning...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [0xFFF0] }],
        optionalServices: [0xFFF0],
      });

      setDeviceName(device.name || 'Unnamed Bluetooth device');
      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setLiveWeightGrams(null);
        setLastPacketHex('');
        setGattInventory([]);
        setStatus('Disconnected. Tap to Reconnect');
      });

      setStatus('Connecting...');
      const server = await device.gatt.connect();
      serverRef.current = server;

      const service = await server.getPrimaryService(0xFFF0);

      // Read-only capability discovery: inspect characteristics exposed by the
      // already-authorized service. Never send an unverified tare payload.
      try {
        const availableCharacteristics = await service.getCharacteristics();
        setGattInventory([{
          serviceUuid: service.uuid,
          characteristics: availableCharacteristics.map((item) => ({
            uuid: item.uuid,
            properties: Object.entries({
              read: item.properties.read,
              write: item.properties.write,
              writeWithoutResponse: item.properties.writeWithoutResponse,
              notify: item.properties.notify,
              indicate: item.properties.indicate,
              authenticatedSignedWrites: item.properties.authenticatedSignedWrites,
              reliableWrite: item.properties.reliableWrite,
              writableAuxiliaries: item.properties.writableAuxiliaries,
            })
              .filter(([, supported]) => Boolean(supported))
              .map(([property]) => property),
          })),
        }]);
      } catch (inventoryError) {
        console.warn('BLE characteristic capability inspection failed:', inventoryError);
        setGattInventory([]);
      }

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
    <BluetoothScaleContext.Provider value={{ isConnected, status, liveWeightGrams, lastPacketHex, deviceName, gattInventory, connect, disconnect }}>
      {children}
    </BluetoothScaleContext.Provider>
  );
}

export function useBluetoothScale() {
  const ctx = useContext(BluetoothScaleContext);
  if (!ctx) throw new Error('useBluetoothScale must be used inside <BluetoothScaleProvider>');
  return ctx;
}