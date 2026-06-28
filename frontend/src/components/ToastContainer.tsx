import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bgColor = 'bg-white dark:bg-slate-800';
        let borderLeft = 'border-l-4 border-emerald-500';
        let Icon = CheckCircle;
        let iconColor = 'text-emerald-500';

        if (toast.type === 'warning') {
          borderLeft = 'border-l-4 border-amber-500';
          Icon = AlertTriangle;
          iconColor = 'text-amber-500';
        } else if (toast.type === 'info') {
          borderLeft = 'border-l-4 border-sky-500';
          Icon = Info;
          iconColor = 'text-sky-500';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start p-4 rounded-lg shadow-lg border border-slate-150 dark:border-slate-700/50 ${bgColor} ${borderLeft} transform transition-all duration-300 animate-slide-in`}
          >
            <div className="flex-shrink-0 mr-3">
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 mr-2">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{toast.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
