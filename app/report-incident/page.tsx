'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Header from '@/components/Header';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import styles from './report-incident.module.css';
import InfoModal from '@/components/InfoModal';
import ConfirmModal from '@/components/ConfirmModal';

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
  // Verification & accuracy tracking
  verified?: boolean;
  verifiedBy?: string;
  verifiedAt?: any;
  accuracy?: {
    communityVotes: number;
    upvotes: number;
    downvotes: number;
    flags: number;
    flagReasons: string[];
  };
  duplicateOf?: string; // Reference to original report if duplicate
  isDuplicate?: boolean;
  relatedReports?: string[]; // Similar reports in area
  reporterReputation?: number;
  lastUpdated?: any;
  updateHistory?: Array<{
    updatedAt: any;
    updateType: string;
    details: string;
  }>;
}

export default function ReportIncidentPage() {
  const { user } = useAuth();
  const [myReports, setMyReports] = useState<IncidentReport[]>([]);
  const [allReports, setAllReports] = useState<IncidentReport[]>([]); // For duplicate detection
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
  const [modalInfo, setModalInfo] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: '',
  });
  const [confirmModalInfo, setConfirmModalInfo] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  // Duplicate detection & verification
  const [similarReports, setSimilarReports] = useState<IncidentReport[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [reporterReputation, setReporterReputation] = useState<number>(100);

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
      
      // Calculate reporter reputation based on report history
      calculateReporterReputation(reports);
    });

    return unsubscribe;
  }, [user]);

  // Load all reports for duplicate detection
  useEffect(() => {
    const allReportsQuery = query(collection(db, 'incidentReports'));
    const unsubscribe = onSnapshot(allReportsQuery, (snapshot) => {
      const reports: IncidentReport[] = [];
      snapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() } as IncidentReport);
      });
      setAllReports(reports);
    });

    return unsubscribe;
  }, []);

  // Calculate reporter reputation
  const calculateReporterReputation = (reports: IncidentReport[]) => {
    if (reports.length === 0) {
      setReporterReputation(100);
      return;
    }

    let score = 100;
    reports.forEach(report => {
      // Increase score for verified reports
      if (report.verified) score += 10;
      // Decrease score for rejected reports
      if (report.status === 'rejected') score -= 20;
      // Consider community voting
      const accuracy = report.accuracy;
      if (accuracy) {
        if (accuracy.downvotes > accuracy.upvotes) score -= 5;
        if (accuracy.flags > 3) score -= 15;
      }
    });

    setReporterReputation(Math.max(0, Math.min(100, score)));
  };

  // Check for duplicate reports
  const checkForDuplicates = () => {
    if (!gpsCoordinates || allReports.length === 0) return;

    const RADIUS_KM = 0.5; // 500 meters
    const TIME_WINDOW_DAYS = 7;
    const now = new Date();
    
    const similar = allReports.filter(report => {
      // Skip own reports
      if (report.reporterId === user?.uid) return false;
      
      // Check if report is within time window
      const reportDate = report.timestamp?.toDate?.() || new Date(0);
      const daysDiff = (now.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > TIME_WINDOW_DAYS) return false;

      // Check if same incident type
      if (report.incidentType !== incidentType) return false;

      // Check GPS proximity if available
      if (report.location.coordinates) {
        const distance = calculateDistance(
          gpsCoordinates.latitude,
          gpsCoordinates.longitude,
          report.location.coordinates.latitude,
          report.location.coordinates.longitude
        );
        if (distance <= RADIUS_KM) return true;
      }

      // Check text similarity
      const titleSimilarity = calculateTextSimilarity(title, report.title);
      const descSimilarity = calculateTextSimilarity(description, report.description);
      
      if (titleSimilarity > 0.7 || descSimilarity > 0.6) return true;

      return false;
    });

    setSimilarReports(similar);
    if (similar.length > 0) {
      setShowDuplicateWarning(true);
    }
  };

  // Calculate distance between two GPS coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Simple text similarity (Jaccard similarity)
  const calculateTextSimilarity = (text1: string, text2: string): number => {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  };

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
      const data = await response.json();
      return data.display_name || 'Address not found';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return '';
    }
  };

  // Check for duplicates when form changes
  useEffect(() => {
    if (title && description && gpsCoordinates) {
      const timer = setTimeout(() => {
        checkForDuplicates();
      }, 1000); // Debounce
      return () => clearTimeout(timer);
    }
  }, [title, description, gpsCoordinates, incidentType]);

  // Get current GPS location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setModalInfo({ isOpen: true, title: 'Geolocation Error', message: 'Geolocation is not supported by your browser' });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setGpsCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        const fetchedAddress = await reverseGeocode(position.coords.latitude, position.coords.longitude);
        if (fetchedAddress) {
          setAddress(fetchedAddress);
        }
        setGettingLocation(false);
        setModalInfo({ isOpen: true, title: 'Location Captured', message: '📍 Location captured successfully!' });
      },
      (error) => {
        // Gracefully handle geolocation errors
        let errorMessage = 'Failed to get location. ';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'The location request timed out. Please try again.';
            break;
          default:
            errorMessage += 'Please enable GPS and try again.';
        }
        
        console.warn('Geolocation error:', error.code, error.message);
        setModalInfo({ isOpen: true, title: 'Location Error', message: errorMessage });
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

  // Upload photos to Firebase Storage (parallel upload for speed)
  const uploadPhotos = async (): Promise<string[]> => {
    const uploadPromises = photos.map(async (photo) => {
      const storageRef = ref(storage, `incident-reports/${user!.uid}/${Date.now()}-${photo.name}`);
      await uploadBytes(storageRef, photo);
      return getDownloadURL(storageRef);
    });

    return Promise.all(uploadPromises);
  };

  // Submit incident report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!title || !description || !address) {
      setModalInfo({ isOpen: true, title: 'Validation Error', message: '⚠️ Please fill in all required fields.' });
      return;
    }

    if (!gpsCoordinates) {
      setModalInfo({ isOpen: true, title: 'Validation Error', message: '⚠️ GPS location is required for verification. Please enable location.' });
      return;
    }

    if (photos.length === 0) {
      setConfirmModalInfo({
        isOpen: true,
        title: 'No Photo Evidence',
        message: '⚠️ No photo evidence provided. Reports with photos have higher credibility. Continue anyway?',
        onConfirm: () => {
          setConfirmModalInfo({ isOpen: false, title: '', message: '', onConfirm: () => {} });
          proceedWithSubmission();
        },
      });
      return;
    }

    proceedWithSubmission();
  };

  const proceedWithSubmission = async () => {
    if (!user || !gpsCoordinates) return;

    // Check for potential duplicates one more time
    checkForDuplicates();
    if (similarReports.length > 0 && !showDuplicateWarning) {
      setConfirmModalInfo({
        isOpen: true,
        title: 'Possible Duplicate',
        message: `⚠️ We found ${similarReports.length} similar report(s) in this area. Are you sure this is a new incident?`,
        onConfirm: () => {
          setConfirmModalInfo({ isOpen: false, title: '', message: '', onConfirm: () => {} });
          submitReportData();
        },
      });
      return;
    }

    submitReportData();
  }

  const submitReportData = async () => {
    if (!user || !gpsCoordinates) return;
    setSubmitting(true);
    
    try {
      // Start photo upload and document creation in parallel for speed
      const photoUploadPromise = photos.length > 0 ? uploadPhotos() : Promise.resolve([]);
      
      // Determine priority based on incident type and evidence
      const priority = determinePriority();
      
      // Create incident report with verification fields
      const reportData = {
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
        photos: [],
        status: 'pending',
        priority,
        timestamp: serverTimestamp(),
        verified: false,
        accuracy: {
          communityVotes: 0,
          upvotes: 0,
          downvotes: 0,
          flags: 0,
          flagReasons: []
        },
        reporterReputation,
        isDuplicate: false,
        relatedReports: similarReports.map(r => r.id),
        lastUpdated: serverTimestamp(),
        updateHistory: []
      };

      const docRef = await addDoc(collection(db, 'incidentReports'), reportData);
      
      // Update with photos once uploaded (non-blocking)
      if (photos.length > 0) {
        photoUploadPromise.then(async (photoUrls) => {
          await updateDoc(doc(db, 'incidentReports', docRef.id), {
            photos: photoUrls
          });
        }).catch(err => console.error('Photo upload error:', err));
      }

      // Reset form immediately
      setTitle('');
      setDescription('');
      setAddress('');
      setPhotos([]);
      setPhotoPreview([]);
      setGpsCoordinates(null);
      setIncidentType('illegal-dumping');
      setSimilarReports([]);
      setShowDuplicateWarning(false);
      setShowForm(false);
      setSubmitting(false);

      setModalInfo({ isOpen: true, title: 'Success', message: '✅ Incident reported successfully! Government officials will review it soon.\n\n💡 Tip: Reports with photo evidence and GPS location are processed faster.' });
    } catch (error) {
      console.error('Error submitting report:', error);
      setModalInfo({ isOpen: true, title: 'Error', message: 'Failed to submit report. Please try again.' });
      setSubmitting(false);
    }
  };

  // Determine priority based on incident type and evidence quality
  const determinePriority = (): 'low' | 'medium' | 'high' | 'urgent' => {
    let score = 0;
    
    // Incident type severity
    if (incidentType === 'illegal-dumping') score += 3;
    if (incidentType === 'water-contamination') score += 4;
    if (incidentType === 'air-pollution') score += 3;
    if (incidentType === 'tree-cutting') score += 2;
    
    // Evidence quality
    if (photos.length > 0) score += 2;
    if (photos.length >= 3) score += 1;
    if (gpsCoordinates) score += 1;
    
    // Reporter credibility
    if (reporterReputation >= 90) score += 1;
    if (reporterReputation < 50) score -= 2;
    
    if (score >= 7) return 'urgent';
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
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
      
      <main className="main-content">
        <InfoModal
          isOpen={modalInfo.isOpen}
          onClose={() => setModalInfo({ isOpen: false, title: '', message: '' })}
          title={modalInfo.title}
          message={modalInfo.message}
        />
        <ConfirmModal
          isOpen={confirmModalInfo.isOpen}
          onClose={() => setConfirmModalInfo({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
          onConfirm={confirmModalInfo.onConfirm}
          title={confirmModalInfo.title}
          message={confirmModalInfo.message}
          confirmText="Continue"
          cancelText="Cancel"
        />
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
            
            {/* Reporter Reputation Badge */}
            <div className={styles.reputationBadge}>
              <span className={styles.reputationLabel}>Your Reporter Score:</span>
              <div className={styles.reputationBar}>
                <div 
                  className={styles.reputationFill}
                  style={{ 
                    width: `${reporterReputation}%`,
                    backgroundColor: reporterReputation >= 80 ? '#4CAF50' : reporterReputation >= 50 ? '#FF9800' : '#F44336'
                  }}
                ></div>
              </div>
              <span className={styles.reputationScore}>{reporterReputation}/100</span>
              <small className={styles.reputationHint}>
                {reporterReputation >= 80 ? '✅ Excellent - Your reports are highly trusted' :
                 reporterReputation >= 50 ? '⚠️ Good - Keep providing accurate reports' :
                 '❌ Low - Improve accuracy to restore credibility'}
              </small>
            </div>

            {/* Duplicate Warning */}
            {showDuplicateWarning && similarReports.length > 0 && (
              <div className={styles.duplicateWarning}>
                <div className={styles.warningHeader}>
                  <i className="fas fa-exclamation-triangle"></i>
                  <strong>Possible Duplicate Report Detected</strong>
                </div>
                <p>We found {similarReports.length} similar report(s) in this area from the past week:</p>
                <div className={styles.similarReportsList}>
                  {similarReports.slice(0, 3).map(report => (
                    <div key={report.id} className={styles.similarReportItem}>
                      <div className={styles.similarReportHeader}>
                        <strong>{report.title}</strong>
                        <span className={styles.similarReportDate}>
                          {report.timestamp?.toDate?.().toLocaleDateString()}
                        </span>
                      </div>
                      <p>{report.description.substring(0, 100)}...</p>
                      <small>📍 {report.location.address}</small>
                    </div>
                  ))}
                </div>
                <p className={styles.warningNote}>
                  <strong>💡 Tip:</strong> If this is the same incident, consider adding a comment to the existing report instead. 
                  Duplicate reports may affect your reporter score.
                </p>
                <button 
                  type="button"
                  onClick={() => setShowDuplicateWarning(false)}
                  className={styles.dismissWarning}
                >
                  I understand, this is a different incident
                </button>
              </div>
            )}
            
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
                <label>GPS Coordinates (Recommended)</label>
                <div className={styles.gpsSection}>
                  {gpsCoordinates ? (
                    <div className={styles.gpsData}>
                      <i className="fas fa-map-marker-alt" style={{ color: '#4CAF50' }}></i>
                      <div>
                        <strong>Location Captured</strong>
                        <p>
                          Lat: {gpsCoordinates.latitude.toFixed(6)}, 
                          Lng: {gpsCoordinates.longitude.toFixed(6)}
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
                      {gettingLocation ? 'Getting Location...' : 'Capture Current Location'}
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
                          {report.verified && (
                            <span className={styles.verifiedBadge} title="Verified by officials">
                              <i className="fas fa-check-circle"></i> VERIFIED
                            </span>
                          )}
                          {report.isDuplicate && (
                            <span className={styles.duplicateBadge} title="Marked as duplicate">
                              <i className="fas fa-copy"></i> DUPLICATE
                            </span>
                          )}
                        </div>
                      </div>

                      <h3>{report.title}</h3>
                      <p className={styles.description}>{report.description}</p>

                      {/* Accuracy Metrics */}
                      {report.accuracy && (
                        <div className={styles.accuracyMetrics}>
                          <div className={styles.metric}>
                            <i className="fas fa-thumbs-up" style={{ color: '#4CAF50' }}></i>
                            <span>{report.accuracy.upvotes}</span>
                          </div>
                          <div className={styles.metric}>
                            <i className="fas fa-thumbs-down" style={{ color: '#F44336' }}></i>
                            <span>{report.accuracy.downvotes}</span>
                          </div>
                          {report.accuracy.flags > 0 && (
                            <div className={styles.metric}>
                              <i className="fas fa-flag" style={{ color: '#FF9800' }}></i>
                              <span>{report.accuracy.flags} flag(s)</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Duplicate Warning for Reporter */}
                      {report.relatedReports && report.relatedReports.length > 0 && (
                        <div className={styles.relatedReportsNote}>
                          <i className="fas fa-info-circle"></i>
                          <span>
                            This report is related to {report.relatedReports.length} other report(s) in the area
                          </span>
                        </div>
                      )}

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
      </main>
    </>
  );
}
