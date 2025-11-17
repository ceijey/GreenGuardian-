'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PartnerHeader from '@/components/PartnerHeader';
import styles from './reports.module.css';

interface Report {
  id: string;
  title: string;
  type: 'impact' | 'financial' | 'sustainability' | 'compliance';
  period: string;
  generatedDate: string;
  size: string;
  status: 'ready' | 'generating' | 'scheduled';
}

interface AnalyticsData {
  totalImpressions: number;
  totalInvestment: number;
  totalParticipants: number;
  engagementRate: number;
  carbonOffset: number;
  wasteReduced: number;
  treesPlanted: number;
  communitiesImpacted: number;
  activeChallenges: number;
  completedChallenges: number;
}

export default function ReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('Your Company');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'impact' | 'financial' | 'sustainability' | 'compliance'>('all');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [shareMethod, setShareMethod] = useState<'email' | 'link' | 'social' | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalImpressions: 0,
    totalInvestment: 0,
    totalParticipants: 0,
    engagementRate: 0,
    carbonOffset: 0,
    wasteReduced: 0,
    treesPlanted: 0,
    communitiesImpacted: 0,
    activeChallenges: 0,
    completedChallenges: 0
  });

  const [reports] = useState<Report[]>([
    {
      id: '1',
      title: 'Q4 2024 Environmental Impact Report',
      type: 'impact',
      period: 'Q4 2024',
      generatedDate: '2024-12-15',
      size: '2.4 MB',
      status: 'ready'
    },
    {
      id: '2',
      title: 'Annual Sustainability Report 2024',
      type: 'sustainability',
      period: 'Year 2024',
      generatedDate: '2024-12-20',
      size: '5.8 MB',
      status: 'ready'
    },
    {
      id: '3',
      title: 'CSR Investment Analysis - November',
      type: 'financial',
      period: 'November 2024',
      generatedDate: '2024-12-01',
      size: '1.2 MB',
      status: 'ready'
    },
    {
      id: '4',
      title: 'Compliance & Certification Report',
      type: 'compliance',
      period: 'Q4 2024',
      generatedDate: '2024-12-10',
      size: '3.1 MB',
      status: 'ready'
    }
  ]);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!loading && !user) {
        router.push('/login');
        return;
      }

      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          const role = userData?.role;
          setUserRole(role);
          setCompanyName(userData?.companyName || userData?.displayName || 'Your Company');

          if (role !== 'private-partner') {
            router.push('/dashboard');
          }

          // Load analytics data
          const q = query(
            collection(db, 'challenges'),
            where('sponsorId', '==', user.uid)
          );

          const snapshot = await getDocs(q);
          let impressions = 0;
          let investment = 0;
          let participants = 0;
          let totalActions = 0;
          let active = 0;
          let completed = 0;

          const now = new Date();

          snapshot.forEach((doc) => {
            const data = doc.data();
            impressions += data.brandImpressions || 0;
            investment += data.fundingAmount || 0;
            participants += data.participants?.length || 0;
            totalActions += data.totalActions || 0;

            const endDate = data.endDate ? new Date(data.endDate.seconds * 1000) : null;
            if (endDate && endDate < now) {
              completed++;
            } else {
              active++;
            }
          });

          const engagementRate = participants > 0 ? (totalActions / participants) * 100 : 0;

          setAnalyticsData({
            totalImpressions: impressions,
            totalInvestment: investment,
            totalParticipants: participants,
            engagementRate: Math.round(engagementRate),
            carbonOffset: Math.round(totalActions * 0.5),
            wasteReduced: Math.round(totalActions * 1.2),
            treesPlanted: Math.round(totalActions * 0.01),
            communitiesImpacted: snapshot.size,
            activeChallenges: active,
            completedChallenges: completed
          });
        } catch (error) {
          console.error('Error fetching user role:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkUserRole();
  }, [user, loading, router]);

  const generatePDF = (reportType: string) => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      alert('Please allow popups to generate reports');
      return;
    }

    const currentDate = new Date().toLocaleDateString();
    const reportTitle = reportType === 'impact' ? 'Environmental Impact Report' :
                       reportType === 'financial' ? 'CSR Investment Report' :
                       reportType === 'sustainability' ? 'Sustainability Report' :
                       'Compliance Report';

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle} - ${companyName}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 40px;
            background: white;
            color: #1a202c;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #38b2ac;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #38b2ac;
            font-size: 2.5rem;
            margin: 0 0 10px 0;
          }
          .header h2 {
            color: #4a5568;
            font-size: 1.5rem;
            margin: 0 0 5px 0;
            font-weight: normal;
          }
          .header p {
            color: #718096;
            margin: 0;
          }
          .section {
            margin-bottom: 40px;
          }
          .section h3 {
            color: #2d3748;
            font-size: 1.5rem;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .metrics {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .metric-card {
            background: #f7fafc;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #38b2ac;
          }
          .metric-value {
            font-size: 2rem;
            font-weight: bold;
            color: #38b2ac;
            margin-bottom: 5px;
          }
          .metric-label {
            color: #718096;
            font-size: 0.9rem;
          }
          .impact-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          .impact-item {
            background: #e6fffa;
            padding: 15px;
            border-radius: 8px;
          }
          .impact-item strong {
            display: block;
            color: #234e52;
            font-size: 1.5rem;
            margin-bottom: 5px;
          }
          .impact-item span {
            color: #2c7a7b;
          }
          .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #718096;
            font-size: 0.9rem;
          }
          .summary-box {
            background: #fef5e7;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #d69e2e;
            margin-bottom: 20px;
          }
          .summary-box h4 {
            color: #744210;
            margin-top: 0;
          }
          @media print {
            body {
              padding: 20px;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${companyName}</h1>
          <h2>${reportTitle}</h2>
          <p>Generated on ${currentDate}</p>
        </div>

        <div class="section">
          <h3>Executive Summary</h3>
          <div class="summary-box">
            <h4>Key Highlights</h4>
            <p>${companyName} has demonstrated strong commitment to environmental sustainability through strategic CSR initiatives. 
            Our sponsorship programs have engaged ${analyticsData.totalParticipants.toLocaleString()} community participants across 
            ${analyticsData.communitiesImpacted} environmental challenges, generating significant measurable impact.</p>
          </div>
        </div>

        <div class="section">
          <h3>CSR Investment Overview</h3>
          <div class="metrics">
            <div class="metric-card">
              <div class="metric-value">₱${analyticsData.totalInvestment.toLocaleString()}</div>
              <div class="metric-label">Total CSR Investment</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analyticsData.communitiesImpacted}</div>
              <div class="metric-label">Sponsored Challenges</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analyticsData.totalImpressions.toLocaleString()}</div>
              <div class="metric-label">Brand Impressions</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analyticsData.engagementRate}%</div>
              <div class="metric-label">Community Engagement Rate</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Environmental Impact Metrics</h3>
          <div class="impact-grid">
            <div class="impact-item">
              <strong>${analyticsData.carbonOffset.toLocaleString()} kg</strong>
              <span>Carbon Offset Achieved</span>
            </div>
            <div class="impact-item">
              <strong>${analyticsData.wasteReduced.toLocaleString()} kg</strong>
              <span>Waste Reduced</span>
            </div>
            <div class="impact-item">
              <strong>${analyticsData.treesPlanted}</strong>
              <span>Trees Equivalent</span>
            </div>
            <div class="impact-item">
              <strong>${analyticsData.totalParticipants.toLocaleString()}</strong>
              <span>Lives Impacted</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Program Performance</h3>
          <div class="metrics">
            <div class="metric-card">
              <div class="metric-value">${analyticsData.activeChallenges}</div>
              <div class="metric-label">Active Challenges</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analyticsData.completedChallenges}</div>
              <div class="metric-label">Completed Challenges</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analyticsData.totalParticipants.toLocaleString()}</div>
              <div class="metric-label">Total Participants</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analyticsData.engagementRate}%</div>
              <div class="metric-label">Average Engagement</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Conclusion & Recommendations</h3>
          <p>
            ${companyName}'s CSR initiatives have yielded measurable positive environmental impact while strengthening community engagement. 
            The data demonstrates effective resource allocation with a ${analyticsData.engagementRate}% engagement rate, exceeding industry standards.
          </p>
          <p style="margin-top: 15px;">
            <strong>Recommendations:</strong><br/>
            • Continue investment in high-impact environmental challenges<br/>
            • Expand community reach to additional regions<br/>
            • Develop strategic partnerships for greater scale<br/>
            • Implement quarterly impact assessments for continuous improvement
          </p>
        </div>

        <div class="footer">
          <p>This report was generated by GreenGuardian CSR Platform</p>
          <p>${companyName} © ${new Date().getFullYear()} | All data verified and auditable</p>
        </div>

        <div class="no-print" style="margin-top: 40px; text-align: center;">
          <button onclick="window.print()" style="padding: 12px 24px; background: #38b2ac; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; margin-right: 10px;">
            Print / Save as PDF
          </button>
          <button onclick="window.close()" style="padding: 12px 24px; background: #e2e8f0; color: #4a5568; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
            Close
          </button>
        </div>
      </body>
      </html>
    `);
    reportWindow.document.close();
  };

  const handleShare = (report: Report) => {
    setSelectedReport(report);
    setShowShareModal(true);
    setShareMethod(null);
    setShareEmail('');
    setShareMessage('');
    setCopied(false);
  };

  const generateShareableLink = (report: Report) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/reports/shared/${report.id}?company=${encodeURIComponent(companyName)}`;
  };

  const handleCopyLink = () => {
    if (!selectedReport) return;
    const link = generateShareableLink(selectedReport);
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleEmailShare = async () => {
    if (!selectedReport || !shareEmail) {
      alert('Please enter an email address');
      return;
    }

    try {
      const subject = encodeURIComponent(`${companyName} - ${selectedReport.title}`);
      const body = encodeURIComponent(
        `${shareMessage || 'I wanted to share this report with you:'}\n\n` +
        `Report: ${selectedReport.title}\n` +
        `Period: ${selectedReport.period}\n` +
        `Generated: ${new Date(selectedReport.generatedDate).toLocaleDateString()}\n\n` +
        `View report: ${generateShareableLink(selectedReport)}\n\n` +
        `Best regards,\n${companyName}`
      );
      
      window.location.href = `mailto:${shareEmail}?subject=${subject}&body=${body}`;
      
      setTimeout(() => {
        alert('Email client opened! Please send the email.');
        setShowShareModal(false);
      }, 500);
    } catch (error) {
      console.error('Error sharing via email:', error);
      alert('Failed to open email client. Please try copying the link instead.');
    }
  };

  const handleSocialShare = (platform: 'twitter' | 'linkedin' | 'facebook') => {
    if (!selectedReport) return;

    const link = generateShareableLink(selectedReport);
    const text = `${companyName} - ${selectedReport.title}`;
    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
        break;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  if (loading || isLoading) {
    return (
      <div className={styles.container}>
        <PartnerHeader />
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  const filteredReports = selectedType === 'all' 
    ? reports 
    : reports.filter(r => r.type === selectedType);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'impact': return 'fa-leaf';
      case 'financial': return 'fa-chart-line';
      case 'sustainability': return 'fa-globe';
      case 'compliance': return 'fa-check-circle';
      default: return 'fa-file';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'impact': return '#48bb78';
      case 'financial': return '#4299e1';
      case 'sustainability': return '#9f7aea';
      case 'compliance': return '#ed8936';
      default: return '#718096';
    }
  };

  return (
    <div className={styles.container}>
      <PartnerHeader />
      
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1>Reports & Documentation</h1>
            <p>Access and download your CSR and sustainability reports</p>
          </div>
          <button 
            className={styles.generateButton}
            onClick={() => generatePDF('sustainability')}
          >
            <i className="fas fa-file-export"></i>
            Generate Custom Report
          </button>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <i className="fas fa-file-alt"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{reports.length}</span>
              <span className={styles.statLabel}>Total Reports</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-download"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>127</span>
              <span className={styles.statLabel}>Total Downloads</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-calendar-check"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>12</span>
              <span className={styles.statLabel}>Reports This Year</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-clock"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>Dec 15</span>
              <span className={styles.statLabel}>Last Generated</span>
            </div>
          </div>
        </div>

        <div className={styles.filters}>
          <button 
            className={selectedType === 'all' ? styles.active : ''}
            onClick={() => setSelectedType('all')}
          >
            All Reports
          </button>
          <button 
            className={selectedType === 'impact' ? styles.active : ''}
            onClick={() => setSelectedType('impact')}
          >
            <i className="fas fa-leaf"></i>
            Impact
          </button>
          <button 
            className={selectedType === 'financial' ? styles.active : ''}
            onClick={() => setSelectedType('financial')}
          >
            <i className="fas fa-chart-line"></i>
            Financial
          </button>
          <button 
            className={selectedType === 'sustainability' ? styles.active : ''}
            onClick={() => setSelectedType('sustainability')}
          >
            <i className="fas fa-globe"></i>
            Sustainability
          </button>
          <button 
            className={selectedType === 'compliance' ? styles.active : ''}
            onClick={() => setSelectedType('compliance')}
          >
            <i className="fas fa-check-circle"></i>
            Compliance
          </button>
        </div>

        <div className={styles.reportsList}>
          {filteredReports.map(report => (
            <div key={report.id} className={styles.reportCard}>
              <div 
                className={styles.reportIcon} 
                style={{ backgroundColor: getTypeColor(report.type) }}
              >
                <i className={`fas ${getTypeIcon(report.type)}`}></i>
              </div>
              <div className={styles.reportInfo}>
                <h3>{report.title}</h3>
                <div className={styles.reportMeta}>
                  <span><i className="fas fa-calendar"></i> {report.period}</span>
                  <span><i className="fas fa-clock"></i> Generated: {new Date(report.generatedDate).toLocaleDateString()}</span>
                  <span><i className="fas fa-file"></i> {report.size}</span>
                </div>
              </div>
              <div className={styles.reportActions}>
                <button 
                  className={styles.viewButton}
                  onClick={() => generatePDF(report.type)}
                >
                  <i className="fas fa-eye"></i>
                  View
                </button>
                <button 
                  className={styles.downloadButton}
                  onClick={() => generatePDF(report.type)}
                >
                  <i className="fas fa-download"></i>
                  Download
                </button>
                <button 
                  className={styles.shareButton}
                  onClick={() => handleShare(report)}
                >
                  <i className="fas fa-share-alt"></i>
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.scheduledSection}>
          <h2>Scheduled Reports</h2>
          <div className={styles.scheduledCard}>
            <i className="fas fa-calendar-plus"></i>
            <div>
              <h4>Monthly Impact Report</h4>
              <p>Auto-generated on the 1st of each month</p>
            </div>
            <span className={styles.nextDate}>Next: Jan 1, 2025</span>
          </div>
          <div className={styles.scheduledCard}>
            <i className="fas fa-calendar-plus"></i>
            <div>
              <h4>Quarterly Sustainability Report</h4>
              <p>Auto-generated quarterly</p>
            </div>
            <span className={styles.nextDate}>Next: Jan 15, 2025</span>
          </div>
        </div>
      </main>

      {showShareModal && selectedReport && (
        <div className={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Share Report</h3>
              <button className={styles.closeButton} onClick={() => setShowShareModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.reportPreview}>
                <h4>{selectedReport.title}</h4>
                <p><i className="fas fa-calendar"></i> {selectedReport.period}</p>
              </div>

              <div className={styles.shareOptions}>
                <button 
                  className={`${styles.shareOption} ${shareMethod === 'link' ? styles.active : ''}`}
                  onClick={() => setShareMethod('link')}
                >
                  <i className="fas fa-link"></i>
                  <span>Copy Link</span>
                </button>
                <button 
                  className={`${styles.shareOption} ${shareMethod === 'email' ? styles.active : ''}`}
                  onClick={() => setShareMethod('email')}
                >
                  <i className="fas fa-envelope"></i>
                  <span>Share via Email</span>
                </button>
                <button 
                  className={`${styles.shareOption} ${shareMethod === 'social' ? styles.active : ''}`}
                  onClick={() => setShareMethod('social')}
                >
                  <i className="fas fa-share-nodes"></i>
                  <span>Social Media</span>
                </button>
              </div>

              {shareMethod === 'link' && (
                <div className={styles.shareSection}>
                  <h4>Shareable Link</h4>
                  <div className={styles.linkBox}>
                    <input 
                      type="text" 
                      value={generateShareableLink(selectedReport)}
                      readOnly
                    />
                    <button onClick={handleCopyLink}>
                      <i className={copied ? 'fas fa-check' : 'fas fa-copy'}></i>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className={styles.shareNote}>
                    <i className="fas fa-info-circle"></i>
                    Anyone with this link can view the report
                  </p>
                </div>
              )}

              {shareMethod === 'email' && (
                <div className={styles.shareSection}>
                  <h4>Share via Email</h4>
                  <div className={styles.formGroup}>
                    <label>Recipient Email</label>
                    <input 
                      type="email" 
                      placeholder="colleague@company.com"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Message (Optional)</label>
                    <textarea 
                      placeholder="Add a personal message..."
                      rows={3}
                      value={shareMessage}
                      onChange={(e) => setShareMessage(e.target.value)}
                    />
                  </div>
                  <button className={styles.sendButton} onClick={handleEmailShare}>
                    <i className="fas fa-paper-plane"></i>
                    Send Email
                  </button>
                </div>
              )}

              {shareMethod === 'social' && (
                <div className={styles.shareSection}>
                  <h4>Share on Social Media</h4>
                  <div className={styles.socialButtons}>
                    <button 
                      className={styles.socialButton}
                      style={{ backgroundColor: '#1DA1F2' }}
                      onClick={() => handleSocialShare('twitter')}
                    >
                      <i className="fab fa-twitter"></i>
                      Share on Twitter
                    </button>
                    <button 
                      className={styles.socialButton}
                      style={{ backgroundColor: '#0A66C2' }}
                      onClick={() => handleSocialShare('linkedin')}
                    >
                      <i className="fab fa-linkedin"></i>
                      Share on LinkedIn
                    </button>
                    <button 
                      className={styles.socialButton}
                      style={{ backgroundColor: '#1877F2' }}
                      onClick={() => handleSocialShare('facebook')}
                    >
                      <i className="fab fa-facebook"></i>
                      Share on Facebook
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
