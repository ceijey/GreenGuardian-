'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Dashboard from '@/components/Dashboard';
import Header from '@/components/Header';
import ActionLogger from '@/components/ActionLogger';
import ResourceHub from '@/components/ResourceHub';
import GlobalAnnouncements from '@/components/GlobalAnnouncements';
import EcoScannerDialog from './EcoScannerDialog';
import AIWasteClassifier from '@/components/AIWasteClassifier';
import GeospatialMap from '@/components/GeospatialMap';
import InitializeCloudData from '@/components/InitializeCloudData';
import LocationPicker from '@/components/LocationPicker';
import AirQualityMonitor from '@/components/AirQualityMonitor';
import { collection, query, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  UserLocation, 
  filterHotspotsByLocation, 
  filterProjectsByLocation,
  getSavedUserLocation 
} from '@/lib/locationUtils';

interface EnvironmentalData {
  airQualityIndex: number;
  waterQualityIndex: number;
  wasteGenerated: number;
  recyclingRate: number;
  timestamp: any;
}

interface LocalProject {
  id: string;
  title: string;
  description: string;
  category: 'cleanup' | 'tree-planting' | 'water-conservation' | 'education';
  location: string;
  participants: number;
  status: 'ongoing' | 'upcoming' | 'completed';
  impact: {
    co2Reduced?: number;
    wasteCollected?: number;
    treesPlanted?: number;
  };
  startDate: any;
  endDate: any;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isActionLoggerOpen, setIsActionLoggerOpen] = useState(false);
  const [showEnvironmentalData, setShowEnvironmentalData] = useState(false);
  
  // Location tracking state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationFilterEnabled, setLocationFilterEnabled] = useState(false);
  
  // Environmental data state
  const [envData, setEnvData] = useState<EnvironmentalData>({
    airQualityIndex: 0,
    waterQualityIndex: 0,
    wasteGenerated: 0,
    recyclingRate: 0,
    timestamp: null
  });
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [allProjects, setAllProjects] = useState<LocalProject[]>([]); // Store all projects
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Load environmental data
  useEffect(() => {
    if (!user) return;
    
    const envRef = doc(db, 'communityStats', 'environmentalData');
    const unsubscribe = onSnapshot(envRef, (snapshot) => {
      if (snapshot.exists()) {
        setEnvData(snapshot.data() as EnvironmentalData);
      }
    });

    return unsubscribe;
  }, [user]);

  // Load saved location on mount
  useEffect(() => {
    const savedLocation = getSavedUserLocation();
    if (savedLocation) {
      setUserLocation(savedLocation);
      setLocationFilterEnabled(true);
    }
  }, []);

  // Load local projects
  useEffect(() => {
    if (!user) return;
    
    const projectsQuery = query(collection(db, 'localProjects'));
    const unsubscribe = onSnapshot(projectsQuery, async (snapshot) => {
      const projectsList: LocalProject[] = [];
      snapshot.forEach((doc) => {
        projectsList.push({ id: doc.id, ...doc.data() } as LocalProject);
      });
      
      setAllProjects(projectsList); // Store all projects
      
      // Filter by location if enabled
      if (locationFilterEnabled && userLocation) {
        try {
          const nearbyProjects = await filterProjectsByLocation(userLocation, 50);
          const filtered = selectedCategory !== 'all' 
            ? nearbyProjects.filter((p: any) => p.category === selectedCategory)
            : nearbyProjects;
          setProjects(filtered);
        } catch (error) {
          console.error('Error filtering projects by location:', error);
          // Fallback to all projects
          const filtered = selectedCategory !== 'all' 
            ? projectsList.filter(p => p.category === selectedCategory)
            : projectsList;
          setProjects(filtered);
        }
      } else {
        // Show all projects if location filter is disabled
        const filtered = selectedCategory !== 'all' 
          ? projectsList.filter(p => p.category === selectedCategory)
          : projectsList;
        setProjects(filtered);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [selectedCategory, user, locationFilterEnabled, userLocation]);

  // Handle location change
  const handleLocationChange = (location: UserLocation | null) => {
    setUserLocation(location);
    setLocationFilterEnabled(!!location);
  };

  const getAirQualityLabel = (aqi: number) => {
    if (aqi <= 50) return { label: 'Good', color: '#4CAF50' };
    if (aqi <= 100) return { label: 'Moderate', color: '#8BC34A' };
    if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups', color: '#FF9800' };
    if (aqi <= 200) return { label: 'Unhealthy', color: '#FF5722' };
    if (aqi <= 300) return { label: 'Very Unhealthy', color: '#9C27B0' };
    return { label: 'Hazardous', color: '#B71C1C' };
  };

  const getWaterQualityLabel = (index: number) => {
    if (index >= 80) return { label: 'Excellent', color: '#4CAF50' };
    if (index >= 60) return { label: 'Good', color: '#8BC34A' };
    if (index >= 40) return { label: 'Fair', color: '#FF9800' };
    if (index >= 20) return { label: 'Poor', color: '#FF5722' };
    return { label: 'Very Poor', color: '#B71C1C' };
  };

  const airQuality = getAirQualityLabel(envData.airQualityIndex);
  const waterQuality = getWaterQualityLabel(envData.waterQualityIndex);

  return (
    <>
      <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
      <main className="main-content">
        <GlobalAnnouncements position="top" maxVisible={2} />
        <Dashboard />

      <div className="flex justify-center gap-4 mt-8">
  <div className="flex flex-row gap-4 mt-8 ml-8 items-center">
  <button
    onClick={() => setIsActionLoggerOpen(true)}
    className="bg-green-600 text-white px-12 py-8 rounded-full shadow-2xl hover:bg-green-700 hover:shadow-3xl transition-all duration-300 flex items-center gap-2 font-semibold text-lg group transform hover:scale-105"
  >
    <i className="fas fa-plus bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors"></i>
    Log Eco-Action
  </button>
  
  <button
    onClick={() => setIsScannerOpen(true)}
    className="bg-blue-600 text-white px-12 py-8 rounded-full shadow-2xl hover:bg-blue-700 hover:shadow-3xl transition-all duration-300 flex items-center gap-2 font-semibold text-lg group transform hover:scale-105"
  >
    <i className="fas fa-camera bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors"></i>
    Open Scanner
  </button>
</div>
</div>

      <ResourceHub />

      {/* AI Waste Classifier Section */}
      {user && <AIWasteClassifier />}

      {/* Location Picker */}
      {user && (
        <LocationPicker 
          onLocationChange={handleLocationChange}
          initialLocation={userLocation}
        />
      )}

      {/* Location Info Display */}
      {user && userLocation && locationFilterEnabled && (
        <div style={{
          maxWidth: '1400px',
          margin: '20px auto',
          padding: '15px 30px',
          background: '#e8f5e9',
          borderLeft: '4px solid #4CAF50',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <i className="fas fa-filter" style={{ fontSize: '24px', color: '#4CAF50' }}></i>
          <div>
            <strong style={{ color: '#2e7d32', fontSize: '16px' }}>
              Location-Based Filtering Active
            </strong>
            <p style={{ margin: '5px 0 0 0', color: '#555', fontSize: '14px' }}>
              Showing environmental data and projects within 50km of {userLocation.city || 'your location'}. 
              {projects.length > 0 && ` Found ${projects.length} nearby project(s).`}
            </p>
          </div>
          <button
            onClick={() => setLocationFilterEnabled(false)}
            style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              background: 'white',
              color: '#4CAF50',
              border: '2px solid #4CAF50',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Show All
          </button>
        </div>
      )}

      {/* Environmental Data Toggle Section */}
      {user && (
        <div style={{ marginTop: '40px', marginBottom: '20px', textAlign: 'center' }}>
          <button
            onClick={() => setShowEnvironmentalData(!showEnvironmentalData)}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '12px 30px',
              borderRadius: '25px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
            }}
          >
            <i className={`fas fa-${showEnvironmentalData ? 'eye-slash' : 'chart-line'}`}></i>
            {showEnvironmentalData ? 'Hide' : 'Show'} Community Environmental Data
          </button>
        </div>
      )}

      {/* Environmental Data Section */}
      {user && showEnvironmentalData && (
        <div style={{ 
          maxWidth: '1400px', 
          margin: '40px auto', 
          padding: '0 20px' 
        }}>
          <section style={{ marginBottom: '50px' }}>
            <h2 style={{ 
              fontSize: '32px', 
              color: '#2c3e50', 
              marginBottom: '10px',
              textAlign: 'center'
            }}>
              🌍 Community Environmental Dashboard
            </h2>
            <p style={{ 
              textAlign: 'center',
              color: '#7f8c8d',
              fontSize: '16px',
              marginBottom: '40px'
            }}>
              Real-time environmental quality metrics for your area
            </p>

            {/* Air Quality Monitor from IQAir */}
            <AirQualityMonitor userLocation={userLocation} />
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '25px',
              marginBottom: '40px'
            }}>
              {/* Air Quality Card */}
              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  <i className="fas fa-wind" style={{ fontSize: '28px', color: '#3498db' }}></i>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#2c3e50', fontWeight: '600' }}>
                    Air Quality Index
                  </h3>
                </div>
                <div style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  margin: '15px 0',
                  textAlign: 'center',
                  color: airQuality.color
                }}>
                  {envData.airQualityIndex}
                </div>
                <p style={{
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '15px'
                }}>
                  {airQuality.label}
                </p>
                <div style={{
                  width: '100%',
                  height: '12px',
                  background: '#ecf0f1',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  marginBottom: '15px'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(envData.airQualityIndex / 5, 100)}%`,
                    background: airQuality.color,
                    transition: 'width 0.5s ease',
                    borderRadius: '6px'
                  }}></div>
                </div>
                <p style={{
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#7f8c8d',
                  marginTop: '15px'
                }}>
                  {envData.airQualityIndex > 100 
                    ? '⚠️ Reduce outdoor activities' 
                    : '✅ Good day for outdoor activities'}
                </p>
              </div>

              {/* Water Quality Card */}
              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  <i className="fas fa-water" style={{ fontSize: '28px', color: '#3498db' }}></i>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#2c3e50', fontWeight: '600' }}>
                    Water Quality Index
                  </h3>
                </div>
                <div style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  margin: '15px 0',
                  textAlign: 'center',
                  color: waterQuality.color
                }}>
                  {envData.waterQualityIndex}
                </div>
                <p style={{
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '15px'
                }}>
                  {waterQuality.label}
                </p>
                <div style={{
                  width: '100%',
                  height: '12px',
                  background: '#ecf0f1',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  marginBottom: '15px'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${envData.waterQualityIndex}%`,
                    background: waterQuality.color,
                    transition: 'width 0.5s ease',
                    borderRadius: '6px'
                  }}></div>
                </div>
                <p style={{
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#7f8c8d',
                  marginTop: '15px'
                }}>
                  Safe water levels: {envData.waterQualityIndex > 60 ? 'Yes ✓' : 'Caution ⚠️'}
                </p>
              </div>

              {/* Waste & Recycling Card */}
              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  <i className="fas fa-trash" style={{ fontSize: '28px', color: '#3498db' }}></i>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#2c3e50', fontWeight: '600' }}>
                    Waste & Recycling
                  </h3>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  margin: '20px 0'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    <span style={{ fontSize: '14px', color: '#7f8c8d', fontWeight: '500' }}>
                      Community Waste
                    </span>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
                      {envData.wasteGenerated.toLocaleString()} kg
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    <span style={{ fontSize: '14px', color: '#7f8c8d', fontWeight: '500' }}>
                      Recycling Rate
                    </span>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
                      {envData.recyclingRate}%
                    </span>
                  </div>
                </div>
                <div style={{
                  width: '100%',
                  height: '12px',
                  background: '#ecf0f1',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  marginBottom: '15px'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${envData.recyclingRate}%`,
                    background: '#4CAF50',
                    transition: 'width 0.5s ease',
                    borderRadius: '6px'
                  }}></div>
                </div>
                <p style={{
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#95a5a6',
                  marginTop: '10px',
                  fontStyle: 'italic'
                }}>
                  Goal: 50% recycling rate
                </p>
              </div>
            </div>
          </section>

          {/* Geospatial Analytics Map */}
          <GeospatialMap 
            userLocation={userLocation}
            filterByLocation={locationFilterEnabled}
          />

          {/* Local Projects Section */}
          <section style={{ marginTop: '50px' }}>
            <h2 style={{ 
              fontSize: '28px', 
              color: '#2c3e50', 
              marginBottom: '25px' 
            }}>
              🌱 Ongoing Local Eco-Projects
            </h2>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '30px',
              flexWrap: 'wrap'
            }}>
              {['all', 'cleanup', 'tree-planting', 'water-conservation', 'education'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '10px 20px',
                    border: selectedCategory === cat ? 'none' : '2px solid #e0e0e0',
                    background: selectedCategory === cat 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      : 'white',
                    color: selectedCategory === cat ? 'white' : '#555',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontWeight: '500'
                  }}
                >
                  {cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #3498db',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 20px'
                }}></div>
                <p>Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                background: 'white',
                borderRadius: '12px'
              }}>
                <i className="fas fa-leaf" style={{ fontSize: '64px', color: '#ddd', marginBottom: '20px' }}></i>
                <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>No projects found</h3>
                <p style={{ color: '#7f8c8d' }}>Check back soon for upcoming community projects!</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '25px'
              }}>
                {projects.map(project => (
                  <div key={project.id} style={{
                    background: 'white',
                    padding: '25px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 15px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '15px'
                    }}>
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        background: project.status === 'ongoing' ? '#e8f5e9' : 
                                   project.status === 'upcoming' ? '#fff3e0' : '#e3f2fd',
                        color: project.status === 'ongoing' ? '#2e7d32' : 
                               project.status === 'upcoming' ? '#ef6c00' : '#1565c0'
                      }}>
                        {project.status.toUpperCase()}
                      </span>
                      <span style={{
                        padding: '5px 12px',
                        background: '#f5f5f5',
                        borderRadius: '15px',
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        {project.category}
                      </span>
                    </div>
                    <h3 style={{ 
                      fontSize: '20px', 
                      color: '#2c3e50', 
                      marginBottom: '12px' 
                    }}>
                      {project.title}
                    </h3>
                    <p style={{
                      color: '#7f8c8d',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      marginBottom: '20px'
                    }}>
                      {project.description}
                    </p>
                    
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      marginBottom: '20px',
                      fontSize: '14px',
                      color: '#555'
                    }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <i className="fas fa-map-marker-alt" style={{ color: '#3498db', width: '16px' }}></i>
                        {project.location}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <i className="fas fa-users" style={{ color: '#3498db', width: '16px' }}></i>
                        {project.participants} participants
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      paddingTop: '15px',
                      borderTop: '1px solid #eee'
                    }}>
                      {project.impact.co2Reduced && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: '#f0f8ff',
                          borderRadius: '20px',
                          fontSize: '12px',
                          color: '#2c3e50'
                        }}>
                          <i className="fas fa-leaf" style={{ color: '#4CAF50' }}></i>
                          <span>{project.impact.co2Reduced} kg CO₂ reduced</span>
                        </div>
                      )}
                      {project.impact.wasteCollected && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: '#f0f8ff',
                          borderRadius: '20px',
                          fontSize: '12px',
                          color: '#2c3e50'
                        }}>
                          <i className="fas fa-trash" style={{ color: '#4CAF50' }}></i>
                          <span>{project.impact.wasteCollected} kg waste collected</span>
                        </div>
                      )}
                      {project.impact.treesPlanted && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: '#f0f8ff',
                          borderRadius: '20px',
                          fontSize: '12px',
                          color: '#2c3e50'
                        }}>
                          <i className="fas fa-tree" style={{ color: '#4CAF50' }}></i>
                          <span>{project.impact.treesPlanted} trees planted</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      </main>
      
      <ActionLogger
        isOpen={isActionLoggerOpen}
        onClose={() => setIsActionLoggerOpen(false)}
      />

      <EcoScannerDialog
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />

      {/* Cloud Data Initialization Prompt */}
      <InitializeCloudData />
    </>
  );
}
