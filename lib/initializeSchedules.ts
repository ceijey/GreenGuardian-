import { collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface CollectionSchedule {
  id?: string;
  wasteType: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  dayName: string;
  frequency: string;
  location: string;
  time?: string;
}

const SAMPLE_SCHEDULES: CollectionSchedule[] = [
  {
    wasteType: 'Plastic & Metal',
    dayOfWeek: 1, // Monday
    dayName: 'Monday',
    frequency: 'Weekly',
    location: 'Main Street Collection Point',
    time: '08:00 AM'
  },
  {
    wasteType: 'Paper & Cardboard',
    dayOfWeek: 3, // Wednesday
    dayName: 'Wednesday',
    frequency: 'Weekly',
    location: 'Main Street Collection Point',
    time: '08:00 AM'
  },
  {
    wasteType: 'Glass',
    dayOfWeek: 5, // Friday
    dayName: 'Friday',
    frequency: 'Weekly',
    location: 'Main Street Collection Point',
    time: '08:00 AM'
  },
  {
    wasteType: 'Organic Waste',
    dayOfWeek: 2, // Tuesday
    dayName: 'Tuesday',
    frequency: 'Weekly',
    location: 'Community Garden - Zone A',
    time: '10:00 AM'
  },
  {
    wasteType: 'E-Waste',
    dayOfWeek: 4, // Thursday
    dayName: 'Thursday',
    frequency: 'Bi-weekly',
    location: 'Tech Center Building B',
    time: '02:00 PM'
  }
];

export async function initializeCollectionSchedules() {
  try {
    const schedulesCollection = collection(db, 'collectionSchedules');
    const q = query(schedulesCollection);
    const snapshot = await getDocs(q);

    // If schedules already exist, don't re-add them
    if (snapshot.size > 0) {
      console.log('Collection schedules already initialized');
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Add sample schedules
    const addedSchedules = [];
    for (const schedule of SAMPLE_SCHEDULES) {
      const docRef = await addDoc(schedulesCollection, {
        ...schedule,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      addedSchedules.push({ id: docRef.id, ...schedule });
    }

    console.log('Collection schedules initialized successfully');
    return addedSchedules;
  } catch (error) {
    console.error('Error initializing collection schedules:', error);
    return [];
  }
}

export function getNextCollectionDate(dayOfWeek: number): Date {
  const today = new Date();
  const currentDay = today.getDay();
  const daysAhead = dayOfWeek - currentDay;
  
  const nextDate = new Date(today);
  if (daysAhead <= 0) {
    nextDate.setDate(today.getDate() + (7 + daysAhead));
  } else {
    nextDate.setDate(today.getDate() + daysAhead);
  }
  
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export function getDaysUntilCollection(dayOfWeek: number): number {
  const nextDate = getNextCollectionDate(dayOfWeek);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function canCollectWasteToday(wasteType: string, schedules: CollectionSchedule[]): boolean {
  const today = new Date();
  const currentDay = today.getDay();
  
  return schedules.some(schedule => 
    schedule.wasteType.toLowerCase().includes(wasteType.toLowerCase()) &&
    schedule.dayOfWeek === currentDay
  );
}

export function getScheduleForWasteType(wasteType: string, schedules: CollectionSchedule[]): CollectionSchedule | undefined {
  return schedules.find(schedule =>
    schedule.wasteType.toLowerCase().includes(wasteType.toLowerCase())
  );
}
