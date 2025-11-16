'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import GovHeader from '@/components/GovHeader';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db } from '@/lib/firebase';
import styles from '../gov-portal.module.css';

interface GovOfficialProfile {
  fullName: string;
  position: string;
  department: string;
  phoneNumber: string;
  officeAddress: string;
  bio: string;
  updatedAt: any;
}

export default function GovProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GovOfficialProfile>({
    fullName: '',
    position: '',
    department: '',
    phoneNumber: '',
    officeAddress: '',
    bio: '',
    updatedAt: null
  });
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<GovOfficialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isGovOfficial = user?.email?.endsWith('@gordoncollege.edu.ph') || user?.email?.includes('admin');

  useEffect(() => {
    if (!user) return;
    
    const loadProfile = async () => {
      try {
        const profileRef = doc(db, 'govOfficials', user.uid);
        const snapshot = await getDoc(profileRef);
        
        if (snapshot.exists()) {
          const data = snapshot.data() as GovOfficialProfile;
          setProfile(data);
          setEditedProfile(data);
        } else {
          // Initialize with user's display name if available
          const initialProfile: GovOfficialProfile = {
            fullName: user.displayName || '',
            position: '',
            department: '',
            phoneNumber: '',
            officeAddress: '',
            bio: '',
            updatedAt: null
          };
          setProfile(initialProfile);
          setEditedProfile(initialProfile);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading profile:', error);
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!editedProfile || !isGovOfficial || !user) return;

    try {
      const profileRef = doc(db, 'govOfficials', user.uid);
      
      const updatedData = {
        ...editedProfile,
        email: user.email,
        updatedAt: new Date()
      };

      await setDoc(profileRef, updatedData, { merge: true });
      
      // Update Firebase Auth display name
      if (editedProfile.fullName && editedProfile.fullName !== user.displayName) {
        await updateProfile(user, {
          displayName: editedProfile.fullName
        });
      }

      setProfile(editedProfile);
      setEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all password fields' });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        setMessage({ type: 'error', text: 'Current password is incorrect' });
      } else {
        setMessage({ type: 'error', text: 'Failed to change password' });
      }
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (!user) {
    return (
      <>
        <GovHeader />
        <div className={styles.container}>
          <div className={styles.loginPrompt}>
            <h2>Please log in to view your profile</h2>
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

  return (
    <>
      <GovHeader />
      
      <div className={styles.container}>
        <section className={styles.hero}>
          <h1>👤 Government Official Profile</h1>
          <p className={styles.subtitle}>
            Manage your profile information and account settings
          </p>
        </section>

        {message && (
          <div style={{
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            background: message.type === 'success' ? '#e8f5e9' : '#ffebee',
            border: `2px solid ${message.type === 'success' ? '#4CAF50' : '#F44336'}`,
            color: message.type === 'success' ? '#2e7d32' : '#c62828',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
            {message.text}
          </div>
        )}

        <section className={styles.statsSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2>Profile Information</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className={styles.actionBtn}
              >
                <i className="fas fa-edit"></i> Edit Profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => { 
                    setEditing(false); 
                    setEditedProfile(profile); 
                  }} 
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button onClick={handleUpdateProfile} className={styles.saveBtn}>
                  <i className="fas fa-save"></i> Save Changes
                </button>
              </div>
            )}
          </div>

          <div className={styles.reportCard}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <div className={styles.formGroup}>
                  <label>Full Name *</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedProfile?.fullName || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile!, fullName: e.target.value })}
                      className={styles.input}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', color: '#2c3e50' }}>
                      {profile.fullName || 'Not set'}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Position/Title</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedProfile?.position || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile!, position: e.target.value })}
                      className={styles.input}
                      placeholder="e.g., Environmental Officer"
                    />
                  ) : (
                    <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', color: '#2c3e50' }}>
                      {profile.position || 'Not set'}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Department</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedProfile?.department || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile!, department: e.target.value })}
                      className={styles.input}
                      placeholder="e.g., Environment and Natural Resources"
                    />
                  ) : (
                    <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', color: '#2c3e50' }}>
                      {profile.department || 'Not set'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className={styles.formGroup}>
                  <label>Email Address</label>
                  <div style={{ padding: '12px', background: '#e8eef5', borderRadius: '8px', color: '#5a6c7d' }}>
                    {user.email}
                  </div>
                  <small style={{ color: '#7f8c8d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Email cannot be changed
                  </small>
                </div>

                <div className={styles.formGroup}>
                  <label>Phone Number</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={editedProfile?.phoneNumber || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile!, phoneNumber: e.target.value })}
                      className={styles.input}
                      placeholder="e.g., +63 912 345 6789"
                    />
                  ) : (
                    <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', color: '#2c3e50' }}>
                      {profile.phoneNumber || 'Not set'}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>Office Address</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedProfile?.officeAddress || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile!, officeAddress: e.target.value })}
                      className={styles.input}
                      placeholder="Enter office address"
                    />
                  ) : (
                    <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', color: '#2c3e50' }}>
                      {profile.officeAddress || 'Not set'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
              <label>Bio / Description</label>
              {editing ? (
                <textarea
                  value={editedProfile?.bio || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile!, bio: e.target.value })}
                  className={styles.textarea}
                  rows={4}
                  placeholder="Brief description about yourself and your role..."
                />
              ) : (
                <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', color: '#2c3e50', minHeight: '100px' }}>
                  {profile.bio || 'No bio provided'}
                </div>
              )}
            </div>

            {profile.updatedAt && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0', color: '#7f8c8d', fontSize: '14px' }}>
                Last updated: {new Date(profile.updatedAt.seconds * 1000).toLocaleString()}
              </div>
            )}
          </div>
        </section>

        <section className={styles.statsSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2>Security Settings</h2>
            {!changingPassword ? (
              <button
                onClick={() => setChangingPassword(true)}
                className={styles.actionBtn}
                style={{ background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)' }}
              >
                <i className="fas fa-key"></i> Change Password
              </button>
            ) : (
              <button
                onClick={() => {
                  setChangingPassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
            )}
          </div>

          {changingPassword && (
            <div className={styles.reportCard}>
              <div style={{ maxWidth: '500px' }}>
                <div className={styles.formGroup}>
                  <label>Current Password *</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Enter current password"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>New Password *</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Enter new password (min. 6 characters)"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Confirm New Password *</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Confirm new password"
                  />
                </div>

                <button 
                  onClick={handleChangePassword} 
                  className={styles.saveBtn}
                  style={{ marginTop: '1rem' }}
                >
                  <i className="fas fa-check"></i> Update Password
                </button>
              </div>
            </div>
          )}

          {!changingPassword && (
            <div className={styles.reportCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#7f8c8d' }}>
                <i className="fas fa-shield-alt" style={{ fontSize: '32px', color: '#4CAF50' }}></i>
                <div>
                  <strong style={{ color: '#2c3e50', display: 'block', marginBottom: '4px' }}>
                    Password Protected
                  </strong>
                  <span style={{ fontSize: '14px' }}>
                    Your account is secured with a password. Click "Change Password" to update it.
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
