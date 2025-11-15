'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import GovHeader from '@/components/GovHeader';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from '../gov-portal.module.css';

interface EnvironmentalData {
  airQualityIndex: number;
  waterQualityIndex: number;
  wasteGenerated: number;
  recyclingRate: number;
  timestamp: any;
}

interface PollutionHotspot {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  city: string;
  type: 'air-pollution' | 'water-contamination' | 'illegal-dumping' | 'deforestation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reports: number;
  lastReported: any;
  description?: string;
}

interface LocalProject {
  id: string;
  title: string;
  description: string;
  category: 'cleanup' | 'tree-planting' | 'water-conservation' | 'education';
  location: string;
  participants: number;
  status: 'ongoing' | 'upcoming' | 'completed';
  impact: {
    co2Reduced?: number;
    wasteCollected?: number;
    treesPlanted?: number;
  };
  startDate: any;
  endDate: any;
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
  const [hotspots, setHotspots] = useState<PollutionHotspot[]>([]);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<EnvironmentalData | null>(null);

  const isGovOfficial = user?.email?.endsWith('@gordoncollege.edu.ph') || user?.email?.includes('admin');

  useEffect(() => {
    const envRef = doc(db, 'communityStats', 'environmentalData');
    const unsubscribe = onSnapshot(envRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as EnvironmentalData;
        setEnvData(data);
        setEditedData(data);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const hotspotsQuery = query(collection(db, 'pollutionHotspots'));
    const unsubscribe = onSnapshot(hotspotsQuery, (snapshot) => {
      const hotspotsList: PollutionHotspot[] = [];
      snapshot.forEach((doc) => {
        hotspotsList.push({ id: doc.id, ...doc.data() } as PollutionHotspot);
      });
      setHotspots(hotspotsList);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const projectsQuery = query(collection(db, 'localProjects'));
    const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
      const projectsList: LocalProject[] = [];
      snapshot.forEach((doc) => {
        projectsList.push({ id: doc.id, ...doc.data() } as LocalProject);
      });
      setProjects(projectsList);
    });

    return unsubscribe;
  }, []);

  const handleUpdateEnvironmentalData = async () => {
    if (!editedData || !isGovOfficial) return;

    try {
      const envRef = doc(db, 'communityStats', 'environmentalData');
      await updateDoc(envRef, {
        airQualityIndex: editedData.airQualityIndex,
        waterQualityIndex: editedData.waterQualityIndex,
        wasteGenerated: editedData.wasteGenerated,
        recyclingRate: editedData.recyclingRate,
        timestamp: serverTimestamp()
      });

      setEditMode(false);
      alert('✅ Environmental data updated successfully!');
    } catch (error) {
      console.error('Error updating environmental data:', error);
      alert('❌ Failed to update environmental data');
    }
  };

  const getAirQualityLabel = (aqi: number) => {
    if (aqi <= 50) return { label: 'Good', color: '#4CAF50' };
    if (aqi <= 100) return { label: 'Moderate', color: '#8BC34A' };
    if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups', color: '#FF9800' };
    if (aqi <= 200) return { label: 'Unhealthy', color: '#FF5722' };
    if (aqi <= 300) return { label: 'Very Unhealthy', color: '#9C27B0' };
    return { label: 'Hazardous', color: '#B71C1C' };
  };

  const getWaterQualityLabel = (index: number) => {
    if (index >= 80) return { label: 'Excellent', color: '#4CAF50' };
    if (index >= 60) return { label: 'Good', color: '#8BC34A' };
    if (index >= 40) return { label: 'Fair', color: '#FF9800' };
    if (index >= 20) return { label: 'Poor', color: '#FF5722' };
    return { label: 'Very Poor', color: '#B71C1C' };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
      case 'critical': return '#B71C1C';
      default: return '#999';
    }
  };

  if (!user) {
    return (
      <>
        <GovHeader title="ENVIRONMENTAL DATA" />
        <div className={styles.container}>
          <div className={styles.loginPrompt}>
            <i className="fas fa-lock"></i>
            <h2>Government Portal Access Required</h2>
            <p>Please log in with government credentials to access this portal</p>
          </div>
        </div>
      </>
    );
  }

