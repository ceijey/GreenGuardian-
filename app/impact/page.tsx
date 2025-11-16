'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import CitizenOnly from '@/components/CitizenOnly';
import Header from '../../components/Header';
import ImpactChart from '@/components/ImpactChart';
import ImpactCard from '@/components/ImpactCard';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './impact.module.css';

interface ImpactData {
  plasticBottlesSaved: number;
  foodWastePrevented: number; // in kg
  co2Reduced: number; // in kg
  energySaved: number; // in kWh
  waterConserved: number; // in liters
  itemsRecycled: number;
  totalUsers: number;
  totalActions: number;
}

interface MonthlyData {
  month: string;
  plasticBottles: number;
  foodWaste: number;
  co2: number;
  energy: number;
  water: number;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  sustainabilityScore: number;
  totalActions: number;
}

export default function CommunityImpactPage() {
  const { user } = useAuth();
  const [impactData, setImpactData] = useState<ImpactData>({
    plasticBottlesSaved: 0,
    foodWastePrevented: 0,
    co2Reduced: 0,
    energySaved: 0,
    waterConserved: 0,
    itemsRecycled: 0,
    totalUsers: 0,
    totalActions: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all-time'); // all-time, month, week

  // Load community impact data
  useEffect(() => {
    const loadCommunityData = async () => {
      try {
        // Load real-time impact data
        const impactRef = doc(db, 'communityStats', 'globalImpact');
        const impactDoc = await getDoc(impactRef);
        
        if (impactDoc.exists()) {
          const data = impactDoc.data() as ImpactData;
          setImpactData(data);
        } else {
          console.log('No community impact data found yet');
        }

        // Load monthly trend data
        const monthlyRef = collection(db, 'monthlyStats');
        const monthlyQuery = query(monthlyRef);
        
        const unsubscribeMonthly = onSnapshot(monthlyQuery, (snapshot) => {
          const monthlyStats: MonthlyData[] = [];
          snapshot.forEach((doc) => {
            monthlyStats.push(doc.data() as MonthlyData);
          });
          
          // Sort by month
          monthlyStats.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
          
          setMonthlyData(monthlyStats.slice(-12)); // Last 12 months
        }, (error) => {
          console.log('Monthly stats query failed, using empty array:', error);
          setMonthlyData([]);
        });

        // Load leaderboard
        const leaderboardRef = collection(db, 'leaderboard');
        const unsubscribeLeaderboard = onSnapshot(leaderboardRef, (snapshot) => {
          const leaders: LeaderboardEntry[] = [];
          snapshot.forEach((doc) => {
            leaders.push({ userId: doc.id, ...doc.data() } as LeaderboardEntry);
          });
          
          // Sort by sustainability score
          leaders.sort((a, b) => b.sustainabilityScore - a.sustainabilityScore);
          setLeaderboard(leaders.slice(0, 10)); // Top 10
        }, (error) => {
          console.log('Leaderboard query failed, using empty array:', error);
          setLeaderboard([]);
        });

        setLoading(false);

        return () => {
          unsubscribeMonthly();
          unsubscribeLeaderboard();
        };
      } catch (error) {
        console.error('Error loading community data:', error);
        setLoading(false);
      }
    };

    loadCommunityData();
  }, []);

  const formatNumber = (num: number, decimals = 0) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(decimals) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(decimals) + 'K';
    }
    return num.toFixed(decimals);
  };

  const getImpactCards = () => [
    {
      title: 'Plastic Bottles Saved',
      value: formatNumber(impactData.plasticBottlesSaved),
      icon: 'fas fa-bottle-water',
      color: '#2196F3',
      description: 'Bottles diverted from landfills',
      trend: '+12%'
    },
    {
      title: 'Food Waste Prevented',
      value: formatNumber(impactData.foodWastePrevented, 1) + ' kg',
      icon: 'fas fa-apple-alt',
      color: '#4CAF50',
      description: 'Food saved from going to waste',
      trend: '+8%'
    },
    {
      title: 'CO₂ Reduced',
      value: formatNumber(impactData.co2Reduced, 1) + ' kg',
      icon: 'fas fa-leaf',
      color: '#8BC34A',
      description: 'Carbon emissions prevented',
      trend: '+15%'
    },
    {
      title: 'Energy Saved',
      value: formatNumber(impactData.energySaved, 1) + ' kWh',
      icon: 'fas fa-bolt',
      color: '#FF9800',
      description: 'Energy consumption reduced',
      trend: '+6%'
    },
    {
      title: 'Water Conserved',
      value: formatNumber(impactData.waterConserved) + ' L',
      icon: 'fas fa-tint',
      color: '#03A9F4',
      description: 'Water usage reduced',
      trend: '+10%'
    },
    {
      title: 'Items Recycled',
      value: formatNumber(impactData.itemsRecycled),
      icon: 'fas fa-recycle',
      color: '#9C27B0',
      description: 'Items given new life',
      trend: '+18%'
    }
  ];

  return (
    <>
      <CitizenOnly />
      <Header logo="fas fa-chart-line" title="GREENGUARDIAN" />
      
      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>Community Impact Dashboard</h1>
            <p className={styles.subtitle}>Real-time tracker of our collective environmental savings</p>
            <p className={styles.description}>
              See the amazing impact our community is making together. Every action counts, 
              and every member contributes to a more sustainable future.
            </p>
            
            <div className={styles.communityStats}>
              <div className={styles.communityStat}>
                <div className={styles.statValue}>{formatNumber(impactData.totalUsers)}</div>
                <div className={styles.statLabel}>Active Members</div>
              </div>
              <div className={styles.communityStat}>
                <div className={styles.statValue}>{formatNumber(impactData.totalActions)}</div>
                <div className={styles.statLabel}>Total Actions</div>
              </div>
              <div className={styles.communityStat}>
                <div className={styles.statValue}>
                  {formatNumber(
                    impactData.plasticBottlesSaved + 
                    impactData.itemsRecycled + 
                    Math.floor(impactData.foodWastePrevented)
                  )}
                </div>
                <div className={styles.statLabel}>Items Saved</div>
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
              className={`${styles.timeframeButton} ${selectedTimeframe === 'all-time' ? styles.active : ''}`}
              onClick={() => setSelectedTimeframe('all-time')}
            >
              All Time
            </button>
          </div>
        </section>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading community impact data...</p>
          </div>
        ) : (
          <>
            {/* Impact Cards Grid */}
            <section className={styles.impactGrid}>
              {getImpactCards().map((card, index) => (
                <ImpactCard key={index} {...card} />
              ))}
            </section>

            {/* Charts Section */}
            <section className={styles.chartsSection}>
              <div className={styles.chartContainer}>
                <h2>Impact Trends</h2>
                <ImpactChart data={monthlyData} selectedMetric="all" />
              </div>
            </section>

            {/* Leaderboard Section */}
            <section className={styles.leaderboardSection}>
              <h2>Top Eco-Warriors</h2>
              <div className={styles.leaderboard}>
                {leaderboard.map((entry, index) => (
                  <div key={entry.userId} className={styles.leaderboardEntry}>
                    <div className={styles.rank}>
                      {index + 1}
                      {index === 0 && <i className="fas fa-crown"></i>}
                    </div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>
                        {entry.userName}
                        {entry.userId === user?.uid && ' (You)'}
                      </span>
                      <span className={styles.userActions}>{entry.totalActions} actions</span>
                    </div>
                    <div className={styles.score}>
                      {entry.sustainabilityScore}
                      <span>pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Goals Section */}
            <section className={styles.goalsSection}>
              <h2>Community Goals</h2>
              <div className={styles.goalsList}>
                <div className={styles.goal}>
                  <div className={styles.goalHeader}>
                    <h3>Save 100K Plastic Bottles</h3>
                    <span className={styles.goalProgress}>
                      {Math.round((impactData.plasticBottlesSaved / 100000) * 100)}%
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progress}
                      style={{ width: `${Math.min((impactData.plasticBottlesSaved / 100000) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p>{formatNumber(100000 - impactData.plasticBottlesSaved)} bottles to go!</p>
                </div>

                <div className={styles.goal}>
                  <div className={styles.goalHeader}>
                    <h3>Prevent 50 Tons of Food Waste</h3>
                    <span className={styles.goalProgress}>
                      {Math.round((impactData.foodWastePrevented / 50000) * 100)}%
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progress}
                      style={{ width: `${Math.min((impactData.foodWastePrevented / 50000) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p>{formatNumber((50000 - impactData.foodWastePrevented) / 1000, 1)} tons to go!</p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}