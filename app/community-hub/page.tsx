'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import CitizenOnly from '@/components/CitizenOnly';
import Header from '../../components/Header';
import ChallengeCard from '@/components/ChallengeCard';
import BadgeDisplay from '@/components/BadgeDisplay';
import { useSearchParams } from 'next/navigation';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  getDoc,
  addDoc,
  serverTimestamp,
  setDoc,
  increment,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './community-hub.module.css';

// Interfaces
interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  startDate: { seconds: number; nanoseconds: number; } | null;
  endDate: { seconds: number; nanoseconds: number; } | null;
  targetActions: number;
  participants: string[];
  badge: { name: string; icon: string; color: string; };
  isActive: boolean;
  createdBy: string;
  relatedEventTypes?: string[]; // NEW: Link challenges to event types
}

interface VolunteerEvent {
  id: string;
  title: string;
  description: string;
  type: 'cleanup' | 'tree-planting' | 'workshop' | 'community-service';
  date: any;
  time: string;
  location: string;
  address: string;
  duration: number;
  difficulty: 'easy' | 'moderate' | 'challenging';
  volunteers: string[];
  maxVolunteers: number;
  organizer: { name: string; email: string; phone?: string; };
  impact: {
    expectedCo2Reduction?: number;
    expectedWasteCollected?: number;
    expectedTreesPlanted?: number;
  };
  requirements?: string[];
  createdAt: any;
  relatedChallenges?: string[]; // NEW: Link events to challenges
}

interface UserBadge {
  id: string;
  challengeId: string;
  badgeName: string;
  badgeIcon: string;
  badgeColor: string;
  earnedAt: { seconds: number; nanoseconds: number; };
}

interface UserProfile {
  totalHours: number;
  eventsAttended: number;
  upcomingEvents: string[];
  badges: UserBadge[];
  challengesCompleted: number;
  totalActions: number; // NEW
}

// NEW: Combined Activity Interface (Option 3)
interface CombinedActivity {
  type: 'challenge' | 'event' | 'action';
  id: string;
  title: string;
  description: string;
  date: Date;
  status: 'active' | 'upcoming' | 'completed' | 'past';
  points?: number;
  icon: string;
  color: string;
  relatedItems?: { type: string; id: string; title: string; }[];
}

