'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  addDoc,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import styles from './CommunityNotifications.module.css';

interface Notification {
  id: string;
  type: 'message' | 'like' | 'reply' | 'mention' | 'achievement' | 'challenge';
  title: string;
  message: string;
  userId: string;
  targetUserId: string;
  read: boolean;
  timestamp: any;
  actionUrl?: string;
  metadata?: {
    messageId?: string;
    challengeId?: string;
    achievementType?: string;
  };
}

interface CommunityNotificationsProps {
  position?: 'top-right' | 'bottom-right' | 'sidebar';
}

export default function CommunityNotifications({ 
  position = 'top-right' 
}: CommunityNotificationsProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Listen to user's notifications (without orderBy to avoid composite index)
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('targetUserId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userNotifications: Notification[] = [];
      let unread = 0;
      
      snapshot.forEach((doc) => {
        const notification = { id: doc.id, ...doc.data() } as Notification;
        userNotifications.push(notification);
        if (!notification.read) unread++;
      });
      
      // Sort by timestamp on the client side to avoid composite index requirement
      userNotifications.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        const aTime = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const bTime = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return bTime.getTime() - aTime.getTime();
      });
      
      setNotifications(userNotifications);
      setUnreadCount(unread);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const promises = unreadNotifications.map(notification =>
        updateDoc(doc(db, 'notifications', notification.id), { read: true })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message': return '💬';
      case 'like': return '❤️';
      case 'reply': return '↩️';
      case 'mention': return '👋';
      case 'achievement': return '🏆';
      case 'challenge': return '🎯';
      default: return '🔔';
    }
  };

  // Format timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <div className={`${styles.container} ${styles[position]}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.bellButton}
        title="Community Notifications"
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Community Updates</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className={styles.markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.notifications}>
            {loading ? (
              <div className={styles.loading}>Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🔔</div>
                <p>No notifications yet</p>
                <span>Join the community discussion to stay updated!</span>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`${styles.notification} ${!notification.read ? styles.unread : ''}`}
                >
                  <div className={styles.notificationIcon}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className={styles.notificationContent}>
                    <div className={styles.notificationTitle}>
                      {notification.title}
                    </div>
                    <div className={styles.notificationMessage}>
                      {notification.message}
                    </div>
                    <div className={styles.notificationTime}>
                      {formatTime(notification.timestamp)}
                    </div>
                  </div>
                  {!notification.read && <div className={styles.unreadDot}></div>}
                </div>
              ))
            )}
          </div>

          {notifications.length > 10 && (
            <div className={styles.footer}>
              <button 
                onClick={() => window.location.href = '/community'}
                className={styles.viewAll}
              >
                View all in Community
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)}></div>}
    </div>
  );
}

// Utility function to create notifications (can be called from other components)
export const createCommunityNotification = async (
  type: 'message' | 'like' | 'reply' | 'mention' | 'achievement' | 'challenge',
  title: string,
  message: string,
  targetUserId: string,
  userId: string,
  actionUrl?: string,
  metadata?: any
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      type,
      title,
      message,
      targetUserId,
      userId,
      actionUrl,
      metadata,
      read: false,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};