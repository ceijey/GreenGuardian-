'use client';

import { useAuth } from './AuthContext';
import { recordTreePlanted, recordChallengeCompletion, recordItemSwap, recordCo2Savings } from './statsUtils';

export const useStatsTracker = () => {
  const { user } = useAuth();

  const trackTreePlanted = async (count: number = 1) => {
    if (!user) return false;
    return await recordTreePlanted(user.uid, count);
  };

  const trackChallengeCompleted = async (count: number = 1) => {
    if (!user) return false;
    return await recordChallengeCompletion(user.uid, count);
  };

  const trackItemSwapped = async (count: number = 1) => {
    if (!user) return false;
    return await recordItemSwap(user.uid, count);
  };

  const trackCo2Savings = async (kgCo2: number) => {
    if (!user) return false;
    return await recordCo2Savings(user.uid, kgCo2);
  };

  // Predefined actions for common eco-activities
  const trackEcoScan = async () => {
    // Each product scan saves approximately 0.1kg CO2 by making informed decisions
    return await trackCo2Savings(0.1);
  };

  const trackCommunityMessage = async () => {
    // Community engagement earns small environmental credit
    return await trackCo2Savings(0.01);
  };

  const trackRecycling = async () => {
    // Recycling action
    await trackCo2Savings(0.5);
    return await trackChallengeCompleted(1);
  };

  const trackSustainableChoice = async () => {
    // Making a sustainable product choice
    await trackCo2Savings(0.2);
    return await trackChallengeCompleted(1);
  };

  return {
    trackTreePlanted,
    trackChallengeCompleted,
    trackItemSwapped,
    trackCo2Savings,
    trackEcoScan,
    trackCommunityMessage,
    trackRecycling,
    trackSustainableChoice,
    isAuthenticated: !!user
  };
};