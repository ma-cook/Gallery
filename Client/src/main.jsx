import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { LoadingProvider } from './components/LoadingManager.jsx';

// Handle stale deployment: if a dynamic chunk fails to load (MIME type error after redeployment),
// reload once to fetch the new index.html and updated chunk hashes.
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Chunk load failed (stale deployment), reloading...', event.payload);
  window.location.reload();
});

// Fallback for browsers that don't emit vite:preloadError
const originalImport = window.__vite_chunk_error_handled__;
if (!originalImport) {
  window.__vite_chunk_error_handled__ = true;
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event?.reason?.message || '';
    if (msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed')) {
      console.warn('Dynamic import failed (stale deployment), reloading...');
      event.preventDefault();
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LoadingProvider>
      <App />
    </LoadingProvider>
  </React.StrictMode>
);
