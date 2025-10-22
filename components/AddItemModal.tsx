'use client';

import { useState, useRef } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './AddItemModal.module.css';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export default function AddItemModal({ isOpen, onClose, currentUser }: AddItemModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    condition: 'good',
    estimatedValue: '',
    imageUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'books', label: 'Books' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'kitchenware', label: 'Kitchenware' },
    { value: 'sports', label: 'Sports & Fitness' },
    { value: 'toys', label: 'Toys & Games' },
    { value: 'other', label: 'Other' }
  ];

  const conditions = [
    { value: 'excellent', label: 'Excellent', description: 'Like new, no visible wear' },
    { value: 'good', label: 'Good', description: 'Minor signs of wear' },
    { value: 'fair', label: 'Fair', description: 'Noticeable wear but functional' },
    { value: 'poor', label: 'Poor', description: 'Heavy wear, may need repair' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Compress image to base64 (max 500KB for Firestore)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize to max 800px width while maintaining aspect ratio
          const maxWidth = 800;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with quality adjustment
          let quality = 0.7;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          
          // If still too large, reduce quality further
          while (compressedDataUrl.length > 500000 && quality > 0.1) {
            quality -= 0.1;
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          
          if (compressedDataUrl.length > 500000) {
            reject(new Error('Image is too large even after compression. Please use a smaller image.'));
          } else {
            resolve(compressedDataUrl);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, imageUrl: 'Please upload an image file' }));
      return;
    }
    
    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, imageUrl: 'Image must be smaller than 5MB' }));
      return;
    }
    
    setUploadingImage(true);
    try {
      const compressedImage = await compressImage(file);
      setFormData(prev => ({ ...prev, imageUrl: compressedImage }));
      setImagePreview(compressedImage);
      setErrors(prev => ({ ...prev, imageUrl: '' }));
    } catch (error) {
      console.error('Error compressing image:', error);
      setErrors(prev => ({ 
        ...prev, 
        imageUrl: error instanceof Error ? error.message : 'Failed to process image' 
      }));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
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

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.estimatedValue || parseFloat(formData.estimatedValue) < 0) {
      newErrors.estimatedValue = 'Please enter a valid estimated value';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('Please login to add items');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'swapItems'), {
        ...formData,
        estimatedValue: parseFloat(formData.estimatedValue),
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email,
        createdAt: serverTimestamp(),
        isAvailable: true,
        swapRequests: []
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'other',
        condition: 'good',
        estimatedValue: '',
        imageUrl: ''
      });

      onClose();
      alert('Item added successfully!');
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Add New Item</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Item Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="What are you swapping?"
              className={errors.title ? styles.error : ''}
            />
            {errors.title && <span className={styles.errorText}>{errors.title}</span>}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="estimatedValue">Estimated Value (₱) *</label>
              <input
                type="number"
                id="estimatedValue"
                name="estimatedValue"
                value={formData.estimatedValue}
                onChange={handleInputChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={errors.estimatedValue ? styles.error : ''}
              />
              {errors.estimatedValue && <span className={styles.errorText}>{errors.estimatedValue}</span>}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="condition">Condition</label>
            <div className={styles.conditionOptions}>
              {conditions.map(cond => (
                <label key={cond.value} className={styles.conditionOption}>
                  <input
                    type="radio"
                    name="condition"
                    value={cond.value}
                    checked={formData.condition === cond.value}
                    onChange={handleInputChange}
                  />
                  <div className={styles.conditionLabel}>
                    <span className={styles.conditionName}>{cond.label}</span>
                    <span className={styles.conditionDesc}>{cond.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your item, its condition, and any details..."
              rows={4}
              className={errors.description ? styles.error : ''}
            />
            {errors.description && <span className={styles.errorText}>{errors.description}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>Item Photo</label>
            {!imagePreview ? (
              <div
                className={`${styles.imageUploadZone} ${isDragging ? styles.dragging : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {uploadingImage ? (
                  <div className={styles.uploadingState}>
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Compressing image...</p>
                  </div>
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt"></i>
                    <p>Drag & drop image here</p>
                    <p className={styles.orText}>or</p>
                    <div className={styles.uploadButtons}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={styles.uploadButton}
                      >
                        <i className="fas fa-folder-open"></i>
                        Choose File
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className={styles.uploadButton}
                      >
                        <i className="fas fa-camera"></i>
                        Take Photo
                      </button>
                    </div>
                    <small>Max 5MB • Will be compressed for storage</small>
                  </>
                )}
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
              </div>
            ) : (
              <div className={styles.imagePreviewContainer}>
                <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
                <button
                  type="button"
                  onClick={removeImage}
                  className={styles.removeImageButton}
                  title="Remove image"
                >
                  <i className="fas fa-times"></i>
                </button>
                <div className={styles.imageInfo}>
                  <i className="fas fa-check-circle"></i>
                  Image compressed and ready
                </div>
              </div>
            )}
            {errors.imageUrl && <span className={styles.errorText}>{errors.imageUrl}</span>}
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Adding...
                </>
              ) : (
                <>
                  <i className="fas fa-plus"></i>
                  Add Item
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}