'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { useState } from 'react';
import styles from './videos.module.css';

const VIDEOS = [
  {
    id: 1,
    title: 'Climate Change Explained',
    description: 'A comprehensive overview of climate change, its causes, and solutions.',
    youtubeId: 'ifrHogDujXw1kUE0BZtTRc', // Replace with actual video ID
    icon: 'fas fa-globe',
  },
  {
    id: 2,
    title: 'Renewable Energy Sources',
    description: 'Learn about solar, wind, and hydroelectric power and their benefits.',
    youtubeId: '1kUE0BZtTRc', // Replace with actual video ID
    icon: 'fas fa-bolt',
  },
  {
    id: 3,
    title: 'Ocean Plastic Crisis',
    description: 'Understand the impact of plastic pollution on marine life and ecosystems.',
    youtubeId: 'HQTUWK7CM-Y', // Replace with actual video ID
    icon: 'fas fa-water',
  },
  {
    id: 4,
    title: 'Sustainable Living Guide',
    description: 'Practical tips for reducing your environmental footprint at home.',
    youtubeId: 'di5NiVZ3QJkM', // Replace with actual video ID
    icon: 'fas fa-leaf',
  },
  {
    id: 5,
    title: 'Forest Conservation',
    description: 'Why forests matter and how we can protect them for future generations.',
    youtubeId: 'Dzvi2tgaEs4', // Replace with actual video ID
    icon: 'fas fa-tree',
  },
];

export default function VideosPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = selectedId ? VIDEOS.find((v) => v.id === selectedId) : null;

  return (
    <>
      <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
      <main className={`main-content container ${styles.container}`}>
        {selected ? (
          <div className={`card ${styles.detailView}`}>
            <button
              onClick={() => setSelectedId(null)}
              className={`btn btn-secondary ${styles.backButton}`}
            >
              ← Back to Videos
            </button>
            <div className={styles.detailHeader}>
              <div className={styles.detailIcon}>
                <i className={selected.icon}></i>
              </div>
              <h1 className={styles.detailTitle}>{selected.title}</h1>
            </div>
            <p className={styles.detailDescription}>{selected.description}</p>

            <div className={styles.iframeContainer}>
              <iframe
                src={`https://www.youtube.com/embed/${selected.youtubeId}`}
                title={selected.title}
                allowFullScreen
              />
            </div>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <h1>Educational Videos</h1>
              <p>Watch short explainers and documentaries about environmental awareness.</p>
            </div>
            <div className={`grid-responsive ${styles.grid}`}>
              {VIDEOS.map((video) => (
                <button
                  key={video.id}
                  onClick={() => setSelectedId(video.id)}
                  className={`card ${styles.videoCard}`}
                >
                  <div className={styles.videoCardContent}>
                    <div className={styles.videoIcon}>
                      <i className={video.icon}></i>
                    </div>
                    <h3 className={styles.videoTitle}>{video.title}</h3>
                    <p className={styles.videoDescription}>{video.description}</p>
                    <div className={styles.videoButton}>
                      <span className="btn btn-primary">Watch Video</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        <div className={styles.footer}>
          <Link href="/resources" className="btn btn-secondary">Back to resources</Link>
        </div>
      </main>
    </>
  );
}
