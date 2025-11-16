'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  collection, 
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/Header';
import styles from './certificates.module.css';

interface Certificate {
  id: string;
  userId: string;
  userName: string;
  challengeId: string;
  challengeTitle: string;
  completionDate: any;
  certificateNumber: string;
  verified: boolean;
  issueDate: any;
}

interface Challenge {
  id: string;
  title: string;
  category: string;
  completedActions: number;
  participationDate: any;
  isCompleted: boolean;
  isVerified: boolean;
  sponsorId?: string;
  sponsorName?: string;
}

export default function CertificatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [eligibleChallenges, setEligibleChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingCert, setGeneratingCert] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      if (!user) return;

      try {
        // Get user name
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        setUserName(userData?.displayName || userData?.email || 'Participant');

        // Load existing certificates
        const certsQuery = query(
          collection(db, 'certificates'),
          where('userId', '==', user.uid)
        );
        const certsSnapshot = await getDocs(certsQuery);
        const certsData: Certificate[] = [];
        certsSnapshot.forEach((doc) => {
          certsData.push({ id: doc.id, ...doc.data() } as Certificate);
        });
        setCertificates(certsData);

        // Load challenges user participated in
        const challengesSnapshot = await getDocs(collection(db, 'challenges'));
        const eligibleChals: Challenge[] = [];
        const now = new Date();
        
        challengesSnapshot.forEach((doc) => {
          const data = doc.data();
          const participants = data.participants || [];
          const verifiedParticipants = data.verifiedParticipants || [];
          
          // Check if user participated
          if (participants.includes(user.uid)) {
            // Check if already has certificate
            const hasCertificate = certsData.some(cert => cert.challengeId === doc.id);
            
            if (!hasCertificate) {
              // Check if challenge is completed
              const endDate = data.endDate ? new Date(data.endDate.seconds * 1000) : null;
              const isCompleted = endDate ? endDate < now : false;
              
              // Check if verified (only for sponsored challenges)
              const isSponsored = !!data.sponsorId;
              const isVerified = isSponsored ? verifiedParticipants.includes(user.uid) : true;
              
              eligibleChals.push({
                id: doc.id,
                title: data.title,
                category: data.category,
                completedActions: data.userActions?.[user.uid] || 0,
                participationDate: data.createdAt,
                isCompleted,
                isVerified,
                sponsorId: data.sponsorId,
                sponsorName: data.sponsorName
              });
            }
          }
        });

        setEligibleChallenges(eligibleChals);
      } catch (error) {
        console.error('Error loading certificates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, loading, router]);

  const generateCertificate = async (challenge: Challenge) => {
    if (!user) return;

    // Check if challenge is completed
    if (!challenge.isCompleted) {
      alert('❌ This challenge must be completed before you can generate a certificate.');
      return;
    }

    // Check if user is verified (for sponsored challenges)
    if (challenge.sponsorId && !challenge.isVerified) {
      alert(`❌ You must be verified by the sponsor (${challenge.sponsorName || 'Sponsor'}) before you can generate your certificate. Please wait for sponsor approval.`);
      return;
    }

    setGeneratingCert(challenge.id);
    try {
      // Refresh user name from Firestore to get latest data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const currentUserName = userData?.displayName || userData?.email || 'Participant';
      
      // Generate unique certificate number
      const certNumber = `GG-${Date.now()}-${user.uid.slice(0, 6).toUpperCase()}`;
      
      // Create certificate document
      await addDoc(collection(db, 'certificates'), {
        userId: user.uid,
        userName: currentUserName,
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        challengeCategory: challenge.category,
        completedActions: challenge.completedActions,
        certificateNumber: certNumber,
        verified: true,
        issueDate: serverTimestamp(),
        completionDate: serverTimestamp()
      });

      // Reload data
      const certsQuery = query(
        collection(db, 'certificates'),
        where('userId', '==', user.uid)
      );
      const certsSnapshot = await getDocs(certsQuery);
      const certsData: Certificate[] = [];
      certsSnapshot.forEach((doc) => {
        certsData.push({ id: doc.id, ...doc.data() } as Certificate);
      });
      setCertificates(certsData);

      // Remove from eligible list
      setEligibleChallenges(prev => prev.filter(c => c.id !== challenge.id));
    } catch (error) {
      console.error('Error generating certificate:', error);
      alert('Failed to generate certificate. Please try again.');
    } finally {
      setGeneratingCert(null);
    }
  };

  const downloadCertificate = async (certificate: Certificate) => {
    // Load GreenGuardian logo with absolute URL
    const greenGuardianLogo = `${window.location.origin}/greenguardian%20logo.png`;
    
    // Load sponsor info if available
    let sponsorLogo = '';
    let sponsorName = '';
    
    try {
      const challengeDoc = await getDoc(doc(db, 'challenges', certificate.challengeId));
      const challengeData = challengeDoc.data();
      
      if (challengeData?.sponsorId) {
        const sponsorDoc = await getDoc(doc(db, 'users', challengeData.sponsorId));
        const sponsorData = sponsorDoc.data();
        sponsorLogo = sponsorData?.companyLogo || sponsorData?.photoURL || '';
        sponsorName = sponsorData?.companyName || sponsorData?.displayName || 'Sponsor';
      }
    } catch (error) {
      console.error('Error loading sponsor info:', error);
    }
    
    // Open certificate in new window for printing/saving
    const certWindow = window.open('', '_blank');
    if (certWindow) {
      certWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Certificate of Participation - ${certificate.userName}</title>
          <style>
            body {
              font-family: 'Georgia', serif;
              margin: 0;
              padding: 40px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .certificate {
              background: white;
              padding: 60px;
              max-width: 800px;
              border: 20px solid #2d3748;
              border-radius: 10px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              position: relative;
            }
            .certificate::before {
              content: '';
              position: absolute;
              top: 30px;
              left: 30px;
              right: 30px;
              bottom: 30px;
              border: 2px solid #cbd5e0;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              position: relative;
            }
            .logos {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              padding: 0 20px;
            }
            .logo-container {
              width: 100px;
              height: 100px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .logo-container img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .greenguardian-logo {
              font-size: 80px;
              color: #48bb78;
            }
            .sponsor-logo-placeholder {
              font-size: 60px;
              color: #667eea;
            }
            .title {
              font-size: 48px;
              color: #2d3748;
              margin: 20px 0;
              font-weight: bold;
              letter-spacing: 2px;
            }
            .subtitle {
              font-size: 24px;
              color: #4a5568;
              margin-bottom: 40px;
            }
            .recipient {
              text-align: center;
              margin: 40px 0;
            }
            .recipient-label {
              font-size: 18px;
              color: #718096;
              margin-bottom: 10px;
            }
            .recipient-name {
              font-size: 36px;
              color: #2d3748;
              font-weight: bold;
              border-bottom: 2px solid #cbd5e0;
              padding-bottom: 10px;
              display: inline-block;
              min-width: 300px;
            }
            .description {
              text-align: center;
              font-size: 18px;
              color: #4a5568;
              line-height: 1.8;
              margin: 40px 0;
            }
            .challenge-name {
              font-size: 24px;
              color: #667eea;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              margin-top: 60px;
              padding-top: 30px;
              border-top: 2px solid #e2e8f0;
            }
            .signature {
              text-align: center;
            }
            .signature-line {
              border-top: 2px solid #2d3748;
              width: 200px;
              margin: 20px auto 10px;
            }
            .signature-label {
              font-size: 14px;
              color: #718096;
            }
            .cert-number {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #a0aec0;
            }
            .verification {
              text-align: center;
              margin-top: 20px;
              padding: 15px;
              background: #f7fafc;
              border-radius: 8px;
            }
            .qr-code {
              width: 100px;
              height: 100px;
              margin: 0 auto 10px;
              background: #e2e8f0;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .certificate {
                border: 10px solid #2d3748;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="header">
              <div class="logos">
                <div class="logo-container">
                  <img src="${greenGuardianLogo}" alt="GreenGuardian Logo" />
                </div>
                ${sponsorLogo ? `
                  <div class="logo-container">
                    <img src="${sponsorLogo}" alt="Sponsor Logo" />
                  </div>
                ` : `
                  <div class="logo-container">
                    <div class="sponsor-logo-placeholder">🤝</div>
                  </div>
                `}
              </div>
              <div class="title">CERTIFICATE OF PARTICIPATION</div>
              <div class="subtitle">GreenGuardian Environmental Initiative</div>
              ${sponsorName ? `<div style="font-size: 18px; color: #667eea; margin-top: 10px;">Sponsored by ${sponsorName}</div>` : ''}
            </div>
            
            <div class="recipient">
              <div class="recipient-label">This certificate is proudly presented to</div>
              <div class="recipient-name">${certificate.userName}</div>
            </div>
            
            <div class="description">
              For outstanding participation and commitment to environmental sustainability
              through active engagement in the
              <div class="challenge-name">${certificate.challengeTitle}</div>
              initiative. Your dedication to making our planet greener and cleaner
              is truly commendable and serves as an inspiration to the community.
            </div>
            
            <div class="footer">
              <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-label">GreenGuardian Team</div>
              </div>
              ${sponsorName ? `
                <div class="signature">
                  ${sponsorLogo ? `
                    <div style="width: 80px; height: 80px; margin: 0 auto 10px;">
                      <img src="${sponsorLogo}" alt="Sponsor" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                    </div>
                  ` : '<div class="signature-line"></div>'}
                  <div class="signature-label">${sponsorName}</div>
                  <div style="font-size: 12px; color: #a0aec0; margin-top: 5px;">Sponsor</div>
                </div>
              ` : ''}
              <div class="signature">
                <div class="signature-label">Issue Date</div>
                <div style="margin-top: 10px; font-weight: bold;">
                  ${certificate.issueDate?.toDate ? new Date(certificate.issueDate.toDate()).toLocaleDateString() : new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div class="verification">
              <div class="qr-code">
                <span style="font-size: 10px; color: #718096;">QR Code</span>
              </div>
              <div style="font-size: 12px; color: #4a5568;">
                Verify this certificate at: greenguardian.com/verify/${certificate.certificateNumber}
              </div>
            </div>
            
            <div class="cert-number">
              Certificate Number: ${certificate.certificateNumber}
            </div>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
      certWindow.document.close();
    }
  };

  const updateCertificateName = async (certificateId: string) => {
    if (!user) return;
    
    try {
      // Get current user name from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const currentUserName = userData?.displayName || userData?.email || 'Participant';
      
      // Update certificate document
      const certRef = doc(db, 'certificates', certificateId);
      await updateDoc(certRef, {
        userName: currentUserName
      });
      
      // Update local state
      setCertificates(prev => 
        prev.map(cert => 
          cert.id === certificateId 
            ? { ...cert, userName: currentUserName }
            : cert
        )
      );
      
      alert('✅ Certificate updated with your current name!');
    } catch (error) {
      console.error('Error updating certificate:', error);
      alert('Failed to update certificate. Please try again.');
    }
  };

  if (loading || isLoading) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header />
      
      <main className={styles.main}>
        <div className={styles.header}>
          <h1>My Certificates</h1>
          <p>View and download your participation certificates</p>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <i className="fas fa-certificate"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{certificates.length}</span>
              <span className={styles.statLabel}>Total Certificates</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-trophy"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{eligibleChallenges.length}</span>
              <span className={styles.statLabel}>Available to Generate</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-check-circle"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{certificates.filter(c => c.verified).length}</span>
              <span className={styles.statLabel}>Verified Certificates</span>
            </div>
          </div>
        </div>

        {eligibleChallenges.length > 0 && (
          <section className={styles.section}>
            <h2>Generate New Certificates</h2>
            <p className={styles.sectionDesc}>
              You are eligible to generate certificates for these completed challenges
            </p>
            <div className={styles.challengesList}>
              {eligibleChallenges.map((challenge) => {
                const canGenerate = challenge.isCompleted && challenge.isVerified;
                const needsCompletion = !challenge.isCompleted;
                const needsVerification = challenge.isCompleted && !challenge.isVerified;
                
                return (
                  <div key={challenge.id} className={styles.challengeCard}>
                    <div className={styles.challengeIcon}>
                      <i className="fas fa-trophy"></i>
                    </div>
                    <div className={styles.challengeInfo}>
                      <h3>{challenge.title}</h3>
                      <div className={styles.challengeMeta}>
                        <span><i className="fas fa-tag"></i> {challenge.category}</span>
                        <span><i className="fas fa-tasks"></i> {challenge.completedActions} actions completed</span>
                      </div>
                      {needsCompletion && (
                        <div className={styles.warningBadge}>
                          <i className="fas fa-clock"></i>
                          Challenge not yet completed
                        </div>
                      )}
                      {needsVerification && (
                        <div className={styles.pendingBadge}>
                          <i className="fas fa-hourglass-half"></i>
                          Waiting for sponsor verification
                          {challenge.sponsorName && <span> by {challenge.sponsorName}</span>}
                        </div>
                      )}
                      {canGenerate && (
                        <div className={styles.readyBadge}>
                          <i className="fas fa-check-circle"></i>
                          Ready to generate!
                        </div>
                      )}
                    </div>
                    <button
                      className={`${styles.generateButton} ${!canGenerate ? styles.disabled : ''}`}
                      onClick={() => canGenerate && generateCertificate(challenge)}
                      disabled={!canGenerate || generatingCert === challenge.id}
                      title={
                        needsCompletion 
                          ? 'Challenge must be completed first' 
                          : needsVerification 
                            ? 'Waiting for sponsor verification' 
                            : 'Generate your certificate'
                      }
                    >
                      {generatingCert === challenge.id ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Generating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-award"></i>
                          {canGenerate ? 'Generate Certificate' : needsCompletion ? 'Not Completed' : 'Pending Verification'}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <h2>My Certificates</h2>
          {certificates.length === 0 ? (
            <div className={styles.empty}>
              <i className="fas fa-certificate"></i>
              <p>No certificates yet. Complete challenges to earn certificates!</p>
            </div>
          ) : (
            <div className={styles.certificatesList}>
              {certificates.map((certificate) => (
                <div key={certificate.id} className={styles.certificateCard}>
                  <div className={styles.certificateBadge}>
                    <i className="fas fa-certificate"></i>
                  </div>
                  <div className={styles.certificateContent}>
                    <h3>{certificate.challengeTitle}</h3>
                    <div className={styles.certificateDetails}>
                      <span><i className="fas fa-user"></i> {certificate.userName}</span>
                      <span><i className="fas fa-calendar"></i> Issued: {certificate.issueDate?.toDate ? new Date(certificate.issueDate.toDate()).toLocaleDateString() : 'N/A'}</span>
                      <span><i className="fas fa-hashtag"></i> {certificate.certificateNumber}</span>
                      {certificate.verified && (
                        <span className={styles.verified}>
                          <i className="fas fa-check-circle"></i> Verified
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.certificateActions}>
                    {certificate.userName !== userName && (
                      <button
                        className={styles.updateButton}
                        onClick={() => updateCertificateName(certificate.id)}
                        title="Update certificate with your current name"
                      >
                        <i className="fas fa-sync-alt"></i>
                        Update Name
                      </button>
                    )}
                    <button
                      className={styles.downloadButton}
                      onClick={() => downloadCertificate(certificate)}
                    >
                      <i className="fas fa-download"></i>
                      Download
                    </button>
                    <button
                      className={styles.viewButton}
                      onClick={() => downloadCertificate(certificate)}
                    >
                      <i className="fas fa-eye"></i>
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
