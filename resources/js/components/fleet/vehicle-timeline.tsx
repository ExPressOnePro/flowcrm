import { Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRightLeft,
    Gauge,
    History,
    Link2,
    Radio,
    Unlink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { VehicleStatusBadge } from '@/components/fleet/vehicle-status-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { fetchJson, usePagedFetch } from '@/hooks/use-paged-fetch';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import vehicles from '@/routes/vehicles';
import waybillRoutes from '@/routes/waybills';
import type { VehiclePartner } from '@/types/fleet';

type BaseEvent = { key: string; at: string; actor: string | null };

type TimelineEvent =
    | (BaseEvent & {
          type: 'status';
          from_status: string | null;
          to_status: string;
          reason: string | null;
      })
    | (BaseEvent & {
          type: 'coupled' | 'uncoupled';
          role: 'tractor' | 'trailer';
          partner: VehiclePartner;
          position: number;
          notes: string | null;
      })
    | (BaseEvent & {
          type: 'odometer';
          value_km: number;
          source: string;
          is_device: boolean;
          note: string | null;
          waybill: { id: number; number: string | null } | null;
      });

type TimelineResponse = {
    items: TimelineEvent[];
    has_more: boolean;
    next_before: string | null;
};

const TYPES = ['all', 'status', 'coupling', 'odometer'] as const;
const PERIODS = ['7d', '30d', '90d', '365d', 'all'] as const;

const TYPE_LABELS: Record<(typeof TYPES)[number], string> = {
    all: 'All events',
    status: 'Statuses',
    coupling: 'Couplings',
    odometer: 'Mileage',
};

const PERIOD_LABELS: Record<(typeof PERIODS)[number], string> = {
    '7d': '7 days',
    '30d': '30 days',
    '90d': '3 months',
    '365d': '12 months',
    all: 'All time',
};

export function VehicleTimeline({
    vehicleId,
    refreshKey,
}: {
    vehicleId: number;
    refreshKey: number;
}) {
    const { t } = useT();
    const [type, setType] = useState<(typeof TYPES)[number]>('all');
    const [period, setPeriod] = useState<(typeof PERIODS)[number]>('all');

    const timeline = usePagedFetch<TimelineEvent>(async (cursor, signal) => {
        const response = await fetchJson<TimelineResponse>(
            vehicles.timeline.url(vehicleId, {
                query: {
                    type,
                    period,
                    before: cursor ?? undefined,
                },
            }),
            signal,
        );

        return {
            items: response.items,
            next: response.has_more ? response.next_before : null,
        };
    }, `${vehicleId}:${type}:${period}:${refreshKey}`);

    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                    role="group"
                    aria-label={t('Event type')}
                    className="flex flex-wrap gap-2"
                >
                    {TYPES.map((value) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={type === value}
                            onClick={() => setType(value)}
                            className={cn(
                                'min-h-9 shrink-0 rounded-full border px-3 text-sm whitespace-nowrap max-md:min-h-11',
                                type === value
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'hover:bg-muted',
                            )}
                        >
                            {t(TYPE_LABELS[value])}
                        </button>
                    ))}
                </div>
                <select
                    aria-label={t('Period')}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
                    value={period}
                    onChange={(event) =>
                        setPeriod(
                            event.target.value as (typeof PERIODS)[number],
                        )
                    }
                >
                    {PERIODS.map((value) => (
                        <option key={value} value={value}>
                            {t(PERIOD_LABELS[value])}
                        </option>
                    ))}
                </select>
            </div>

            {timeline.status === 'loading' && <TimelineSkeleton />}

            {timeline.status === 'error' && (
                <EmptyState
                    icon={AlertCircle}
                    title={t('Could not load the history')}
                    description={t('Check the connection and try again.')}
                    action={
                        <Button variant="outline" onClick={timeline.retry}>
                            {t('Retry')}
                        </Button>
                    }
                />
            )}

            {timeline.status === 'ready' && timeline.items.length === 0 && (
                <EmptyState
                    icon={History}
                    title={t('No events for the selected period')}
                    description={
                        period !== 'all' || type !== 'all'
                            ? t('Try a longer period or another event type.')
                            : undefined
                    }
                />
            )}

            {timeline.status === 'ready' && timeline.items.length > 0 && (
                <ol className="relative flex flex-col">
                    {timeline.items.map((event) => (
                        <TimelineRow key={event.key} event={event} />
                    ))}
                </ol>
            )}

            {timeline.status === 'ready' && timeline.hasMore && (
                <div className="flex flex-col items-center gap-2">
                    {timeline.moreFailed && (
                        <p className="text-sm text-destructive">
                            {t('Could not load more events.')}
                        </p>
                    )}
                    <Button
                        variant="outline"
                        onClick={timeline.loadMore}
                        disabled={timeline.loadingMore}
                        className="w-full sm:w-auto"
                    >
                        {timeline.loadingMore && <Spinner />}
                        {timeline.moreFailed ? t('Retry') : t('Show more')}
                    </Button>
                </div>
            )}
        </section>
    );
}

