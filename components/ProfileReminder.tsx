'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import styles from './ProfileReminder.module.css';

export default function ProfileReminder() {
  const { user } = useAuth();
  const router = useRouter();
  const [showReminder, setShowReminder] = useState(false);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkProfileCompleteness = async () => {
      try {
        const profileRef = doc(db, 'govOfficials', user.uid);
        const snapshot = await getDoc(profileRef);
        
        if (!snapshot.exists()) {
          // No profile exists at all
          setProfileIncomplete(true);
          setShowReminder(true);
          return;
        }

        const profileData = snapshot.data();
        
        // Check if essential fields are filled
        const isIncomplete = 
          !profileData.fullName || 
          !profileData.position || 
          !profileData.department ||
          !profileData.phoneNumber;

        if (isIncomplete) {
          setProfileIncomplete(true);
          
          // Check if user has dismissed reminder in this session
          const dismissed = sessionStorage.getItem('profileReminderDismissed');
          if (!dismissed) {
            setShowReminder(true);
          }
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      }
    };

    checkProfileCompleteness();
  }, [user]);

  const handleUpdateNow = () => {
    setShowReminder(false);
    router.push('/gov-portal/profile');
  };

  const handleDismiss = () => {
    setShowReminder(false);
    sessionStorage.setItem('profileReminderDismissed', 'true');
  };

  if (!showReminder || !profileIncomplete) return null;

  return (
    <div className={styles.reminderOverlay}>
      <div className={styles.reminderCard}>
        <div className={styles.reminderIcon}>
          <i className="fas fa-user-edit"></i>
        </div>
        <h2 className={styles.reminderTitle}>Complete Your Profile</h2>
        <p className={styles.reminderMessage}>
          Welcome! Please take a moment to complete your profile information. 
          This helps us provide you with a better experience and allows colleagues 
          to identify you properly.
        </p>
        <div className={styles.reminderFields}>
          <p><strong>Required information:</strong></p>
          <ul>
            <li><i className="fas fa-user"></i> Full Name</li>
            <li><i className="fas fa-briefcase"></i> Position/Title</li>
            <li><i className="fas fa-building"></i> Department</li>
            <li><i className="fas fa-phone"></i> Phone Number</li>
          </ul>
        </div>
        <div className={styles.reminderActions}>
          <button onClick={handleUpdateNow} className={styles.primaryBtn}>
            <i className="fas fa-edit"></i> Update Profile Now
          </button>
          <button onClick={handleDismiss} className={styles.secondaryBtn}>
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
}
