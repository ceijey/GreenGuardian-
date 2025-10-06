'use client';

import { useState } from 'react';
import { User } from 'firebase/auth';
import styles from './SwapItem.module.css';

interface SwapItemData {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  imageUrl: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  isAvailable: boolean;
  estimatedValue: number;
  swapRequests?: string[];
}

interface SwapItemProps {
  item: SwapItemData;
  currentUser: User | null;
  onSwapRequest: (itemId: string) => void;
  onDelete?: (itemId: string) => void;
}

export default function SwapItem({ item, currentUser, onSwapRequest, onDelete }: SwapItemProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setDeleting(false);
    }
  };
  const [imageError, setImageError] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const handleSwapRequest = async () => {
    if (!currentUser) {
      alert('Please login to make swap requests');
      return;
    }

    if (item.ownerId === currentUser.uid) {
      alert('You cannot request to swap your own item');
      return;
    }

    if (item.swapRequests?.includes(currentUser.uid)) {
      alert('You have already requested this item');
      return;
    }

    setRequesting(true);
    try {
      await onSwapRequest(item.id);
    } finally {
      setRequesting(false);
    }
  };

  const formatDate = (timestamp: { seconds: number; nanoseconds: number } | Date | null) => {
    if (!timestamp) return 'Recently';
    
    try {
      let date: Date;
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'object' && 'seconds' in timestamp) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        return 'Recently';
      }
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'excellent': return '#4caf50';
      case 'good': return '#8bc34a';
      case 'fair': return '#ffc107';
      case 'poor': return '#ff5722';
      default: return '#757575';
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      electronics: 'fas fa-laptop',
      clothing: 'fas fa-tshirt',
      books: 'fas fa-book',
      furniture: 'fas fa-couch',
      kitchenware: 'fas fa-utensils',
      sports: 'fas fa-football-ball',
      toys: 'fas fa-gamepad',
      other: 'fas fa-box'
    };
    return icons[category] || 'fas fa-box';
  };

  return (
    <div className={styles.swapItem}>
      <div className={styles.imageContainer}>
        {!imageError && item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.title}
            onError={() => setImageError(true)}
            className={styles.itemImage}
          />
        ) : (
          <div className={styles.placeholderImage}>
            <i className={getCategoryIcon(item.category)}></i>
            <span>No Image</span>
          </div>
        )}
        
        <div className={styles.categoryBadge}>
          <i className={getCategoryIcon(item.category)}></i>
          {item.category}
        </div>
      </div>

      <div className={styles.itemContent}>
        <div className={styles.itemHeader}>
          <h3 className={styles.itemTitle}>{item.title}</h3>
          <div className={styles.itemMeta}>
            <span 
              className={styles.condition}
              style={{ color: getConditionColor(item.condition) }}
            >
              {item.condition}
            </span>
            <span className={styles.value}>${item.estimatedValue}</span>
          </div>
        </div>

        <p className={styles.itemDescription}>
          {item.description.length > 100 
            ? `${item.description.substring(0, 100)}...` 
            : item.description
          }
        </p>

        <div className={styles.itemFooter}>
          <div className={styles.ownerInfo}>
            <i className="fas fa-user"></i>
            <span>{item.ownerEmail.split('@')[0]}</span>
            <span className={styles.date}>{formatDate(item.createdAt)}</span>
          </div>

          <div className={styles.actions}>
            {item.swapRequests && item.swapRequests.length > 0 && (
              <span className={styles.requestCount}>
                {item.swapRequests.length} request{item.swapRequests.length !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={handleSwapRequest}
              disabled={
                !currentUser || 
                item.ownerId === currentUser?.uid ||
                item.swapRequests?.includes(currentUser?.uid) ||
                requesting
              }
              className={styles.swapButton}
            >
              {requesting ? (
                <><i className="fas fa-spinner fa-spin"></i> Requesting...</>
              ) : item.swapRequests?.includes(currentUser?.uid || '') ? (
                <><i className="fas fa-check"></i> Requested</>
              ) : (
                <><i className="fas fa-exchange-alt"></i> Request Swap</>
              )}
            </button>
            {/* Owner-only delete button */}
            {currentUser?.uid === item.ownerId && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={styles.deleteButton}
                style={{ marginLeft: '0.5rem', background: '#ff4d4f', color: '#fff' }}
              >
                {deleting ? (
                  <><i className="fas fa-spinner fa-spin"></i> Deleting...</>
                ) : (
                  <><i className="fas fa-trash"></i> Delete</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}