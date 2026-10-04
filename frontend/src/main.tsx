import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { ToastProvider } from './contexts/ToastContext';
import { LanguageProvider } from './language/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { PantryProvider } from './contexts/PantryContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import './index.css';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <PantryProvider>
            <RealtimeProvider>
              <App />
            </RealtimeProvider>
          </PantryProvider>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  </React.StrictMode>
);