import { useCallback, useEffect, useRef, useState } from 'react';

export type FetchedPage<T> = { items: T[]; next: string | null };

type Loaded<T> = {
    key: string;
    items: T[];
    next: string | null;
    failed: boolean;
};

/**
 * Loads a cursor-paginated JSON list on demand (no caching):
 * first page on mount / when `key` changes, further pages via loadMore().
 */
export function usePagedFetch<T>(
    load: (
        cursor: string | null,
        signal: AbortSignal,
    ) => Promise<FetchedPage<T>>,
    key: string,
) {
    const [attempt, setAttempt] = useState(0);
    const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [moreFailed, setMoreFailed] = useState(false);
    const loadRef = useRef(load);
    const requestKey = `${key}#${attempt}`;

    useEffect(() => {
        loadRef.current = load;
    });

    useEffect(() => {
        const abort = new AbortController();

        loadRef
            .current(null, abort.signal)
            .then((page) =>
                setLoaded({
                    key: requestKey,
                    items: page.items,
                    next: page.next,
                    failed: false,
                }),
            )
            .catch((error: unknown) => {
                if (!abort.signal.aborted) {
                    console.error(error);
                    setLoaded({
                        key: requestKey,
                        items: [],
                        next: null,
                        failed: true,
                    });
                }
            });

        return () => abort.abort();
    }, [requestKey]);

    const current = loaded?.key === requestKey ? loaded : null;
    const status = !current ? 'loading' : current.failed ? 'error' : 'ready';
    const next = current?.next ?? null;

    const loadMore = useCallback(() => {
        if (!next || loadingMore) {
            return;
        }

        setLoadingMore(true);
        setMoreFailed(false);

        loadRef
            .current(next, new AbortController().signal)
            .then((page) =>
                setLoaded((previous) =>
                    previous && previous.key === requestKey
                        ? {
                              ...previous,
                              items: [...previous.items, ...page.items],
                              next: page.next,
                          }
                        : previous,
                ),
            )
            .catch(() => setMoreFailed(true))
            .finally(() => setLoadingMore(false));
    }, [next, loadingMore, requestKey]);

    const retry = useCallback(() => setAttempt((value) => value + 1), []);

    return {
        items: current?.items ?? [],
        status,
        hasMore: next !== null,
        loadingMore,
        moreFailed,
        loadMore,
        retry,
    };
}

export async function fetchJson<T>(
    url: string,
    signal: AbortSignal,
): Promise<T> {
    const response = await fetch(url, {
        signal,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
}
