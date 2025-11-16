'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import dynamic from 'next/dynamic';
import styles from './GeospatialMap.module.css';
import 'leaflet/dist/leaflet.css';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
);

interface PollutionHotspot {
  id: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  type: 'air-pollution' | 'water-contamination' | 'illegal-dumping' | 'deforestation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reports: number;
  lastUpdated: any;
}

interface EnvironmentalChange {
  id: string;
  location: {
    latitude: number;
    longitude: number;
  };
  changeType: 'improvement' | 'degradation';
  metric: string;
  value: number;
  timestamp: any;
}

interface GeospatialMapProps {
  userLocation?: { latitude: number; longitude: number; city?: string } | null;
  filterByLocation?: boolean;
}

export default function GeospatialMap({ userLocation, filterByLocation = false }: GeospatialMapProps) {
  const [hotspots, setHotspots] = useState<PollutionHotspot[]>([]);
  const [allHotspots, setAllHotspots] = useState<PollutionHotspot[]>([]);
  const [changes, setChanges] = useState<EnvironmentalChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [mapView, setMapView] = useState<'hotspots' | 'changes'>('hotspots');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hotspotsExpanded, setHotspotsExpanded] = useState(true);

  // Default center (Manila, Philippines) or user location
  const mapCenter = userLocation 
    ? { lat: userLocation.latitude, lng: userLocation.longitude }
    : { lat: 14.5995, lng: 120.9842 };

  // Fix Leaflet default icon and set map as loaded
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Fix for default marker icon
      import('leaflet').then((L) => {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        setMapLoaded(true);
      });
    }
  }, []);

  useEffect(() => {
    const hotspotsQuery = query(collection(db, 'pollutionHotspots'));
    const changesQuery = query(collection(db, 'environmentalChanges'));

    const unsubHotspots = onSnapshot(hotspotsQuery, (snapshot) => {
      const data: PollutionHotspot[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as PollutionHotspot);
      });
      setAllHotspots(data);
      
      // Apply location filter if enabled
      if (filterByLocation && userLocation) {
        const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        };

        const nearbyHotspots = data.filter(hotspot => {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            hotspot.location.latitude,
            hotspot.location.longitude
          );
          return distance <= 50; // 50km radius
        });
        setHotspots(nearbyHotspots);
      } else {
        setHotspots(data);
      }
      
      setLoading(false);
    });

    const unsubChanges = onSnapshot(changesQuery, (snapshot) => {
      const data: EnvironmentalChange[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as EnvironmentalChange);
      });
      setChanges(data);
    });

    return () => {
      unsubHotspots();
      unsubChanges();
    };
  }, [filterByLocation, userLocation]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
      case 'critical': return '#B71C1C';
      default: return '#9E9E9E';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'air-pollution': return 'fas fa-smog';
      case 'water-contamination': return 'fas fa-water';
      case 'illegal-dumping': return 'fas fa-dumpster';
      case 'deforestation': return 'fas fa-tree';
      default: return 'fas fa-exclamation-triangle';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Get estimated local AQI based on location and pollution type
  const getLocalAQI = (lat: number, lng: number, type: string, severity: string): { aqi: number; status: string; color: string } => {
    // Base AQI varies by location (simulated based on real Philippine city data)
    let baseAQI = 65; // Default moderate
    
    // Adjust based on coordinates (Metro Manila has higher pollution)
    if (lat > 14.4 && lat < 14.8 && lng > 120.9 && lng < 121.2) {
      baseAQI = 85; // Metro Manila area
    } else if (lat > 14.7 && lat < 15.2 && lng > 120.2 && lng < 120.7) {
      baseAQI = 68; // Central Luzon (Olongapo, Subic area)
    }

    // Adjust based on pollution type and severity
    const typeMultiplier = type === 'air-pollution' ? 1.3 : 1.0;
    const severityBonus = {
      'low': 0,
      'medium': 15,
      'high': 30,
      'critical': 50
    }[severity] || 0;

    const finalAQI = Math.round(baseAQI * typeMultiplier + severityBonus);

    // Determine status and color
    if (finalAQI <= 50) return { aqi: finalAQI, status: 'Good', color: '#00E400' };
    if (finalAQI <= 100) return { aqi: finalAQI, status: 'Moderate', color: '#FFFF00' };
    if (finalAQI <= 150) return { aqi: finalAQI, status: 'Unhealthy (SG)', color: '#FF7E00' };
    if (finalAQI <= 200) return { aqi: finalAQI, status: 'Unhealthy', color: '#FF0000' };
    if (finalAQI <= 300) return { aqi: finalAQI, status: 'Very Unhealthy', color: '#8F3F97' };
    return { aqi: finalAQI, status: 'Hazardous', color: '#7E0023' };
  };

  const filteredHotspots = selectedFilter === 'all' 
    ? hotspots 
    : hotspots.filter(h => h.type === selectedFilter);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.iconWrapper}>
            <i className="fas fa-map-marked-alt"></i>
          </div>
          <div>
            <h2 className={styles.title}>Geospatial Analytics Map</h2>
            <p className={styles.subtitle}>Real-time pollution hotspots and environmental changes</p>
          </div>
        </div>

        <div className={styles.viewToggle}>
          <button
            className={mapView === 'hotspots' ? styles.active : ''}
            onClick={() => setMapView('hotspots')}
          >
            <i className="fas fa-fire"></i>
            Pollution Hotspots
          </button>
          <button
            className={mapView === 'changes' ? styles.active : ''}
            onClick={() => setMapView('changes')}
          >
            <i className="fas fa-chart-line"></i>
            Environmental Changes
          </button>
        </div>
      </div>

      {mapView === 'hotspots' && (
        <>
          <div className={styles.filters}>
            <button
              className={selectedFilter === 'all' ? styles.filterActive : ''}
              onClick={() => setSelectedFilter('all')}
            >
              All Types
            </button>
            <button
              className={selectedFilter === 'air-pollution' ? styles.filterActive : ''}
              onClick={() => setSelectedFilter('air-pollution')}
            >
              <i className="fas fa-smog"></i>
              Air Pollution
            </button>
            <button
              className={selectedFilter === 'water-contamination' ? styles.filterActive : ''}
              onClick={() => setSelectedFilter('water-contamination')}
            >
              <i className="fas fa-water"></i>
              Water
            </button>
            <button
              className={selectedFilter === 'illegal-dumping' ? styles.filterActive : ''}
              onClick={() => setSelectedFilter('illegal-dumping')}
            >
              <i className="fas fa-dumpster"></i>
              Dumping
            </button>
            <button
              className={selectedFilter === 'deforestation' ? styles.filterActive : ''}
              onClick={() => setSelectedFilter('deforestation')}
            >
              <i className="fas fa-tree"></i>
              Deforestation
            </button>
          </div>

          <div className={styles.mapContainer}>
            {!mapLoaded ? (
              <div className={styles.mapPlaceholder}>
                <div className={styles.mapOverlay}>
                  <i className="fas fa-map"></i>
                  <p>Loading Interactive Map...</p>
                </div>
              </div>
            ) : (
              <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={userLocation ? 12 : 11}
                scrollWheelZoom={true}
                style={{ height: '500px', width: '100%', borderRadius: '12px' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* User location marker if available */}
                {userLocation && (
                  <CircleMarker
                    center={[userLocation.latitude, userLocation.longitude]}
                    radius={15}
                    pathOptions={{
                      color: '#2196F3',
                      fillColor: '#2196F3',
                      fillOpacity: 0.3,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div style={{ textAlign: 'center', padding: '8px' }}>
                        <strong style={{ color: '#2196F3' }}>📍 Your Location</strong>
                        {userLocation.city && <p style={{ margin: '4px 0' }}>{userLocation.city}</p>}
                      </div>
                    </Popup>
                  </CircleMarker>
                )}

                {/* Pollution hotspots as heatmap-style markers */}
                {filteredHotspots.map((hotspot) => {
                  const aqiData = getLocalAQI(
                    hotspot.location.latitude, 
                    hotspot.location.longitude, 
                    hotspot.type, 
                    hotspot.severity
                  );
                  
                  return (
                    <CircleMarker
                      key={hotspot.id}
                      center={[hotspot.location.latitude, hotspot.location.longitude]}
                      radius={hotspot.severity === 'critical' ? 20 : hotspot.severity === 'high' ? 15 : hotspot.severity === 'medium' ? 12 : 8}
                      pathOptions={{
                        color: getSeverityColor(hotspot.severity),
                        fillColor: getSeverityColor(hotspot.severity),
                        fillOpacity: 0.6,
                        weight: 2
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: '220px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            marginBottom: '8px',
                            paddingBottom: '8px',
                            borderBottom: '2px solid ' + getSeverityColor(hotspot.severity)
                          }}>
                            <i className={getTypeIcon(hotspot.type)} style={{ color: getSeverityColor(hotspot.severity), fontSize: '20px' }}></i>
                            <strong style={{ fontSize: '16px' }}>{getTypeLabel(hotspot.type)}</strong>
                          </div>
                          <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
                            <i className="fas fa-map-marker-alt"></i> {hotspot.location.address}
                          </p>
                          
                          {/* Air Quality Info */}
                          <div style={{
                            margin: '12px 0',
                            padding: '10px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '8px',
                            color: 'white'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <i className="fas fa-wind" style={{ fontSize: '16px' }}></i>
                              <strong style={{ fontSize: '13px' }}>Local Air Quality</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', lineHeight: '1' }}>
                                  {aqiData.aqi}
                                </div>
                                <div style={{ fontSize: '10px', opacity: 0.9 }}>AQI (US)</div>
                              </div>
                              <div style={{
                                padding: '4px 10px',
                                background: aqiData.color,
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}>
                                {aqiData.status}
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ 
                            margin: '8px 0', 
                            padding: '4px 8px', 
                            backgroundColor: getSeverityColor(hotspot.severity),
                            color: 'white',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}>
                            SEVERITY: {hotspot.severity.toUpperCase()}
                          </div>
                          <p style={{ margin: '4px 0', fontSize: '13px' }}>
                            <i className="fas fa-flag"></i> <strong>{hotspot.reports}</strong> reports
                          </p>
                          <a 
                            href={`https://www.google.com/maps?q=${hotspot.location.latitude},${hotspot.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                              display: 'inline-block',
                              marginTop: '8px',
                              padding: '6px 12px',
                              backgroundColor: '#4285f4',
                              color: 'white',
                              borderRadius: '4px',
                              textDecoration: 'none',
                              fontSize: '12px'
                            }}
                          >
                            <i className="fas fa-external-link-alt"></i> Open in Google Maps
                          </a>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            )}
          </div>

          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading hotspots...</p>
            </div>
          ) : filteredHotspots.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fas fa-check-circle"></i>
              <h3>No pollution hotspots found</h3>
              <p>Great news! No issues reported in this category.</p>
            </div>
          ) : (
            <>
              <div className={styles.stats}>
                <div className={styles.statCard}>
                  <i className="fas fa-exclamation-triangle" style={{ color: '#F44336' }}></i>
                  <div>
                    <strong>{filteredHotspots.length}</strong>
                    <span>Active Hotspots</span>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <i className="fas fa-fire" style={{ color: '#FF9800' }}></i>
                  <div>
                    <strong>{filteredHotspots.filter(h => h.severity === 'critical' || h.severity === 'high').length}</strong>
                    <span>High Priority</span>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <i className="fas fa-chart-line" style={{ color: '#2196F3' }}></i>
                  <div>
                    <strong>{filteredHotspots.reduce((sum, h) => sum + h.reports, 0)}</strong>
                    <span>Total Reports</span>
                  </div>
                </div>
              </div>

              <div className={styles.hotspotsListContainer}>
                <div 
                  className={styles.hotspotsListHeader}
                  onClick={() => setHotspotsExpanded(!hotspotsExpanded)}
                >
                  <h3>Hotspot Details ({filteredHotspots.length})</h3>
                  <button className={styles.collapseBtn}>
                    <i className={`fas fa-chevron-${hotspotsExpanded ? 'up' : 'down'}`}></i>
                  </button>
                </div>
                
                {hotspotsExpanded && (
                  <div className={styles.hotspotsList}>
                    {filteredHotspots.map((hotspot) => (
                  <div key={hotspot.id} className={styles.hotspotCard}>
                    <div 
                      className={styles.severityIndicator}
                      style={{ backgroundColor: getSeverityColor(hotspot.severity) }}
                    ></div>
                    <div className={styles.hotspotContent}>
                      <div className={styles.hotspotHeader}>
                        <div className={styles.hotspotIcon} style={{ color: getSeverityColor(hotspot.severity) }}>
                          <i className={getTypeIcon(hotspot.type)}></i>
                        </div>
                        <div>
                          <h4>{getTypeLabel(hotspot.type)}</h4>
                          <p className={styles.location}>
                            <i className="fas fa-map-marker-alt"></i>
                            {hotspot.location.address}
                          </p>
                        </div>
                        <div className={styles.severityBadge} style={{ backgroundColor: getSeverityColor(hotspot.severity) }}>
                          {hotspot.severity.toUpperCase()}
                        </div>
                      </div>
                      <div className={styles.hotspotMeta}>
                        <span>
                          <i className="fas fa-flag"></i>
                          {hotspot.reports} reports
                        </span>
                        <span>
                          <i className="fas fa-map"></i>
                          {hotspot.location.latitude.toFixed(4)}, {hotspot.location.longitude.toFixed(4)}
                        </span>
                        <a 
                          href={`https://www.google.com/maps?q=${hotspot.location.latitude},${hotspot.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.mapLink}
                        >
                          <i className="fas fa-external-link-alt"></i>
                          Open in Maps
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {mapView === 'changes' && (
        <div className={styles.changesView}>
          <div className={styles.mapContainer}>
            {!mapLoaded ? (
              <div className={styles.mapPlaceholder}>
                <div className={styles.mapOverlay}>
                  <i className="fas fa-chart-area"></i>
                  <p>Loading Environmental Changes Map...</p>
                </div>
              </div>
            ) : (
              <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={userLocation ? 12 : 11}
                scrollWheelZoom={true}
                style={{ height: '500px', width: '100%', borderRadius: '12px' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* User location marker if available */}
                {userLocation && (
                  <CircleMarker
                    center={[userLocation.latitude, userLocation.longitude]}
                    radius={15}
                    pathOptions={{
                      color: '#2196F3',
                      fillColor: '#2196F3',
                      fillOpacity: 0.3,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div style={{ textAlign: 'center', padding: '8px' }}>
                        <strong style={{ color: '#2196F3' }}>📍 Your Location</strong>
                        {userLocation.city && <p style={{ margin: '4px 0' }}>{userLocation.city}</p>}
                      </div>
                    </Popup>
                  </CircleMarker>
                )}

                {/* Environmental changes markers */}
                {changes.map((change) => (
                  <CircleMarker
                    key={change.id}
                    center={[change.location.latitude, change.location.longitude]}
                    radius={12}
                    pathOptions={{
                      color: change.changeType === 'improvement' ? '#4CAF50' : '#F44336',
                      fillColor: change.changeType === 'improvement' ? '#4CAF50' : '#F44336',
                      fillOpacity: 0.6,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: '180px' }}>
                        <strong style={{ 
                          fontSize: '16px',
                          color: change.changeType === 'improvement' ? '#4CAF50' : '#F44336'
                        }}>
                          {change.changeType === 'improvement' ? '↑ Improvement' : '↓ Decline'}
                        </strong>
                        <p style={{ margin: '8px 0', fontSize: '14px', fontWeight: 600 }}>
                          {change.metric}
                        </p>
                        <p style={{ 
                          margin: '4px 0',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: change.changeType === 'improvement' ? '#4CAF50' : '#F44336'
                        }}>
                          {change.changeType === 'improvement' ? '+' : ''}{change.value}%
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            )}
          </div>

          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading environmental data...</p>
            </div>
          ) : (
            <div className={styles.changesGrid}>
              <div className={styles.changeCard}>
                <div className={styles.changeIcon} style={{ backgroundColor: '#4CAF50' }}>
                  <i className="fas fa-arrow-up"></i>
                </div>
                <div>
                  <h4>Air Quality Improvements</h4>
                  <p className={styles.changeValue}>+12% this month</p>
                  <p className={styles.changeDesc}>45 locations showing improvement</p>
                </div>
              </div>

              <div className={styles.changeCard}>
                <div className={styles.changeIcon} style={{ backgroundColor: '#F44336' }}>
                  <i className="fas fa-arrow-down"></i>
                </div>
                <div>
                  <h4>Water Quality Decline</h4>
                  <p className={styles.changeValue}>-8% this month</p>
                  <p className={styles.changeDesc}>23 locations need attention</p>
                </div>
              </div>

              <div className={styles.changeCard}>
                <div className={styles.changeIcon} style={{ backgroundColor: '#2196F3' }}>
                  <i className="fas fa-recycle"></i>
                </div>
                <div>
                  <h4>Recycling Rate Growth</h4>
                  <p className={styles.changeValue}>+15% this quarter</p>
                  <p className={styles.changeDesc}>Community participation increasing</p>
                </div>
              </div>

              <div className={styles.changeCard}>
                <div className={styles.changeIcon} style={{ backgroundColor: '#4CAF50' }}>
                  <i className="fas fa-tree"></i>
                </div>
                <div>
                  <h4>Tree Planting Progress</h4>
                  <p className={styles.changeValue}>+2,500 trees</p>
                  <p className={styles.changeDesc}>Community initiatives successful</p>
                </div>
              </div>
            </div>
          )}

          <div className={styles.timeline}>
            <h3>
              <i className="fas fa-clock"></i>
              Recent Environmental Changes
            </h3>
            <div className={styles.timelineItems}>
              {changes.slice(0, 5).map((change) => (
                <div key={change.id} className={styles.timelineItem}>
                  <div 
                    className={styles.timelineDot}
                    style={{ 
                      backgroundColor: change.changeType === 'improvement' ? '#4CAF50' : '#F44336'
                    }}
                  ></div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <strong>{change.metric}</strong>
                      <span className={styles.timelineChange} style={{
                        color: change.changeType === 'improvement' ? '#4CAF50' : '#F44336'
                      }}>
                        {change.changeType === 'improvement' ? '↑' : '↓'} {change.value}%
                      </span>
                    </div>
                    <p>{change.changeType === 'improvement' ? 'Improved' : 'Declined'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.legend}>
        <h4>Severity Legend</h4>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#4CAF50' }}></div>
            <span>Low</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#FF9800' }}></div>
            <span>Medium</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#F44336' }}></div>
            <span>High</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#B71C1C' }}></div>
            <span>Critical</span>
          </div>
        </div>
      </div>
    </div>
  );
}
