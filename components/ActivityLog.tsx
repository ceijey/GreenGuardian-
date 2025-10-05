'use client';

import styles from './ActivityLog.module.css';

interface UserAction {
  id: string;
  type: string;
  description: string;
  points: number;
  impact: {
    co2Saved?: number;
    plasticSaved?: number;
    foodSaved?: number;
    energySaved?: number;
    waterSaved?: number;
  };
  timestamp?: {
    seconds: number;
    nanoseconds: number;
  } | null;
  verified: boolean;
}

interface ActivityLogProps {
  actions: UserAction[];
}

export default function ActivityLog({ actions }: ActivityLogProps) {
  const formatDate = (timestamp?: { seconds: number; nanoseconds: number } | null) => {
    if (!timestamp || !timestamp.seconds) {
      return 'Recently';
    }
    
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getActionIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'recycle': 'fas fa-recycle',
      'food-save': 'fas fa-apple-alt',
      'energy-save': 'fas fa-bolt',
      'transport': 'fas fa-bicycle',
      'challenge': 'fas fa-trophy',
      'swap': 'fas fa-exchange-alt',
      'scanner': 'fas fa-camera'
    };
    return icons[type] || 'fas fa-leaf';
  };

  const getActionColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'recycle': '#9C27B0',
      'food-save': '#4CAF50',
      'energy-save': '#FF9800',
      'transport': '#2196F3',
      'challenge': '#FFD700',
      'swap': '#00BCD4',
      'scanner': '#607D8B'
    };
    return colors[type] || '#4CAF50';
  };

  const getMainImpact = (impact: UserAction['impact']) => {
    if (impact.co2Saved && impact.co2Saved > 0) {
      return `${impact.co2Saved.toFixed(1)}kg CO₂ saved`;
    }
    if (impact.plasticSaved && impact.plasticSaved > 0) {
      return `${impact.plasticSaved} plastic items saved`;
    }
    if (impact.foodSaved && impact.foodSaved > 0) {
      return `${impact.foodSaved.toFixed(1)}kg food saved`;
    }
    if (impact.energySaved && impact.energySaved > 0) {
      return `${impact.energySaved.toFixed(1)}kWh energy saved`;
    }
    if (impact.waterSaved && impact.waterSaved > 0) {
      return `${impact.waterSaved}L water saved`;
    }
    return null;
  };

  if (actions.length === 0) {
    return (
      <div className={styles.emptyState}>
        <i className="fas fa-clipboard-list"></i>
        <h3>No activity yet</h3>
        <p>Start logging your eco-actions to see them here!</p>
      </div>
    );
  }

  return (
    <div className={styles.activityLog}>
      <div className={styles.timeline}>
        {actions.map((action, index) => (
          <div key={action.id} className={styles.timelineItem}>
            <div 
              className={styles.timelineIcon}
              style={{ backgroundColor: getActionColor(action.type) }}
            >
              <i className={getActionIcon(action.type)}></i>
            </div>
            
            <div className={styles.timelineContent}>
              <div className={styles.actionHeader}>
                <h4 className={styles.actionTitle}>{action.description}</h4>
                <div className={styles.actionMeta}>
                  <span className={styles.points}>+{action.points} pts</span>
                  {action.verified && (
                    <span className={styles.verified}>
                      <i className="fas fa-check-circle"></i>
                      Verified
                    </span>
                  )}
                </div>
              </div>
              
              {getMainImpact(action.impact) && (
                <div className={styles.impact}>
                  <i className="fas fa-leaf"></i>
                  {getMainImpact(action.impact)}
                </div>
              )}
              
              <div className={styles.actionTime}>
                {formatDate(action.timestamp)}
              </div>
            </div>
            
            {index < actions.length - 1 && (
              <div className={styles.timelineLine}></div>
            )}
          </div>
        ))}
      </div>
      
      {actions.length >= 20 && (
        <div className={styles.loadMore}>
          <button className={styles.loadMoreButton}>
            Load More Activities
          </button>
        </div>
      )}
    </div>
  );
}