  if (!isGovOfficial) {
    return (
      <>
        <GovHeader title="ENVIRONMENTAL DATA" />
        <div className={styles.container}>
          <div className={styles.accessDenied}>
            <i className="fas fa-ban"></i>
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
      <GovHeader title="ENVIRONMENTAL DATA MONITORING" />
      
      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <h1>🌍 Environmental Data Monitoring</h1>
          <p className={styles.subtitle}>
            Monitor and manage environmental quality metrics for your jurisdiction
          </p>
        </section>

        {/* Environmental Metrics Cards */}
        <section className={styles.envSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>📊 Current Environmental Metrics</h2>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                style={{
                  padding: '10px 20px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fas fa-edit"></i>
                Update Metrics
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setEditedData(envData);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#F44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateEnvironmentalData}
                  style={{
                    padding: '10px 20px',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fas fa-save"></i>
                  Save Changes
                </button>
              </div>
            )}
          </div>

          <div className={styles.envGrid}>
            {/* Air Quality Card */}
            <div className={styles.envCard}>
              <i className="fas fa-wind" style={{ fontSize: '36px', color: '#3498db', marginBottom: '10px' }}></i>
              <h3>Air Quality Index</h3>
              {editMode ? (
                <input
                  type="number"
                  value={editedData?.airQualityIndex || 0}
                  onChange={(e) => setEditedData({ ...editedData!, airQualityIndex: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    border: '2px solid #2196F3',
                    borderRadius: '8px',
                    margin: '10px 0'
                  }}
                />
              ) : (
                <div className={styles.envValue}>{envData.airQualityIndex}</div>
              )}
              <div 
                style={{
                  padding: '8px 16px',
                  background: airQuality.color,
                  color: 'white',
                  borderRadius: '20px',
                  fontWeight: '600',
                  marginTop: '10px'
                }}
              >
                {airQuality.label}
              </div>
              <div className={styles.envBar}>
                <div 
                  className={styles.envFill}
                  style={{ 
                    width: `${Math.min(envData.airQualityIndex / 5, 100)}%`,
                    background: airQuality.color
                  }}
                ></div>
              </div>
              <small style={{ marginTop: '10px', color: '#666' }}>
                Last updated: {envData.timestamp?.toDate?.()?.toLocaleString() || 'N/A'}
              </small>
            </div>

            {/* Water Quality Card */}
            <div className={styles.envCard}>
              <i className="fas fa-water" style={{ fontSize: '36px', color: '#3498db', marginBottom: '10px' }}></i>
              <h3>Water Quality Index</h3>
              {editMode ? (
                <input
                  type="number"
                  value={editedData?.waterQualityIndex || 0}
                  onChange={(e) => setEditedData({ ...editedData!, waterQualityIndex: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    border: '2px solid #2196F3',
                    borderRadius: '8px',
                    margin: '10px 0'
                  }}
                />
              ) : (
                <div className={styles.envValue}>{envData.waterQualityIndex}</div>
              )}
              <div 
                style={{
                  padding: '8px 16px',
                  background: waterQuality.color,
                  color: 'white',
                  borderRadius: '20px',
                  fontWeight: '600',
                  marginTop: '10px'
                }}
              >
                {waterQuality.label}
              </div>
              <div className={styles.envBar}>
                <div 
                  className={styles.envFill}
                  style={{ 
                    width: `${envData.waterQualityIndex}%`,
                    background: waterQuality.color
                  }}
                ></div>
              </div>
            </div>

            {/* Waste Generated Card */}
            <div className={styles.envCard}>
              <i className="fas fa-trash" style={{ fontSize: '36px', color: '#3498db', marginBottom: '10px' }}></i>
              <h3>Community Waste</h3>
              {editMode ? (
                <input
                  type="number"
                  value={editedData?.wasteGenerated || 0}
                  onChange={(e) => setEditedData({ ...editedData!, wasteGenerated: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    border: '2px solid #2196F3',
                    borderRadius: '8px',
                    margin: '10px 0'
                  }}
                />
              ) : (
                <div className={styles.envValue}>{envData.wasteGenerated.toLocaleString()} kg</div>
              )}
              <small style={{ marginTop: '10px', color: '#666' }}>Total waste generated this month</small>
            </div>

            {/* Recycling Rate Card */}
            <div className={styles.envCard}>
              <i className="fas fa-recycle" style={{ fontSize: '36px', color: '#4CAF50', marginBottom: '10px' }}></i>
              <h3>Recycling Rate</h3>
              {editMode ? (
                <input
                  type="number"
                  value={editedData?.recyclingRate || 0}
                  onChange={(e) => setEditedData({ ...editedData!, recyclingRate: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    border: '2px solid #2196F3',
                    borderRadius: '8px',
                    margin: '10px 0'
                  }}
                  max={100}
                  min={0}
                />
              ) : (
                <div className={styles.envValue}>{envData.recyclingRate}%</div>
              )}
              <div className={styles.envBar}>
                <div 
                  className={styles.envFill}
                  style={{ 
                    width: `${envData.recyclingRate}%`,
                    background: '#4CAF50'
                  }}
                ></div>
              </div>
              <small style={{ marginTop: '10px', color: '#666' }}>Goal: 50% recycling rate</small>
            </div>
          </div>
        </section>

        {/* Pollution Hotspots */}
        <section className={styles.reportsSection}>
          <h2>🗺️ Pollution Hotspots</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Active pollution hotspots requiring attention
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {hotspots.map(hotspot => (
              <div key={hotspot.id} style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 15px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${getSeverityColor(hotspot.severity)}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '18px', color: '#2c3e50' }}>{hotspot.name}</h3>
                  <span style={{
                    padding: '4px 12px',
                    background: getSeverityColor(hotspot.severity),
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {hotspot.severity}
                  </span>
                </div>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
                  {hotspot.city}
                </p>
                <p style={{ color: '#999', fontSize: '13px', marginBottom: '15px' }}>
                  Type: {hotspot.type.replace('-', ' ').toUpperCase()}
                </p>
                <div style={{ 
                  padding: '10px',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    <i className="fas fa-exclamation-circle"></i> Reports
                  </span>
                  <strong style={{ fontSize: '18px', color: '#2c3e50' }}>{hotspot.reports}</strong>
                </div>
                {hotspot.description && (
                  <p style={{ marginTop: '10px', fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
                    {hotspot.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Local Projects */}
        <section className={styles.reportsSection} style={{ marginTop: '40px' }}>
          <h2>🌱 Active Environmental Projects</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Community-led environmental initiatives
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {projects.map(project => (
              <div key={project.id} style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 15px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{
                    padding: '4px 12px',
                    background: project.status === 'ongoing' ? '#4CAF50' : project.status === 'upcoming' ? '#FF9800' : '#2196F3',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {project.status}
                  </span>
                  <span style={{
                    padding: '4px 12px',
                    background: '#f5f5f5',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#666'
                  }}>
                    {project.category}
                  </span>
                </div>
                <h3 style={{ fontSize: '18px', color: '#2c3e50', marginBottom: '10px' }}>{project.title}</h3>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px', lineHeight: '1.5' }}>
                  {project.description}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    <i className="fas fa-map-marker-alt"></i> {project.location}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    <i className="fas fa-users"></i> {project.participants} participants
                  </div>
                </div>
                {(project.impact.co2Reduced || project.impact.wasteCollected || project.impact.treesPlanted) && (
                  <div style={{
                    padding: '10px',
                    background: '#e8f5e9',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}>
                    <strong>Impact:</strong>
                    {project.impact.co2Reduced && <div>🌿 {project.impact.co2Reduced} kg CO₂ reduced</div>}
                    {project.impact.wasteCollected && <div>♻️ {project.impact.wasteCollected} kg waste collected</div>}
                    {project.impact.treesPlanted && <div>🌳 {project.impact.treesPlanted} trees planted</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
