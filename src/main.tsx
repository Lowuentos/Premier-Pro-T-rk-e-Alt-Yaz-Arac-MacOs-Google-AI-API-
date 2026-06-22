import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle and suppress benign Vite/iframe WebSocket connection errors in sandbox environments
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event?.reason?.message || '';
    if (msg.includes('WebSocket') || msg.includes('websocket') || msg.includes('vite')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (msg.includes('WebSocket') || msg.includes('websocket') || msg.includes('vite')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
