import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Archive,
    ArchiveRestore,
    ArrowRightLeft,
    ClipboardList,
    FileText,
    Gauge,
    Info,
    Link2,
    Pencil,
    Radio,
    Unlink,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { useConfirm } from '@/components/confirm-dialog';
import {
    CoupleSheet,
    OdometerSheet,
    StatusSheet,
    UncoupleSheet,
} from '@/components/fleet/vehicle-action-sheets';
import type { VehicleAction } from '@/components/fleet/vehicle-action-sheets';
import { VehicleActivityLog } from '@/components/fleet/vehicle-activity-log';
import { VehicleStatusBadge } from '@/components/fleet/vehicle-status-badge';
import { VehicleTimeline } from '@/components/fleet/vehicle-timeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import vehicles from '@/routes/vehicles';
import type {
    ActiveCoupling,
    CouplingCandidate,
    LastReading,
    VehicleCan,
    VehicleDetail,
} from '@/types/fleet';

type Props = {
    vehicle: VehicleDetail;
    activeCouplings: ActiveCoupling[];
    lastReading: LastReading | null;
    staleOdometerDays: number;
    couplingCandidates: CouplingCandidate[];
    statuses: string[];
    can: VehicleCan;
};

const TABS = [
    'overview',
    'documents',
    'waybills',
    'history',
    'maintenance',
    'log',
] as const;

type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
    overview: 'Overview',
    documents: 'Documents',
    waybills: 'Waybills',
    history: 'Operations history',
    maintenance: 'Maintenance',
    log: 'Change log',
};

function initialTab(): Tab {
    if (typeof window === 'undefined') {
        return 'overview';
    }

    const tab = new URLSearchParams(window.location.search).get('tab');

    return TABS.includes(tab as Tab) ? (tab as Tab) : 'overview';
}

