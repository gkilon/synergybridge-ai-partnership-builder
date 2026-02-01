
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Senior Engineer Fix: Comprehensive bridge for Vite environment variables.
// This ensures that all VITE_ variables (including Firebase and Gemini) 
// are accessible via process.env for both the SDKs and our services.
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
  const env = (import.meta as any).env || {};
  
  // Map all VITE_ variables to process.env
  Object.keys(env).forEach(key => {
    if (key.startsWith('VITE_')) {
      const standardKey = key.replace('VITE_', '');
      (window as any).process.env[standardKey] = env[key];
      (window as any).process.env[key] = env[key];
    }
  });

  // Specifically ensure API_KEY is set for Gemini SDK requirements
  (window as any).process.env.API_KEY = env.VITE_GEMINI_API_KEY || env.API_KEY || (window as any).process.env.API_KEY;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
