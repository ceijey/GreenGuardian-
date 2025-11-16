'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PartnerHeader from '@/components/PartnerHeader';
import styles from './analytics.module.css';

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  
  const [analyticsData, setAnalyticsData] = useState({
    totalImpressions: 0,
    totalInvestment: 0,
    totalParticipants: 0,
    engagementRate: 0,
    carbonOffset: 0,
    wasteReduced: 0,
    treesPlanted: 0,
    communitiesImpacted: 0
  });

  useEffect(() => {
    const checkUserRole = async () => {
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
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkUserRole();
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'challenges'),
      where('sponsorId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let impressions = 0;
      let investment = 0;
      let participants = 0;
      let totalActions = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        impressions += data.brandImpressions || 0;
        investment += data.fundingAmount || 0;
        participants += data.participants?.length || 0;
        totalActions += data.totalActions || 0;
      });

      const engagementRate = participants > 0 ? (totalActions / participants) * 100 : 0;

      setAnalyticsData({
        totalImpressions: impressions,
        totalInvestment: investment,
        totalParticipants: participants,
        engagementRate: Math.round(engagementRate),
        carbonOffset: Math.round(totalActions * 0.5), // kg CO2
        wasteReduced: Math.round(totalActions * 1.2), // kg
        treesPlanted: Math.round(totalActions * 0.01),
        communitiesImpacted: snapshot.size
      });
    });

    return unsubscribe;
  }, [user]);

  if (loading || isLoading) {
    return (
      <div className={styles.container}>
        <PartnerHeader />
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PartnerHeader />
      
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1>CSR Analytics Dashboard</h1>
            <p>Track your corporate social responsibility impact</p>
          </div>
          <div className={styles.timeRangeSelector}>
            <button 
              className={timeRange === 'week' ? styles.active : ''}
              onClick={() => setTimeRange('week')}
            >
              Week
            </button>
            <button 
              className={timeRange === 'month' ? styles.active : ''}
              onClick={() => setTimeRange('month')}
            >
              Month
            </button>
            <button 
              className={timeRange === 'year' ? styles.active : ''}
              onClick={() => setTimeRange('year')}
            >
              Year
            </button>
          </div>
        </div>

        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <i className="fas fa-eye"></i>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiValue}>{analyticsData.totalImpressions.toLocaleString()}</span>
              <span className={styles.kpiLabel}>Brand Impressions</span>
              <span className={styles.kpiChange}>+12% from last month</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <i className="fas fa-users"></i>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiValue}>{analyticsData.totalParticipants.toLocaleString()}</span>
              <span className={styles.kpiLabel}>Community Participants</span>
              <span className={styles.kpiChange}>+8% from last month</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <i className="fas fa-percentage"></i>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiValue}>{analyticsData.engagementRate}%</span>
              <span className={styles.kpiLabel}>Engagement Rate</span>
              <span className={styles.kpiChange}>+5% from last month</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <i className="fas fa-hand-holding-usd"></i>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiValue}>₱{analyticsData.totalInvestment.toLocaleString()}</span>
              <span className={styles.kpiLabel}>Total Investment</span>
              <span className={styles.kpiChange}>YTD Total</span>
            </div>
          </div>
        </div>

        <div className={styles.impactSection}>
          <h2>Environmental Impact</h2>
          <div className={styles.impactGrid}>
            <div className={styles.impactCard}>
              <i className="fas fa-cloud"></i>
              <span className={styles.impactValue}>{analyticsData.carbonOffset.toLocaleString()} kg</span>
              <span className={styles.impactLabel}>Carbon Offset</span>
            </div>
            <div className={styles.impactCard}>
              <i className="fas fa-recycle"></i>
              <span className={styles.impactValue}>{analyticsData.wasteReduced.toLocaleString()} kg</span>
              <span className={styles.impactLabel}>Waste Reduced</span>
            </div>
            <div className={styles.impactCard}>
              <i className="fas fa-tree"></i>
              <span className={styles.impactValue}>{analyticsData.treesPlanted}</span>
              <span className={styles.impactLabel}>Trees Equivalent</span>
            </div>
            <div className={styles.impactCard}>
              <i className="fas fa-home"></i>
              <span className={styles.impactValue}>{analyticsData.communitiesImpacted}</span>
              <span className={styles.impactLabel}>Communities Impacted</span>
            </div>
          </div>
        </div>

        <div className={styles.chartSection}>
          <div className={styles.chartCard}>
            <h3>Sponsorship Performance</h3>
            <div className={styles.chartPlaceholder}>
              <i className="fas fa-chart-line"></i>
              <p>Interactive charts coming soon</p>
            </div>
          </div>
          <div className={styles.chartCard}>
            <h3>ROI & Brand Value</h3>
            <div className={styles.chartPlaceholder}>
              <i className="fas fa-chart-bar"></i>
              <p>Interactive charts coming soon</p>
            </div>
          </div>
        </div>

        <div className={styles.reportSection}>
          <h2>Sustainability Reports</h2>
          <div className={styles.reportCards}>
            <div className={styles.reportCard}>
              <i className="fas fa-file-pdf"></i>
              <div className={styles.reportInfo}>
                <h4>Q4 2024 Impact Report</h4>
                <p>Comprehensive CSR performance analysis</p>
              </div>
              <button className={styles.downloadButton}>
                <i className="fas fa-download"></i>
                Download
              </button>
            </div>
            <div className={styles.reportCard}>
              <i className="fas fa-file-pdf"></i>
              <div className={styles.reportInfo}>
                <h4>Annual Sustainability Report</h4>
                <p>Full year environmental impact summary</p>
              </div>
              <button className={styles.downloadButton}>
                <i className="fas fa-download"></i>
                Download
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
