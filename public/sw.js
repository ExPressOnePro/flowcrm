/*
 * FlowCRM service worker.
 *
 * Caches ONLY fingerprinted build assets (/build/assets/*): JS, CSS, fonts, images
 * produced by Vite. Their file names change on every build, so they are safe to
 * serve cache-first.
 *
 * Everything else — HTML pages, Inertia JSON responses, API calls, uploaded
 * files and downloads — is NOT intercepted and always goes to the network.
 * There is no offline mode and no push notifications.
 */

const CACHE = 'flowcrm-static-v1';
const MAX_ENTRIES = 150;

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE)
                        .map((key) => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

function isBuildAsset(request) {
    if (request.method !== 'GET') {
        return false;
    }

    const url = new URL(request.url);

    return (
        url.origin === self.location.origin &&
        url.pathname.startsWith('/build/assets/')
    );
}

async function trim(cache) {
    const keys = await cache.keys();

    if (keys.length > MAX_ENTRIES) {
        await Promise.all(
            keys
                .slice(0, keys.length - MAX_ENTRIES)
                .map((key) => cache.delete(key)),
        );
    }
}

self.addEventListener('fetch', (event) => {
    if (!isBuildAsset(event.request)) {
        return;
    }

    event.respondWith(
        caches.open(CACHE).then(async (cache) => {
            const cached = await cache.match(event.request);

            if (cached) {
                return cached;
            }

            const response = await fetch(event.request);

            if (response.ok && response.type === 'basic') {
                await cache.put(event.request, response.clone());
                trim(cache);
            }

            return response;
        }),
    );
});
