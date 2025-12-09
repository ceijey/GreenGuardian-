'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import GovHeader from '@/components/GovHeader';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from '../gov-portal.module.css';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface AnalyticsData {
  totalCitizens: number;
  activeUsers: number;
  totalReports: number;
  resolvedReports: number;
  totalEcoActions: number;
  carbonOffset: number;
  wasteRecycled: number;
}

export default function GovAnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalCitizens: 0,
    activeUsers: 0,
    totalReports: 0,
    resolvedReports: 0,
    totalEcoActions: 0,
    carbonOffset: 0,
    wasteRecycled: 0
  });
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Date filter state
  const [filterType, setFilterType] = useState<'all' | 'day' | 'month' | 'year'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // Refs for capturing charts
  const kpiRef = useRef<HTMLDivElement>(null);
  const impactRef = useRef<HTMLDivElement>(null);
  const monthlyTrendRef = useRef<HTMLDivElement>(null);
  const chartsGridRef = useRef<HTMLDivElement>(null);
  const insightsRef = useRef<HTMLDivElement>(null);

  const isGovOfficial = user?.email?.endsWith('@gordoncollege.edu.ph') || user?.email?.includes('admin');

  // Filter reports based on selected date range
  const getFilteredReports = () => {
    if (filterType === 'all') return reports;
    
    return reports.filter(report => {
      const reportDate = report.timestamp?.toDate ? report.timestamp.toDate() : new Date(report.timestamp);
      
      if (filterType === 'day') {
        const reportDateStr = reportDate.toISOString().split('T')[0];
        return reportDateStr === selectedDate;
      } else if (filterType === 'month') {
        const reportMonthStr = reportDate.toISOString().substring(0, 7);
        return reportMonthStr === selectedMonth;
      } else if (filterType === 'year') {
        const reportYearStr = reportDate.getFullYear().toString();
        return reportYearStr === selectedYear;
      }
      
      return true;
    });
  };

  const filteredReports = getFilteredReports();

  useEffect(() => {
    if (!user) return;

    const loadAnalytics = async () => {
      try {
        const globalStatsRef = doc(db, 'globalStats', 'aggregate');
        const globalSnapshot = await getDoc(globalStatsRef);
        
        if (globalSnapshot.exists()) {
          const data = globalSnapshot.data();
          setAnalytics(prev => ({
            ...prev,
            totalCitizens: data.totalUsers || 0,
            totalEcoActions: data.totalActions || 0,
            carbonOffset: data.totalCO2Reduced || 0,
            wasteRecycled: data.totalWasteRecycled || 0
          }));
        }

        const reportsQuery = query(collection(db, 'incidentReports'));
        const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
          const reportsList: any[] = [];
          snapshot.forEach((doc) => {
            reportsList.push({ id: doc.id, ...doc.data() });
          });
          
          setReports(reportsList);
          setAnalytics(prev => ({
            ...prev,
            totalReports: reportsList.length,
            resolvedReports: reportsList.filter(r => r.status === 'resolved').length,
            activeUsers: new Set(reportsList.map(r => r.reporterId)).size
          }));
          
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error loading analytics:', error);
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [user]);

  // Data for charts
  const getReportTrendData = () => {
    const trends: any = {};
    filteredReports.forEach(report => {
      const type = report.incidentType || 'other';
      const label = type.replace('-', ' ').split(' ').map((w: string) => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
      trends[label] = (trends[label] || 0) + 1;
    });
    return Object.entries(trends).map(([name, value]) => ({ name, value }));
  };

  const getStatusData = () => {
    return [
      { name: 'Pending', value: filteredReports.filter(r => r.status === 'pending').length, color: '#FF9800' },
      { name: 'Investigating', value: filteredReports.filter(r => r.status === 'investigating').length, color: '#2196F3' },
      { name: 'Resolved', value: filteredReports.filter(r => r.status === 'resolved').length, color: '#4CAF50' },
      { name: 'Rejected', value: filteredReports.filter(r => r.status === 'rejected').length, color: '#F44336' }
    ];
  };

  const getMonthlyTrend = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const monthlyData: any = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      monthlyData[months[monthIndex]] = { reports: 0, resolved: 0 };
    }
    
    filteredReports.forEach(report => {
      const date = report.timestamp?.toDate?.();
      if (date) {
        const monthName = months[date.getMonth()];
        if (monthlyData[monthName]) {
          monthlyData[monthName].reports++;
          if (report.status === 'resolved') {
            monthlyData[monthName].resolved++;
          }
        }
      }
    });
    
    return Object.entries(monthlyData).map(([month, data]: any) => ({
      month,
      reports: data.reports,
      resolved: data.resolved
    }));
  };

  const getPriorityData = () => {
    return [
      { name: 'Low', value: filteredReports.filter(r => r.priority === 'low').length, color: '#4CAF50' },
      { name: 'Medium', value: filteredReports.filter(r => r.priority === 'medium').length, color: '#FF9800' },
      { name: 'High', value: filteredReports.filter(r => r.priority === 'high').length, color: '#F44336' },
      { name: 'Urgent', value: filteredReports.filter(r => r.priority === 'urgent').length, color: '#B71C1C' }
    ];
  };

  const getResolutionRate = () => {
    if (filteredReports.length === 0) return 0;
    const resolvedCount = filteredReports.filter(r => r.status === 'resolved').length;
    return ((resolvedCount / filteredReports.length) * 100).toFixed(1);
  };

  const exportToPDF = async () => {
    try {
      setExporting(true);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Add cover page
      pdf.setFontSize(24);
      pdf.setTextColor(40, 167, 69);
      pdf.text('GreenGuardian Analytics Report', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 15;
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 20;
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Key Performance Indicators', 14, yPosition);

      // Add KPI summary
      yPosition += 10;
      pdf.setFontSize(10);
      const activeReportsCount = filteredReports.filter(r => r.status !== 'resolved').length;
      const resolvedCount = filteredReports.filter(r => r.status === 'resolved').length;
      const kpiData = [
        ['Metric', 'Value'],
        ['Total Citizens Engaged', analytics.totalCitizens.toLocaleString()],
        ['Total Reports (Filtered)', filteredReports.length.toLocaleString()],
        ['Active Reports', activeReportsCount.toLocaleString()],
        ['Resolved Reports', resolvedCount.toLocaleString()],
        ['Resolved Reports', analytics.resolvedReports.toLocaleString()],
        ['Resolution Rate', `${getResolutionRate()}%`],
        ['Carbon Offset', `${analytics.carbonOffset.toLocaleString()} kg CO₂`],
        ['Waste Recycled', `${analytics.wasteRecycled.toLocaleString()} kg`],
      ];

      autoTable(pdf, {
        startY: yPosition,
        head: [kpiData[0]],
        body: kpiData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [40, 167, 69] },
      });

      // Capture and add charts
      if (monthlyTrendRef.current) {
        pdf.addPage();
        yPosition = 20;
        pdf.setFontSize(14);
        pdf.text('Monthly Trends', 14, yPosition);
        
        const canvas = await html2canvas(monthlyTrendRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 28;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 14, yPosition + 5, imgWidth, imgHeight);
      }

      if (chartsGridRef.current) {
        pdf.addPage();
        yPosition = 20;
        pdf.setFontSize(14);
        pdf.text('Report Analytics', 14, yPosition);
        
        const canvas = await html2canvas(chartsGridRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 28;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // If the image is too tall, scale it down to fit
        const maxHeight = pageHeight - 40;
        if (imgHeight > maxHeight) {
          const scaledHeight = maxHeight;
          const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
          pdf.addImage(imgData, 'PNG', 14, yPosition + 5, scaledWidth, scaledHeight);
        } else {
          pdf.addImage(imgData, 'PNG', 14, yPosition + 5, imgWidth, imgHeight);
        }
      }

      if (insightsRef.current) {
        pdf.addPage();
        yPosition = 20;
        pdf.setFontSize(14);
        pdf.text('Key Insights', 14, yPosition);
        
        const canvas = await html2canvas(insightsRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 28;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 14, yPosition + 5, imgWidth, imgHeight);
      }

      // Save the PDF
      pdf.save(`GreenGuardian-Analytics-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (!user) {
    return (
      <>
        <GovHeader />
        <div className={styles.container}>
          <div className={styles.loginPrompt}>
            <h2>Please log in to view analytics</h2>
          </div>
        </div>
      </>
    );
  }

  if (!isGovOfficial) {
    return (
      <>
        <GovHeader />
        <div className={styles.container}>
          <div className={styles.accessDenied}>
            <h2>Access Denied</h2>
            <p>This portal is restricted to government officials only.</p>
          </div>
        </div>
      </>
    );
  }

  const reportTrendData = getReportTrendData();
  const statusData = getStatusData();
  const monthlyTrend = getMonthlyTrend();
  const priorityData = getPriorityData();
  const COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4'];

  return (
    <>
      <GovHeader />
      
      <div className={styles.container}>
        <section className={styles.hero}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <h1>📊 Analytics & Performance Insights</h1>
              <p className={styles.subtitle}>
                Track community engagement, environmental impact, and report resolution metrics
              </p>
            </div>
            <button 
              onClick={exportToPDF}
              disabled={exporting}
              style={{
                padding: '12px 24px',
                background: exporting ? '#ccc' : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: exporting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                if (!exporting) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
              }}
            >
              <i className={exporting ? "fas fa-spinner fa-spin" : "fas fa-file-pdf"}></i>
              {exporting ? 'Generating PDF...' : 'Export PDF Report'}
            </button>
          </div>
        </section>

        {/* Date Filter Controls */}
        <section style={{ 
          background: 'white', 
          padding: '1.5rem', 
          borderRadius: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: '#333' }}>
            📅 Filter Reports by Date
          </h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}>
            {/* Filter Type Selector */}
            <div style={{ flex: '0 0 auto' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                Filter Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                style={{
                  padding: '0.625rem 1rem',
                  borderRadius: '8px',
                  border: '2px solid #e0e0e0',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  background: 'white',
                  minWidth: '120px'
                }}
              >
                <option value="all">All Time</option>
                <option value="day">By Day</option>
                <option value="month">By Month</option>
                <option value="year">By Year</option>
              </select>
            </div>

            {/* Day Picker */}
            {filterType === 'day' && (
              <div style={{ flex: '0 0 auto' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={{
                    padding: '0.625rem 1rem',
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    minWidth: '160px'
                  }}
                />
              </div>
            )}

            {/* Month Picker */}
            {filterType === 'month' && (
              <div style={{ flex: '0 0 auto' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                  Select Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  max={new Date().toISOString().substring(0, 7)}
                  style={{
                    padding: '0.625rem 1rem',
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    minWidth: '160px'
                  }}
                />
              </div>
            )}

            {/* Year Picker */}
            {filterType === 'year' && (
              <div style={{ flex: '0 0 auto' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                  Select Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{
                    padding: '0.625rem 1rem',
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    minWidth: '120px'
                  }}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Summary */}
            <div style={{ 
              flex: '1 1 auto', 
              padding: '0.625rem 1rem', 
              background: '#f0f9ff', 
              borderRadius: '8px',
              border: '2px solid #bfdbfe',
              minWidth: '200px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#1e40af', marginBottom: '0.25rem' }}>
                Showing Results
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1e3a8a' }}>
                {filteredReports.length} of {reports.length} reports
              </div>
            </div>
          </div>
        </section>

        {/* Key Performance Indicators */}
        <section className={styles.statsSection}>
          <h2>Key Performance Indicators</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#2196F3' }}>
                <i className="fas fa-users"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{analytics.totalCitizens}</div>
                <div className={styles.statLabel}>Registered Citizens</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#4CAF50' }}>
                <i className="fas fa-leaf"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{analytics.totalEcoActions.toLocaleString()}</div>
                <div className={styles.statLabel}>Total Eco-Actions</div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#FF9800' }}>
                <i className="fas fa-file-alt"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{filteredReports.length}</div>
                <div className={styles.statLabel}>
                  {filterType === 'all' ? 'Total Reports' : 'Filtered Reports'}
                </div>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#9C27B0' }}>
                <i className="fas fa-percentage"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{getResolutionRate()}%</div>
                <div className={styles.statLabel}>Resolution Rate</div>
              </div>
            </div>
          </div>
        </section>

        {/* Environmental Impact with Area Chart */}
        <section className={styles.statsSection}>
          <h2>🌍 Environmental Impact Metrics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Impact Overview</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={[
                  { name: 'CO₂ Offset', value: analytics.carbonOffset },
                  { name: 'Waste Recycled', value: analytics.wasteRecycled },
                  { name: 'Eco Actions', value: analytics.totalEcoActions / 10 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#4CAF50" fill="#4CAF50" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#4CAF50' }}>
                  <i className="fas fa-cloud"></i>
                </div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{analytics.carbonOffset.toLocaleString()} kg</div>
                  <div className={styles.statLabel}>CO₂ Offset</div>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#2196F3' }}>
                  <i className="fas fa-recycle"></i>
                </div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{analytics.wasteRecycled.toLocaleString()} kg</div>
                  <div className={styles.statLabel}>Waste Recycled</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Monthly Trend Line Chart */}
        <section className={styles.reportsSection} ref={monthlyTrendRef}>
          <h2>📈 Monthly Report Trends (Last 6 Months)</h2>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="reports" stroke="#2196F3" strokeWidth={2} name="Total Reports" />
                <Line type="monotone" dataKey="resolved" stroke="#4CAF50" strokeWidth={2} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }} ref={chartsGridRef}>
          {/* Report Types Bar Chart */}
          <section className={styles.reportsSection}>
            <h2>📊 Report Types Distribution</h2>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              {reportTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2196F3">
                      {reportTrendData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyState}>
                  <p>No report data available</p>
                </div>
              )}
            </div>
          </section>

          {/* Status Pie Chart */}
          <section className={styles.reportsSection}>
            <h2>🎯 Report Status Breakdown</h2>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Priority Distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          <section className={styles.reportsSection}>
            <h2>⚠️ Priority Distribution</h2>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Key Insights */}
          <section className={styles.reportsSection} ref={insightsRef}>
            <h2>💡 Key Insights</h2>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', borderLeft: '4px solid #4CAF50', background: '#f1f8f4' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>
                    {getResolutionRate()}%
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    Resolution Success Rate
                  </div>
                </div>
                
                <div style={{ padding: '1rem', borderLeft: '4px solid #2196F3', background: '#f1f5f9' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2196F3' }}>
                    {analytics.activeUsers}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    Active Community Reporters
                  </div>
                </div>
                
                <div style={{ padding: '1rem', borderLeft: '4px solid #FF9800', background: '#fff8f1' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FF9800' }}>
                    {filteredReports.filter(r => r.priority === 'urgent' || r.priority === 'high').length}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    High Priority Issues Pending
                  </div>
                </div>

                <div style={{ padding: '1rem', borderLeft: '4px solid #9C27B0', background: '#f8f1f9' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#9C27B0' }}>
                    {((analytics.carbonOffset / (analytics.totalCitizens || 1))).toFixed(2)} kg
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    Avg. CO₂ Offset Per Citizen
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
