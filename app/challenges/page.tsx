'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Header from '../../components/Header';
import ChallengeCard from '@/components/ChallengeCard';
import BadgeDisplay from '@/components/BadgeDisplay';
import InitializeChallenges from '@/components/InitializeChallenges';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './challenges.module.css';

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  startDate: {
    seconds: number;
    nanoseconds: number;
  } | null;
  endDate: {
    seconds: number;
    nanoseconds: number;
  } | null;
  targetActions: number;
  participants: string[];
  badge: {
    name: string;
    icon: string;
    color: string;
  };
  isActive: boolean;
  createdBy: string;
}

interface UserBadge {
  id: string;
  challengeId: string;
  badgeName: string;
  badgeIcon: string;
  badgeColor: string;
  earnedAt: {
    seconds: number;
    nanoseconds: number;
  };
}

export default function ChallengesPage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // active, upcoming, completed

  const categories = [
    'all',
    'plastic-reduction',
    'food-waste',
    'energy-saving',
    'transportation',
    'recycling',
    'water-conservation'
  ];

  // Load challenges from Firestore
  useEffect(() => {
    // Simplified query without orderBy to avoid index requirement
    const q = query(collection(db, 'challenges'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const challengesData: Challenge[] = [];
      querySnapshot.forEach((doc) => {
        challengesData.push({ id: doc.id, ...doc.data() } as Challenge);
      });
      // Sort by start date on client side
      challengesData.sort((a, b) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return b.startDate.seconds - a.startDate.seconds;
      });
      setChallenges(challengesData);
      setLoading(false);
    }, (error) => {
      console.log('Challenges query failed, using empty array:', error);
      setChallenges([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load user badges
  useEffect(() => {
    if (!user) return;

    const loadUserBadges = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserBadges(userData.badges || []);
        }
      } catch (error) {
        console.error('Error loading user badges:', error);
      }
    };

    loadUserBadges();
  }, [user]);

  const getFilteredChallenges = () => {
    const now = new Date();
    let filtered = challenges;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(challenge => challenge.category === selectedCategory);
    }

    // Filter by tab
    if (activeTab === 'active') {
      filtered = filtered.filter(challenge => {
        if (!challenge.startDate || !challenge.endDate) return false;
        const startDate = new Date(challenge.startDate.seconds * 1000);
        const endDate = new Date(challenge.endDate.seconds * 1000);
        return startDate <= now && now <= endDate;
      });
    } else if (activeTab === 'upcoming') {
      filtered = filtered.filter(challenge => {
        if (!challenge.startDate) return false;
        const startDate = new Date(challenge.startDate.seconds * 1000);
        return startDate > now;
      });
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(challenge => {
        if (!challenge.endDate) return false;
        const endDate = new Date(challenge.endDate.seconds * 1000);
        return endDate < now;
      });
    }

    return filtered;
  };

  const handleJoinChallenge = async (challengeId: string) => {
    if (!user) return;

    try {
      const challengeRef = doc(db, 'challenges', challengeId);
      await updateDoc(challengeRef, {
        participants: arrayUnion(user.uid)
      });
      
      alert('Successfully joined the challenge! Start logging your actions to earn your badge.');
    } catch (error) {
      console.error('Error joining challenge:', error);
      alert('Failed to join challenge. Please try again.');
    }
  };

  const filteredChallenges = getFilteredChallenges();

  return (
    <>
      <Header logo="fas fa-trophy" title="GREENGUARDIAN" />
      <InitializeChallenges />
      
      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>Waste Challenges</h1>
            <p className={styles.subtitle}>Join themed events and earn badges for your eco-actions</p>
            <p className={styles.description}>
              Participate in community challenges, track your progress, and earn exclusive badges 
              for making a positive environmental impact.
            </p>
            
            <div className={styles.stats}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{challenges.length}</div>
                <div className={styles.statLabel}>Total Challenges</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{userBadges.length}</div>
                <div className={styles.statLabel}>Badges Earned</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>
                  {challenges.reduce((total, challenge) => total + challenge.participants.length, 0)}
                </div>
                <div className={styles.statLabel}>Total Participants</div>
              </div>
            </div>
          </div>
        </section>

        {/* User Badges Section */}
        {userBadges.length > 0 && (
          <section className={styles.badgesSection}>
            <h2>Your Badges</h2>
            <div className={styles.badgesGrid}>
              {userBadges.map((badge, index) => (
                <BadgeDisplay key={index} badge={badge} />
              ))}
            </div>
          </section>
        )}

        {/* Tabs */}
        <section className={styles.tabs}>
          <div className={styles.tabButtons}>
            <button
              className={`${styles.tabButton} ${activeTab === 'active' ? styles.active : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Active Challenges
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'upcoming' ? styles.active : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'completed' ? styles.active : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              Completed
            </button>
          </div>
        </section>

        {/* Filters */}
        <section className={styles.filters}>
          <div className={styles.categoryFilter}>
            <label>Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles.categorySelect}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Challenges Grid */}
        <section className={styles.challengesGrid}>
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
                {activeTab === 'active' 
                  ? 'No active challenges at the moment. Check upcoming challenges!'
                  : activeTab === 'upcoming'
                  ? 'No upcoming challenges. Stay tuned for new ones!'
                  : 'No completed challenges to show.'
                }
              </p>
            </div>
          ) : (
            <div className={styles.challengesContainer}>
              {filteredChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  currentUser={user}
                  onJoinChallenge={handleJoinChallenge}
                  userBadges={userBadges}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}