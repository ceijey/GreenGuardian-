'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/Header';
import styles from './verify.module.css';

interface Certificate {
  id: string;
  userId: string;
  userName: string;
  challengeId: string;
  challengeTitle: string;
  challengeCategory: string;
  completedActions: number;
  certificateNumber: string;
  verified: boolean;
  issueDate: any;
  completionDate: any;
}

export default function VerifyCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchNumber, setSearchNumber] = useState('');

  const certNumberFromUrl = params?.certificateNumber as string;

  useEffect(() => {
    if (certNumberFromUrl) {
      verifyCertificate(certNumberFromUrl);
    } else {
      setIsLoading(false);
    }
  }, [certNumberFromUrl]);

  const verifyCertificate = async (certNumber: string) => {
    setIsLoading(true);
    setNotFound(false);
    
    try {
      const q = query(
        collection(db, 'certificates'),
        where('certificateNumber', '==', certNumber)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setNotFound(true);
        setCertificate(null);
      } else {
        const doc = querySnapshot.docs[0];
        setCertificate({ id: doc.id, ...doc.data() } as Certificate);
        setNotFound(false);
      }
    } catch (error) {
      console.error('Error verifying certificate:', error);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchNumber.trim()) {
      router.push(`/verify/${searchNumber.trim()}`);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Verifying certificate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header />
      
      <main className={styles.main}>
        <div className={styles.header}>
          <i className="fas fa-shield-alt"></i>
          <h1>Certificate Verification</h1>
          <p>Verify the authenticity of GreenGuardian participation certificates</p>
        </div>

        <div className={styles.searchSection}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              placeholder="Enter certificate number (e.g., GG-1234567890-ABC123)"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              <i className="fas fa-search"></i>
              Verify
            </button>
          </form>
        </div>

        {certificate && (
          <div className={styles.resultSection}>
            <div className={styles.verifiedBadge}>
              <i className="fas fa-check-circle"></i>
              <span>Certificate Verified</span>
            </div>

            <div className={styles.certificateDisplay}>
              <div className={styles.certificateHeader}>
                <div className={styles.certificateLogo}>
                  <i className="fas fa-certificate"></i>
                </div>
                <h2>Certificate of Participation</h2>
                <p className={styles.issuer}>GreenGuardian Environmental Initiative</p>
              </div>

              <div className={styles.certificateBody}>
                <div className={styles.field}>
                  <label>Participant Name</label>
                  <div className={styles.value}>{certificate.userName}</div>
                </div>

                <div className={styles.field}>
                  <label>Challenge/Initiative</label>
                  <div className={styles.value}>{certificate.challengeTitle}</div>
                </div>

                <div className={styles.field}>
                  <label>Category</label>
                  <div className={styles.value}>
                    <span className={styles.category}>{certificate.challengeCategory}</span>
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Actions Completed</label>
                  <div className={styles.value}>
                    <span className={styles.actions}>
                      <i className="fas fa-tasks"></i>
                      {certificate.completedActions} actions
                    </span>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>Issue Date</label>
                    <div className={styles.value}>
                      {certificate.issueDate?.toDate 
                        ? new Date(certificate.issueDate.toDate()).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'N/A'}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>Certificate Number</label>
                    <div className={styles.value}>
                      <code>{certificate.certificateNumber}</code>
                    </div>
                  </div>
                </div>

                <div className={styles.verificationStatus}>
                  <i className="fas fa-check-double"></i>
                  <div>
                    <strong>Verification Status: Authentic</strong>
                    <p>This certificate has been verified as authentic and issued by GreenGuardian.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <button 
                className={styles.printButton}
                onClick={() => window.print()}
              >
                <i className="fas fa-print"></i>
                Print Certificate
              </button>
              <button 
                className={styles.shareButton}
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'GreenGuardian Certificate',
                      text: `Verified certificate for ${certificate.userName}`,
                      url: window.location.href
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied to clipboard!');
                  }
                }}
              >
                <i className="fas fa-share-alt"></i>
                Share
              </button>
            </div>
          </div>
        )}

        {notFound && (
          <div className={styles.notFound}>
            <i className="fas fa-exclamation-triangle"></i>
            <h2>Certificate Not Found</h2>
            <p>The certificate number you entered could not be verified.</p>
            <p>Please check the number and try again.</p>
          </div>
        )}

        {!certificate && !notFound && !certNumberFromUrl && (
          <div className={styles.instructions}>
            <h3>How to Verify a Certificate</h3>
            <ol>
              <li>
                <i className="fas fa-search"></i>
                Enter the certificate number in the search box above
              </li>
              <li>
                <i className="fas fa-qrcode"></i>
                Or scan the QR code on the certificate
              </li>
              <li>
                <i className="fas fa-check-circle"></i>
                View the verified certificate details
              </li>
            </ol>

            <div className={styles.infoBox}>
              <i className="fas fa-info-circle"></i>
              <div>
                <strong>Certificate Number Format</strong>
                <p>GreenGuardian certificates follow the format: GG-[timestamp]-[user-id]</p>
                <p>Example: GG-1234567890-ABC123</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
