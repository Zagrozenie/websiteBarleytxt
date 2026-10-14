import React from 'react';
import { useToast } from '../context/ToastContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import '../styles/toast.css';

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        let Icon = Info;
        let iconColor = '#60a5fa';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          iconColor = '#34d399';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          iconColor = '#f87171';
        }

        return (
          <div key={toast.id} className={`toast-item ${toast.type}`}>
            <Icon size={20} color={iconColor} style={{ flexShrink: 0 }} />
            <span>{toast.message}</span>
            <button
              className="toast-close-btn"
              onClick={() => removeToast(toast.id)}
              aria-label="Zamknij"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
