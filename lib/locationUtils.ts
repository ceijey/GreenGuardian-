import { collection, query, where, getDocs, GeoPoint } from 'firebase/firestore';
import { db } from './firebase';

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  accuracy?: number;
}

export interface LocationPermission {
  granted: boolean;
  error?: string;
}

/**
 * Request user's location permission and get coordinates
 */
export const getUserLocation = (): Promise<UserLocation> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        // Try to get city and region info using reverse geocoding
        try {
          const geocodedInfo = await reverseGeocode(
            position.coords.latitude,
            position.coords.longitude
          );
          resolve({ ...location, ...geocodedInfo });
        } catch (error) {
          // If reverse geocoding fails, still return coordinates
          console.warn('Reverse geocoding failed:', error);
          resolve(location);
        }
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // Cache for 5 minutes
      }
    );
  });
};

/**
 * Reverse geocode coordinates to get city/region information
 * Uses OpenStreetMap Nominatim API (free, no API key needed)
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<{ city?: string; region?: string; country?: string }> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
    );

    if (!response.ok) {
      throw new Error('Geocoding API request failed');
    }

    const data = await response.json();
    
    return {
      city: data.address?.city || 
            data.address?.municipality || 
            data.address?.town || 
            data.address?.village ||
            'Unknown City',
      region: data.address?.state || 
              data.address?.province || 
              data.address?.region ||
              'Unknown Region',
      country: data.address?.country || 'Unknown Country'
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
};

/**
 * Calculate distance between two coordinates in kilometers
 * Uses Haversine formula
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Filter pollution hotspots by proximity to user location
 */
export const filterHotspotsByLocation = async (
  userLocation: UserLocation,
  radiusKm: number = 50
) => {
  try {
    const hotspotsSnapshot = await getDocs(collection(db, 'pollutionHotspots'));
    const nearbyHotspots: any[] = [];

    hotspotsSnapshot.forEach((doc) => {
      const hotspot = doc.data();
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        hotspot.location.latitude,
        hotspot.location.longitude
      );

      if (distance <= radiusKm) {
        nearbyHotspots.push({
          id: doc.id,
          ...hotspot,
          distance: Math.round(distance * 10) / 10 // Round to 1 decimal
        });
      }
    });

    // Sort by distance (nearest first)
    nearbyHotspots.sort((a, b) => a.distance - b.distance);

    return nearbyHotspots;
  } catch (error) {
    console.error('Error filtering hotspots:', error);
    throw error;
  }
};

/**
 * Filter local projects by proximity to user location
 */
export const filterProjectsByLocation = async (
  userLocation: UserLocation,
  radiusKm: number = 50
) => {
  try {
    const projectsSnapshot = await getDocs(collection(db, 'localProjects'));
    const nearbyProjects: any[] = [];

    projectsSnapshot.forEach((doc) => {
      const project = doc.data();
      
      // Projects might have location string, we need to parse coordinates
      // For now, we'll use a simple location matching
      const projectLocation = project.location?.toLowerCase() || '';
      const userCity = userLocation.city?.toLowerCase() || '';
      const userRegion = userLocation.region?.toLowerCase() || '';

      if (
        projectLocation.includes(userCity) ||
        projectLocation.includes(userRegion) ||
        projectLocation.includes('metro manila') // Default region
      ) {
        nearbyProjects.push({
          id: doc.id,
          ...project
        });
      }
    });

    return nearbyProjects;
  } catch (error) {
    console.error('Error filtering projects:', error);
    throw error;
  }
};

/**
 * Get region-specific environmental data
 */
export const getRegionalEnvironmentalData = async (
  userLocation: UserLocation
) => {
  try {
    // For now, we have a single environmental data document
    // In a production app, you'd have regional documents
    const region = userLocation.region || 'Metro Manila';
    
    // Try to get region-specific data, fall back to default
    const regionKey = region.toLowerCase().replace(/\s+/g, '-');
    
    return {
      region,
      regionKey,
      message: `Showing environmental data for ${region}`
    };
  } catch (error) {
    console.error('Error getting regional data:', error);
    throw error;
  }
};

/**
 * Save user location to localStorage for persistence
 */
export const saveUserLocation = (location: UserLocation): void => {
  try {
    localStorage.setItem('userLocation', JSON.stringify(location));
    localStorage.setItem('locationTimestamp', Date.now().toString());
  } catch (error) {
    console.error('Error saving location to localStorage:', error);
  }
};

/**
 * Get saved user location from localStorage
 */
export const getSavedUserLocation = (): UserLocation | null => {
  try {
    const savedLocation = localStorage.getItem('userLocation');
    const timestamp = localStorage.getItem('locationTimestamp');
    
    if (!savedLocation || !timestamp) {
      return null;
    }

    // Check if location is older than 1 hour (3600000 ms)
    const age = Date.now() - parseInt(timestamp);
    if (age > 3600000) {
      // Location too old, clear it
      clearSavedUserLocation();
      return null;
    }

    return JSON.parse(savedLocation);
  } catch (error) {
    console.error('Error retrieving saved location:', error);
    return null;
  }
};