export default function CommunityHubPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const challengeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // State
  const [mainTab, setMainTab] = useState<'challenges' | 'events' | 'activity'>('challenges'); // NEW: Added 'activity' tab
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [events, setEvents] = useState<VolunteerEvent[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<CombinedActivity[]>([]); // NEW: Activity feed
  const [highlightedChallengeId, setHighlightedChallengeId] = useState<string | null>(null);
  
  // Challenge filters
  const [challengeTab, setChallengeTab] = useState<'active' | 'upcoming' | 'completed' | 'archived'>('active');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Event filters
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'cleanup' | 'tree-planting' | 'workshop' | 'community-service'>('all');
  
  // Modals
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null); // NEW: For showing related events
  const [selectedEvent, setSelectedEvent] = useState<VolunteerEvent | null>(null); // NEW: For showing related challenges

  const categories = [
    'all', 'plastic-reduction', 'food-waste', 'energy-saving',
    'transportation', 'recycling', 'water-conservation', 'volunteer-events' // NEW: Added volunteer category
  ];

  const eventTypes = [
    { id: 'cleanup', label: 'Cleanup Drive', icon: 'fas fa-broom', color: '#4CAF50' },
    { id: 'tree-planting', label: 'Tree Planting', icon: 'fas fa-tree', color: '#4CAF50' },
    { id: 'workshop', label: 'Workshop', icon: 'fas fa-chalkboard', color: '#2196F3' },
    { id: 'community-service', label: 'Community Service', icon: 'fas fa-handshake', color: '#9C27B0' }
  ];

  // NEW: Event type to challenge category mapping (Option 1)
  const eventToChallengeMap: Record<string, string[]> = {
    'cleanup': ['recycling', 'plastic-reduction'],
    'tree-planting': ['environmental-restoration', 'carbon-offset'],
    'workshop': ['education', 'community-engagement'],
    'community-service': ['community-engagement', 'volunteer-events']
  };

  // Load challenges
  useEffect(() => {
    const q = query(
      collection(db, 'challenges'),
      where('isActive', '==', true)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const challengesData: Challenge[] = [];
      snapshot.forEach((doc) => {
        challengesData.push({ id: doc.id, ...doc.data() } as Challenge);
      });
      challengesData.sort((a, b) => {
        if (!a.startDate || !b.startDate) return 0;
        return b.startDate.seconds - a.startDate.seconds;
      });
      setChallenges(challengesData);
      setLoading(false);
    }, () => {
      setChallenges([]);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Load events
  useEffect(() => {
    const q = query(collection(db, 'volunteerEvents'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsList: VolunteerEvent[] = [];
      snapshot.forEach((doc) => {
        eventsList.push({ id: doc.id, ...doc.data() } as VolunteerEvent);
      });
      eventsList.sort((a, b) => {
        const aDate = new Date(a.date?.seconds * 1000 || a.date);
        const bDate = new Date(b.date?.seconds * 1000 || b.date);
        return aDate.getTime() - bDate.getTime();
      });
      setEvents(eventsList);
    });
    return unsubscribe;
  }, []);

  // Load user profile
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const [userDoc, volunteerDoc] = await Promise.all([
          getDoc(doc(db, 'users', user.uid)),
          getDoc(doc(db, 'volunteerProfiles', user.uid))
        ]);

        const profile: UserProfile = {
          badges: userDoc.exists() ? (userDoc.data().badges || []) : [],
          totalHours: volunteerDoc.exists() ? (volunteerDoc.data().totalHours || 0) : 0,
          eventsAttended: volunteerDoc.exists() ? (volunteerDoc.data().eventsAttended || 0) : 0,
          upcomingEvents: volunteerDoc.exists() ? (volunteerDoc.data().upcomingEvents || []) : [],
          challengesCompleted: userDoc.exists() ? (userDoc.data().challengesCompleted || 0) : 0,
          totalActions: userDoc.exists() ? (userDoc.data().totalActions || 0) : 0
        };

        setUserProfile(profile);
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfile();
  }, [user]);

  // Handle challenge highlighting from query parameter
  useEffect(() => {
    const challengeId = searchParams.get('challengeId');
    if (challengeId && challenges.length > 0) {
      setHighlightedChallengeId(challengeId);
      setMainTab('challenges');
      setChallengeTab('active');
      
      // Scroll to the challenge after a short delay to ensure rendering
      setTimeout(() => {
        const element = challengeRefs.current[challengeId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);

      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedChallengeId(null);
      }, 3500);
    }
  }, [searchParams, challenges]);

  // NEW: Load unified activity feed (Option 3)
  useEffect(() => {
    if (!user) return;

    const loadActivities = async () => {
      const activityList: CombinedActivity[] = [];

      try {
        // Get user's challenges
        const userChallenges = challenges.filter(c => c.participants?.includes(user.uid));
        userChallenges.forEach(c => {
          const startDate = c.startDate ? new Date(c.startDate.seconds * 1000) : new Date();
          const endDate = c.endDate ? new Date(c.endDate.seconds * 1000) : new Date();
          const now = new Date();
          
          let status: 'active' | 'upcoming' | 'completed' = 'active';
          if (startDate > now) status = 'upcoming';
          else if (endDate < now) status = 'completed';

          // Find related events
          const relatedEvents = events
            .filter(e => eventToChallengeMap[e.type]?.includes(c.category))
            .map(e => ({ type: 'event', id: e.id, title: e.title }));

          activityList.push({
            type: 'challenge',
            id: c.id,
            title: c.title,
            description: c.description,
            date: startDate,
            status,
            points: c.targetActions * 10,
            icon: c.badge.icon,
            color: c.badge.color,
            relatedItems: relatedEvents
          });
        });

        // Get user's volunteer events
        const userEvents = events.filter(e => e.volunteers?.includes(user.uid));
        userEvents.forEach(e => {
          const eventDate = e.date?.toDate?.() || new Date(e.date);
          const now = new Date();
          const status = eventDate > now ? 'upcoming' : 'past';

          // Find related challenges
          const relatedChallenges = challenges
            .filter(c => eventToChallengeMap[e.type]?.includes(c.category))
            .map(c => ({ type: 'challenge', id: c.id, title: c.title }));

          const typeInfo = eventTypes.find(t => t.id === e.type);
          activityList.push({
            type: 'event',
            id: e.id,
            title: e.title,
            description: e.description,
            date: eventDate,
            status: status as any,
            points: e.duration * 15,
            icon: typeInfo?.icon || 'fas fa-calendar',
            color: typeInfo?.color || '#999',
            relatedItems: relatedChallenges
          });
        });

        // Get user's recent actions
        const actionsQuery = query(
          collection(db, 'actions'),
          where('userId', '==', user.uid)
        );
        const actionsSnapshot = await getDocs(actionsQuery);
        
        actionsSnapshot.docs.slice(0, 10).forEach(actionDoc => {
          const action = actionDoc.data();
          activityList.push({
            type: 'action',
            id: actionDoc.id,
            title: action.description || 'Action Logged',
            description: action.category,
            date: action.timestamp?.toDate() || new Date(),
            status: 'completed',
            points: action.points || 10,
            icon: 'fas fa-check-circle',
            color: '#4CAF50',
            relatedItems: action.challengeId ? [
              { type: 'challenge', id: action.challengeId, title: 'Related Challenge' }
            ] : []
          });
        });

        // Sort by date
        activityList.sort((a, b) => b.date.getTime() - a.date.getTime());
        setActivities(activityList);
      } catch (error) {
        console.error('Error loading activities:', error);
      }
    };

    loadActivities();
  }, [user, challenges, events]);

  // Filter challenges
  const getFilteredChallenges = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    let filtered = challenges;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    if (challengeTab === 'active') {
      filtered = filtered.filter(c => {
        if (!c.startDate || !c.endDate) return false;
        const start = new Date(c.startDate.seconds * 1000);
        const end = new Date(c.endDate.seconds * 1000);
        return start <= now && now <= end;
      });
    } else if (challengeTab === 'upcoming') {
      filtered = filtered.filter(c => {
        if (!c.startDate) return false;
        return new Date(c.startDate.seconds * 1000) > now;
      });
    } else if (challengeTab === 'completed') {
      // Show recently completed (within last 30 days)
      filtered = filtered.filter(c => {
        if (!c.endDate) return false;
        const endDate = new Date(c.endDate.seconds * 1000);
        return endDate < now && endDate >= thirtyDaysAgo;
      });
    } else if (challengeTab === 'archived') {
      // Show older completed challenges (more than 30 days ago)
      filtered = filtered.filter(c => {
        if (!c.endDate) return false;
        const endDate = new Date(c.endDate.seconds * 1000);
        return endDate < thirtyDaysAgo;
      });
    }

    return filtered;
  };

  // Filter events
  const getFilteredEvents = () => {
    let filtered = events;
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(e => e.type === eventTypeFilter);
    }
    return filtered;
  };

  // NEW: Get related events for a challenge (Option 4)
  const getRelatedEvents = (challenge: Challenge) => {
    if (!challenge.category) return [];
    
    return events.filter(event => {
      const relatedCategories = eventToChallengeMap[event.type] || [];
      return relatedCategories.includes(challenge.category);
    });
  };

  // NEW: Get related challenges for an event (Option 4)
  const getRelatedChallenges = (event: VolunteerEvent) => {
    const relatedCategories = eventToChallengeMap[event.type] || [];
    return challenges.filter(c => 
      relatedCategories.includes(c.category) && 
      c.isActive
    );
  };

  // Join challenge
  const handleJoinChallenge = async (challengeId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'challenges', challengeId), {
        participants: arrayUnion(user.uid)
      });
      
      // Show related events
      const challenge = challenges.find(c => c.id === challengeId);
      if (challenge) {
        const relatedEvents = getRelatedEvents(challenge);
        if (relatedEvents.length > 0) {
          alert(`Successfully joined! ${relatedEvents.length} related volunteer events available. Check them out!`);
        } else {
          alert('Successfully joined! Start logging actions to earn your badge.');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to join challenge');
    }
  };

  // NEW: Enhanced Join Event with Challenge Integration (Option 1)
  const handleJoinEvent = async (eventId: string) => {
    if (!user) return;
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      // Join the event
      await updateDoc(doc(db, 'volunteerEvents', eventId), {
        volunteers: arrayUnion(user.uid)
      });
      
      // Update volunteer profile
      const profileRef = doc(db, 'volunteerProfiles', user.uid);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        await updateDoc(profileRef, {
          upcomingEvents: arrayUnion(eventId)
        });
      } else {
        await setDoc(profileRef, {
          userId: user.uid,
          totalHours: 0,
          eventsAttended: 0,
          upcomingEvents: [eventId],
          badges: []
        });
      }
      
      // NEW: Award challenge progress based on event type (Option 1)
      const relatedCategories = eventToChallengeMap[event.type] || [];
      const relatedChallenges = challenges.filter(c => 
        relatedCategories.includes(c.category) && 
        c.participants?.includes(user.uid) &&
        c.isActive
      );
      
      let pointsAwarded = 0;
      for (const challenge of relatedChallenges) {
        // Log an action for each related challenge
        await addDoc(collection(db, 'actions'), {
          userId: user.uid,
          userEmail: user.email,
          category: challenge.category,
          description: `Joined volunteer event: ${event.title}`,
          points: 50, // Volunteer events worth 50 points
          challengeId: challenge.id,
          eventId: eventId,
          timestamp: serverTimestamp(),
          source: 'volunteer-event'
        });
        pointsAwarded += 50;
      }

      // Update total actions count
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        totalActions: increment(1)
      });
      
      if (relatedChallenges.length > 0) {
        alert(`✅ Successfully joined!\n🏆 You earned ${pointsAwarded} points in ${relatedChallenges.length} related challenge(s)!`);
      } else {
        alert('Successfully joined the event!');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to join event');
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'volunteerEvents', eventId), {
        volunteers: arrayRemove(user.uid)
      });
      const profileRef = doc(db, 'volunteerProfiles', user.uid);
      await updateDoc(profileRef, {
        upcomingEvents: arrayRemove(eventId)
      });
      alert('Successfully left the event');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to leave event');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'moderate': return '#FF9800';
      case 'challenging': return '#F44336';
      default: return '#999';
    }
  };

  if (!user) {
    return (
      <>
        <Header logo="fas fa-users" title="GREENGUARDIAN" />
        <div className={styles.container}>
          <div className={styles.loginPrompt}>
            <i className="fas fa-lock"></i>
            <h2>Join the Community</h2>
            <p>Please log in to participate in challenges and volunteer events</p>
          </div>
        </div>
      </>
    );
  }

  const filteredChallenges = getFilteredChallenges();
  const filteredEvents = getFilteredEvents();

  return (
    <>
      <CitizenOnly />
      <Header logo="fas fa-users" title="GREENGUARDIAN" />
      
      <main className="main-content">
        <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <h1>🌍 Community Hub</h1>
          <p className={styles.subtitle}>
            Join challenges, volunteer at events, and make a real environmental impact together
          </p>

          {/* User Stats Overview */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🏆</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{userProfile?.badges.length || 0}</div>
                <div className={styles.statLabel}>Badges Earned</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>⏱️</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{userProfile?.totalHours || 0}</div>
                <div className={styles.statLabel}>Volunteer Hours</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>✅</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{userProfile?.challengesCompleted || 0}</div>
                <div className={styles.statLabel}>Challenges Completed</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>👥</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{userProfile?.eventsAttended || 0}</div>
                <div className={styles.statLabel}>Events Attended</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>⚡</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{userProfile?.totalActions || 0}</div>
                <div className={styles.statLabel}>Total Actions</div>
              </div>
            </div>
          </div>
        </section>

        {/* Badges Section */}
        {userProfile && userProfile.badges.length > 0 && (
          <section className={styles.badgesSection}>
            <h2>🎖️ Your Achievement Badges</h2>
            <div className={styles.badgesScroll}>
              {userProfile.badges.map((badge, index) => (
                <BadgeDisplay key={index} badge={badge} />
              ))}
            </div>
          </section>
        )}

        {/* Main Tabs - NEW: Added Activity Feed */}
        <section className={styles.mainTabs}>
          <button
            className={`${styles.mainTab} ${mainTab === 'challenges' ? styles.active : ''}`}
            onClick={() => setMainTab('challenges')}
          >
            <i className="fas fa-trophy"></i>
            <span>Eco-Challenges</span>
            <span className={styles.badge}>{challenges.length}</span>
          </button>
          <button
            className={`${styles.mainTab} ${mainTab === 'events' ? styles.active : ''}`}
            onClick={() => setMainTab('events')}
          >
            <i className="fas fa-hands-helping"></i>
            <span>Volunteer Events</span>
            <span className={styles.badge}>{events.length}</span>
          </button>
          <button
            className={`${styles.mainTab} ${mainTab === 'activity' ? styles.active : ''}`}
            onClick={() => setMainTab('activity')}
          >
            <i className="fas fa-stream"></i>
            <span>My Activity</span>
            <span className={styles.badge}>{activities.length}</span>
          </button>
        </section>

        {/* Challenges Section */}
        {mainTab === 'challenges' && (
          <div className={styles.section}>
            {/* Challenge Tabs */}
            <div className={styles.subTabs}>
              <button
                className={challengeTab === 'active' ? styles.active : ''}
                onClick={() => setChallengeTab('active')}
              >
                Active ({challenges.filter(c => {
                  if (!c.startDate || !c.endDate) return false;
                  const now = new Date();
                  const start = new Date(c.startDate.seconds * 1000);
                  const end = new Date(c.endDate.seconds * 1000);
                  return start <= now && now <= end;
                }).length})
              </button>
              <button
                className={challengeTab === 'upcoming' ? styles.active : ''}
                onClick={() => setChallengeTab('upcoming')}
              >
                Upcoming
              </button>
              <button
                className={challengeTab === 'completed' ? styles.active : ''}
                onClick={() => setChallengeTab('completed')}
              >
                Recently Completed
              </button>
              <button
                className={challengeTab === 'archived' ? styles.active : ''}
                onClick={() => setChallengeTab('archived')}
              >
                <i className="fas fa-archive"></i> Archive
              </button>
            </div>

            {/* Category Filter */}
            <div className={styles.filters}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={styles.select}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Challenges Grid */}
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading challenges...</p>
              </div>
            ) : filteredChallenges.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="fas fa-trophy"></i>
                <h3>No challenges found</h3>
                <p>
                  {challengeTab === 'active' 
                    ? 'No active challenges right now. Check upcoming!'
                    : 'No challenges in this category'}
                </p>
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredChallenges.map(challenge => {
                  // NEW: Get related events for this challenge (Option 4)
                  const relatedEvents = getRelatedEvents(challenge);
                  const isHighlighted = highlightedChallengeId === challenge.id;
                  
                  return (
                    <div 
                      key={challenge.id} 
                      className={`${styles.challengeWrapper} ${isHighlighted ? styles.highlighted : ''}`}
                      ref={(el) => { challengeRefs.current[challenge.id] = el; }}
                    >
                      <ChallengeCard
                        challenge={challenge}
                        currentUser={user}
                        onJoinChallenge={handleJoinChallenge}
                        userBadges={userProfile?.badges || []}
                      />
                      
                      {/* NEW: Show related events (Option 4) */}
                      {relatedEvents.length > 0 && challenge.participants?.includes(user.uid) && (
                        <div className={styles.relatedSection}>
                          <h4>
                            <i className="fas fa-link"></i> 
                            Related Volunteer Events ({relatedEvents.length})
                          </h4>
                          <div className={styles.relatedItems}>
                            {relatedEvents.slice(0, 3).map(event => {
                              const eventDate = event.date?.toDate?.() || new Date(event.date);
                              const typeInfo = eventTypes.find(t => t.id === event.type);
                              return (
                                <div key={event.id} className={styles.relatedItem}>
                                  <div className={styles.relatedIcon} style={{ color: typeInfo?.color }}>
                                    <i className={typeInfo?.icon}></i>
                                  </div>
                                  <div className={styles.relatedContent}>
                                    <strong>{event.title}</strong>
                                    <small>{eventDate.toLocaleDateString()}</small>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      setMainTab('events');
                                      setEventTypeFilter(event.type);
                                    }}
                                    className={styles.viewBtn}
                                  >
                                    View
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Events Section */}
        {mainTab === 'events' && (
          <div className={styles.section}>
            <div className={styles.eventHeader}>
              <div className={styles.eventFilters}>
                <button
                  className={eventTypeFilter === 'all' ? styles.active : ''}
                  onClick={() => setEventTypeFilter('all')}
                >
                  All Events
                </button>
                {eventTypes.map(type => (
                  <button
                    key={type.id}
                    className={eventTypeFilter === type.id ? styles.active : ''}
                    onClick={() => setEventTypeFilter(type.id as any)}
                  >
                    <i className={type.icon}></i> {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Events Grid */}
            {filteredEvents.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="fas fa-calendar-times"></i>
                <h3>No events found</h3>
                <p>Be the first to create an event!</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredEvents.map(event => {
                  const typeInfo = eventTypes.find(t => t.id === event.type);
                  const eventDate = event.date?.toDate?.() || new Date(event.date);
                  const isJoined = event.volunteers?.includes(user.uid);
                  const isFull = (event.volunteers?.length || 0) >= event.maxVolunteers;
                  const hoursUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60));
                  
                  // NEW: Get related challenges (Option 4)
                  const relatedChallenges = getRelatedChallenges(event);

                  return (
                    <div key={event.id} className={styles.eventWrapper}>
                      <div className={styles.eventCard}>
                        <div className={styles.eventCardHeader}>
                          <div className={styles.typeLabel} style={{ backgroundColor: typeInfo?.color }}>
                            <i className={typeInfo?.icon}></i>
                            {typeInfo?.label}
                          </div>
                          <span 
                            className={styles.difficultyBadge}
                            style={{ backgroundColor: getDifficultyColor(event.difficulty) }}
                          >
                            {event.difficulty}
                          </span>
                        </div>

                        <h3>{event.title}</h3>
                        <p className={styles.description}>{event.description}</p>

                        <div className={styles.eventMeta}>
                          <div className={styles.metaItem}>
                            <i className="fas fa-calendar"></i>
                            <span>{eventDate.toLocaleDateString()}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <i className="fas fa-clock"></i>
                            <span>{eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {hoursUntil > 0 && hoursUntil < 48 && (
                              <span className={styles.urgent}> • {hoursUntil}h away</span>
                            )}
                          </div>
                          <div className={styles.metaItem}>
                            <i className="fas fa-map-marker-alt"></i>
                            <span>{event.location}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <i className="fas fa-hourglass-half"></i>
                            <span>{event.duration}h duration</span>
                          </div>
                        </div>

                        {event.impact && (
                          <div className={styles.impact}>
                            {(event.impact.expectedTreesPlanted ?? 0) > 0 && (
                              <span><i className="fas fa-tree"></i> {event.impact.expectedTreesPlanted} trees</span>
                            )}
                            {(event.impact.expectedWasteCollected ?? 0) > 0 && (
                              <span><i className="fas fa-trash"></i> {event.impact.expectedWasteCollected}kg</span>
                            )}
                          </div>
                        )}

                        <div className={styles.volunteers}>
                          <span>{event.volunteers.length}/{event.maxVolunteers} volunteers</span>
                          <div className={styles.progressBar}>
                            <div 
                              className={styles.progress}
                              style={{ width: `${(event.volunteers.length / event.maxVolunteers) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        {isJoined ? (
                          <button
                            onClick={() => handleLeaveEvent(event.id)}
                            className={styles.leaveBtn}
                          >
                            Leave Event
                          </button>
                        ) : (
                          <button
                            onClick={() => handleJoinEvent(event.id)}
                            className={styles.joinBtn}
                            disabled={isFull}
                          >
                            {isFull ? 'Event Full' : 'Join Event'}
                          </button>
                        )}
                      </div>

                      {/* NEW: Show related challenges (Option 4) */}
                      {relatedChallenges.length > 0 && (
                        <div className={styles.relatedSection}>
                          <h4>
                            <i className="fas fa-trophy"></i> 
                            Earn Points in Related Challenges ({relatedChallenges.length})
                          </h4>
                          <div className={styles.relatedItems}>
                            {relatedChallenges.slice(0, 3).map(challenge => {
                              const isParticipating = challenge.participants?.includes(user.uid);
                              return (
                                <div key={challenge.id} className={styles.relatedItem}>
                                  <div className={styles.relatedIcon} style={{ color: challenge.badge.color }}>
                                    <i className={challenge.badge.icon}></i>
                                  </div>
                                  <div className={styles.relatedContent}>
                                    <strong>{challenge.title}</strong>
                                    <small>
                                      {isParticipating ? '✅ Joined' : '+50 points if joined'}
                                    </small>
                                  </div>
                                  {!isParticipating && (
                                    <button 
                                      onClick={() => handleJoinChallenge(challenge.id)}
                                      className={styles.joinSmallBtn}
                                    >
                                      Join
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* NEW: Activity Feed Tab (Option 3) */}
        {mainTab === 'activity' && (
          <div className={styles.section}>
            <div className={styles.activityHeader}>
              <h2>
                <i className="fas fa-stream"></i> Your Environmental Journey
              </h2>
              <p>All your challenges, volunteer events, and actions in one place</p>
            </div>

            {activities.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="fas fa-seedling"></i>
                <h3>Start Your Journey</h3>
                <p>Join a challenge or volunteer event to see your activity here!</p>
              </div>
            ) : (
              <div className={styles.activityFeed}>
                {activities.map((activity, index) => (
                  <div key={`${activity.type}-${activity.id}-${index}`} className={styles.activityCard}>
                    <div className={styles.activityIcon} style={{ backgroundColor: activity.color }}>
                      <i className={activity.icon}></i>
                    </div>
                    
                    <div className={styles.activityContent}>
                      <div className={styles.activityHeader}>
                        <div>
                          <h3>{activity.title}</h3>
                          <span className={styles.activityType}>
                            {activity.type === 'challenge' ? '🏆 Challenge' : 
                             activity.type === 'event' ? '📅 Event' : '✅ Action'}
                          </span>
                        </div>
                        <div className={styles.activityMeta}>
                          <span className={styles.activityDate}>
                            {activity.date.toLocaleDateString()}
                          </span>
                          {activity.points && (
                            <span className={styles.activityPoints}>
                              +{activity.points} pts
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className={styles.activityDesc}>{activity.description}</p>
                      
                      <div className={styles.activityStatus}>
                        <span className={`${styles.statusBadge} ${styles[activity.status]}`}>
                          {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                        </span>
                      </div>

                      {/* Show related items */}
                      {activity.relatedItems && activity.relatedItems.length > 0 && (
                        <div className={styles.activityRelated}>
                          <small>
                            <i className="fas fa-link"></i> 
                            {activity.relatedItems.length} related {activity.type === 'challenge' ? 'event(s)' : 'challenge(s)'}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </main>
    </>
  );
}