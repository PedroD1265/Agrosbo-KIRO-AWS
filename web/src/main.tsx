import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { startSyncEngine } from '@/lib/sync/engine';

createRoot(document.getElementById('root')!).render(<App />);

startSyncEngine();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('[sw] registration failed', err));
  });
}
