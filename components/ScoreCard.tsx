'use client';

import styles from './ScoreCard.module.css';

interface ScoreCardProps {
  title: string;
  score: number;
  icon: string;
  color: string;
  trend?: string;
}

export default function ScoreCard({ title, score, icon, color, trend }: ScoreCardProps) {
  const isPositiveTrend = trend?.startsWith('+');

  return (
    <div className={styles.scoreCard} style={{ borderLeftColor: color }}>
      <div className={styles.header}>
        <div className={styles.iconContainer} style={{ backgroundColor: `${color}15` }}>
          <i className={icon} style={{ color }}></i>
        </div>
        {trend && (
          <div className={styles.trend}>
            <span className={isPositiveTrend ? styles.positive : styles.negative}>
              {trend}
            </span>
          </div>
        )}
      </div>
      
      <div className={styles.content}>
        <div className={styles.score}>{score.toLocaleString()}</div>
        <div className={styles.title}>{title}</div>
      </div>
      
      <div className={styles.progressBar}>
        <div 
          className={styles.progress}
          style={{ 
            backgroundColor: color,
            width: `${Math.min((score / 1000) * 100, 100)}%`
          }}
        ></div>
      </div>
    </div>
  );
}