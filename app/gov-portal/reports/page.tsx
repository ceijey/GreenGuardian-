'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import GovHeader from '@/components/GovHeader';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc,
  orderBy,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from '../gov-portal.module.css';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

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
  archived?: boolean;
  archivedAt?: any;
  archivedBy?: string;
}

export default function GovReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState<string>('investigating');
  const [newPriority, setNewPriority] = useState<string>('medium');
  const [viewArchived, setViewArchived] = useState(false);

  const isGovOfficial = user?.email?.endsWith('@gordoncollege.edu.ph') || user?.email?.includes('admin');

  useEffect(() => {
    if (!user) return;
    
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
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const getFilteredReports = () => {
    let filtered = reports;
    
    // Filter by archived status
    filtered = filtered.filter(r => viewArchived ? r.archived : !r.archived);
    
    if (filterStatus !== 'all') filtered = filtered.filter(r => r.status === filterStatus);
    if (filterPriority !== 'all') filtered = filtered.filter(r => r.priority === filterPriority);
    if (filterType !== 'all') filtered = filtered.filter(r => r.incidentType === filterType);
    return filtered;
  };

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
      setShowModal(false);
      setSelectedReport(null);
      setResponse('');
      alert('Report updated successfully!');
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report');
    }
  };

  const handleArchiveReport = async (reportId: string) => {
    if (!isGovOfficial) return;

    try {
      await updateDoc(doc(db, 'incidentReports', reportId), {
        archived: true,
        archivedAt: serverTimestamp(),
        archivedBy: user!.email
      });
      alert('Report archived successfully!');
    } catch (error) {
      console.error('Error archiving report:', error);
      alert('Failed to archive report');
    }
  };

  const handleUnarchiveReport = async (reportId: string) => {
    if (!isGovOfficial) return;

    try {
      await updateDoc(doc(db, 'incidentReports', reportId), {
        archived: false,
        archivedAt: null,
        archivedBy: null
      });
      alert('Report unarchived successfully!');
    } catch (error) {
      console.error('Error unarchiving report:', error);
      alert('Failed to unarchive report');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: '#FF9800',
      investigating: '#2196F3',
      resolved: '#4CAF50',
      rejected: '#F44336'
    };
    return colors[status] || '#999';
  };

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      low: '#4CAF50',
      medium: '#FF9800',
      high: '#F44336',
      urgent: '#B71C1C'
    };
    return colors[priority] || '#999';
  };

  if (!user) {
    return (
      <>
        <GovHeader />
        <div className={styles.container}>
          <div className={styles.loginPrompt}>
            <h2>Please log in to view incident reports</h2>
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

  const filteredReports = getFilteredReports();

  return (
    <>
      <GovHeader />
      
      <div className={styles.container}>
        <section className={styles.hero}>
          <h1> Citizen Incident Reports Management</h1>
          <p className={styles.subtitle}>
            Monitor, respond to, and manage environmental incident reports from citizens
          </p>
        </section>

        <section className={styles.statsSection}>
          <h2>Report Statistics</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#2196F3' }}>
                <i className="fas fa-file-alt"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{reports.filter(r => !r.archived).length}</div>
                <div className={styles.statLabel}>Active Reports</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#FF9800' }}>
                <i className="fas fa-clock"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{reports.filter(r => r.status === 'pending' && !r.archived).length}</div>
                <div className={styles.statLabel}>Pending</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#2196F3' }}>
                <i className="fas fa-search"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{reports.filter(r => r.status === 'investigating' && !r.archived).length}</div>
                <div className={styles.statLabel}>Investigating</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#4CAF50' }}>
                <i className="fas fa-check-circle"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{reports.filter(r => r.status === 'resolved' && !r.archived).length}</div>
                <div className={styles.statLabel}>Resolved</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#9E9E9E' }}>
                <i className="fas fa-archive"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{reports.filter(r => r.archived).length}</div>
                <div className={styles.statLabel}>Archived</div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.reportsSection}>
          <div className={styles.reportsHeader}>
            <h2>{viewArchived ? '📦 Archived Reports' : '📋 Active Incident Reports'}</h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setViewArchived(!viewArchived)}
                className={styles.actionBtn}
                style={{ 
                  background: viewArchived ? '#4CAF50' : '#9E9E9E',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className={viewArchived ? 'fas fa-list' : 'fas fa-archive'}></i>
                {viewArchived ? 'View Active Reports' : 'View Archived'}
              </button>
              <div className={styles.filters}>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.filterSelect}>
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={styles.filterSelect}>
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={styles.filterSelect}>
                  <option value="all">All Types</option>
                  <option value="illegal-dumping">Illegal Dumping</option>
                  <option value="water-pollution">Water Pollution</option>
                  <option value="air-pollution">Air Pollution</option>
                  <option value="noise-pollution">Noise Pollution</option>
                  <option value="deforestation">Deforestation</option>
                  <option value="other">Other</option>
                </select>
              </div>
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
                          <span><i className="fas fa-user"></i> {report.reporterName}</span>
                          <span><i className="fas fa-calendar"></i> {reportDate.toLocaleString()}</span>
                          <span className={styles.incidentType}>{report.incidentType.replace('-', ' ').toUpperCase()}</span>
                        </div>
                      </div>
                      <div className={styles.reportBadges}>
                        <span className={styles.statusBadge} style={{ backgroundColor: getStatusColor(report.status) }}>
                          {report.status}
                        </span>
                        <span className={styles.priorityBadge} style={{ backgroundColor: getPriorityColor(report.priority) }}>
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
                          <span>GPS: {report.location.coordinates.latitude.toFixed(4)}, {report.location.coordinates.longitude.toFixed(4)}</span>
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
                          <img key={index} src={photo} alt={`Evidence ${index + 1}`} onClick={() => window.open(photo, '_blank')} />
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
                          setShowModal(true);
                        }}
                        className={styles.actionBtn}
                      >
                        <i className="fas fa-edit"></i> Manage Report
                      </button>
                      
                      {!viewArchived && (report.status === 'resolved' || report.status === 'rejected') && (
                        <button
                          onClick={() => {
                            if (confirm('Archive this report? It can be unarchived later.')) {
                              handleArchiveReport(report.id);
                            }
                          }}
                          className={styles.actionBtn}
                          style={{ background: '#9E9E9E' }}
                        >
                          <i className="fas fa-archive"></i> Archive
                        </button>
                      )}
                      
                      {viewArchived && (
                        <button
                          onClick={() => {
                            if (confirm('Unarchive this report and move it back to active reports?')) {
                              handleUnarchiveReport(report.id);
                            }
                          }}
                          className={styles.actionBtn}
                          style={{ background: '#4CAF50' }}
                        >
                          <i className="fas fa-box-open"></i> Unarchive
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {showModal && selectedReport && (
          <div className={styles.modal} onClick={() => setShowModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Manage Report: {selectedReport.title}</h2>
                <button onClick={() => setShowModal(false)} className={styles.closeBtn}></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Status *</label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className={styles.select}>
                    <option value="pending">Pending</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Priority *</label>
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className={styles.select}>
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
                  <button onClick={() => setShowModal(false)} className={styles.cancelBtn}>Cancel</button>
                  <button onClick={handleUpdateReport} className={styles.saveBtn}>
                    <i className="fas fa-save"></i> Update Report
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
