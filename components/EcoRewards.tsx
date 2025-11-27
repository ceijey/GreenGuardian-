import React, { useState } from 'react';
import styles from './EcoRewards.module.css';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import RedemptionQRModal from './RedemptionQRModal';

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
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentRedemption, setCurrentRedemption] = useState<{
    code: string;
    title: string;
    cost: number;
    expiresAt: Date;
  } | null>(null);

 const rewardOptions: RewardOption[] = [
  { id: 'discount-5', title: '5% Local Café Discount', cost: 50, description: 'Redeem for a 5% discount at participating cafés.' },
  { id: 'seed-packet', title: 'Free Seed Packet', cost: 30, description: 'A small packet of native seeds from a local partner.' },
  { id: 'garden-kit', title: 'Starter Garden Kit', cost: 120, description: 'Complete kit with seeds, soil pods, and planting guide.' },
  { id: 'eco-bag', title: 'Reusable Shopping Bag', cost: 80, description: 'Stylish and durable reusable shopping bag made from recycled materials.' },
  { id: 'grocery-voucher', title: 'Local Grocery Voucher', cost: 100, description: '₱500 voucher for local, sustainable grocery stores.' },
];

  const generateRedemptionCode = () => {
    // Generate a unique redemption code
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `ECO-${timestamp}-${random}`.toUpperCase();
  };

  const handleRedeem = async (option: RewardOption) => {
    if (!userId || localPoints < option.cost) return;
    setLoading(true);

    try {
      // Generate unique redemption code
      const redemptionCode = generateRedemptionCode();
      const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      // Optimistic UI update
      const newPoints = Math.max(0, localPoints - option.cost);
      setLocalPoints(newPoints);
      if (onRedeem) onRedeem(newPoints);

      // Update userStats totalScore in Firestore
      const statsRef = doc(db, 'userStats', userId);
      await updateDoc(statsRef, {
        totalScore: newPoints
      });

      // Add a redemption record with QR code and expiration
      const redemption = {
        userId,
        rewardId: option.id,
        rewardTitle: option.title,
        cost: option.cost,
        status: 'pending',
        redemptionCode,
        expiresAt: expirationTime,
        createdAt: serverTimestamp(),
        usedAt: null
      };
      await addDoc(collection(db, 'redemptions'), redemption);

      // Show QR modal with redemption code
      setCurrentRedemption({
        code: redemptionCode,
        title: option.title,
        cost: option.cost,
        expiresAt: expirationTime
      });
      setShowQRModal(true);
    } catch (err) {
      console.error('Redeem failed:', err);
      // Rollback optimistic update
      try {
        setLocalPoints((p) => p + option.cost);
        if (onRedeem) onRedeem(localPoints + option.cost);
      } catch (e) {
        console.error('Failed to rollback local points', e);
      }
      alert('Failed to redeem reward. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    // Keep redemption data so user can reopen it
  };

  const handleExpired = () => {
    // Clear redemption when it actually expires
    setShowQRModal(false);
    setCurrentRedemption(null);
  };

  const handleReopenQR = () => {
    if (currentRedemption) {
      setShowQRModal(true);
    }
  };

  return (
    <>
      <div className={styles.rewardsCard}>
        <div className={styles.rewardsHeader}>
          <div className={styles.pointsDisplay}>Eco-Points: {localPoints}</div>
          <div className={styles.smallNote}>Use points at local partners</div>
        </div>

        <div className={styles.rewardsList}>
          {rewardOptions.map((opt) => {
            const hasActiveRedemption = currentRedemption && currentRedemption.title === opt.title;
            return (
              <div key={opt.id} className={styles.rewardItem}>
                <div className={styles.rewardInfo}>
                  <div>
                    <div className={styles.rewardTitle}>{opt.title}</div>
                    <div className={styles.smallNote}>{opt.description}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className={styles.rewardCost}>{opt.cost} pts</div>
                  {hasActiveRedemption ? (
                    <button
                      className={styles.viewQRButton}
                      onClick={handleReopenQR}
                    >
                      View QR
                    </button>
                  ) : (
                    <button
                      className={styles.redeemButton}
                      disabled={loading || localPoints < opt.cost}
                      onClick={() => handleRedeem(opt)}
                    >
                      Redeem
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {currentRedemption && (
        <RedemptionQRModal
          isOpen={showQRModal}
          onClose={handleCloseQRModal}
          onExpired={handleExpired}
          redemptionCode={currentRedemption.code}
          rewardTitle={currentRedemption.title}
          rewardCost={currentRedemption.cost}
          expiresAt={currentRedemption.expiresAt}
        />
      )}
    </>
  );
}
