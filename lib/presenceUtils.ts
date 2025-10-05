import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface UserPresenceData {
  userId: string;
  name: string;
  email: string;
  lastSeen: any;
  status: 'online' | 'away' | 'offline';
}

/**
 * Updates or creates a user presence document in Firestore
 */
export const updateUserPresence = async (
  userId: string, 
  userData: Partial<UserPresenceData>
): Promise<void> => {
  const userPresenceRef = doc(db, 'userPresence', userId);
  
  try {
    // Try to update existing document
    await updateDoc(userPresenceRef, {
      ...userData,
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    // Document doesn't exist, create it
    try {
      await setDoc(userPresenceRef, {
        userId,
        name: userData.name || 'Anonymous',
        email: userData.email || '',
        status: userData.status || 'online',
        lastSeen: serverTimestamp()
      });
    } catch (createError) {
      console.error('Error creating user presence document:', createError);
      throw createError;
    }
  }
};

/**
 * Sets user status to offline
 */
export const setUserOffline = async (userId: string): Promise<void> => {
  const userPresenceRef = doc(db, 'userPresence', userId);
  
  try {
    await updateDoc(userPresenceRef, { 
      status: 'offline',
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    // Ignore error if document doesn't exist
    console.log('User presence document not found for offline update');
  }
};

/**
 * Creates a user presence listener with automatic cleanup
 */
export const createPresenceManager = (
  userId: string,
  name: string,
  email: string
) => {
  let presenceInterval: NodeJS.Timeout | null = null;
  
  const startPresence = () => {
    // Initial presence update
    updateUserPresence(userId, { name, email, status: 'online' });
    
    // Set up interval for periodic updates
    presenceInterval = setInterval(() => {
      updateUserPresence(userId, { name, email, status: 'online' });
    }, 30000); // Update every 30 seconds
  };
  
  const stopPresence = () => {
    if (presenceInterval) {
      clearInterval(presenceInterval);
      presenceInterval = null;
    }
    setUserOffline(userId);
  };
  
  return {
    start: startPresence,
    stop: stopPresence
  };
};