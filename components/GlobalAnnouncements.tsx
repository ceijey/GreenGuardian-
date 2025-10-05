'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import styles from './GlobalAnnouncements.module.css';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'urgent';
  priority: 'low' | 'medium' | 'high' | 'critical';
  authorId: string;
  authorName: string;
  timestamp: any;
  expiresAt?: any;
  isGlobal: boolean;
  targetAudience?: string[];
  actionButton?: {
    text: string;
    url: string;
  };
  stats?: {
    views: number;
    clicks: number;
  };
}

interface GlobalAnnouncementsProps {
  position?: 'top' | 'bottom' | 'sidebar';
  maxVisible?: number;
  showCreateButton?: boolean;
}

export default function GlobalAnnouncements({ 
  position = 'top', 
  maxVisible = 3,
  showCreateButton = false 
}: GlobalAnnouncementsProps) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    type: 'info' as const,
    priority: 'medium' as const,
    expiresIn: '7' // days
  });

  useEffect(() => {
    // Load dismissed announcements from localStorage
    const dismissedIds = localStorage.getItem('dismissedAnnouncements');
    if (dismissedIds) {
      setDismissed(new Set(JSON.parse(dismissedIds)));
    }

    // Listen to active announcements
    const announcementsRef = collection(db, 'globalAnnouncements');
    const now = new Date();
    const q = query(
      announcementsRef,
      where('isGlobal', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeAnnouncements: Announcement[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Announcement;
        const expiresAt = data.expiresAt?.toDate();
        
        // Check if announcement is still valid
        if (!expiresAt || expiresAt > now) {
          activeAnnouncements.push({ ...data, id: doc.id });
        }
      });
      
      // Sort by priority and timestamp on client side to avoid composite index
      activeAnnouncements.sort((a, b) => {
        // First sort by priority (critical > high > medium > low)
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        // Then sort by timestamp (newest first)
        if (!a.timestamp || !b.timestamp) return 0;
        const aTime = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const bTime = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return bTime.getTime() - aTime.getTime();
      });
      
      setAnnouncements(activeAnnouncements);
    });

    return () => unsubscribe();
  }, []);

  const dismissAnnouncement = (id: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(id);
    setDismissed(newDismissed);
    
    // Save to localStorage
    localStorage.setItem('dismissedAnnouncements', JSON.stringify([...newDismissed]));
    
    // Update view stats
    updateAnnouncementStats(id, 'view');
  };

  const handleActionClick = (announcement: Announcement) => {
    if (announcement.actionButton?.url) {
      updateAnnouncementStats(announcement.id, 'click');
      window.open(announcement.actionButton.url, '_blank');
    }
  };

  const updateAnnouncementStats = async (id: string, action: 'view' | 'click') => {
    try {
      const announcementRef = doc(db, 'globalAnnouncements', id);
      const field = action === 'view' ? 'stats.views' : 'stats.clicks';
      
      await updateDoc(announcementRef, {
        [field]: (announcements.find(a => a.id === id)?.stats?.[action === 'view' ? 'views' : 'clicks'] || 0) + 1
      });
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

  const createAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAnnouncement.title.trim()) return;

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(newAnnouncement.expiresIn));

      await addDoc(collection(db, 'globalAnnouncements'), {
        title: newAnnouncement.title,
        message: newAnnouncement.message,
        type: newAnnouncement.type,
        priority: newAnnouncement.priority,
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        timestamp: serverTimestamp(),
        expiresAt: expiresAt,
        isGlobal: true,
        stats: { views: 0, clicks: 0 }
      });

      // Reset form
      setNewAnnouncement({
        title: '',
        message: '',
        type: 'info',
        priority: 'medium',
        expiresIn: '7'
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'urgent': return '🚨';
      default: return 'ℹ️';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#2196f3';
      default: return '#4caf50';
    }
  };

  // Filter visible announcements
  const visibleAnnouncements = announcements
    .filter(announcement => !dismissed.has(announcement.id))
    .slice(0, maxVisible);

  if (visibleAnnouncements.length === 0 && !showCreateButton) return null;

  return (
    <div className={`${styles.container} ${styles[position]}`}>
      {visibleAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className={`${styles.announcement} ${styles[announcement.type]} ${styles[announcement.priority]}`}
          style={{ borderLeftColor: getPriorityColor(announcement.priority) }}
        >
          <div className={styles.announcementHeader}>
            <div className={styles.titleSection}>
              <span className={styles.icon}>{getAnnouncementIcon(announcement.type)}</span>
              <h4 className={styles.title}>{announcement.title}</h4>
              <span className={styles.priority}>{announcement.priority}</span>
            </div>
            <button
              onClick={() => dismissAnnouncement(announcement.id)}
              className={styles.dismissButton}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
          
          {announcement.message && (
            <p className={styles.message}>{announcement.message}</p>
          )}
          
          <div className={styles.announcementFooter}>
            <div className={styles.meta}>
              <span className={styles.author}>By {announcement.authorName}</span>
              <span className={styles.timestamp}>
                {announcement.timestamp?.toDate().toLocaleDateString()}
              </span>
            </div>
            
            {announcement.actionButton && (
              <button
                onClick={() => handleActionClick(announcement)}
                className={styles.actionButton}
              >
                {announcement.actionButton.text}
              </button>
            )}
          </div>
        </div>
      ))}
      
      {showCreateButton && user && (
        <div className={styles.createSection}>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={styles.createButton}
          >
            📢 Create Announcement
          </button>
          
          {showCreateForm && (
            <form onSubmit={createAnnouncement} className={styles.createForm}>
              <input
                type="text"
                placeholder="Announcement title"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                className={styles.input}
                required
              />
              
              <textarea
                placeholder="Message (optional)"
                value={newAnnouncement.message}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                className={styles.textarea}
                rows={3}
              />
              
              <div className={styles.formRow}>
                <select
                  value={newAnnouncement.type}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, type: e.target.value as any})}
                  className={styles.select}
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="urgent">Urgent</option>
                </select>
                
                <select
                  value={newAnnouncement.priority}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, priority: e.target.value as any})}
                  className={styles.select}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                
                <select
                  value={newAnnouncement.expiresIn}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, expiresIn: e.target.value})}
                  className={styles.select}
                >
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">1 week</option>
                  <option value="30">1 month</option>
                </select>
              </div>
              
              <div className={styles.formActions}>
                <button type="submit" className={styles.submitButton}>
                  Publish
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}