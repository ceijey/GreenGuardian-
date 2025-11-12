import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp,
  addDoc 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Initialize Firebase with realistic environmental data
 * This replaces hardcoded data with cloud-based centralized storage
 */

// Environmental Data for Community Dashboard
export const initializeEnvironmentalData = async () => {
  try {
    const envRef = doc(db, 'communityStats', 'environmentalData');
    
    await setDoc(envRef, {
      airQualityIndex: Math.floor(Math.random() * 150) + 50, // 50-200 range
      waterQualityIndex: Math.floor(Math.random() * 40) + 60, // 60-100 range
      wasteGenerated: Math.floor(Math.random() * 5000) + 10000, // 10000-15000 kg
      recyclingRate: Math.floor(Math.random() * 30) + 25, // 25-55%
      timestamp: serverTimestamp(),
      lastUpdated: new Date().toISOString(),
      region: 'Metro Manila',
      sources: {
        airQuality: 'DENR Monitoring Station',
        waterQuality: 'MWSS Water Testing Lab',
        wasteData: 'MMDA Waste Management'
      }
    });

    console.log('✅ Environmental data initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing environmental data:', error);
    return false;
  }
};

// Local Eco-Projects
export const initializeLocalProjects = async () => {
  try {
    const projects = [
      {
        title: 'Manila Bay Coastal Cleanup',
        description: 'Monthly beach cleanup initiative to restore Manila Bay\'s natural beauty and protect marine life.',
        category: 'cleanup',
        location: 'Manila Bay, Pasay City',
        participants: 150,
        status: 'ongoing',
        impact: {
          wasteCollected: 2500,
          co2Reduced: 150
        },
        startDate: new Date('2024-01-15'),
        endDate: new Date('2025-12-31'),
        organizer: 'Manila Bay Coalition',
        contactEmail: 'cleanup@manilabay.org'
      },
      {
        title: 'Quezon City Urban Forest',
        description: 'Large-scale tree planting project to create urban green spaces and improve air quality.',
        category: 'tree-planting',
        location: 'Quezon Memorial Circle, QC',
        participants: 320,
        status: 'ongoing',
        impact: {
          treesPlanted: 5000,
          co2Reduced: 800
        },
        startDate: new Date('2024-03-01'),
        endDate: new Date('2025-06-30'),
        organizer: 'QC Green Initiative',
        contactEmail: 'trees@qcgreen.org'
      },
      {
        title: 'Pasig River Rehabilitation',
        description: 'Community-driven effort to clean and restore the Pasig River ecosystem.',
        category: 'water-conservation',
        location: 'Pasig River, Multiple Cities',
        participants: 280,
        status: 'ongoing',
        impact: {
          wasteCollected: 8000,
          waterQualityImproved: 35
        },
        startDate: new Date('2024-02-10'),
        endDate: new Date('2026-02-10'),
        organizer: 'Pasig River Rangers',
        contactEmail: 'info@pasigriver.org'
      },
      {
        title: 'Subic Bay Marine Conservation',
        description: 'Protecting and rehabilitating Subic Bay\'s marine ecosystem through coral planting and coastal cleanup.',
        category: 'water-conservation',
        location: 'Subic Bay, Olongapo City',
        participants: 85,
        status: 'ongoing',
        impact: {
          coralPlanted: 500,
          wasteCollected: 1200,
          co2Reduced: 80
        },
        startDate: new Date('2024-06-01'),
        endDate: new Date('2025-12-31'),
        organizer: 'Subic Bay Marine Alliance',
        contactEmail: 'marine@subicbay.org'
      },
      {
        title: 'Olongapo Urban Gardening Initiative',
        description: 'Community gardens promoting organic farming and local food production in urban areas.',
        category: 'tree-planting',
        location: 'Gordon Heights, Olongapo City',
        participants: 45,
        status: 'ongoing',
        impact: {
          treesPlanted: 300,
          co2Reduced: 50
        },
        startDate: new Date('2024-04-15'),
        endDate: new Date('2025-10-31'),
        organizer: 'Olongapo Green Thumbs',
        contactEmail: 'gardens@olongapo.org'
      },
      {
        title: 'Clark Green Energy Project',
        description: 'Installing solar panels and promoting renewable energy adoption in Clark Freeport Zone.',
        category: 'education',
        location: 'Clark Freeport Zone, Angeles City',
        participants: 120,
        status: 'ongoing',
        impact: {
          co2Reduced: 450,
          energySaved: 5000
        },
        startDate: new Date('2024-01-10'),
        endDate: new Date('2025-12-31'),
        organizer: 'Clark Renewable Energy Alliance',
        contactEmail: 'solar@clark.org'
      },
      {
        title: 'Zambales Coastal Cleanup Drive',
        description: 'Monthly beach cleanup activities along Zambales coastline to protect marine wildlife.',
        category: 'cleanup',
        location: 'Various Beaches, Zambales',
        participants: 95,
        status: 'ongoing',
        impact: {
          wasteCollected: 1800,
          co2Reduced: 70
        },
        startDate: new Date('2024-03-20'),
        endDate: new Date('2025-09-30'),
        organizer: 'Zambales Coastal Warriors',
        contactEmail: 'cleanup@zambales.org'
      },
      {
        title: 'Zero Waste Schools Program',
        description: 'Educational program teaching students about waste segregation, composting, and sustainable living.',
        category: 'education',
        location: '50 Public Schools Metro-wide',
        participants: 12500,
        status: 'ongoing',
        impact: {
          wasteCollected: 15000,
          co2Reduced: 450
        },
        startDate: new Date('2024-06-01'),
        endDate: new Date('2025-05-31'),
        organizer: 'DepEd Environmental Education',
        contactEmail: 'zerowaste@deped.gov.ph'
      },
      {
        title: 'Makati Green Rooftop Initiative',
        description: 'Transform building rooftops into urban gardens to reduce heat and improve air quality.',
        category: 'tree-planting',
        location: 'Makati CBD',
        participants: 75,
        status: 'upcoming',
        impact: {
          treesPlanted: 0
        },
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-12-31'),
        organizer: 'Makati Urban Farming',
        contactEmail: 'rooftop@makatigarden.org'
      },
      {
        title: 'Taguig Community Composting',
        description: 'Neighborhood composting program to reduce organic waste and create natural fertilizer.',
        category: 'education',
        location: 'BGC and Taguig Residential Areas',
        participants: 450,
        status: 'ongoing',
        impact: {
          wasteCollected: 3200,
          co2Reduced: 180
        },
        startDate: new Date('2024-04-15'),
        endDate: new Date('2025-04-15'),
        organizer: 'Taguig Eco Warriors',
        contactEmail: 'compost@taguigeco.org'
      }
    ];

    const projectsCollection = collection(db, 'localProjects');
    
    for (const project of projects) {
      await addDoc(projectsCollection, {
        ...project,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      });
    }

    console.log(`✅ ${projects.length} local projects initialized`);
    return true;
  } catch (error) {
    console.error('❌ Error initializing local projects:', error);
    return false;
  }
};

