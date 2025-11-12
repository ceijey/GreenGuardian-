'use client';

import { useState, useEffect } from 'react';
import { 
  getUserLocation, 
  getSavedUserLocation, 
  saveUserLocation,
  clearSavedUserLocation,
  formatLocation,
  isGeolocationSupported,
  PHILIPPINE_REGIONS,
  PHILIPPINE_CITIES,
  UserLocation 
} from '@/lib/locationUtils';
import styles from './LocationPicker.module.css';

interface LocationPickerProps {
  onLocationChange: (location: UserLocation | null) => void;
  initialLocation?: UserLocation | null;
}

export default function LocationPicker({ onLocationChange, initialLocation }: LocationPickerProps) {
  const [location, setLocation] = useState<UserLocation | null>(initialLocation || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [availableCities, setAvailableCities] = useState<Array<{ name: string; lat: number; lng: number }>>([]);

  useEffect(() => {
    // Try to load saved location on mount
    const savedLocation = getSavedUserLocation();
    if (savedLocation && !initialLocation) {
      setLocation(savedLocation);
      onLocationChange(savedLocation);
    }
  }, []);

  const handleGetLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const userLocation = await getUserLocation();
      setLocation(userLocation);
      saveUserLocation(userLocation);
      onLocationChange(userLocation);
      setShowManualPicker(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      
      // If permission denied, show manual picker
      if (errorMessage.includes('permission')) {
        setShowManualPicker(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegionChange = (regionCode: string) => {
    setSelectedRegion(regionCode);
    setSelectedCity('');
    
    if (regionCode && PHILIPPINE_CITIES[regionCode]) {
      setAvailableCities(PHILIPPINE_CITIES[regionCode]);
    } else {
      setAvailableCities([]);
    }
  };

  const handleManualLocationSelect = () => {
    if (!selectedRegion) {
      setError('Please select a region');
      return;
    }

    if (!selectedCity) {
      setError('Please select a city');
      return;
    }

    const region = PHILIPPINE_REGIONS.find(r => r.code === selectedRegion);
    const city = availableCities.find(c => c.name === selectedCity);
    
    if (!region || !city) return;

    // Create a location object with the selected region and city
    const manualLocation: UserLocation = {
      latitude: city.lat,
      longitude: city.lng,
      city: city.name,
      region: region.name,
      country: 'Philippines'
    };

    setLocation(manualLocation);
    saveUserLocation(manualLocation);
    onLocationChange(manualLocation);
    setShowManualPicker(false);
    setSelectedRegion('');
    setSelectedCity('');
    setAvailableCities([]);
    setError(null);
  };

  const handleClearLocation = () => {
    setLocation(null);
    clearSavedUserLocation();
    onLocationChange(null);
    setShowManualPicker(false);
    setSelectedRegion('');
    setSelectedCity('');
    setAvailableCities([]);
    setError(null);
  };

  return (
    <div className={styles.container}>
      {!location ? (
        <div className={styles.setupCard}>
          <div className={styles.icon}>
            <i className="fas fa-map-marker-alt"></i>
          </div>
          <h3>Set Your Location</h3>
          <p>Get environmental data and projects relevant to your area</p>

          {error && (
            <div className={styles.error}>
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          {!showManualPicker ? (
            <div className={styles.actions}>
              {isGeolocationSupported() && (
                <button
                  onClick={handleGetLocation}
                  disabled={loading}
                  className={styles.primaryButton}
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner}></span>
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-location-arrow"></i>
                      Use My Current Location
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setShowManualPicker(true)}
                className={styles.secondaryButton}
              >
                <i className="fas fa-map"></i>
                Select Region Manually
              </button>
            </div>
          ) : (
            <div className={styles.manualPicker}>
              <label htmlFor="region-select">Select Your Region:</label>
              <select
                id="region-select"
                value={selectedRegion}
                onChange={(e) => handleRegionChange(e.target.value)}
                className={styles.select}
              >
                <option value="">-- Choose a region --</option>
                {PHILIPPINE_REGIONS.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.name}
                  </option>
                ))}
              </select>

              {selectedRegion && availableCities.length > 0 && (
                <>
                  <label htmlFor="city-select">Select Your City:</label>
                  <select
                    id="city-select"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className={styles.select}
                  >
                    <option value="">-- Choose a city --</option>
                    {availableCities.map((city) => (
                      <option key={city.name} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <div className={styles.manualActions}>
                <button
                  onClick={handleManualLocationSelect}
                  className={styles.primaryButton}
                  disabled={!selectedRegion || !selectedCity}
                >
                  <i className="fas fa-check"></i>
                  Confirm Location
                </button>
                <button
                  onClick={() => {
                    setShowManualPicker(false);
                    setSelectedRegion('');
                    setSelectedCity('');
                    setAvailableCities([]);
                  }}
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.locationBadge}>
          <div className={styles.locationInfo}>
            <i className="fas fa-map-marker-alt"></i>
            <div>
              <strong>{formatLocation(location)}</strong>
              <small>
                {location.accuracy 
                  ? `Accuracy: ${Math.round(location.accuracy)}m` 
                  : 'Manual selection'}
              </small>
            </div>
          </div>
          <button
            onClick={handleClearLocation}
            className={styles.changeButton}
            title="Change location"
          >
            <i className="fas fa-edit"></i>
          </button>
        </div>
      )}

      {location && (
        <div className={styles.tip}>
          <i className="fas fa-info-circle"></i>
          <span>
            Showing data within 50km of your location. 
            Location updates every hour.
          </span>
        </div>
      )}
    </div>
  );
}
