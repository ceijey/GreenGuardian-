'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import CitizenOnly from '@/components/CitizenOnly';
import Header from '../../components/Header';
import ScoreCard from '@/components/ScoreCard';
import ActivityLog from '@/components/ActivityLog';
import ProgressChart from '@/components/ProgressChart';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import styles from './profile.module.css';
import EcoRewards from '@/components/EcoRewards';

interface UserAction {
  id: string;
  type: string; // 'recycle', 'food-save', 'energy-save', 'transport', 'challenge'
  description: string;
  points: number;
  impact: {
    co2Saved?: number;
    plasticSaved?: number;
    foodSaved?: number;
    energySaved?: number;
    waterSaved?: number;
  };
  timestamp?: {
    seconds: number;
    nanoseconds: number;
  } | null;
  verified: boolean;
}

interface UserStats {
  totalScore: number;
  weeklyScore: number;
  monthlyScore: number;
  rank: number;
  totalActions: number;
  streakDays: number;
  level: number;
  nextLevelPoints: number;
  badges: number;
  totalImpact: {
    co2Saved: number;
    plasticSaved: number;
    foodSaved: number;
    energySaved: number;
    waterSaved: number;
  };
}

interface WeeklyData {
  week: string;
  score: number;
  actions: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats>({
    totalScore: 0,
    weeklyScore: 0,
    monthlyScore: 0,
    rank: 0,
    totalActions: 0,
    streakDays: 0,
    level: 1,
    nextLevelPoints: 100,
    badges: 0,
    totalImpact: {
      co2Saved: 0,
      plasticSaved: 0,
      foodSaved: 0,
      energySaved: 0,
      waterSaved: 0
    }
  });
  const [recentActions, setRecentActions] = useState<UserAction[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('month'); // week, month, year, all
  
  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editContact, setEditContact] = useState('');
  const [userBio, setUserBio] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [userContact, setUserContact] = useState('');
  const [uploading, setUploading] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState('');
  
