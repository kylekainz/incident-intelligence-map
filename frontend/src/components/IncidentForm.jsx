//incidentform.jsx
import React, { useState } from 'react';

export default function IncidentForm({ location, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    category: 'Pothole',
    description: '',
    priority: 'Medium',
    address: ''
  });

  const categoryOptions = [
    "Pothole", "Wildlife", "Street Light Out", "Debris/Trash",
    "Traffic Jam", "Car Accident", "Broken Down Car", "Lane Closure", "Police"
  ];

  const priorityOptions = ["Low", "Medium", "High"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const incidentData = {
      ...formData,
      latitude: location.lat,
      longitude: location.lng,
      status: 'Open'
    };

    try {
      const response = await fetch('http://localhost:8000/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incidentData),
      });

      if (response.ok) {
        const newIncident = await response.json();
        onSubmit(newIncident);
      } else {
        console.error('Failed to create incident');
      }
    } catch (error) {
      console.error('Error creating incident:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Report New Incident</h2>
          <p className="text-gray-400 text-sm mt-1">
            Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </p>
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Selection */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
            Incident Category
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
            required
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200 resize-none"
            placeholder="Describe the incident in detail..."
            required
          />
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-2">
            Priority Level
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
            required
          >
            {priorityOptions.map((priority) => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2">
            Address (Optional)
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter street address or landmark..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg font-medium hover:bg-gray-600 hover:text-white transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Report Incident
          </button>
        </div>
      </form>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
        <h3 className="text-sm font-medium text-gray-200 mb-2">💡 Tips for better reports:</h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Be specific about the location and severity</li>
          <li>• Include relevant details that could help responders</li>
          <li>• Use appropriate priority levels to help with triage</li>
          <li>• Your report will be visible to other users in real-time</li>
        </ul>
      </div>
    </div>
  );
}









