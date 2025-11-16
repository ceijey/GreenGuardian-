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
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import NGOHeader from '@/components/NGOHeader';
import styles from './campaigns.module.css';

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  participants: string[];
  isActive: boolean;
  createdBy: string;
  createdByName?: string;
  targetActions: number;
  duration: number;
  startDate: any;
  endDate: any;
  completedActions?: number;
}

export default function CampaignsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    category: 'recycling',
    targetActions: 10,
    duration: 7
  });

  const categories = [
    { id: 'recycling', label: 'Recycling', icon: 'fa-recycle', color: '#4CAF50' },
    { id: 'tree-planting', label: 'Tree Planting', icon: 'fa-tree', color: '#8BC34A' },
    { id: 'cleanup', label: 'Cleanup', icon: 'fa-broom', color: '#00BCD4' },
    { id: 'education', label: 'Education', icon: 'fa-graduation-cap', color: '#FF9800' },
    { id: 'conservation', label: 'Conservation', icon: 'fa-leaf', color: '#4CAF50' },
    { id: 'energy', label: 'Energy Saving', icon: 'fa-bolt', color: '#FFC107' }
  ];

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

  // Load all challenges
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'challenges'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const challengesData: Challenge[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Fetch creator name
        let createdByName = 'Unknown';
        if (data.createdBy) {
          try {
            const creatorDoc = await getDoc(doc(db, 'users', data.createdBy));
            if (creatorDoc.exists()) {
              createdByName = creatorDoc.data()?.displayName || creatorDoc.data()?.email || 'Unknown';
            }
          } catch (error) {
            console.error('Error fetching creator:', error);
          }
        }
        
        challengesData.push({ 
          id: docSnap.id, 
          ...data,
          createdByName 
        } as Challenge);
      }

      // Sort by date (newest first)
      challengesData.sort((a, b) => {
        const aTime = a.startDate?.seconds || 0;
        const bTime = b.startDate?.seconds || 0;
        return bTime - aTime;
      });

      setChallenges(challengesData);
    });

    return unsubscribe;
  }, [user]);

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;

    setSubmitting(true);

    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + newChallenge.duration);

      await addDoc(collection(db, 'challenges'), {
        title: newChallenge.title,
        description: newChallenge.description,
        category: newChallenge.category,
        targetActions: newChallenge.targetActions,
        duration: newChallenge.duration,
        participants: [],
        completedActions: 0,
        isActive: true,
        createdBy: user.uid,
        startDate: serverTimestamp(),
        endDate: endDate,
        createdAt: serverTimestamp()
      });

      alert('Campaign created successfully!');
      setShowCreateModal(false);
      setNewChallenge({
        title: '',
        description: '',
        category: 'recycling',
        targetActions: 10,
        duration: 7
      });
    } catch (error) {
      console.error('Error creating challenge:', error);
      alert('Failed to create campaign. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await deleteDoc(doc(db, 'challenges', challengeId));
      alert('Campaign deleted successfully!');
    } catch (error) {
      console.error('Error deleting challenge:', error);
      alert('Failed to delete campaign.');
    }
  };

  const handleToggleActive = async (challengeId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'challenges', challengeId), {
        isActive: !currentStatus
      });
    } catch (error) {
      console.error('Error updating challenge status:', error);
      alert('Failed to update campaign status.');
    }
  };

  const filteredChallenges = challenges.filter(challenge => {
    if (filterCategory !== 'all' && challenge.category !== filterCategory) return false;
    if (filterStatus === 'active' && !challenge.isActive) return false;
    if (filterStatus === 'inactive' && challenge.isActive) return false;
    if (filterStatus === 'mine' && challenge.createdBy !== user?.uid) return false;
    return true;
  });

  const stats = {
    total: challenges.length,
    active: challenges.filter(c => c.isActive).length,
    myOwn: challenges.filter(c => c.createdBy === user?.uid).length,
    totalParticipants: challenges.reduce((sum, c) => sum + (c.participants?.length || 0), 0)
  };

  if (isLoading || loading) {
    return (
      <div className={styles.container}>
        <NGOHeader />
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading campaigns...</p>
        </div>
      </div>
    );
  }

  if (!user || userRole !== 'ngo') {
    return null;
  }

  return (
    <div className={styles.container}>
      <NGOHeader />
      
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1>🎯 Campaign Management</h1>
            <p>Create and manage environmental campaigns for citizens</p>
          </div>
          <button 
            className={styles.createButton}
            onClick={() => setShowCreateModal(true)}
          >
            <i className="fas fa-plus"></i>
            Create Campaign
          </button>
        </div>

        {/* Stats Overview */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
              <i className="fas fa-bullhorn"></i>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.total}</span>
              <span className={styles.statLabel}>Total Campaigns</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #48bb78, #38a169)' }}>
              <i className="fas fa-check-circle"></i>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.active}</span>
              <span className={styles.statLabel}>Active Campaigns</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #4299e1, #3182ce)' }}>
              <i className="fas fa-user-shield"></i>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.myOwn}</span>
              <span className={styles.statLabel}>My Campaigns</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #ed8936, #dd6b20)' }}>
              <i className="fas fa-users"></i>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.totalParticipants}</span>
              <span className={styles.statLabel}>Total Participants</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Category:</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="mine">My Campaigns</option>
            </select>
          </div>
        </div>

        {/* Campaigns List */}
        <div className={styles.campaignsGrid}>
          {filteredChallenges.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fas fa-bullhorn"></i>
              <h3>No campaigns found</h3>
              <p>Create your first campaign to engage citizens in environmental actions!</p>
              <button 
                className={styles.createButton}
                onClick={() => setShowCreateModal(true)}
              >
                <i className="fas fa-plus"></i>
                Create Campaign
              </button>
            </div>
          ) : (
            filteredChallenges.map(challenge => {
              const category = categories.find(c => c.id === challenge.category);
              const isOwner = challenge.createdBy === user?.uid;
              const progress = challenge.targetActions > 0 
                ? Math.min((challenge.completedActions || 0) / challenge.targetActions * 100, 100)
                : 0;

              return (
                <div key={challenge.id} className={styles.campaignCard}>
                  <div className={styles.campaignHeader}>
                    <div className={styles.categoryBadge} style={{ borderColor: category?.color }}>
                      <i className={`fas ${category?.icon}`} style={{ color: category?.color }}></i>
                      {category?.label}
                    </div>
                    <div className={styles.statusBadge} data-active={challenge.isActive}>
                      {challenge.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  <h3>{challenge.title}</h3>
                  <p className={styles.description}>{challenge.description}</p>

                  <div className={styles.campaignStats}>
                    <div className={styles.statItem}>
                      <i className="fas fa-users"></i>
                      <span>{challenge.participants?.length || 0} participants</span>
                    </div>
                    <div className={styles.statItem}>
                      <i className="fas fa-bullseye"></i>
                      <span>{challenge.targetActions} target actions</span>
                    </div>
                    <div className={styles.statItem}>
                      <i className="fas fa-calendar"></i>
                      <span>{challenge.duration} days</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className={styles.progressSection}>
                    <div className={styles.progressLabel}>
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill}
                        style={{ width: `${progress}%`, backgroundColor: category?.color }}
                      ></div>
                    </div>
                  </div>

                  <div className={styles.campaignFooter}>
                    <span className={styles.creatorInfo}>
                      <i className="fas fa-user"></i>
                      {isOwner ? 'You' : challenge.createdByName}
                    </span>
                    
                    {isOwner && (
                      <div className={styles.actions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleToggleActive(challenge.id, challenge.isActive)}
                          title={challenge.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <i className={`fas ${challenge.isActive ? 'fa-pause' : 'fa-play'}`}></i>
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteChallenge(challenge.id)}
                          title="Delete"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <i className="fas fa-bullhorn"></i>
                Create New Campaign
              </h2>
              <button onClick={() => setShowCreateModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCreateChallenge} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Campaign Title *</label>
                <input
                  type="text"
                  value={newChallenge.title}
                  onChange={(e) => setNewChallenge({...newChallenge, title: e.target.value})}
                  placeholder="e.g., 30-Day Plastic-Free Challenge"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description *</label>
                <textarea
                  value={newChallenge.description}
                  onChange={(e) => setNewChallenge({...newChallenge, description: e.target.value})}
                  placeholder="Describe the campaign goals and activities..."
                  rows={4}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Category *</label>
                  <select
                    value={newChallenge.category}
                    onChange={(e) => setNewChallenge({...newChallenge, category: e.target.value})}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Duration (days) *</label>
                  <input
                    type="number"
                    value={newChallenge.duration}
                    onChange={(e) => setNewChallenge({...newChallenge, duration: parseInt(e.target.value)})}
                    min="1"
                    max="90"
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Target Actions *</label>
                <input
                  type="number"
                  value={newChallenge.targetActions}
                  onChange={(e) => setNewChallenge({...newChallenge, targetActions: parseInt(e.target.value)})}
                  min="1"
                  placeholder="Number of actions to complete"
                  required
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={styles.cancelButton}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      Create Campaign
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
