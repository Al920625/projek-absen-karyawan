import { CheckCircle, XCircle, Info } from 'lucide-react';
import { useApp } from '@/react-app/contexts/AppContext';

export default function NotificationToast() {
  const { notifications, isDarkMode } = useApp();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-300 transform hover:scale-105 transition-all ${
            isDarkMode
              ? 'bg-gradient-to-br from-red-900/95 via-yellow-900/95 to-red-900/95 border-2 border-yellow-600/50'
              : 'bg-gradient-to-br from-red-500/95 via-yellow-500/95 to-red-500/95 border-2 border-yellow-600/50'
          }`}
          style={{
            animation: 'float 3s ease-in-out infinite',
            boxShadow: isDarkMode 
              ? '0 8px 32px rgba(255, 200, 0, 0.3), 0 0 20px rgba(255, 0, 0, 0.2)'
              : '0 8px 32px rgba(255, 200, 0, 0.5), 0 0 20px rgba(255, 0, 0, 0.3)'
          }}
        >
          {notification.type === 'success' && (
            <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5 drop-shadow-lg" />
          )}
          {notification.type === 'error' && (
            <XCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5 drop-shadow-lg" />
          )}
          {notification.type === 'info' && (
            <Info className="w-5 h-5 text-white flex-shrink-0 mt-0.5 drop-shadow-lg" />
          )}
          <p className="flex-1 text-sm font-bold text-white drop-shadow-md">
            {notification.message}
          </p>
        </div>
      ))}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}
