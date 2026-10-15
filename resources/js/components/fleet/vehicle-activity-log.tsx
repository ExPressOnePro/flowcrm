import { AlertCircle, ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { fetchJson, usePagedFetch } from '@/hooks/use-paged-fetch';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import vehicles from '@/routes/vehicles';

type ActivityEntry = {
    id: number;
    event: string | null;
    subject: string;
    changes: {
        attributes?: Record<string, unknown>;
        old?: Record<string, unknown>;
    } | null;
    causer: string | null;
    created_at: string | null;
};

type ActivityResponse = {
    items: ActivityEntry[];
    has_more: boolean;
    next_before_id: number | null;
};

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'boolean') {
        return value ? '✓' : '✗';
    }

    return String(value);
}

/** Read-only audit trail; loaded only when the tab is opened. */
export function VehicleActivityLog({
    vehicleId,
    refreshKey,
}: {
    vehicleId: number;
    refreshKey: number;
}) {
    const { t } = useT();
    const format = useFormat();

    const log = usePagedFetch<ActivityEntry>(async (cursor, signal) => {
        const response = await fetchJson<ActivityResponse>(
            vehicles.activity.url(vehicleId, {
                query: { before_id: cursor ?? undefined },
            }),
            signal,
        );

        return {
            items: response.items,
            next: response.has_more ? String(response.next_before_id) : null,
        };
    }, `${vehicleId}:${refreshKey}`);

    if (log.status === 'loading') {
        return (
            <div className="flex flex-col gap-4" aria-hidden>
                {[0, 1, 2].map((index) => (
                    <div key={index} className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-3/4" />
                    </div>
                ))}
            </div>
        );
    }

    if (log.status === 'error') {
        return (
            <EmptyState
                icon={AlertCircle}
                title={t('Could not load the change log')}
                description={t('Check the connection and try again.')}
                action={
                    <Button variant="outline" onClick={log.retry}>
                        {t('Retry')}
                    </Button>
                }
            />
        );
    }

    if (log.items.length === 0) {
        return (
            <EmptyState
                icon={ScrollText}
                title={t('No changes recorded yet.')}
            />
        );
    }

    return (
        <section className="flex flex-col gap-4">
            <ul className="divide-y rounded-xl border">
                {log.items.map((entry) => {
                    const attributes = entry.changes?.attributes ?? {};
                    const old = entry.changes?.old ?? {};

                    return (
                        <li key={entry.id} className="space-y-2 p-3 md:p-4">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <Badge variant="outline">
                                    {t(entry.subject)}
                                </Badge>
                                <span className="font-medium">
                                    {t(entry.event ?? '')}
                                </span>
                                <span className="text-muted-foreground">
                                    {entry.causer ?? t('System')} ·{' '}
                                    {format.dateTime(entry.created_at)}
                                </span>
                            </div>
                            {Object.keys(attributes).length > 0 && (
                                <dl className="grid gap-1 text-xs sm:grid-cols-2">
                                    {Object.entries(attributes).map(
                                        ([key, value]) => (
                                            <div
                                                key={key}
                                                className="flex min-w-0 flex-wrap gap-1"
                                            >
                                                <dt className="text-muted-foreground">
                                                    {key}:
                                                </dt>
                                                <dd className="min-w-0 break-words">
                                                    {key in old && (
                                                        <>
                                                            <span className="line-through opacity-60">
                                                                {formatValue(
                                                                    old[key],
                                                                )}
                                                            </span>{' '}
                                                            →{' '}
                                                        </>
                                                    )}
                                                    {formatValue(value)}
                                                </dd>
                                            </div>
                                        ),
                                    )}
                                </dl>
                            )}
                        </li>
                    );
                })}
            </ul>
            {log.hasMore && (
                <Button
                    variant="outline"
                    onClick={log.loadMore}
                    disabled={log.loadingMore}
                    className="w-full sm:w-auto sm:self-center"
                >
                    {log.loadingMore && <Spinner />}
                    {log.moreFailed ? t('Retry') : t('Show more')}
                </Button>
            )}
        </section>
    );
}
