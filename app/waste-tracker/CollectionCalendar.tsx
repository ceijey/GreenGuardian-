'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './CollectionCalendar.module.css';

interface CollectionSchedule {
  id?: string;
  wasteType: string;
  dayOfWeek: number;
  dayName: string;
  frequency: string;
  location: string;
  time?: string;
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
  description?: string;
}

interface CollectionCalendarProps {
  schedules: CollectionSchedule[];
  onRequestPickup?: (serviceId: string, serviceName: string, wasteTypes: string[]) => void;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CollectionCalendar({ schedules, onRequestPickup }: CollectionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [wasteServices, setWasteServices] = useState<WasteCollectionService[]>([]);

  // Load waste collection services from private partners
  useEffect(() => {
    const q = query(
      collection(db, 'wasteCollectionServices'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const services: WasteCollectionService[] = [];
      snapshot.forEach((doc) => {
        services.push({ id: doc.id, ...doc.data() } as WasteCollectionService);
      });
      setWasteServices(services);
    });

    return unsubscribe;
  }, []);

  // Get calendar data
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const todayDate = today.getDate();

  // Navigate months
  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  // Get collections for a specific day of week
  const getCollectionsForDay = (dayOfWeek: number) => {
    return schedules.filter(schedule => schedule.dayOfWeek === dayOfWeek);
  };

  // Get collections for selected calendar day
  const getSelectedDayCollections = () => {
    if (selectedDay === null) return [];
    const dayOfWeek = new Date(year, month, selectedDay).getDay();
    return getCollectionsForDay(dayOfWeek);
  };

  // Check if day has collections
  const hasCollections = (day: number) => {
    const dayOfWeek = new Date(year, month, day).getDay();
    return getCollectionsForDay(dayOfWeek).length > 0;
  };

  // Check if collection is today
  const isCollectionToday = (dayOfWeek: number) => {
    return isCurrentMonth && today.getDay() === dayOfWeek;
  };

  // Check if collection is tomorrow
  const isCollectionTomorrow = (dayOfWeek: number) => {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return today.getMonth() === tomorrow.getMonth() && 
           today.getFullYear() === tomorrow.getFullYear() &&
           tomorrow.getDay() === dayOfWeek;
  };

  // Get waste type icon
  const getWasteIcon = (wasteType: string) => {
    const type = wasteType.toLowerCase();
    if (type.includes('plastic')) return 'fa-bottle-water';
    if (type.includes('paper') || type.includes('cardboard')) return 'fa-file';
    if (type.includes('glass')) return 'fa-wine-bottle';
    if (type.includes('metal') || type.includes('aluminum')) return 'fa-cube';
    if (type.includes('organic')) return 'fa-leaf';
    if (type.includes('electronic') || type.includes('e-waste')) return 'fa-microchip';
    return 'fa-trash-alt';
  };

  // Get waste type color
  const getWasteColor = (wasteType: string) => {
    const type = wasteType.toLowerCase();
    if (type.includes('plastic')) return '#2196F3';
    if (type.includes('paper') || type.includes('cardboard')) return '#8B4513';
    if (type.includes('glass')) return '#00BCD4';
    if (type.includes('metal') || type.includes('aluminum')) return '#757575';
    if (type.includes('organic')) return '#4CAF50';
    if (type.includes('electronic') || type.includes('e-waste')) return '#9C27B0';
    return '#FF9800';
  };

  // Build calendar grid
  const calendarDays = [];
  
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className={styles.emptyDay}></div>);
  }
  
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && day === todayDate;
    const hasCollection = hasCollections(day);
    const isSelected = selectedDay === day;
    const dayOfWeek = new Date(year, month, day).getDay();
    const collections = getCollectionsForDay(dayOfWeek);

    calendarDays.push(
      <div
        key={day}
        className={`${styles.calendarDay} ${isToday ? styles.today : ''} ${hasCollection ? styles.hasCollection : ''} ${isSelected ? styles.selected : ''}`}
        onClick={() => setSelectedDay(day)}
      >
        <span className={styles.dayNumber}>{day}</span>
        {hasCollection && (
          <div className={styles.collectionIndicators}>
            {collections.slice(0, 3).map((schedule, idx) => (
              <div
                key={idx}
                className={styles.indicator}
                style={{ backgroundColor: getWasteColor(schedule.wasteType) }}
                title={schedule.wasteType}
              >
                <i className={`fas ${getWasteIcon(schedule.wasteType)}`}></i>
              </div>
            ))}
            {collections.length > 3 && (
              <div className={styles.moreIndicator}>+{collections.length - 3}</div>
            )}
          </div>
        )}
      </div>
    );
  }

  const selectedDayCollections = getSelectedDayCollections();
  const selectedDayOfWeek = selectedDay ? new Date(year, month, selectedDay).getDay() : null;

  return (
    <div className={styles.calendarContainer}>
      {/* Calendar Header */}
      <div className={styles.calendarHeader}>
        <button onClick={previousMonth} className={styles.navButton}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <div className={styles.monthYear}>
          <h3>{MONTHS[month]} {year}</h3>
          <button onClick={goToToday} className={styles.todayButton}>
            Today
          </button>
        </div>
        <button onClick={nextMonth} className={styles.navButton}>
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {schedules.length > 0 && (
          <div className={styles.legendItems}>
            {schedules.map((schedule, idx) => (
              <div key={idx} className={styles.legendItem}>
                <div
                  className={styles.legendColor}
                  style={{ backgroundColor: getWasteColor(schedule.wasteType) }}
                >
                  <i className={`fas ${getWasteIcon(schedule.wasteType)}`}></i>
                </div>
                <span>{schedule.wasteType}</span>
                {isCollectionToday(schedule.dayOfWeek) && (
                  <span className={styles.todayBadge}>Today!</span>
                )}
                {isCollectionTomorrow(schedule.dayOfWeek) && (
                  <span className={styles.tomorrowBadge}>Tomorrow</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Day Names */}
      <div className={styles.weekDays}>
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className={styles.weekDay}>
            {day.substring(0, 3)}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className={styles.calendarGrid}>
        {calendarDays}
      </div>

      {/* Selected Day Details */}
      {selectedDay && selectedDayCollections.length > 0 && (
        <div className={styles.selectedDayDetails}>
          <h4>
            <i className="fas fa-calendar-check"></i>
            Collections on {DAYS_OF_WEEK[selectedDayOfWeek!]}, {MONTHS[month]} {selectedDay}
          </h4>
          <div className={styles.collectionsList}>
            {selectedDayCollections.map((schedule, idx) => (
              <div
                key={idx}
                className={styles.collectionCard}
                style={{ borderLeftColor: getWasteColor(schedule.wasteType) }}
              >
                <div className={styles.collectionIcon} style={{ backgroundColor: `${getWasteColor(schedule.wasteType)}20` }}>
                  <i className={`fas ${getWasteIcon(schedule.wasteType)}`} style={{ color: getWasteColor(schedule.wasteType) }}></i>
                </div>
                <div className={styles.collectionInfo}>
                  <h5>{schedule.wasteType}</h5>
                  <div className={styles.collectionMeta}>
                    <span>
                      <i className="fas fa-clock"></i>
                      {schedule.time || 'Time not specified'}
                    </span>
                    <span>
                      <i className="fas fa-map-marker-alt"></i>
                      {schedule.location}
                    </span>
                    <span>
                      <i className="fas fa-sync-alt"></i>
                      {schedule.frequency}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {schedules.length === 0 && (
        <div className={styles.emptyState}>
          <i className="fas fa-calendar-times"></i>
          <p>No collection schedules available yet.</p>
        </div>
      )}

      {/* Private Partner Waste Collection Services */}
      {wasteServices.length > 0 && (
        <div className={styles.servicesSection}>
          <h4>
            <i className="fas fa-truck"></i>
            Available Waste Collection Services
          </h4>
          <p className={styles.servicesIntro}>
            Private partners offering waste collection and pickup services in your area:
          </p>
          <div className={styles.servicesList}>
            {wasteServices.map((service) => (
              <div key={service.id} className={styles.serviceCard}>
                <div className={styles.serviceHeader}>
                  <div>
                    <h5>{service.providerName}</h5>
                    <p className={styles.serviceArea}>
                      <i className="fas fa-map-marker-alt"></i>
                      {service.serviceArea}
                    </p>
                  </div>
                  <span className={styles.activeBadge}>
                    <i className="fas fa-check-circle"></i>
                    Active
                  </span>
                </div>
                
                {service.description && (
                  <p className={styles.serviceDescription}>{service.description}</p>
                )}
                
                <div className={styles.serviceDetails}>
                  <div className={styles.serviceInfo}>
                    <strong>Waste Types:</strong>
                    <div className={styles.wasteTypeTags}>
                      {service.wasteTypes.map((type, idx) => (
                        <span key={idx} className={styles.wasteTypeTag}>
                          <i className={`fas ${getWasteIcon(type)}`} style={{ color: getWasteColor(type) }}></i>
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className={styles.serviceInfo}>
                    <strong>Pickup Schedule:</strong>
                    <span>{service.pickupSchedule}</span>
                  </div>
                  
                  <div className={styles.serviceInfo}>
                    <strong>Pricing:</strong>
                    <span>{service.pricing}</span>
                  </div>
                  
                  <div className={styles.serviceInfo}>
                    <strong>Contact:</strong>
                    <span>
                      <i className="fas fa-phone"></i>
                      {service.contactNumber}
                    </span>
                  </div>
                </div>
                
                <div className={styles.serviceActions}>
                  <a 
                    href={`tel:${service.contactNumber}`}
                    className={styles.contactButton}
                  >
                    <i className="fas fa-phone"></i>
                    Call Now
                  </a>
                  <button 
                    className={styles.requestButton}
                    onClick={() => onRequestPickup?.(service.id, service.providerName, service.wasteTypes)}
                  >
                    <i className="fas fa-calendar-plus"></i>
                    Request Pickup
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
