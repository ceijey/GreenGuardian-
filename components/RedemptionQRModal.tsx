import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import styles from './RedemptionQRModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExpired: () => void;
  redemptionCode: string;
  rewardTitle: string;
  rewardCost: number;
  expiresAt: Date;
}

export default function RedemptionQRModal({
  isOpen,
  onClose,
  onExpired,
  redemptionCode,
  rewardTitle,
  rewardCost,
  expiresAt
}: Props) {
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [expired, setExpired] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);

  useEffect(() => {
    // Calculate time left based on expiration timestamp
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expirationTime = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expirationTime - now) / 1000));
      return diff;
    };

    const initialTimeLeft = calculateTimeLeft();
    setTimeLeft(initialTimeLeft);
    setTotalSeconds(10 * 60); // 10 minutes total for progress bar
    
    if (initialTimeLeft <= 0) {
      setExpired(true);
      onExpired();
      return;
    }

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setExpired(true);
        onExpired();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft <= 60) return '#ef4444'; // red
    if (timeLeft <= 180) return '#f59e0b'; // orange
    return '#10b981'; // green
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Redemption QR Code</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.modalBody}>
          {!expired ? (
            <>
              <div className={styles.rewardInfo}>
                <h3>{rewardTitle}</h3>
                <p className={styles.costBadge}>
                  <i className="fas fa-coins"></i> {rewardCost} points redeemed
                </p>
              </div>

              <div className={styles.qrContainer}>
                <div className={styles.qrWrapper}>
                  <QRCodeCanvas
                    value={redemptionCode}
                    size={280}
                    level="H"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
              </div>

              <div className={styles.timerSection}>
                <div className={styles.timerLabel}>Time Remaining</div>
                <div 
                  className={styles.timerDisplay}
                  style={{ color: getTimeColor() }}
                >
                  <i className="fas fa-clock"></i>
                  {formatTime(timeLeft)}
                </div>
                <div className={styles.timerBar}>
                  <div 
                    className={styles.timerProgress}
                    style={{ 
                      width: `${(timeLeft / totalSeconds) * 100}%`,
                      backgroundColor: getTimeColor()
                    }}
                  />
                </div>
              </div>

              <div className={styles.instructions}>
                <h4>How to use:</h4>
                <ol>
                  <li>Show this QR code to the partner merchant</li>
                  <li>They will scan the code to verify your redemption</li>
                  <li>Receive your reward!</li>
                </ol>
                <p className={styles.codeDisplay}>
                  Code: <span>{redemptionCode.substring(0, 12)}...</span>
                </p>
              </div>
            </>
          ) : (
            <div className={styles.expiredState}>
              <div className={styles.expiredIcon}>
                <i className="fas fa-clock"></i>
              </div>
              <h3>QR Code Expired</h3>
              <p>This redemption code has expired. Please generate a new one to redeem your reward.</p>
              <button className={styles.closeButton} onClick={onClose}>
                Close
              </button>
            </div>
          )}
        </div>

        {!expired && (
          <div className={styles.modalFooter}>
            <button className={styles.cancelButton} onClick={onClose}>
              Cancel Redemption
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
