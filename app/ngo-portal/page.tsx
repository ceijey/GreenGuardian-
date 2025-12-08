'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
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
  description?: string;
  completionInstructions?: string;
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
    completionInstructions: '',
    category: 'recycling',
    targetActions: 10,
    duration: 7
  });
  
  // Fundraising & Awareness States
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showGenerateReportModal, setShowGenerateReportModal] = useState(false);
  const [showPartnersModal, setShowPartnersModal] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    imageUrl: '',
    impactMetrics: {
      co2Saved: 0,
      treesPlanted: 0,
      volunteersEngaged: 0
    }
  });
  const [reportGenerating, setReportGenerating] = useState(false);
  
  // Quick Actions States
  const [showScheduleEventModal, setShowScheduleEventModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    maxVolunteers: 20
  });
  const [announcement, setAnnouncement] = useState({
    title: '',
    message: '',
    priority: 'normal'
  });
  const [ngoSettings, setNgoSettings] = useState({
    organizationName: '',
    contactEmail: '',
    website: '',
    description: ''
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
        completionInstructions: newChallenge.completionInstructions,
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
        completionInstructions: '',
        category: 'recycling',
        targetActions: 10,
        duration: 7
      });
      setShowCreateChallengeModal(false);
      toast.success('Challenge created successfully! It will appear in the Community Hub.');
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error('Failed to create challenge');
    }
  };

  // Create Success Story Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'successStories'), {
        title: newPost.title,
        content: newPost.content,
        imageUrl: newPost.imageUrl,
        impactMetrics: newPost.impactMetrics,
        createdBy: user.uid,
        createdByEmail: user.email,
        createdByName: user.displayName || 'NGO Partner',
        createdAt: serverTimestamp(),
        likes: 0,
        comments: []
      });

      setNewPost({
        title: '',
        content: '',
        imageUrl: '',
        impactMetrics: {
          co2Saved: 0,
          treesPlanted: 0,
          volunteersEngaged: 0
        }
      });
      setShowCreatePostModal(false);
      toast.success('Success story posted! It will appear in the community feed.');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  };

  // Generate Donor Report
  const handleGenerateReport = async () => {
    if (!user) return;
    setReportGenerating(true);

    try {
      // Gather all impact data
      const reportData = {
        organizationName: user.displayName || 'NGO Partner',
        generatedAt: new Date().toISOString(),
        totalChallenges: challenges.length,
        activeChallenges: challenges.filter(c => c.isActive).length,
        totalParticipants,
        totalVolunteerHours,
        impactMetrics: {
          co2Saved: '8.3 tons',
          treesPlanted: 450,
          communityReach: 5200
        },
        challengeBreakdown: challenges.map(c => ({
          title: c.title,
          participants: c.participants.length,
          category: c.category
        }))
      };

      // Create downloadable JSON report
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `impact-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Store report in Firestore
      await addDoc(collection(db, 'donorReports'), {
        ...reportData,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      setShowGenerateReportModal(false);
      toast.success('Report generated successfully! Check your downloads folder.');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setReportGenerating(false);
    }
  };

  // Schedule Event Handler
  const handleScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'volunteerEvents'), {
        title: newEvent.title,
        description: newEvent.description,
        date: new Date(newEvent.date + 'T' + newEvent.time),
        location: newEvent.location,
        maxVolunteers: newEvent.maxVolunteers,
        volunteers: [],
        type: 'ngo-event',
        organizer: {
          id: user.uid,
          name: user.displayName || 'NGO Partner',
          email: user.email || ''
        },
        createdAt: serverTimestamp()
      });

      setNewEvent({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        maxVolunteers: 20
      });
      setShowScheduleEventModal(false);
      toast.success('Event scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling event:', error);
      toast.error('Failed to schedule event');
    }
  };

  // Send Announcement Handler
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'announcements'), {
        title: announcement.title,
        message: announcement.message,
        priority: announcement.priority,
        sender: {
          id: user.uid,
          name: user.displayName || 'NGO Partner',
          email: user.email || ''
        },
        createdAt: serverTimestamp(),
        read: false
      });

      setAnnouncement({
        title: '',
        message: '',
        priority: 'normal'
      });
      setShowAnnouncementModal(false);
      toast.success('Announcement sent successfully!');
    } catch (error) {
      console.error('Error sending announcement:', error);
      toast.error('Failed to send announcement');
    }
  };

  // Export Data Handler
  const handleExportData = async () => {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        challenges: challenges.map(c => ({
          title: c.title,
          category: c.category,
          participants: c.participants.length,
          targetActions: c.targetActions,
          isActive: c.isActive
        })),
        events: events.map(e => ({
          title: e.title,
          volunteers: e.volunteers.length,
          date: e.date
        })),
        summary: {
          totalChallenges: challenges.length,
          totalParticipants,
          totalVolunteerHours
        }
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ngo-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  // Save NGO Settings Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await addDoc(collection(db, 'ngoSettings'), {
        userId: user.uid,
        organizationName: ngoSettings.organizationName,
        contactEmail: ngoSettings.contactEmail,
        website: ngoSettings.website,
        description: ngoSettings.description,
        updatedAt: serverTimestamp()
      });

      setShowSettingsModal(false);
      toast.success('Great job! Your completion has been recorded.');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
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
                <button 
                  className={styles.primaryButton}
                  onClick={() => setShowCreatePostModal(true)}
                >
                  Create Post
                </button>
              </div>

              <div className={styles.card}>
                <h3>Generate Donor Reports</h3>
                <p>Export verified impact data for stakeholders</p>
                <button 
                  className={styles.secondaryButton}
                  onClick={() => setShowGenerateReportModal(true)}
                >
                  Generate Report
                </button>
              </div>

              <div className={styles.card}>
                <h3>Partner Products</h3>
                <p>Promote eco-friendly products and services</p>
                <button 
                  className={styles.secondaryButton}
                  onClick={() => setShowPartnersModal(true)}
                >
                  View Partners
                </button>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className={styles.quickActions}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.actionGrid}>
              <button 
                className={styles.actionButton}
                onClick={() => setShowScheduleEventModal(true)}
              >
                <i className="fas fa-calendar-alt"></i>
                <span>Schedule Event</span>
              </button>
              <button 
                className={styles.actionButton}
                onClick={() => setShowAnnouncementModal(true)}
              >
                <i className="fas fa-megaphone"></i>
                <span>Send Announcement</span>
              </button>
              <button 
                className={styles.actionButton}
                onClick={handleExportData}
              >
                <i className="fas fa-file-download"></i>
                <span>Export Data</span>
              </button>
              <button 
                className={styles.actionButton}
                onClick={() => setShowSettingsModal(true)}
              >
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

                <div className={styles.formGroup}>
                  <label>
                    <i className="fas fa-check-circle"></i> How to Complete This Challenge
                  </label>
                  <textarea
                    value={newChallenge.completionInstructions}
                    onChange={(e) => setNewChallenge({...newChallenge, completionInstructions: e.target.value})}
                    required
                    placeholder="Provide step-by-step instructions on how participants can complete this challenge...&#10;&#10;Example:&#10;1. Track your plastic usage for one week&#10;2. Identify areas where you can reduce plastic&#10;3. Switch to reusable alternatives&#10;4. Log your daily progress in the app&#10;5. Share your results with the community"
                    rows={6}
                    className={styles.instructionsTextarea}
                  />
                  <small className={styles.fieldHint}>
                    <i className="fas fa-info-circle"></i> Clear instructions help participants understand exactly what they need to do to complete the challenge and earn rewards.
                  </small>
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

        {/* Create Post Modal */}
        {showCreatePostModal && (
          <div className={styles.modal} onClick={() => setShowCreatePostModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>
                  <i className="fas fa-newspaper"></i> Share Success Story
                </h2>
                <button 
                  onClick={() => setShowCreatePostModal(false)} 
                  className={styles.closeBtn}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePost} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Story Title</label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                    required
                    placeholder="e.g., 500 Trees Planted in Local Community"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Story Content</label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    required
                    placeholder="Share the details of your environmental success story..."
                    rows={6}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Image URL (optional)</label>
                  <input
                    type="url"
                    value={newPost.imageUrl}
                    onChange={(e) => setNewPost({...newPost, imageUrl: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                  />
                  <small className={styles.fieldHint}>
                    <i className="fas fa-info-circle"></i> Add a photo URL to make your story more engaging
                  </small>
                </div>

                <div className={styles.formGroup}>
                  <label>Impact Metrics</label>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>CO₂ Saved (kg)</label>
                      <input
                        type="number"
                        min="0"
                        value={newPost.impactMetrics.co2Saved || ''}
                        onChange={(e) => setNewPost({
                          ...newPost, 
                          impactMetrics: {...newPost.impactMetrics, co2Saved: parseFloat(e.target.value) || 0}
                        })}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Trees Planted</label>
                      <input
                        type="number"
                        min="0"
                        value={newPost.impactMetrics.treesPlanted || ''}
                        onChange={(e) => setNewPost({
                          ...newPost, 
                          impactMetrics: {...newPost.impactMetrics, treesPlanted: parseInt(e.target.value) || 0}
                        })}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Volunteers Engaged</label>
                      <input
                        type="number"
                        min="0"
                        value={newPost.impactMetrics.volunteersEngaged || ''}
                        onChange={(e) => setNewPost({
                          ...newPost, 
                          impactMetrics: {...newPost.impactMetrics, volunteersEngaged: parseInt(e.target.value) || 0}
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    onClick={() => setShowCreatePostModal(false)}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    <i className="fas fa-share"></i> Publish Story
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Generate Report Modal */}
        {showGenerateReportModal && (
          <div className={styles.modal} onClick={() => setShowGenerateReportModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>
                  <i className="fas fa-file-export"></i> Generate Donor Report
                </h2>
                <button 
                  onClick={() => setShowGenerateReportModal(false)} 
                  className={styles.closeBtn}
                >
                  ✕
                </button>
              </div>

              <div className={styles.form}>
                <div className={styles.reportPreview}>
                  <h3>Report Summary</h3>
                  <div className={styles.reportStats}>
                    <div className={styles.reportStat}>
                      <i className="fas fa-trophy"></i>
                      <div>
                        <strong>Total Challenges</strong>
                        <p>{challenges.length}</p>
                      </div>
                    </div>
                    <div className={styles.reportStat}>
                      <i className="fas fa-users"></i>
                      <div>
                        <strong>Total Participants</strong>
                        <p>{totalParticipants}</p>
                      </div>
                    </div>
                    <div className={styles.reportStat}>
                      <i className="fas fa-clock"></i>
                      <div>
                        <strong>Volunteer Hours</strong>
                        <p>{totalVolunteerHours}</p>
                      </div>
                    </div>
                    <div className={styles.reportStat}>
                      <i className="fas fa-leaf"></i>
                      <div>
                        <strong>CO₂ Saved</strong>
                        <p>8.3 tons</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.reportInfo}>
                    <i className="fas fa-info-circle"></i>
                    <p>This report will include all impact data, challenge statistics, and volunteer engagement metrics. The report will be downloaded as a JSON file that can be shared with stakeholders.</p>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    onClick={() => setShowGenerateReportModal(false)}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleGenerateReport}
                    className={styles.submitBtn}
                    disabled={reportGenerating}
                  >
                    {reportGenerating ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Generating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-download"></i> Download Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Partners Modal */}
        {showPartnersModal && (
          <div className={styles.modal} onClick={() => setShowPartnersModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>
                  <i className="fas fa-handshake"></i> Partner Products & Services
                </h2>
                <button 
                  onClick={() => setShowPartnersModal(false)} 
                  className={styles.closeBtn}
                >
                  ✕
                </button>
              </div>

              <div className={styles.form}>
                <div className={styles.partnersGrid}>
                  <div className={styles.partnerCard}>
                    <div className={styles.partnerIcon}>
                      <i className="fas fa-shopping-bag"></i>
                    </div>
                    <h4>EcoMart Philippines</h4>
                    <p>Sustainable products and zero-waste supplies</p>
                    <div className={styles.partnerTags}>
                      <span>Retail</span>
                      <span>Zero Waste</span>
                    </div>
                    <a href="#" className={styles.partnerLink}>
                      Visit Partner <i className="fas fa-external-link-alt"></i>
                    </a>
                  </div>

                  <div className={styles.partnerCard}>
                    <div className={styles.partnerIcon}>
                      <i className="fas fa-recycle"></i>
                    </div>
                    <h4>Green Solutions Inc</h4>
                    <p>Recycling services and waste management</p>
                    <div className={styles.partnerTags}>
                      <span>Recycling</span>
                      <span>Services</span>
                    </div>
                    <a href="#" className={styles.partnerLink}>
                      Visit Partner <i className="fas fa-external-link-alt"></i>
                    </a>
                  </div>

                  <div className={styles.partnerCard}>
                    <div className={styles.partnerIcon}>
                      <i className="fas fa-solar-panel"></i>
                    </div>
                    <h4>Solar Energy PH</h4>
                    <p>Renewable energy solutions for communities</p>
                    <div className={styles.partnerTags}>
                      <span>Energy</span>
                      <span>Solar</span>
                    </div>
                    <a href="#" className={styles.partnerLink}>
                      Visit Partner <i className="fas fa-external-link-alt"></i>
                    </a>
                  </div>

                  <div className={styles.partnerCard}>
                    <div className={styles.partnerIcon}>
                      <i className="fas fa-leaf"></i>
                    </div>
                    <h4>Organic Farms Co-op</h4>
                    <p>Local organic produce and sustainable farming</p>
                    <div className={styles.partnerTags}>
                      <span>Agriculture</span>
                      <span>Organic</span>
                    </div>
                    <a href="#" className={styles.partnerLink}>
                      Visit Partner <i className="fas fa-external-link-alt"></i>
                    </a>
                  </div>

                  <div className={styles.partnerCard}>
                    <div className={styles.partnerIcon}>
                      <i className="fas fa-tshirt"></i>
                    </div>
                    <h4>EcoWear Fashion</h4>
                    <p>Sustainable clothing and accessories</p>
                    <div className={styles.partnerTags}>
                      <span>Fashion</span>
                      <span>Sustainable</span>
                    </div>
                    <a href="#" className={styles.partnerLink}>
                      Visit Partner <i className="fas fa-external-link-alt"></i>
                    </a>
                  </div>

                  <div className={styles.partnerCard}>
                    <div className={styles.partnerIcon}>
                      <i className="fas fa-seedling"></i>
                    </div>
                    <h4>TreeLife Foundation</h4>
                    <p>Tree planting programs and reforestation</p>
                    <div className={styles.partnerTags}>
                      <span>Reforestation</span>
                      <span>NGO</span>
                    </div>
                    <a href="#" className={styles.partnerLink}>
                      Visit Partner <i className="fas fa-external-link-alt"></i>
                    </a>
                  </div>
                </div>

                <div className={styles.partnerInfo}>
                  <i className="fas fa-lightbulb"></i>
                  <p>Promote these eco-friendly partners to your community members and earn collaboration benefits!</p>
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    onClick={() => setShowPartnersModal(false)}
                    className={styles.submitBtn}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Event Modal */}
        {showScheduleEventModal && (
          <div className={styles.modal} onClick={() => setShowScheduleEventModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>
                  <i className="fas fa-calendar-alt"></i> Schedule Event
                </h2>
                <button 
                  onClick={() => setShowScheduleEventModal(false)} 
                  className={styles.closeBtn}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleScheduleEvent} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Event Title *</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    required
                    placeholder="e.g., Beach Cleanup Drive"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Description *</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    required
                    placeholder="Describe the event details..."
                    rows={4}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Date *</label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Time *</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Location *</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    required
                    placeholder="e.g., Rizal Park, Manila"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Max Volunteers</label>
                  <input
                    type="number"
                    value={newEvent.maxVolunteers}
                    onChange={(e) => setNewEvent({...newEvent, maxVolunteers: parseInt(e.target.value)})}
                    min="1"
                    placeholder="20"
                  />
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    onClick={() => setShowScheduleEventModal(false)}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    <i className="fas fa-calendar-check"></i> Schedule Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Send Announcement Modal */}
        {showAnnouncementModal && (
          <div className={styles.modal} onClick={() => setShowAnnouncementModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>
                  <i className="fas fa-megaphone"></i> Send Announcement
                </h2>
                <button 
                  onClick={() => setShowAnnouncementModal(false)} 
                  className={styles.closeBtn}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendAnnouncement} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Announcement Title *</label>
                  <input
                    type="text"
                    value={announcement.title}
                    onChange={(e) => setAnnouncement({...announcement, title: e.target.value})}
                    required
                    placeholder="e.g., Upcoming Community Cleanup Event"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Message *</label>
                  <textarea
                    value={announcement.message}
                    onChange={(e) => setAnnouncement({...announcement, message: e.target.value})}
                    required
                    placeholder="Write your announcement message..."
                    rows={6}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Priority</label>
                  <select
                    value={announcement.priority}
                    onChange={(e) => setAnnouncement({...announcement, priority: e.target.value})}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    onClick={() => setShowAnnouncementModal(false)}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    <i className="fas fa-paper-plane"></i> Send Announcement
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* NGO Settings Modal */}
        {showSettingsModal && (
          <div className={styles.modal} onClick={() => setShowSettingsModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>
                  <i className="fas fa-cog"></i> NGO Settings
                </h2>
                <button 
                  onClick={() => setShowSettingsModal(false)} 
                  className={styles.closeBtn}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className={styles.form}>
                <div className={styles.formGroup}>
                  <label>Organization Name</label>
                  <input
                    type="text"
                    value={ngoSettings.organizationName}
                    onChange={(e) => setNgoSettings({...ngoSettings, organizationName: e.target.value})}
                    placeholder="Your NGO Name"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Contact Email</label>
                  <input
                    type="email"
                    value={ngoSettings.contactEmail}
                    onChange={(e) => setNgoSettings({...ngoSettings, contactEmail: e.target.value})}
                    placeholder="contact@yourngo.org"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Website</label>
                  <input
                    type="url"
                    value={ngoSettings.website}
                    onChange={(e) => setNgoSettings({...ngoSettings, website: e.target.value})}
                    placeholder="https://yourngo.org"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={ngoSettings.description}
                    onChange={(e) => setNgoSettings({...ngoSettings, description: e.target.value})}
                    placeholder="Brief description of your organization..."
                    rows={4}
                  />
                </div>

                <div className={styles.formActions}>
                  <button 
                    type="button" 
                    onClick={() => setShowSettingsModal(false)}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    <i className="fas fa-save"></i> Save Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      <Toaster position="top-center" toastOptions={{
        style: { zIndex: 99999 },
        duration: 3000,
      }} />
      </main>
    </>
  );
}
