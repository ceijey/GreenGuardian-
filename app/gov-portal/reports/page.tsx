'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import GovHeader from '@/components/GovHeader';
import dynamic from 'next/dynamic';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from '../gov-portal.module.css';
import 'leaflet/dist/leaflet.css';

// Dynamic import for Leaflet components
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
  views?: number;
  upvotes?: number;
}

export default function GovReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'investigating' | 'resolved' | 'rejected'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState<'pending' | 'investigating' | 'resolved' | 'rejected'>('investigating');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  const isGovOfficial = user?.email?.endsWith('@gordoncollege.edu.ph') || user?.email?.includes('admin');

  // Fix Leaflet icon issue
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
      });
    }
  }, []);

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
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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
      alert('✅ Report updated successfully!');
    } catch (error) {
      console.error('Error updating report:', error);
      alert('❌ Failed to update report');
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

  const handleViewMap = (lat: number, lng: number, address: string) => {
    setMapLocation({ lat, lng, address });
    setShowMapModal(true);
  };

  const getStats = () => {
    return {
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      investigating: reports.filter(r => r.status === 'investigating').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      rejected: reports.filter(r => r.status === 'rejected').length,
      urgent: reports.filter(r => r.priority === 'urgent').length
    };
  };

  if (!user) {
    return (
      <>
        <GovHeader title="INCIDENT REPORTS" />
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
        <GovHeader title="INCIDENT REPORTS" />
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
  const stats = getStats();

  return (
    <>
      <GovHeader title="INCIDENT REPORTS MANAGEMENT" />
      
      <div className={styles.container}>
        {/* Stats Overview */}
        <section className={styles.statsSection}>
          <h2>📊 Reports Overview</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#2196F3' }}>
                <i className="fas fa-file-alt"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.total}</div>
                <div className={styles.statLabel}>Total Reports</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#FF9800' }}>
                <i className="fas fa-clock"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.pending}</div>
                <div className={styles.statLabel}>Pending Review</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#2196F3' }}>
                <i className="fas fa-search"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.investigating}</div>
                <div className={styles.statLabel}>Investigating</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#4CAF50' }}>
                <i className="fas fa-check-circle"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.resolved}</div>
                <div className={styles.statLabel}>Resolved</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#F44336' }}>
                <i className="fas fa-times-circle"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.rejected}</div>
                <div className={styles.statLabel}>Rejected</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#B71C1C' }}>
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.urgent}</div>
                <div className={styles.statLabel}>Urgent Priority</div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters and Reports List */}
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
                            <i className="fas fa-envelope"></i>
                            {report.reporterEmail}
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
                          <button
                            onClick={() => {
                              if (report.location.coordinates) {
                                handleViewMap(
                                  report.location.coordinates.latitude,
                                  report.location.coordinates.longitude,
                                  report.location.address
                                );
                              }
                            }}
                            className={styles.mapLink}
                          >
                            <i className="fas fa-map-marked-alt"></i> View on Map
                          </button>
                        </div>
                      )}
                      {report.assignedTo && (
                        <div className={styles.detail}>
                          <i className="fas fa-user-shield"></i>
                          <span>Assigned to: {report.assignedTo}</span>
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
                        <strong>Your Response:</strong>
                        <p>{report.governmentResponse}</p>
                        {report.resolvedAt && (
                          <small>Resolved on {report.resolvedAt.toDate?.()?.toLocaleString() || 'N/A'}</small>
                        )}
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
                        {report.governmentResponse ? 'Update Response' : 'Respond to Report'}
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
                <div className={styles.reporterInfo} style={{
                  padding: '15px',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <strong>Reporter Information:</strong>
                  <p style={{ margin: '5px 0' }}>Name: {selectedReport.reporterName}</p>
                  <p style={{ margin: '5px 0' }}>Email: {selectedReport.reporterEmail}</p>
                  <p style={{ margin: '5px 0' }}>Location: {selectedReport.location.address}</p>
                </div>

                <div className={styles.formGroup}>
                  <label>Status *</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className={styles.select}
                  >
                    <option value="pending">Pending - Awaiting review</option>
                    <option value="investigating">Investigating - Currently looking into it</option>
                    <option value="resolved">Resolved - Issue has been addressed</option>
                    <option value="rejected">Rejected - Invalid or duplicate report</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Priority *</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className={styles.select}
                  >
                    <option value="low">Low - Minor issue</option>
                    <option value="medium">Medium - Moderate concern</option>
                    <option value="high">High - Serious issue</option>
                    <option value="urgent">Urgent - Immediate action required</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Official Government Response</label>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Write your response to the citizen. This will be visible to the reporter..."
                    rows={5}
                    className={styles.textarea}
                  />
                  <small style={{ color: '#666', display: 'block', marginTop: '8px' }}>
                    <i className="fas fa-info-circle"></i> 
                    This response will be sent to {selectedReport.reporterEmail}
                  </small>
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
                    Update Report & Notify Citizen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map Modal */}
        {showMapModal && mapLocation && (
          <div className={styles.modal} onClick={() => setShowMapModal(false)}>
            <div 
              className={styles.modalContent} 
              style={{ width: '90%', maxWidth: '1200px', height: '85vh', padding: '0' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader} style={{ borderRadius: '12px 12px 0 0' }}>
                <h2>
                  <i className="fas fa-map-marked-alt"></i> Incident Location
                </h2>
                <button
                  onClick={() => setShowMapModal(false)}
                  className={styles.closeBtn}
                >
                  ✕
                </button>
              </div>
              <div style={{ 
                padding: '15px 20px', 
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                borderBottom: '2px solid #ddd'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-map-marker-alt" style={{ color: '#F44336', fontSize: '20px' }}></i>
                  <div>
                    <strong style={{ fontSize: '16px', color: '#333' }}>{mapLocation.address}</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                      Coordinates: {mapLocation.lat.toFixed(6)}, {mapLocation.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ height: 'calc(100% - 130px)', width: '100%' }}>
                <MapContainer 
                  center={[mapLocation.lat, mapLocation.lng]} 
                  zoom={16} 
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[mapLocation.lat, mapLocation.lng]}>
                    <Popup>
                      <div style={{ textAlign: 'center' }}>
                        <strong>📍 Incident Location</strong>
                        <p style={{ margin: '5px 0', fontSize: '12px' }}>{mapLocation.address}</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
