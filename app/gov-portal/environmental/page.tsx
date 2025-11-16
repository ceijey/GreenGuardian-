'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import GovHeader from '@/components/GovHeader';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from '../gov-portal.module.css';

interface EnvironmentalData {
  airQualityIndex: number;
  waterQualityIndex: number;
  wasteGenerated: number;
  recyclingRate: number;
  timestamp: any;
}

export default function GovEnvironmentalPage() {
  const { user } = useAuth();
  const [envData, setEnvData] = useState<EnvironmentalData>({
    airQualityIndex: 0,
    waterQualityIndex: 0,
    wasteGenerated: 0,
    recyclingRate: 0,
    timestamp: null
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedData, setEditedData] = useState<EnvironmentalData | null>(null);

  const isGovOfficial = user?.email?.endsWith('@gordoncollege.edu.ph') || user?.email?.includes('admin');

  useEffect(() => {
    if (!user) return;
    
    const loadEnvironmentalData = async () => {
      try {
        const envRef = doc(db, 'communityStats', 'environmentalData');
        const snapshot = await getDoc(envRef);
        
        if (snapshot.exists()) {
          const data = snapshot.data() as EnvironmentalData;
          setEnvData(data);
          setEditedData(data);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading environmental data:', error);
        setLoading(false);
      }
    };

    loadEnvironmentalData();
  }, [user]);

  const handleUpdate = async () => {
    if (!editedData || !isGovOfficial) return;

    try {
      const envRef = doc(db, 'communityStats', 'environmentalData');
      await updateDoc(envRef, {
        ...editedData,
        timestamp: serverTimestamp()
      });
      setEnvData(editedData);
      setEditing(false);
      alert('Environmental data updated successfully!');
    } catch (error) {
      console.error('Error updating environmental data:', error);
      alert('Failed to update environmental data');
    }
  };

  const getAirQualityLabel = (aqi: number) => {
    if (aqi <= 50) return { label: 'Good', color: '#4CAF50' };
    if (aqi <= 100) return { label: 'Moderate', color: '#FF9800' };
    if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups', color: '#F44336' };
    if (aqi <= 200) return { label: 'Unhealthy', color: '#B71C1C' };
    return { label: 'Very Unhealthy', color: '#6A1B9A' };
  };

  const getWaterQualityLabel = (wqi: number) => {
    if (wqi >= 90) return { label: 'Excellent', color: '#4CAF50' };
    if (wqi >= 70) return { label: 'Good', color: '#8BC34A' };
    if (wqi >= 50) return { label: 'Medium', color: '#FF9800' };
    if (wqi >= 25) return { label: 'Bad', color: '#F44336' };
    return { label: 'Very Bad', color: '#B71C1C' };
  };

  if (!user) {
    return (
      <>
        <GovHeader />
        <div className={styles.container}>
          <div className={styles.loginPrompt}>
            <h2>Please log in to view environmental data</h2>
          </div>
        </div>
      </>
    );
  }

  if (!isGovOfficial) {
    return (
      <>
        <GovHeader />
        <div className={styles.container}>
          <div className={styles.accessDenied}>
            <h2>Access Denied</h2>
            <p>This portal is restricted to government officials only.</p>
          </div>
        </div>
      </>
    );
  }

  const airQuality = getAirQualityLabel(envData.airQualityIndex);
  const waterQuality = getWaterQualityLabel(envData.waterQualityIndex);

  return (
    <>
      <GovHeader />
      
      <div className={styles.container}>
        <section className={styles.hero}>
          <h1> Environmental Monitoring & Data Management</h1>
          <p className={styles.subtitle}>
            Monitor and update environmental metrics for your community
          </p>
        </section>

        <section className={styles.envSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Current Environmental Metrics</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className={styles.actionBtn}
                style={{ background: '#2196F3' }}
              >
                <i className="fas fa-edit"></i> Edit Metrics
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => { setEditing(false); setEditedData(envData); }} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button onClick={handleUpdate} className={styles.saveBtn}>
                  <i className="fas fa-save"></i> Save Changes
                </button>
              </div>
            )}
          </div>

          <div className={styles.envGrid}>
            <div className={styles.envCard}>
              <i className="fas fa-wind"></i>
              <h3>Air Quality Index</h3>
              {editing ? (
                <input
                  type="number"
                  value={editedData?.airQualityIndex}
                  onChange={(e) => setEditedData({ ...editedData!, airQualityIndex: Number(e.target.value) })}
                  className={styles.input}
                  style={{ fontSize: '2rem', textAlign: 'center', marginTop: '1rem', width: '100%' }}
                />
              ) : (
                <div className={styles.envValue}>{envData.airQualityIndex}</div>
              )}
              <div className={styles.envBar}>
                <div 
                  className={styles.envFill}
                  style={{ width: `${Math.min(envData.airQualityIndex / 5, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className={styles.envCard}>
              <i className="fas fa-water"></i>
              <h3>Water Quality Index</h3>
              {editing ? (
                <input
                  type="number"
                  value={editedData?.waterQualityIndex}
                  onChange={(e) => setEditedData({ ...editedData!, waterQualityIndex: Number(e.target.value) })}
                  className={styles.input}
                  style={{ fontSize: '2rem', textAlign: 'center', marginTop: '1rem', width: '100%' }}
                />
              ) : (
                <div className={styles.envValue}>{envData.waterQualityIndex}</div>
              )}
              <div className={styles.envBar}>
                <div 
                  className={styles.envFill}
                  style={{ width: `${envData.waterQualityIndex}%` }}
                ></div>
              </div>
            </div>

            <div className={styles.envCard}>
              <i className="fas fa-trash"></i>
              <h3>Community Waste Generated</h3>
              {editing ? (
                <input
                  type="number"
                  value={editedData?.wasteGenerated}
                  onChange={(e) => setEditedData({ ...editedData!, wasteGenerated: Number(e.target.value) })}
                  className={styles.input}
                  style={{ fontSize: '2rem', textAlign: 'center', marginTop: '1rem', width: '100%' }}
                />
              ) : (
                <div className={styles.envValue}>{envData.wasteGenerated.toLocaleString()} kg</div>
              )}
              <small>Monthly Total</small>
            </div>

            <div className={styles.envCard}>
              <i className="fas fa-recycle"></i>
              <h3>Recycling Rate</h3>
              {editing ? (
                <input
                  type="number"
                  value={editedData?.recyclingRate}
                  onChange={(e) => setEditedData({ ...editedData!, recyclingRate: Number(e.target.value) })}
                  className={styles.input}
                  style={{ fontSize: '2rem', textAlign: 'center', marginTop: '1rem', width: '100%' }}
                  max="100"
                />
              ) : (
                <div className={styles.envValue}>{envData.recyclingRate}%</div>
              )}
              <div className={styles.envBar}>
                <div 
                  className={styles.envFill}
                  style={{ width: `${envData.recyclingRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.reportsSection}>
          <h2> Environmental Guidelines</h2>
          <div className={styles.reportsList}>
            <div className={styles.reportCard}>
              <h3> Air Quality Standards</h3>
              <ul style={{ marginTop: '1rem', lineHeight: '1.8' }}>
                <li><strong>0-50:</strong> Good - Air quality is satisfactory</li>
                <li><strong>51-100:</strong> Moderate - Acceptable for most people</li>
                <li><strong>101-150:</strong> Unhealthy for Sensitive Groups</li>
                <li><strong>151-200:</strong> Unhealthy - Everyone may experience effects</li>
                <li><strong>200+:</strong> Very Unhealthy - Health warnings</li>
              </ul>
            </div>

            <div className={styles.reportCard}>
              <h3> Water Quality Standards</h3>
              <ul style={{ marginTop: '1rem', lineHeight: '1.8' }}>
                <li><strong>90-100:</strong> Excellent - Safe for all uses</li>
                <li><strong>70-89:</strong> Good - Generally safe</li>
                <li><strong>50-69:</strong> Medium - Some concerns</li>
                <li><strong>25-49:</strong> Bad - Limited use recommended</li>
                <li><strong>0-24:</strong> Very Bad - Not safe for consumption</li>
              </ul>
            </div>

            <div className={styles.reportCard}>
              <h3> Waste Management Targets</h3>
              <ul style={{ marginTop: '1rem', lineHeight: '1.8' }}>
                <li><strong>Recycling Rate:</strong> Target 60% by 2026</li>
                <li><strong>Waste Reduction:</strong> Reduce by 20% annually</li>
                <li><strong>Composting:</strong> Increase organic waste composting</li>
                <li><strong>E-Waste:</strong> Proper disposal programs</li>
              </ul>
            </div>
          </div>
        </section>

        {envData.timestamp && (
          <div style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>
            Last updated: {envData.timestamp.toDate?.()?.toLocaleString() || 'N/A'}
          </div>
        )}
      </div>
    </>
  );
}
