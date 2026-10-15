/**
 * Registers the static-asset service worker (see public/sw.js).
 * Production builds on a secure origin only, so Vite dev and HMR are untouched.
 */
export function registerServiceWorker() {
    if (
        !import.meta.env.PROD ||
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !window.isSecureContext
    ) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // The app works without it; nothing to report to the user.
        });
    });
}
