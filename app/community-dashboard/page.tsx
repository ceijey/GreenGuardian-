'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Header from '../../components/Header';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './community-dashboard.module.css';

interface EnvironmentalData {
  airQualityIndex: number;
  waterQualityIndex: number;
  wasteGenerated: number; // kg
  recyclingRate: number; // percentage
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

export default function CommunityDashboardPage() {
  const { user } = useAuth();
  const [envData, setEnvData] = useState<EnvironmentalData>({
    airQualityIndex: 0,
    waterQualityIndex: 0,
    wasteGenerated: 0,
    recyclingRate: 0,
    timestamp: null
  });
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Load environmental data
  useEffect(() => {
    const envRef = doc(db, 'communityStats', 'environmentalData');
    const unsubscribe = onSnapshot(envRef, (snapshot) => {
      if (snapshot.exists()) {
        setEnvData(snapshot.data() as EnvironmentalData);
      }
    });

    return unsubscribe;
  }, []);

  // Load local projects
  useEffect(() => {
    const projectsQuery = query(collection(db, 'localProjects'));
    const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
      const projectsList: LocalProject[] = [];
      snapshot.forEach((doc) => {
        projectsList.push({ id: doc.id, ...doc.data() } as LocalProject);
      });
      
      // Filter by category if selected
      if (selectedCategory !== 'all') {
        setProjects(projectsList.filter(p => p.category === selectedCategory));
      } else {
        setProjects(projectsList);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [selectedCategory]);

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

  if (!user) {
    return (
      <>
        <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
        <div className={styles.container}>
          <div className={styles.loginPrompt}>
            <h2>Please log in to view community environmental data</h2>
          </div>
        </div>
      </>
    );
  }

  const airQuality = getAirQualityLabel(envData.airQualityIndex);
  const waterQuality = getWaterQualityLabel(envData.waterQualityIndex);

  return (
    <>
      <Header logo="fas fa-chart-bar" title="GREENGUARDIAN" />
      
      <div className={styles.container}>
        {/* Environmental Data Section */}
        <section className={styles.envDataSection}>
          <h1>🌍 Community Environmental Dashboard</h1>
          <p className={styles.subtitle}>Real-time environmental quality metrics for your area</p>
          
          <div className={styles.dataGrid}>
            {/* Air Quality */}
            <div className={styles.dataCard}>
              <div className={styles.cardHeader}>
                <i className="fas fa-wind"></i>
                <h3>Air Quality Index</h3>
              </div>
              <div 
                className={styles.indexValue}
                style={{ color: airQuality.color }}
              >
                {envData.airQualityIndex}
              </div>
              <p className={styles.indexLabel}>{airQuality.label}</p>
              <div className={styles.indexBar}>
                <div 
                  className={styles.indexFill}
                  style={{ 
                    width: `${Math.min(envData.airQualityIndex / 5, 100)}%`,
                    backgroundColor: airQuality.color
                  }}
                ></div>
              </div>
              <p className={styles.recommendation}>
                {envData.airQualityIndex > 100 
                  ? '⚠️ Reduce outdoor activities' 
                  : '✅ Good day for outdoor activities'}
              </p>
            </div>

            {/* Water Quality */}
            <div className={styles.dataCard}>
              <div className={styles.cardHeader}>
                <i className="fas fa-water"></i>
                <h3>Water Quality Index</h3>
              </div>
              <div 
                className={styles.indexValue}
                style={{ color: waterQuality.color }}
              >
                {envData.waterQualityIndex}
              </div>
              <p className={styles.indexLabel}>{waterQuality.label}</p>
              <div className={styles.indexBar}>
                <div 
                  className={styles.indexFill}
                  style={{ 
                    width: `${envData.waterQualityIndex}%`,
                    backgroundColor: waterQuality.color
                  }}
                ></div>
              </div>
              <p className={styles.recommendation}>
                Safe water levels: {envData.waterQualityIndex > 60 ? 'Yes ✓' : 'Caution ⚠️'}
              </p>
            </div>

            {/* Waste & Recycling */}
            <div className={styles.dataCard}>
              <div className={styles.cardHeader}>
                <i className="fas fa-trash"></i>
                <h3>Waste & Recycling</h3>
              </div>
              <div className={styles.wasteMetrics}>
                <div className={styles.metric}>
                  <span className={styles.label}>Community Waste</span>
                  <span className={styles.value}>{envData.wasteGenerated.toLocaleString()} kg</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.label}>Recycling Rate</span>
                  <span className={styles.value}>{envData.recyclingRate}%</span>
                </div>
              </div>
              <div className={styles.indexBar}>
                <div 
                  className={styles.indexFill}
                  style={{ 
                    width: `${envData.recyclingRate}%`,
                    backgroundColor: '#4CAF50'
                  }}
                ></div>
              </div>
              <p className={styles.goal}>Goal: 50% recycling rate</p>
            </div>
          </div>
        </section>

        {/* Local Projects Section */}
        <section className={styles.projectsSection}>
          <h2>🌱 Ongoing Local Eco-Projects</h2>
          
          <div className={styles.categoryFilter}>
            <button 
              className={selectedCategory === 'all' ? styles.active : ''}
              onClick={() => setSelectedCategory('all')}
            >
              All Projects
            </button>
            <button 
              className={selectedCategory === 'cleanup' ? styles.active : ''}
              onClick={() => setSelectedCategory('cleanup')}
            >
              Cleanups
            </button>
            <button 
              className={selectedCategory === 'tree-planting' ? styles.active : ''}
              onClick={() => setSelectedCategory('tree-planting')}
            >
              Tree Planting
            </button>
            <button 
              className={selectedCategory === 'water-conservation' ? styles.active : ''}
              onClick={() => setSelectedCategory('water-conservation')}
            >
              Water Projects
            </button>
            <button 
              className={selectedCategory === 'education' ? styles.active : ''}
              onClick={() => setSelectedCategory('education')}
            >
              Education
            </button>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fas fa-leaf"></i>
              <h3>No projects found</h3>
              <p>Check back soon for upcoming community projects!</p>
            </div>
          ) : (
            <div className={styles.projectsGrid}>
              {projects.map(project => (
                <div key={project.id} className={styles.projectCard}>
                  <div className={styles.projectHeader}>
                    <span className={`${styles.statusBadge} ${styles[project.status]}`}>
                      {project.status.toUpperCase()}
                    </span>
                    <span className={styles.categoryTag}>{project.category}</span>
                  </div>
                  <h3>{project.title}</h3>
                  <p className={styles.description}>{project.description}</p>
                  
                  <div className={styles.projectMeta}>
                    <div><i className="fas fa-map-marker-alt"></i> {project.location}</div>
                    <div><i className="fas fa-users"></i> {project.participants} participants</div>
                  </div>

                  <div className={styles.impactMetrics}>
                    {project.impact.co2Reduced && (
                      <div className={styles.metric}>
                        <i className="fas fa-leaf"></i>
                        <span>{project.impact.co2Reduced} kg CO₂ reduced</span>
                      </div>
                    )}
                    {project.impact.wasteCollected && (
                      <div className={styles.metric}>
                        <i className="fas fa-trash"></i>
                        <span>{project.impact.wasteCollected} kg waste collected</span>
                      </div>
                    )}
                    {project.impact.treesPlanted && (
                      <div className={styles.metric}>
                        <i className="fas fa-tree"></i>
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
    </>
  );
}