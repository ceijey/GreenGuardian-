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
  updateDoc 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PartnerHeader from '@/components/PartnerHeader';
import styles from './verify-participants.module.css';

interface Participant {
  userId: string;
  userName: string;
  email: string;
  challengeId: string;
  challengeTitle: string;
  joinDate: any;
  completedActions: number;
  hasCertificate: boolean;
  certificateId?: string;
}

export default function VerifyParticipantsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string>('all');
  const [challenges, setChallenges] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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

          if (role !== 'private-partner' && role !== 'government' && role !== 'school') {
            router.push('/dashboard');
            return;
          }

          await loadData(role);
        } catch (error) {
          console.error('Error fetching user role:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkUserRole();
  }, [user, loading, router]);

  const loadData = async (role: string) => {
    if (!user) return;

    try {
      // Load challenges based on role
      let challengesQuery;
      if (role === 'private-partner') {
        challengesQuery = query(
          collection(db, 'challenges'),
          where('sponsorId', '==', user.uid)
        );
      } else {
        challengesQuery = collection(db, 'challenges');
      }

      const challengesSnapshot = await getDocs(challengesQuery);
      const challengesData: any[] = [];
      const participantsData: Participant[] = [];

      // Load existing certificates
      const certificatesSnapshot = await getDocs(collection(db, 'certificates'));
      const certificatesByUser = new Map<string, any>();
      certificatesSnapshot.forEach(doc => {
        const data = doc.data();
        const key = `${data.userId}-${data.challengeId}`;
        certificatesByUser.set(key, { id: doc.id, ...data });
      });

      for (const challengeDoc of challengesSnapshot.docs) {
        const challengeData = challengeDoc.data();
        challengesData.push({
          id: challengeDoc.id,
          title: challengeData.title
        });

        const participantIds = challengeData.participants || [];
        
        // Load participant details
        for (const participantId of participantIds) {
          const userDoc = await getDoc(doc(db, 'users', participantId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const certKey = `${participantId}-${challengeDoc.id}`;
            const certificate = certificatesByUser.get(certKey);

            participantsData.push({
              userId: participantId,
              userName: userData.displayName || userData.email || 'Unknown',
              email: userData.email,
              challengeId: challengeDoc.id,
              challengeTitle: challengeData.title,
              joinDate: challengeData.createdAt,
              completedActions: challengeData.userActions?.[participantId] || 0,
              hasCertificate: !!certificate,
              certificateId: certificate?.id
            });
          }
        }
      }

      setChallenges(challengesData);
      setParticipants(participantsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const filteredParticipants = participants.filter(p => {
    const matchesChallenge = selectedChallenge === 'all' || p.challengeId === selectedChallenge;
    const matchesSearch = p.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesChallenge && matchesSearch;
  });

  if (loading || isLoading) {
    return (
      <div className={styles.container}>
        <PartnerHeader />
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading participants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PartnerHeader />
      
      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Verify Participants</h1>
          <p>View and verify participant certificates for your sponsored challenges</p>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <i className="fas fa-users"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{participants.length}</span>
              <span className={styles.statLabel}>Total Participants</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-certificate"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>
                {participants.filter(p => p.hasCertificate).length}
              </span>
              <span className={styles.statLabel}>Certificates Issued</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-trophy"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{challenges.length}</span>
              <span className={styles.statLabel}>Active Challenges</span>
            </div>
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search participants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={selectedChallenge}
            onChange={(e) => setSelectedChallenge(e.target.value)}
            className={styles.challengeSelect}
          >
            <option value="all">All Challenges</option>
            {challenges.map(challenge => (
              <option key={challenge.id} value={challenge.id}>
                {challenge.title}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.participantsTable}>
            <thead>
              <tr>
                <th>Participant Name</th>
                <th>Email</th>
                <th>Challenge</th>
                <th>Actions Completed</th>
                <th>Certificate Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    <i className="fas fa-users-slash"></i>
                    <p>No participants found</p>
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((participant, index) => (
                  <tr key={`${participant.userId}-${participant.challengeId}-${index}`}>
                    <td>
                      <div className={styles.participantName}>
                        <i className="fas fa-user-circle"></i>
                        {participant.userName}
                      </div>
                    </td>
                    <td>{participant.email}</td>
                    <td>
                      <span className={styles.challengeTag}>
                        {participant.challengeTitle}
                      </span>
                    </td>
                    <td>
                      <span className={styles.actionsCount}>
                        <i className="fas fa-tasks"></i>
                        {participant.completedActions}
                      </span>
                    </td>
                    <td>
                      {participant.hasCertificate ? (
                        <span className={styles.statusIssued}>
                          <i className="fas fa-check-circle"></i>
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
                        {participant.hasCertificate && participant.certificateId && (
                          <button
                            className={styles.verifyButton}
                            onClick={() => {
                              // Get certificate details
                              const cert = participants.find(p => 
                                p.userId === participant.userId && 
                                p.challengeId === participant.challengeId
                              );
                              if (cert?.certificateId) {
                                window.open(`/verify/${cert.certificateId}`, '_blank');
                              }
                            }}
                          >
                            <i className="fas fa-check-double"></i>
                            Verify
                          </button>
                        )}
                        <button
                          className={styles.viewButton}
                          onClick={() => {
                            alert(`Participant Details:\n\nName: ${participant.userName}\nEmail: ${participant.email}\nChallenge: ${participant.challengeTitle}\nActions: ${participant.completedActions}\nCertificate: ${participant.hasCertificate ? 'Issued' : 'Not Issued'}`);
                          }}
                        >
                          <i className="fas fa-eye"></i>
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