/**
 * Clear saved user location
 */
export const clearSavedUserLocation = (): void => {
  try {
    localStorage.removeItem('userLocation');
    localStorage.removeItem('locationTimestamp');
  } catch (error) {
    console.error('Error clearing saved location:', error);
  }
};

/**
 * Format location string for display
 */
export const formatLocation = (location: UserLocation): string => {
  if (location.city && location.region) {
    return `${location.city}, ${location.region}`;
  } else if (location.city) {
    return location.city;
  } else if (location.region) {
    return location.region;
  } else {
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }
};

/**
 * Check if browser supports geolocation
 */
export const isGeolocationSupported = (): boolean => {
  return 'geolocation' in navigator;
};

/**
 * Get Philippines regions for fallback selection
 */
export const PHILIPPINE_REGIONS = [
  { code: 'NCR', name: 'National Capital Region (Metro Manila)' },
  { code: 'CAR', name: 'Cordillera Administrative Region' },
  { code: 'R1', name: 'Region I (Ilocos Region)' },
  { code: 'R2', name: 'Region II (Cagayan Valley)' },
  { code: 'R3', name: 'Region III (Central Luzon)' },
  { code: 'R4A', name: 'Region IV-A (CALABARZON)' },
  { code: 'R4B', name: 'Region IV-B (MIMAROPA)' },
  { code: 'R5', name: 'Region V (Bicol Region)' },
  { code: 'R6', name: 'Region VI (Western Visayas)' },
  { code: 'R7', name: 'Region VII (Central Visayas)' },
  { code: 'R8', name: 'Region VIII (Eastern Visayas)' },
  { code: 'R9', name: 'Region IX (Zamboanga Peninsula)' },
  { code: 'R10', name: 'Region X (Northern Mindanao)' },
  { code: 'R11', name: 'Region XI (Davao Region)' },
  { code: 'R12', name: 'Region XII (SOCCSKSARGEN)' },
  { code: 'R13', name: 'Region XIII (Caraga)' },
  { code: 'BARMM', name: 'Bangsamoro Autonomous Region in Muslim Mindanao' }
];

/**
 * Philippine cities/municipalities by region with approximate coordinates
 */
