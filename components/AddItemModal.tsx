'use client';

import { useState } from 'react';
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

    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      newErrors.imageUrl = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
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
              <label htmlFor="estimatedValue">Estimated Value ($) *</label>
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
            <label htmlFor="imageUrl">Image URL (optional)</label>
            <input
              type="url"
              id="imageUrl"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleInputChange}
              placeholder="https://example.com/image.jpg"
              className={errors.imageUrl ? styles.error : ''}
            />
            {errors.imageUrl && <span className={styles.errorText}>{errors.imageUrl}</span>}
            <small>Tip: Upload your image to a service like Imgur or use a product image URL</small>
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