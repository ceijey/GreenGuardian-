'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import SuccessModal from './SuccessModal';
import styles from './ActionLogger.module.css';

interface ActionLoggerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ActionLogger({ isOpen, onClose }: ActionLoggerProps) {
  const { user } = useAuth();
  const [actionType, setActionType] = useState('');
  const [description, setDescription] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });

  const actionTypes = [
    {
      id: 'recycle',
      label: 'Recycling',
      icon: 'fas fa-recycle',
      descriptions: [
        'Recycled plastic bottles',
        'Recycled glass containers', 
        'Recycled paper/cardboard',
        'Recycled electronics',
        'Custom'
      ],
      points: 10,
      impact: { plasticSaved: 1, co2Saved: 0.5 }
    },
    {
      id: 'food-save',
      label: 'Food Waste Prevention',
      icon: 'fas fa-apple-alt',
      descriptions: [
        'Composted food scraps',
        'Donated surplus food',
        'Used leftovers creatively',
        'Meal planned to reduce waste',
        'Custom'
      ],
      points: 15,
      impact: { foodSaved: 0.5, co2Saved: 0.8 }
    },
    {
      id: 'energy-save',
      label: 'Energy Conservation',
      icon: 'fas fa-bolt',
      descriptions: [
        'Turned off lights/electronics',
        'Used energy-efficient appliances',
        'Air-dried clothes instead of dryer',
        'Reduced heating/cooling usage',
        'Custom'
      ],
      points: 12,
      impact: { energySaved: 2, co2Saved: 1.2 }
    },
    {
      id: 'transport',
      label: 'Green Transportation',
      icon: 'fas fa-bicycle',
      descriptions: [
        'Walked instead of driving',
        'Biked to destination',
        'Used public transport',
        'Carpooled with others',
        'Custom'
      ],
      points: 20,
      impact: { co2Saved: 2.5 }
    },
    {
      id: 'water-save',
      label: 'Water Conservation',
      icon: 'fas fa-tint',
      descriptions: [
        'Fixed water leaks',
        'Took shorter showers',
        'Used rain water for plants',
        'Installed water-efficient fixtures',
        'Custom'
      ],
      points: 8,
      impact: { waterSaved: 10, co2Saved: 0.3 }
    }
  ];

  const selectedActionType = actionTypes.find(type => type.id === actionType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !actionType || (!description && !customDescription)) return;

    setLoading(true);
    try {
      const finalDescription = description === 'Custom' ? customDescription : description;
      const selectedType = actionTypes.find(type => type.id === actionType);
      
      if (!selectedType) return;

      const totalPoints = selectedType.points * quantity;
      const scaledImpact = Object.fromEntries(
        Object.entries(selectedType.impact).map(([key, value]) => [key, value * quantity])
      );

      // Add the action to userActions collection
      await addDoc(collection(db, 'userActions'), {
        userId: user.uid,
        type: actionType,
        description: finalDescription,
        quantity: quantity,
        points: totalPoints,
        impact: scaledImpact,
        timestamp: serverTimestamp(),
        verified: false, // Could be verified by admin later
        userEmail: user.email
      });

      // Update or create user stats
      const userStatsRef = doc(db, 'userStats', user.uid);
      try {
        await updateDoc(userStatsRef, {
          totalScore: increment(totalPoints),
          weeklyScore: increment(totalPoints),
          monthlyScore: increment(totalPoints),
          totalActions: increment(1),
          'totalImpact.co2Saved': increment(scaledImpact.co2Saved || 0),
          'totalImpact.plasticSaved': increment(scaledImpact.plasticSaved || 0),
          'totalImpact.foodSaved': increment(scaledImpact.foodSaved || 0),
          'totalImpact.energySaved': increment(scaledImpact.energySaved || 0),
          'totalImpact.waterSaved': increment(scaledImpact.waterSaved || 0),
          lastActionDate: serverTimestamp()
        });
      } catch (error) {
        // If document doesn't exist, create it
        await setDoc(userStatsRef, {
          totalScore: totalPoints,
          weeklyScore: totalPoints,
          monthlyScore: totalPoints,
          rank: 0,
          totalActions: 1,
          streakDays: 1,
          level: Math.floor(totalPoints / 100) + 1,
          nextLevelPoints: (Math.floor(totalPoints / 100) + 1) * 100,
          badges: 0,
          totalImpact: {
            co2Saved: scaledImpact.co2Saved || 0,
            plasticSaved: scaledImpact.plasticSaved || 0,
            foodSaved: scaledImpact.foodSaved || 0,
            energySaved: scaledImpact.energySaved || 0,
            waterSaved: scaledImpact.waterSaved || 0
          },
          lastActionDate: serverTimestamp()
        });
      }

      // Update or create community stats
      const communityStatsRef = doc(db, 'communityStats', 'globalImpact');
      try {
        await updateDoc(communityStatsRef, {
          totalActions: increment(1),
          plasticBottlesSaved: increment(scaledImpact.plasticSaved || 0),
          foodWastePrevented: increment(scaledImpact.foodSaved || 0),
          co2Reduced: increment(scaledImpact.co2Saved || 0),
          energySaved: increment(scaledImpact.energySaved || 0),
          waterConserved: increment(scaledImpact.waterSaved || 0),
          itemsRecycled: increment(actionType === 'recycle' ? quantity : 0),
          totalUsers: increment(0) // We'll update this separately
        });
      } catch (error) {
        // If document doesn't exist, create it
        await setDoc(communityStatsRef, {
          plasticBottlesSaved: scaledImpact.plasticSaved || 0,
          foodWastePrevented: scaledImpact.foodSaved || 0,
          co2Reduced: scaledImpact.co2Saved || 0,
          energySaved: scaledImpact.energySaved || 0,
          waterConserved: scaledImpact.waterSaved || 0,
          itemsRecycled: actionType === 'recycle' ? quantity : 0,
          totalUsers: 1,
          totalActions: 1
        });
      }

      // Reset form
      setActionType('');
      setDescription('');
      setCustomDescription('');
      setQuantity(1);
      
      setSuccessModal({ 
        isOpen: true, 
        title: 'Great job!', 
        message: `Your completion has been recorded. You earned ${totalPoints} points!` 
      });
      
      // Close the form after a short delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error logging action:', error);
      setSuccessModal({ 
        isOpen: true, 
        title: 'Error', 
        message: 'Failed to log action. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Log Eco-Action</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Action Type</label>
            <div className={styles.actionTypes}>
              {actionTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  className={`${styles.actionTypeButton} ${actionType === type.id ? styles.selected : ''}`}
                  onClick={() => {
                    setActionType(type.id);
                    setDescription('');
                    setCustomDescription('');
                  }}
                >
                  <i className={type.icon}></i>
                  <span>{type.label}</span>
                  <small>+{type.points} pts</small>
                </button>
              ))}
            </div>
          </div>

          {selectedActionType && (
            <>
              <div className={styles.field}>
                <label>What did you do?</label>
                <select
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                >
                  <option value="">Select an action...</option>
                  {selectedActionType.descriptions.map((desc, index) => (
                    <option key={index} value={desc}>
                      {desc}
                    </option>
                  ))}
                </select>
              </div>

              {description === 'Custom' && (
                <div className={styles.field}>
                  <label>Describe your action</label>
                  <input
                    type="text"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="What did you do?"
                    required
                  />
                </div>
              )}

              <div className={styles.field}>
                <label>Quantity/Times</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
                <small>How many times or items?</small>
              </div>

              <div className={styles.impactPreview}>
                <h4>Impact Preview</h4>
                <div className={styles.impactItems}>
                  <div className={styles.impactItem}>
                    <i className="fas fa-star"></i>
                    <span>{selectedActionType.points * quantity} points</span>
                  </div>
                  {Object.entries(selectedActionType.impact).map(([key, value]) => (
                    <div key={key} className={styles.impactItem}>
                      <i className="fas fa-leaf"></i>
                      <span>
                        {(value * quantity).toFixed(1)}{' '}
                        {key === 'co2Saved' ? 'kg CO₂' : 
                         key === 'plasticSaved' ? 'plastic items' :
                         key === 'foodSaved' ? 'kg food' :
                         key === 'energySaved' ? 'kWh energy' :
                         key === 'waterSaved' ? 'L water' : ''} saved
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || !actionType || (!description && !customDescription)}
            >
              {loading ? 'Logging...' : 'Log Action'}
            </button>
          </div>
        </form>
      </div>

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, title: '', message: '' })}
        title={successModal.title}
        message={successModal.message}
        autoCloseTime={3000}
      />
    </div>
  );
}