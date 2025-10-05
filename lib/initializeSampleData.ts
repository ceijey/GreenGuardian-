'use client';

import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const initializeSampleUserData = async (userId: string, userEmail: string) => {
  try {
    // Add sample user stats
    const userStatsRef = doc(db, 'userStats', userId);
    await setDoc(userStatsRef, {
      userId,
      itemsScanned: 5,
      itemsSwapped: 2, 
      challengesCompleted: 8,
      treesPlanted: 3,
      co2Saved: 2.5, // kg
      lastUpdated: serverTimestamp()
    }, { merge: true });

    // Add sample product scans
    const sampleScans = [
      { item: 'Water Bottle', category: 'Beverage Container', carbonFootprint: 82, waterFootprint: 5.4, ecoScore: 6 },
      { item: 'Coffee Cup', category: 'Beverage Container', carbonFootprint: 45, waterFootprint: 2.1, ecoScore: 4 },
      { item: 'Apple', category: 'Food', carbonFootprint: 25, waterFootprint: 70, ecoScore: 8 },
      { item: 'Plastic Bag', category: 'Packaging', carbonFootprint: 15, waterFootprint: 0.8, ecoScore: 2 },
      { item: 'Banana', category: 'Food', carbonFootprint: 18, waterFootprint: 9.2, ecoScore: 9 }
    ];

    for (const scan of sampleScans) {
      await addDoc(collection(db, 'userProductScans'), {
        userId,
        userEmail,
        item: scan.item,
        category: scan.category,
        carbonFootprint: scan.carbonFootprint,
        waterFootprint: scan.waterFootprint,
        recyclable: scan.ecoScore > 6,
        ecoScore: scan.ecoScore,
        timestamp: serverTimestamp(),
        scanDate: new Date().toISOString().split('T')[0]
      });
    }

    // Update global stats
    const globalStatsRef = doc(db, 'globalStats', 'aggregate');
    await setDoc(globalStatsRef, {
      totalUsers: 1,
      totalTreesPlanted: 15,
      totalChallengesCompleted: 25,
      totalItemsSwapped: 8,
      totalCo2Saved: 12.5,
      lastUpdated: serverTimestamp()
    }, { merge: true });

    console.log('Sample data initialized for user:', userId);
    return true;
  } catch (error) {
    console.error('Error initializing sample data:', error);
    return false;
  }
};