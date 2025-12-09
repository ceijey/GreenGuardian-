'use client';

import { useEffect } from 'react';
import styles from './SuccessModal.module.css';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  autoCloseTime?: number; // in milliseconds
}

export default function SuccessModal({ 
  isOpen, 
  onClose, 
  title, 
  message,
  autoCloseTime = 3000 
}: SuccessModalProps) {
  useEffect(() => {
    if (isOpen && autoCloseTime > 0) {
      const timer = setTimeout(onClose, autoCloseTime);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseTime, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.content}>
          <div className={styles.checkIcon}>
            <i className="fas fa-check"></i>
          </div>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.message}>{message}</p>
        </div>
        <button onClick={onClose} className={styles.okButton}>
          OK
        </button>
      </div>
    </div>
  );
}
