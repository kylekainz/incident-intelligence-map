import React, { useState, useEffect } from 'react';

const AdminPanel = ({ incidents, onClose, onIncidentsUpdate }) => {
  const [selectedTab, setSelectedTab] = useState('incidents');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // New state for filtering and searching
  const [searchId, setSearchId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Function to handle automatic logout on token expiration
  const handleTokenExpiration = () => {
    console.log('Token expired or invalid, logging out automatically');
        localStorage.removeItem('adminToken');
    alert('Your session has expired. Please log in again.');
    onClose();
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Pothole': '🕳️',
      'Wildlife': '🦌',
      'Street Light Out': '💡',
      'Debris/Trash': '🗑️',
      'Traffic Jam': '🚗',
      'Car Accident': '🚨',
      'Broken Down Car': '🚗',
      'Lane Closure': '🚧',
      'Police': '👮'
    };
    return icons[category] || '📍';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Open': 'bg-yellow-900 text-yellow-200',
      'In Progress': 'bg-blue-900 text-blue-200',
      'Resolved': 'bg-green-900 text-green-200'
    };
    return colors[status] || 'bg-gray-900 text-gray-200';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Low': 'bg-green-900 text-green-200',
      'Medium': 'bg-yellow-900 text-yellow-200',
      'High': 'bg-red-900 text-red-200',
      'Critical': 'bg-purple-900 text-purple-200'
    };
    return colors[priority] || 'bg-gray-900 text-gray-200';
  };

  const handleStatusChange = async (incidentId, newStatus) => {
    try {
      // Get the current incident to send all required fields
      const currentIncident = incidents.find(inc => inc.id === incidentId);
      if (!currentIncident) return;

      // Get auth token
      const authToken = localStorage.getItem('adminToken');

      const response = await fetch(`http://localhost:8000/incidents/${incidentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          category: currentIncident.category,
          description: currentIncident.description,
          priority: currentIncident.priority,
          status: newStatus,
          latitude: currentIncident.latitude,
          longitude: currentIncident.longitude
        }),
      });

      if (response.ok) {
        const updatedIncident = await response.json();
        
        // Create the updated incident with the new status
        const updatedIncidentWithNewStatus = {
          ...updatedIncident,
          status: newStatus
        };
        
        // Update the incidents list - this should update the map and left sidebar
        const updatedIncidents = incidents.map(inc => 
          inc.id === incidentId ? updatedIncidentWithNewStatus : inc
        );
        
        // Call the parent update function to update the main incidents state
        onIncidentsUpdate(updatedIncidents);
        
        // Update the selected incident immediately for UI responsiveness
        if (selectedIncident?.id === incidentId) {
          setSelectedIncident(prev => ({
            ...prev,
            status: newStatus
          }));
        }
        
        console.log('Status updated successfully to:', newStatus);
        console.log('Updated incidents list:', updatedIncidents);
        
        // Force a re-render by updating local state
        setSelectedIncident(prev => prev ? {
          ...prev,
          status: newStatus
        } : null);
        
      } else {
        console.error('Failed to update status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        if (response.status === 401) {
          handleTokenExpiration();
          return;
        }
        
        alert('Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating incident status:', error);
      alert('Error updating status. Please try again.');
    }
  };

  const handlePriorityChange = async (incidentId, newPriority) => {
    try {
      // Get the current incident to send all required fields
      const currentIncident = incidents.find(inc => inc.id === incidentId);
      if (!currentIncident) return;

      // Get auth token
      const authToken = localStorage.getItem('adminToken');

      const response = await fetch(`http://localhost:8000/incidents/${incidentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          category: currentIncident.category,
          description: currentIncident.description,
          priority: newPriority,
          status: currentIncident.status,
          latitude: currentIncident.latitude,
          longitude: currentIncident.longitude
        }),
      });

      if (response.ok) {
        const updatedIncident = await response.json();
        
        // Create the updated incident with the new priority
        const updatedIncidentWithNewPriority = {
          ...updatedIncident,
          priority: newPriority
        };
        
        // Update the incidents list - this should update the map and left sidebar
        const updatedIncidents = incidents.map(inc => 
          inc.id === incidentId ? updatedIncidentWithNewPriority : inc
        );
        
        // Call the parent update function to update the main incidents state
        onIncidentsUpdate(updatedIncidents);
        
        // Update the selected incident immediately for UI responsiveness
        if (selectedIncident?.id === incidentId) {
          setSelectedIncident(prev => ({
            ...prev,
            priority: newPriority
          }));
        }
        
        console.log('Priority updated successfully to:', newPriority);
        console.log('Updated incidents list:', updatedIncidents);
        
        // Force a re-render by updating local state
        setSelectedIncident(prev => prev ? {
          ...prev,
          priority: newPriority
        } : null);
        
      } else {
        console.error('Failed to update priority:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        if (response.status === 401) {
          handleTokenExpiration();
          return;
        }
        
        alert('Failed to update priority. Please try again.');
      }
    } catch (error) {
      console.error('Error updating incident priority:', error);
      alert('Error updating priority. Please try again.');
    }
  };

  const handleDeleteIncident = async (incidentId) => {
    if (!window.confirm('Are you sure you want to delete this incident? This action cannot be undone.')) {
      return;
    }

    try {
      // Get auth token from localStorage
      const authToken = localStorage.getItem('adminToken');
      
      if (!authToken) {
        alert('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`http://localhost:8000/admin/incidents/${incidentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Remove from incidents list
        const updatedIncidents = incidents.filter(inc => inc.id !== incidentId);
        onIncidentsUpdate(updatedIncidents);
        
        // Clear selection if deleted incident was selected
        if (selectedIncident?.id === incidentId) {
          setSelectedIncident(null);
        }
        
        alert('Incident deleted successfully!');
      } else {
        console.error('Failed to delete incident:', response.status);
        if (response.status === 403) {
          alert('Permission denied. You may need admin privileges to delete incidents.');
        } else if (response.status === 401) {
          handleTokenExpiration();
          return;
        } else {
          alert('Failed to delete incident. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error deleting incident:', error);
      alert('Error deleting incident. Please try again.');
    }
  };

  const fetchTrendAnalysis = async () => {
    setLoading(true);
    try {
      // Get auth token for the request
      const authToken = localStorage.getItem('adminToken');
      
      if (!authToken) {
        console.error('No auth token found for trend analysis');
        setTrendData(null);
        setLoading(false);
        return;
      }
      
      console.log('Fetching trend analysis with token:', authToken.substring(0, 20) + '...');
      
      const response = await fetch('http://localhost:8000/trend-analysis', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Trend analysis response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Trend analysis data received:', data);
        setTrendData(data);
      } else {
        console.error('Failed to fetch trend analysis:', response.status);
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        
        if (response.status === 401) {
          handleTokenExpiration();
          return;
        }
        setTrendData(null);
      }
    } catch (error) {
      console.error('Error fetching trend analysis:', error);
      setTrendData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTab === 'trend-analysis') {
      fetchTrendAnalysis();
    }
  }, [selectedTab]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Filter and search logic
  const getFilteredIncidents = () => {
    let filtered = incidents;

    // Filter by category
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(inc => inc.category === categoryFilter);
    }

    // Filter by priority
    if (priorityFilter !== 'All') {
      filtered = filtered.filter(inc => inc.priority === priorityFilter);
    }

    // Search by ID
    if (searchId.trim()) {
      const searchIdNum = parseInt(searchId.trim());
      if (!isNaN(searchIdNum)) {
        filtered = filtered.filter(inc => inc.id === searchIdNum);
      }
    }

    return filtered;
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(incidents.map(inc => inc.category))];
    return ['All', ...categories];
  };

  const getUniquePriorities = () => {
    const priorities = [...new Set(incidents.map(inc => inc.priority))];
    return ['All', ...priorities];
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
        {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">🔧 Admin Dashboard</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                localStorage.removeItem('adminToken');
                onClose();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Logout
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
            >
              ✕ Close
            </button>
          </div>
          </div>
        </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700 px-6">
        <nav className="flex space-x-8">
                <button
            onClick={() => setSelectedTab('incidents')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              selectedTab === 'incidents'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            📋 Incidents
                </button>
          <button
            onClick={() => setSelectedTab('trend-analysis')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              selectedTab === 'trend-analysis'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            📊 Trend Analysis
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {selectedTab === 'incidents' && (
          <div className="flex h-full">
            {/* Incidents List - Left Side */}
            <div className="w-1/2 border-r border-gray-700">
              <div className="h-full flex flex-col">
                <div className="p-6 border-b border-gray-700">
                  <h2 className="text-xl font-semibold text-white mb-4">All Incidents ({getFilteredIncidents().length})</h2>
                  
                  {/* Search and Filter Controls */}
                  <div className="space-y-4">
                    {/* Search by ID */}
                    <div className="flex items-center space-x-3">
                      <label className="text-sm font-medium text-gray-300">Search by ID:</label>
                      <input
                        type="text"
                        placeholder="Enter incident ID..."
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      />
                      {searchId && (
                        <button
                          onClick={() => setSearchId('')}
                          className="px-3 py-2 bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500 transition-colors text-sm"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    {/* Category and Priority Filters */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Category Filter:</label>
                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        >
                          {getUniqueCategories().map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Priority Filter:</label>
                        <select
                          value={priorityFilter}
                          onChange={(e) => setPriorityFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        >
                          {getUniquePriorities().map(priority => (
                            <option key={priority} value={priority}>{priority}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Clear All Filters Button */}
                    {(categoryFilter !== 'All' || priorityFilter !== 'All' || searchId) && (
                      <div className="flex justify-end">
                <button
                  onClick={() => {
                            setCategoryFilter('All');
                            setPriorityFilter('All');
                            setSearchId('');
                  }}
                          className="px-4 py-2 bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500 transition-colors text-sm"
                >
                          Clear All Filters
                </button>
              </div>
                    )}
            </div>
          </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-3">
                    {getFilteredIncidents().map((incident) => (
                      <div
                        key={incident.id}
                        onClick={() => setSelectedIncident(incident)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedIncident?.id === incident.id
                            ? 'border-teal-500 bg-teal-900/20'
                            : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{getCategoryIcon(incident.category)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="text-white font-medium truncate">{incident.category}</h3>
                                <span className="text-teal-400 text-sm font-mono bg-teal-900/20 px-2 py-1 rounded">#{incident.id}</span>
                    </div>
                              <p className="text-gray-400 text-sm truncate">{incident.description}</p>
                    </div>
                  </div>
                          <div className="flex flex-col items-end space-y-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                              {incident.status}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(incident.priority)}`}>
                              {incident.priority}
                          </span>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                          {formatDate(incident.created_at)}
                        </div>
                        </div>
                      ))}
                    </div>
                  </div>
                    </div>
                  </div>

            {/* Incident Details - Right Side */}
            <div className="w-1/2">
              <div className="h-full flex flex-col">
                {selectedIncident ? (
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-white">Incident Details</h2>
                        <span className="text-3xl">{getCategoryIcon(selectedIncident.category)}</span>
                      </div>

                      <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                          <h3 className="text-lg font-medium text-white mb-3">Basic Information</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">ID:</span>
                              <p className="text-white font-medium">#{selectedIncident.id}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Category:</span>
                              <p className="text-white font-medium">{selectedIncident.category}</p>
                            </div>
                            <div>
                              <span className="text-gray-400">Description:</span>
                              <p className="text-white">{selectedIncident.description}</p>
                            </div>
                  <div>
                              <span className="text-gray-400">Created:</span>
                              <p className="text-white">{formatDate(selectedIncident.created_at)}</p>
                        </div>
                            <div>
                              <span className="text-gray-400">Updated:</span>
                              <p className="text-white">{formatDate(selectedIncident.updated_at)}</p>
                    </div>
                  </div>
                </div>

                        {/* Location Info */}
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                          <h3 className="text-lg font-medium text-white mb-3">Location</h3>
                          <div className="text-sm space-y-2">
                            <div>
                              <span className="text-gray-400">Address:</span>
                              <p className="text-white">{selectedIncident.address || 'No address provided'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-gray-400">Latitude:</span>
                                <p className="text-white">{selectedIncident.latitude}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Longitude:</span>
                                <p className="text-white">{selectedIncident.longitude}</p>
                              </div>
                            </div>
                          </div>
                  </div>

                        {/* Status & Priority Controls */}
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                          <h3 className="text-lg font-medium text-white mb-3">Quick Actions</h3>
                          <div className="space-y-4">
                            {/* Status Control */}
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                              <select
                                value={selectedIncident.status}
                                onChange={(e) => handleStatusChange(selectedIncident.id, e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                              </select>
                            </div>
                            
                            {/* Priority Control */}
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                              <select
                                value={selectedIncident.priority}
                                onChange={(e) => handlePriorityChange(selectedIncident.id, e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                              </select>
                             </div>
                               </div>
                          </div>
                          
                        {/* Delete Button */}
                        <div className="bg-red-900/20 border border-red-700 p-4 rounded-lg">
                          <h3 className="text-lg font-medium text-red-300 mb-3">⚠️ Danger Zone</h3>
                          <p className="text-red-200 text-sm mb-4">
                            Deleting an incident will permanently remove it from the system. This action cannot be undone.
                          </p>
                          <button
                            onClick={() => handleDeleteIncident(selectedIncident.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
                          >
                            🗑️ Delete Incident
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="text-4xl mb-4">📋</div>
                      <p className="text-lg">Select an incident to view details</p>
                    </div>
                      </div>
                    )}
                  </div>
                </div>
          </div>
        )}

        {selectedTab === 'trend-analysis' && (
          <div className="h-full overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-6">📊 Trend Analysis & Hotspots</h2>
              
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading trend analysis...</p>
                  </div>
                </div>
              ) : trendData ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <h3 className="text-lg font-medium text-white mb-2">Total Hotspots</h3>
                      <p className="text-3xl font-bold text-teal-400">{trendData.hotspots?.length || 0}</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <h3 className="text-lg font-medium text-white mb-2">Average Risk Score</h3>
                      <p className="text-3xl font-bold text-yellow-400">
                        {trendData.hotspots && trendData.hotspots.length > 0
                          ? Math.round(trendData.hotspots.reduce((sum, h) => sum + h.risk_score, 0) / trendData.hotspots.length)
                          : 0}%
                      </p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <h3 className="text-lg font-medium text-white mb-2">Total Incidents Analyzed</h3>
                      <p className="text-3xl font-bold text-blue-400">{trendData.total_analyzed || 0}</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <h3 className="text-lg font-medium text-white mb-2">Geographic Coverage</h3>
                      <p className="text-3xl font-bold text-purple-400">
                        {trendData.hotspots && trendData.hotspots.length > 0
                          ? new Set(trendData.hotspots.map(h => h.location_name?.split(', ')[1]).filter(Boolean)).size
                          : 0}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">States Covered</p>
                    </div>
                  </div>

                  {/* Hotspots List */}
                  <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-700">
                      <h3 className="text-lg font-medium text-white">Identified Hotspots</h3>
                    </div>
                    <div className="divide-y divide-gray-700">
                      {trendData.hotspots?.map((hotspot, index) => (
                        <div key={index} className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-medium text-white mb-2">
                                Hotspot #{index + 1} - {hotspot.most_common_category || 'Mixed Categories'}
                              </h4>
                              <p className="text-gray-400 text-sm">
                                Location: {hotspot.location_name || 'Unknown Location'}
                              </p>
                              <p className="text-gray-500 text-xs">
                                Coordinates: {hotspot.center?.latitude?.toFixed(4) || 'N/A'}, {hotspot.center?.longitude?.toFixed(4) || 'N/A'}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-red-400 mb-1">{hotspot.risk_score}%</div>
                              <div className="text-sm text-gray-400">Risk Score</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-gray-700 p-3 rounded-lg">
                              <span className="text-gray-400 text-sm">Incident Count:</span>
                              <p className="text-white font-medium">{hotspot.incident_count || 'N/A'}</p>
                          </div>
                            <div className="bg-gray-700 p-3 rounded-lg">
                              <span className="text-gray-400 text-sm">Most Common Priority:</span>
                              <p className="text-white font-medium">{hotspot.most_common_priority || 'N/A'}</p>
                            </div>
                          </div>

                          {hotspot.ai_insights && (
                            <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
                              <h5 className="text-blue-300 font-medium mb-2">🤖 AI Insights</h5>
                              <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-blue-300">Temporal Pattern:</span>
                                    <p className="text-blue-200">{hotspot.ai_insights.temporal_pattern || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-blue-300">Spatial Density:</span>
                                    <p className="text-blue-200">{hotspot.ai_insights.spatial_density || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-blue-300">Priority Weight:</span>
                                    <p className="text-blue-200">{hotspot.ai_insights.priority_weight || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-blue-300">Category Diversity:</span>
                                    <p className="text-blue-200">{hotspot.ai_insights.category_diversity || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-blue-300">Recency Score:</span>
                                    <p className="text-blue-200">{hotspot.ai_insights.recency_score || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-blue-300">Anomaly Detection:</span>
                                    <p className="text-blue-200">{hotspot.ai_insights.anomaly_detection || 'N/A'}</p>
                          </div>
                        </div>
                                {hotspot.ai_insights.clustering_quality && (
                                  <div className="pt-2 border-t border-blue-700">
                                    <span className="text-blue-300">Clustering Quality:</span>
                                    <p className="text-blue-200">{hotspot.ai_insights.clustering_quality}</p>
                        </div>
                      )}
                    </div>
                  </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                  {/* ML Metrics */}
                  {trendData.ml_metrics && (
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                      <h3 className="text-lg font-medium text-white mb-4">Machine Learning Metrics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Optimal Clustering EPS:</span>
                          <p className="text-white">{trendData.ml_metrics.optimal_clustering_eps || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Clustering Quality Score:</span>
                          <p className="text-white">{trendData.ml_metrics.clustering_quality_score || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Clusters Found:</span>
                          <p className="text-white">{trendData.ml_metrics.clusters_found || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Predictions Generated:</span>
                          <p className="text-white">{trendData.ml_metrics.predictions_generated || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Data Sufficiency:</span>
                          <p className="text-white">{trendData.ml_metrics.data_sufficiency || 'N/A'}</p>
                        </div>
                      </div>
                  </div>
                  )}

                  {/* Predictions Section */}
                  {trendData.predictions && trendData.predictions.length > 0 && (
                    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-700">
                        <h3 className="text-lg font-medium text-white">AI Predictions</h3>
                      </div>
                      <div className="divide-y divide-gray-700">
                        {trendData.predictions.map((prediction, index) => (
                          <div key={index} className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="text-lg font-medium text-white mb-2">
                                  Prediction #{index + 1} - {prediction.predicted_category || 'Unknown Category'}
                                </h4>
                                <p className="text-gray-400 text-sm">
                                  Location: {prediction.location_name || 'Unknown Location'}
                                </p>
                                <p className="text-gray-500 text-xs">
                                  Coordinates: {prediction.latitude?.toFixed(4) || 'N/A'}, {prediction.longitude?.toFixed(4) || 'N/A'}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-green-400 mb-1">{prediction.confidence}%</div>
                                <div className="text-sm text-gray-400">Confidence</div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="bg-gray-700 p-3 rounded-lg">
                                <span className="text-gray-400 text-sm">Predicted Priority:</span>
                                <p className="text-white font-medium">{prediction.predicted_priority || 'N/A'}</p>
                              </div>
                              <div className="bg-gray-700 p-3 rounded-lg">
                                <span className="text-gray-400 text-sm">Hotspot ID:</span>
                                <p className="text-white font-medium">{prediction.hotspot_id || 'N/A'}</p>
                              </div>
                            </div>
                            
                            {prediction.prediction_factors && (
                              <div className="bg-green-900/20 border border-green-700 p-4 rounded-lg">
                                <h5 className="text-green-300 font-medium mb-2">🎯 Prediction Factors</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-green-300">Base Confidence:</span>
                                    <p className="text-green-200">{prediction.prediction_factors.base_confidence || 'N/A'}%</p>
                                  </div>
                                  <div>
                                    <span className="text-green-300">Data Quality Bonus:</span>
                                    <p className="text-green-200">{prediction.prediction_factors.data_quality_bonus || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-green-300">Temporal Pattern Bonus:</span>
                                    <p className="text-green-200">{prediction.prediction_factors.temporal_pattern_bonus || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-green-300">Anomaly Detection Bonus:</span>
                                    <p className="text-green-200">{prediction.prediction_factors.anomaly_detection_bonus || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                            )}
                      </div>
                    ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-12">
                  <div className="text-4xl mb-4">📊</div>
                  <p className="text-lg">No trend analysis data available</p>
                  <p className="text-sm mt-2">Try refreshing or check if the backend is running</p>
                      </div>
                    )}
                  </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; 