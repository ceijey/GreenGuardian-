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
import SchoolHeader from '@/components/SchoolHeader';
import styles from './school-portal.module.css';

interface CommunityChallenge {
  id: string;
  title: string;
  category: string;
  participants: string[];
  completions: number;
  isActive: boolean;
}

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'quiz' | 'lesson-plan';
  content: string;
  category: string;
  createdBy: string;
  createdAt: any;
  views?: number;
  likes?: number;
}

interface ResourceInteraction {
  id: string;
  resourceId: string;
  resourceTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'view' | 'complete' | 'like';
  timestamp: any;
}

export default function SchoolPortalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // School data
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceInteractions, setResourceInteractions] = useState<ResourceInteraction[]>([]);
  const [totalCitizens, setTotalCitizens] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [totalCompletions, setTotalCompletions] = useState(0);

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

          if (role !== 'school') {
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

  // Load community stats
  useEffect(() => {
    if (!user || userRole !== 'school') return;

    // First, load all citizen users once
    const loadCitizens = async () => {
      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'citizen')
        );
        const usersSnapshot = await getDocs(usersQuery);
        const citizenIds = new Set<string>();
        
        usersSnapshot.forEach((doc) => {
          citizenIds.add(doc.id);
        });

        // Then listen to presence changes
        const presenceQuery = query(collection(db, 'userPresence'));
        const unsubscribe = onSnapshot(presenceQuery, (snapshot) => {
          const now = Date.now();
          const fiveMinutesAgo = now - (5 * 60 * 1000); // 5 minutes threshold
          
          let activeCitizenCount = 0;
          
          snapshot.forEach((presenceDoc) => {
            const presenceData = presenceDoc.data();
            const userId = presenceData.userId;
            
            // Check if user is a citizen and was active in last 5 minutes
            if (citizenIds.has(userId)) {
              const lastSeen = presenceData.lastSeen?.toMillis?.() || 0;
              if (lastSeen > fiveMinutesAgo || presenceData.status === 'online') {
                activeCitizenCount++;
              }
            }
          });
          
          setTotalCitizens(activeCitizenCount);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error loading community stats:', error);
      }
    };

    const unsubscribePromise = loadCitizens();
    
    return () => {
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [user, userRole]);

  // Load community challenges
  useEffect(() => {
    if (!user || userRole !== 'school') return;

    const q = query(collection(db, 'challenges'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const challengesList: CommunityChallenge[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        challengesList.push({
          id: doc.id,
          title: data.title || '',
          category: data.category || '',
          participants: data.participants || [],
          completions: data.completions || 0,
          isActive: data.isActive || false
        });
      });
      
      setChallenges(challengesList);
    });

    return unsubscribe;
  }, [user, userRole]);

  // Load resources created by this school
  useEffect(() => {
    if (!user || userRole !== 'school') return;

    const q = query(collection(db, 'educationalResources'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resourcesList: Resource[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        resourcesList.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          type: data.type || 'article',
          content: data.content || '',
          category: data.category || '',
          createdBy: data.createdBy || '',
          createdAt: data.createdAt,
          views: data.views || 0,
          likes: data.likes || 0
        });
      });
      
      setResources(resourcesList);
      
      // Calculate total views
      const views = resourcesList.reduce((sum, r) => sum + (r.views || 0), 0);
      setTotalViews(views);
    });

    return unsubscribe;
  }, [user, userRole]);

  // Load resource interactions (citizen engagement)
  useEffect(() => {
    if (!user || userRole !== 'school') return;

    const q = query(collection(db, 'resourceInteractions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const interactionsList: ResourceInteraction[] = [];
      let completionCount = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const interaction: ResourceInteraction = {
          id: doc.id,
          resourceId: data.resourceId || '',
          resourceTitle: data.resourceTitle || '',
          userId: data.userId || '',
          userName: data.userName || '',
          userEmail: data.userEmail || '',
          type: data.type || 'view',
          timestamp: data.timestamp
        };
        
        interactionsList.push(interaction);
        
        if (data.type === 'complete') {
          completionCount++;
        }
      });
      
      setResourceInteractions(interactionsList);
      setTotalCompletions(completionCount);
    });

    return unsubscribe;
  }, [user, userRole]);

  if (loading || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || userRole !== 'school') {
    return null;
  }

  return (
    <>
      <SchoolHeader />
      <main className={styles.container}>
        <div className={styles.hero}>
          <h1 className={styles.title}>🎓 School & Education Portal</h1>
          <p className={styles.subtitle}>
            Create and share educational resources with the community. Track citizen engagement and impact in real-time.
          </p>
        </div>

        <div className={styles.dashboard}>
          {/* Community Engagement Overview */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-users"></i>
                Community Engagement
              </h2>
              <Link href="/community-hub" className={styles.linkButton}>
                <i className="fas fa-globe"></i> Community Hub
              </Link>
            </div>
            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-user-friends"></i>
                </div>
                <h3>Active Citizens</h3>
                <p>Community members using platform</p>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{totalCitizens}</span>
                  <span className={styles.statLabel}>Citizens</span>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-book"></i>
                </div>
                <h3>Posted Resources</h3>
                <p>Educational resources created</p>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{resources.length}</span>
                  <span className={styles.statLabel}>Resources</span>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-eye"></i>
                </div>
                <h3>Total Views</h3>
                <p>Resource views by citizens</p>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{totalViews}</span>
                  <span className={styles.statLabel}>Views</span>
                </div>
              </div>
            </div>
          </section>

          {/* Community Challenges */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-trophy"></i>
                Community Challenges
              </h2>
              <Link href="/community-hub" className={styles.linkButton}>
                <i className="fas fa-trophy"></i> All Challenges
              </Link>
            </div>
            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-flag"></i>
                </div>
                <h3>Active Challenges</h3>
                <p>Community environmental challenges</p>
                <div className={styles.stat}>
                  <span className={styles.statValue}>
                    {challenges.filter(c => c.isActive).length}
                  </span>
                  <span className={styles.statLabel}>Active</span>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-users-cog"></i>
                </div>
                <h3>Participants</h3>
                <p>Citizens engaged in challenges</p>
                <div className={styles.stat}>
                  <span className={styles.statValue}>
                    {challenges.reduce((sum, c) => sum + c.participants.length, 0)}
                  </span>
                  <span className={styles.statLabel}>Participants</span>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-check-circle"></i>
                </div>
                <h3>Completions</h3>
                <p>Total challenge completions</p>
                <div className={styles.stat}>
                  <span className={styles.statValue}>
                    {challenges.reduce((sum, c) => sum + c.completions, 0)}
                  </span>
                  <span className={styles.statLabel}>Completed</span>
                </div>
              </div>
            </div>
          </section>

          {/* Community Analytics */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-chart-line"></i>
                Community Analytics
              </h2>
            </div>
            <div className={styles.impactGrid}>
              <div className={styles.impactCard}>
                <div className={styles.impactIcon}>
                  <i className="fas fa-eye"></i>
                </div>
                <div className={styles.impactContent}>
                  <h4>Resource Views</h4>
                  <p className={styles.impactValue}>
                    {totalViews}
                  </p>
                  <p className={styles.impactTrend}>
                    <i className="fas fa-arrow-up"></i> Citizens reading content
                  </p>
                </div>
              </div>

              <div className={styles.impactCard}>
                <div className={styles.impactIcon}>
                  <i className="fas fa-check-double"></i>
                </div>
                <div className={styles.impactContent}>
                  <h4>Completions</h4>
                  <p className={styles.impactValue}>
                    {totalCompletions}
                  </p>
                  <p className={styles.impactTrend}>
                    <i className="fas fa-check"></i> Content completed
                  </p>
                </div>
              </div>

              <div className={styles.impactCard}>
                <div className={styles.impactIcon}>
                  <i className="fas fa-heart"></i>
                </div>
                <div className={styles.impactContent}>
                  <h4>Total Likes</h4>
                  <p className={styles.impactValue}>
                    {resources.reduce((sum, r) => sum + (r.likes || 0), 0)}
                  </p>
                  <p className={styles.impactTrend}>
                    <i className="fas fa-thumbs-up"></i> Community engagement
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Access & Management */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-tools"></i>
                Content Management
              </h2>
            </div>
            
            <div className={styles.quickAccessGrid}>
              <Link href="/school-portal/resources" className={styles.quickAccessCard}>
                <div className={styles.quickAccessIcon}>
                  <i className="fas fa-book-open"></i>
                </div>
                <div className={styles.quickAccessContent}>
                  <h3>Manage Resources</h3>
                  <p>Create and edit articles, videos, and lesson plans</p>
                  <div className={styles.quickAccessStats}>
                    <span><i className="fas fa-file-alt"></i> {resources.length} resources</span>
                    <span><i className="fas fa-eye"></i> {totalViews} views</span>
                  </div>
                </div>
                <div className={styles.quickAccessArrow}>
                  <i className="fas fa-arrow-right"></i>
                </div>
              </Link>

              <Link href="/school-portal/challenges" className={styles.quickAccessCard}>
                <div className={styles.quickAccessIcon}>
                  <i className="fas fa-clipboard-question"></i>
                </div>
                <div className={styles.quickAccessContent}>
                  <h3>Create Quizzes</h3>
                  <p>Build interactive quizzes and educational challenges</p>
                  <div className={styles.quickAccessStats}>
                    <span><i className="fas fa-tasks"></i> {challenges.length} challenges</span>
                    <span><i className="fas fa-users"></i> {challenges.reduce((sum, c) => sum + (c.participants?.length || 0), 0)} participants</span>
                  </div>
                </div>
                <div className={styles.quickAccessArrow}>
                  <i className="fas fa-arrow-right"></i>
                </div>
              </Link>

              <Link href="/school-portal/profile" className={styles.quickAccessCard}>
                <div className={styles.quickAccessIcon}>
                  <i className="fas fa-user-circle"></i>
                </div>
                <div className={styles.quickAccessContent}>
                  <h3>School Profile</h3>
                  <p>Manage your school's profile and settings</p>
                  <div className={styles.quickAccessStats}>
                    <span><i className="fas fa-book"></i> {resources.length} resources</span>
                    <span><i className="fas fa-eye"></i> {totalViews} views</span>
                  </div>
                </div>
                <div className={styles.quickAccessArrow}>
                  <i className="fas fa-arrow-right"></i>
                </div>
              </Link>
            </div>
          </section>

          {/* Recent Citizen Activity */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-history"></i>
                Recent Citizen Activity
              </h2>
            </div>
            {resourceInteractions.length > 0 ? (
              <div className={styles.activityList}>
                {resourceInteractions
                  .slice(0, 10)
                  .map((interaction) => (
                    <div key={interaction.id} className={styles.activityItem}>
                      <div className={styles.activityIcon}>
                        {interaction.type === 'view' && <i className="fas fa-eye"></i>}
                        {interaction.type === 'complete' && <i className="fas fa-check-circle"></i>}
                        {interaction.type === 'like' && <i className="fas fa-heart"></i>}
                      </div>
                      <div className={styles.activityInfo}>
                        <p className={styles.activityUser}>
                          <strong>{interaction.userName}</strong>
                          {interaction.type === 'view' && ' viewed'}
                          {interaction.type === 'complete' && ' completed'}
                          {interaction.type === 'like' && ' liked'}
                        </p>
                        <p className={styles.activityResource}>
                          {interaction.resourceTitle}
                        </p>
                      </div>
                      <div className={styles.activityTime}>
                        <i className="fas fa-clock"></i>
                        {interaction.timestamp?.toDate?.() 
                          ? new Date(interaction.timestamp.toDate()).toLocaleDateString() 
                          : 'Recently'}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <i className="fas fa-inbox"></i>
                <p>No citizen activity yet. Create resources to start tracking engagement!</p>
              </div>
            )}
          </section>

          {/* Posted Resources */}
          {resources.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <i className="fas fa-book"></i>
                  Your Posted Resources
                </h2>
              </div>
              <div className={styles.resourcesList}>
                {resources
                  .slice(0, 5)
                  .map((resource) => (
                    <div key={resource.id} className={styles.resourceItem}>
                      <div className={styles.resourceIcon}>
                        {resource.type === 'article' && <i className="fas fa-newspaper"></i>}
                        {resource.type === 'video' && <i className="fas fa-video"></i>}
                        {resource.type === 'quiz' && <i className="fas fa-question-circle"></i>}
                        {resource.type === 'lesson-plan' && <i className="fas fa-chalkboard-teacher"></i>}
                      </div>
                      <div className={styles.resourceInfo}>
                        <h3>{resource.title}</h3>
                        <p>{resource.description}</p>
                        <div className={styles.resourceMeta}>
                          <span className={styles.resourceType}>
                            <i className="fas fa-tag"></i> {resource.type}
                          </span>
                          <span className={styles.resourceCategory}>
                            <i className="fas fa-folder"></i> {resource.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              {resources.length > 5 && (
                <Link href="/resources" className={styles.viewMore}>
                  View All Resources →
                </Link>
              )}
            </section>
          )}
        </div>
      </main>
    </>
  );
}
