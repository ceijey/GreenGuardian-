'use client';

import { useState } from 'react';
import Dashboard from '@/components/Dashboard';
import Header from '@/components/Header';
import ActionLogger from '@/components/ActionLogger';
import ResourceHub from '@/components/ResourceHub';
import GlobalAnnouncements from '@/components/GlobalAnnouncements';
import EcoScannerDialog from './EcoScannerDialog';

export default function DashboardPage() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isActionLoggerOpen, setIsActionLoggerOpen] = useState(false);

  return (
    <>
      <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
      <main className="main-content">
        <GlobalAnnouncements position="top" maxVisible={2} />
        <Dashboard />

      <div className="flex justify-center gap-4 mt-8">
  <div className="flex flex-row gap-4 mt-8 ml-8 items-center">
  <button
    onClick={() => setIsActionLoggerOpen(true)}
    className="bg-green-600 text-white px-12 py-8 rounded-full shadow-2xl hover:bg-green-700 hover:shadow-3xl transition-all duration-300 flex items-center gap-2 font-semibold text-lg group transform hover:scale-105"
  >
    <i className="fas fa-plus bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors"></i>
    Log Eco-Action
  </button>
  
  <button
    onClick={() => setIsScannerOpen(true)}
    className="bg-blue-600 text-white px-12 py-8 rounded-full shadow-2xl hover:bg-blue-700 hover:shadow-3xl transition-all duration-300 flex items-center gap-2 font-semibold text-lg group transform hover:scale-105"
  >
    <i className="fas fa-camera bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors"></i>
    Open Scanner
  </button>
</div>
</div>

      <ResourceHub />

      <ActionLogger
        isOpen={isActionLoggerOpen}
        onClose={() => setIsActionLoggerOpen(false)}
      />

      </main>
      
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