export default function VehiclesShow(props: Props) {
    const { vehicle, can, activeCouplings } = props;
    const { t } = useT();
    const confirm = useConfirm();
    const [tab, setTab] = useState<Tab>(initialTab);
    const [action, setAction] = useState<VehicleAction | null>(null);
    const [uncoupling, setUncoupling] = useState<ActiveCoupling | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const tabListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const list = tabListRef.current;
        const active = list?.querySelector<HTMLElement>('[aria-selected=true]');

        if (!list || !active) {
            return;
        }

        const left = active.offsetLeft - list.offsetLeft;
        const right = left + active.offsetWidth;

        if (left < list.scrollLeft) {
            list.scrollLeft = left;
        } else if (right > list.scrollLeft + list.clientWidth) {
            list.scrollLeft = right - list.clientWidth;
        }
    }, [tab]);

    const tabs = TABS.filter((key) => key !== 'log' || can.view_audit);

    function selectTab(next: Tab) {
        setTab(next);

        const url = new URL(window.location.href);

        if (next === 'overview') {
            url.searchParams.delete('tab');
        } else {
            url.searchParams.set('tab', next);
        }

        window.history.replaceState(window.history.state, '', url);
    }

    function done() {
        setAction(null);
        setUncoupling(null);
        setRefreshKey((value) => value + 1);
    }

    async function archive() {
        const ok = await confirm({
            title: t('Archive :plate?', { plate: vehicle.plate_number }),
            description: t(
                'Archive this vehicle? It will be hidden from the registry, history is preserved.',
            ),
            confirmLabel: t('Archive vehicle'),
            destructive: true,
        });

        if (ok) {
            router.delete(vehicles.destroy.url(vehicle.id));
        }
    }

    const quickActions: {
        key: string;
        label: string;
        icon: LucideIcon;
        onClick?: () => void;
        href?: string;
    }[] = [
        ...(can.change_status
            ? [
                  {
                      key: 'status',
                      label: t('Status'),
                      icon: ArrowRightLeft,
                      onClick: () => setAction('status'),
                  },
              ]
            : []),
        ...(can.record_odometer
            ? [
                  {
                      key: 'odometer',
                      label: t('Mileage'),
                      icon: Gauge,
                      onClick: () => setAction('odometer'),
                  },
              ]
            : []),
        ...(can.couple && vehicle.type.can_tow
            ? [
                  {
                      key: 'couple',
                      label: t('Couple'),
                      icon: Link2,
                      onClick: () => setAction('couple'),
                  },
              ]
            : []),
        ...(can.update
            ? [
                  {
                      key: 'edit',
                      label: t('Edit'),
                      icon: Pencil,
                      href: vehicles.edit.url(vehicle.id),
                  },
              ]
            : []),
    ];

    return (
        <>
            <Head title={vehicle.plate_number} />

            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
                <header className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <h1 className="font-mono text-2xl font-semibold tracking-tight md:text-3xl">
                            {vehicle.plate_number}
                        </h1>
                        <VehicleStatusBadge status={vehicle.status} />
                        {vehicle.archived && (
                            <Badge variant="destructive">{t('Archived')}</Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {[
                            vehicle.type.name,
                            [vehicle.make, vehicle.model, vehicle.year]
                                .filter(Boolean)
                                .join(' '),
                            vehicle.branch?.name,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                    {activeCouplings.length > 0 && (
                        <p className="flex flex-wrap items-center gap-2 text-sm">
                            <Link2 className="size-4 text-muted-foreground" />
                            {activeCouplings.map((coupling) =>
                                coupling.partner ? (
                                    <Link
                                        key={coupling.id}
                                        href={vehicles.show(
                                            coupling.partner.id,
                                        )}
                                        className="-my-3 inline-flex min-h-11 items-center font-mono font-medium underline-offset-4 hover:underline md:my-0 md:min-h-0"
                                    >
                                        {coupling.partner.plate_number}
                                    </Link>
                                ) : null,
                            )}
                        </p>
                    )}
                </header>

                <Warnings {...props} onRecord={() => setAction('odometer')} />

                {quickActions.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        {quickActions.map((item) =>
                            item.href ? (
                                <Button
                                    key={item.key}
                                    variant="outline"
                                    asChild
                                >
                                    <Link href={item.href}>
                                        <item.icon />
                                        {item.label}
                                    </Link>
                                </Button>
                            ) : (
                                <Button
                                    key={item.key}
                                    variant="outline"
                                    onClick={item.onClick}
                                >
                                    <item.icon />
                                    {item.label}
                                </Button>
                            ),
                        )}
                    </div>
                )}

                <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 bg-background/95 px-4 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
                    <div
                        ref={tabListRef}
                        role="tablist"
                        aria-label={t('Vehicle sections')}
                        className="flex [scrollbar-width:none] gap-1 overflow-x-auto border-b"
                    >
                        {tabs.map((key) => (
                            <button
                                key={key}
                                id={`vehicle-tab-${key}`}
                                type="button"
                                role="tab"
                                aria-selected={tab === key}
                                aria-controls="vehicle-tabpanel"
                                onClick={() => selectTab(key)}
                                className={cn(
                                    '-mb-px min-h-11 min-w-11 shrink-0 border-b-2 px-3 text-sm whitespace-nowrap transition-colors',
                                    tab === key
                                        ? 'border-primary font-medium text-foreground'
                                        : 'border-transparent text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {t(TAB_LABELS[key])}
                            </button>
                        ))}
                    </div>
                </div>

                <div
                    id="vehicle-tabpanel"
                    role="tabpanel"
                    aria-labelledby={`vehicle-tab-${tab}`}
                >
                    {tab === 'overview' && (
                        <Overview
                            {...props}
                            onUncouple={setUncoupling}
                            onArchive={archive}
                        />
                    )}
                    {tab === 'documents' && (
                        <ComingSoon icon={FileText} stage={4} />
                    )}
                    {tab === 'waybills' && (
                        <ComingSoon icon={ClipboardList} stage={5} />
                    )}
                    {tab === 'history' && (
                        <VehicleTimeline
                            vehicleId={vehicle.id}
                            refreshKey={refreshKey}
                        />
                    )}
                    {tab === 'maintenance' && (
                        <ComingSoon icon={Wrench} stage={7} />
                    )}
                    {tab === 'log' && can.view_audit && (
                        <VehicleActivityLog
                            vehicleId={vehicle.id}
                            refreshKey={refreshKey}
                        />
                    )}
                </div>
            </div>

            {can.change_status && (
                <StatusSheet
                    open={action === 'status'}
                    onClose={() => setAction(null)}
                    onDone={done}
                    vehicle={vehicle}
                    statuses={props.statuses}
                />
            )}
            {can.record_odometer && (
                <OdometerSheet
                    open={action === 'odometer'}
                    onClose={() => setAction(null)}
                    onDone={done}
                    vehicle={vehicle}
                />
            )}
            {can.couple && vehicle.type.can_tow && (
                <CoupleSheet
                    open={action === 'couple'}
                    onClose={() => setAction(null)}
                    onDone={done}
                    vehicle={vehicle}
                    candidates={props.couplingCandidates}
                />
            )}
            {can.couple && (
                <UncoupleSheet
                    coupling={uncoupling}
                    onClose={() => setUncoupling(null)}
                    onDone={done}
                    vehicle={vehicle}
                />
            )}
        </>
    );
}

function Warnings({
    vehicle,
    can,
    staleOdometerDays,
    lastReading,
    onRecord,
}: Props & { onRecord: () => void }) {
    const { t } = useT();
    const format = useFormat();
    const items: {
        key: string;
        tone: 'danger' | 'warn' | 'info';
        text: string;
        action?: ReactNode;
    }[] = [];

    if (vehicle.archived) {
        items.push({
            key: 'archived',
            tone: 'danger',
            text: t(
                'Archived on :date. Changes are disabled; history is preserved.',
                {
                    date: format.dayOf(vehicle.deleted_at),
                },
            ),
        });
    }

    if (vehicle.status === 'under_repair') {
        items.push({
            key: 'repair',
            tone: 'warn',
            text: vehicle.status_since
                ? t('Under repair since :date', {
                      date: format.dayOf(vehicle.status_since),
                  })
                : t('Under repair'),
        });
    }

    if (vehicle.status === 'decommissioned') {
        items.push({
            key: 'decommissioned',
            tone: 'info',
            text: vehicle.status_since
                ? t('Decommissioned on :date', {
                      date: format.dayOf(vehicle.status_since),
                  })
                : t('Decommissioned'),
        });
    }

    if (vehicle.odometer_stale && !vehicle.archived) {
        items.push({
            key: 'odometer',
            tone: 'warn',
            text: lastReading
                ? t('Last odometer reading :date — more than :days days ago.', {
                      date: format.dayOf(lastReading.recorded_at),
                      days: staleOdometerDays,
                  })
                : t('No odometer readings yet.'),
            action: can.record_odometer ? (
                <Button size="sm" variant="outline" onClick={onRecord}>
                    <Gauge />
                    {t('Record reading')}
                </Button>
            ) : undefined,
        });
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <ul className="flex flex-col gap-2">
            {items.map((item) => (
                <li
                    key={item.key}
                    role="status"
                    className={cn(
                        'flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between',
                        item.tone === 'danger' &&
                            'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
                        item.tone === 'warn' &&
                            'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
                        item.tone === 'info' && 'bg-muted/50',
                    )}
                >
                    <span className="flex items-start gap-2">
                        {item.tone === 'info' ? (
                            <Info className="mt-0.5 size-4 shrink-0" />
                        ) : (
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        )}
                        {item.text}
                    </span>
                    {item.action}
                </li>
            ))}
        </ul>
    );
}

function Section({
    title,
    children,
    className,
}: {
    title?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('rounded-xl border p-4 md:p-5', className)}>
            {title && <h2 className="mb-3 text-base font-medium">{title}</h2>}
            {children}
        </section>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="min-w-0 space-y-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm break-words">{children}</dd>
        </div>
    );
}

function ComingSoon({ icon, stage }: { icon: LucideIcon; stage: number }) {
    const { t } = useT();

    return (
        <EmptyState
            icon={icon}
            title={t('Coming')}
            description={t('Available in stage :stage.', { stage })}
        />
    );
}

function Overview({
    vehicle,
    can,
    activeCouplings,
    lastReading,
    onUncouple,
    onArchive,
}: Props & {
    onUncouple: (coupling: ActiveCoupling) => void;
    onArchive: () => void;
}) {
    const { t, label } = useT();
    const format = useFormat();

    return (
        <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
            <Section className="lg:col-span-2">
                <dl className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                    <Field label={t('Plate number')}>
                        <span className="font-mono">
                            {vehicle.plate_number}
                        </span>
                    </Field>
                    <Field label={t('VIN')}>
                        <span className="font-mono break-all">
                            {vehicle.vin ?? '—'}
                        </span>
                    </Field>
                    <Field label={t('Type')}>
                        {vehicle.type.name}
                        {label('vehicle_category', vehicle.type.category) !==
                            vehicle.type.name && (
                            <span className="text-muted-foreground">
                                {' '}
                                (
                                {label(
                                    'vehicle_category',
                                    vehicle.type.category,
                                )}
                                )
                            </span>
                        )}
                    </Field>
                    <Field label={t('Make')}>{vehicle.make}</Field>
                    <Field label={t('Model')}>{vehicle.model ?? '—'}</Field>
                    <Field label={t('Year')}>{vehicle.year ?? '—'}</Field>
                    <Field label={t('Branch')}>
                        {vehicle.branch?.name ?? t('No branch')}
                    </Field>
                    <Field label={t('Ownership')}>
                        {label('ownership_type', vehicle.ownership_type)}
                    </Field>
                    <Field label={t('Commissioned on')}>
                        {format.date(vehicle.commissioned_on)}
                    </Field>
                    <Field label={t('Responsible person')}>
                        {vehicle.responsible?.name ?? t('Not assigned')}
                    </Field>
                    <Field label={t('Registered by')}>
                        {vehicle.created_by ?? '—'}
                        {vehicle.created_at && (
                            <div className="text-xs text-muted-foreground">
                                {format.dateTime(vehicle.created_at)}
                            </div>
                        )}
                    </Field>
                </dl>
                {vehicle.notes && (
                    <div className="mt-4 border-t pt-4">
                        <div className="text-xs text-muted-foreground">
                            {t('Notes')}
                        </div>
                        <p className="mt-1 text-sm break-words whitespace-pre-line">
                            {vehicle.notes}
                        </p>
                    </div>
                )}
            </Section>

            <div className="flex flex-col gap-4 md:gap-6">
                <Section title={t('Mileage')}>
                    {vehicle.has_odometer ? (
                        <div className="space-y-1">
                            <div className="text-2xl font-semibold tabular-nums">
                                {format.km(vehicle.current_odometer_km)}
                            </div>
                            {lastReading && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    {lastReading.is_device && (
                                        <Radio
                                            className="size-3.5 text-sky-600"
                                            aria-label={t('Device data')}
                                        />
                                    )}
                                    {format.dateTime(lastReading.recorded_at)} ·{' '}
                                    {label(
                                        'odometer_source',
                                        lastReading.source,
                                    )}
                                    {lastReading.recorded_by &&
                                        ` · ${lastReading.recorded_by}`}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {t(
                                'Trailers and semitrailers have no odometer; their mileage is derived from couplings.',
                            )}
                        </p>
                    )}
                </Section>

                <Section title={t('Current coupling')}>
                    {activeCouplings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {t('Not coupled')}
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {activeCouplings.map((coupling) => (
                                <li
                                    key={coupling.id}
                                    className="flex flex-col gap-2"
                                >
                                    <div>
                                        <div className="text-xs text-muted-foreground">
                                            {coupling.role === 'tractor'
                                                ? t('Trailer')
                                                : t('Tractor')}
                                        </div>
                                        {coupling.partner && (
                                            <Link
                                                href={vehicles.show(
                                                    coupling.partner.id,
                                                )}
                                                className="font-mono font-semibold underline-offset-4 hover:underline"
                                            >
                                                {coupling.partner.plate_number}
                                            </Link>
                                        )}{' '}
                                        <span className="text-sm text-muted-foreground">
                                            {coupling.partner?.name}
                                        </span>
                                        <div className="text-xs text-muted-foreground">
                                            {t('since')}{' '}
                                            {format.dateTime(
                                                coupling.coupled_at,
                                            )}
                                            {coupling.coupled_by &&
                                                ` · ${coupling.coupled_by}`}
                                        </div>
                                    </div>
                                    {can.couple && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="self-start"
                                            onClick={() => onUncouple(coupling)}
                                        >
                                            <Unlink />
                                            {t('Uncouple')}
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                {can.archive && (
                    <Section>
                        {vehicle.archived ? (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() =>
                                    router.post(
                                        vehicles.restore.url(vehicle.id),
                                    )
                                }
                            >
                                <ArchiveRestore />
                                {t('Restore from archive')}
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                className="w-full text-destructive hover:text-destructive"
                                onClick={onArchive}
                            >
                                <Archive />
                                {t('Archive vehicle')}
                            </Button>
                        )}
                    </Section>
                )}
            </div>
        </div>
    );
}

VehiclesShow.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Vehicles', href: vehicles.index() },
        {
            title: props.vehicle.plate_number,
            href: vehicles.show(props.vehicle.id),
        },
    ],
});
