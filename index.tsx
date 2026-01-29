
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Safe bridge for Vite environment variables to match global SDK expectations
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
  const env = (import.meta as any).env || {};
  // Prioritize VITE_ prefix but fallback to standard API_KEY
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
