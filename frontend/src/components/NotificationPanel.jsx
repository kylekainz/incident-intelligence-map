import React, { useState, useEffect } from 'react';

const NotificationPanel = ({ notifications, onClear }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);

  useEffect(() => {
    if (notifications.length > 0) {
      setCurrentNotification(notifications[notifications.length - 1]);
      setIsVisible(true);
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notifications]);

  if (!isVisible || !currentNotification) return null;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      case 'area':
        return '📍';
      default:
        return '📢';
    }
  };

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'success':
        return 'border-green-600 bg-green-900/20';
      case 'warning':
        return 'border-yellow-600 bg-yellow-900/20';
      case 'error':
        return 'border-red-600 bg-red-900/20';
      case 'info':
        return 'border-blue-600 bg-blue-900/20';
      case 'area':
        return 'border-purple-600 bg-purple-900/20';
      default:
        return 'border-gray-600 bg-gray-900/20';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className={`bg-gray-800 border rounded-xl shadow-2xl p-4 ${getNotificationStyle(currentNotification.type)}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">
            {getNotificationIcon(currentNotification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-white">
                {currentNotification.title || 'Notification'}
              </h4>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {currentNotification.message && (
              <p className="text-sm text-gray-300 mb-2">
                {currentNotification.message}
              </p>
            )}
            
            {currentNotification.details && (
              <div className="text-xs text-gray-400 space-y-1">
                {Object.entries(currentNotification.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize">{key}:</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-600">
              <span className="text-xs text-gray-400">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </span>
              
              <div className="flex gap-2">
                {notifications.length > 1 && (
                  <button
                    onClick={() => {
                      const currentIndex = notifications.indexOf(currentNotification);
                      const nextIndex = (currentIndex + 1) % notifications.length;
                      setCurrentNotification(notifications[nextIndex]);
                    }}
                    className="text-xs text-teal-400 hover:text-teal-300 transition-colors px-2 py-1 rounded hover:bg-gray-700"
                  >
                    Next
                  </button>
                )}
                
                <button
                  onClick={onClear}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-gray-700"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel; 