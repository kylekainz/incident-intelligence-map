import React, { useState } from 'react';

const IncidentStatusManager = ({ incident, onStatusUpdate }) => {
  const [status, setStatus] = useState(incident.status || 'Open');
  const [description, setDescription] = useState(incident.description || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`http://localhost:8000/incidents/${incident.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: status,
          description: description
        }),
      });

      if (response.ok) {
        const updatedIncident = await response.json();
        onStatusUpdate(updatedIncident);
        console.log('Status updated successfully:', updatedIncident);
        
        // Clear the form after successful update
        setDescription('');
      } else {
        console.error('Failed to update status');
        alert('Failed to update incident status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating incident status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open':
        return 'bg-red-100 text-red-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border">
      <h3 className="text-lg font-semibold mb-3">Update Incident Status</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Status
          </label>
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
            {incident.status}
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any additional details..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
          />
        </div>

        <button
          onClick={handleStatusUpdate}
          disabled={isUpdating}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUpdating ? 'Updating...' : 'Update Status'}
        </button>
      </div>
    </div>
  );
};

export default IncidentStatusManager; 