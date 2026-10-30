import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Silence benign HMR errors that trigger overlays in some environments
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (
      event.reason.message?.includes('failed to connect to websocket') ||
      event.reason.message?.includes('WebSocket closed without opened')
    )) {
      event.preventDefault();
    }
  });
}
