import { router } from '@inertiajs/react';

let visits = 0;
let started = false;

/** Counts Inertia navigations in this tab so "Back" never leaves the app. */
export function trackInAppHistory() {
    if (started || typeof window === 'undefined') {
        return;
    }

    started = true;
    router.on('navigate', () => {
        visits++;
    });
}

/** True when the browser history has an earlier page of this app to return to. */
export function canGoBackInApp() {
    return visits > 1;
}
