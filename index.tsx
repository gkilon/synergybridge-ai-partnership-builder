
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Senior Engineer Fix: Robustly bridge Vite's import.meta.env to process.env
// This satisfies the Gemini SDK's requirement for process.env.API_KEY in a Vite environment.
(window as any).process = (window as any).process || { env: {} };
const env = (import.meta as any).env || {};
(window as any).process.env.API_KEY = env.VITE_GEMINI_API_KEY || env.API_KEY || (window as any).process.env.API_KEY;

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