  // Settings States
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);

  // Load user stats and actions
  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      try {
        // Load user profile data
        const userProfileRef = doc(db, 'users', user.uid);
        const userProfileDoc = await getDoc(userProfileRef);
        
        if (userProfileDoc.exists()) {
          const profileData = userProfileDoc.data();
          setUserBio(profileData.bio || '');
          setUserLocation(profileData.location || '');
          setUserContact(profileData.contact || '');
          setProfilePhotoURL(profileData.photoURL || user.photoURL || '');
          setEmailNotifications(profileData.emailNotifications !== false);
          setPushNotifications(profileData.pushNotifications !== false);
          setPublicProfile(profileData.publicProfile !== false);
        } else {
          setProfilePhotoURL(user.photoURL || '');
        }
        
        // Load user stats
        const userStatsRef = doc(db, 'userStats', user.uid);
        const userStatsDoc = await getDoc(userStatsRef);
        
        if (userStatsDoc.exists()) {
          const data = userStatsDoc.data();
          // Ensure totalImpact is properly structured
          const safeUserStats: UserStats = {
            totalScore: data.totalScore || 0,
            weeklyScore: data.weeklyScore || 0,
            monthlyScore: data.monthlyScore || 0,
            rank: data.rank || 0,
            totalActions: data.totalActions || 0,
            streakDays: data.streakDays || 0,
            level: data.level || 1,
            nextLevelPoints: data.nextLevelPoints || 100,
            badges: data.badges || 0,
            totalImpact: {
              co2Saved: data.totalImpact?.co2Saved || 0,
              plasticSaved: data.totalImpact?.plasticSaved || 0,
              foodSaved: data.totalImpact?.foodSaved || 0,
              energySaved: data.totalImpact?.energySaved || 0,
              waterSaved: data.totalImpact?.waterSaved || 0
            }
          };
          setUserStats(safeUserStats);
        } else {
          // Initialize empty user stats - will be updated as user performs actions
          console.log('No user stats found, user needs to start logging actions');
        }

        // Load recent actions (simplified query to avoid index requirement)
        const actionsQuery = query(
          collection(db, 'userActions'),
          where('userId', '==', user.uid)
        );
        
        const unsubscribeActions = onSnapshot(actionsQuery, (snapshot) => {
          const actions: UserAction[] = [];
          snapshot.forEach((doc) => {
            actions.push({ id: doc.id, ...doc.data() } as UserAction);
          });
          // Sort by timestamp on client side with null safety
          actions.sort((a, b) => {
            const aTime = a.timestamp?.seconds || 0;
            const bTime = b.timestamp?.seconds || 0;
            return bTime - aTime;
          });
          setRecentActions(actions.slice(0, 20)); // Last 20 actions
        }, (error) => {
          console.log('Actions query failed, using empty array:', error);
          setRecentActions([]);
        });

        // Load weekly progress (simplified query to avoid index requirement)
        const weeklyQuery = query(
          collection(db, 'weeklyProgress'),
          where('userId', '==', user.uid)
        );
        
        const unsubscribeWeekly = onSnapshot(weeklyQuery, (snapshot) => {
          const weekly: WeeklyData[] = [];
          snapshot.forEach((doc) => {
            weekly.push(doc.data() as WeeklyData);
          });
          // Sort by week on client side
          weekly.sort((a, b) => new Date(b.week).getTime() - new Date(a.week).getTime());
          
          setWeeklyProgress(weekly.slice(0, 12)); // Last 12 weeks
        }, (error) => {
          console.log('Weekly progress query failed, using empty array:', error);
          setWeeklyProgress([]);
        });

        setLoading(false);

        return () => {
          unsubscribeActions();
          unsubscribeWeekly();
        };
      } catch (error) {
        console.error('Error loading user data:', error);
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const calculateLevel = (score: number) => {
    return Math.floor(score / 100) + 1;
  };

  const calculateProgress = (score: number) => {
    const currentLevelMin = (calculateLevel(score) - 1) * 100;
    const nextLevelMin = calculateLevel(score) * 100;
    return ((score - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100;
  };

  const getScoreColor = (score: number) => {
    if (score >= 1000) return '#4CAF50'; // Green for expert
    if (score >= 500) return '#2196F3'; // Blue for advanced
    if (score >= 200) return '#FF9800'; // Orange for intermediate
    return '#9C27B0'; // Purple for beginner
  };

  const getLevelTitle = (level: number) => {
    if (level >= 10) return 'Eco Master';
    if (level >= 7) return 'Green Guru';
    if (level >= 5) return 'Sustainability Pro';
    if (level >= 3) return 'Eco Warrior';
    return 'Green Starter';
  };

  const formatNumber = (num: number, decimals = 0) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(decimals) + 'K';
    }
    return num.toFixed(decimals);
  };

  // Handle profile edit
  const handleEditProfile = () => {
    console.log('Edit profile clicked!');
    console.log('User:', user);
    console.log('Current values:', { userBio, userLocation, userContact });
    setEditName(user?.displayName || '');
    setEditBio(userBio);
    setEditLocation(userLocation);
    setEditContact(userContact);
    setShowEditModal(true);
    console.log('Modal should be visible now');
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      setUploading(true);
      
      // Update Firebase Auth profile
      if (editName !== user.displayName) {
        await updateProfile(user, { displayName: editName });
      }
      // Update Firestore user document (create if doesn't exist)
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        displayName: editName,
        bio: editBio,
        location: editLocation,
        contact: editContact,
        email: user.email,
        updatedAt: new Date()
      }, { merge: true });
      
      setUserBio(editBio);
      setUserLocation(editLocation);
      setUserContact(editContact);
      setShowEditModal(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Compress image to max 1MB for Firestore (returns base64 string)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize to max 1000px width while maintaining aspect ratio
          const maxWidth = 1000;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with quality adjustment
          let quality = 0.7;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          
          // If still too large, reduce quality further (max 1MB = 1,048,576 bytes)
          while (compressedDataUrl.length > 1048576 && quality > 0.1) {
            quality -= 0.1;
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          
          if (compressedDataUrl.length > 1048576) {
            reject(new Error('Image is too large even after compression. Please use a smaller image.'));
          } else {
            resolve(compressedDataUrl);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  // Handle profile photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    
    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    
    try {
      setUploading(true);
      
      // Compress the image to max 1MB and get base64 string
      const compressedBase64 = await compressImage(file);
      
      // Store base64 image in Firestore only (not Firebase Auth - it has length limits)
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        photoURL: compressedBase64,
        updatedAt: new Date()
      }, { merge: true });
      
      setProfilePhotoURL(compressedBase64);
      alert('Profile photo updated successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        emailNotifications,
        pushNotifications,
        publicProfile,
        updatedAt: new Date()
      });
      
      setShowSettingsModal(false);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  if (!user) {
    return (
      <>
        <CitizenOnly />
        <Header logo="fas fa-user" title="GREENGUARDIAN" />
        <div className={styles.container}>
          <div className={styles.loginPrompt}>
            <h2>Please log in to view your sustainability profile</h2>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CitizenOnly />
      <Header logo="fas fa-user" title="GREENGUARDIAN" />
      
      <div className={styles.container}>
        {/* Profile Header */}
        <section className={styles.profileHeader}>
          <div className={styles.userInfo}>
            <div className={styles.avatarContainer}>
              <div className={styles.avatar}>
                {profilePhotoURL ? (
                  <img src={profilePhotoURL} alt="Profile" className={styles.avatarImg} />
                ) : (
                  <i className="fas fa-user-circle"></i>
                )}
              </div>
              <label className={styles.uploadButton} title="Change photo">
                <i className="fas fa-camera"></i>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>
            </div>
            <div className={styles.userDetails}>
              <div className={styles.nameRow}>
                <h1>{user.displayName || user.email}</h1>
                <button 
                  className={styles.editIconButton}
                  onClick={handleEditProfile}
                  title="Edit profile"
                >
                  <i className="fas fa-edit"></i>
                </button>
              </div>
              {user.email && (
                <p className={styles.userEmail}>
                  <i className="fas fa-envelope"></i> {user.email}
                </p>
              )}
              <button 
                className={styles.editProfileButton}
                onClick={handleEditProfile}
              >
                <i className="fas fa-pen"></i> Edit Profile
              </button>
              {userLocation && (
                <p className={styles.userLocation}>
                  <i className="fas fa-map-marker-alt"></i> {userLocation}
                </p>
              )}
              {userContact && (
                <p className={styles.userContact}>
                  <i className="fas fa-phone"></i> {userContact}
                </p>
              )}
              <p className={styles.levelTitle}>{getLevelTitle(userStats.level)}</p>
              <div className={styles.levelBadge}>
                <span>Level {userStats.level}</span>
              </div>
            </div>
          </div>
          
          <div className={styles.headerActions}>
            <button 
              className={styles.certificatesButton}
              onClick={() => window.location.href = '/certificates'}
            >
              <i className="fas fa-certificate"></i> My Certificates
            </button>
            <button 
              className={styles.settingsButton}
              onClick={() => setShowSettingsModal(true)}
            >
              <i className="fas fa-cog"></i> Settings
            </button>
          </div>
          
          <div className={styles.scoreOverview}>
            <div className={styles.mainScore}>
              <div 
                className={styles.scoreCircle}
                style={{ 
                  background: `conic-gradient(${getScoreColor(userStats.totalScore)} ${calculateProgress(userStats.totalScore)}%, #f0f0f0 0%)` 
                }}
              >
                <div className={styles.scoreContent}>
                  <span className={styles.scoreNumber}>{userStats.totalScore}</span>
                  <span className={styles.scoreLabel}>Sustainability Score</span>
                </div>
              </div>
            </div>
            
            <div className={styles.quickStats}>
              <div className={styles.quickStat}>
                <i className="fas fa-trophy"></i>
                <span>Rank #{userStats.rank}</span>
              </div>
              <div className={styles.quickStat}>
                <i className="fas fa-fire"></i>
                <span>{userStats.streakDays} day streak</span>
              </div>
              <div className={styles.quickStat}>
                <i className="fas fa-medal"></i>
                <span>{userStats.badges} badges</span>
              </div>
            </div>
          </div>
        </section>

        {/* Timeframe Filter */}
        <section className={styles.filters}>
          <div className={styles.timeframeButtons}>
            <button
              className={`${styles.timeframeButton} ${selectedTimeframe === 'week' ? styles.active : ''}`}
              onClick={() => setSelectedTimeframe('week')}
            >
              This Week
            </button>
            <button
              className={`${styles.timeframeButton} ${selectedTimeframe === 'month' ? styles.active : ''}`}
              onClick={() => setSelectedTimeframe('month')}
            >
              This Month
            </button>
            <button
              className={`${styles.timeframeButton} ${selectedTimeframe === 'year' ? styles.active : ''}`}
              onClick={() => setSelectedTimeframe('year')}
            >
              This Year
            </button>
            <button
              className={`${styles.timeframeButton} ${selectedTimeframe === 'all' ? styles.active : ''}`}
              onClick={() => setSelectedTimeframe('all')}
            >
              All Time
            </button>
          </div>
        </section>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading your sustainability profile...</p>
          </div>
        ) : (
          <>
            {/* Score Breakdown */}
            <section className={styles.scoreBreakdown}>
              <ScoreCard
                title="Weekly Score"
                score={userStats.weeklyScore}
                icon="fas fa-calendar-week"
                color="#4CAF50"
                trend="+15%"
              />
              <ScoreCard
                title="Monthly Score"
                score={userStats.monthlyScore}
                icon="fas fa-calendar-alt"
                color="#2196F3"
                trend="+8%"
              />
              <ScoreCard
                title="Total Actions"
                score={userStats.totalActions}
                icon="fas fa-tasks"
                color="#FF9800"
                trend="+12%"
              />
            </section>

            {/* Eco Rewards */}
            <section>
              <EcoRewards
                points={userStats.totalScore}
                userId={user.uid}
                onRedeem={(newPoints) => setUserStats((s) => ({ ...s, totalScore: newPoints }))}
              />
            </section>

            {/* Impact Overview */}
            <section className={styles.impactSection}>
              <h2>Your Environmental Impact</h2>
              <div className={styles.impactGrid}>
                <div className={styles.impactCard}>
                  <i className="fas fa-leaf"></i>
                  <div className={styles.impactValue}>
                    {formatNumber(userStats.totalImpact?.co2Saved || 0, 1)} kg
                  </div>
                  <div className={styles.impactLabel}>CO₂ Prevented</div>
                </div>
                
                <div className={styles.impactCard}>
                  <i className="fas fa-bottle-water"></i>
                  <div className={styles.impactValue}>
                    {formatNumber(userStats.totalImpact?.plasticSaved || 0)}
                  </div>
                  <div className={styles.impactLabel}>Plastic Items Saved</div>
                </div>
                
                <div className={styles.impactCard}>
                  <i className="fas fa-apple-alt"></i>
                  <div className={styles.impactValue}>
                    {formatNumber(userStats.totalImpact?.foodSaved || 0, 1)} kg
                  </div>
                  <div className={styles.impactLabel}>Food Waste Prevented</div>
                </div>
                
                <div className={styles.impactCard}>
                  <i className="fas fa-bolt"></i>
                  <div className={styles.impactValue}>
                    {formatNumber(userStats.totalImpact?.energySaved || 0, 1)} kWh
                  </div>
                  <div className={styles.impactLabel}>Energy Saved</div>
                </div>
                
                <div className={styles.impactCard}>
                  <i className="fas fa-tint"></i>
                  <div className={styles.impactValue}>
                    {formatNumber(userStats.totalImpact?.waterSaved || 0)} L
                  </div>
                  <div className={styles.impactLabel}>Water Conserved</div>
                </div>
              </div>
            </section>

            {/* Progress Chart */}
            <section className={styles.chartSection}>
              <h2>Score Progress</h2>
              <ProgressChart data={weeklyProgress} />
            </section>

            {/* Recent Activity */}
            <section className={styles.activitySection}>
              <h2>Recent Activity</h2>
              <ActivityLog actions={recentActions} />
            </section>
          </>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Edit Profile</h2>
              <button 
                className={styles.closeBtn}
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Display Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your full name"
                  className={styles.input}
                  required
                />
                <small className={styles.fieldHint}>
                  This name will be shown in certificates and participant lists
                </small>
              </div>

              <div className={styles.formGroup}>
                <label>Contact Number</label>
                <input
                  type="tel"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  placeholder="+63 XXX XXX XXXX"
                  className={styles.input}
                />
                <small className={styles.fieldHint}>
                  For sponsors to reach you for verification
                </small>
              </div>
              
              <div className={styles.formGroup}>
                <label>Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell us about yourself and your sustainability goals..."
                  className={styles.textarea}
                  rows={4}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="City, Country"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Profile Picture</label>
                <div className={styles.photoUploadSection}>
                  {profilePhotoURL && (
                    <div className={styles.currentPhoto}>
                      <img src={profilePhotoURL} alt="Current profile" />
                    </div>
                  )}
                  <label className={styles.uploadLabel}>
                    <i className="fas fa-cloud-upload-alt"></i>
                    {profilePhotoURL ? 'Change Photo' : 'Upload Photo'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                  </label>
                  <small className={styles.fieldHint}>
                    Max 5MB. Will be compressed to 1MB. Supported: JPG, PNG, GIF
                  </small>
                </div>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton}
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.saveButton}
                onClick={handleSaveProfile}
                disabled={uploading}
              >
                {uploading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Account Settings</h2>
              <button 
                className={styles.closeBtn}
                onClick={() => setShowSettingsModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.settingSection}>
                <h3>Notifications</h3>
                
                <div className={styles.settingItem}>
                  <div>
                    <strong>Email Notifications</strong>
                    <p>Receive updates about your activities and challenges</p>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
                
                <div className={styles.settingItem}>
                  <div>
                    <strong>Push Notifications</strong>
                    <p>Get notified about important community updates</p>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={pushNotifications}
                      onChange={(e) => setPushNotifications(e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
              
              <div className={styles.settingSection}>
                <h3>Privacy</h3>
                
                <div className={styles.settingItem}>
                  <div>
                    <strong>Public Profile</strong>
                    <p>Make your profile visible to other community members</p>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={publicProfile}
                      onChange={(e) => setPublicProfile(e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
              
              <div className={styles.settingSection}>
                <h3>Account Information</h3>
                <div className={styles.infoItem}>
                  <strong>Email:</strong> {user.email}
                </div>
                <div className={styles.infoItem}>
                  <strong>Member Since:</strong> {new Date(user.metadata.creationTime || Date.now()).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton}
                onClick={() => setShowSettingsModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.saveButton}
                onClick={handleSaveSettings}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}