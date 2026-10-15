import { useCallback, useEffect, useState } from 'react';
import { fetchJson } from '@/hooks/use-paged-fetch';

type Loaded<T> = { key: string; data: T | null; failed: boolean };

/**
 * Loads a JSON resource when `url` or `refreshKey` changes; nothing is cached.
 * Keeps showing the previous data while a refresh is in flight.
 */
export function useJson<T>(
    url: string | null,
    refreshKey: number | string = 0,
) {
    const [attempt, setAttempt] = useState(0);
    const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
    const requestKey = `${url}#${refreshKey}#${attempt}`;

    useEffect(() => {
        if (url === null) {
            return;
        }

        const abort = new AbortController();

        fetchJson<T>(url, abort.signal)
            .then((data) => setLoaded({ key: requestKey, data, failed: false }))
            .catch((error: unknown) => {
                if (!abort.signal.aborted) {
                    console.error(error);
                    setLoaded((previous) => ({
                        key: requestKey,
                        data: previous?.data ?? null,
                        failed: true,
                    }));
                }
            });

        return () => abort.abort();
    }, [url, requestKey]);

    const fresh = loaded?.key === requestKey;
    const status: 'loading' | 'error' | 'ready' =
        loaded?.failed && fresh ? 'error' : loaded?.data ? 'ready' : 'loading';

    return {
        data: loaded?.data ?? null,
        status,
        refreshing: !fresh && loaded?.data != null,
        retry: useCallback(() => setAttempt((value) => value + 1), []),
    };
}
