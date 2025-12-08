'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import PartnerHeader from '@/components/PartnerHeader';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import styles from './profile.module.css';

export default function SponsorProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!loading && !user) {
        router.push('/login');
        return;
      }

      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const role = userDoc.data()?.role;
          setUserRole(role);

          if (role !== 'private-partner') {
            router.push('/dashboard');
            return;
          }

          // Load company profile
          const companyData = userDoc.data();
          setCompanyName(companyData?.companyName || companyData?.displayName || user.email || '');
          setCompanyLogo(companyData?.companyLogo || companyData?.photoURL || '');
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      }
    };

    checkAccess();
  }, [user, loading, router]);

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
          
          // Resize to max 800px width while maintaining aspect ratio
          const maxWidth = 800;
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    try {
      setUploading(true);
      const compressedBase64 = await compressImage(file);
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        companyLogo: compressedBase64,
        photoURL: compressedBase64,
        updatedAt: new Date()
      }, { merge: true });
      
      setCompanyLogo(compressedBase64);
      toast.success('Great job! Your completion has been recorded.');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      setUploading(true);
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        companyName: editCompanyName,
        displayName: editCompanyName,
        email: user.email,
        updatedAt: new Date()
      }, { merge: true });
      
      setCompanyName(editCompanyName);
      setShowEditModal(false);
      toast.success('Great job! Your completion has been recorded.');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditProfile = () => {
    setEditCompanyName(companyName);
    setShowEditModal(true);
  };

  if (loading || !userRole) {
    return (
      <div className={styles.container}>
        <PartnerHeader />
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PartnerHeader />
      
      <main className={styles.main}>
        <div className={styles.profileHeader}>
          <div className={styles.logoSection}>
            <div className={styles.logoContainer}>
              {companyLogo ? (
                <img src={companyLogo} alt="Company Logo" className={styles.logo} />
              ) : (
                <div className={styles.logoPlaceholder}>
                  <i className="fas fa-building"></i>
                </div>
              )}
              <label className={styles.uploadButton} title="Change logo">
                <i className="fas fa-camera"></i>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
          
          <div className={styles.companyInfo}>
            <div className={styles.nameRow}>
              <h1>{companyName}</h1>
              <button 
                className={styles.editButton}
                onClick={handleEditProfile}
              >
                <i className="fas fa-edit"></i> Edit Profile
              </button>
            </div>
            <p className={styles.email}>
              <i className="fas fa-envelope"></i> {user?.email || ''}
            </p>
            <div className={styles.badge}>
              <i className="fas fa-handshake"></i> Verified Sponsor
            </div>
          </div>
        </div>

        <div className={styles.infoCard}>
          <h2>Company Profile</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <i className="fas fa-building"></i>
              <div>
                <label>Company Name</label>
                <p>{companyName}</p>
              </div>
            </div>
            <div className={styles.infoItem}>
              <i className="fas fa-envelope"></i>
              <div>
                <label>Email</label>
                <p>{user?.email || ''}</p>
              </div>
            </div>
            <div className={styles.infoItem}>
              <i className="fas fa-user-tie"></i>
              <div>
                <label>Account Type</label>
                <p>Private Partner Sponsor</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Edit Company Profile</h2>
              <button 
                className={styles.closeBtn}
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Company Name *</label>
                <input
                  type="text"
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  placeholder="Your company name"
                  required
                />
                <small className={styles.fieldHint}>
                  This name will be shown on certificates and sponsorships
                </small>
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
                disabled={uploading || !editCompanyName.trim()}
              >
                {uploading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
