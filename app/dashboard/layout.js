'use client';

import { BluetoothScaleProvider } from '../components/BluetoothScaleContext';

export default function DashboardLayout({ children }) {
  return <BluetoothScaleProvider>{children}</BluetoothScaleProvider>;
}