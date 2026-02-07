import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showMessage && isOnline) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300 ${
        isOnline
          ? 'bg-green-600 text-white'
          : 'bg-orange-600 text-white'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-6 h-6" />
          <div>
            <p className="font-semibold">Back Online</p>
            <p className="text-sm">Connection restored</p>
          </div>
        </>
      ) : (
        <>
          <WifiOff className="w-6 h-6" />
          <div>
            <p className="font-semibold">Offline Mode</p>
            <p className="text-sm">Using cached data</p>
          </div>
        </>
      )}
    </div>
  );
};

export default OfflineIndicator;
