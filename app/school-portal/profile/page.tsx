'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import SchoolHeader from '@/components/SchoolHeader';
import styles from './profile.module.css';

interface SchoolStats {
  resourcesCreated: number;
  challengesCreated: number;
  totalViews: number;
  totalEngagements: number;
  activeLearners: number;
}

interface RecentActivity {
  id: string;
  type: 'resource' | 'challenge';
  title: string;
  timestamp: any;
  views: number;
}

export default function SchoolProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SchoolStats>({
    resourcesCreated: 0,
    challengesCreated: 0,
    totalViews: 0,
    totalEngagements: 0,
    activeLearners: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  
  // Profile data
  const [schoolName, setSchoolName] = useState('');
  const [schoolType, setSchoolType] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [profilePhotoURL, setProfilePhotoURL] = useState('');
  
  // Edit states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Edit form states
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editSchoolType, setEditSchoolType] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  
  // Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [showContactInfo, setShowContactInfo] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadProfileData();
    loadStats();
    loadRecentActivity();
  }, [user, router]);

  const loadProfileData = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setSchoolName(data.schoolName || user.displayName || '');
        setSchoolType(data.schoolType || '');
        setAddress(data.address || '');
        setDescription(data.description || '');
        setWebsite(data.website || '');
        setContactEmail(data.contactEmail || user.email || '');
        setContactPhone(data.contactPhone || '');
        setProfilePhotoURL(data.photoURL || user.photoURL || '');
        setEmailNotifications(data.emailNotifications ?? true);
        setPublicProfile(data.publicProfile ?? true);
        setShowContactInfo(data.showContactInfo ?? true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      // Count resources created by this school
      const resourcesQuery = query(
        collection(db, 'educationalResources'),
        where('createdBy', '==', user.uid)
      );
      const resourcesSnapshot = await getDocs(resourcesQuery);
      const resourcesCreated = resourcesSnapshot.size;

      // Calculate total views and engagements
      let totalViews = 0;
      let totalEngagements = 0;
      resourcesSnapshot.forEach((doc) => {
        const data = doc.data();
        totalViews += data.views || 0;
        totalEngagements += (data.likes || 0) + (data.completions || 0);
      });

      // Count challenges created
      const challengesQuery = query(
        collection(db, 'challenges'),
        where('createdBy', '==', user.uid)
      );
      const challengesSnapshot = await getDocs(challengesQuery);
      const challengesCreated = challengesSnapshot.size;

      // Count active learners (unique users who interacted)
      const interactionsQuery = query(
        collection(db, 'resourceInteractions'),
        where('resourceCreatorId', '==', user.uid)
      );
      const interactionsSnapshot = await getDocs(interactionsQuery);
      const uniqueLearners = new Set();
      interactionsSnapshot.forEach((doc) => {
        uniqueLearners.add(doc.data().userId);
      });

      setStats({
        resourcesCreated,
        challengesCreated,
        totalViews,
        totalEngagements,
        activeLearners: uniqueLearners.size
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    if (!user) return;

    try {
      const activities: RecentActivity[] = [];

      // Get recent resources
      const resourcesQuery = query(
        collection(db, 'educationalResources'),
        where('createdBy', '==', user.uid),
        limit(50)
      );
      const resourcesSnapshot = await getDocs(resourcesQuery);
      resourcesSnapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'resource',
          title: data.title,
          timestamp: data.createdAt,
          views: data.views || 0
        });
      });

      // Get recent challenges
      const challengesQuery = query(
        collection(db, 'challenges'),
        where('createdBy', '==', user.uid),
        limit(50)
      );
      const challengesSnapshot = await getDocs(challengesQuery);
      challengesSnapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'challenge',
          title: data.title,
          timestamp: data.createdAt,
          views: data.participants?.length || 0
        });
      });

      // Sort by timestamp
      activities.sort((a, b) => {
        const timeA = a.timestamp?.toMillis?.() || 0;
        const timeB = b.timestamp?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const handleEditProfile = () => {
    setEditSchoolName(schoolName);
    setEditSchoolType(schoolType);
    setEditAddress(address);
    setEditDescription(description);
    setEditWebsite(website);
    setEditContactEmail(contactEmail);
    setEditContactPhone(contactPhone);
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setUploading(true);
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        schoolName: editSchoolName,
        schoolType: editSchoolType,
        address: editAddress,
        description: editDescription,
        website: editWebsite,
        contactEmail: editContactEmail,
        contactPhone: editContactPhone,
        updatedAt: new Date()
      });

      // Update Firebase Auth profile
      if (user && editSchoolName !== user.displayName) {
        await updateProfile(user, {
          displayName: editSchoolName
        });
      }

      setSchoolName(editSchoolName);
      setSchoolType(editSchoolType);
      setAddress(editAddress);
      setDescription(editDescription);
      setWebsite(editWebsite);
      setContactEmail(editContactEmail);
      setContactPhone(editContactPhone);
      setShowEditModal(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const storageRef = ref(storage, `profile-photos/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      // Update Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { photoURL });

      // Update Firebase Auth
      await updateProfile(user, { photoURL });

      setProfilePhotoURL(photoURL);
      toast.success('Profile photo updated successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        emailNotifications,
        publicProfile,
        showContactInfo,
        updatedAt: new Date()
      });

      setShowSettingsModal(false);
      toast.success('Settings updated successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings. Please try again.');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <>
      <SchoolHeader />
      <div className={styles.container}>
        {/* Profile Header */}
      <div className={styles.profileHeader}>
        <div className={styles.headerActions}>
          <button className={styles.settingsButton} onClick={() => setShowSettingsModal(true)}>
            <i className="fas fa-cog"></i>
          </button>
        </div>

        <div className={styles.userInfo}>
          <div className={styles.avatarContainer}>
            <div className={styles.avatar}>
              {profilePhotoURL ? (
                <img src={profilePhotoURL} alt={schoolName} className={styles.avatarImg} />
              ) : (
                <i className="fas fa-school"></i>
              )}
            </div>
            <label htmlFor="photo-upload" className={styles.uploadButton}>
              <i className="fas fa-camera"></i>
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </div>

          <div className={styles.userDetails}>
            <div className={styles.nameRow}>
              <h1>{schoolName || 'School Name'}</h1>
              <button className={styles.editIconButton} onClick={handleEditProfile}>
                <i className="fas fa-edit"></i>
              </button>
            </div>
            {schoolType && <p className={styles.schoolType}>{schoolType}</p>}
            {address && (
              <p className={styles.address}>
                <i className="fas fa-map-marker-alt"></i> {address}
              </p>
            )}
            {description && <p className={styles.description}>{description}</p>}
          </div>
        </div>

        {/* Contact Info */}
        {(website || contactEmail || contactPhone) && (
          <div className={styles.contactInfo}>
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer" className={styles.contactItem}>
                <i className="fas fa-globe"></i> {website}
              </a>
            )}
            {contactEmail && (
              <a href={`mailto:${contactEmail}`} className={styles.contactItem}>
                <i className="fas fa-envelope"></i> {contactEmail}
              </a>
            )}
            {contactPhone && (
              <p className={styles.contactItem}>
                <i className="fas fa-phone"></i> {contactPhone}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <i className="fas fa-book"></i>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.resourcesCreated}</h3>
            <p>Resources Created</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <i className="fas fa-puzzle-piece"></i>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.challengesCreated}</h3>
            <p>Challenges Created</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <i className="fas fa-eye"></i>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.totalViews}</h3>
            <p>Total Views</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <i className="fas fa-heart"></i>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.totalEngagements}</h3>
            <p>Engagements</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <i className="fas fa-users"></i>
          </div>
          <div className={styles.statContent}>
            <h3>{stats.activeLearners}</h3>
            <p>Active Learners</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.card}>
        <h2>Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <div className={styles.activityList}>
            {recentActivity.map((activity) => (
              <div key={activity.id} className={styles.activityItem}>
                <div className={styles.activityIcon}>
                  <i className={activity.type === 'resource' ? 'fas fa-book' : 'fas fa-puzzle-piece'}></i>
                </div>
                <div className={styles.activityContent}>
                  <h4>{activity.title}</h4>
                  <p>
                    {activity.type === 'resource' ? 'Resource' : 'Challenge'} • 
                    {formatDate(activity.timestamp)} • 
                    {activity.views} {activity.type === 'resource' ? 'views' : 'participants'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No recent activity</p>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Edit School Profile</h2>
              <button className={styles.closeButton} onClick={() => setShowEditModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>School Name *</label>
                <input
                  type="text"
                  value={editSchoolName}
                  onChange={(e) => setEditSchoolName(e.target.value)}
                  placeholder="Enter school name"
                />
              </div>
              <div className={styles.formGroup}>
                <label>School Type</label>
                <select value={editSchoolType} onChange={(e) => setEditSchoolType(e.target.value)}>
                  <option value="">Select type</option>
                  <option value="Elementary School">Elementary School</option>
                  <option value="Middle School">Middle School</option>
                  <option value="High School">High School</option>
                  <option value="University">University</option>
                  <option value="College">College</option>
                  <option value="Technical School">Technical School</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Enter school address"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Tell us about your school"
                  rows={4}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Website</label>
                <input
                  type="url"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Contact Email</label>
                <input
                  type="email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  placeholder="contact@school.com"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Contact Phone</label>
                <input
                  type="tel"
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button 
                className={styles.saveButton} 
                onClick={handleSaveProfile}
                disabled={uploading || !editSchoolName.trim()}
              >
                {uploading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSettingsModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Settings</h2>
              <button className={styles.closeButton} onClick={() => setShowSettingsModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.settingSection}>
                <h3>Notifications</h3>
                <div className={styles.settingItem}>
                  <div className={styles.settingInfo}>
                    <h4>Email Notifications</h4>
                    <p>Receive updates about resource interactions</p>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                    />
                    <span className={`${styles.slider} ${styles.round}`}></span>
                  </label>
                </div>
              </div>

              <div className={styles.settingSection}>
                <h3>Privacy</h3>
                <div className={styles.settingItem}>
                  <div className={styles.settingInfo}>
                    <h4>Public Profile</h4>
                    <p>Make your school profile visible to citizens</p>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={publicProfile}
                      onChange={(e) => setPublicProfile(e.target.checked)}
                    />
                    <span className={`${styles.slider} ${styles.round}`}></span>
                  </label>
                </div>
                <div className={styles.settingItem}>
                  <div className={styles.settingInfo}>
                    <h4>Show Contact Info</h4>
                    <p>Display contact information publicly</p>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={showContactInfo}
                      onChange={(e) => setShowContactInfo(e.target.checked)}
                    />
                    <span className={`${styles.slider} ${styles.round}`}></span>
                  </label>
                </div>
              </div>

              <div className={styles.settingSection}>
                <h3>Account Information</h3>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email</span>
                  <span className={styles.infoValue}>{user?.email}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Member Since</span>
                  <span className={styles.infoValue}>
                    {user?.metadata.creationTime 
                      ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setShowSettingsModal(false)}>
                Cancel
              </button>
              <button className={styles.saveButton} onClick={handleSaveSettings}>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-center" toastOptions={{
        style: { zIndex: 99999 },
        duration: 3000,
      }} />
      </div>
    </>
  );
}
