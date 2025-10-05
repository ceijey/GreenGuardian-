'use client';

import styles from './ProgressChart.module.css';

interface WeeklyData {
  week: string;
  score: number;
  actions: number;
}

interface ProgressChartProps {
  data: WeeklyData[];
}

export default function ProgressChart({ data }: ProgressChartProps) {
  const maxScore = Math.max(...data.map(item => item.score), 100);
  const maxActions = Math.max(...data.map(item => item.actions), 10);

  const formatWeek = (weekStr: string) => {
    const date = new Date(weekStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const calculateTrend = () => {
    if (data.length < 2) return 0;
    const recent = data.slice(0, Math.min(4, data.length));
    const older = data.slice(4, Math.min(8, data.length));
    
    if (older.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, item) => sum + item.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.score, 0) / older.length;
    
    return ((recentAvg - olderAvg) / olderAvg) * 100;
  };

  const trend = calculateTrend();
  const isPositive = trend > 0;

  if (data.length === 0) {
    return (
      <div className={styles.emptyChart}>
        <i className="fas fa-chart-line"></i>
        <p>No progress data available yet</p>
      </div>
    );
  }

  return (
    <div className={styles.chartContainer}>
      {/* Chart Header */}
      <div className={styles.chartHeader}>
        <div className={styles.chartTitle}>
          <h3>Weekly Score Progress</h3>
          <div className={styles.trendIndicator}>
            <span className={isPositive ? styles.positive : styles.negative}>
              <i className={`fas fa-arrow-${isPositive ? 'up' : 'down'}`}></i>
              {Math.abs(trend).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className={styles.chart}>
        <div className={styles.yAxis}>
          <span className={styles.axisLabel}>{maxScore}</span>
          <span className={styles.axisLabel}>{Math.floor(maxScore * 0.75)}</span>
          <span className={styles.axisLabel}>{Math.floor(maxScore * 0.5)}</span>
          <span className={styles.axisLabel}>{Math.floor(maxScore * 0.25)}</span>
          <span className={styles.axisLabel}>0</span>
        </div>

        <div className={styles.chartArea}>
          {/* Grid Lines */}
          <div className={styles.gridLines}>
            <div className={styles.gridLine}></div>
            <div className={styles.gridLine}></div>
            <div className={styles.gridLine}></div>
            <div className={styles.gridLine}></div>
          </div>

          {/* Line Chart */}
          <svg className={styles.lineChart} viewBox={`0 0 ${(data.length - 1) * 60 + 40} 200`}>
            {/* Score Line */}
            <polyline
              className={styles.scoreLine}
              points={data.map((item, index) => {
                const x = index * 60 + 20;
                const y = 200 - (item.score / maxScore) * 180;
                return `${x},${y}`;
              }).join(' ')}
            />
            
            {/* Score Points */}
            {data.map((item, index) => {
              const x = index * 60 + 20;
              const y = 200 - (item.score / maxScore) * 180;
              return (
                <circle
                  key={index}
                  className={styles.scorePoint}
                  cx={x}
                  cy={y}
                  r="4"
                />
              );
            })}
            
            {/* Actions Line */}
            <polyline
              className={styles.actionsLine}
              points={data.map((item, index) => {
                const x = index * 60 + 20;
                const y = 200 - (item.actions / maxActions) * 180;
                return `${x},${y}`;
              }).join(' ')}
            />
            
            {/* Action Points */}
            {data.map((item, index) => {
              const x = index * 60 + 20;
              const y = 200 - (item.actions / maxActions) * 180;
              return (
                <circle
                  key={`action-${index}`}
                  className={styles.actionPoint}
                  cx={x}
                  cy={y}
                  r="3"
                />
              );
            })}
          </svg>

          {/* X-Axis Labels */}
          <div className={styles.xAxisLabels}>
            {data.map((item, index) => (
              <span key={index} className={styles.xLabel}>
                {formatWeek(item.week)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#4CAF50' }}></div>
          <span>Sustainability Score</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#2196F3' }}></div>
          <span>Actions Count</span>
        </div>
      </div>

      {/* Chart Summary */}
      <div className={styles.chartSummary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Best Week:</span>
          <span className={styles.summaryValue}>
            {data.length > 0 
              ? formatWeek(data.reduce((best, current) => 
                  current.score > best.score ? current : best
                ).week)
              : 'N/A'
            }
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Average Score:</span>
          <span className={styles.summaryValue}>
            {data.length > 0 
              ? Math.round(data.reduce((sum, item) => sum + item.score, 0) / data.length)
              : 0
            }
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Actions:</span>
          <span className={styles.summaryValue}>
            {data.reduce((sum, item) => sum + item.actions, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}