'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import NGOHeader from '@/components/NGOHeader';
import styles from './profile.module.css';

interface NGOProfile {
  organizationName: string;
  email: string;
  contactPerson: string;
  phone: string;
  address: string;
  website?: string;
  description?: string;
  registrationNumber?: string;
  established?: string;
  focusAreas?: string[];
  verified?: boolean;
}

export default function NGOProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<NGOProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<NGOProfile>({
    organizationName: '',
    email: '',
    contactPerson: '',
    phone: '',
    address: '',
    website: '',
    description: '',
    registrationNumber: '',
    established: '',
    focusAreas: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadProfile();
    }
  }, [user, authLoading, router]);

  const loadProfile = async () => {
    if (!user?.uid) return;

    try {
      const profileDoc = await getDoc(doc(db, 'ngoProfiles', user.uid));
      
      if (profileDoc.exists()) {
        const data = profileDoc.data() as NGOProfile;
        setProfile(data);
        setFormData(data);
      } else {
        // Set default values from user
        const defaultData: NGOProfile = {
          organizationName: user.displayName || '',
          email: user.email || '',
          contactPerson: '',
          phone: '',
          address: '',
          website: '',
          description: '',
          registrationNumber: '',
          established: '',
          focusAreas: [],
        };
        setProfile(defaultData);
        setFormData(defaultData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'ngoProfiles', user.uid), {
        ...formData,
        updatedAt: new Date(),
      });

      setProfile(formData);
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (authLoading || loading) {
    return (
      <>
        <NGOHeader />
        <div className={styles.container}>
          <div className={styles.loading}>
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <NGOHeader />
      <div className={styles.container}>
        <div className={styles.main}>
          <div className={styles.profileHeader}>
            <div className={styles.logoSection}>
              <div className={styles.logoContainer}>
                <div className={styles.logoPlaceholder}>
                  <i className="fas fa-hand-holding-heart"></i>
                </div>
              </div>
            </div>

            <div className={styles.companyInfo}>
              <div className={styles.nameRow}>
                <h1>{profile?.organizationName || 'NGO Organization'}</h1>
                {!editing && (
                  <button 
                    onClick={() => setEditing(true)}
                    className={styles.editButton}
                  >
                    <i className="fas fa-edit"></i>
                    Edit Profile
                  </button>
                )}
              </div>
              <p className={styles.email}>
                <i className="fas fa-envelope"></i>
                {profile?.email}
              </p>
              {profile?.verified && (
                <div className={styles.badge}>
                  <i className="fas fa-check-circle"></i>
                  Verified Organization
                </div>
              )}
            </div>
          </div>

          {editing ? (
            <div className={styles.infoCard}>
              <h2>Edit Profile Information</h2>
              <form onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="organizationName">Organization Name *</label>
                    <input
                      type="text"
                      id="organizationName"
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="contactPerson">Contact Person</label>
                    <input
                      type="text"
                      id="contactPerson"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="website">Website</label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="registrationNumber">Registration Number</label>
                    <input
                      type="text"
                      id="registrationNumber"
                      name="registrationNumber"
                      value={formData.registrationNumber}
                      onChange={handleChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="established">Year Established</label>
                    <input
                      type="text"
                      id="established"
                      name="established"
                      value={formData.established}
                      onChange={handleChange}
                      placeholder="e.g., 2010"
                    />
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="address">Address</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="description">Organization Description</label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Describe your organization's mission and activities..."
                    />
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setFormData(profile!);
                    }}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={styles.saveButton}
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className={styles.infoCard}>
              <h2>Organization Information</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <i className="fas fa-user"></i>
                  <div>
                    <label>Contact Person</label>
                    <p>{profile?.contactPerson || 'Not provided'}</p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <i className="fas fa-phone"></i>
                  <div>
                    <label>Phone</label>
                    <p>{profile?.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <i className="fas fa-globe"></i>
                  <div>
                    <label>Website</label>
                    <p>{profile?.website || 'Not provided'}</p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <i className="fas fa-id-card"></i>
                  <div>
                    <label>Registration Number</label>
                    <p>{profile?.registrationNumber || 'Not provided'}</p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <i className="fas fa-calendar"></i>
                  <div>
                    <label>Established</label>
                    <p>{profile?.established || 'Not provided'}</p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <i className="fas fa-map-marker-alt"></i>
                  <div>
                    <label>Address</label>
                    <p>{profile?.address || 'Not provided'}</p>
                  </div>
                </div>

                {profile?.description && (
                  <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                    <i className="fas fa-align-left"></i>
                    <div>
                      <label>Description</label>
                      <p>{profile.description}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