function TimelineRow({ event }: { event: TimelineEvent }) {
    const { t, label } = useT();
    const format = useFormat();

    let icon: LucideIcon = ArrowRightLeft;
    let title: React.ReactNode = null;
    let body: React.ReactNode = null;

    switch (event.type) {
        case 'status':
            icon = ArrowRightLeft;
            title = (
                <span className="flex flex-wrap items-center gap-1.5">
                    {event.from_status && (
                        <>
                            <VehicleStatusBadge status={event.from_status} />
                            <span className="text-muted-foreground">→</span>
                        </>
                    )}
                    <VehicleStatusBadge status={event.to_status} />
                </span>
            );
            body = event.reason;
            break;
        case 'coupled':
        case 'uncoupled':
            icon = event.type === 'coupled' ? Link2 : Unlink;
            title = (
                <span className="flex flex-wrap items-center gap-1.5">
                    <span>
                        {event.type === 'coupled'
                            ? t('Coupled with')
                            : t('Uncoupled from')}
                    </span>
                    {event.partner ? (
                        <Link
                            href={vehicles.show(event.partner.id)}
                            className="-my-3 inline-flex min-h-11 items-center font-mono font-semibold underline-offset-4 hover:underline md:my-0 md:min-h-0"
                        >
                            {event.partner.plate_number}
                        </Link>
                    ) : (
                        '—'
                    )}
                    {event.partner?.name && (
                        <span className="text-muted-foreground">
                            {event.partner.name}
                        </span>
                    )}
                </span>
            );
            body = event.notes;
            break;
        case 'odometer':
            icon = event.is_device ? Radio : Gauge;
            title = (
                <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium tabular-nums">
                        {format.km(event.value_km)}
                    </span>
                    <span className="text-muted-foreground">
                        · {label('odometer_source', event.source)}
                    </span>
                    {event.waybill && (
                        <Link
                            href={waybillRoutes.show.url(event.waybill.id)}
                            className="-my-3 inline-flex min-h-11 items-center font-mono underline-offset-4 hover:underline md:my-0 md:min-h-0"
                        >
                            {event.waybill.number ?? t('Waybill')}
                        </Link>
                    )}
                </span>
            );
            body = event.note;
            break;
    }

    const Icon = icon;

    return (
        <li className="group relative flex gap-3 pb-5 last:pb-0">
            <span
                aria-hidden
                className="absolute top-9 bottom-0 left-[17px] w-px bg-border group-last:hidden"
            />
            <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border bg-background">
                <Icon className="size-4 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1 pt-1.5">
                <div className="text-sm">{title}</div>
                {body && (
                    <p className="mt-1 text-sm break-words whitespace-pre-line">
                        {body}
                    </p>
                )}
                <div className="mt-1 text-xs text-muted-foreground">
                    {format.dateTime(event.at)}
                    {event.actor && ` · ${event.actor}`}
                </div>
            </div>
        </li>
    );
}

function TimelineSkeleton() {
    return (
        <div className="flex flex-col gap-5" aria-hidden>
            {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex gap-3">
                    <Skeleton className="size-9 shrink-0 rounded-full" />
                    <div className="flex flex-1 flex-col gap-2 pt-1">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                </div>
            ))}
        </div>
    );
}
