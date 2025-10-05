'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useStatsTracker } from '@/lib/useStatsTracker';
import EcoScannerDialog from '@/app/dashboard/EcoScannerDialog';
import styles from './Dashboard.module.css';

// Utility function to format time ago
const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return date.toLocaleDateString();
};

export default function Dashboard() {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const { trackEcoScan } = useStatsTracker();
  const [isScannerOpen, setIsScannerOpen] = useState(false); // ✅ dialog state
  
  // Real user stats
  const [userStats, setUserStats] = useState({
    itemsScanned: 0,
    itemsSwapped: 0,
    pointsEarned: 0,
    loading: true
  });
  
  // Recent activity data
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Fetch real user statistics
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return;
      
      try {
        // Get user's personal stats
        const userStatsRef = doc(db, 'userStats', user.uid);
        const userStatsDoc = await getDoc(userStatsRef);
        
        let itemsScanned = 0;
        let itemsSwapped = 0;
        let pointsEarned = 0;
        
        if (userStatsDoc.exists()) {
          const data = userStatsDoc.data();
          itemsScanned = data.itemsScanned || 0;
          itemsSwapped = data.itemsSwapped || 0;
          // Calculate points: 10 points per scan, 50 points per swap, 5 points per challenge
          pointsEarned = (itemsScanned * 10) + (itemsSwapped * 50) + ((data.challengesCompleted || 0) * 5);
        }
        
        // Also get scan count from userProductScans collection for more accuracy
        try {
          const scansQuery = query(
            collection(db, 'userProductScans'),
            where('userId', '==', user.uid)
          );
          const scansSnapshot = await getDocs(scansQuery);
          itemsScanned = Math.max(itemsScanned, scansSnapshot.size);
        } catch (error) {
          // Product scans collection not available, using fallback data
          console.debug('Product scans collection not accessible:', error);
        }
        
        // Get user's swap items count from swapItems collection
        try {
          const swapQuery = query(
            collection(db, 'swapItems'),
            where('userId', '==', user.uid)
          );
          const swapSnapshot = await getDocs(swapQuery);
          itemsSwapped = Math.max(itemsSwapped, swapSnapshot.size);
        } catch (error) {
          // Swap collection not available, using fallback data
          console.debug('Swap collection not accessible:', error);
        }
        
        // Get scan count from scanner usage (you can track this when scanner is used)
        // For now, we'll estimate based on community activity
        try {
          const messagesQuery = query(
            collection(db, 'communityMessages'),
            where('userId', '==', user.uid)
          );
          const messagesSnapshot = await getDocs(messagesQuery);
          // Estimate: 1 scan per 2 community messages (engagement correlation)
          itemsScanned = Math.max(itemsScanned, Math.floor(messagesSnapshot.size / 2));
        } catch (error) {
          // Community messages collection not available, using fallback data
          console.debug('Community messages collection not accessible:', error);
        }
        
        setUserStats({
          itemsScanned,
          itemsSwapped,
          pointsEarned,
          loading: false
        });
        
      } catch (error) {
        console.error('Error fetching user stats:', error);
        setUserStats({
          itemsScanned: 0,
          itemsSwapped: 0,
          pointsEarned: 0,
          loading: false
        });
      }
    };
    
    if (user && !loading) {
      fetchUserStats();
    }
  }, [user, loading]);
  
  // Fetch recent activity
  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (!user) return;
      
      try {
        const activities: any[] = [];
        
        // Get recent community messages
        try {
          const messagesQuery = query(
            collection(db, 'communityMessages'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(2)
          );
          const messagesSnapshot = await getDocs(messagesQuery);
          
          messagesSnapshot.forEach(doc => {
            const data = doc.data();
            activities.push({
              id: doc.id,
              type: 'community',
              icon: '💬',
              title: 'Community Engagement',
              description: 'Posted in community chat',
              time: data.timestamp?.toDate() || new Date()
            });
          });
        } catch (error) {
          // Community messages not available for recent activity, using fallback
          console.debug('Community messages not accessible for recent activity');
        }
        
        // Get recent swap items
        try {
          const swapQuery = query(
            collection(db, 'swapItems'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(2)
          );
          const swapSnapshot = await getDocs(swapQuery);
          
          swapSnapshot.forEach(doc => {
            const data = doc.data();
            activities.push({
              id: doc.id,
              type: 'swap',
              icon: '♻️',
              title: 'Item Listed for Swap',
              description: `Listed "${data.title || 'item'}" for exchange`,
              time: data.createdAt?.toDate() || new Date()
            });
          });
        } catch (error) {
          // Swap items not available for recent activity, using fallback
          console.debug('Swap items not accessible for recent activity');
        }
        
        // Add some default achievements if no activities
        if (activities.length === 0) {
          activities.push(
            {
              id: 'welcome',
              type: 'achievement',
              icon: '🌟',
              title: 'Welcome to GreenGuardian!',
              description: 'Start your sustainable journey today',
              time: new Date()
            },
            {
              id: 'first-login',
              type: 'achievement', 
              icon: '🌱',
              title: 'Account Created',
              description: 'Joined the eco-friendly community',
              time: new Date()
            }
          );
        }
        
        // Sort by time and take most recent 3
        activities.sort((a, b) => b.time.getTime() - a.time.getTime());
        setRecentActivity(activities.slice(0, 3));
        setActivityLoading(false);
        
      } catch (error) {
        console.error('Error fetching recent activity:', error);
        setRecentActivity([
          {
            id: 'fallback',
            type: 'achievement',
            icon: '🌟',
            title: 'Getting Started',
            description: 'Explore GreenGuardian features',
            time: new Date()
          }
        ]);
        setActivityLoading(false);
      }
    };
    
    if (user && !loading) {
      fetchRecentActivity();
    }
  }, [user, loading]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      console.log('Dashboard: No user found, redirecting to login');
      router.push('/login');
    }
  }, [loading, user, router]);

  // Show redirecting message if not authenticated
  if (!loading && !user) {
    return <div>Redirecting...</div>;
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <div className={styles.container}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-xl text-gray-600">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  return (
    <div className={styles.container}>
      <section className={styles.welcomeSection}>
        <div className={styles.welcomeContent}>
          <h1>Welcome, {user?.email?.split('@')[0]}</h1>
          <p className={styles.subtitle}>Your Sustainable Journey Dashboard</p>
          <p className={styles.description}>
            Track your environmental impact, manage your eco-activities, and connect with the
            community. Every small action counts towards a greener future.
          </p>
          <div className={styles.cta}>
            {/* Replace the old scanner route push with dialog open */}
            <button 
              onClick={() => {
                setIsScannerOpen(true);
                // Track scanner usage
                trackEcoScan();
              }} 
              className={styles.btnPrimary}
            >
              Start Scanning
            </button>
            <button onClick={() => router.push('/swap')} className={styles.btnSecondary}>
              View Swaps
            </button>
          </div>
        </div>
        <div className={styles.statsOverview}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {userStats.loading ? '...' : userStats.itemsScanned.toLocaleString()}
            </div>
            <div className={styles.statLabel}>Items Scanned</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {userStats.loading ? '...' : userStats.itemsSwapped.toLocaleString()}
            </div>
            <div className={styles.statLabel}>Items Swapped</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {userStats.loading ? '...' : userStats.pointsEarned.toLocaleString()}
            </div>
            <div className={styles.statLabel}>Points Earned</div>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <h2>Quick Actions</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard} onClick={() => {
            setIsScannerOpen(true);
            trackEcoScan();
          }}>
            <i className="fas fa-camera"></i>
            <h3>Scan Product</h3>
            <p>Check the environmental impact of products and find eco-friendly alternatives</p>
          </div>
          <div className={styles.featureCard} onClick={() => router.push('/swap')}>
            <i className="fas fa-exchange-alt"></i>
            <h3>Your Swaps</h3>
            <p>Manage your item swaps and view available items in your community</p>
          </div>
          <div className={styles.featureCard} onClick={() => router.push('/community')}>
            <i className="fas fa-users"></i>
            <h3>Community</h3>
            <p>Connect with other environmentally conscious individuals in your area</p>
          </div>
          <div className={styles.featureCard} onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <h3>Logout</h3>
            <p>Securely sign out of your GreenGuardian account</p>
          </div>
        </div>
      </section>

      <section className={styles.recentActivity}>
        <h2>Recent Activity</h2>
        <div className={styles.activityGrid}>
          {activityLoading ? (
            <div className={styles.activityCard}>
              <div className={styles.activityIcon}>⏳</div>
              <div className={styles.activityContent}>
                <h3>Loading...</h3>
                <p>Fetching your recent activities</p>
                <span className={styles.activityTime}>Just now</span>
              </div>
            </div>
          ) : (
            recentActivity.map((activity) => (
              <div key={activity.id} className={styles.activityCard}>
                <div className={styles.activityIcon}>{activity.icon}</div>
                <div className={styles.activityContent}>
                  <h3>{activity.title}</h3>
                  <p>{activity.description}</p>
                  <span className={styles.activityTime}>
                    {getTimeAgo(activity.time)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ✅ Eco Scanner Dialog */}
      <EcoScannerDialog
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </div>
  );
}