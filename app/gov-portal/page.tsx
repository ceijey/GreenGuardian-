'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import GovHeader from '@/components/GovHeader';
import ProfileReminder from '@/components/ProfileReminder';
import toast from 'react-hot-toast';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDoc,
  getDocs,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './gov-portal.module.css';

interface IncidentReport {
  id: string;
  reporterId: string;
  reporterEmail: string;
  reporterName: string;
  incidentType: string;
  title: string;
  description: string;
  location: {
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  photos: string[];
  status: 'pending' | 'investigating' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: any;
  governmentResponse?: string;
  resolvedAt?: any;
  assignedTo?: string;
  views?: number;
  upvotes?: number;
}

interface EnvironmentalData {
  airQualityIndex: number;
  waterQualityIndex: number;
  wasteGenerated: number;
  recyclingRate: number;
  timestamp: any;
}

interface CommunityStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  averageResponseTime: number; // hours
  activeCitizens: number;
}

export default function GovPortalPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [envData, setEnvData] = useState<EnvironmentalData>({
    airQualityIndex: 0,
    waterQualityIndex: 0,
    wasteGenerated: 0,
    recyclingRate: 0,
    timestamp: null
  });
  const [stats, setStats] = useState<CommunityStats>({
    totalReports: 0,
    pendingReports: 0,
    resolvedReports: 0,
    averageResponseTime: 0,
    activeCitizens: 0
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'investigating' | 'resolved' | 'rejected'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState<'pending' | 'investigating' | 'resolved' | 'rejected'>('investigating');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  // Check if user is government official (simple check - in production, use proper role-based access)
  const isGovOfficial = user?.email?.endsWith('@gordoncollege.edu.ph') || user?.email?.includes('admin');

  // Load all incident reports
  useEffect(() => {
    const reportsQuery = query(
      collection(db, 'incidentReports'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      const reportsList: IncidentReport[] = [];
      snapshot.forEach((doc) => {
        reportsList.push({ id: doc.id, ...doc.data() } as IncidentReport);
      });
      
      setReports(reportsList);
      
      // Calculate stats
      const pending = reportsList.filter(r => r.status === 'pending').length;
      const resolved = reportsList.filter(r => r.status === 'resolved').length;
      
      setStats({
        totalReports: reportsList.length,
        pendingReports: pending,
        resolvedReports: resolved,
        averageResponseTime: 24, // Mock data
        activeCitizens: new Set(reportsList.map(r => r.reporterId)).size
      });
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Track active citizens using presence system
  useEffect(() => {
    const loadActiveCitizens = async () => {
      try {
        // First, load all citizen users
        const usersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'citizen')
        );
        const usersSnapshot = await getDocs(usersQuery);
        const citizenIds = new Set<string>();
        
        usersSnapshot.forEach((doc) => {
          citizenIds.add(doc.id);
        });

        // Then listen to presence changes
        const presenceQuery = query(collection(db, 'userPresence'));
        const unsubscribe = onSnapshot(presenceQuery, (snapshot) => {
          const now = Date.now();
          const fiveMinutesAgo = now - (5 * 60 * 1000); // 5 minutes threshold
          
          let activeCitizenCount = 0;
          
          snapshot.forEach((presenceDoc) => {
            const presenceData = presenceDoc.data();
            const userId = presenceData.userId;
            
            // Check if user is a citizen and was active in last 5 minutes
            if (citizenIds.has(userId)) {
              const lastSeen = presenceData.lastSeen?.toMillis?.() || 0;
              if (lastSeen > fiveMinutesAgo || presenceData.status === 'online') {
                activeCitizenCount++;
              }
            }
          });
          
          setStats(prev => ({
            ...prev,
            activeCitizens: activeCitizenCount
          }));
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error loading active citizens:', error);
      }
    };

    const unsubscribePromise = loadActiveCitizens();
    
    return () => {
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, []);

  // Load environmental data
  useEffect(() => {
    const envRef = doc(db, 'communityStats', 'environmentalData');
    const unsubscribe = onSnapshot(envRef, (snapshot) => {
      if (snapshot.exists()) {
        setEnvData(snapshot.data() as EnvironmentalData);
      }
    });

    return unsubscribe;
  }, []);

  // Filter reports
  const getFilteredReports = () => {
    let filtered = reports;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(r => r.priority === filterPriority);
    }

    return filtered;
  };

  // Update report status
  const handleUpdateReport = async () => {
    if (!selectedReport || !isGovOfficial) return;

    try {
      const updateData: any = {
        status: newStatus,
        priority: newPriority,
        assignedTo: user!.email
      };

      if (response.trim()) {
        updateData.governmentResponse = response;
      }

      if (newStatus === 'resolved') {
        updateData.resolvedAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'incidentReports', selectedReport.id), updateData);

      setShowResponseModal(false);
      setSelectedReport(null);
      setResponse('');
      toast.success('Great job! Your completion has been recorded.');
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Failed to update report');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'investigating': return '#2196F3';
      case 'resolved': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#999';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
      case 'urgent': return '#B71C1C';
      default: return '#999';
    }
  };

  if (!user) {
    return (
      <>
        <GovHeader />
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
        <GovHeader />
        <div className={styles.container}>
          <div className={styles.accessDenied}>
            <i className="fas fa-ban"></i>
            <h2>Access Denied</h2>
            <p>This portal is restricted to government officials only.</p>
            <small>Contact your administrator if you believe this is an error.</small>
          </div>
        </div>
      </>
    );
  }

  const filteredReports = getFilteredReports();

  return (
    <>
      <GovHeader />
      <ProfileReminder />
      
      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <h1>🏛️ Local Government Environmental Portal</h1>
          <p className={styles.subtitle}>
            Monitor environmental data and manage citizen incident reports
          </p>
          <div className={styles.officialBadge}>
            <i className="fas fa-shield-alt"></i>
            <span>Official Government Account</span>
            <small>{user.email}</small>
          </div>
        </section>

        {/* Stats Dashboard */}
        <section className={styles.statsSection}>
          <h2>📊 Overview Dashboard</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#2196F3' }}>
                <i className="fas fa-file-alt"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.totalReports}</div>
                <div className={styles.statLabel}>Total Reports</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#FF9800' }}>
                <i className="fas fa-clock"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.pendingReports}</div>
                <div className={styles.statLabel}>Pending Review</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#4CAF50' }}>
                <i className="fas fa-check-circle"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.resolvedReports}</div>
                <div className={styles.statLabel}>Resolved</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#9C27B0' }}>
                <i className="fas fa-users"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.activeCitizens}</div>
                <div className={styles.statLabel}>Active Citizens</div>
              </div>
            </div>
          </div>
        </section>

        {/* Environmental Monitoring */}
        <section className={styles.envSection}>
          <h2>🌍 Environmental Monitoring</h2>
          <div className={styles.envGrid}>
            <div className={styles.envCard}>
              <i className="fas fa-wind"></i>
              <h3>Air Quality Index</h3>
              <div className={styles.envValue}>{envData.airQualityIndex}</div>
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
              <div className={styles.envValue}>{envData.waterQualityIndex}</div>
              <div className={styles.envBar}>
                <div 
                  className={styles.envFill}
                  style={{ width: `${envData.waterQualityIndex}%` }}
                ></div>
              </div>
            </div>

            <div className={styles.envCard}>
              <i className="fas fa-trash"></i>
              <h3>Community Waste</h3>
              <div className={styles.envValue}>{envData.wasteGenerated.toLocaleString()} kg</div>
              <small style={{ color: '#7f8c8d', fontSize: '14px' }}>Recycling Rate: {envData.recyclingRate}%</small>
            </div>
          </div>
        </section>

        {/* Incident Reports Management */}
        <section className={styles.reportsSection}>
          <div className={styles.reportsHeader}>
            <h2>📋 Citizen Incident Reports</h2>
            
            <div className={styles.filters}>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className={styles.filterSelect}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className={styles.filterSelect}
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fas fa-inbox"></i>
              <h3>No Reports Found</h3>
              <p>No incident reports match your filters.</p>
            </div>
          ) : (
            <div className={styles.reportsList}>
              {filteredReports.map(report => {
                const reportDate = report.timestamp?.toDate?.() || new Date();
                
                return (
                  <div key={report.id} className={styles.reportCard}>
                    <div className={styles.reportHeader}>
                      <div className={styles.reportInfo}>
                        <h3>{report.title}</h3>
                        <div className={styles.reportMeta}>
                          <span>
                            <i className="fas fa-user"></i>
                            {report.reporterName}
                          </span>
                          <span>
                            <i className="fas fa-calendar"></i>
                            {reportDate.toLocaleString()}
                          </span>
                          <span className={styles.incidentType}>
                            {report.incidentType.replace('-', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className={styles.reportBadges}>
                        <span 
                          className={styles.statusBadge}
                          style={{ backgroundColor: getStatusColor(report.status) }}
                        >
                          {report.status}
                        </span>
                        <span 
                          className={styles.priorityBadge}
                          style={{ backgroundColor: getPriorityColor(report.priority) }}
                        >
                          {report.priority}
                        </span>
                      </div>
                    </div>

                    <p className={styles.description}>{report.description}</p>

                    <div className={styles.reportDetails}>
                      <div className={styles.detail}>
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{report.location.address}</span>
                      </div>
                      {report.location.coordinates && (
                        <div className={styles.detail}>
                          <i className="fas fa-crosshairs"></i>
                          <span>
                            GPS: {report.location.coordinates.latitude.toFixed(4)}, 
                            {report.location.coordinates.longitude.toFixed(4)}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${report.location.coordinates.latitude},${report.location.coordinates.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.mapLink}
                          >
                            View on Map
                          </a>
                        </div>
                      )}
                    </div>

                    {report.photos.length > 0 && (
                      <div className={styles.reportPhotos}>
                        {report.photos.map((photo, index) => (
                          <img 
                            key={index} 
                            src={photo} 
                            alt={`Evidence ${index + 1}`}
                            onClick={() => window.open(photo, '_blank')}
                          />
                        ))}
                      </div>
                    )}

                    {report.governmentResponse && (
                      <div className={styles.existingResponse}>
                        <strong>Government Response:</strong>
                        <p>{report.governmentResponse}</p>
                      </div>
                    )}

                    <div className={styles.reportActions}>
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setNewStatus(report.status);
                          setNewPriority(report.priority);
                          setResponse(report.governmentResponse || '');
                          setShowResponseModal(true);
                        }}
                        className={styles.actionBtn}
                      >
                        <i className="fas fa-edit"></i>
                        Manage Report
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Response Modal */}
        {showResponseModal && selectedReport && (
          <div className={styles.modal} onClick={() => setShowResponseModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Manage Report: {selectedReport.title}</h2>
                <button 
                  onClick={() => setShowResponseModal(false)}
                  className={styles.closeBtn}
                >
                  ✕
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Status *</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className={styles.select}
                  >
                    <option value="pending">Pending</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Priority *</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className={styles.select}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Official Response</label>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Add your response to the citizen..."
                    rows={5}
                    className={styles.textarea}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    onClick={() => setShowResponseModal(false)}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateReport}
                    className={styles.saveBtn}
                  >
                    <i className="fas fa-save"></i>
                    Update Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
