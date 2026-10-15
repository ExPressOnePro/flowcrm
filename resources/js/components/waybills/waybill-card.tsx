import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import waybillRoutes from '@/routes/waybills';
import type { WaybillListItem } from '@/types/waybills';
import { WaybillStatusBadge } from './waybill-status-badge';

/** Departure/return line: actual times once known, planned ones before. */
export function useWaybillTimes() {
    const { t } = useT();
    const format = useFormat();

    return (waybill: WaybillListItem) => {
        if (waybill.status === 'closed') {
            return `${format.dateTime(waybill.departure_at)} – ${format.dateTime(waybill.return_at)}`;
        }

        if (waybill.status === 'issued') {
            return waybill.planned_return_at
                ? t('Left :at, back by :until', {
                      at: format.dateTime(waybill.departure_at),
                      until: format.dateTime(waybill.planned_return_at),
                  })
                : t('Left :at', { at: format.dateTime(waybill.departure_at) });
        }

        return t('Planned :at', {
            at: format.dateTime(waybill.planned_departure_at),
        });
    };
}

export function WaybillCard({
    waybill,
    hide,
}: {
    waybill: WaybillListItem;
    hide?: 'vehicle' | 'driver';
}) {
    const { t } = useT();
    const format = useFormat();
    const times = useWaybillTimes();

    return (
        <Link
            href={waybillRoutes.show.url(waybill.id)}
            className="flex h-full items-start gap-3 rounded-xl border bg-card p-4 hover:bg-muted/40"
        >
            <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                    {waybill.number ? (
                        <span className="min-w-0 truncate font-mono text-base font-semibold">
                            {waybill.number}
                        </span>
                    ) : (
                        <span className="min-w-0 truncate text-base font-semibold text-muted-foreground">
                            {t('No number')}
                        </span>
                    )}
                    <WaybillStatusBadge
                        status={waybill.status}
                        overdue={waybill.overdue}
                    />
                </div>
                <p className="line-clamp-2 text-sm break-words">
                    {waybill.route}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {hide !== 'vehicle' && (
                        <span className="font-mono">
                            {waybill.vehicle.plate_number}
                            {waybill.trailer &&
                                ` + ${waybill.trailer.plate_number}`}
                        </span>
                    )}
                    {hide !== 'driver' && <span>{waybill.driver.name}</span>}
                    <span className="tabular-nums">{times(waybill)}</span>
                    {waybill.distance_km !== null && (
                        <span className="tabular-nums">
                            {format.km(waybill.distance_km)}
                        </span>
                    )}
                </div>
            </div>
            <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
        </Link>
    );
}
