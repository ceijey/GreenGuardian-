'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { initializeAllData } from '@/lib/initializeCloudData';

export default function InitializeCloudData() {
  const { user } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if data has been initialized before (using localStorage)
    const hasInitialized = localStorage.getItem('cloudDataInitialized');
    if (hasInitialized === 'true') {
      setInitialized(true);
    }
  }, []);

  const handleInitialize = async () => {
    if (!user) {
      alert('Please login first to initialize data');
      return;
    }

    setLoading(true);
    try {
      const success = await initializeAllData();
      if (success) {
        localStorage.setItem('cloudDataInitialized', 'true');
        setInitialized(true);
        alert('✅ Cloud data initialized successfully!');
      } else {
        alert('⚠️ Some data initialization failed. Check console for details.');
      }
    } catch (error) {
      console.error('Error during initialization:', error);
      alert('❌ Failed to initialize data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initialized) {
    return null; // Don't show anything if already initialized
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '20px 30px',
      borderRadius: '16px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
      zIndex: 1000,
      maxWidth: '350px'
    }}>
      <div style={{ marginBottom: '15px' }}>
        <strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
          🚀 Initialize Cloud Data
        </strong>
        <p style={{ fontSize: '13px', margin: 0, opacity: 0.9, lineHeight: '1.5' }}>
          Click to populate Firebase with environmental data, pollution hotspots, and community projects.
        </p>
      </div>
      <button
        onClick={handleInitialize}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          background: 'white',
          color: '#667eea',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'all 0.3s ease'
        }}
      >
        {loading ? 'Initializing...' : 'Initialize Data'}
      </button>
    </div>
  );
}
