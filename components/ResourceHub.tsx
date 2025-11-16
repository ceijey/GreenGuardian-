'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './ResourceHub.module.css';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'quiz' | 'lesson-plan';
  category: string;
  views: number;
  likes: number;
  createdByName: string;
  createdAt: any;
}

export default function ResourceHub() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'article' | 'video' | 'quiz' | 'lesson-plan'>('all');

  useEffect(() => {
    const q = query(
      collection(db, 'educationalResources'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resourcesList: Resource[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        resourcesList.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          type: data.type || 'article',
          category: data.category || '',
          views: data.views || 0,
          likes: data.likes || 0,
          createdByName: data.createdByName || 'Anonymous',
          createdAt: data.createdAt
        });
      });
      setResources(resourcesList);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const filteredResources = filter === 'all' 
    ? resources 
    : resources.filter(r => r.type === filter);

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'article': return 'fa-newspaper';
      case 'video': return 'fa-video';
      case 'quiz': return 'fa-question-circle';
      case 'lesson-plan': return 'fa-chalkboard-teacher';
      default: return 'fa-file';
    }
  };

  return (
    <section className={`${styles.section} ${styles.container}`}>
      <h2 className={styles.title}>📚 Educational Resource Hub</h2>
      <p className={styles.subtitle}>
        Explore educational content created by schools and educators in our community
      </p>

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        <button 
          className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          <i className="fas fa-th"></i> All
        </button>
        <button 
          className={`${styles.filterTab} ${filter === 'article' ? styles.active : ''}`}
          onClick={() => setFilter('article')}
        >
          <i className="fas fa-newspaper"></i> Articles
        </button>
        <button 
          className={`${styles.filterTab} ${filter === 'video' ? styles.active : ''}`}
          onClick={() => setFilter('video')}
        >
          <i className="fas fa-video"></i> Videos
        </button>
        <button 
          className={`${styles.filterTab} ${filter === 'quiz' ? styles.active : ''}`}
          onClick={() => setFilter('quiz')}
        >
          <i className="fas fa-question-circle"></i> Quizzes
        </button>
        <button 
          className={`${styles.filterTab} ${filter === 'lesson-plan' ? styles.active : ''}`}
          onClick={() => setFilter('lesson-plan')}
        >
          <i className="fas fa-chalkboard-teacher"></i> Lessons
        </button>
      </div>

      {/* Resources Display */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading resources...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="fas fa-inbox"></i>
          <h3>No Resources Yet</h3>
          <p>Check back soon! Schools are creating educational content for the community.</p>
        </div>
      ) : (
        <div className={styles.resourceGrid}>
          {filteredResources.map((resource) => (
            <div key={resource.id} className={styles.resourceCard}>
              <div className={styles.resourceHeader}>
                <div className={styles.resourceIcon}>
                  <i className={`fas ${getTypeIcon(resource.type)}`}></i>
                </div>
                <span className={styles.resourceType}>{resource.type}</span>
              </div>
              
              <h3 className={styles.resourceTitle}>{resource.title}</h3>
              <p className={styles.resourceDescription}>{resource.description}</p>
              
              <div className={styles.resourceMeta}>
                <span className={styles.author}>
                  <i className="fas fa-user"></i> {resource.createdByName}
                </span>
                <span className={styles.category}>
                  <i className="fas fa-tag"></i> {resource.category.replace('-', ' ')}
                </span>
              </div>

              <div className={styles.resourceStats}>
                <span>
                  <i className="fas fa-eye"></i> {resource.views} views
                </span>
                <span>
                  <i className="fas fa-heart"></i> {resource.likes} likes
                </span>
              </div>

              <Link href={`/resources/${resource.id}`} className={styles.viewButton}>
                View Resource →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Quick Access Links */}
      <div className={styles.quickLinks}>
        <Link href="/resources/articles" className={styles.quickLink}>
          <i className="fas fa-book"></i> Browse All Articles
        </Link>
        <Link href="/resources/videos" className={styles.quickLink}>
          <i className="fas fa-video"></i> Watch Videos
        </Link>
        <Link href="/resources/quizzes" className={styles.quickLink}>
          <i className="fas fa-question"></i> Take Quizzes
        </Link>
      </div>
    </section>
  );
}
