'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import NGOHeader from '@/components/NGOHeader';
import styles from './ngo-portal.module.css';

interface Challenge {
  id: string;
  title: string;
  category: string;
  participants: string[];
  isActive: boolean;
  createdBy: string;
  targetActions: number;
}

interface VolunteerEvent {
  id: string;
  title: string;
  type: string;
  volunteers: string[];
  date: any;
  organizer: { name: string; email: string; };
}

export default function NGOPortalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Community Hub Data
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [events, setEvents] = useState<VolunteerEvent[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [totalVolunteerHours, setTotalVolunteerHours] = useState(0);
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    category: 'recycling',
    targetActions: 10,
    duration: 7
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

          if (role !== 'ngo') {
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

  // Load challenges created by this NGO or all challenges
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'challenges'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const challengesData: Challenge[] = [];
      let participantsSet = new Set<string>();
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<Challenge, 'id'>;
        challengesData.push({ ...data, id: docSnap.id });
        data.participants?.forEach((p: string) => participantsSet.add(p));
      });
      
      setChallenges(challengesData);
      setTotalParticipants(participantsSet.size);
    });

    return unsubscribe;
  }, [user]);

  // Load volunteer events
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'volunteerEvents'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData: VolunteerEvent[] = [];
      let totalHours = 0;
      
      snapshot.forEach((docSnap) => {
        const eventData = { id: docSnap.id, ...docSnap.data() } as VolunteerEvent;
        eventsData.push(eventData);
        
        // Calculate volunteer hours (assuming 2 hours per event per volunteer)
        totalHours += (eventData.volunteers?.length || 0) * 2;
      });
      
      setEvents(eventsData);
      setTotalVolunteerHours(totalHours);
    });

    return unsubscribe;
  }, [user]);

  // Load impact data
  useEffect(() => {
    if (!user) return;

    const loadImpactData = async () => {
      try {
        // Get all actions from challenges
        const actionsQuery = query(collection(db, 'actions'));
        const actionsSnapshot = await getDocs(actionsQuery);
        
        // Calculate actual volunteer hours from volunteer profiles
        const profilesQuery = query(collection(db, 'volunteerProfiles'));
        const profilesSnapshot = await getDocs(profilesQuery);
        
        let hours = 0;
        profilesSnapshot.forEach(doc => {
          hours += doc.data().totalHours || 0;
        });
        
        setTotalVolunteerHours(hours);
      } catch (error) {
        console.error('Error loading impact data:', error);
      }
    };

    loadImpactData();
  }, [user]);

  // Create new challenge
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + newChallenge.duration);

      await addDoc(collection(db, 'challenges'), {
        title: newChallenge.title,
        description: newChallenge.description,
        category: newChallenge.category,
        targetActions: newChallenge.targetActions,
        participants: [],
        badge: {
          name: `${newChallenge.title} Champion`,
          icon: 'fas fa-award',
          color: '#4CAF50'
        },
        isActive: true,
        createdBy: user.uid,
        createdByEmail: user.email,
        createdByName: user.displayName || 'NGO Partner',
        startDate: startDate,
        endDate: endDate,
        createdAt: serverTimestamp()
      });

      setNewChallenge({
        title: '',
        description: '',
        category: 'recycling',
        targetActions: 10,
        duration: 7
      });
      setShowCreateChallengeModal(false);
      alert('Challenge created successfully! It will appear in the Community Hub.');
    } catch (error) {
      console.error('Error creating challenge:', error);
      alert('Failed to create challenge');
    }
  };

  if (loading || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || userRole !== 'ngo') {
    return null;
  }

  return (
    <>
      <NGOHeader />
      <main className={styles.container}>
        <div className={styles.hero}>
          <h1 className={styles.title}>🌿 NGO Partner Portal</h1>
          <p className={styles.subtitle}>
            Amplify your environmental impact through campaigns, volunteer coordination, and data-driven advocacy
          </p>
        </div>

        <div className={styles.dashboard}>
          {/* Campaign Management */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-bullhorn"></i>
                Campaign Management
              </h2>
              <Link href="/community-hub" className={styles.linkButton}>
                <i className="fas fa-external-link-alt"></i> View Community Hub
              </Link>
            </div>
            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-plus-circle"></i>
                </div>
                <h3>Create Campaign</h3>
                <p>Launch environmental challenges and recruit volunteers</p>
                <button 
                  className={styles.primaryButton}
                  onClick={() => setShowCreateChallengeModal(true)}
                >
                  New Campaign
                </button>
              </div>

              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-chart-line"></i>
                </div>
                <h3>Active Campaigns</h3>
                <p>Monitor ongoing initiatives and participation rates</p>
                <div className={styles.stat}>
                  <span className={styles.statValue}>
                    {challenges.filter(c => c.isActive).length}
                  </span>
                  <span className={styles.statLabel}>Active</span>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-users"></i>
                </div>
                <h3>Total Participants</h3>
                <p>Citizens engaged in your campaigns</p>
                <div className={styles.stat}>
                  <span className={styles.statValue}>
                    {totalParticipants.toLocaleString()}
                  </span>
                  <span className={styles.statLabel}>Citizens</span>
                </div>
              </div>
            </div>
          </section>

          {/* Volunteer Coordination */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-hands-helping"></i>
                Volunteer Coordination
              </h2>
              <Link href="/community-hub" className={styles.linkButton}>
                <i className="fas fa-calendar-alt"></i> View All Events
              </Link>
            </div>
            <div className={styles.grid}>
              <div className={styles.card}>
                <h3>Post Volunteer Opportunity</h3>
                <p>Recruit volunteers for cleanup drives and events</p>
                <Link href="/ngo-portal/volunteers">
                  <button className={styles.primaryButton}>Post Opportunity</button>
                </Link>
              </div>

              <div className={styles.card}>
                <h3>Volunteer Hours Tracked</h3>
                <p>Total community service hours logged</p>
                <div className={styles.stat}>
                  <span className={styles.statValue}>
                    {totalVolunteerHours.toLocaleString()}
                  </span>
                  <span className={styles.statLabel}>Hours</span>
                </div>
              </div>

              <div className={styles.card}>
                <h3>Active Events</h3>
                <p>Volunteer opportunities available</p>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{events.length}</span>
                  <span className={styles.statLabel}>Events</span>
                </div>
              </div>
            </div>
          </section>

          {/* Impact Analytics */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-chart-pie"></i>
                Impact Analytics
              </h2>
              <Link href="/ngo-portal/analytics" className={styles.linkButton}>
                <i className="fas fa-chart-line"></i> View Full Analytics
              </Link>
            </div>
            <div className={styles.impactGrid}>
              <div className={styles.impactCard}>
                <div className={styles.impactIcon}>
                  <i className="fas fa-recycle"></i>
                </div>
                <div className={styles.impactContent}>
                  <h4>Waste Diverted</h4>
                  <p className={styles.impactValue}>12.5 tons</p>
                  <p className={styles.impactTrend}>
                    <i className="fas fa-arrow-up"></i> +45% this month
                  </p>
                </div>
              </div>

              <div className={styles.impactCard}>
                <div className={styles.impactIcon}>
                  <i className="fas fa-leaf"></i>
                </div>
                <div className={styles.impactContent}>
                  <h4>Carbon Saved</h4>
                  <p className={styles.impactValue}>8.3 tons CO₂</p>
                  <p className={styles.impactTrend}>
                    <i className="fas fa-arrow-up"></i> +32% this month
                  </p>
                </div>
              </div>

              <div className={styles.impactCard}>
                <div className={styles.impactIcon}>
                  <i className="fas fa-tree"></i>
                </div>
                <div className={styles.impactContent}>
                  <h4>Trees Planted</h4>
                  <p className={styles.impactValue}>450</p>
                  <p className={styles.impactTrend}>
                    <i className="fas fa-arrow-up"></i> 3 campaigns
                  </p>
                </div>
              </div>

              <div className={styles.impactCard}>
                <div className={styles.impactIcon}>
                  <i className="fas fa-heart"></i>
                </div>
                <div className={styles.impactContent}>
                  <h4>Community Reach</h4>
                  <p className={styles.impactValue}>5,200</p>
                  <p className={styles.impactTrend}>
                    <i className="fas fa-arrow-up"></i> Citizens engaged
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Fundraising & Awareness */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-donate"></i>
                Fundraising & Awareness
              </h2>
            </div>
            <div className={styles.grid}>
              <div className={styles.card}>
                <h3>Share Success Stories</h3>
                <p>Showcase your environmental impact</p>
                <button className={styles.primaryButton}>Create Post</button>
              </div>

              <div className={styles.card}>
                <h3>Generate Donor Reports</h3>
                <p>Export verified impact data for stakeholders</p>
                <button className={styles.secondaryButton}>Generate Report</button>
              </div>

              <div className={styles.card}>
                <h3>Partner Products</h3>
                <p>Promote eco-friendly products and services</p>
                <button className={styles.secondaryButton}>View Partners</button>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className={styles.quickActions}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.actionGrid}>
              <button className={styles.actionButton}>
                <i className="fas fa-calendar-alt"></i>
                <span>Schedule Event</span>
              </button>
              <button className={styles.actionButton}>
                <i className="fas fa-megaphone"></i>
                <span>Send Announcement</span>
              </button>
              <button className={styles.actionButton}>
                <i className="fas fa-file-download"></i>
                <span>Export Data</span>
              </button>
              <button className={styles.actionButton}>
                <i className="fas fa-cog"></i>
                <span>NGO Settings</span>
              </button>
            </div>
          </section>

          {/* Active Challenges List */}
          {challenges.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <i className="fas fa-list"></i>
                  All Active Challenges
                </h2>
              </div>
              <div className={styles.challengesList}>
                {challenges.filter(c => c.isActive).slice(0, 5).map(challenge => (
                  <div key={challenge.id} className={styles.challengeItem}>
                    <div className={styles.challengeInfo}>
                      <h3>{challenge.title}</h3>
                      <p>
                        <i className="fas fa-tag"></i> {challenge.category.replace('-', ' ')}
                      </p>
                    </div>
                    <div className={styles.challengeStats}>
                      <div className={styles.miniStat}>
                        <i className="fas fa-users"></i>
                        <span>{challenge.participants?.length || 0}</span>
                      </div>
                      <div className={styles.miniStat}>
                        <i className="fas fa-target"></i>
                        <span>{challenge.targetActions} actions</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {challenges.filter(c => c.isActive).length > 5 && (
                <div className={styles.viewMore}>
                  <Link href="/community-hub">
                    <button className={styles.secondaryButton}>
                      View All in Community Hub →
                    </button>
                  </Link>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Create Challenge Modal */}
        {showCreateChallengeModal && (
          <div className={styles.modal} onClick={() => setShowCreateChallengeModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>
                  <i className="fas fa-trophy"></i> Create Environmental Challenge
                </h2>
                <button 
                  onClick={() => setShowCreateChallengeModal(false)} 
                  className={styles.closeBtn}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateChallenge} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Challenge Title</label>
                  <input
                    type="text"
                    value={newChallenge.title}
                    onChange={(e) => setNewChallenge({...newChallenge, title: e.target.value})}
                    required
                    placeholder="e.g., 30-Day Plastic-Free Challenge"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={newChallenge.description}
                    onChange={(e) => setNewChallenge({...newChallenge, description: e.target.value})}
                    required
                    placeholder="Describe the challenge goals and how to participate..."
                    rows={4}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <select
                      value={newChallenge.category}
                      onChange={(e) => setNewChallenge({...newChallenge, category: e.target.value})}
                      required
                    >
                      <option value="plastic-reduction">Plastic Reduction</option>
                      <option value="food-waste">Food Waste</option>
                      <option value="energy-saving">Energy Saving</option>
                      <option value="transportation">Transportation</option>
                      <option value="recycling">Recycling</option>
                      <option value="water-conservation">Water Conservation</option>
                      <option value="volunteer-events">Volunteer Events</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Target Actions</label>
                    <input
                      type="number"
                      min="1"
                      value={newChallenge.targetActions || ''}
                      onChange={(e) => setNewChallenge({...newChallenge, targetActions: parseInt(e.target.value) || 10})}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Duration (days)</label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={newChallenge.duration || ''}
                      onChange={(e) => setNewChallenge({...newChallenge, duration: parseInt(e.target.value) || 7})}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    onClick={() => setShowCreateChallengeModal(false)}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    <i className="fas fa-plus-circle"></i> Create Challenge
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
