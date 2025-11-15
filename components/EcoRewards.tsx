import React, { useState } from 'react';
import styles from './EcoRewards.module.css';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';

interface RewardOption {
  id: string;
  title: string;
  cost: number;
  description?: string;
}

interface Props {
  points: number;
  userId: string;
  onRedeem?: (newPoints: number) => void;
}

export default function EcoRewards({ points, userId, onRedeem }: Props) {
  const [loading, setLoading] = useState(false);
  const [localPoints, setLocalPoints] = useState<number>(points || 0);
  const { user } = useAuth();

 const rewardOptions: RewardOption[] = [
  { id: 'discount-5', title: '5% Local Café Discount', cost: 50, description: 'Redeem for a 5% discount at participating cafés.' },
  { id: 'seed-packet', title: 'Free Seed Packet', cost: 30, description: 'A small packet of native seeds from a local partner.' },
  { id: 'garden-kit', title: 'Starter Garden Kit', cost: 120, description: 'Complete kit with seeds, soil pods, and planting guide.' },
  { id: 'eco-bag', title: 'Reusable Shopping Bag', cost: 80, description: 'Stylish and durable reusable shopping bag made from recycled materials.' },
  { id: 'grocery-voucher', title: 'Local Grocery Voucher', cost: 100, description: '$10 voucher for local, sustainable grocery stores.' },
];

  const handleRedeem = async (option: RewardOption) => {
    if (!userId || localPoints < option.cost) return;
    setLoading(true);

    try {
      // Optimistic UI update
      const newPoints = Math.max(0, localPoints - option.cost);
      setLocalPoints(newPoints);
      if (onRedeem) onRedeem(newPoints);

      // Update userStats totalScore in Firestore
      const statsRef = doc(db, 'userStats', userId);
      await updateDoc(statsRef, {
        totalScore: newPoints
      });

      // Add a redemption record
      const redemption = {
        userId,
        rewardId: option.id,
        rewardTitle: option.title,
        cost: option.cost,
        status: 'pending',
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'redemptions'), redemption);

      // Success - leave optimistic state
    } catch (err) {
      console.error('Redeem failed:', err);
      // Rollback optimistic update by reloading or adjusting
      // For simplicity, attempt to reload userStats
      try {
        const statsRef = doc(db, 'userStats', userId);
        // attempt to read fresh value
        // fallback: just set localPoints back to original (add cost)
        setLocalPoints((p) => p + option.cost);
        if (onRedeem) onRedeem(localPoints + option.cost);
      } catch (e) {
        console.error('Failed to rollback local points', e);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.rewardsCard}>
      <div className={styles.rewardsHeader}>
        <div className={styles.pointsDisplay}>Eco-Points: {localPoints}</div>
        <div className={styles.smallNote}>Use points at local partners</div>
      </div>

      <div className={styles.rewardsList}>
        {rewardOptions.map((opt) => (
          <div key={opt.id} className={styles.rewardItem}>
            <div className={styles.rewardInfo}>
              <div>
                <div className={styles.rewardTitle}>{opt.title}</div>
                <div className={styles.smallNote}>{opt.description}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className={styles.rewardCost}>{opt.cost} pts</div>
              <button
                className={styles.redeemButton}
                disabled={loading || localPoints < opt.cost}
                onClick={() => handleRedeem(opt)}
              >
                Redeem
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
