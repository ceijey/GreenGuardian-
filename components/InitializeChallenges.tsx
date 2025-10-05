'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function InitializeChallenges() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  const sampleChallenges = [
    {
      title: "Zero Plastic October",
      description: "Avoid single-use plastics for the entire month of October. Track your plastic-free days and inspire others!",
      category: "plastic-reduction",
      startDate: new Date(2025, 9, 1), // October 1, 2025
      endDate: new Date(2025, 9, 31), // October 31, 2025
      targetActions: 30,
      participants: [],
      badge: {
        name: "Plastic-Free Hero",
        icon: "fas fa-shield-alt",
        color: "#2196F3"
      },
      isActive: true,
      createdBy: "system"
    },
    {
      title: "Food Waste Warriors",
      description: "Reduce food waste by composting, meal planning, and creative leftover use. Every bit counts!",
      category: "food-waste",
      startDate: new Date(2025, 9, 15), // October 15, 2025
      endDate: new Date(2025, 10, 14), // November 14, 2025
      targetActions: 20,
      participants: [],
      badge: {
        name: "Food Saver",
        icon: "fas fa-apple-alt",
        color: "#4CAF50"
      },
      isActive: true,
      createdBy: "system"
    },
    {
      title: "Energy Efficiency November",
      description: "Save energy through mindful consumption. Turn off lights, use efficient appliances, and track your savings!",
      category: "energy-saving",
      startDate: new Date(2025, 10, 1), // November 1, 2025
      endDate: new Date(2025, 10, 30), // November 30, 2025
      targetActions: 25,
      participants: [],
      badge: {
        name: "Energy Saver",
        icon: "fas fa-bolt",
        color: "#FF9800"
      },
      isActive: false,
      createdBy: "system"
    },
    {
      title: "Green Transportation Week",
      description: "Use eco-friendly transport methods: walking, biking, public transport, or carpooling for one week.",
      category: "transportation",
      startDate: new Date(2025, 9, 21), // October 21, 2025
      endDate: new Date(2025, 9, 27), // October 27, 2025
      targetActions: 7,
      participants: [],
      badge: {
        name: "Green Commuter",
        icon: "fas fa-bicycle",
        color: "#8BC34A"
      },
      isActive: true,
      createdBy: "system"
    },
    {
      title: "Water Conservation Challenge",
      description: "Conserve water through shorter showers, fixing leaks, and efficient usage. Every drop matters!",
      category: "water-conservation",
      startDate: new Date(2025, 9, 10), // October 10, 2025
      endDate: new Date(2025, 11, 9), // December 9, 2025
      targetActions: 15,
      participants: [],
      badge: {
        name: "Water Guardian",
        icon: "fas fa-tint",
        color: "#03A9F4"
      },
      isActive: true,
      createdBy: "system"
    }
  ];

  const initializeChallenges = async () => {
    if (!user || isInitialized) return;

    try {
      console.log('Initializing sample challenges...');
      
      for (const challenge of sampleChallenges) {
        await addDoc(collection(db, 'challenges'), {
          ...challenge,
          startDate: serverTimestamp(),
          endDate: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      }
      
      setIsInitialized(true);
      console.log('Sample challenges initialized!');
    } catch (error) {
      console.error('Error initializing challenges:', error);
    }
  };

  useEffect(() => {
    // Auto-initialize when user logs in (only run once)
    if (user && !isInitialized) {
      const hasRun = localStorage.getItem('challengesInitialized');
      if (!hasRun) {
        initializeChallenges();
        localStorage.setItem('challengesInitialized', 'true');
      }
    }
  }, [user, isInitialized]);

  if (!user) {
    return null;
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Checking for challenges...</p>
      {!isInitialized && (
        <button
          onClick={initializeChallenges}
          style={{
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Initialize Sample Challenges
        </button>
      )}
    </div>
  );
}