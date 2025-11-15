'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import GovHeader from '@/components/GovHeader';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from '../gov-portal.module.css';

interface IncidentReport {
  id: string;
  incidentType: string;
  status: 'pending' | 'investigating' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: any;
  location: {
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

interface EnvironmentalData {
  airQualityIndex: number;
  waterQualityIndex: number;
  wasteGenerated: number;
  recyclingRate: number;
  timestamp: any;
}

export default function GovAnalyticsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [envData, setEnvData] = useState<EnvironmentalData>({
    airQualityIndex: 0,
    waterQualityIndex: 0,
    wasteGenerated: 0,
    recyclingRate: 0,
    timestamp: null
  });
  const [loading, setLoading] = useState(true);

  const isGovOfficial = user?.email?.endsWith('@gordoncollege.edu.ph') || user?.email?.includes('admin');

  useEffect(() => {
    const reportsQuery = query(collection(db, 'incidentReports'));
    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      const reportsList: IncidentReport[] = [];
      snapshot.forEach((doc) => {
        reportsList.push({ id: doc.id, ...doc.data() } as IncidentReport);
      });
      setReports(reportsList);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const envRef = doc(db, 'communityStats', 'environmentalData');
    const unsubscribe = onSnapshot(envRef, (snapshot) => {
      if (snapshot.exists()) {
        setEnvData(snapshot.data() as EnvironmentalData);
      }
    });

    return unsubscribe;
  }, []);

  const getReportsByType = () => {
    const types: Record<string, number> = {};
    reports.forEach(report => {
      types[report.incidentType] = (types[report.incidentType] || 0) + 1;
    });
    return types;
  };

  const getReportsByStatus = () => {
    const statuses: Record<string, number> = {
      pending: 0,
      investigating: 0,
      resolved: 0,
      rejected: 0
    };
    reports.forEach(report => {
      statuses[report.status]++;
    });
    return statuses;
  };

  const getReportsByPriority = () => {
    const priorities: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    };
    reports.forEach(report => {
      priorities[report.priority]++;
    });
    return priorities;
  };

  const getReportTrend = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const counts = Array(7).fill(0);
    
    reports.forEach(report => {
      if (report.timestamp?.toDate) {
        const reportDate = report.timestamp.toDate();
        const daysAgo = Math.floor((Date.now() - reportDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo >= 0 && daysAgo < 7) {
          counts[6 - daysAgo]++;
        }
      }
    });

    return { labels: last7Days, data: counts };
  };

  const getResolutionRate = () => {
    if (reports.length === 0) return 0;
    const resolved = reports.filter(r => r.status === 'resolved').length;
    return Math.round((resolved / reports.length) * 100);
  };

  const getAverageResponseTime = () => {
    // Mock calculation - in production, track actual response times
    return '18 hours';
  };

