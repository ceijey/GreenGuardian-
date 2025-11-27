'use client';

import { useState } from 'react';
import { User } from 'firebase/auth';
import styles from './ChallengeCard.module.css';

interface Challenge {
  id: string;
  title: string;
  description: string;
  completionInstructions?: string;
  category: string;
  startDate: {
    seconds: number;
    nanoseconds: number;
  } | null;
  endDate: {
    seconds: number;
    nanoseconds: number;
  } | null;
  targetActions: number;
  participants: string[];
  badge?: {
    name: string;
    icon: string;
    color: string;
  };
  isActive: boolean;
  createdBy: string;
  sponsored?: boolean;
  sponsorName?: string;
  fundingAmount?: number;
  rewards?: string;
}

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

interface ChallengeCardProps {
  challenge: Challenge;
  currentUser: User | null;
  onJoinChallenge: (challengeId: string) => void;
  userBadges: UserBadge[];
}

export default function ChallengeCard({ challenge, currentUser, onJoinChallenge, userBadges }: ChallengeCardProps) {
  const [joining, setJoining] = useState(false);

  const formatDate = (timestamp: { seconds: number; nanoseconds: number } | null) => {
    if (!timestamp) return 'Date TBD';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysRemaining = () => {
    if (!challenge.endDate) return 0;
    const now = new Date();
    const endDate = new Date(challenge.endDate.seconds * 1000);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isUserParticipant = currentUser && challenge.participants.includes(currentUser.uid);
  const hasEarnedBadge = userBadges.some(badge => badge.challengeId === challenge.id);
  const daysRemaining = getDaysRemaining();
  
  const getChallengeStatus = () => {
    if (!challenge.startDate || !challenge.endDate) return 'upcoming';
    const now = new Date();
    const startDate = new Date(challenge.startDate.seconds * 1000);
    const endDate = new Date(challenge.endDate.seconds * 1000);
    
    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'completed';
    return 'active';
  };

  const status = getChallengeStatus();

  const handleJoin = async () => {
    if (!currentUser) {
      alert('Please log in to join challenges');
      return;
    }

    setJoining(true);
    try {
      await onJoinChallenge(challenge.id);
    } finally {
      setJoining(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'plastic-reduction': 'fas fa-bottle-water',
      'food-waste': 'fas fa-apple-alt',
      'energy-saving': 'fas fa-bolt',
      'transportation': 'fas fa-bicycle',
      'recycling': 'fas fa-recycle',
      'water-conservation': 'fas fa-tint'
    };
    return icons[category] || 'fas fa-leaf';
  };

  return (
    <div className={`${styles.challengeCard} ${styles[status]} ${challenge.sponsored ? styles.sponsored : ''}`}>
      {/* Sponsored Badge */}
      {challenge.sponsored && challenge.sponsorName && (
        <div className={styles.sponsorBadge}>
          <i className="fas fa-handshake"></i>
          <span>Sponsored by {challenge.sponsorName}</span>
          {challenge.fundingAmount && (
            <span className={styles.fundingTag}>₱{challenge.fundingAmount.toLocaleString()}</span>
          )}
        </div>
      )}

      {/* Challenge Header */}
      <div className={styles.header}>
        <div className={styles.categoryBadge}>
          <i className={getCategoryIcon(challenge.category)}></i>
          <span>{challenge.category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')}</span>
        </div>
        
        <div className={styles.statusBadge}>
          {status === 'active' && <span className={styles.active}>Active</span>}
          {status === 'upcoming' && <span className={styles.upcoming}>Upcoming</span>}
          {status === 'completed' && <span className={styles.completed}>Completed</span>}
        </div>
      </div>

      {/* Challenge Info */}
      <div className={styles.content}>
        <h3 className={styles.title}>{challenge.title}</h3>
        <p className={styles.description}>{challenge.description}</p>
        
        {/* Completion Instructions */}
        {challenge.completionInstructions && (
          <div className={styles.instructionsSection}>
            <h4 className={styles.instructionsTitle}>
              <i className="fas fa-check-circle"></i> How to Complete
            </h4>
            <p className={styles.instructionsText}>{challenge.completionInstructions}</p>
          </div>
        )}
        
        {/* Rewards Info */}
        {challenge.rewards && (
          <div className={styles.rewardsInfo}>
            <i className="fas fa-gift"></i>
            <span>{challenge.rewards}</span>
          </div>
        )}
        
        <div className={styles.details}>
          <div className={styles.dateInfo}>
            <div className={styles.date}>
              <i className="fas fa-calendar-start"></i>
              <span>Starts: {formatDate(challenge.startDate)}</span>
            </div>
            <div className={styles.date}>
              <i className="fas fa-calendar-times"></i>
              <span>Ends: {formatDate(challenge.endDate)}</span>
            </div>
          </div>

          {status === 'active' && daysRemaining > 0 && (
            <div className={styles.timeRemaining}>
              <i className="fas fa-clock"></i>
              <span>{daysRemaining} days remaining</span>
            </div>
          )}
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <i className="fas fa-users"></i>
            <span>{challenge.participants.length} participants</span>
          </div>
          <div className={styles.stat}>
            <i className="fas fa-target"></i>
            <span>{challenge.targetActions} actions needed</span>
          </div>
        </div>
      </div>

      {/* Badge Preview */}
      {challenge.badge && (
        <div className={styles.badge}>
          <div className={styles.badgeIcon} style={{ color: challenge.badge?.color || '#4CAF50' }}>
            <i className={challenge.badge?.icon || 'fas fa-award'}></i>
          </div>
          <div className={styles.badgeInfo}>
            <span className={styles.badgeName}>{challenge.badge?.name || 'Challenge Badge'}</span>
            {hasEarnedBadge && (
              <span className={styles.earned}>
                <i className="fas fa-check-circle"></i> Earned!
              </span>
            )}
          </div>
        </div>
      )}

      {/* How to Join Instructions */}
      {!isUserParticipant && currentUser && status === 'active' && (
        <div className={styles.joinInstructions}>
          <h4 className={styles.joinInstructionsTitle}>
            <i className="fas fa-hand-point-right"></i> How to Join
          </h4>
          <ol className={styles.joinStepsList}>
            <li>Click the "Join Challenge" button below</li>
            <li>Complete {challenge.targetActions} eco-friendly actions</li>
            <li>Log your progress in your dashboard</li>
            <li>Earn your badge when you reach the goal!</li>
          </ol>
          {challenge.completionInstructions && (
            <div className={styles.joinNote}>
              <i className="fas fa-lightbulb"></i>
              <span>Check the "How to Complete" section above for detailed requirements</span>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      <div className={styles.actions}>
        {!currentUser ? (
          <button className={styles.loginButton} onClick={() => alert('Please log in to join challenges')}>
            Log in to Join
          </button>
        ) : isUserParticipant ? (
          <div className={styles.participantStatus}>
            <i className="fas fa-check-circle"></i>
            <span>You're participating!</span>
          </div>
        ) : status === 'completed' ? (
          <button className={styles.completedButton} disabled>
            Challenge Ended
          </button>
        ) : (
          <button
            className={styles.joinButton}
            onClick={handleJoin}
            disabled={joining || status === 'upcoming'}
          >
            {joining ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Joining...
              </>
            ) : status === 'upcoming' ? (
              'Coming Soon'
            ) : (
              'Join Challenge'
            )}
          </button>
        )}
      </div>
    </div>
  );
}