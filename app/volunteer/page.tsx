'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Header from '../../components/Header';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion,
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './volunteer.module.css';

interface VolunteerEvent {
  id: string;
  title: string;
  description: string;
  type: 'cleanup' | 'tree-planting' | 'workshop' | 'community-service';
  date: any;
  time: string;
  location: string;
  address: string;
  duration: number; // hours
  difficulty: 'easy' | 'moderate' | 'challenging';
  volunteers: string[]; // user IDs
  maxVolunteers: number;
  organizer: {
    name: string;
    email: string;
    phone?: string;
  };
  impact: {
    expectedCo2Reduction?: number;
    expectedWasteCollected?: number;
    expectedTreesPlanted?: number;
  };
  requirements?: string[];
  imageUrl?: string;
  createdAt: any;
}

interface UserVolunteerProfile {
  userId: string;
  totalHours: number;
  eventsAttended: number;
  upcomingEvents: string[];
  badges: string[];
}

export default function VolunteerPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<VolunteerEvent[]>([]);
  const [userProfile, setUserProfile] = useState<UserVolunteerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'cleanup' | 'tree-planting' | 'workshop' | 'community-service'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form states
  type NewEventForm = {
    title: string;
    description: string;
    type: 'cleanup' | 'tree-planting' | 'workshop' | 'community-service';
    date: string;
    time: string;
    location: string;
    address: string;
    duration: number;
    difficulty: 'easy' | 'moderate' | 'challenging';
    maxVolunteers: number;
    requirements: string;
  };

  const [newEvent, setNewEvent] = useState<NewEventForm>({
    title: '',
    description: '',
    type: 'cleanup',
    date: '',
    time: '',
    location: '',
    address: '',
    duration: 2,
    difficulty: 'easy',
    maxVolunteers: 20,
    requirements: ''
  });

  const eventTypes = [
    { id: 'cleanup', label: 'Cleanup Drive', icon: 'fas fa-broom', color: '#FF9800' },
    { id: 'tree-planting', label: 'Tree Planting', icon: 'fas fa-tree', color: '#4CAF50' },
    { id: 'workshop', label: 'Workshop', icon: 'fas fa-chalkboard', color: '#2196F3' },
    { id: 'community-service', label: 'Community Service', icon: 'fas fa-handshake', color: '#9C27B0' }
  ];

  // Load volunteer events
  useEffect(() => {
    const eventsQuery = query(collection(db, 'volunteerEvents'));
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsList: VolunteerEvent[] = [];
      snapshot.forEach((doc) => {
        eventsList.push({ id: doc.id, ...doc.data() } as VolunteerEvent);
      });
      
      // Filter and sort
      let filtered = eventsList;
      if (filterType !== 'all') {
        filtered = filtered.filter(e => e.type === filterType);
      }
      
      // Sort by date
      filtered.sort((a, b) => {
        const aDate = new Date(a.date?.seconds * 1000 || a.date);
        const bDate = new Date(b.date?.seconds * 1000 || b.date);
        return aDate.getTime() - bDate.getTime();
      });
      
      setEvents(filtered);
      setLoading(false);
    });

    return unsubscribe;
  }, [filterType]);

  // Load user volunteer profile
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'volunteerProfiles', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile(snapshot.data() as UserVolunteerProfile);
      }
    });

    return unsubscribe;
  }, [user]);

  // Create new event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'volunteerEvents'), {
        ...newEvent,
        date: new Date(newEvent.date + ' ' + newEvent.time),
        volunteers: [],
        organizer: {
          name: user.displayName || 'Anonymous',
          email: user.email || ''
        },
        requirements: newEvent.requirements.split(',').map(r => r.trim()).filter(r => r),
        impact: {
          expectedCo2Reduction: 0,
          expectedWasteCollected: 0,
          expectedTreesPlanted: newEvent.type === 'tree-planting' ? newEvent.maxVolunteers : 0
        },
        createdAt: serverTimestamp()
      });

      // Reset form
      setNewEvent({
        title: '',
        description: '',
        type: 'cleanup',
        date: '',
        time: '',
        location: '',
        address: '',
        duration: 2,
        difficulty: 'easy',
        maxVolunteers: 20,
        requirements: ''
      });
      setShowCreateModal(false);
      alert('Event created successfully!');
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    }
  };

  // Join event
  const handleJoinEvent = async (eventId: string) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'volunteerEvents', eventId), {
        volunteers: arrayUnion(user.uid)
      });

      // Update user profile
      const profileRef = doc(db, 'volunteerProfiles', user.uid);
      await updateDoc(profileRef, {
        upcomingEvents: arrayUnion(eventId),
        eventsAttended: (userProfile?.eventsAttended || 0)
      });

      alert('Successfully joined the event!');
    } catch (error) {
      console.error('Error joining event:', error);
      alert('Failed to join event');
    }
  };

  // Leave event
  const handleLeaveEvent = async (eventId: string) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'volunteerEvents', eventId), {
        volunteers: arrayRemove(user.uid)
      });

      // Update user profile
      const profileRef = doc(db, 'volunteerProfiles', user.uid);
      await updateDoc(profileRef, {
        upcomingEvents: arrayRemove(eventId)
      });

      alert('Successfully left the event');
    } catch (error) {
      console.error('Error leaving event:', error);
      alert('Failed to leave event');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'moderate': return '#FF9800';
      case 'challenging': return '#F44336';
      default: return '#999';
    }
  };

  if (!user) {
    return (
      <>
        <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
        <div className={styles.container}>
          <div className={styles.loginPrompt}>
            <h2>Please log in to join volunteer events</h2>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header logo="fas fa-hands-helping" title="GREENGUARDIAN" />
      
      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <h1>🤝 Volunteer & Community Events</h1>
          <p className={styles.subtitle}>Join your community in making a real environmental impact</p>
          
          {userProfile && (
            <div className={styles.profileStats}>
              <div className={styles.stat}>
                <div className={styles.statValue}>{userProfile.totalHours}</div>
                <div className={styles.statLabel}>Volunteer Hours</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>{userProfile.eventsAttended}</div>
                <div className={styles.statLabel}>Events Attended</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>{userProfile.badges.length}</div>
                <div className={styles.statLabel}>Badges Earned</div>
              </div>
            </div>
          )}
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className={styles.createEventBtn}
          >
            <i className="fas fa-plus"></i> Create Event
          </button>
        </section>

        {/* Event Type Filter */}
        <div className={styles.filterSection}>
          <button 
            className={filterType === 'all' ? styles.active : ''}
            onClick={() => setFilterType('all')}
          >
            All Events
          </button>
          {eventTypes.map(type => (
            <button
              key={type.id}
              className={filterType === type.id ? styles.active : ''}
              onClick={() => setFilterType(type.id as any)}
            >
              <i className={type.icon}></i> {type.label}
            </button>
          ))}
        </div>

        {/* Events List */}
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fas fa-calendar-times"></i>
            <h3>No events found</h3>
            <p>Check back soon or create your own event!</p>
          </div>
        ) : (
          <div className={styles.eventsList}>
            {events.map(event => {
              const typeInfo = eventTypes.find(t => t.id === event.type);
              const eventDate = event.date?.toDate?.() || new Date(event.date);
              const isJoined = event.volunteers.includes(user.uid);
              const isFull = event.volunteers.length >= event.maxVolunteers;
              const eventTimeMs = eventDate instanceof Date ? eventDate.getTime() : new Date(eventDate).getTime();
              const hoursUntil = Math.ceil((eventTimeMs - Date.now()) / (1000 * 60 * 60));

              return (
                <div key={event.id} className={styles.eventCard}>
                  <div className={styles.eventHeader}>
                    <div className={styles.typeLabel} style={{ backgroundColor: typeInfo?.color }}>
                      <i className={typeInfo?.icon}></i>
                      {typeInfo?.label}
                    </div>
                    <span 
                      className={styles.difficultyBadge}
                      style={{ backgroundColor: getDifficultyColor(event.difficulty) }}
                    >
                      {event.difficulty}
                    </span>
                  </div>

                  <h3>{event.title}</h3>
                  <p className={styles.description}>{event.description}</p>

                  <div className={styles.eventDetails}>
                    <div className={styles.detail}>
                      <i className="fas fa-calendar"></i>
                      <span>{eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {hoursUntil > 0 && <span className={styles.timeLeft}>({hoursUntil}h away)</span>}
                    </div>
                    <div className={styles.detail}>
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{event.location}</span>
                    </div>
                    <div className={styles.detail}>
                      <i className="fas fa-clock"></i>
                      <span>{event.duration} hours</span>
                    </div>
                  </div>

                  {event.impact && (
                    <div className={styles.impactPreview}>
                      {(event.impact?.expectedTreesPlanted ?? 0) > 0 && (
                        <span><i className="fas fa-tree"></i> {event.impact?.expectedTreesPlanted ?? 0} trees</span>
                      )}
                      {(event.impact?.expectedWasteCollected ?? 0) > 0 && (
                        <span><i className="fas fa-trash"></i> {event.impact?.expectedWasteCollected ?? 0}kg waste</span>
                      )}
                    </div>
                  )}

                  <div className={styles.volunteerInfo}>
                    <span>{event.volunteers.length}/{event.maxVolunteers} volunteers</span>
                    <div className={styles.volunteerBar}>
                      <div 
                        className={styles.volunteerFill}
                        style={{ width: `${(event.volunteers.length / event.maxVolunteers) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {isJoined ? (
                    <button
                      onClick={() => handleLeaveEvent(event.id)}
                      className={styles.leaveBtn}
                    >
                      Leave Event
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoinEvent(event.id)}
                      className={styles.joinBtn}
                      disabled={isFull}
                    >
                      {isFull ? 'Event Full' : 'Join Event'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Create Event Modal */}
        {showCreateModal && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>Create New Event</h2>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className={styles.closeBtn}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className={styles.form}>
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
                    placeholder="Describe the event..."
                    rows={3}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Type *</label>
                    <select
                      value={newEvent.type}
                      onChange={(e) => setNewEvent({...newEvent, type: e.target.value as any})}
                    >
                      {eventTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Difficulty *</label>
                    <select
                      value={newEvent.difficulty}
                      onChange={(e) => setNewEvent({...newEvent, difficulty: e.target.value as any})}
                    >
                      <option value="easy">Easy</option>
                      <option value="moderate">Moderate</option>
                      <option value="challenging">Challenging</option>
                    </select>
                  </div>
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

                  <div className={styles.formGroup}>
                    <label>Duration (hours) *</label>
                    <input
                      type="number"
                      min="1"
                      value={newEvent.duration}
                      onChange={(e) => setNewEvent({...newEvent, duration: parseInt(e.target.value)})}
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
                    placeholder="e.g., Marina Bay"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Full Address *</label>
                  <input
                    type="text"
                    value={newEvent.address}
                    onChange={(e) => setNewEvent({...newEvent, address: e.target.value})}
                    required
                    placeholder="Complete address"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Max Volunteers *</label>
                  <input
                    type="number"
                    min="1"
                    value={newEvent.maxVolunteers}
                    onChange={(e) => setNewEvent({...newEvent, maxVolunteers: parseInt(e.target.value)})}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Requirements (comma-separated)</label>
                  <input
                    type="text"
                    value={newEvent.requirements}
                    onChange={(e) => setNewEvent({...newEvent, requirements: e.target.value})}
                    placeholder="e.g., Gloves required, Closed shoes"
                  />
                </div>

                <div className={styles.formActions}>
                  <button type="button" onClick={() => setShowCreateModal(false)} className={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn}>
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