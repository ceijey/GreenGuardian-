'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';
import NGOHeader from '@/components/NGOHeader';
import styles from './volunteers.module.css';

interface Volunteer {
  id: string;
  name: string;
  email: string;
  registeredAt: any;
  userId: string;
}

interface VolunteerEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  date: any;
  slots: number;
  category: string;
  volunteers: string[]; // Array of user IDs
  createdBy: string;
  createdByName?: string;
  isActive: boolean;
  requirements?: string;
  duration?: string;
}

export default function VolunteersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<VolunteerEvent[]>([]);
  const [volunteers, setVolunteers] = useState<{ [eventId: string]: Volunteer[] }>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form state
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    slots: 10,
    category: 'cleanup',
    requirements: '',
    duration: '4 hours'
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

  // Load volunteer events
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'volunteerEvents'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const eventsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        
        // Fetch creator name
        let creatorName = 'Unknown';
        if (data.createdBy) {
          try {
            const usersRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersRef);
            const creatorDoc = usersSnapshot.docs.find(doc => doc.id === data.createdBy);
            if (creatorDoc) {
              creatorName = creatorDoc.data().fullName || creatorDoc.data().email;
            }
          } catch (error) {
            console.error('Error fetching creator:', error);
          }
        }

        return {
          id: docSnap.id,
          ...data,
          createdByName: creatorName
        } as VolunteerEvent;
      }));

      // Sort by date (newest first)
      eventsData.sort((a, b) => {
        const aTime = a.date?.toMillis ? a.date.toMillis() : 0;
        const bTime = b.date?.toMillis ? b.date.toMillis() : 0;
        return bTime - aTime;
      });

      setEvents(eventsData);
      setIsLoading(false);

      // Load volunteers for each event
      eventsData.forEach(async (event) => {
        if (event.volunteers && event.volunteers.length > 0) {
          const volunteersData = await Promise.all(
            event.volunteers.map(async (userId) => {
              try {
                const usersRef = collection(db, 'users');
                const usersSnapshot = await getDocs(usersRef);
                const userDoc = usersSnapshot.docs.find(doc => doc.id === userId);
                if (userDoc) {
                  const userData = userDoc.data();
                  return {
                    id: userId,
                    name: userData.fullName || userData.email,
                    email: userData.email,
                    userId: userId,
                    registeredAt: null
                  } as Volunteer;
                }
              } catch (error) {
                console.error('Error fetching volunteer:', error);
              }
              return null;
            })
          );

          setVolunteers(prev => ({
            ...prev,
            [event.id]: volunteersData.filter(v => v !== null) as Volunteer[]
          }));
        }
      });
    });

    return () => unsubscribe();
  }, [user, router]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'volunteerEvents'), {
        ...newEvent,
        slots: Number(newEvent.slots),
        date: new Date(newEvent.date),
        volunteers: [],
        createdBy: user.uid,
        isActive: true,
        createdAt: serverTimestamp()
      });

      setNewEvent({
        title: '',
        description: '',
        location: '',
        date: '',
        slots: 10,
        category: 'cleanup',
        requirements: '',
        duration: '4 hours'
      });
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await deleteDoc(doc(db, 'volunteerEvents', eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event.');
    }
  };

  const handleToggleActive = async (eventId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'volunteerEvents', eventId), {
        isActive: !currentStatus
      });
    } catch (error) {
      console.error('Error updating event status:', error);
      alert('Failed to update event status.');
    }
  };

  const filteredEvents = events.filter(event => {
    if (filterCategory !== 'all' && event.category !== filterCategory) return false;
    if (filterStatus === 'active' && !event.isActive) return false;
    if (filterStatus === 'inactive' && event.isActive) return false;
    if (filterStatus === 'mine' && event.createdBy !== user?.uid) return false;
    return true;
  });

  const stats = {
    total: events.length,
    active: events.filter(e => e.isActive).length,
    myEvents: events.filter(e => e.createdBy === user?.uid).length,
    totalVolunteers: events.reduce((sum, e) => sum + (e.volunteers?.length || 0), 0)
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      cleanup: '🧹',
      treePlanting: '🌳',
      education: '📚',
      conservation: '🦜',
      recycling: '♻️',
      community: '🤝'
    };
    return icons[category as keyof typeof icons] || '🌱';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      cleanup: '#3b82f6',
      treePlanting: '#10b981',
      education: '#f59e0b',
      conservation: '#8b5cf6',
      recycling: '#06b6d4',
      community: '#ec4899'
    };
    return colors[category as keyof typeof colors] || '#667eea';
  };

  const formatCategoryName = (category: string) => {
    if (!category) return 'Cleanup';
    // Handle camelCase categories like 'treePlanting'
    return category.replace(/([A-Z])/g, ' $1').trim();
  };

  const formatDate = (date: any) => {
    if (!date) return 'No date';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || isLoading) {
    return (
      <>
        <NGOHeader />
        <div className={styles.container}>
          <div className={styles.loading}>
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading volunteer events...</p>
          </div>
        </div>
      </>
    );
  }

  if (!user || userRole !== 'ngo') {
    return null;
  }

  return (
    <>
      <NGOHeader />
      <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1>Volunteer Management</h1>
            <p>Create and manage volunteer opportunities</p>
          </div>
          <button 
            className={styles.createButton}
            onClick={() => setIsCreateModalOpen(true)}
          >
            <i className="fas fa-plus"></i>
            Create Event
          </button>
        </div>

        {/* Statistics */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
              <i className="fas fa-calendar-alt"></i>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.total}</div>
              <div className={styles.statLabel}>Total Events</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <i className="fas fa-check-circle"></i>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.active}</div>
              <div className={styles.statLabel}>Active Events</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <i className="fas fa-user-shield"></i>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.myEvents}</div>
              <div className={styles.statLabel}>My Events</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
              <i className="fas fa-users"></i>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.totalVolunteers}</div>
              <div className={styles.statLabel}>Total Volunteers</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Category:</label>
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="cleanup">Cleanup</option>
              <option value="treePlanting">Tree Planting</option>
              <option value="education">Education</option>
              <option value="conservation">Conservation</option>
              <option value="recycling">Recycling</option>
              <option value="community">Community</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Status:</label>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Events</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="mine">My Events</option>
            </select>
          </div>
        </div>

        {/* Events Grid */}
        <div className={styles.eventsGrid}>
          {filteredEvents.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fas fa-calendar-times"></i>
              <h3>No events found</h3>
              <p>Create your first volunteer event to get started!</p>
              <button 
                className={styles.createButton}
                onClick={() => setIsCreateModalOpen(true)}
              >
                <i className="fas fa-plus"></i>
                Create Event
              </button>
            </div>
          ) : (
            filteredEvents.map(event => {
              const eventVolunteers = volunteers[event.id] || [];
              const slotsAvailable = event.slots - (event.volunteers?.length || 0);
              const isOwner = event.createdBy === user?.uid;

              return (
                <div key={event.id} className={styles.eventCard}>
                  <div className={styles.eventHeader}>
                    <div 
                      className={styles.categoryBadge}
                      style={{ 
                        borderColor: getCategoryColor(event.category || 'cleanup'),
                        color: getCategoryColor(event.category || 'cleanup')
                      }}
                    >
                      {getCategoryIcon(event.category || 'cleanup')}
                      {formatCategoryName(event.category || 'cleanup')}
                    </div>
                    <div 
                      className={styles.statusBadge}
                      data-active={event.isActive}
                    >
                      {event.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  <h3>{event.title}</h3>
                  <p className={styles.description}>{event.description}</p>

                  <div className={styles.eventDetails}>
                    <div className={styles.detailItem}>
                      <i className="fas fa-map-marker-alt"></i>
                      {event.location}
                    </div>
                    <div className={styles.detailItem}>
                      <i className="fas fa-calendar"></i>
                      {formatDate(event.date)}
                    </div>
                    <div className={styles.detailItem}>
                      <i className="fas fa-clock"></i>
                      {event.duration || 'Not specified'}
                    </div>
                    <div className={styles.detailItem}>
                      <i className="fas fa-users"></i>
                      {event.volunteers?.length || 0} / {event.slots} volunteers
                    </div>
                  </div>

                  {event.requirements && (
                    <div className={styles.requirements}>
                      <strong>Requirements:</strong> {event.requirements}
                    </div>
                  )}

                  {/* Slots Progress */}
                  <div className={styles.progressSection}>
                    <div className={styles.progressLabel}>
                      <span>Slots Filled</span>
                      <span>{event.volunteers?.length || 0}/{event.slots}</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill}
                        style={{ 
                          width: `${Math.min(((event.volunteers?.length || 0) / event.slots) * 100, 100)}%`,
                          background: getCategoryColor(event.category)
                        }}
                      ></div>
                    </div>
                    {slotsAvailable > 0 ? (
                      <p className={styles.slotsText}>{slotsAvailable} slots remaining</p>
                    ) : (
                      <p className={styles.slotsText} style={{ color: '#ef4444' }}>Event is full</p>
                    )}
                  </div>

                  {/* Volunteers List */}
                  {eventVolunteers.length > 0 && (
                    <div className={styles.volunteersList}>
                      <h4>Registered Volunteers ({eventVolunteers.length}):</h4>
                      <div className={styles.volunteersGrid}>
                        {eventVolunteers.map(volunteer => (
                          <div key={volunteer.id} className={styles.volunteerChip}>
                            <i className="fas fa-user-circle"></i>
                            <span>{volunteer.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={styles.eventFooter}>
                    <div className={styles.creatorInfo}>
                      <i className="fas fa-user"></i>
                      <span>{event.createdByName}</span>
                    </div>
                    {isOwner && (
                      <div className={styles.actions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleToggleActive(event.id, event.isActive)}
                          title={event.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <i className={`fas fa-${event.isActive ? 'pause' : 'play'}`}></i>
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteEvent(event.id)}
                          title="Delete event"
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
      </div>

      {/* Create Event Modal */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCreateModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2><i className="fas fa-calendar-plus"></i> Create Volunteer Event</h2>
              <button onClick={() => setIsCreateModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateEvent} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Event Title *</label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="e.g., Beach Cleanup Drive"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description *</label>
                <textarea
                  required
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  placeholder="Describe what volunteers will do..."
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Category *</label>
                  <select
                    value={newEvent.category}
                    onChange={(e) => setNewEvent({...newEvent, category: e.target.value})}
                  >
                    <option value="cleanup">Cleanup</option>
                    <option value="treePlanting">Tree Planting</option>
                    <option value="education">Education</option>
                    <option value="conservation">Conservation</option>
                    <option value="recycling">Recycling</option>
                    <option value="community">Community</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Volunteer Slots *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newEvent.slots}
                    onChange={(e) => setNewEvent({...newEvent, slots: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Location *</label>
                <input
                  type="text"
                  required
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  placeholder="e.g., Roxas Boulevard, Manila"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Duration</label>
                  <input
                    type="text"
                    value={newEvent.duration}
                    onChange={(e) => setNewEvent({...newEvent, duration: e.target.value})}
                    placeholder="e.g., 4 hours"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Requirements (optional)</label>
                <input
                  type="text"
                  value={newEvent.requirements}
                  onChange={(e) => setNewEvent({...newEvent, requirements: e.target.value})}
                  placeholder="e.g., Bring gloves and water bottle"
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                >
                  <i className="fas fa-check"></i>
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