export const PHILIPPINE_CITIES: Record<string, Array<{ name: string; lat: number; lng: number }>> = {
  'NCR': [
    { name: 'Manila', lat: 14.5995, lng: 120.9842 },
    { name: 'Quezon City', lat: 14.6760, lng: 121.0437 },
    { name: 'Makati', lat: 14.5547, lng: 121.0244 },
    { name: 'Pasig', lat: 14.5764, lng: 121.0851 },
    { name: 'Taguig', lat: 14.5176, lng: 121.0509 },
    { name: 'Pasay', lat: 14.5378, lng: 120.9896 },
    { name: 'Caloocan', lat: 14.6490, lng: 120.9820 },
    { name: 'Mandaluyong', lat: 14.5794, lng: 121.0359 },
    { name: 'Parañaque', lat: 14.4793, lng: 121.0198 },
    { name: 'Las Piñas', lat: 14.4453, lng: 120.9820 },
    { name: 'Muntinlupa', lat: 14.3811, lng: 121.0437 },
    { name: 'Marikina', lat: 14.6507, lng: 121.1029 },
    { name: 'Valenzuela', lat: 14.7000, lng: 120.9830 },
    { name: 'Malabon', lat: 14.6620, lng: 120.9569 },
    { name: 'Navotas', lat: 14.6686, lng: 120.9411 },
    { name: 'San Juan', lat: 14.6019, lng: 121.0355 },
    { name: 'Pateros', lat: 14.5440, lng: 121.0658 }
  ],
  'CAR': [
    { name: 'Baguio City', lat: 16.4023, lng: 120.5960 },
    { name: 'La Trinidad', lat: 16.4592, lng: 120.5869 },
    { name: 'Tabuk', lat: 17.4189, lng: 121.4443 },
    { name: 'Bontoc', lat: 17.0898, lng: 120.9774 }
  ],
  'R1': [
    { name: 'San Fernando (La Union)', lat: 16.6159, lng: 120.3209 },
    { name: 'Laoag City', lat: 18.1987, lng: 120.5937 },
    { name: 'Vigan City', lat: 17.5747, lng: 120.3869 },
    { name: 'Dagupan City', lat: 16.0433, lng: 120.3334 },
    { name: 'Urdaneta City', lat: 15.9761, lng: 120.5711 }
  ],
  'R2': [
    { name: 'Tuguegarao City', lat: 17.6132, lng: 121.7270 },
    { name: 'Ilagan City', lat: 17.1450, lng: 121.8894 },
    { name: 'Cauayan City', lat: 16.9270, lng: 121.7707 },
    { name: 'Santiago City', lat: 16.6877, lng: 121.5467 }
  ],
  'R3': [
    { name: 'San Fernando (Pampanga)', lat: 15.0285, lng: 120.6897 },
    { name: 'Angeles City', lat: 15.1450, lng: 120.5887 },
    { name: 'Olongapo City', lat: 14.8294, lng: 120.2824 },
    { name: 'Malolos City', lat: 14.8433, lng: 120.8114 },
    { name: 'Tarlac City', lat: 15.4754, lng: 120.5963 },
    { name: 'Cabanatuan City', lat: 15.4855, lng: 120.9671 },
    { name: 'Balanga City', lat: 14.6760, lng: 120.5368 }
  ],
  'R4A': [
    { name: 'Calamba City', lat: 14.2116, lng: 121.1654 },
    { name: 'Batangas City', lat: 13.7565, lng: 121.0583 },
    { name: 'Lucena City', lat: 13.9372, lng: 121.6171 },
    { name: 'Antipolo City', lat: 14.5860, lng: 121.1757 },
    { name: 'Biñan City', lat: 14.3335, lng: 121.0806 },
    { name: 'Santa Rosa City', lat: 14.3123, lng: 121.1113 },
    { name: 'Cavite City', lat: 14.4791, lng: 120.8964 },
    { name: 'Tagaytay City', lat: 14.1093, lng: 120.9604 }
  ],
  'R4B': [
    { name: 'Calapan City', lat: 13.4116, lng: 121.1803 },
    { name: 'Puerto Princesa City', lat: 9.7392, lng: 118.7353 },
    { name: 'San Jose', lat: 12.3525, lng: 121.0687 }
  ],
  'R5': [
    { name: 'Naga City', lat: 13.6218, lng: 123.1948 },
    { name: 'Legazpi City', lat: 13.1391, lng: 123.7437 },
    { name: 'Iriga City', lat: 13.4217, lng: 123.4106 },
    { name: 'Sorsogon City', lat: 12.9739, lng: 124.0073 }
  ],
  'R6': [
    { name: 'Iloilo City', lat: 10.7202, lng: 122.5621 },
    { name: 'Bacolod City', lat: 10.6770, lng: 122.9506 },
    { name: 'Kalibo', lat: 11.7048, lng: 122.3679 },
    { name: 'Roxas City', lat: 11.5854, lng: 122.7510 }
  ],
  'R7': [
    { name: 'Cebu City', lat: 10.3157, lng: 123.8854 },
    { name: 'Mandaue City', lat: 10.3237, lng: 123.9223 },
    { name: 'Lapu-Lapu City', lat: 10.3103, lng: 123.9494 },
    { name: 'Tagbilaran City', lat: 9.6478, lng: 123.8533 },
    { name: 'Dumaguete City', lat: 9.3068, lng: 123.3054 }
  ],
  'R8': [
    { name: 'Tacloban City', lat: 11.2447, lng: 125.0038 },
    { name: 'Ormoc City', lat: 11.0059, lng: 124.6074 },
    { name: 'Calbayog City', lat: 12.0664, lng: 124.5963 },
    { name: 'Catbalogan City', lat: 11.7752, lng: 124.8862 }
  ],
  'R9': [
    { name: 'Zamboanga City', lat: 6.9214, lng: 122.0790 },
    { name: 'Pagadian City', lat: 7.8250, lng: 123.4358 },
    { name: 'Dipolog City', lat: 8.5836, lng: 123.3409 }
  ],
  'R10': [
    { name: 'Cagayan de Oro City', lat: 8.4542, lng: 124.6319 },
    { name: 'Iligan City', lat: 8.2280, lng: 124.2452 },
    { name: 'Valencia City', lat: 7.9064, lng: 125.0942 },
    { name: 'Gingoog City', lat: 8.8262, lng: 125.0985 }
  ],
  'R11': [
    { name: 'Davao City', lat: 7.1907, lng: 125.4553 },
    { name: 'Tagum City', lat: 7.4479, lng: 125.8078 },
    { name: 'Digos City', lat: 6.7498, lng: 125.3571 },
    { name: 'Panabo City', lat: 7.3081, lng: 125.6836 },
    { name: 'Samal City', lat: 7.0731, lng: 125.7098 }
  ],
  'R12': [
    { name: 'General Santos City', lat: 6.1164, lng: 125.1716 },
    { name: 'Koronadal City', lat: 6.5008, lng: 124.8469 },
    { name: 'Kidapawan City', lat: 7.0109, lng: 125.0896 },
    { name: 'Tacurong City', lat: 6.6891, lng: 124.6778 }
  ],
  'R13': [
    { name: 'Butuan City', lat: 8.9475, lng: 125.5406 },
    { name: 'Surigao City', lat: 9.7847, lng: 125.4911 },
    { name: 'Bayugan City', lat: 8.7136, lng: 125.7442 },
    { name: 'Bislig City', lat: 8.2060, lng: 126.3219 }
  ],
  'BARMM': [
    { name: 'Cotabato City', lat: 7.2232, lng: 124.2450 },
    { name: 'Marawi City', lat: 8.0008, lng: 124.2915 },
    { name: 'Lamitan City', lat: 6.6528, lng: 122.1378 }
  ]
};
