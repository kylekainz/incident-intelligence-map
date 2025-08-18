import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, BarElement } from 'chart.js';
import { Pie, Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, BarElement
);

const DataAnalytics = ({ incidents = [], isVisible, onClose }) => {
  const [timeRange, setTimeRange] = useState(30);
  const [isLoading, setIsLoading] = useState(false);

  // Process data based on time range
  const processedData = useMemo(() => {
    if (!incidents || incidents.length === 0) return null;

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (timeRange * 24 * 60 * 60 * 1000));

    const filteredIncidents = incidents.filter(incident => {
      const incidentDate = new Date(incident.created_at);
      return incidentDate >= cutoffDate;
    });

    // Category counts
    const categoryCounts = {};
    filteredIncidents.forEach(incident => {
      categoryCounts[incident.category] = (categoryCounts[incident.category] || 0) + 1;
    });

    // Priority counts
    const priorityCounts = {};
    filteredIncidents.forEach(incident => {
      priorityCounts[incident.priority] = (priorityCounts[incident.priority] || 0) + 1;
    });

    // Status counts
    const statusCounts = {};
    filteredIncidents.forEach(incident => {
      statusCounts[incident.status] = (statusCounts[incident.status] || 0) + 1;
    });

    // Time series data (last 7 days)
    const timeSeriesData = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateKey = date.toISOString().split('T')[0];
      timeSeriesData[dateKey] = 0;
    }

    filteredIncidents.forEach(incident => {
      const incidentDate = incident.created_at.split('T')[0];
      if (timeSeriesData[incidentDate] !== undefined) {
        timeSeriesData[incidentDate]++;
      }
    });

    // Response time by category
    const responseTimeByCategory = {};
    filteredIncidents.forEach(incident => {
      if (incident.status === 'Resolved' && incident.updated_at && incident.created_at) {
        const created = new Date(incident.created_at);
        const updated = new Date(incident.updated_at);
        const responseTime = (updated - created) / (1000 * 60 * 60); // hours
        
        if (!responseTimeByCategory[incident.category]) {
          responseTimeByCategory[incident.category] = [];
        }
        responseTimeByCategory[incident.category].push(responseTime);
      }
    });

    // Calculate average response times
    const avgResponseTimes = {};
    Object.keys(responseTimeByCategory).forEach(category => {
      const times = responseTimeByCategory[category];
      avgResponseTimes[category] = times.reduce((a, b) => a + b, 0) / times.length;
    });

    return {
      total: filteredIncidents.length,
      categoryCounts,
      priorityCounts,
      statusCounts,
      timeSeriesData,
      avgResponseTimes
    };
  }, [incidents, timeRange]);

  // Chart configurations with dark theme
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#f3f4f6', // text-gray-100
          font: {
            family: 'Inter, sans-serif'
          }
        }
      },
      tooltip: {
        backgroundColor: '#374151', // bg-gray-700
        titleColor: '#f9fafb', // text-gray-100
        bodyColor: '#d1d5db', // text-gray-300
        borderColor: '#4b5563', // border-gray-600
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#d1d5db' // text-gray-300
        },
        grid: {
          color: '#4b5563' // border-gray-600
        }
      },
      y: {
        ticks: {
          color: '#d1d5db' // text-gray-300
        },
        grid: {
          color: '#4b5563' // border-gray-600
        }
      }
    }
  };

  // Chart data
  const categoryChartData = {
    labels: Object.keys(processedData?.categoryCounts || {}),
    datasets: [{
      data: Object.values(processedData?.categoryCounts || {}),
      backgroundColor: [
        '#14b8a6', // teal-500
        '#3b82f6', // blue-500
        '#8b5cf6', // violet-500
        '#ef4444', // red-500
        '#f59e0b', // yellow-500
        '#10b981', // green-500
        '#f97316', // orange-500
        '#ec4899', // pink-500
        '#06b6d4'  // cyan-500
      ],
      borderWidth: 2,
      borderColor: '#374151' // border-gray-700
    }]
  };

  const priorityChartData = {
    labels: Object.keys(processedData?.priorityCounts || {}),
    datasets: [{
      data: Object.values(processedData?.priorityCounts || {}),
      backgroundColor: [
        '#10b981', // green-500
        '#f59e0b', // yellow-500
        '#ef4444'  // red-500
      ],
      borderWidth: 2,
      borderColor: '#374151' // border-gray-700
    }]
  };

  const statusChartData = {
    labels: Object.keys(processedData?.statusCounts || {}),
    datasets: [{
      data: Object.values(processedData?.statusCounts || {}),
      backgroundColor: [
        '#ef4444', // red-500
        '#f59e0b', // yellow-500
        '#10b981'  // green-500
      ],
      borderWidth: 2,
      borderColor: '#374151' // border-gray-700
    }]
  };

  const timeSeriesChartData = {
    labels: Object.keys(processedData?.timeSeriesData || {}).map(date => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      label: 'Incidents',
      data: Object.values(processedData?.timeSeriesData || {}),
      borderColor: '#14b8a6', // teal-500
      backgroundColor: 'rgba(20, 184, 166, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#14b8a6',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2
    }]
  };

  const responseTimeChartData = {
    labels: Object.keys(processedData?.avgResponseTimes || {}),
    datasets: [{
      label: 'Average Response Time (hours)',
      data: Object.values(processedData?.avgResponseTimes || {}),
      backgroundColor: [
        '#14b8a6', // teal-500
        '#3b82f6', // blue-500
        '#8b5cf6', // violet-500
        '#ef4444', // red-500
        '#f59e0b', // yellow-500
        '#10b981', // green-500
        '#f97316', // orange-500
        '#ec4899', // pink-500
        '#06b6d4'  // cyan-500
      ],
      borderWidth: 2,
      borderColor: '#374151' // border-gray-700
    }]
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">📊 Data Analytics Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">
              Comprehensive insights into incident patterns and trends
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-300">Time Range:</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value))}
                className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
          {!processedData ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading analytics...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Total Incidents</p>
                      <p className="text-3xl font-bold text-white">{processedData.total}</p>
                    </div>
                    <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xl">📊</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Categories</p>
                      <p className="text-3xl font-bold text-white">{Object.keys(processedData.categoryCounts).length}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xl">🏷️</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">High Priority</p>
                      <p className="text-3xl font-bold text-white">{processedData.priorityCounts['High'] || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xl">⚡</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Resolved</p>
                      <p className="text-3xl font-bold text-white">{processedData.statusCounts['Resolved'] || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xl">✅</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Category Distribution */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h3 className="text-lg font-semibold text-white mb-4">📊 Incident Categories</h3>
                  <div className="h-64">
                    <Pie data={categoryChartData} options={chartOptions} />
                  </div>
                </div>

                {/* Priority Distribution */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h3 className="text-lg font-semibold text-white mb-4">⚡ Priority Levels</h3>
                  <div className="h-64">
                    <Doughnut data={priorityChartData} options={chartOptions} />
                  </div>
                </div>

                {/* Time Series */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-white mb-4">📈 Incident Trends (Last 7 Days)</h3>
                  <div className="h-64">
                    <Line data={timeSeriesChartData} options={chartOptions} />
                  </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h3 className="text-lg font-semibold text-white mb-4">📋 Current Status</h3>
                  <div className="h-64">
                    <Doughnut data={statusChartData} options={chartOptions} />
                  </div>
                </div>

                {/* Response Time by Category */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h3 className="text-lg font-semibold text-white mb-4">⏱️ Response Time by Category</h3>
                  <div className="h-64">
                    <Bar data={responseTimeChartData} options={chartOptions} />
                  </div>
                </div>
              </div>

              {/* Insights Section */}
              <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">💡 Key Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-md font-medium text-teal-400 mb-2">Most Common Issues</h4>
                    <ul className="text-gray-300 space-y-1">
                      {Object.entries(processedData.categoryCounts)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 3)
                        .map(([category, count]) => (
                          <li key={category} className="flex justify-between">
                            <span>{category}</span>
                            <span className="font-medium">{count} incidents</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-teal-400 mb-2">Response Efficiency</h4>
                    <ul className="text-gray-300 space-y-1">
                      {Object.entries(processedData.avgResponseTimes)
                        .sort(([,a], [,b]) => a - b)
                        .slice(0, 3)
                        .map(([category, time]) => (
                          <li key={category} className="flex justify-between">
                            <span>{category}</span>
                            <span className="font-medium">{time.toFixed(1)}h</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataAnalytics;
