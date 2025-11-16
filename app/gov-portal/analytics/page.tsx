'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import GovHeader from '@/components/GovHeader';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from '../gov-portal.module.css';

interface AnalyticsData {
  totalCitizens: number;
  activeUsers: number;
  totalReports: number;
  resolvedReports: number;
  totalEcoActions: number;
  carbonOffset: number;
  wasteRecycled: number;
}

export default function GovAnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalCitizens: 0,
    activeUsers: 0,
    totalReports: 0,
    resolvedReports: 0,
    totalEcoActions: 0,
    carbonOffset: 0,
    wasteRecycled: 0
  });
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isGovOfficial = user?.email?.endsWith('@gordoncollege.edu.ph') || user?.email?.includes('admin');

  useEffect(() => {
    if (!user) return;

    const loadAnalytics = async () => {
      try {
        const globalStatsRef = doc(db, 'globalStats', 'aggregate');
        const globalSnapshot = await getDoc(globalStatsRef);
        
        if (globalSnapshot.exists()) {
          const data = globalSnapshot.data();
          setAnalytics(prev => ({
            ...prev,
            totalCitizens: data.totalUsers || 0,
            totalEcoActions: data.totalActions || 0,
            carbonOffset: data.totalCO2Reduced || 0,
            wasteRecycled: data.totalWasteRecycled || 0
          }));
        }

        const reportsQuery = query(collection(db, 'incidentReports'));
        const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
          const reportsList: any[] = [];
          snapshot.forEach((doc) => {
            reportsList.push({ id: doc.id, ...doc.data() });
          });
          
          setReports(reportsList);
          setAnalytics(prev => ({
            ...prev,
            totalReports: reportsList.length,
            resolvedReports: reportsList.filter(r => r.status === 'resolved').length,
            activeUsers: new Set(reportsList.map(r => r.reporterId)).size
          }));
          
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error loading analytics:', error);
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [user]);

  const getReportTrends = () => {
    const trends: any = {};
    reports.forEach(report => {
      const type = report.incidentType || 'other';
      trends[type] = (trends[type] || 0) + 1;
    });
    return Object.entries(trends).sort((a: any, b: any) => b[1] - a[1]);
  };

  const getStatusBreakdown = () => {
    return [
      { status: 'Pending', count: reports.filter(r => r.status === 'pending').length, color: '#FF9800' },
      { status: 'Investigating', count: reports.filter(r => r.status === 'investigating').length, color: '#2196F3' },
      { status: 'Resolved', count: reports.filter(r => r.status === 'resolved').length, color: '#4CAF50' },
      { status: 'Rejected', count: reports.filter(r => r.status === 'rejected').length, color: '#F44336' }
    ];
  };

  const getResolutionRate = () => {
    if (analytics.totalReports === 0) return 0;
    return ((analytics.resolvedReports / analytics.totalReports) * 100).toFixed(1);
  };

  const getRecentReports = () => {
    return reports.filter(r => {
      const date = r.timestamp?.toDate?.();
      return date && (Date.now() - date.getTime()) < 7 * 24 * 60 * 60 * 1000;
    }).length;
  };

  const getRecentResolutions = () => {
    return reports.filter(r => {
      const date = r.resolvedAt?.toDate?.();
      return r.status === 'resolved' && date && (Date.now() - date.getTime()) < 7 * 24 * 60 * 60 * 1000;
    }).length;
  };

  if (!user) {
    return (
      <>
        <GovHeader />
        <div className={styles.container}>
          <div className={styles.loginPrompt}>
            <h2>Please log in to view analytics</h2>
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

  const reportTrends = getReportTrends();
  const statusBreakdown = getStatusBreakdown();

  return (
    <>
      <GovHeader />
      
      <div className={styles.container}>
        <section className={styles.hero}>
          <h1> Analytics & Performance Insights</h1>
          <p className={styles.subtitle}>
            Track community engagement, environmental impact, and report resolution metrics
          </p>
        </section>

        <section className={styles.statsSection}>
          <h2>Key Performance Indicators</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#2196F3' }}>
                <i className="fas fa-users"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{analytics.totalCitizens}</div>
                <div className={styles.statLabel}>Registered Citizens</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#4CAF50' }}>
                <i className="fas fa-leaf"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{analytics.totalEcoActions.toLocaleString()}</div>
                <div className={styles.statLabel}>Total Eco-Actions</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#FF9800' }}>
                <i className="fas fa-file-alt"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{analytics.totalReports}</div>
                <div className={styles.statLabel}>Incident Reports</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#9C27B0' }}>
                <i className="fas fa-percentage"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{getResolutionRate()}%</div>
                <div className={styles.statLabel}>Resolution Rate</div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.statsSection}>
          <h2>Environmental Impact Metrics</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#4CAF50' }}>
                <i className="fas fa-cloud"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{analytics.carbonOffset.toLocaleString()} kg</div>
                <div className={styles.statLabel}>CO Offset</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#2196F3' }}>
                <i className="fas fa-recycle"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{analytics.wasteRecycled.toLocaleString()} kg</div>
                <div className={styles.statLabel}>Waste Recycled</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#FF5722' }}>
                <i className="fas fa-check-circle"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{analytics.resolvedReports}</div>
                <div className={styles.statLabel}>Resolved Issues</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#00BCD4' }}>
                <i className="fas fa-user-check"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{analytics.activeUsers}</div>
                <div className={styles.statLabel}>Active Reporters</div>
              </div>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          <section className={styles.reportsSection}>
            <h2> Report Trends by Type</h2>
            {reportTrends.length > 0 ? (
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                {reportTrends.map(([type, count]: any, index: number) => (
                  <div key={index} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                        {type.replace('-', ' ')}
                      </span>
                      <span style={{ fontWeight: 'bold', color: '#2196F3' }}>{count}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${(count / analytics.totalReports) * 100}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, #2196F3, #1976D2)',
                          transition: 'width 0.3s ease'
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No report data available</p>
              </div>
            )}
          </section>

          <section className={styles.reportsSection}>
            <h2> Status Breakdown</h2>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              {statusBreakdown.map((item, index) => (
                <div key={index} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 500 }}>{item.status}</span>
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: '12px', 
                      background: item.color, 
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: 'bold'
                    }}>
                      {item.count}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: '#f5f5f5', borderRadius: '5px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${analytics.totalReports > 0 ? (item.count / analytics.totalReports) * 100 : 0}%`, 
                        height: '100%', 
                        background: item.color,
                        transition: 'width 0.3s ease'
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className={styles.reportsSection} style={{ marginTop: '2rem' }}>
          <h2> Recent Activity Summary (Last 7 Days)</h2>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', borderRadius: '8px', background: '#f5f5f5' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2196F3' }}>
                  {getRecentReports()}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                  New Reports
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', borderRadius: '8px', background: '#f5f5f5' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4CAF50' }}>
                  {getRecentResolutions()}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                  Resolved
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', borderRadius: '8px', background: '#f5f5f5' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF9800' }}>
                  {reports.filter(r => r.priority === 'urgent' || r.priority === 'high').length}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                  High Priority
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', borderRadius: '8px', background: '#f5f5f5' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9C27B0' }}>
                  {analytics.activeUsers}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                  Active Reporters
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
