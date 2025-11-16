'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import CitizenOnly from '@/components/CitizenOnly';
import Header from '../../components/Header';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './waste-tracker.module.css';
import { initializeCollectionSchedules, getDaysUntilCollection, getScheduleForWasteType } from '@/lib/initializeSchedules';
import AIWasteClassifierDialog from './AIWasteClassifierDialog';
import CollectionCalendar from './CollectionCalendar';
import RequestPickupModal from './RequestPickupModal';

interface WasteEntry {
  id: string;
  userId: string;
  type: 'plastic' | 'paper' | 'glass' | 'metal' | 'organic' | 'electronics';
  weight: number; // kg
  date: any;
  collected: boolean;
  notes?: string;
  readyForCollection?: boolean;
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

export default function WasteTrackerPage() {
  const { user } = useAuth();
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClassifierOpen, setIsClassifierOpen] = useState(false);
  
  // Request Pickup Modal states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<{
    id: string;
    name: string;
    wasteTypes: string[];
  } | null>(null);
  
  // Form states
  const [wasteType, setWasteType] = useState<'plastic' | 'paper' | 'glass' | 'metal' | 'organic' | 'electronics'>('plastic');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const wasteTypes = [
    { id: 'plastic', label: 'Plastic', icon: 'fas fa-bottle-water', color: '#2196F3' },
    { id: 'paper', label: 'Paper & Cardboard', icon: 'fas fa-file', color: '#8B4513' },
    { id: 'glass', label: 'Glass', icon: 'fas fa-glass-whiskey', color: '#00BCD4' },
    { id: 'metal', label: 'Metal/Aluminum', icon: 'fas fa-cube', color: '#757575' },
    { id: 'organic', label: 'Organic Waste', icon: 'fas fa-leaf', color: '#4CAF50' },
    { id: 'electronics', label: 'E-Waste', icon: 'fas fa-microchip', color: '#9C27B0' }
  ];

  // Load user's waste entries
  useEffect(() => {
    if (!user) return;

    const entriesQuery = query(
      collection(db, 'wasteEntries'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(entriesQuery, (snapshot) => {
      const entries: WasteEntry[] = [];
      snapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() } as WasteEntry);
      });
      // Sort by date descending
      entries.sort((a, b) => {
        const aTime = a.date?.seconds || 0;
        const bTime = b.date?.seconds || 0;
        return bTime - aTime;
      });
      setWasteEntries(entries);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Initialize and load collection schedules
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        await initializeCollectionSchedules();
        
        const schedulesQuery = query(collection(db, 'collectionSchedules'));
        const unsubscribe = onSnapshot(schedulesQuery, (snapshot) => {
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
      } catch (error) {
        console.error('Error loading schedules:', error);
      }
    };

    loadSchedules();
  }, []);

  // Add waste entry
  const handleAddWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !weight || parseFloat(weight) <= 0) return;

    setSubmitting(true);
    try {
      // Check if collection schedule exists for this waste type
      const schedule = getScheduleForWasteType(wasteType, schedules);
      const daysUntilCollection = schedule ? getDaysUntilCollection(schedule.dayOfWeek) : null;

      await addDoc(collection(db, 'wasteEntries'), {
        userId: user.uid,
        userEmail: user.email,
        type: wasteType,
        weight: parseFloat(weight),
        date: serverTimestamp(),
        collected: false,
        notes: notes || '',
        readyForCollection: daysUntilCollection ? daysUntilCollection <= 7 : false,
        nextCollectionDays: daysUntilCollection,
        timestamp: serverTimestamp()
      });

      // Update community waste stats
      const communityRef = doc(db, 'communityStats', 'globalImpact');
      await updateDoc(communityRef, {
        wasteSegregated: (wasteEntries.reduce((sum, e) => sum + e.weight, 0) + parseFloat(weight))
      });

      // Show appropriate message
      if (schedule) {
        const message = daysUntilCollection === 0 
          ? `✓ Great! ${schedule.dayName} collection is today!`
          : daysUntilCollection === 1
          ? `✓ Recorded! ${schedule.dayName} collection is tomorrow!`
          : `✓ Recorded! Next collection: ${schedule.dayName} (${daysUntilCollection} days)`;
        alert(message);
      } else {
        alert('⚠️ Warning: No collection schedule found for this waste type. Please check back later.');
      }

      // Reset form
      setWeight('');
      setNotes('');
      setWasteType('plastic');
    } catch (error) {
      console.error('Error adding waste entry:', error);
      alert('Failed to record waste entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Mark as collected
  const handleMarkCollected = async (entryId: string) => {
    try {
      await updateDoc(doc(db, 'wasteEntries', entryId), {
        collected: true,
        collectedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating entry:', error);
    }
  };

  // Calculate statistics
  const totalWaste = wasteEntries.reduce((sum, e) => sum + e.weight, 0);
  const collectedWaste = wasteEntries.filter(e => e.collected).reduce((sum, e) => sum + e.weight, 0);
  const wasteByType = wasteTypes.map(type => ({
    ...type,
    weight: wasteEntries
      .filter(e => e.type === type.id)
      .reduce((sum, e) => sum + e.weight, 0)
  }));

  // Handle AI classification result
  const handleClassified = (result: any) => {
    // Auto-fill form with classified waste type
    setWasteType(result.wasteType);
    setNotes(`AI Classified: ${result.category} (${Math.round(result.confidence * 100)}% confidence)`);
    alert(`Waste classified as: ${result.category}\n\nThe form has been pre-filled. Please enter the weight and submit.`);
  };

  if (!user) {
    return (
      <>
        <CitizenOnly />
        <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
        <div className={styles.container}>
          <div className={styles.loginPrompt}>
            <h2>Please log in to track your waste segregation</h2>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CitizenOnly />
      <Header logo="fas fa-trash-alt" title="GREENGUARDIAN" />
      
      <main className="main-content">
        <div className={styles.container}>
        {/* Stats Overview */}
        <section className={styles.statsSection}>
          <div className="flex justify-between items-center mb-6">
            <h1>♻️ Recycling & Waste Management Tracker</h1>
            <button
              onClick={() => setIsClassifierOpen(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-purple-700 transition-all duration-300 flex items-center gap-2 font-semibold"
            >
              <i className="fas fa-brain"></i>
              AI Waste Classifier
            </button>
          </div>
          
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <i className="fas fa-weight"></i>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{totalWaste.toFixed(2)} kg</div>
                <div className={styles.statLabel}>Total Waste Segregated</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <i className="fas fa-check-circle"></i>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{collectedWaste.toFixed(2)} kg</div>
                <div className={styles.statLabel}>Collected</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <i className="fas fa-recycle"></i>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{wasteEntries.length}</div>
                <div className={styles.statLabel}>Total Entries</div>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.mainContent}>
          {/* Add Waste Entry Form */}
          <section className={styles.formSection}>
            <h2>Log Waste Segregation</h2>
            <form onSubmit={handleAddWaste} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Waste Type</label>
                <div className={styles.wasteTypeGrid}>
                  {wasteTypes.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setWasteType(type.id as any)}
                      className={`${styles.typeButton} ${wasteType === type.id ? styles.selected : ''}`}
                      style={{ borderColor: wasteType === type.id ? type.color : '#ddd' }}
                    >
                      <i className={type.icon} style={{ color: type.color }}></i>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="weight">Weight (kg) *</label>
                <input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                  placeholder="Enter weight in kg"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this waste entry (optional)"
                  rows={3}
                />
              </div>

              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={submitting}
              >
                {submitting ? 'Recording...' : 'Record Waste Entry'}
              </button>
            </form>
          </section>

          {/* Collection Schedules */}
          <section className={styles.schedulesSection}>
            <h2>🚛 Collection Schedules</h2>
            <CollectionCalendar 
              schedules={schedules}
              onRequestPickup={(serviceId, serviceName, wasteTypes) => {
                setSelectedService({ id: serviceId, name: serviceName, wasteTypes });
                setIsRequestModalOpen(true);
              }}
            />
          </section>
        </div>

        {/* Waste Breakdown Chart */}
        <section className={styles.breakdownSection}>
          <h2>Waste Breakdown by Type</h2>
          <div className={styles.wasteBreakdown}>
            {wasteByType.map(type => (
              <div key={type.id} className={styles.typeBreakdown}>
                <div className={styles.typeInfo}>
                  <i className={type.icon} style={{ color: type.color }}></i>
                  <span>{type.label}</span>
                </div>
                <div className={styles.typeBar}>
                  <div 
                    className={styles.typeBarFill}
                    style={{ 
                      width: `${totalWaste > 0 ? (type.weight / totalWaste) * 100 : 0}%`,
                      backgroundColor: type.color
                    }}
                  ></div>
                </div>
                <span className={styles.typeWeight}>{type.weight.toFixed(2)} kg</span>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Entries */}
        <section className={styles.entriesSection}>
          <h2>Recent Entries</h2>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : wasteEntries.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fas fa-inbox"></i>
              <p>No waste entries yet. Start logging your segregation!</p>
            </div>
          ) : (
            <div className={styles.entriesList}>
              {wasteEntries.map(entry => {
                const typeInfo = wasteTypes.find(t => t.id === entry.type);
                const entryDate = entry.date?.toDate?.() || new Date(entry.date);
                
                return (
                  <div 
                    key={entry.id} 
                    className={`${styles.entryCard} ${entry.collected ? styles.collected : ''}`}
                  >
                    <div className={styles.entryIcon}>
                      <i className={typeInfo?.icon} style={{ color: typeInfo?.color }}></i>
                    </div>
                    <div className={styles.entryContent}>
                      <h4>{typeInfo?.label}</h4>
                      <p className={styles.weight}>{entry.weight} kg • {entryDate.toLocaleDateString()}</p>
                      {entry.notes && <p className={styles.notes}>{entry.notes}</p>}
                    </div>
                    <div className={styles.entryActions}>
                      {!entry.collected && (
                        <button
                          onClick={() => handleMarkCollected(entry.id)}
                          className={styles.collectButton}
                        >
                          Mark Collected
                        </button>
                      )}
                      {entry.collected && (
                        <span className={styles.collectedBadge}>✓ Collected</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      </main>

      {/* AI Waste Classifier Dialog */}
      <AIWasteClassifierDialog
        isOpen={isClassifierOpen}
        onClose={() => setIsClassifierOpen(false)}
        onClassified={handleClassified}
      />

      {/* Request Pickup Modal */}
      {selectedService && (
        <RequestPickupModal
          isOpen={isRequestModalOpen}
          onClose={() => {
            setIsRequestModalOpen(false);
            setSelectedService(null);
          }}
          serviceId={selectedService.id}
          serviceName={selectedService.name}
          wasteTypes={selectedService.wasteTypes}
        />
      )}
    </>
  );
}