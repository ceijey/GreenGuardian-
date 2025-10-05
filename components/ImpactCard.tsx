'use client';

import styles from './ImpactCard.module.css';

interface ImpactCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  description: string;
  trend: string;
}

export default function ImpactCard({ title, value, icon, color, description, trend }: ImpactCardProps) {
  const isPositiveTrend = trend.startsWith('+');

  return (
    <div className={styles.impactCard}>
      <div className={styles.header}>
        <div className={styles.iconContainer} style={{ backgroundColor: `${color}15` }}>
          <i className={icon} style={{ color }}></i>
        </div>
        <div className={styles.trend}>
          <span className={isPositiveTrend ? styles.positive : styles.negative}>
            {trend}
          </span>
        </div>
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.value}>{value}</div>
        <p className={styles.description}>{description}</p>
      </div>
      
      <div className={styles.progressBar}>
        <div 
          className={styles.progress}
          style={{ backgroundColor: color }}
        ></div>
      </div>
    </div>
  );
}