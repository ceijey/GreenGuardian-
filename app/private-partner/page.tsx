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

interface EcoProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  ecoScore: number;
  carbonFootprint: number;
  recyclable: boolean;
  biodegradable: boolean;
  sustainableMaterials: string[];
  certifications: string[];
  price?: number;
  imageUrl?: string;
  sponsorId: string;
  sponsorName?: string;
  isActive: boolean;
  createdAt: any;
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
  
  // Eco-products
  const [ecoProducts, setEcoProducts] = useState<EcoProduct[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EcoProduct | null>(null);
  
  // Data & Reporting
  const [showDashboard, setShowDashboard] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  
  // Quick Actions
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
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

  const [productForm, setProductForm] = useState({
    name: '',
    category: 'household',
    description: '',
    ecoScore: '80',
    carbonFootprint: '',
    recyclable: false,
    biodegradable: false,
    sustainableMaterials: [] as string[],
    certifications: [] as string[],
    price: '',
    imageUrl: ''
  });

  const [meetingForm, setMeetingForm] = useState({
    title: '',
    date: '',
    time: '',
    duration: '30',
    participants: '',
    agenda: '',
    meetingLink: ''
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    priority: 'normal',
    targetAudience: 'all'
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
      where('sponsorId', '==', user.uid),
      where('isActive', '==', true)
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
      where('providerId', '==', user.uid),
      where('isActive', '==', true)
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

  // Load eco-products
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'ecoProducts'),
      where('sponsorId', '==', user.uid),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const products: EcoProduct[] = [];
      snapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() } as EcoProduct);
      });
      setEcoProducts(products);
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

  // Create eco-product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const companyName = userDoc.data()?.companyName || user.displayName || 'Partner Company';

      if (editingProduct) {
        // Update existing product
        await updateDoc(doc(db, 'ecoProducts', editingProduct.id), {
          name: productForm.name,
          category: productForm.category,
          description: productForm.description,
          ecoScore: parseFloat(productForm.ecoScore),
          carbonFootprint: parseFloat(productForm.carbonFootprint),
          recyclable: productForm.recyclable,
          biodegradable: productForm.biodegradable,
          sustainableMaterials: productForm.sustainableMaterials,
          certifications: productForm.certifications,
          price: productForm.price ? parseFloat(productForm.price) : null,
          imageUrl: productForm.imageUrl,
          updatedAt: serverTimestamp()
        });
        alert('✅ Product updated successfully!');
      } else {
        // Create new product
        await addDoc(collection(db, 'ecoProducts'), {
          name: productForm.name,
          category: productForm.category,
          description: productForm.description,
          ecoScore: parseFloat(productForm.ecoScore),
          carbonFootprint: parseFloat(productForm.carbonFootprint),
          recyclable: productForm.recyclable,
          biodegradable: productForm.biodegradable,
          sustainableMaterials: productForm.sustainableMaterials,
          certifications: productForm.certifications,
          price: productForm.price ? parseFloat(productForm.price) : null,
          imageUrl: productForm.imageUrl,
          sponsorId: user.uid,
          sponsorName: companyName,
          isActive: true,
          createdAt: serverTimestamp()
        });
        alert('✅ Eco-product created successfully!');
      }

      setProductForm({
        name: '',
        category: 'household',
        description: '',
        ecoScore: '80',
        carbonFootprint: '',
        recyclable: false,
        biodegradable: false,
        sustainableMaterials: [],
        certifications: [],
        price: '',
        imageUrl: ''
      });
      setEditingProduct(null);
      setShowProductModal(false);
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please try again.');
    }
  };

  // Edit product
  const handleEditProduct = (product: EcoProduct) => {
    setProductForm({
      name: product.name,
      category: product.category,
      description: product.description,
      ecoScore: product.ecoScore.toString(),
      carbonFootprint: product.carbonFootprint.toString(),
      recyclable: product.recyclable,
      biodegradable: product.biodegradable,
      sustainableMaterials: product.sustainableMaterials || [],
      certifications: product.certifications || [],
      price: product.price?.toString() || '',
      imageUrl: product.imageUrl || ''
    });
    setEditingProduct(product);
    setShowProductModal(true);
  };

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      await updateDoc(doc(db, 'ecoProducts', productId), {
        isActive: false,
        deletedAt: serverTimestamp()
      });
      alert('✅ Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  const handleMaterialToggle = (material: string) => {
    setProductForm(prev => ({
      ...prev,
      sustainableMaterials: prev.sustainableMaterials.includes(material)
        ? prev.sustainableMaterials.filter(m => m !== material)
        : [...prev.sustainableMaterials, material]
    }));
  };

  const handleCertificationToggle = (cert: string) => {
    setProductForm(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert]
    }));
  };

  // View Environmental Dashboard
  const handleViewDashboard = () => {
    router.push('/dashboard');
  };

  // Generate CSR Report
  const handleGenerateReport = async () => {
    setShowReportModal(true);
    setGeneratingReport(true);
    setReportGenerated(false);

    // Simulate report generation
    setTimeout(() => {
      setGeneratingReport(false);
      setReportGenerated(true);
    }, 2000);
  };

  const handleDownloadReport = () => {
    if (!user) return;

    // Create report data
    const reportData = {
      companyName: user.displayName || 'Partner Company',
      generatedDate: new Date().toLocaleDateString(),
      metrics: {
        totalInvestment,
        sponsoredChallenges: sponsoredChallenges.length,
        totalImpressions,
        wasteCollected: totalCollections,
        ecoProductsListed: ecoProducts.length
      },
      challenges: sponsoredChallenges.map(c => ({
        title: c.title,
        participants: c.participants.length,
        funding: c.fundingAmount,
        impressions: c.brandImpressions
      }))
    };

    // Create and download JSON report
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CSR-Impact-Report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      setShowReportModal(false);
      setReportGenerated(false);
    }, 1000);
  };

  // Download Sustainability Certificate
  const handleDownloadCertificate = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const companyName = userDoc.data()?.companyName || user.displayName || 'Partner Company';

      // Create certificate data
      const certificateData = {
        certificateId: `CERT-${Date.now()}`,
        companyName,
        issuedDate: new Date().toLocaleDateString(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        achievements: {
          challengesSponsored: sponsoredChallenges.length,
          totalInvestment: `₱${totalInvestment.toLocaleString()}`,
          communityReach: '28,450 citizens',
          wasteCollected: `${totalCollections} collections`,
          ecoProductsPromoted: ecoProducts.length
        },
        certificationBody: 'Green Guardian Environmental Platform',
        verificationStatus: 'Blockchain Verified'
      };

      // Create and download certificate
      const blob = new Blob([JSON.stringify(certificateData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sustainability-Certificate-${companyName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('✅ Sustainability Certificate downloaded successfully!');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Failed to download certificate. Please try again.');
    }
  };

  // Schedule Meeting
  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const companyName = userDoc.data()?.companyName || user.displayName || 'Partner Company';

      await addDoc(collection(db, 'meetings'), {
        organizerId: user.uid,
        organizerName: companyName,
        title: meetingForm.title,
        date: new Date(meetingForm.date),
        time: meetingForm.time,
        duration: parseInt(meetingForm.duration),
        participants: meetingForm.participants.split(',').map(p => p.trim()),
        agenda: meetingForm.agenda,
        meetingLink: meetingForm.meetingLink,
        status: 'scheduled',
        createdAt: serverTimestamp()
      });

      alert('✅ Meeting scheduled successfully!');
      setMeetingForm({
        title: '',
        date: '',
        time: '',
        duration: '30',
        participants: '',
        agenda: '',
        meetingLink: ''
      });
      setShowMeetingModal(false);
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      alert('Failed to schedule meeting. Please try again.');
    }
  };

  // Create Announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const companyName = userDoc.data()?.companyName || user.displayName || 'Partner Company';

      await addDoc(collection(db, 'announcements'), {
        authorId: user.uid,
        authorName: companyName,
        authorType: 'private-partner',
        title: announcementForm.title,
        message: announcementForm.message,
        priority: announcementForm.priority,
        targetAudience: announcementForm.targetAudience,
        isActive: true,
        views: 0,
        createdAt: serverTimestamp()
      });

      alert('✅ Announcement created successfully!');
      setAnnouncementForm({
        title: '',
        message: '',
        priority: 'normal',
        targetAudience: 'all'
      });
      setShowAnnouncementModal(false);
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Failed to create announcement. Please try again.');
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

  if (!user || userRole !== 'private-partner') {
    return null;
  }

  return (
    <>
      <PartnerHeader />
      <main className={styles.container}>
        <div className={styles.hero}>
          <h1 className={styles.title}> Private Sector Partner Portal</h1>
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
                    <Link 
                      href={`/community-hub?challengeId=${challenge.id}`}
                      className={styles.viewButton}
                    >
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
                <button 
                  className={styles.primaryButton}
                  onClick={() => setShowProductModal(true)}
                >
                  Add Product
                </button>
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

              <div className={styles.card}>
                <h3>Listed Products</h3>
                <p>Eco-products on the platform</p>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{ecoProducts.length}</span>
                  <span className={styles.statLabel}>Products</span>
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

            {/* Eco-Products List */}
            {ecoProducts.length > 0 && (
              <div className={styles.servicesList}>
                <h3>Your Eco-Products</h3>
                {ecoProducts.map((product) => (
                  <div key={product.id} className={styles.serviceCard}>
                    <div className={styles.serviceHeader}>
                      <div>
                        <h4>{product.name}</h4>
                        <p className={styles.serviceArea}>
                          <i className="fas fa-leaf"></i>
                          {product.category}
                        </p>
                      </div>
                      <div className={styles.cardActions}>
                        <span className={styles.collectionsCount}>
                          Score: {product.ecoScore}/100
                        </span>
                        <button 
                          className={styles.editButton}
                          onClick={() => handleEditProduct(product)}
                          title="Edit Product"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className={styles.deleteButton}
                          onClick={() => handleDeleteProduct(product.id)}
                          title="Delete Product"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                    <div className={styles.wasteTypesBadges}>
                      {product.recyclable && (
                        <span className={styles.wasteTypeBadge}>♻️ Recyclable</span>
                      )}
                      {product.biodegradable && (
                        <span className={styles.wasteTypeBadge}>🌱 Biodegradable</span>
                      )}
                      {product.sustainableMaterials.map((material, idx) => (
                        <span key={idx} className={styles.wasteTypeBadge}>
                          {material}
                        </span>
                      ))}
                    </div>
                    <div className={styles.serviceInfo}>
                      <span>
                        <i className="fas fa-cloud"></i>
                        {product.carbonFootprint} kg CO₂
                      </span>
                      {product.price && (
                        <span>
                          <i className="fas fa-tag"></i>
                          ₱{product.price.toLocaleString()}
                        </span>
                      )}
                      <span>
                        <i className="fas fa-certificate"></i>
                        {product.certifications.length} certs
                      </span>
                    </div>
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
                <button 
                  className={styles.primaryButton}
                  onClick={handleViewDashboard}
                >
                  View Dashboard
                </button>
              </div>

              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-chart-pie"></i>
                </div>
                <h3>CSR Impact Report</h3>
                <p>Generate comprehensive CSR reports with verified data</p>
                <button 
                  className={styles.secondaryButton}
                  onClick={handleGenerateReport}
                >
                  Generate Report
                </button>
              </div>

              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <i className="fas fa-certificate"></i>
                </div>
                <h3>Sustainability Certificate</h3>
                <p>Download verified sustainability credentials</p>
                <button 
                  className={styles.secondaryButton}
                  onClick={handleDownloadCertificate}
                >
                  Download Certificate
                </button>
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
              <button 
                className={styles.actionButton}
                onClick={() => setShowMeetingModal(true)}
              >
                <i className="fas fa-calendar-check"></i>
                <span>Schedule Meeting</span>
              </button>
              <button 
                className={styles.actionButton}
                onClick={() => setShowAnnouncementModal(true)}
              >
                <i className="fas fa-megaphone"></i>
                <span>Create Announcement</span>
              </button>
              <button 
                className={styles.actionButton}
                onClick={() => setShowInvoicesModal(true)}
              >
                <i className="fas fa-file-invoice-dollar"></i>
                <span>View Invoices</span>
              </button>
              <button 
                className={styles.actionButton}
                onClick={() => setShowSettingsModal(true)}
              >
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

        {/* Create Eco-Product Modal */}
        {showProductModal && (
          <div className={styles.modalOverlay} onClick={() => {
            setShowProductModal(false);
            setEditingProduct(null);
            setProductForm({
              name: '',
              category: 'household',
              description: '',
              ecoScore: '80',
              carbonFootprint: '',
              recyclable: false,
              biodegradable: false,
              sustainableMaterials: [],
              certifications: [],
              price: '',
              imageUrl: ''
            });
          }}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>{editingProduct ? 'Edit' : 'Add'} Eco-Product</h2>
                <button className={styles.closeButton} onClick={() => {
                  setShowProductModal(false);
                  setEditingProduct(null);
                  setProductForm({
                    name: '',
                    category: 'household',
                    description: '',
                    ecoScore: '80',
                    carbonFootprint: '',
                    recyclable: false,
                    biodegradable: false,
                    sustainableMaterials: [],
                    certifications: [],
                    price: '',
                    imageUrl: ''
                  });
                }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <form onSubmit={handleCreateProduct}>
                <div className={styles.modalBody}>
                  <div className={styles.formGroup}>
                    <label>Product Name *</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                      placeholder="e.g., Bamboo Toothbrush"
                      required
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Category *</label>
                      <select
                        value={productForm.category}
                        onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                        required
                      >
                        <option value="household">Household</option>
                        <option value="personal-care">Personal Care</option>
                        <option value="food-beverage">Food & Beverage</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="packaging">Packaging</option>
                        <option value="clothing">Clothing</option>
                        <option value="electronics">Electronics</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Eco Score (0-100) *</label>
                      <input
                        type="number"
                        value={productForm.ecoScore}
                        onChange={(e) => setProductForm({...productForm, ecoScore: e.target.value})}
                        placeholder="80"
                        min="0"
                        max="100"
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Description *</label>
                    <textarea
                      value={productForm.description}
                      onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                      placeholder="Describe the eco-friendly features..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Carbon Footprint (kg CO₂) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={productForm.carbonFootprint}
                        onChange={(e) => setProductForm({...productForm, carbonFootprint: e.target.value})}
                        placeholder="0.5"
                        min="0"
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Price (₱)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={productForm.price}
                        onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                        placeholder="150.00"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Image URL</label>
                    <input
                      type="url"
                      value={productForm.imageUrl}
                      onChange={(e) => setProductForm({...productForm, imageUrl: e.target.value})}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Sustainable Materials</label>
                    <div className={styles.checkboxGrid}>
                      {['Bamboo', 'Recycled Plastic', 'Organic Cotton', 'Biodegradable Plastic', 'Glass', 'Metal'].map((material) => (
                        <label key={material} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={productForm.sustainableMaterials.includes(material)}
                            onChange={() => handleMaterialToggle(material)}
                          />
                          <span>{material}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Certifications</label>
                    <div className={styles.checkboxGrid}>
                      {['Fair Trade', 'Organic', 'Carbon Neutral', 'Cruelty Free', 'Vegan', 'FSC Certified'].map((cert) => (
                        <label key={cert} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={productForm.certifications.includes(cert)}
                            onChange={() => handleCertificationToggle(cert)}
                          />
                          <span>{cert}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Product Features</label>
                    <div className={styles.checkboxGrid}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={productForm.recyclable}
                          onChange={(e) => setProductForm({...productForm, recyclable: e.target.checked})}
                        />
                        <span>♻️ Recyclable</span>
                      </label>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={productForm.biodegradable}
                          onChange={(e) => setProductForm({...productForm, biodegradable: e.target.checked})}
                        />
                        <span>🌱 Biodegradable</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" className={styles.cancelButton} onClick={() => {
                    setShowProductModal(false);
                    setEditingProduct(null);
                    setProductForm({
                      name: '',
                      category: 'household',
                      description: '',
                      ecoScore: '80',
                      carbonFootprint: '',
                      recyclable: false,
                      biodegradable: false,
                      sustainableMaterials: [],
                      certifications: [],
                      price: '',
                      imageUrl: ''
                    });
                  }}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitButton}>
                    {editingProduct ? 'Update' : 'Add'} Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CSR Report Generation Modal */}
        {showReportModal && (
          <div className={styles.modalOverlay} onClick={() => !generatingReport && setShowReportModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>
                  <i className="fas fa-chart-pie"></i> CSR Impact Report
                </h2>
                {!generatingReport && (
                  <button className={styles.closeButton} onClick={() => setShowReportModal(false)}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
              
              <div className={styles.modalBody}>
                {generatingReport ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div className={styles.spinner}></div>
                    <h3 style={{ marginTop: '20px', color: '#2c3e50' }}>Generating Your Report...</h3>
                    <p style={{ color: '#7f8c8d', marginTop: '10px' }}>
                      Compiling environmental data and CSR metrics
                    </p>
                  </div>
                ) : reportGenerated ? (
                  <div style={{ padding: '20px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                      <i className="fas fa-check-circle" style={{ fontSize: '64px', color: '#4CAF50' }}></i>
                      <h3 style={{ marginTop: '20px', color: '#2c3e50' }}>Report Generated Successfully!</h3>
                    </div>

                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                      <h4 style={{ marginBottom: '15px', color: '#2c3e50' }}>
                        <i className="fas fa-file-alt"></i> Report Summary
                      </h4>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e0e0e0' }}>
                          <span style={{ color: '#7f8c8d' }}>Sponsored Challenges:</span>
                          <strong style={{ color: '#2c3e50' }}>{sponsoredChallenges.length}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e0e0e0' }}>
                          <span style={{ color: '#7f8c8d' }}>Total Investment:</span>
                          <strong style={{ color: '#2c3e50' }}>₱{totalInvestment.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e0e0e0' }}>
                          <span style={{ color: '#7f8c8d' }}>Brand Impressions:</span>
                          <strong style={{ color: '#2c3e50' }}>{totalImpressions.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e0e0e0' }}>
                          <span style={{ color: '#7f8c8d' }}>Waste Collections:</span>
                          <strong style={{ color: '#2c3e50' }}>{totalCollections}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                          <span style={{ color: '#7f8c8d' }}>Eco-Products Listed:</span>
                          <strong style={{ color: '#2c3e50' }}>{ecoProducts.length}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                      <p style={{ margin: 0, color: '#2c3e50', fontSize: '14px' }}>
                        <i className="fas fa-info-circle" style={{ color: '#4CAF50', marginRight: '8px' }}></i>
                        Your CSR report includes comprehensive data on environmental impact, community engagement, and sustainability metrics. This report is verified and blockchain-secured.
                      </p>
                    </div>

                    <button 
                      className={styles.primaryButton}
                      onClick={handleDownloadReport}
                      style={{ width: '100%', padding: '12px' }}
                    >
                      <i className="fas fa-download"></i> Download Full Report (JSON)
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Schedule Meeting Modal */}
        {showMeetingModal && (
          <div className={styles.modalOverlay} onClick={() => setShowMeetingModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2><i className="fas fa-calendar-check"></i> Schedule Meeting</h2>
                <button className={styles.closeButton} onClick={() => setShowMeetingModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <form onSubmit={handleScheduleMeeting}>
                <div className={styles.modalBody}>
                  <div className={styles.formGroup}>
                    <label>Meeting Title *</label>
                    <input
                      type="text"
                      value={meetingForm.title}
                      onChange={(e) => setMeetingForm({...meetingForm, title: e.target.value})}
                      placeholder="e.g., Quarterly Partnership Review"
                      required
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Date *</label>
                      <input
                        type="date"
                        value={meetingForm.date}
                        onChange={(e) => setMeetingForm({...meetingForm, date: e.target.value})}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Time *</label>
                      <input
                        type="time"
                        value={meetingForm.time}
                        onChange={(e) => setMeetingForm({...meetingForm, time: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Duration (minutes) *</label>
                    <select
                      value={meetingForm.duration}
                      onChange={(e) => setMeetingForm({...meetingForm, duration: e.target.value})}
                      required
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="90">1.5 hours</option>
                      <option value="120">2 hours</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Participants (comma-separated emails) *</label>
                    <input
                      type="text"
                      value={meetingForm.participants}
                      onChange={(e) => setMeetingForm({...meetingForm, participants: e.target.value})}
                      placeholder="email1@example.com, email2@example.com"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Meeting Link (optional)</label>
                    <input
                      type="url"
                      value={meetingForm.meetingLink}
                      onChange={(e) => setMeetingForm({...meetingForm, meetingLink: e.target.value})}
                      placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Agenda *</label>
                    <textarea
                      value={meetingForm.agenda}
                      onChange={(e) => setMeetingForm({...meetingForm, agenda: e.target.value})}
                      placeholder="Meeting agenda and discussion points..."
                      rows={4}
                      required
                    />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" className={styles.cancelButton} onClick={() => setShowMeetingModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitButton}>
                    Schedule Meeting
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Announcement Modal */}
        {showAnnouncementModal && (
          <div className={styles.modalOverlay} onClick={() => setShowAnnouncementModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2><i className="fas fa-megaphone"></i> Create Announcement</h2>
                <button className={styles.closeButton} onClick={() => setShowAnnouncementModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <form onSubmit={handleCreateAnnouncement}>
                <div className={styles.modalBody}>
                  <div className={styles.formGroup}>
                    <label>Announcement Title *</label>
                    <input
                      type="text"
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                      placeholder="e.g., New Eco-Product Launch"
                      required
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Priority *</label>
                      <select
                        value={announcementForm.priority}
                        onChange={(e) => setAnnouncementForm({...announcementForm, priority: e.target.value})}
                        required
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Target Audience *</label>
                      <select
                        value={announcementForm.targetAudience}
                        onChange={(e) => setAnnouncementForm({...announcementForm, targetAudience: e.target.value})}
                        required
                      >
                        <option value="all">All Users</option>
                        <option value="citizens">Citizens Only</option>
                        <option value="partners">Partners Only</option>
                        <option value="government">Government Only</option>
                        <option value="schools">Schools Only</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Message *</label>
                    <textarea
                      value={announcementForm.message}
                      onChange={(e) => setAnnouncementForm({...announcementForm, message: e.target.value})}
                      placeholder="Write your announcement message..."
                      rows={6}
                      required
                    />
                  </div>

                  <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '6px', marginTop: '10px' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#1976d2' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                      Your announcement will be visible to the selected audience on their dashboard.
                    </p>
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" className={styles.cancelButton} onClick={() => setShowAnnouncementModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitButton}>
                    Post Announcement
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Invoices Modal */}
        {showInvoicesModal && (
          <div className={styles.modalOverlay} onClick={() => setShowInvoicesModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2><i className="fas fa-file-invoice-dollar"></i> Invoices & Billing</h2>
                <button className={styles.closeButton} onClick={() => setShowInvoicesModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className={styles.modalBody}>
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <i className="fas fa-file-invoice" style={{ fontSize: '64px', color: '#4CAF50', marginBottom: '20px' }}></i>
                  <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Invoice Summary</h3>
                  
                  <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '12px', marginTop: '20px' }}>
                    <div style={{ display: 'grid', gap: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'white', borderRadius: '8px' }}>
                        <div>
                          <strong style={{ color: '#2c3e50' }}>Total Sponsorships</strong>
                          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '14px' }}>This quarter</p>
                        </div>
                        <strong style={{ color: '#4CAF50', fontSize: '24px' }}>
                          ₱{totalInvestment.toLocaleString()}
                        </strong>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'white', borderRadius: '8px' }}>
                        <div>
                          <strong style={{ color: '#2c3e50' }}>Pending Payments</strong>
                          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '14px' }}>Outstanding balance</p>
                        </div>
                        <strong style={{ color: '#ff9800', fontSize: '24px' }}>₱0</strong>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'white', borderRadius: '8px' }}>
                        <div>
                          <strong style={{ color: '#2c3e50' }}>Next Invoice</strong>
                          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '14px' }}>Due date</p>
                        </div>
                        <strong style={{ color: '#2c3e50' }}>
                          {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '30px', padding: '15px', background: '#e8f5e9', borderRadius: '8px' }}>
                    <p style={{ margin: 0, color: '#2c3e50', fontSize: '14px' }}>
                      <i className="fas fa-check-circle" style={{ color: '#4CAF50', marginRight: '8px' }}></i>
                      All payments are up to date. Invoices are sent automatically via email.
                    </p>
                  </div>

                  <button 
                    className={styles.primaryButton}
                    style={{ marginTop: '20px', width: '100%' }}
                    onClick={() => {
                      alert('Download invoices feature will be available soon!');
                      setShowInvoicesModal(false);
                    }}
                  >
                    <i className="fas fa-download"></i> Download All Invoices
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Partner Settings Modal */}
        {showSettingsModal && (
          <div className={styles.modalOverlay} onClick={() => setShowSettingsModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2><i className="fas fa-cog"></i> Partner Settings</h2>
                <button className={styles.closeButton} onClick={() => setShowSettingsModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className={styles.modalBody}>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Account Settings</h3>
                  
                  <div style={{ display: 'grid', gap: '15px' }}>
                    <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', cursor: 'pointer' }}
                         onClick={() => alert('Company Profile editing will be available soon!')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#2c3e50' }}>
                            <i className="fas fa-building" style={{ marginRight: '10px', color: '#4CAF50' }}></i>
                            Company Profile
                          </strong>
                          <p style={{ margin: '5px 0 0 30px', color: '#7f8c8d', fontSize: '14px' }}>
                            Update company information and branding
                          </p>
                        </div>
                        <i className="fas fa-chevron-right" style={{ color: '#7f8c8d' }}></i>
                      </div>
                    </div>

                    <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', cursor: 'pointer' }}
                         onClick={() => alert('Notification preferences will be available soon!')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#2c3e50' }}>
                            <i className="fas fa-bell" style={{ marginRight: '10px', color: '#4CAF50' }}></i>
                            Notifications
                          </strong>
                          <p style={{ margin: '5px 0 0 30px', color: '#7f8c8d', fontSize: '14px' }}>
                            Manage email and push notifications
                          </p>
                        </div>
                        <i className="fas fa-chevron-right" style={{ color: '#7f8c8d' }}></i>
                      </div>
                    </div>

                    <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', cursor: 'pointer' }}
                         onClick={() => alert('Payment methods will be available soon!')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#2c3e50' }}>
                            <i className="fas fa-credit-card" style={{ marginRight: '10px', color: '#4CAF50' }}></i>
                            Payment Methods
                          </strong>
                          <p style={{ margin: '5px 0 0 30px', color: '#7f8c8d', fontSize: '14px' }}>
                            Manage billing and payment information
                          </p>
                        </div>
                        <i className="fas fa-chevron-right" style={{ color: '#7f8c8d' }}></i>
                      </div>
                    </div>

                    <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', cursor: 'pointer' }}
                         onClick={() => alert('API access will be available soon!')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#2c3e50' }}>
                            <i className="fas fa-key" style={{ marginRight: '10px', color: '#4CAF50' }}></i>
                            API Access
                          </strong>
                          <p style={{ margin: '5px 0 0 30px', color: '#7f8c8d', fontSize: '14px' }}>
                            Manage API keys and integrations
                          </p>
                        </div>
                        <i className="fas fa-chevron-right" style={{ color: '#7f8c8d' }}></i>
                      </div>
                    </div>

                    <div style={{ padding: '15px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', cursor: 'pointer' }}
                         onClick={() => alert('Privacy settings will be available soon!')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#856404' }}>
                            <i className="fas fa-shield-alt" style={{ marginRight: '10px' }}></i>
                            Privacy & Security
                          </strong>
                          <p style={{ margin: '5px 0 0 30px', color: '#856404', fontSize: '14px' }}>
                            Data privacy and account security settings
                          </p>
                        </div>
                        <i className="fas fa-chevron-right" style={{ color: '#856404' }}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
