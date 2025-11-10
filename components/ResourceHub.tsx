'use client';

import Link from 'next/link';
import styles from './ResourceHub.module.css';

export default function ResourceHub() {
  return (
    <section className={`${styles.section} container`}>
      <h2 className={styles.title}>Educational Resource Hub</h2>
      <p className={styles.subtitle}>Read articles, watch videos, and take short quizzes to learn about environmental awareness.</p>

      <div className={`${styles.grid} grid-responsive`}>
        <Link href="/resources/articles" aria-label="Read Articles" className={`${styles.card} card`}>
          <div className={styles.cardContent}>
            <div className={styles.iconWrapper}>
              <i className={`fas fa-book ${styles.icon}`} aria-hidden="true"></i>
            </div>
            <div className={styles.cardText}>
              <h3>Articles</h3>
              <p>In-depth reads on climate, conservation, sustainable living and more.</p>
            </div>
          </div>
        </Link>

        <Link href="/resources/videos" aria-label="Watch Videos" className={`${styles.card} card`}>
          <div className={styles.cardContent}>
            <div className={`${styles.iconWrapper} ${styles.videos}`}>
              <i className={`fas fa-video ${styles.icon}`} aria-hidden="true"></i>
            </div>
            <div className={styles.cardText}>
              <h3>Videos</h3>
              <p>Short explainers and talks to help you learn visually.</p>
            </div>
          </div>
        </Link>

        <Link href="/resources/quizzes" aria-label="Take Quizzes" className={`${styles.card} card`}>
          <div className={styles.cardContent}>
            <div className={`${styles.iconWrapper} ${styles.quizzes}`}>
              <i className={`fas fa-question ${styles.icon}`} aria-hidden="true"></i>
            </div>
            <div className={styles.cardText}>
              <h3>Quizzes</h3>
              <p>Short quizzes to test your knowledge and track progress.</p>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
