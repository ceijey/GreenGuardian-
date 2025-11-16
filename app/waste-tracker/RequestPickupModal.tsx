'use client';

import { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import styles from './RequestPickupModal.module.css';

interface RequestPickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  serviceName: string;
  wasteTypes: string[];
}

export default function RequestPickupModal({
  isOpen,
  onClose,
  serviceId,
  serviceName,
  wasteTypes
}: RequestPickupModalProps) {
  const { user } = useAuth();
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [selectedWasteTypes, setSelectedWasteTypes] = useState<string[]>([]);
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Pre-select all waste types
      setSelectedWasteTypes([...wasteTypes]);
      // Set minimum date to today
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setPreferredDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [isOpen, wasteTypes]);

  const handleWasteTypeToggle = (type: string) => {
    if (selectedWasteTypes.includes(type)) {
      setSelectedWasteTypes(selectedWasteTypes.filter(t => t !== type));
    } else {
      setSelectedWasteTypes([...selectedWasteTypes, type]);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoordinates({ lat, lng });

        // Reverse geocoding to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          
          if (data.display_name) {
            setAddress(data.display_name);
          } else {
            setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          }
        } catch (error) {
          console.error('Error getting address:', error);
          setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setLoadingLocation(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('Location permission denied. Please enable location access in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            alert('Location request timed out.');
            break;
          default:
            alert('An error occurred while getting your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !db) {
      alert('Please login to request pickup');
      return;
    }

    if (selectedWasteTypes.length === 0) {
      alert('Please select at least one waste type');
      return;
    }

    if (!address.trim()) {
      alert('Please provide your pickup address');
      return;
    }

    if (!contactNumber.trim()) {
      alert('Please provide your contact number');
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, 'wasteCollectionRequests'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || '',
        serviceId,
        serviceName,
        wasteTypes: selectedWasteTypes,
        preferredPickupDate: preferredDate,
        preferredPickupTime: preferredTime,
        address: address.trim(),
        coordinates: coordinates || null,
        contactNumber: contactNumber.trim(),
        estimatedWeight: estimatedWeight ? parseFloat(estimatedWeight) : null,
        notes: notes.trim(),
        status: 'pending',
        requestedDate: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      alert('Pickup request submitted successfully! The service provider will contact you soon.');
      onClose();
      
      // Reset form
      setPreferredDate('');
      setPreferredTime('');
      setAddress('');
      setCoordinates(null);
      setContactNumber('');
      setEstimatedWeight('');
      setNotes('');
      setSelectedWasteTypes([]);
    } catch (error) {
      console.error('Error submitting pickup request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>
            <i className="fas fa-calendar-plus"></i>
            Request Waste Pickup
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.serviceInfo}>
          <p><strong>Service Provider:</strong> {serviceName}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formSection}>
            <label>
              <i className="fas fa-recycle"></i>
              Waste Types *
            </label>
            <div className={styles.wasteTypeGrid}>
              {wasteTypes.map((type) => (
                <label key={type} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedWasteTypes.includes(type)}
                    onChange={() => handleWasteTypeToggle(type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                <i className="fas fa-calendar"></i>
                Preferred Pickup Date *
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>
                <i className="fas fa-clock"></i>
                Preferred Time
              </label>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>
              <i className="fas fa-map-marker-alt"></i>
              Pickup Address *
            </label>
            <div className={styles.addressInputGroup}>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your complete pickup address or use current location"
                rows={3}
                required
              />
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className={styles.locationButton}
                disabled={loadingLocation}
                title="Use my current location"
              >
                {loadingLocation ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Getting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-location-arrow"></i>
                    Use Current Location
                  </>
                )}
              </button>
            </div>
            {coordinates && (
              <div className={styles.coordinatesInfo}>
                <i className="fas fa-check-circle"></i>
                Location captured successfully
              </div>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                <i className="fas fa-phone"></i>
                Contact Number *
              </label>
              <input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+1234567890"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>
                <i className="fas fa-weight"></i>
                Estimated Weight (kg)
              </label>
              <input
                type="number"
                value={estimatedWeight}
                onChange={(e) => setEstimatedWeight(e.target.value)}
                placeholder="Optional"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>
              <i className="fas fa-sticky-note"></i>
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions or details..."
              rows={3}
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={onClose}
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
                  Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