// Pollution Hotspots for Geospatial Map
export const initializePollutionHotspots = async () => {
  try {
    const hotspots = [
      {
        location: {
          latitude: 14.5547,
          longitude: 121.0244,
          address: 'Smokey Mountain, Tondo, Manila'
        },
        type: 'illegal-dumping',
        severity: 'critical',
        reports: 47,
        description: 'Large-scale waste accumulation area',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 14.5995,
          longitude: 120.9842,
          address: 'EDSA-Quezon Avenue, Quezon City'
        },
        type: 'air-pollution',
        severity: 'high',
        reports: 32,
        description: 'Heavy traffic pollution zone',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 14.5378,
          longitude: 121.0196,
          address: 'Pasig River near Guadalupe Bridge'
        },
        type: 'water-contamination',
        severity: 'high',
        reports: 28,
        description: 'Industrial discharge affecting water quality',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 14.6760,
          longitude: 121.0437,
          address: 'Sierra Madre Foothills, Rodriguez, Rizal'
        },
        type: 'deforestation',
        severity: 'medium',
        reports: 15,
        description: 'Illegal logging activities reported',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 14.5764,
          longitude: 120.9836,
          address: 'North Harbor, Manila'
        },
        type: 'water-contamination',
        severity: 'medium',
        reports: 19,
        description: 'Port waste management issues',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 14.5515,
          longitude: 121.0499,
          address: 'Manggahan Floodway, Pasig City'
        },
        type: 'illegal-dumping',
        severity: 'high',
        reports: 35,
        description: 'Illegal waste disposal along waterway',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 14.6209,
          longitude: 121.0335,
          address: 'Commonwealth Avenue, Quezon City'
        },
        type: 'air-pollution',
        severity: 'medium',
        reports: 22,
        description: 'Vehicle emissions exceeding safe levels',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 14.4713,
          longitude: 121.0453,
          address: 'Laguna de Bay, Taguig'
        },
        type: 'water-contamination',
        severity: 'critical',
        reports: 41,
        description: 'Agricultural runoff and sewage contamination',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 14.5894,
          longitude: 121.0578,
          address: 'Payatas Landfill, Quezon City'
        },
        type: 'illegal-dumping',
        severity: 'critical',
        reports: 53,
        description: 'Overfilled landfill with leachate problems',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 14.4833,
          longitude: 121.0167,
          address: 'C-5 Road Industrial Area, Taguig'
        },
        type: 'air-pollution',
        severity: 'medium',
        reports: 18,
        description: 'Factory emissions affecting residential areas',
        lastUpdated: serverTimestamp()
      },
      // Central Luzon (Region III) Hotspots
      {
        location: {
          latitude: 14.8294,
          longitude: 120.2824,
          address: 'Subic Bay Waterfront, Olongapo City'
        },
        type: 'water-contamination',
        severity: 'high',
        reports: 24,
        description: 'Marine pollution from port activities and waste runoff',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 14.8450,
          longitude: 120.2650,
          address: 'Gordon Heights, Olongapo City'
        },
        type: 'illegal-dumping',
        severity: 'medium',
        reports: 12,
        description: 'Residential waste accumulation in abandoned areas',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 14.8100,
          longitude: 120.3100,
          address: 'East Bajac-Bajac, Olongapo City'
        },
        type: 'air-pollution',
        severity: 'low',
        reports: 8,
        description: 'Occasional smoke from open burning',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 14.8520,
          longitude: 120.2480,
          address: 'Subic Bay Freeport Zone'
        },
        type: 'water-contamination',
        severity: 'medium',
        reports: 16,
        description: 'Industrial discharge affecting coastal waters',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 15.1450,
          longitude: 120.5887,
          address: 'Clark Freeport Zone, Angeles City'
        },
        type: 'air-pollution',
        severity: 'medium',
        reports: 20,
        description: 'Airport and industrial emissions',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 15.0285,
          longitude: 120.6897,
          address: 'San Fernando River, Pampanga'
        },
        type: 'water-contamination',
        severity: 'high',
        reports: 28,
        description: 'Agricultural runoff and sewage affecting river quality',
        lastUpdated: serverTimestamp()
      },
      {
        location: {
          latitude: 14.8200,
          longitude: 120.5200,
          address: 'Bataan Nuclear Power Plant Area'
        },
        type: 'deforestation',
        severity: 'low',
        reports: 6,
        description: 'Minor vegetation clearing for development',
        lastUpdated: serverTimestamp()
      }
    ];

    const hotspotsCollection = collection(db, 'pollutionHotspots');
    
    for (const hotspot of hotspots) {
      await addDoc(hotspotsCollection, hotspot);
    }

    console.log(`✅ ${hotspots.length} pollution hotspots initialized`);
    return true;
  } catch (error) {
    console.error('❌ Error initializing pollution hotspots:', error);
    return false;
  }
};

