'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';
import Header from '@/components/Header';
import ActionLogger from '@/components/ActionLogger';
import GlobalAnnouncements from '@/components/GlobalAnnouncements';
import EcoScannerDialog from './EcoScannerDialog';

export default function DashboardPage() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isActionLoggerOpen, setIsActionLoggerOpen] = useState(false);

  return (
    <>
      <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
      <GlobalAnnouncements position="top" maxVisible={2} />
      <Dashboard />

      <div className="flex justify-center gap-4 mt-8">
        <button
          onClick={() => setIsActionLoggerOpen(true)}
          className="bg-green-600 text-white px-6 py-3 rounded-xl shadow hover:bg-green-700 transition flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          Log Eco-Action
        </button>
        <button
          onClick={() => setIsScannerOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow hover:bg-blue-700 transition flex items-center gap-2"
        >
          <i className="fas fa-camera"></i>
          Open Scanner
        </button>
      </div>

      <ActionLogger
        isOpen={isActionLoggerOpen}
        onClose={() => setIsActionLoggerOpen(false)}
      />

      <EcoScannerDialog
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </>
  );
}
