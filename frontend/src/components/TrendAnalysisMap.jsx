import React, { useState, useEffect } from 'react';

const TrendAnalysisMap = ({ incidents, onMapClick, onIncidentsUpdate, onIncidentSelect }) => {
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrendData();
  }, []);

  const fetchTrendData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/trend-analysis');
      if (response.ok) {
        const data = await response.json();
        setTrendData(data);
      }
    } catch (error) {
      console.error('Error fetching trend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskScore) => {
    if (riskScore > 70) return 'red';
    if (riskScore > 40) return 'orange';
    return 'green';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence > 70) return 'red';
    if (confidence > 40) return 'orange';
    return 'green';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🔮 Trend Analysis</h3>
        <button
          onClick={fetchTrendData}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Analyzing incident patterns...</p>
        </div>
      ) : trendData ? (
        <div className="space-y-4">
          {/* AI Model Status */}
          {trendData.ai_model_status && (
            <div className={`p-3 rounded-lg text-center ${
              trendData.ai_model_status === 'optimal' ? 'bg-green-50 border border-green-200' :
              trendData.ai_model_status === 'suboptimal' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <div className="text-sm font-medium">
                🤖 AI Model: {trendData.ai_model_status.charAt(0).toUpperCase() + trendData.ai_model_status.slice(1)}
              </div>
              {trendData.ml_metrics && (
                <div className="text-xs text-gray-600 mt-1">
                  Quality: {trendData.ml_metrics.clustering_quality_score} | 
                  Clusters: {trendData.ml_metrics.clusters_found} | 
                  Data: {trendData.ml_metrics.data_sufficiency}
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-blue-600">{trendData.total_analyzed}</div>
              <div className="text-xs text-blue-600">Analyzed</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-orange-600">{trendData.hotspots?.length || 0}</div>
              <div className="text-xs text-orange-600">Hotspots</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-purple-600">{trendData.predictions?.length || 0}</div>
              <div className="text-xs text-purple-600">Predictions</div>
            </div>
          </div>

          {/* Hotspots */}
          {trendData.hotspots && trendData.hotspots.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-sm">🔥 Hotspots</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {trendData.hotspots.map((hotspot, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">🔥 Hotspot #{index + 1}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        hotspot.risk_score > 70 ? 'bg-red-100 text-red-800' :
                        hotspot.risk_score > 40 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {hotspot.risk_score}% risk
                      </span>
                    </div>
                    
                    {/* AI Insights */}
                    {hotspot.ai_insights && (
                      <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                        <div>📊 Density: {hotspot.ai_insights.spatial_density}</div>
                        <div>⏰ Temporal: {hotspot.ai_insights.temporal_pattern}</div>
                        <div>⚡ Priority: {hotspot.ai_insights.priority_weight}</div>
                        <div>🎯 Diversity: {hotspot.ai_insights.category_diversity}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predictions */}
          {trendData.predictions && trendData.predictions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-sm">🔮 Predictions</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {trendData.predictions.map((prediction, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">🔮 Prediction #{index + 1}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        prediction.confidence > 70 ? 'bg-red-100 text-red-800' :
                        prediction.confidence > 40 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {prediction.confidence}% confidence
                      </span>
                    </div>
                    
                    {/* AI Prediction Factors */}
                    {prediction.prediction_factors && (
                      <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                        <div>📊 Base: {prediction.prediction_factors.base_confidence}</div>
                        <div>📈 Data: +{prediction.prediction_factors.data_quality_bonus}</div>
                        <div>⏰ Time: +{prediction.prediction_factors.temporal_pattern_bonus}</div>
                        <div>🔍 Anomaly: +{prediction.prediction_factors.anomaly_detection_bonus}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!trendData.hotspots || trendData.hotspots.length === 0) && 
           (!trendData.predictions || trendData.predictions.length === 0) && (
            <div className="text-center py-4 text-gray-500 text-sm">
              {trendData.message || 'No patterns detected yet'}
            </div>
          )}

          <div className="text-xs text-gray-500 text-center">
            🤖 AI Analysis based on last 60 days
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 text-sm">
          Click "Refresh" to analyze trends
        </div>
      )}
    </div>
  );
};

export default TrendAnalysisMap;