// Environmental Changes Over Time
export const initializeEnvironmentalChanges = async () => {
  try {
    const changes = [
      {
        location: { latitude: 14.5995, longitude: 120.9842 },
        changeType: 'improvement',
        metric: 'Air Quality Index',
        value: 12,
        timestamp: serverTimestamp(),
        period: 'Last 30 days'
      },
      {
        location: { latitude: 14.5547, longitude: 121.0244 },
        changeType: 'degradation',
        metric: 'Water Quality',
        value: 8,
        timestamp: serverTimestamp(),
        period: 'Last 30 days'
      },
      {
        location: { latitude: 14.5515, longitude: 121.0499 },
        changeType: 'improvement',
        metric: 'Waste Management',
        value: 15,
        timestamp: serverTimestamp(),
        period: 'Last 90 days'
      },
      {
        location: { latitude: 14.6209, longitude: 121.0335 },
        changeType: 'improvement',
        metric: 'Tree Coverage',
        value: 7,
        timestamp: serverTimestamp(),
        period: 'Last 180 days'
      },
      {
        location: { latitude: 14.4713, longitude: 121.0453 },
        changeType: 'degradation',
        metric: 'Water Pollution',
        value: 11,
        timestamp: serverTimestamp(),
        period: 'Last 60 days'
      }
    ];

    const changesCollection = collection(db, 'environmentalChanges');
    
    for (const change of changes) {
      await addDoc(changesCollection, change);
    }

    console.log(`✅ ${changes.length} environmental changes initialized`);
    return true;
  } catch (error) {
    console.error('❌ Error initializing environmental changes:', error);
    return false;
  }
};

