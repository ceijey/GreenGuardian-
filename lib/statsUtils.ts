'use client';

import { doc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface UserStats {
  userId: string;
  treesPlanted?: number;
  challengesCompleted?: number;
  itemsSwapped?: number;
  co2Saved?: number; // in kg
  lastUpdated?: any;
}

export interface GlobalStats {
  totalUsers: number;
  totalTreesPlanted: number;
  totalChallengesCompleted: number;
  totalItemsSwapped: number;
  totalCo2Saved: number;
  lastUpdated: any;
}

// Update user's personal stats
export const updateUserStats = async (userId: string, updates: Partial<UserStats>) => {
  try {
    const userStatsRef = doc(db, 'userStats', userId);
    
    const updateData: any = {
      userId,
      lastUpdated: serverTimestamp(),
      ...Object.fromEntries(
        Object.entries(updates).map(([key, value]) => [key, increment(value as number)])
      )
    };

    await setDoc(userStatsRef, updateData, { merge: true });
    
    // Also update global stats
    await updateGlobalStats(updates);
    
    return true;
  } catch (error) {
    console.error('Error updating user stats:', error);
    return false;
  }
};

// Update global aggregated stats
export const updateGlobalStats = async (updates: Partial<UserStats>) => {
  try {
    const globalStatsRef = doc(db, 'globalStats', 'aggregate');
    
    const updateData: any = {
      lastUpdated: serverTimestamp()
    };

    if (updates.treesPlanted) {
      updateData.totalTreesPlanted = increment(updates.treesPlanted);
    }
    if (updates.challengesCompleted) {
      updateData.totalChallengesCompleted = increment(updates.challengesCompleted);
    }
    if (updates.itemsSwapped) {
      updateData.totalItemsSwapped = increment(updates.itemsSwapped);
    }
    if (updates.co2Saved) {
      updateData.totalCo2Saved = increment(updates.co2Saved);
    }

    await setDoc(globalStatsRef, updateData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating global stats:', error);
    return false;
  }
};

// Helper function to record tree planting
export const recordTreePlanted = async (userId: string, count: number = 1) => {
  return await updateUserStats(userId, { treesPlanted: count });
};

// Helper function to record challenge completion  
export const recordChallengeCompletion = async (userId: string, count: number = 1) => {
  return await updateUserStats(userId, { challengesCompleted: count });
};

// Helper function to record item swap
export const recordItemSwap = async (userId: string, count: number = 1) => {
  return await updateUserStats(userId, { itemsSwapped: count });
};

// Helper function to record CO2 savings
export const recordCo2Savings = async (userId: string, kgCo2: number) => {
  return await updateUserStats(userId, { co2Saved: kgCo2 });
};

// Initialize global stats document if it doesn't exist
export const initializeGlobalStats = async () => {
  try {
    const globalStatsRef = doc(db, 'globalStats', 'aggregate');
    await setDoc(globalStatsRef, {
      totalUsers: 0,
      totalTreesPlanted: 0,
      totalChallengesCompleted: 0,
      totalItemsSwapped: 0,
      totalCo2Saved: 0,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error initializing global stats:', error);
    return false;
  }
};