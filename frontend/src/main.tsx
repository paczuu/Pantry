import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { PantryProvider } from './contexts/PantryContext';
import './index.css';

// Rejestracja Service Workera dla wsparcia PWA i pracy offline
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <PantryProvider>
          <App />
        </PantryProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);