'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';
import Header from '@/components/Header';
import EcoScannerDialog from './EcoScannerDialog';

export default function DashboardPage() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  return (
    <>
      <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
      <Dashboard />

      <div className="flex justify-center mt-8">
        <button
          onClick={() => setIsScannerOpen(true)}
          className="bg-green-600 text-white px-6 py-3 rounded-xl shadow hover:bg-green-700 transition"
        >
          Open Eco Scanner
        </button>
      </div>

      <EcoScannerDialog
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </>
  );
}
