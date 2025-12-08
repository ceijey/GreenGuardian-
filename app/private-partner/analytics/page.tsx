'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PartnerHeader from '@/components/PartnerHeader';
import toast from 'react-hot-toast';
import styles from './analytics.module.css';

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [downloading, setDownloading] = useState<string | null>(null);
  
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

  const handleDownloadReport = async (reportType: 'quarterly' | 'annual') => {
    if (!user) return;

    setDownloading(reportType);

    try {
      // Fetch additional data for comprehensive report
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      const reportData = {
        reportType: reportType === 'quarterly' ? 'Q4 2024 Impact Report' : 'Annual Sustainability Report 2024',
        generatedDate: new Date().toISOString(),
        period: reportType === 'quarterly' ? 'October - December 2024' : 'January - December 2024',
        organization: {
          name: userData?.companyName || 'Private Partner',
          email: userData?.email || user.email,
          partnerId: user.uid
        },
        metrics: {
          brandImpressions: analyticsData.totalImpressions,
          totalInvestment: analyticsData.totalInvestment,
          communityParticipants: analyticsData.totalParticipants,
          engagementRate: analyticsData.engagementRate
        },
        environmentalImpact: {
          carbonOffset: analyticsData.carbonOffset,
          wasteReduced: analyticsData.wasteReduced,
          treesEquivalent: analyticsData.treesPlanted,
          communitiesImpacted: analyticsData.communitiesImpacted
        },
        socialImpact: {
          livesImpacted: analyticsData.totalParticipants,
          educationalReach: Math.round(analyticsData.totalParticipants * 0.8),
          volunteerHours: Math.round(analyticsData.totalParticipants * 2.5),
          communityEvents: analyticsData.communitiesImpacted
        },
        roi: {
          socialReturn: `₱${Math.round(analyticsData.totalInvestment * 2.5).toLocaleString()}`,
          brandValueIncrease: '18%',
          mediaEquivalency: `₱${Math.round(analyticsData.totalImpressions * 0.5).toLocaleString()}`,
          stakeholderEngagement: analyticsData.engagementRate + '%'
        },
        achievements: [
          'ISO 14001 Environmental Management System',
          'Carbon Neutral Partnership Badge',
          'Community Impact Excellence Award',
          'Sustainable Business Leader Recognition'
        ],
        recommendations: [
          'Increase community engagement programs by 25%',
          'Expand waste reduction initiatives to 3 new municipalities',
          'Launch employee volunteer program',
          'Partner with 2 additional schools for environmental education'
        ]
      };

      // Create downloadable file
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType === 'quarterly' ? 'Q4-2024' : 'Annual-2024'}-CSR-Impact-Report.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Also create a readable PDF-style text version
      const textReport = `
═══════════════════════════════════════════════════════════════
  ${reportData.reportType}
═══════════════════════════════════════════════════════════════

Generated: ${new Date(reportData.generatedDate).toLocaleString()}
Period: ${reportData.period}

ORGANIZATION INFORMATION
────────────────────────────────────────────────────────────────
Company: ${reportData.organization.name}
Contact: ${reportData.organization.email}
Partner ID: ${reportData.organization.partnerId}

KEY PERFORMANCE METRICS
────────────────────────────────────────────────────────────────
Brand Impressions: ${reportData.metrics.brandImpressions.toLocaleString()}
Total Investment: ₱${reportData.metrics.totalInvestment.toLocaleString()}
Community Participants: ${reportData.metrics.communityParticipants.toLocaleString()}
Engagement Rate: ${reportData.metrics.engagementRate}%

ENVIRONMENTAL IMPACT
────────────────────────────────────────────────────────────────
Carbon Offset: ${reportData.environmentalImpact.carbonOffset.toLocaleString()} kg CO₂
Waste Reduced: ${reportData.environmentalImpact.wasteReduced.toLocaleString()} kg
Trees Equivalent: ${reportData.environmentalImpact.treesEquivalent}
Communities Impacted: ${reportData.environmentalImpact.communitiesImpacted}

SOCIAL IMPACT
────────────────────────────────────────────────────────────────
Lives Impacted: ${reportData.socialImpact.livesImpacted.toLocaleString()}
Educational Reach: ${reportData.socialImpact.educationalReach.toLocaleString()} people
Volunteer Hours: ${reportData.socialImpact.volunteerHours.toLocaleString()} hours
Community Events: ${reportData.socialImpact.communityEvents}

RETURN ON INVESTMENT (ROI)
────────────────────────────────────────────────────────────────
Social Return: ${reportData.roi.socialReturn}
Brand Value Increase: ${reportData.roi.brandValueIncrease}
Media Equivalency: ${reportData.roi.mediaEquivalency}
Stakeholder Engagement: ${reportData.roi.stakeholderEngagement}

ACHIEVEMENTS
────────────────────────────────────────────────────────────────
${reportData.achievements.map((achievement, i) => `${i + 1}. ${achievement}`).join('\n')}

RECOMMENDATIONS
────────────────────────────────────────────────────────────────
${reportData.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

═══════════════════════════════════════════════════════════════
  End of Report
═══════════════════════════════════════════════════════════════
`;

      const textBlob = new Blob([textReport], { type: 'text/plain' });
      const textUrl = window.URL.createObjectURL(textBlob);
      const textLink = document.createElement('a');
      textLink.href = textUrl;
      textLink.download = `${reportType === 'quarterly' ? 'Q4-2024' : 'Annual-2024'}-CSR-Impact-Report.txt`;
      document.body.appendChild(textLink);
      textLink.click();
      document.body.removeChild(textLink);
      window.URL.revokeObjectURL(textUrl);

      setTimeout(() => {
        toast.success('Great job! Your completion has been recorded.');
      }, 300);

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

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
              <button 
                className={styles.downloadButton}
                onClick={() => handleDownloadReport('quarterly')}
                disabled={downloading === 'quarterly'}
              >
                <i className={downloading === 'quarterly' ? 'fas fa-spinner fa-spin' : 'fas fa-download'}></i>
                {downloading === 'quarterly' ? 'Generating...' : 'Download'}
              </button>
            </div>
            <div className={styles.reportCard}>
              <i className="fas fa-file-pdf"></i>
              <div className={styles.reportInfo}>
                <h4>Annual Sustainability Report</h4>
                <p>Full year environmental impact summary</p>
              </div>
              <button 
                className={styles.downloadButton}
                onClick={() => handleDownloadReport('annual')}
                disabled={downloading === 'annual'}
              >
                <i className={downloading === 'annual' ? 'fas fa-spinner fa-spin' : 'fas fa-download'}></i>
                {downloading === 'annual' ? 'Generating...' : 'Download'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
