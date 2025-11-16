'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PartnerHeader from '@/components/PartnerHeader';
import styles from './sponsorships.module.css';

interface Sponsorship {
  id: string;
  title: string;
  type: 'challenge' | 'event' | 'service';
  fundingAmount: number;
  startDate: any;
  endDate: any;
  status: 'active' | 'completed' | 'pending' | 'archived';
  participants: number;
  participantIds: string[];
  brandImpressions: number;
  engagement: number;
  isArchived?: boolean;
}

interface Participant {
  userId: string;
  userName: string;
  email: string;
  completedActions: number;
  hasCertificate: boolean;
  certificateId?: string;
  isVerified: boolean;
}

export default function SponsorshipsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'pending' | 'archived'>('all');
  const [selectedSponsorship, setSelectedSponsorship] = useState<Sponsorship | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

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

    // Load sponsored challenges
    const challengesQuery = query(
      collection(db, 'challenges'),
      where('sponsorId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(challengesQuery, (snapshot) => {
      const sponsorshipData: Sponsorship[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Determine status
        let status: 'active' | 'completed' | 'pending' | 'archived' = 'pending';
        
        if (data.isArchived) {
          status = 'archived';
        } else if (data.isActive) {
          status = 'active';
        } else if (data.endDate) {
          const endDate = new Date(data.endDate.seconds * 1000);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          // If ended more than 30 days ago, mark as archived
          if (endDate < thirtyDaysAgo) {
            status = 'archived';
          } else {
            status = 'completed';
          }
        }
        
        // Extract participants array - handle both possible formats
        let participantIds: string[] = [];
        if (Array.isArray(data.participants)) {
          participantIds = data.participants;
        } else if (data.participantIds && Array.isArray(data.participantIds)) {
          participantIds = data.participantIds;
        }
        
        sponsorshipData.push({
          id: doc.id,
          title: data.title,
          type: 'challenge',
          fundingAmount: data.fundingAmount || 0,
          startDate: data.startDate,
          endDate: data.endDate,
          status,
          participants: participantIds.length,
          participantIds: participantIds,
          brandImpressions: data.brandImpressions || 0,
          engagement: data.totalActions || 0,
          isArchived: data.isArchived || false
        });
      });

      setSponsorships(sponsorshipData);
    });

    return unsubscribe;
  }, [user]);

  const loadParticipants = async (sponsorship: Sponsorship) => {
    setLoadingParticipants(true);
    
    try {
      const participantsData: Participant[] = [];
      
      // Check if there are any participants
      if (!sponsorship.participantIds || sponsorship.participantIds.length === 0) {
        setParticipants([]);
        setLoadingParticipants(false);
        return;
      }
      
      // Load certificates
      const certificatesSnapshot = await getDocs(collection(db, 'certificates'));
      const certificatesByUser = new Map<string, any>();
      certificatesSnapshot.forEach(doc => {
        const data = doc.data();
        const key = `${data.userId}-${sponsorship.id}`;
        certificatesByUser.set(key, { id: doc.id, ...data });
      });

      // Get challenge data including verified participants
      const challengeDoc = await getDoc(doc(db, 'challenges', sponsorship.id));
      if (!challengeDoc.exists()) {
        console.error('Challenge document not found for ID:', sponsorship.id);
        setParticipants([]);
        setLoadingParticipants(false);
        return;
      }
      
      const challengeData = challengeDoc.data();
      const verifiedParticipants = challengeData?.verifiedParticipants || [];

      // Load participant details
      for (const participantId of sponsorship.participantIds) {
        try {
          const userDocRef = doc(db, 'users', participantId);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const certKey = `${participantId}-${sponsorship.id}`;
            const certificate = certificatesByUser.get(certKey);

            // Get user actions from challenge
            const completedActions = challengeData?.userActions?.[participantId] || 0;

            participantsData.push({
              userId: participantId,
              userName: userData.displayName || userData.email || 'Unknown User',
              email: userData.email || 'No email',
              completedActions,
              hasCertificate: !!certificate,
              certificateId: certificate?.certificateNumber,
              isVerified: verifiedParticipants.includes(participantId)
            });
          } else {
            console.warn('User document not found for participant:', participantId);
            
            // Add placeholder participant to show there's a missing user
            participantsData.push({
              userId: participantId,
              userName: '⚠️ User Profile Not Found',
              email: `User ID: ${participantId.substring(0, 10)}...`,
              completedActions: challengeData?.userActions?.[participantId] || 0,
              hasCertificate: false,
              certificateId: undefined,
              isVerified: verifiedParticipants.includes(participantId)
            });
          }
        } catch (error) {
          console.error(`Error loading participant ${participantId}:`, error);
          
          // Add error participant
          participantsData.push({
            userId: participantId,
            userName: '❌ Error Loading User',
            email: 'Please contact support',
            completedActions: 0,
            hasCertificate: false,
            certificateId: undefined,
            isVerified: false
          });
        }
      }

      setParticipants(participantsData);
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleViewDetails = (sponsorship: Sponsorship) => {
    setSelectedSponsorship(sponsorship);
    loadParticipants(sponsorship);
  };

  const verifyParticipant = async (participantId: string) => {
    if (!selectedSponsorship) return;

    try {
      const challengeRef = doc(db, 'challenges', selectedSponsorship.id);
      await updateDoc(challengeRef, {
        verifiedParticipants: arrayUnion(participantId)
      });

      // Update local state
      setParticipants(prev => 
        prev.map(p => 
          p.userId === participantId 
            ? { ...p, isVerified: true }
            : p
        )
      );

      alert('✅ Participant verified successfully! They can now generate their certificate.');
    } catch (error) {
      console.error('Error verifying participant:', error);
      alert('Failed to verify participant. Please try again.');
    }
  };

  if (loading || isLoading) {
    return (
      <div className={styles.container}>
        <PartnerHeader />
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading sponsorships...</p>
        </div>
      </div>
    );
  }

  const filteredSponsorships = sponsorships.filter(s => 
    filter === 'all' || s.status === filter
  );

  const totalInvestment = sponsorships.reduce((sum, s) => sum + s.fundingAmount, 0);
  const totalImpressions = sponsorships.reduce((sum, s) => sum + s.brandImpressions, 0);
  const totalParticipants = sponsorships.reduce((sum, s) => sum + s.participants, 0);

  return (
    <div className={styles.container}>
      <PartnerHeader />
      
      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Sponsorships</h1>
          <p>Manage and track your sponsored initiatives</p>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <i className="fas fa-hand-holding-usd"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>₱{totalInvestment.toLocaleString()}</span>
              <span className={styles.statLabel}>Total Investment</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-eye"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{totalImpressions.toLocaleString()}</span>
              <span className={styles.statLabel}>Brand Impressions</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-users"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{totalParticipants.toLocaleString()}</span>
              <span className={styles.statLabel}>Total Participants</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-trophy"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{sponsorships.length}</span>
              <span className={styles.statLabel}>Active Sponsorships</span>
            </div>
          </div>
        </div>

        <div className={styles.filters}>
          <button 
            className={filter === 'all' ? styles.active : ''}
            onClick={() => setFilter('all')}
          >
            <i className="fas fa-list"></i>
            All
          </button>
          <button 
            className={filter === 'active' ? styles.active : ''}
            onClick={() => setFilter('active')}
          >
            <i className="fas fa-play-circle"></i>
            Active
          </button>
          <button 
            className={filter === 'completed' ? styles.active : ''}
            onClick={() => setFilter('completed')}
          >
            <i className="fas fa-check-circle"></i>
            Recently Completed
          </button>
          <button 
            className={filter === 'pending' ? styles.active : ''}
            onClick={() => setFilter('pending')}
          >
            <i className="fas fa-clock"></i>
            Pending
          </button>
          <button 
            className={filter === 'archived' ? styles.active : ''}
            onClick={() => setFilter('archived')}
          >
            <i className="fas fa-archive"></i>
            Archive
          </button>
        </div>

        <div className={styles.sponsorshipsList}>
          {filteredSponsorships.length === 0 ? (
            <div className={styles.empty}>
              <i className="fas fa-handshake"></i>
              <p>No sponsorships found</p>
            </div>
          ) : (
            filteredSponsorships.map(sponsorship => (
              <div key={sponsorship.id} className={styles.sponsorshipCard}>
                <div className={styles.cardHeader}>
                  <h3>{sponsorship.title}</h3>
                  <span className={`${styles.badge} ${styles[sponsorship.status]}`}>
                    {sponsorship.status}
                  </span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.metric}>
                    <i className="fas fa-money-bill-wave"></i>
                    <div>
                      <span className={styles.metricValue}>₱{sponsorship.fundingAmount.toLocaleString()}</span>
                      <span className={styles.metricLabel}>Funding</span>
                    </div>
                  </div>
                  <div className={styles.metric}>
                    <i className="fas fa-users"></i>
                    <div>
                      <span className={styles.metricValue}>{sponsorship.participants}</span>
                      <span className={styles.metricLabel}>Participants</span>
                    </div>
                  </div>
                  <div className={styles.metric}>
                    <i className="fas fa-eye"></i>
                    <div>
                      <span className={styles.metricValue}>{sponsorship.brandImpressions.toLocaleString()}</span>
                      <span className={styles.metricLabel}>Impressions</span>
                    </div>
                  </div>
                  <div className={styles.metric}>
                    <i className="fas fa-chart-line"></i>
                    <div>
                      <span className={styles.metricValue}>{sponsorship.engagement}</span>
                      <span className={styles.metricLabel}>Engagement</span>
                    </div>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <button 
                    className={styles.viewButton}
                    onClick={() => handleViewDetails(sponsorship)}
                  >
                    <i className="fas fa-eye"></i>
                    View Details & Participants
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Participants Modal */}
        {selectedSponsorship && (
          <div className={styles.modal} onClick={() => setSelectedSponsorship(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>{selectedSponsorship.title}</h2>
                <button 
                  className={styles.closeBtn}
                  onClick={() => setSelectedSponsorship(null)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className={styles.modalBody}>
                <h3>Participants ({participants.length})</h3>
                
                {loadingParticipants ? (
                  <div className={styles.loadingParticipants}>
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Loading participants...</p>
                  </div>
                ) : participants.length === 0 ? (
                  <div className={styles.emptyParticipants}>
                    <i className="fas fa-users-slash"></i>
                    <p>No participants yet</p>
                  </div>
                ) : (
                  <div className={styles.participantsTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Actions</th>
                          <th>Verified</th>
                          <th>Certificate</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map((participant) => (
                          <tr key={participant.userId}>
                            <td>
                              <div className={styles.participantName}>
                                <i className="fas fa-user-circle"></i>
                                {participant.userName}
                              </div>
                            </td>
                            <td>{participant.email}</td>
                            <td>
                              <span className={styles.actionsCount}>
                                <i className="fas fa-tasks"></i>
                                {participant.completedActions}
                              </span>
                            </td>
                            <td>
                              {participant.isVerified ? (
                                <span className={styles.statusVerified}>
                                  <i className="fas fa-check-circle"></i>
                                  Verified
                                </span>
                              ) : (
                                <span className={styles.statusNotVerified}>
                                  <i className="fas fa-exclamation-circle"></i>
                                  Not Verified
                                </span>
                              )}
                            </td>
                            <td>
                              {participant.hasCertificate ? (
                                <span className={styles.statusIssued}>
                                  <i className="fas fa-certificate"></i>
                                  Issued
                                </span>
                              ) : (
                                <span className={styles.statusPending}>
                                  <i className="fas fa-clock"></i>
                                  Pending
                                </span>
                              )}
                            </td>
                            <td>
                              <div className={styles.actionButtons}>
                                {!participant.isVerified && (selectedSponsorship?.status === 'completed' || selectedSponsorship?.status === 'active') && (
                                  <button
                                    className={styles.verifyActionBtn}
                                    onClick={() => verifyParticipant(participant.userId)}
                                    title="Verify this participant to allow certificate generation"
                                  >
                                    <i className="fas fa-user-check"></i>
                                    Verify
                                  </button>
                                )}
                                {participant.isVerified && !participant.hasCertificate && (
                                  <span className={styles.infoText}>
                                    <i className="fas fa-info-circle"></i>
                                    Awaiting certificate generation
                                  </span>
                                )}
                                {participant.hasCertificate && participant.certificateId && (
                                  <button
                                    className={styles.viewCertBtn}
                                    onClick={() => window.open(`/verify/${participant.certificateId}`, '_blank')}
                                    title="View certificate"
                                  >
                                    <i className="fas fa-eye"></i>
                                    View Cert
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
