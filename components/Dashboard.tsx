'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useState } from 'react';
import EcoScannerDialog from '@/app/dashboard/EcoScannerDialog';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const [isScannerOpen, setIsScannerOpen] = useState(false); // ✅ dialog state

  // Redirect to login if not authenticated
  if (!loading && !user) {
    console.log('Dashboard: No user found, redirecting to login');
    router.push('/login');
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
            <button onClick={() => setIsScannerOpen(true)} className={styles.btnPrimary}>
              Start Scanning
            </button>
            <button onClick={() => router.push('/swap')} className={styles.btnSecondary}>
              View Swaps
            </button>
          </div>
        </div>
        <div className={styles.statsOverview}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>127</div>
            <div className={styles.statLabel}>Items Scanned</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>45</div>
            <div className={styles.statLabel}>Items Swapped</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>890</div>
            <div className={styles.statLabel}>Points Earned</div>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <h2>Quick Actions</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard} onClick={() => setIsScannerOpen(true)}>
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
          <div className={styles.activityCard}>
            <div className={styles.activityIcon}>🌟</div>
            <div className={styles.activityContent}>
              <h3>Achievement Unlocked</h3>
              <p>Completed 10 eco-friendly product scans</p>
              <span className={styles.activityTime}>2 hours ago</span>
            </div>
          </div>
          <div className={styles.activityCard}>
            <div className={styles.activityIcon}>♻️</div>
            <div className={styles.activityContent}>
              <h3>Successful Swap</h3>
              <p>Exchanged reusable water bottle</p>
              <span className={styles.activityTime}>1 day ago</span>
            </div>
          </div>
          <div className={styles.activityCard}>
            <div className={styles.activityIcon}>🌱</div>
            <div className={styles.activityContent}>
              <h3>Community Impact</h3>
              <p>Joined local recycling initiative</p>
              <span className={styles.activityTime}>3 days ago</span>
            </div>
          </div>
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