'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import CitizenOnly from '@/components/CitizenOnly';
import Header from '../../components/Header';
import ScoreCard from '@/components/ScoreCard';
import ActivityLog from '@/components/ActivityLog';
import ProgressChart from '@/components/ProgressChart';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './profile.module.css';
import EcoRewards from '@/components/EcoRewards';

interface UserAction {
  id: string;
  type: string; // 'recycle', 'food-save', 'energy-save', 'transport', 'challenge'
  description: string;
  points: number;
  impact: {
    co2Saved?: number;
    plasticSaved?: number;
    foodSaved?: number;
    energySaved?: number;
    waterSaved?: number;
  };
  timestamp?: {
    seconds: number;
    nanoseconds: number;
  } | null;
  verified: boolean;
}

interface UserStats {
  totalScore: number;
  weeklyScore: number;
  monthlyScore: number;
  rank: number;
  totalActions: number;
  streakDays: number;
  level: number;
  nextLevelPoints: number;
  badges: number;
  totalImpact: {
    co2Saved: number;
    plasticSaved: number;
    foodSaved: number;
    energySaved: number;
    waterSaved: number;
  };
}

interface WeeklyData {
  week: string;
  score: number;
  actions: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats>({
    totalScore: 0,
    weeklyScore: 0,
    monthlyScore: 0,
    rank: 0,
    totalActions: 0,
    streakDays: 0,
    level: 1,
    nextLevelPoints: 100,
    badges: 0,
    totalImpact: {
      co2Saved: 0,
      plasticSaved: 0,
      foodSaved: 0,
      energySaved: 0,
      waterSaved: 0
    }
  });
  const [recentActions, setRecentActions] = useState<UserAction[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('month'); // week, month, year, all

  // Load user stats and actions
  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      try {
        // Load user stats
        const userStatsRef = doc(db, 'userStats', user.uid);
        const userStatsDoc = await getDoc(userStatsRef);
        
        if (userStatsDoc.exists()) {
          const data = userStatsDoc.data();
          // Ensure totalImpact is properly structured
          const safeUserStats: UserStats = {
            totalScore: data.totalScore || 0,
            weeklyScore: data.weeklyScore || 0,
            monthlyScore: data.monthlyScore || 0,
            rank: data.rank || 0,
            totalActions: data.totalActions || 0,
            streakDays: data.streakDays || 0,
            level: data.level || 1,
            nextLevelPoints: data.nextLevelPoints || 100,
            badges: data.badges || 0,
            totalImpact: {
              co2Saved: data.totalImpact?.co2Saved || 0,
              plasticSaved: data.totalImpact?.plasticSaved || 0,
              foodSaved: data.totalImpact?.foodSaved || 0,
              energySaved: data.totalImpact?.energySaved || 0,
              waterSaved: data.totalImpact?.waterSaved || 0
            }
          };
          setUserStats(safeUserStats);
        } else {
          // Initialize empty user stats - will be updated as user performs actions
          console.log('No user stats found, user needs to start logging actions');
        }

        // Load recent actions (simplified query to avoid index requirement)
        const actionsQuery = query(
          collection(db, 'userActions'),
          where('userId', '==', user.uid)
        );
        
        const unsubscribeActions = onSnapshot(actionsQuery, (snapshot) => {
          const actions: UserAction[] = [];
          snapshot.forEach((doc) => {
            actions.push({ id: doc.id, ...doc.data() } as UserAction);
          });
          // Sort by timestamp on client side with null safety
          actions.sort((a, b) => {
            const aTime = a.timestamp?.seconds || 0;
            const bTime = b.timestamp?.seconds || 0;
            return bTime - aTime;
          });
          setRecentActions(actions.slice(0, 20)); // Last 20 actions
        }, (error) => {
          console.log('Actions query failed, using empty array:', error);
          setRecentActions([]);
        });

        // Load weekly progress (simplified query to avoid index requirement)
        const weeklyQuery = query(
          collection(db, 'weeklyProgress'),
          where('userId', '==', user.uid)
        );
        
        const unsubscribeWeekly = onSnapshot(weeklyQuery, (snapshot) => {
          const weekly: WeeklyData[] = [];
          snapshot.forEach((doc) => {
            weekly.push(doc.data() as WeeklyData);
          });
          // Sort by week on client side
          weekly.sort((a, b) => new Date(b.week).getTime() - new Date(a.week).getTime());
          
          setWeeklyProgress(weekly.slice(0, 12)); // Last 12 weeks
        }, (error) => {
          console.log('Weekly progress query failed, using empty array:', error);
          setWeeklyProgress([]);
        });

        setLoading(false);

        return () => {
          unsubscribeActions();
          unsubscribeWeekly();
        };
      } catch (error) {
        console.error('Error loading user data:', error);
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const calculateLevel = (score: number) => {
    return Math.floor(score / 100) + 1;
  };

  const calculateProgress = (score: number) => {
    const currentLevelMin = (calculateLevel(score) - 1) * 100;
    const nextLevelMin = calculateLevel(score) * 100;
    return ((score - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100;
  };

  const getScoreColor = (score: number) => {
    if (score >= 1000) return '#4CAF50'; // Green for expert
    if (score >= 500) return '#2196F3'; // Blue for advanced
    if (score >= 200) return '#FF9800'; // Orange for intermediate
    return '#9C27B0'; // Purple for beginner
  };

  const getLevelTitle = (level: number) => {
    if (level >= 10) return 'Eco Master';
    if (level >= 7) return 'Green Guru';
    if (level >= 5) return 'Sustainability Pro';
    if (level >= 3) return 'Eco Warrior';
    return 'Green Starter';
  };

  const formatNumber = (num: number, decimals = 0) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(decimals) + 'K';
    }
    return num.toFixed(decimals);
  };

  if (!user) {
    return (
      <>
        <CitizenOnly />
        <Header logo="fas fa-user" title="GREENGUARDIAN" />
        <div className={styles.container}>
          <div className={styles.loginPrompt}>
            <h2>Please log in to view your sustainability profile</h2>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CitizenOnly />
      <Header logo="fas fa-user" title="GREENGUARDIAN" />
      
      <div className={styles.container}>
        {/* Profile Header */}
        <section className={styles.profileHeader}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              <i className="fas fa-user-circle"></i>
            </div>
            <div className={styles.userDetails}>
              <h1>{user.displayName || user.email}</h1>
              <p className={styles.levelTitle}>{getLevelTitle(userStats.level)}</p>
              <div className={styles.levelBadge}>
                <span>Level {userStats.level}</span>
              </div>
            </div>
          </div>
          
          <div className={styles.scoreOverview}>
            <div className={styles.mainScore}>
              <div 
                className={styles.scoreCircle}
                style={{ 
                  background: `conic-gradient(${getScoreColor(userStats.totalScore)} ${calculateProgress(userStats.totalScore)}%, #f0f0f0 0%)` 
                }}
              >
                <div className={styles.scoreContent}>
                  <span className={styles.scoreNumber}>{userStats.totalScore}</span>
                  <span className={styles.scoreLabel}>Sustainability Score</span>
                </div>
              </div>
            </div>
            
            <div className={styles.quickStats}>
              <div className={styles.quickStat}>
                <i className="fas fa-trophy"></i>
                <span>Rank #{userStats.rank}</span>
              </div>
              <div className={styles.quickStat}>
                <i className="fas fa-fire"></i>
                <span>{userStats.streakDays} day streak</span>
              </div>
              <div className={styles.quickStat}>
                <i className="fas fa-medal"></i>
                <span>{userStats.badges} badges</span>
              </div>
            </div>
          </div>
        </section>

        {/* Timeframe Filter */}
        <section className={styles.filters}>
          <div className={styles.timeframeButtons}>
            <button
              className={`${styles.timeframeButton} ${selectedTimeframe === 'week' ? styles.active : ''}`}
              onClick={() => setSelectedTimeframe('week')}
            >
              This Week
            </button>
            <button
              className={`${styles.timeframeButton} ${selectedTimeframe === 'month' ? styles.active : ''}`}
              onClick={() => setSelectedTimeframe('month')}
            >
              This Month
            </button>
            <button
              className={`${styles.timeframeButton} ${selectedTimeframe === 'year' ? styles.active : ''}`}
              onClick={() => setSelectedTimeframe('year')}
            >
              This Year
            </button>
            <button
              className={`${styles.timeframeButton} ${selectedTimeframe === 'all' ? styles.active : ''}`}
              onClick={() => setSelectedTimeframe('all')}
            >
              All Time
            </button>
          </div>
        </section>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading your sustainability profile...</p>
          </div>
        ) : (
          <>
            {/* Score Breakdown */}
            <section className={styles.scoreBreakdown}>
              <ScoreCard
                title="Weekly Score"
                score={userStats.weeklyScore}
                icon="fas fa-calendar-week"
                color="#4CAF50"
                trend="+15%"
              />
              <ScoreCard
                title="Monthly Score"
                score={userStats.monthlyScore}
                icon="fas fa-calendar-alt"
                color="#2196F3"
                trend="+8%"
              />
              <ScoreCard
                title="Total Actions"
                score={userStats.totalActions}
                icon="fas fa-tasks"
                color="#FF9800"
                trend="+12%"
              />
            </section>

            {/* Eco Rewards */}
            <section>
              <EcoRewards
                points={userStats.totalScore}
                userId={user.uid}
                onRedeem={(newPoints) => setUserStats((s) => ({ ...s, totalScore: newPoints }))}
              />
            </section>

            {/* Impact Overview */}
            <section className={styles.impactSection}>
              <h2>Your Environmental Impact</h2>
              <div className={styles.impactGrid}>
                <div className={styles.impactCard}>
                  <i className="fas fa-leaf"></i>
                  <div className={styles.impactValue}>
                    {formatNumber(userStats.totalImpact?.co2Saved || 0, 1)} kg
                  </div>
                  <div className={styles.impactLabel}>CO₂ Prevented</div>
                </div>
                
                <div className={styles.impactCard}>
                  <i className="fas fa-bottle-water"></i>
                  <div className={styles.impactValue}>
                    {formatNumber(userStats.totalImpact?.plasticSaved || 0)}
                  </div>
                  <div className={styles.impactLabel}>Plastic Items Saved</div>
                </div>
                
                <div className={styles.impactCard}>
                  <i className="fas fa-apple-alt"></i>
                  <div className={styles.impactValue}>
                    {formatNumber(userStats.totalImpact?.foodSaved || 0, 1)} kg
                  </div>
                  <div className={styles.impactLabel}>Food Waste Prevented</div>
                </div>
                
                <div className={styles.impactCard}>
                  <i className="fas fa-bolt"></i>
                  <div className={styles.impactValue}>
                    {formatNumber(userStats.totalImpact?.energySaved || 0, 1)} kWh
                  </div>
                  <div className={styles.impactLabel}>Energy Saved</div>
                </div>
                
                <div className={styles.impactCard}>
                  <i className="fas fa-tint"></i>
                  <div className={styles.impactValue}>
                    {formatNumber(userStats.totalImpact?.waterSaved || 0)} L
                  </div>
                  <div className={styles.impactLabel}>Water Conserved</div>
                </div>
              </div>
            </section>

            {/* Progress Chart */}
            <section className={styles.chartSection}>
              <h2>Score Progress</h2>
              <ProgressChart data={weeklyProgress} />
            </section>

            {/* Recent Activity */}
            <section className={styles.activitySection}>
              <h2>Recent Activity</h2>
              <ActivityLog actions={recentActions} />
            </section>
          </>
        )}
      </div>
    </>
  );
}