'use client';

import { useState } from 'react';
import styles from './ImpactChart.module.css';

interface MonthlyData {
  month: string;
  plasticBottles: number;
  foodWaste: number;
  co2: number;
  energy: number;
  water: number;
}

interface ImpactChartProps {
  data: MonthlyData[];
  selectedMetric: string;
}

export default function ImpactChart({ data, selectedMetric }: ImpactChartProps) {
  const [activeMetric, setActiveMetric] = useState('plasticBottles');

  const metrics = [
    { key: 'plasticBottles', label: 'Plastic Bottles', color: '#2196F3', unit: '' },
    { key: 'foodWaste', label: 'Food Waste', color: '#4CAF50', unit: 'kg' },
    { key: 'co2', label: 'CO₂ Reduced', color: '#8BC34A', unit: 'kg' },
    { key: 'energy', label: 'Energy Saved', color: '#FF9800', unit: 'kWh' },
    { key: 'water', label: 'Water Conserved', color: '#03A9F4', unit: 'L' }
  ];

  const getMaxValue = (metricKey: string) => {
    return Math.max(...data.map(item => item[metricKey as keyof MonthlyData] as number));
  };

  const formatValue = (value: number, unit: string) => {
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K' + (unit ? ` ${unit}` : '');
    }
    return value.toFixed(0) + (unit ? ` ${unit}` : '');
  };

  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const currentMetric = metrics.find(m => m.key === activeMetric) || metrics[0];
  const maxValue = getMaxValue(activeMetric);

  return (
    <div className={styles.chartContainer}>
      {/* Metric Selector */}
      <div className={styles.metricSelector}>
        {metrics.map((metric) => (
          <button
            key={metric.key}
            className={`${styles.metricButton} ${activeMetric === metric.key ? styles.active : ''}`}
            onClick={() => setActiveMetric(metric.key)}
            style={{ 
              backgroundColor: activeMetric === metric.key ? metric.color : 'transparent',
              borderColor: metric.color
            }}
          >
            {metric.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className={styles.chart}>
        <div className={styles.yAxis}>
          <span className={styles.axisLabel}>{formatValue(maxValue, currentMetric.unit)}</span>
          <span className={styles.axisLabel}>{formatValue(maxValue * 0.75, currentMetric.unit)}</span>
          <span className={styles.axisLabel}>{formatValue(maxValue * 0.5, currentMetric.unit)}</span>
          <span className={styles.axisLabel}>{formatValue(maxValue * 0.25, currentMetric.unit)}</span>
          <span className={styles.axisLabel}>0</span>
        </div>

        <div className={styles.chartArea}>
          <div className={styles.gridLines}>
            <div className={styles.gridLine}></div>
            <div className={styles.gridLine}></div>
            <div className={styles.gridLine}></div>
            <div className={styles.gridLine}></div>
          </div>

          <div className={styles.bars}>
            {data.map((item, index) => {
              const value = item[activeMetric as keyof MonthlyData] as number;
              const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
              
              return (
                <div key={index} className={styles.barContainer}>
                  <div 
                    className={styles.bar}
                    style={{ 
                      height: `${height}%`,
                      backgroundColor: currentMetric.color
                    }}
                    title={`${formatMonth(item.month)}: ${formatValue(value, currentMetric.unit)}`}
                  >
                    <div className={styles.barValue}>
                      {formatValue(value, currentMetric.unit)}
                    </div>
                  </div>
                  <div className={styles.barLabel}>
                    {formatMonth(item.month)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart Summary */}
      <div className={styles.chartSummary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total:</span>
          <span className={styles.summaryValue}>
            {formatValue(
              data.reduce((sum, item) => sum + (item[activeMetric as keyof MonthlyData] as number), 0),
              currentMetric.unit
            )}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Average:</span>
          <span className={styles.summaryValue}>
            {formatValue(
              data.length > 0 
                ? data.reduce((sum, item) => sum + (item[activeMetric as keyof MonthlyData] as number), 0) / data.length
                : 0,
              currentMetric.unit
            )}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Best Month:</span>
          <span className={styles.summaryValue}>
            {data.length > 0 
              ? formatMonth(
                  data.reduce((best, current) => 
                    (current[activeMetric as keyof MonthlyData] as number) > 
                    (best[activeMetric as keyof MonthlyData] as number) ? current : best
                  ).month
                )
              : 'N/A'
            }
          </span>
        </div>
      </div>
    </div>
  );
}