  const getTopLocations = () => {
    const locations: Record<string, number> = {};
    reports.forEach(report => {
      const addr = report.location.address.split(',')[0]; // Get first part of address
      locations[addr] = (locations[addr] || 0) + 1;
    });
    
    return Object.entries(locations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  };

  if (!user) {
    return (
      <>
        <GovHeader title="ANALYTICS" />
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
        <GovHeader title="ANALYTICS" />
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

  const reportsByType = getReportsByType();
  const reportsByStatus = getReportsByStatus();
  const reportsByPriority = getReportsByPriority();
  const reportTrend = getReportTrend();
  const topLocations = getTopLocations();
  const resolutionRate = getResolutionRate();

  return (
    <>
      <GovHeader title="ANALYTICS & INSIGHTS" />
      
      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <h1>📊 Analytics & Insights</h1>
          <p className={styles.subtitle}>
            Data-driven insights for environmental management and decision making
          </p>
        </section>

        {/* Key Metrics */}
        <section className={styles.statsSection}>
          <h2>📈 Key Performance Indicators</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#4CAF50' }}>
                <i className="fas fa-check-circle"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{resolutionRate}%</div>
                <div className={styles.statLabel}>Resolution Rate</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#2196F3' }}>
                <i className="fas fa-clock"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{getAverageResponseTime()}</div>
                <div className={styles.statLabel}>Avg Response Time</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#FF9800' }}>
                <i className="fas fa-file-alt"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{reports.length}</div>
                <div className={styles.statLabel}>Total Reports</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#9C27B0' }}>
                <i className="fas fa-wind"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{envData.airQualityIndex}</div>
                <div className={styles.statLabel}>Current AQI</div>
              </div>
            </div>
          </div>
        </section>

        {/* Report Trend */}
        <section style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>📅 7-Day Report Trend</h2>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 2px 15px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '250px' }}>
              {reportTrend.labels.map((label, index) => {
                const maxCount = Math.max(...reportTrend.data, 1);
                const height = (reportTrend.data[index] / maxCount) * 200;
                return (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '200px'
                    }}>
                      <span style={{ marginBottom: '5px', fontWeight: '600', color: '#2c3e50' }}>
                        {reportTrend.data[index]}
                      </span>
                      <div style={{
                        width: '50px',
                        height: `${height}px`,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '8px 8px 0 0',
                        transition: 'all 0.3s ease'
                      }}></div>
                    </div>
                    <span style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Reports by Type and Status */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', marginTop: '40px' }}>
          {/* Reports by Type */}
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>🏷️ Reports by Type</h2>
            <div style={{
              background: 'white',
              padding: '25px',
              borderRadius: '12px',
              boxShadow: '0 2px 15px rgba(0,0,0,0.08)'
            }}>
              {Object.entries(reportsByType).map(([type, count]) => {
                const percentage = reports.length > 0 ? (count / reports.length) * 100 : 0;
                return (
                  <div key={type} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#2c3e50', textTransform: 'capitalize' }}>
                        {type.replace('-', ' ')}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '10px',
                      background: '#f0f0f0',
                      borderRadius: '5px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reports by Status */}
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>📊 Reports by Status</h2>
            <div style={{
              background: 'white',
              padding: '25px',
              borderRadius: '12px',
              boxShadow: '0 2px 15px rgba(0,0,0,0.08)'
            }}>
              {Object.entries(reportsByStatus).map(([status, count]) => {
                const colors: Record<string, string> = {
                  pending: '#FF9800',
                  investigating: '#2196F3',
                  resolved: '#4CAF50',
                  rejected: '#F44336'
                };
                const percentage = reports.length > 0 ? (count / reports.length) * 100 : 0;
                return (
                  <div key={status} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#2c3e50', textTransform: 'capitalize' }}>
                        {status}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '10px',
                      background: '#f0f0f0',
                      borderRadius: '5px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: colors[status],
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Priority Distribution and Top Locations */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', marginTop: '30px' }}>
          {/* Reports by Priority */}
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>⚠️ Reports by Priority</h2>
            <div style={{
              background: 'white',
              padding: '25px',
              borderRadius: '12px',
              boxShadow: '0 2px 15px rgba(0,0,0,0.08)'
            }}>
              {Object.entries(reportsByPriority).map(([priority, count]) => {
                const colors: Record<string, string> = {
                  low: '#4CAF50',
                  medium: '#FF9800',
                  high: '#F44336',
                  urgent: '#B71C1C'
                };
                const percentage = reports.length > 0 ? (count / reports.length) * 100 : 0;
                return (
                  <div key={priority} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#2c3e50', textTransform: 'capitalize' }}>
                        {priority}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '10px',
                      background: '#f0f0f0',
                      borderRadius: '5px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: colors[priority],
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Locations */}
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>📍 Top Report Locations</h2>
            <div style={{
              background: 'white',
              padding: '25px',
              borderRadius: '12px',
              boxShadow: '0 2px 15px rgba(0,0,0,0.08)'
            }}>
              {topLocations.length === 0 ? (
                <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                  No location data available
                </p>
              ) : (
                topLocations.map(([location, count], index) => (
                  <div key={location} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '15px',
                    marginBottom: '10px',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{
                        width: '30px',
                        height: '30px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600'
                      }}>
                        {index + 1}
                      </span>
                      <span style={{ fontSize: '14px', color: '#2c3e50' }}>{location}</span>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      background: 'white',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#667eea'
                    }}>
                      {count} reports
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Environmental Summary */}
        <section style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>🌍 Environmental Summary</h2>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 2px 15px rgba(0,0,0,0.08)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <i className="fas fa-wind" style={{ fontSize: '40px', color: '#3498db', marginBottom: '10px' }}></i>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Air Quality</h3>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50' }}>
                {envData.airQualityIndex}
              </div>
              <small style={{ color: '#666' }}>AQI Index</small>
            </div>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <i className="fas fa-water" style={{ fontSize: '40px', color: '#3498db', marginBottom: '10px' }}></i>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Water Quality</h3>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50' }}>
                {envData.waterQualityIndex}
              </div>
              <small style={{ color: '#666' }}>Quality Index</small>
            </div>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <i className="fas fa-trash" style={{ fontSize: '40px', color: '#FF9800', marginBottom: '10px' }}></i>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Waste</h3>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50' }}>
                {envData.wasteGenerated.toLocaleString()}
              </div>
              <small style={{ color: '#666' }}>kg Generated</small>
            </div>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <i className="fas fa-recycle" style={{ fontSize: '40px', color: '#4CAF50', marginBottom: '10px' }}></i>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Recycling</h3>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2c3e50' }}>
                {envData.recyclingRate}%
              </div>
              <small style={{ color: '#666' }}>Current Rate</small>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
