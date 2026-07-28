import { isDemoMode } from './adapter';

/**
 * Non-dismissible banner shown when VITE_USE_MOCKS=1.
 * Mounted from `main.tsx` (append to <body>) so it survives route changes.
 */
export function mountDemoBannerIfEnabled(): void {
  if (typeof document === 'undefined') return;
  if (!isDemoMode()) return;
  if (document.getElementById('agrosbo-demo-banner')) return;

  const el = document.createElement('div');
  el.id = 'agrosbo-demo-banner';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent =
    'MODO DEMO — datos sintéticos locales. Sin backend, sin AWS, sin persistencia.';
  Object.assign(el.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    zIndex: '2147483647',
    padding: '6px 12px',
    background: '#7c2d12',
    color: '#fff',
    font: '600 12px/1.4 system-ui, sans-serif',
    letterSpacing: '0.02em',
    textAlign: 'center',
    pointerEvents: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(el);
  // Offset app so the banner never covers the top bar.
  document.documentElement.style.setProperty('scroll-padding-top', '28px');
  document.body.style.paddingTop = '24px';
}
