'use client';

import { useState, useRef } from 'react';
import { User } from 'firebase/auth';
import styles from './SwapRequestModal.module.css';

interface SwapRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (offerDetails: string, offerValue: number, offerImage?: string) => Promise<void>;
  requestedItem: {
    title: string;
    estimatedValue: number;
    ownerEmail: string;
  };
  currentUser: User | null;
}

export default function SwapRequestModal({
  isOpen,
  onClose,
  onSubmit,
  requestedItem,
  currentUser
}: SwapRequestModalProps) {
  const [offerDetails, setOfferDetails] = useState('');
  const [offerValue, setOfferValue] = useState('');
  const [offerImage, setOfferImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Compress and convert image to base64
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if image is too large
          const maxSize = 800;
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress to 0.7 quality JPEG
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            resolve(compressedBase64);
          } else {
            reject(new Error('Failed to get canvas context'));
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    try {
      const compressed = await compressImage(file);
      setOfferImage(compressed);
      setError('');
    } catch (err) {
      console.error('Error compressing image:', err);
      setError('Failed to process image');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const removeImage = () => {
    setOfferImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!offerDetails.trim()) {
      setError('Please describe what you want to offer');
      return;
    }

    if (!offerValue || parseFloat(offerValue) <= 0) {
      setError('Please enter a valid estimated value');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSubmit(offerDetails, parseFloat(offerValue), offerImage || undefined);
      
      // Reset form
      setOfferDetails('');
      setOfferValue('');
      setOfferImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      onClose();
    } catch (err) {
      console.error('Error submitting swap request:', err);
      setError('Failed to send swap request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setOfferDetails('');
      setOfferValue('');
      setOfferImage(null);
      setError('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Request Item Swap</h2>
          <button onClick={handleClose} className={styles.closeButton} disabled={submitting}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.requestedItemInfo}>
          <div className={styles.infoLabel}>You're requesting:</div>
          <div className={styles.itemTitle}>
            <i className="fas fa-box"></i>
            {requestedItem.title}
          </div>
          <div className={styles.itemDetails}>
            <span><i className="fas fa-user"></i> From: {requestedItem.ownerEmail.split('@')[0]}</span>
            <span><i className="fas fa-tag"></i> Value: ₱{requestedItem.estimatedValue}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="offerDetails">What item(s) are you offering? *</label>
            <textarea
              id="offerDetails"
              value={offerDetails}
              onChange={(e) => setOfferDetails(e.target.value)}
              placeholder="Describe what you want to swap for this item..."
              rows={4}
              disabled={submitting}
              required
            />
            <small>Be specific about the item condition, brand, and why it's a fair trade</small>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="offerValue">Estimated Value of Your Offer (₱) *</label>
            <input
              type="number"
              id="offerValue"
              value={offerValue}
              onChange={(e) => setOfferValue(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              disabled={submitting}
              required
            />
            <small>Provide a fair estimate to help the owner evaluate your offer</small>
          </div>

          <div className={styles.formGroup}>
            <label>Upload Image of Your Offer (Optional)</label>
            
            {!offerImage ? (
              <>
                <div
                  className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <i className="fas fa-cloud-upload-alt"></i>
                  <p>Drag and drop image here</p>
                  <span>or</span>
                  <div className={styles.uploadButtons}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={styles.uploadBtn}
                      disabled={submitting}
                    >
                      <i className="fas fa-folder-open"></i>
                      Choose File
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className={styles.uploadBtn}
                      disabled={submitting}
                    >
                      <i className="fas fa-camera"></i>
                      Take Photo
                    </button>
                  </div>
                  <small>Supported: JPG, PNG, GIF (max 800px, auto-compressed)</small>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </>
            ) : (
              <div className={styles.imagePreview}>
                <img src={offerImage} alt="Offer preview" />
                <button
                  type="button"
                  onClick={removeImage}
                  className={styles.removeImageBtn}
                  disabled={submitting}
                >
                  <i className="fas fa-times"></i>
                  Remove Image
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className={styles.error}>
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelButton}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Sending Request...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Send Swap Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
