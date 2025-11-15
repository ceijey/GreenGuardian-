'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Header from '@/components/Header';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import styles from './report-incident.module.css';

interface IncidentReport {
  id: string;
  reporterId: string;
  reporterEmail: string;
  reporterName: string;
  incidentType: 'illegal-dumping' | 'pollution' | 'tree-cutting' | 'water-contamination' | 'air-pollution' | 'other';
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
}

export default function ReportIncidentPage() {
  const { user } = useAuth();
  const [myReports, setMyReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(true);
  
  // Form state
  const [incidentType, setIncidentType] = useState<'illegal-dumping' | 'pollution' | 'tree-cutting' | 'water-contamination' | 'air-pollution' | 'other'>('illegal-dumping');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const incidentTypes = [
    { id: 'illegal-dumping', label: 'Illegal Dumping', icon: 'fas fa-dumpster', color: '#F44336', description: 'Unauthorized waste disposal' },
    { id: 'pollution', label: 'General Pollution', icon: 'fas fa-smog', color: '#9C27B0', description: 'Air, water, or soil contamination' },
    { id: 'tree-cutting', label: 'Illegal Tree Cutting', icon: 'fas fa-tree', color: '#4CAF50', description: 'Unauthorized deforestation' },
    { id: 'water-contamination', label: 'Water Contamination', icon: 'fas fa-water', color: '#2196F3', description: 'Polluted water sources' },
    { id: 'air-pollution', label: 'Air Pollution', icon: 'fas fa-wind', color: '#FF9800', description: 'Smoke, fumes, or harmful emissions' },
    { id: 'other', label: 'Other Environmental Issue', icon: 'fas fa-exclamation-triangle', color: '#607D8B', description: 'Other environmental concerns' }
  ];

  // Load user's reports
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const reportsQuery = query(
      collection(db, 'incidentReports'),
      where('reporterId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      const reports: IncidentReport[] = [];
      snapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() } as IncidentReport);
      });
      reports.sort((a, b) => {
        const aTime = a.timestamp?.seconds || 0;
        const bTime = b.timestamp?.seconds || 0;
        return bTime - aTime;
      });
      setMyReports(reports);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Get current GPS location and convert to address
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setGpsCoordinates({
          latitude: lat,
          longitude: lng
        });

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();
          
          if (data.display_name) {
            setAddress(data.display_name);
          }
        } catch (error) {
          console.error('Error getting address:', error);
        }
        
        setGettingLocation(false);
        alert('📍 Location captured and address updated!');
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Failed to get location. Please enable GPS and try again.');
        setGettingLocation(false);
      }
    );
  };

  // Handle photo selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setPhotos(filesArray);

      // Create preview URLs
      const previewUrls = filesArray.map(file => URL.createObjectURL(file));
      setPhotoPreview(previewUrls);
    }
  };

  // Upload photos to Firebase Storage
  const uploadPhotos = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const photo of photos) {
      const storageRef = ref(storage, `incident-reports/${user!.uid}/${Date.now()}-${photo.name}`);
      await uploadBytes(storageRef, photo);
      const downloadURL = await getDownloadURL(storageRef);
      uploadedUrls.push(downloadURL);
    }

    return uploadedUrls;
  };

  // Submit incident report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!gpsCoordinates) {
      const confirm = window.confirm('No GPS location captured. Do you want to continue without location data?');
      if (!confirm) return;
    }

    setSubmitting(true);
    try {
      // Upload photos if any
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      // Create incident report
      await addDoc(collection(db, 'incidentReports'), {
        reporterId: user.uid,
        reporterEmail: user.email,
        reporterName: user.displayName || 'Anonymous',
        incidentType,
        title,
        description,
        location: {
          address,
          coordinates: gpsCoordinates
        },
        photos: photoUrls,
        status: 'pending',
        priority: 'medium', // Default priority, can be adjusted by government
        timestamp: serverTimestamp(),
        views: 0,
        upvotes: 0
      });

      // Reset form
      setTitle('');
      setDescription('');
      setAddress('');
      setPhotos([]);
      setPhotoPreview([]);
      setGpsCoordinates(null);
      setIncidentType('illegal-dumping');
      setShowForm(false);

      alert('✅ Incident reported successfully! Government officials will review it soon.');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
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
        <Header logo="fas fa-exclamation-triangle" title="GREENGUARDIAN" />
        <div className={styles.container}>
          <div className={styles.loginPrompt}>
            <i className="fas fa-lock"></i>
            <h2>Login Required</h2>
            <p>Please log in to report environmental incidents</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header logo="fas fa-exclamation-triangle" title="GREENGUARDIAN" />
      
      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <h1>🚨 Environmental Incident Reporting</h1>
          <p className={styles.subtitle}>
            Report illegal dumping, pollution, tree cutting, and other environmental violations
          </p>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{myReports.length}</span>
              <span className={styles.statLabel}>My Reports</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {myReports.filter(r => r.status === 'resolved').length}
              </span>
              <span className={styles.statLabel}>Resolved</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {myReports.filter(r => r.status === 'pending' || r.status === 'investigating').length}
              </span>
              <span className={styles.statLabel}>In Progress</span>
            </div>
          </div>
        </section>

        {/* Toggle Button */}
        <div className={styles.toggleSection}>
          <button
            onClick={() => setShowForm(!showForm)}
            className={styles.toggleBtn}
          >
            <i className={`fas fa-${showForm ? 'list' : 'plus'}`}></i>
            {showForm ? 'View My Reports' : 'Report New Incident'}
          </button>
        </div>

        {/* Report Form */}
        {showForm ? (
          <section className={styles.formSection}>
            <h2>📝 Report an Environmental Incident</h2>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Incident Type Selection */}
              <div className={styles.formGroup}>
                <label>Incident Type *</label>
                <div className={styles.incidentTypes}>
                  {incidentTypes.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setIncidentType(type.id as any)}
                      className={`${styles.typeCard} ${incidentType === type.id ? styles.selected : ''}`}
                      style={{ borderColor: incidentType === type.id ? type.color : '#ddd' }}
                    >
                      <i className={type.icon} style={{ color: type.color }}></i>
                      <strong>{type.label}</strong>
                      <small>{type.description}</small>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className={styles.formGroup}>
                <label htmlFor="title">Incident Title *</label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Brief description of the incident"
                />
              </div>

              {/* Description */}
              <div className={styles.formGroup}>
                <label htmlFor="description">Detailed Description *</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Provide as much detail as possible about what you observed..."
                  rows={5}
                />
              </div>

              {/* Location */}
              <div className={styles.formGroup}>
                <label htmlFor="address">Location Address *</label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  placeholder="Street address or landmark"
                />
              </div>

              {/* GPS Coordinates */}
              <div className={styles.formGroup}>
                <label>GPS Location (Recommended)</label>
                <div className={styles.gpsSection}>
                  {gpsCoordinates ? (
                    <div className={styles.gpsData}>
                      <i className="fas fa-map-marker-alt" style={{ color: '#4CAF50' }}></i>
                      <div>
                        <strong>Location Captured</strong>
                        <p style={{ fontSize: '13px', color: '#666' }}>
                          {address || `${gpsCoordinates.latitude.toFixed(6)}, ${gpsCoordinates.longitude.toFixed(6)}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGpsCoordinates(null)}
                        className={styles.clearBtn}
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className={styles.gpsBtn}
                    >
                      <i className={`fas fa-${gettingLocation ? 'spinner fa-spin' : 'crosshairs'}`}></i>
                      {gettingLocation ? 'Getting Location...' : 'Auto-fill Address from GPS'}
                    </button>
                  )}
                </div>
              </div>

              {/* Photo Upload */}
              <div className={styles.formGroup}>
                <label htmlFor="photos">Upload Photos (Optional but Recommended)</label>
                <input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className={styles.fileInput}
                />
                <p className={styles.hint}>
                  <i className="fas fa-camera"></i>
                  Upload up to 5 photos. Clear photos help authorities respond faster.
                </p>
                
                {/* Photo Previews */}
                {photoPreview.length > 0 && (
                  <div className={styles.photoPreview}>
                    {photoPreview.map((url, index) => (
                      <div key={index} className={styles.previewItem}>
                        <img src={url} alt={`Preview ${index + 1}`} />
                        <button
                          type="button"
                          onClick={() => {
                            const newPhotos = photos.filter((_, i) => i !== index);
                            const newPreviews = photoPreview.filter((_, i) => i !== index);
                            setPhotos(newPhotos);
                            setPhotoPreview(newPreviews);
                          }}
                          className={styles.removePhotoBtn}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className={styles.submitBtn}
              >
                {submitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Submitting Report...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    Submit Report
                  </>
                )}
              </button>
            </form>
          </section>
        ) : (
          /* My Reports Section */
          <section className={styles.reportsSection}>
            <h2>📋 My Incident Reports</h2>
            
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading your reports...</p>
              </div>
            ) : myReports.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="fas fa-clipboard-list"></i>
                <h3>No Reports Yet</h3>
                <p>You haven't submitted any incident reports.</p>
                <button onClick={() => setShowForm(true)} className={styles.createBtn}>
                  Report Your First Incident
                </button>
              </div>
            ) : (
              <div className={styles.reportsList}>
                {myReports.map(report => {
                  const typeInfo = incidentTypes.find(t => t.id === report.incidentType);
                  const reportDate = report.timestamp?.toDate?.() || new Date();
                  
                  return (
                    <div key={report.id} className={styles.reportCard}>
                      <div className={styles.reportHeader}>
                        <div className={styles.reportType}>
                          <i className={typeInfo?.icon} style={{ color: typeInfo?.color }}></i>
                          <span>{typeInfo?.label}</span>
                        </div>
                        <div className={styles.reportMeta}>
                          <span 
                            className={styles.statusBadge}
                            style={{ backgroundColor: getStatusColor(report.status) }}
                          >
                            {report.status.toUpperCase()}
                          </span>
                          <span 
                            className={styles.priorityBadge}
                            style={{ backgroundColor: getPriorityColor(report.priority) }}
                          >
                            {report.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <h3>{report.title}</h3>
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
                          </div>
                        )}
                        <div className={styles.detail}>
                          <i className="fas fa-calendar"></i>
                          <span>{reportDate.toLocaleDateString()} at {reportDate.toLocaleTimeString()}</span>
                        </div>
                        {report.photos.length > 0 && (
                          <div className={styles.detail}>
                            <i className="fas fa-images"></i>
                            <span>{report.photos.length} photo(s) attached</span>
                          </div>
                        )}
                      </div>

                      {/* Photos */}
                      {report.photos.length > 0 && (
                        <div className={styles.reportPhotos}>
                          {report.photos.map((photo, index) => (
                            <img key={index} src={photo} alt={`Evidence ${index + 1}`} />
                          ))}
                        </div>
                      )}

                      {/* Government Response */}
                      {report.governmentResponse && (
                        <div className={styles.govResponse}>
                          <h4>
                            <i className="fas fa-reply"></i>
                            Government Response
                          </h4>
                          <p>{report.governmentResponse}</p>
                          {report.resolvedAt && (
                            <small>
                              Resolved on {report.resolvedAt.toDate().toLocaleDateString()}
                            </small>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
