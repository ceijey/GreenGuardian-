'use client';

import styles from './BadgeDisplay.module.css';

interface UserBadge {
  id: string;
  challengeId: string;
  badgeName: string;
  badgeIcon: string;
  badgeColor: string;
  earnedAt: {
    seconds: number;
    nanoseconds: number;
  };
}

interface BadgeDisplayProps {
  badge: UserBadge;
  size?: 'small' | 'medium' | 'large';
  showDate?: boolean;
}

export default function BadgeDisplay({ badge, size = 'medium', showDate = true }: BadgeDisplayProps) {
  const formatDate = (timestamp: { seconds: number; nanoseconds: number }) => {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={`${styles.badgeDisplay} ${styles[size]}`}>
      <div className={styles.badgeContainer}>
        <div 
          className={styles.badgeIcon}
          style={{ 
            color: badge.badgeColor,
            backgroundColor: `${badge.badgeColor}15`
          }}
        >
          <i className={badge.badgeIcon}></i>
        </div>
        
        <div className={styles.badgeInfo}>
          <h4 className={styles.badgeName}>{badge.badgeName}</h4>
          {showDate && (
            <p className={styles.earnedDate}>
              Earned on {formatDate(badge.earnedAt)}
            </p>
          )}
        </div>
      </div>
      
      {/* Shine effect for newly earned badges */}
      <div className={styles.shine}></div>
    </div>
  );
}