// Master initialization function
export const initializeAllData = async () => {
  console.log('🚀 Starting Firebase data initialization...');
  
  const results = await Promise.all([
    initializeEnvironmentalData(),
    initializeLocalProjects(),
    initializePollutionHotspots(),
    initializeEnvironmentalChanges()
  ]);

  const allSuccess = results.every(result => result === true);
  
  if (allSuccess) {
    console.log('✅ All data initialized successfully!');
    console.log('📊 Cloud-based data integration complete');
  } else {
    console.log('⚠️ Some data initialization failed. Check errors above.');
  }

  return allSuccess;
};

// Helper function to update environmental data periodically
export const updateEnvironmentalMetrics = async () => {
  try {
    const envRef = doc(db, 'communityStats', 'environmentalData');
    
    // Simulate realistic changes
    const currentData = {
      airQualityIndex: Math.floor(Math.random() * 150) + 50,
      waterQualityIndex: Math.floor(Math.random() * 40) + 60,
      wasteGenerated: Math.floor(Math.random() * 5000) + 10000,
      recyclingRate: Math.floor(Math.random() * 30) + 25,
      timestamp: serverTimestamp(),
      lastUpdated: new Date().toISOString()
    };

    await setDoc(envRef, currentData, { merge: true });
    console.log('✅ Environmental metrics updated');
    return true;
  } catch (error) {
    console.error('❌ Error updating environmental metrics:', error);
    return false;
  }
};

// Clear all collections (for re-initialization)
export const clearAllData = async () => {
  try {
    const { getDocs, deleteDoc } = await import('firebase/firestore');
    
    console.log('🗑️ Clearing old data from Firebase...');
    
    // Clear pollution hotspots
    const hotspotsSnapshot = await getDocs(collection(db, 'pollutionHotspots'));
    const hotspotDeletes = hotspotsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(hotspotDeletes);
    console.log(`✅ Cleared ${hotspotsSnapshot.size} pollution hotspots`);
    
    // Clear local projects
    const projectsSnapshot = await getDocs(collection(db, 'localProjects'));
    const projectDeletes = projectsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(projectDeletes);
    console.log(`✅ Cleared ${projectsSnapshot.size} local projects`);
    
    // Clear environmental changes
    const changesSnapshot = await getDocs(collection(db, 'environmentalChanges'));
    const changeDeletes = changesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(changeDeletes);
    console.log(`✅ Cleared ${changesSnapshot.size} environmental changes`);
    
    console.log('✅ All old data cleared successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    return false;
  }
};

// Reset and re-initialize all data
export const resetAndInitializeData = async () => {
  console.log('🔄 Starting full data reset...');
  
  // Clear old data first
  const clearSuccess = await clearAllData();
  if (!clearSuccess) {
    console.error('❌ Failed to clear old data');
    return false;
  }
  
  // Wait a moment for deletions to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Initialize new data
  const initSuccess = await initializeAllData();
  
  if (initSuccess) {
    console.log('✅ Full reset and initialization complete!');
  } else {
    console.log('⚠️ Initialization completed with some errors');
  }
  
  return initSuccess;
};
