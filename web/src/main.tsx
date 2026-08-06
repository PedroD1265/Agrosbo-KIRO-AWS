import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { startSyncEngine } from '@/lib/sync/engine';
import { mountDemoBannerIfEnabled } from '@/lib/mocks/banner';
import { isDemoMode } from '@/lib/mocks/adapter';

mountDemoBannerIfEnabled();

createRoot(document.getElementById('root')!).render(<App />);

// In demo mode we do not run the sync engine (no backend to talk to; no
// persistence of credentials). Production behaviour is unchanged.
if (!isDemoMode()) {
  startSyncEngine();
}

// Register the PWA service worker only outside demo/dev. In dev we
// proactively unregister any previously registered SW so a stale cached
// build never masks the live preview.
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV || isDemoMode()) {
    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {
        /* noop */
      });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => console.warn('[sw] registration failed', err));
    });
  }
}
