'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PartnerHeader from '@/components/PartnerHeader';
import styles from './waste-tracker.module.css';
import LocationMapModal from '@/app/waste-tracker/LocationMapModal';

interface WasteEntry {
  id: string;
  userId: string;
  userEmail: string;
  type: 'plastic' | 'paper' | 'glass' | 'metal' | 'organic' | 'electronics';
  weight: number;
  date: any;
  collected: boolean;
  notes?: string;
  readyForCollection?: boolean;
  nextCollectionDays?: number;
}

interface CollectionSchedule {
  id?: string;
  wasteType: string;
  dayOfWeek: number;
  dayName: string;
  frequency: string;
  location: string;
  time?: string;
}

interface WasteStats {
  totalWeight: number;
  totalEntries: number;
  collectedWeight: number;
  pendingWeight: number;
  byType: { [key: string]: number };
}

interface ServiceRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  serviceId: string;
  serviceName: string;
  wasteTypes: string[];
  requestedDate: any;
  preferredPickupDate?: string;
  preferredPickupTime?: string;
  address: string;
  coordinates?: { lat: number; lng: number } | null;
  contactNumber: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  estimatedWeight?: number;
}

export default function PartnerWasteTrackerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState<WasteStats>({
    totalWeight: 0,
    totalEntries: 0,
    collectedWeight: 0,
    pendingWeight: 0,
    byType: {}
  });
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<{
    coordinates: { lat: number; lng: number };
    address: string;
  } | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const wasteTypes = [
    { id: 'plastic', label: 'Plastic', icon: 'fas fa-bottle-water', color: '#2196F3' },
    { id: 'paper', label: 'Paper', icon: 'fas fa-file', color: '#8B4513' },
    { id: 'glass', label: 'Glass', icon: 'fas fa-wine-bottle', color: '#00BCD4' },
    { id: 'metal', label: 'Metal', icon: 'fas fa-cube', color: '#757575' },
    { id: 'organic', label: 'Organic', icon: 'fas fa-leaf', color: '#4CAF50' },
    { id: 'electronics', label: 'E-Waste', icon: 'fas fa-microchip', color: '#9C27B0' }
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

  // Load all waste entries
  useEffect(() => {
    const q = query(
      collection(db, 'wasteEntries'),
      orderBy('date', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries: WasteEntry[] = [];
      snapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() } as WasteEntry);
      });
      setWasteEntries(entries);
      
      // Calculate stats
      const newStats: WasteStats = {
        totalWeight: 0,
        totalEntries: entries.length,
        collectedWeight: 0,
        pendingWeight: 0,
        byType: {}
      };

      entries.forEach(entry => {
        newStats.totalWeight += entry.weight;
        if (entry.collected) {
          newStats.collectedWeight += entry.weight;
        } else {
          newStats.pendingWeight += entry.weight;
        }
        
        if (!newStats.byType[entry.type]) {
          newStats.byType[entry.type] = 0;
        }
        newStats.byType[entry.type] += entry.weight;
      });

      setStats(newStats);
    });

    return unsubscribe;
  }, []);

  // Load collection schedules
  useEffect(() => {
    const q = query(collection(db, 'collectionSchedules'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const schedulesList: CollectionSchedule[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        schedulesList.push({
          id: doc.id,
          wasteType: data.wasteType,
          dayOfWeek: data.dayOfWeek,
          dayName: data.dayName,
          frequency: data.frequency,
          location: data.location,
          time: data.time
        } as CollectionSchedule);
      });
      setSchedules(schedulesList);
    });

    return unsubscribe;
  }, []);

  // Load service requests for this partner
  useEffect(() => {
    if (!user) return;

    // Get all services offered by this partner
    const servicesQuery = query(
      collection(db, 'wasteCollectionServices'),
      where('providerId', '==', user.uid)
    );

    const unsubscribeServices = onSnapshot(servicesQuery, (servicesSnapshot) => {
      const serviceIds = servicesSnapshot.docs.map(doc => doc.id);
      
      if (serviceIds.length === 0) {
        setServiceRequests([]);
        return;
      }

      // Get all requests for these services
      const requestsQuery = query(
        collection(db, 'wasteCollectionRequests'),
        where('serviceId', 'in', serviceIds)
      );

      const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
        const requests: ServiceRequest[] = [];
        snapshot.forEach((doc) => {
          requests.push({ id: doc.id, ...doc.data() } as ServiceRequest);
        });
        
        // Sort by requestedDate in JavaScript
        requests.sort((a, b) => {
          const aTime = a.requestedDate?.seconds || 0;
          const bTime = b.requestedDate?.seconds || 0;
          return bTime - aTime; // desc order
        });
        
        setServiceRequests(requests);
      });

      return unsubscribeRequests;
    });

    return unsubscribeServices;
  }, [user]);

  // Filter entries
  const filteredEntries = wasteEntries.filter(entry => {
    if (filterType !== 'all' && entry.type !== filterType) return false;
    if (filterStatus === 'collected' && !entry.collected) return false;
    if (filterStatus === 'pending' && entry.collected) return false;
    return true;
  });

  const handleUpdateRequestStatus = async (requestId: string, newStatus: ServiceRequest['status']) => {
    if (!db) return;
    
    try {
      await updateDoc(doc(db, 'wasteCollectionRequests', requestId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success('Great job! Your completion has been recorded.');
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error('Failed to update request status');
    }
  };

  if (loading || isLoading) {
    return (
      <div className={styles.container}>
        <PartnerHeader />
        <div className={styles.loading}>
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading waste tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PartnerHeader />
      
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1>♻️ Waste Collection Tracker</h1>
            <p>Monitor community waste segregation and collection activities</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <i className="fas fa-weight"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.totalWeight.toFixed(2)} kg</span>
              <span className={styles.statLabel}>Total Waste Tracked</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-check-circle"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.collectedWeight.toFixed(2)} kg</span>
              <span className={styles.statLabel}>Collected</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-clock"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.pendingWeight.toFixed(2)} kg</span>
              <span className={styles.statLabel}>Pending Collection</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <i className="fas fa-list"></i>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.totalEntries}</span>
              <span className={styles.statLabel}>Total Entries</span>
            </div>
          </div>
        </div>

        {/* Waste Type Breakdown */}
        <div className={styles.breakdownSection}>
          <h2>Waste Breakdown by Type</h2>
          <div className={styles.typeBreakdownGrid}>
            {wasteTypes.map(type => {
              const weight = stats.byType[type.id] || 0;
              const percentage = stats.totalWeight > 0 ? (weight / stats.totalWeight) * 100 : 0;
              
              return (
                <div key={type.id} className={styles.typeCard}>
                  <div className={styles.typeIcon} style={{ backgroundColor: `${type.color}20` }}>
                    <i className={type.icon} style={{ color: type.color }}></i>
                  </div>
                  <div className={styles.typeInfo}>
                    <h4>{type.label}</h4>
                    <p className={styles.typeWeight}>{weight.toFixed(2)} kg</p>
                    <div className={styles.typeBar}>
                      <div 
                        className={styles.typeBarFill} 
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: type.color 
                        }}
                      ></div>
                    </div>
                    <p className={styles.typePercentage}>{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collection Schedules */}
        <div className={styles.schedulesSection}>
          <h2>🚛 Active Collection Schedules</h2>
          {schedules.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fas fa-calendar-times"></i>
              <p>No collection schedules available</p>
            </div>
          ) : (
            <div className={styles.schedulesGrid}>
              {schedules.map(schedule => {
                const typeInfo = wasteTypes.find(t => t.label.toLowerCase().includes(schedule.wasteType.toLowerCase()));
                const today = new Date().getDay();
                const isToday = schedule.dayOfWeek === today;
                
                return (
                  <div 
                    key={schedule.id} 
                    className={`${styles.scheduleCard} ${isToday ? styles.todaySchedule : ''}`}
                  >
                    <div 
                      className={styles.scheduleIcon}
                      style={{ backgroundColor: `${typeInfo?.color || '#38b2ac'}20` }}
                    >
                      <i 
                        className={typeInfo?.icon || 'fas fa-trash-alt'} 
                        style={{ color: typeInfo?.color || '#38b2ac' }}
                      ></i>
                    </div>
                    <div className={styles.scheduleInfo}>
                      <h4>{schedule.wasteType}</h4>
                      <div className={styles.scheduleMeta}>
                        <span>
                          <i className="fas fa-calendar"></i>
                          {schedule.dayName}s
                        </span>
                        <span>
                          <i className="fas fa-clock"></i>
                          {schedule.time || 'Time TBD'}
                        </span>
                        <span>
                          <i className="fas fa-map-marker-alt"></i>
                          {schedule.location}
                        </span>
                      </div>
                    </div>
                    {isToday && (
                      <span className={styles.todayBadge}>Today!</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Service Requests from Citizens */}
        <div className={styles.requestsSection}>
          <h2>📞 Citizen Service Requests</h2>
          {serviceRequests.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fas fa-inbox"></i>
              <p>No service requests yet</p>
            </div>
          ) : (
            <div className={styles.requestsGrid}>
              {serviceRequests.map(request => {
                const requestDate = request.requestedDate?.toDate?.() || new Date(request.requestedDate);
                const statusColors = {
                  pending: '#ed8936',
                  confirmed: '#4299e1',
                  completed: '#48bb78',
                  cancelled: '#f56565'
                };
                
                return (
                  <div key={request.id} className={styles.requestCard}>
                    <div className={styles.requestHeader}>
                      <div>
                        <h4>{request.userName || request.userEmail}</h4>
                        <p className={styles.requestDate}>
                          <i className="fas fa-clock"></i>
                          Requested: {requestDate.toLocaleString()}
                        </p>
                      </div>
                      <span 
                        className={styles.statusBadge}
                        style={{ background: statusColors[request.status] }}
                      >
                        {request.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className={styles.requestDetails}>
                      <div className={styles.detailRow}>
                        <strong>Service:</strong>
                        <span>{request.serviceName}</span>
                      </div>
                      
                      <div className={styles.detailRow}>
                        <strong>Waste Types:</strong>
                        <div className={styles.wasteTypeTags}>
                          {request.wasteTypes.map((type, idx) => {
                            const typeInfo = wasteTypes.find(t => 
                              t.label.toLowerCase().includes(type.toLowerCase()) ||
                              type.toLowerCase().includes(t.label.toLowerCase())
                            );
                            return (
                              <span key={idx} className={styles.wasteTypeTag}>
                                <i 
                                  className={typeInfo?.icon || 'fas fa-trash-alt'} 
                                  style={{ color: typeInfo?.color || '#38b2ac' }}
                                ></i>
                                {type}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {request.preferredPickupDate && (
                        <div className={styles.detailRow}>
                          <strong>Preferred Pickup:</strong>
                          <span>
                            <i className="fas fa-calendar"></i>
                            {request.preferredPickupDate}
                            {request.preferredPickupTime && ` at ${request.preferredPickupTime}`}
                          </span>
                        </div>
                      )}

                      <div className={styles.detailRow}>
                        <strong>Address:</strong>
                        <span>
                          <i className="fas fa-map-marker-alt"></i>
                          {request.address}
                        </span>
                        {request.coordinates && (
                          <button
                            className={styles.viewLocationButton}
                            onClick={() => {
                              setSelectedLocation({
                                coordinates: request.coordinates!,
                                address: request.address
                              });
                              setIsLocationModalOpen(true);
                            }}
                          >
                            <i className="fas fa-map-marked-alt"></i>
                            View Location
                          </button>
                        )}
                      </div>

                      <div className={styles.detailRow}>
                        <strong>Contact:</strong>
                        <span>
                          <i className="fas fa-phone"></i>
                          {request.contactNumber}
                        </span>
                      </div>

                      {request.estimatedWeight && (
                        <div className={styles.detailRow}>
                          <strong>Est. Weight:</strong>
                          <span>
                            <i className="fas fa-weight"></i>
                            {request.estimatedWeight} kg
                          </span>
                        </div>
                      )}

                      {request.notes && (
                        <div className={styles.detailRow}>
                          <strong>Notes:</strong>
                          <p className={styles.requestNotes}>{request.notes}</p>
                        </div>
                      )}
                    </div>

                    {request.status === 'pending' && (
                      <div className={styles.requestActions}>
                        <button 
                          className={styles.confirmButton}
                          onClick={() => handleUpdateRequestStatus(request.id, 'confirmed')}
                        >
                          <i className="fas fa-check"></i>
                          Confirm Pickup
                        </button>
                        <button 
                          className={styles.cancelButton}
                          onClick={() => handleUpdateRequestStatus(request.id, 'cancelled')}
                        >
                          <i className="fas fa-times"></i>
                          Decline
                        </button>
                      </div>
                    )}

                    {request.status === 'confirmed' && (
                      <div className={styles.requestActions}>
                        <button 
                          className={styles.completeButton}
                          onClick={() => handleUpdateRequestStatus(request.id, 'completed')}
                        >
                          <i className="fas fa-check-double"></i>
                          Mark as Completed
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className={styles.filtersSection}>
          <h2>Citizen Waste Entries</h2>
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label>Filter by Type:</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">All Types</option>
                {wasteTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Filter by Status:</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="pending">Pending Collection</option>
                <option value="collected">Collected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Entries List */}
        <div className={styles.entriesSection}>
          {filteredEntries.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fas fa-inbox"></i>
              <p>No waste entries found with current filters</p>
            </div>
          ) : (
            <div className={styles.entriesList}>
              {filteredEntries.map(entry => {
                const typeInfo = wasteTypes.find(t => t.id === entry.type);
                const entryDate = entry.date?.toDate?.() || new Date(entry.date);
                
                return (
                  <div 
                    key={entry.id} 
                    className={`${styles.entryCard} ${entry.collected ? styles.collected : ''}`}
                  >
                    <div 
                      className={styles.entryIcon}
                      style={{ backgroundColor: `${typeInfo?.color}20` }}
                    >
                      <i className={typeInfo?.icon} style={{ color: typeInfo?.color }}></i>
                    </div>
                    <div className={styles.entryContent}>
                      <div className={styles.entryHeader}>
                        <h4>{typeInfo?.label}</h4>
                        {entry.collected ? (
                          <span className={styles.statusBadge} style={{ background: '#48bb78' }}>
                            ✓ Collected
                          </span>
                        ) : (
                          <span className={styles.statusBadge} style={{ background: '#ed8936' }}>
                            Pending
                          </span>
                        )}
                      </div>
                      <div className={styles.entryDetails}>
                        <span>
                          <i className="fas fa-weight"></i>
                          {entry.weight} kg
                        </span>
                        <span>
                          <i className="fas fa-calendar"></i>
                          {entryDate.toLocaleDateString()}
                        </span>
                        <span>
                          <i className="fas fa-user"></i>
                          {entry.userEmail}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className={styles.entryNotes}>
                          <i className="fas fa-sticky-note"></i>
                          {entry.notes}
                        </p>
                      )}
                      {entry.readyForCollection && !entry.collected && (
                        <div className={styles.readyBadge}>
                          <i className="fas fa-truck"></i>
                          Ready for collection
                          {entry.nextCollectionDays !== undefined && (
                            <span> • Next pickup in {entry.nextCollectionDays} days</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Location Map Modal */}
      {selectedLocation && (
        <LocationMapModal
          isOpen={isLocationModalOpen}
          onClose={() => {
            setIsLocationModalOpen(false);
            setSelectedLocation(null);
          }}
          coordinates={selectedLocation.coordinates}
          address={selectedLocation.address}
          title="Pickup Location"
        />
      )}
    </div>
  );
}
