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
  updateDoc,
  serverTimestamp,
  getDocs 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PartnerHeader from '@/components/PartnerHeader';
import styles from './private-partner.module.css';

interface SponsoredChallenge {
  id: string;
  title: string;
  description?: string;
  category: string;
  sponsorId: string;
  sponsorName: string;
  fundingAmount: number;
  participants: string[];
  startDate: any;
  endDate: any;
  isActive: boolean;
  brandImpressions: number;
  targetActions?: number;
  rewards?: string;
}

interface WasteCollectionService {
  id: string;
  providerId: string;
  providerName: string;
  wasteTypes: string[];
  serviceArea: string;
  contactNumber: string;
  pickupSchedule: string;
  pricing: string;
  isActive: boolean;
  totalCollections: number;
  description?: string;
}

export default function PrivatePartnerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Sponsored challenges
  const [sponsoredChallenges, setSponsoredChallenges] = useState<SponsoredChallenge[]>([]);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [totalInvestment, setTotalInvestment] = useState(0);
  
  // Waste collection services
  const [wasteServices, setWasteServices] = useState<WasteCollectionService[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [totalCollections, setTotalCollections] = useState(0);
  
  // Edit states
  const [editingChallenge, setEditingChallenge] = useState<SponsoredChallenge | null>(null);
  const [editingService, setEditingService] = useState<WasteCollectionService | null>(null);
  
  // Form states
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    category: 'plastic-reduction',
    fundingAmount: '',
    startDate: '',
    endDate: '',
    targetActions: '',
    rewards: ''
  });
  
  const [serviceForm, setServiceForm] = useState({
    wasteTypes: [] as string[],
    serviceArea: '',
    contactNumber: '',
    pickupSchedule: '',
    pricing: '',
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

  // Load sponsored challenges
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'challenges'),
      where('sponsorId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const challenges: SponsoredChallenge[] = [];
      let impressions = 0;
      let investment = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        challenges.push({ ...data, id: doc.id } as SponsoredChallenge);
        impressions += data.brandImpressions || 0;
        investment += data.fundingAmount || 0;
      });

      setSponsoredChallenges(challenges);
      setTotalImpressions(impressions);
      setTotalInvestment(investment);
    });

    return unsubscribe;
  }, [user]);

  // Load waste collection services
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'wasteCollectionServices'),
      where('providerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const services: WasteCollectionService[] = [];
      let collections = 0;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Count total collections for this service
        const collectionsQuery = query(
          collection(db, 'wasteCollectionRequests'),
          where('serviceId', '==', docSnap.id),
          where('status', '==', 'completed')
        );
        const collectionsSnapshot = await getDocs(collectionsQuery);
        const serviceCollections = collectionsSnapshot.size;
        
        services.push({ 
          ...data,
          id: docSnap.id, 
          totalCollections: serviceCollections
        } as WasteCollectionService);
        collections += serviceCollections;
      }

      setWasteServices(services);
      setTotalCollections(collections);
    });

    return unsubscribe;
  }, [user]);

  // Create sponsored challenge
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const companyName = userDoc.data()?.companyName || user.displayName || 'Partner Company';

      if (editingChallenge) {
        // Update existing challenge
        await updateDoc(doc(db, 'challenges', editingChallenge.id), {
          title: `${challengeForm.title} (Sponsored by ${companyName})`,
          description: challengeForm.description,
          category: challengeForm.category,
          startDate: new Date(challengeForm.startDate),
          endDate: new Date(challengeForm.endDate),
          targetActions: parseInt(challengeForm.targetActions),
          fundingAmount: parseFloat(challengeForm.fundingAmount),
          rewards: challengeForm.rewards,
          updatedAt: serverTimestamp()
        });
        alert('✅ Challenge updated successfully!');
      } else {
        // Create new challenge
        await addDoc(collection(db, 'challenges'), {
          title: `${challengeForm.title} (Sponsored by ${companyName})`,
          description: challengeForm.description,
          category: challengeForm.category,
          startDate: new Date(challengeForm.startDate),
          endDate: new Date(challengeForm.endDate),
          targetActions: parseInt(challengeForm.targetActions),
          participants: [],
          isActive: true,
          sponsorId: user.uid,
          sponsorName: companyName,
          fundingAmount: parseFloat(challengeForm.fundingAmount),
          rewards: challengeForm.rewards,
          brandImpressions: 0,
          badge: {
            name: `${challengeForm.title} Champion`,
            icon: 'fas fa-trophy',
            color: '#FFD700'
          },
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          sponsored: true
        });
        alert('✅ Sponsored challenge created successfully!');
      }

      setChallengeForm({
        title: '',
        description: '',
        category: 'plastic-reduction',
        fundingAmount: '',
        startDate: '',
        endDate: '',
        targetActions: '',
        rewards: ''
      });
      setEditingChallenge(null);
      setShowSponsorModal(false);
    } catch (error) {
      console.error('Error saving challenge:', error);
      alert('Failed to save challenge. Please try again.');
    }
  };

  // Edit challenge
  const handleEditChallenge = (challenge: SponsoredChallenge) => {
    // Remove sponsor suffix from title for editing
    const titleWithoutSuffix = challenge.title.replace(/ \(Sponsored by .*\)$/, '');
    
    setChallengeForm({
      title: titleWithoutSuffix,
      description: challenge.description || '',
      category: challenge.category,
      fundingAmount: challenge.fundingAmount?.toString() || '',
      startDate: challenge.startDate ? new Date(challenge.startDate.seconds * 1000).toISOString().split('T')[0] : '',
      endDate: challenge.endDate ? new Date(challenge.endDate.seconds * 1000).toISOString().split('T')[0] : '',
      targetActions: challenge.targetActions?.toString() || '',
      rewards: (challenge as any).rewards || ''
    });
    setEditingChallenge(challenge);
    setShowSponsorModal(true);
  };

  // Delete challenge
  const handleDeleteChallenge = async (challengeId: string) => {
    if (!confirm('Are you sure you want to delete this challenge? This action cannot be undone.')) {
      return;
    }

    try {
      await updateDoc(doc(db, 'challenges', challengeId), {
        isActive: false,
        deletedAt: serverTimestamp()
      });
      alert('✅ Challenge deleted successfully!');
    } catch (error) {
      console.error('Error deleting challenge:', error);
      alert('Failed to delete challenge. Please try again.');
    }
  };

  // Create waste collection service
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const companyName = userDoc.data()?.companyName || user.displayName || 'Partner Company';

      if (editingService) {
        // Update existing service
        await updateDoc(doc(db, 'wasteCollectionServices', editingService.id), {
          wasteTypes: serviceForm.wasteTypes,
          serviceArea: serviceForm.serviceArea,
          contactNumber: serviceForm.contactNumber,
          pickupSchedule: serviceForm.pickupSchedule,
          pricing: serviceForm.pricing,
          description: serviceForm.description,
          updatedAt: serverTimestamp()
        });
        alert('✅ Service updated successfully!');
      } else {
        // Create new service
        await addDoc(collection(db, 'wasteCollectionServices'), {
          providerId: user.uid,
          providerName: companyName,
          wasteTypes: serviceForm.wasteTypes,
          serviceArea: serviceForm.serviceArea,
          contactNumber: serviceForm.contactNumber,
          pickupSchedule: serviceForm.pickupSchedule,
          pricing: serviceForm.pricing,
          description: serviceForm.description,
          isActive: true,
          totalCollections: 0,
          createdAt: serverTimestamp()
        });
        alert('✅ Waste collection service created successfully!');
      }

      setServiceForm({
        wasteTypes: [],
        serviceArea: '',
        contactNumber: '',
        pickupSchedule: '',
        pricing: '',
        description: ''
      });
      setEditingService(null);
      setShowServiceModal(false);
    } catch (error) {
      console.error('Error saving service:', error);
      alert('Failed to save service. Please try again.');
    }
  };

  // Edit service
  const handleEditService = (service: WasteCollectionService) => {
    setServiceForm({
      wasteTypes: service.wasteTypes || [],
      serviceArea: service.serviceArea || '',
      contactNumber: service.contactNumber || '',
      pickupSchedule: service.pickupSchedule || '',
      pricing: service.pricing || '',
      description: service.description || ''
    });
    setEditingService(service);
    setShowServiceModal(true);
  };

  // Delete service
  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }

    try {
      await updateDoc(doc(db, 'wasteCollectionServices', serviceId), {
        isActive: false,
        deletedAt: serverTimestamp()
      });
      alert('✅ Service deleted successfully!');
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service. Please try again.');
    }
  };

  const handleWasteTypeToggle = (type: string) => {
    setServiceForm(prev => ({
      ...prev,
      wasteTypes: prev.wasteTypes.includes(type)
        ? prev.wasteTypes.filter(t => t !== type)
        : [...prev.wasteTypes, type]
    }));
  };

  if (loading || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || userRole !== 'private-partner') {
    return null;
  }

  return (
    <>
      <PartnerHeader />
      <main className={styles.container}>
        <div className={styles.hero}>
          <h1 className={styles.title}>🤝 Private Sector Partner Portal</h1>
          <p className={styles.subtitle}>
            Drive sustainable business value through corporate social responsibility and data-driven environmental impact
          </p>
        </div>

        <div className={styles.dashboard}>
          {/* Sponsorship Management */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-handshake"></i>
                Sponsorship Management
              </h2>
            </div>
            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-trophy"></i>
                </div>
                <h3>Sponsor Challenge</h3>
                <p>Fund environmental challenges with your brand</p>
                <button 
                  className={styles.primaryButton}
                  onClick={() => setShowSponsorModal(true)}
                >
                  Create Sponsorship
                </button>
              </div>

              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-chart-bar"></i>
                </div>
                <h3>Active Sponsorships</h3>
                <p>Monitor your current campaign investments</p>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{sponsoredChallenges.length}</span>
                  <span className={styles.statLabel}>Active</span>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-eye"></i>
                </div>
                <h3>Brand Impressions</h3>
                <p>Total views of your sponsored content</p>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{(totalImpressions / 1000).toFixed(1)}K</span>
                  <span className={styles.statLabel}>Views</span>
                </div>
              </div>
            </div>

            {/* Sponsored Challenges List */}
            {sponsoredChallenges.length > 0 && (
              <div className={styles.challengesList}>
                <h3>Your Sponsored Challenges</h3>
                {sponsoredChallenges.map((challenge) => (
                  <div key={challenge.id} className={styles.challengeCard}>
                    <div className={styles.challengeHeader}>
                      <h4>{challenge.title}</h4>
                      <div className={styles.cardActions}>
                        <span className={styles.fundingBadge}>
                          ₱{challenge.fundingAmount.toLocaleString()}
                        </span>
                        <button 
                          className={styles.editButton}
                          onClick={() => handleEditChallenge(challenge)}
                          title="Edit Challenge"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className={styles.deleteButton}
                          onClick={() => handleDeleteChallenge(challenge.id)}
                          title="Delete Challenge"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                    <div className={styles.challengeStats}>
                      <span>
                        <i className="fas fa-users"></i>
                        {challenge.participants?.length || 0} participants
                      </span>
                      <span>
                        <i className="fas fa-eye"></i>
                        {challenge.brandImpressions || 0} impressions
                      </span>
                      <span>
                        <i className="fas fa-tag"></i>
                        {challenge.category}
                      </span>
                    </div>
                    <Link href="/community-hub" className={styles.viewButton}>
                      View in Community Hub
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Product & Services */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-store"></i>
                Product & Services Promotion
              </h2>
            </div>
            <div className={styles.grid}>
              <div className={styles.card}>
                <h3>List Eco-Product</h3>
                <p>Showcase sustainable products on the platform</p>
                <button className={styles.primaryButton}>Add Product</button>
              </div>

              <div className={styles.card}>
                <h3>Waste Collection Services</h3>
                <p>Offer recycling and collection services</p>
                <button 
                  className={styles.secondaryButton}
                  onClick={() => setShowServiceModal(true)}
                >
                  {wasteServices.length > 0 ? 'Manage Services' : 'Add Service'}
                </button>
              </div>

              <div className={styles.card}>
                <h3>Active Services</h3>
                <p>Currently offered services</p>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{wasteServices.length}</span>
                  <span className={styles.statLabel}>Services</span>
                </div>
              </div>
            </div>

            {/* Waste Services List */}
            {wasteServices.length > 0 && (
              <div className={styles.servicesList}>
                <h3>Your Waste Collection Services</h3>
                {wasteServices.map((service) => (
                  <div key={service.id} className={styles.serviceCard}>
                    <div className={styles.serviceHeader}>
                      <div>
                        <h4>{service.providerName}</h4>
                        <p className={styles.serviceArea}>
                          <i className="fas fa-map-marker-alt"></i>
                          {service.serviceArea}
                        </p>
                      </div>
                      <div className={styles.cardActions}>
                        <span className={styles.collectionsCount}>
                          {service.totalCollections} collections
                        </span>
                        <button 
                          className={styles.editButton}
                          onClick={() => handleEditService(service)}
                          title="Edit Service"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className={styles.deleteButton}
                          onClick={() => handleDeleteService(service.id)}
                          title="Delete Service"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                    <div className={styles.wasteTypesBadges}>
                      {service.wasteTypes.map((type, idx) => (
                        <span key={idx} className={styles.wasteTypeBadge}>
                          {type}
                        </span>
                      ))}
                    </div>
                    <div className={styles.serviceInfo}>
                      <span>
                        <i className="fas fa-calendar"></i>
                        {service.pickupSchedule}
                      </span>
                      <span>
                        <i className="fas fa-dollar-sign"></i>
                        {service.pricing}
                      </span>
                      <span>
                        <i className="fas fa-phone"></i>
                        {service.contactNumber}
                      </span>
                    </div>
                    <Link href="/private-partner/waste-tracker" className={styles.viewButton}>
                      View in Waste Tracker
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ROI Analytics */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-analytics"></i>
                CSR Impact Analytics
              </h2>
            </div>
            <div className={styles.impactGrid}>
              <div className={styles.impactCard}>
                <div className={styles.impactIcon}>
                  <i className="fas fa-users"></i>
                </div>
                <div className={styles.impactContent}>
                  <h4>Community Reach</h4>
                  <p className={styles.impactValue}>28,450</p>
                  <p className={styles.impactTrend}>
                    <i className="fas fa-arrow-up"></i> +18% this quarter
                  </p>
                </div>
              </div>

              <div className={styles.impactCard}>
                <div className={styles.impactIcon}>
                  <i className="fas fa-leaf"></i>
                </div>
                <div className={styles.impactContent}>
                  <h4>Environmental Impact</h4>
                  <p className={styles.impactValue}>15.8 tons</p>
                  <p className={styles.impactTrend}>
                    <i className="fas fa-arrow-up"></i> Waste diverted
                  </p>
                </div>
              </div>

              <div className={styles.impactCard}>
                <div className={styles.impactIcon}>
                  <i className="fas fa-heart"></i>
                </div>
                <div className={styles.impactContent}>
                  <h4>Brand Sentiment</h4>
                  <p className={styles.impactValue}>94%</p>
                  <p className={styles.impactTrend}>
                    <i className="fas fa-arrow-up"></i> Positive rating
                  </p>
                </div>
              </div>

              <div className={styles.impactCard}>
                <div className={styles.impactIcon}>
                  <i className="fas fa-dollar-sign"></i>
                </div>
                <div className={styles.impactContent}>
                  <h4>Total Investment</h4>
                  <p className={styles.impactValue}>₱{totalInvestment.toLocaleString()}</p>
                  <p className={styles.impactTrend}>
                    <i className="fas fa-check"></i> This year
                  </p>
                </div>
              </div>

              <div className={styles.impactCard}>
                <div className={styles.impactIcon}>
                  <i className="fas fa-recycle"></i>
                </div>
                <div className={styles.impactContent}>
                  <h4>Waste Collected</h4>
                  <p className={styles.impactValue}>{totalCollections}</p>
                  <p className={styles.impactTrend}>
                    <i className="fas fa-arrow-up"></i> Collections completed
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Data Access & Reports */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <i className="fas fa-file-alt"></i>
                Data Access & Reporting
              </h2>
            </div>
            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-download"></i>
                </div>
                <h3>Environmental Dashboard</h3>
                <p>Access real-time environmental data for insights</p>
                <button className={styles.primaryButton}>View Dashboard</button>
              </div>

              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-chart-pie"></i>
                </div>
                <h3>CSR Impact Report</h3>
                <p>Generate comprehensive CSR reports with verified data</p>
                <button className={styles.secondaryButton}>Generate Report</button>
              </div>

              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-certificate"></i>
                </div>
                <h3>Sustainability Certificate</h3>
                <p>Download verified sustainability credentials</p>
                <button className={styles.secondaryButton}>Download Certificate</button>
              </div>
            </div>
          </section>

          {/* Partnership Benefits */}
          <section className={styles.benefitsSection}>
            <h2 className={styles.sectionTitle}>
              <i className="fas fa-gift"></i>
              Partnership Benefits
            </h2>
            <div className={styles.benefitsGrid}>
              <div className={styles.benefitCard}>
                <i className="fas fa-star"></i>
                <h4>Brand Visibility</h4>
                <p>Featured placement in campaigns and community feed</p>
              </div>
              <div className={styles.benefitCard}>
                <i className="fas fa-users"></i>
                <h4>Engaged Audience</h4>
                <p>Connect with 25,000+ eco-conscious citizens</p>
              </div>
              <div className={styles.benefitCard}>
                <i className="fas fa-shield-alt"></i>
                <h4>Verified Impact</h4>
                <p>Blockchain-verified sustainability credentials</p>
              </div>
              <div className={styles.benefitCard}>
                <i className="fas fa-newspaper"></i>
                <h4>Media Coverage</h4>
                <p>Priority press releases and success stories</p>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className={styles.quickActions}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.actionGrid}>
              <button className={styles.actionButton}>
                <i className="fas fa-calendar-check"></i>
                <span>Schedule Meeting</span>
              </button>
              <button className={styles.actionButton}>
                <i className="fas fa-megaphone"></i>
                <span>Create Announcement</span>
              </button>
              <button className={styles.actionButton}>
                <i className="fas fa-file-invoice-dollar"></i>
                <span>View Invoices</span>
              </button>
              <button className={styles.actionButton}>
                <i className="fas fa-cog"></i>
                <span>Partner Settings</span>
              </button>
            </div>
          </section>
        </div>

        {/* Create Sponsored Challenge Modal */}
        {showSponsorModal && (
          <div className={styles.modalOverlay} onClick={() => {
            setShowSponsorModal(false);
            setEditingChallenge(null);
            setChallengeForm({
              title: '',
              description: '',
              category: 'plastic-reduction',
              fundingAmount: '',
              startDate: '',
              endDate: '',
              targetActions: '',
              rewards: ''
            });
          }}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>{editingChallenge ? 'Edit' : 'Create'} Sponsored Challenge</h2>
                <button className={styles.closeButton} onClick={() => {
                  setShowSponsorModal(false);
                  setEditingChallenge(null);
                  setChallengeForm({
                    title: '',
                    description: '',
                    category: 'plastic-reduction',
                    fundingAmount: '',
                    startDate: '',
                    endDate: '',
                    targetActions: '',
                    rewards: ''
                  });
                }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <form onSubmit={handleCreateChallenge}>
                <div className={styles.modalBody}>
                  <div className={styles.formGroup}>
                    <label>Challenge Title *</label>
                    <input
                      type="text"
                      value={challengeForm.title}
                      onChange={(e) => setChallengeForm({...challengeForm, title: e.target.value})}
                      placeholder="e.g., Plastic-Free July"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Description *</label>
                    <textarea
                      value={challengeForm.description}
                      onChange={(e) => setChallengeForm({...challengeForm, description: e.target.value})}
                      placeholder="Describe the challenge and goals..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Category *</label>
                      <select
                        value={challengeForm.category}
                        onChange={(e) => setChallengeForm({...challengeForm, category: e.target.value})}
                        required
                      >
                        <option value="plastic-reduction">Plastic Reduction</option>
                        <option value="food-waste">Food Waste</option>
                        <option value="energy-saving">Energy Saving</option>
                        <option value="recycling">Recycling</option>
                        <option value="water-conservation">Water Conservation</option>
                        <option value="transportation">Green Transportation</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Funding Amount (₱) *</label>
                      <input
                        type="number"
                        value={challengeForm.fundingAmount}
                        onChange={(e) => setChallengeForm({...challengeForm, fundingAmount: e.target.value})}
                        placeholder="10000"
                        min="1000"
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Start Date *</label>
                      <input
                        type="date"
                        value={challengeForm.startDate}
                        onChange={(e) => setChallengeForm({...challengeForm, startDate: e.target.value})}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>End Date *</label>
                      <input
                        type="date"
                        value={challengeForm.endDate}
                        onChange={(e) => setChallengeForm({...challengeForm, endDate: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Target Actions *</label>
                    <input
                      type="number"
                      value={challengeForm.targetActions}
                      onChange={(e) => setChallengeForm({...challengeForm, targetActions: e.target.value})}
                      placeholder="100"
                      min="1"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Rewards/Incentives</label>
                    <textarea
                      value={challengeForm.rewards}
                      onChange={(e) => setChallengeForm({...challengeForm, rewards: e.target.value})}
                      placeholder="Describe rewards for participants..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" className={styles.cancelButton} onClick={() => {
                    setShowSponsorModal(false);
                    setEditingChallenge(null);
                    setChallengeForm({
                      title: '',
                      description: '',
                      category: 'plastic-reduction',
                      fundingAmount: '',
                      startDate: '',
                      endDate: '',
                      targetActions: '',
                      rewards: ''
                    });
                  }}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitButton}>
                    {editingChallenge ? 'Update' : 'Create'} Sponsored Challenge
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Waste Collection Service Modal */}
        {showServiceModal && (
          <div className={styles.modalOverlay} onClick={() => {
            setShowServiceModal(false);
            setEditingService(null);
            setServiceForm({
              wasteTypes: [],
              serviceArea: '',
              contactNumber: '',
              pickupSchedule: '',
              pricing: '',
              description: ''
            });
          }}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>{editingService ? 'Edit' : 'Create'} Waste Collection Service</h2>
                <button className={styles.closeButton} onClick={() => {
                  setShowServiceModal(false);
                  setEditingService(null);
                  setServiceForm({
                    wasteTypes: [],
                    serviceArea: '',
                    contactNumber: '',
                    pickupSchedule: '',
                    pricing: '',
                    description: ''
                  });
                }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <form onSubmit={handleCreateService}>
                <div className={styles.modalBody}>
                  <div className={styles.formGroup}>
                    <label>Waste Types Accepted *</label>
                    <div className={styles.checkboxGrid}>
                      {['Plastic', 'Paper', 'Glass', 'Metal', 'Organic', 'Electronics'].map((type) => (
                        <label key={type} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={serviceForm.wasteTypes.includes(type)}
                            onChange={() => handleWasteTypeToggle(type)}
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Service Area *</label>
                    <input
                      type="text"
                      value={serviceForm.serviceArea}
                      onChange={(e) => setServiceForm({...serviceForm, serviceArea: e.target.value})}
                      placeholder="e.g., Quezon City, Metro Manila"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Contact Number *</label>
                    <input
                      type="tel"
                      value={serviceForm.contactNumber}
                      onChange={(e) => setServiceForm({...serviceForm, contactNumber: e.target.value})}
                      placeholder="+63 XXX XXX XXXX"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Pickup Schedule *</label>
                    <input
                      type="text"
                      value={serviceForm.pickupSchedule}
                      onChange={(e) => setServiceForm({...serviceForm, pickupSchedule: e.target.value})}
                      placeholder="e.g., Monday, Wednesday, Friday (9AM - 5PM)"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Pricing *</label>
                    <input
                      type="text"
                      value={serviceForm.pricing}
                      onChange={(e) => setServiceForm({...serviceForm, pricing: e.target.value})}
                      placeholder="e.g., ₱200 per collection or Free for 5kg+"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Service Description</label>
                    <textarea
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                      placeholder="Additional details about your service..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" className={styles.cancelButton} onClick={() => {
                    setShowServiceModal(false);
                    setEditingService(null);
                    setServiceForm({
                      wasteTypes: [],
                      serviceArea: '',
                      contactNumber: '',
                      pickupSchedule: '',
                      pricing: '',
                      description: ''
                    });
                  }}>
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={serviceForm.wasteTypes.length === 0}
                  >
                    {editingService ? 'Update' : 'Create'} Service
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
