import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    ClipboardList,
    FileText,
    Link2,
    Pencil,
    Radio,
    Unlink,
    Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { VehicleStatusBadge } from '@/components/fleet/vehicle-status-badge';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import vehicles from '@/routes/vehicles';
import couplingRoutes from '@/routes/vehicles/couplings';
import odometerRoutes from '@/routes/vehicles/odometer';
import type { VehicleSummary } from '@/types/fleet';

type Partner = {
    id: number;
    plate_number: string;
    name: string;
    archived: boolean;
} | null;

type Coupling = {
    id: number;
    role: 'tractor' | 'trailer';
    partner: Partner;
    position: number;
    coupled_at: string;
    uncoupled_at: string | null;
    coupled_by: string | null;
    uncoupled_by: string | null;
    notes: string | null;
};

type Reading = {
    id: number;
    value_km: number;
    recorded_at: string;
    source: string;
    is_device: boolean;
    note: string | null;
    recorded_by: string | null;
};

type StatusChange = {
    id: number;
    from_status: string | null;
    to_status: string;
    changed_at: string;
    reason: string | null;
    changed_by: string | null;
};

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

type Candidate = {
    id: number;
    plate_number: string;
    name: string;
    type: string;
};

type Props = {
    vehicle: VehicleSummary & {
        vehicle_type_id: number;
        branch_id: number | null;
        has_odometer: boolean;
        responsible: { id: number; name: string; email: string } | null;
        created_by: string | null;
        notes: string | null;
        created_at: string | null;
        deleted_at: string | null;
    };
    couplings: Coupling[];
    odometerReadings: Reading[];
    statusChanges: StatusChange[];
    activity: ActivityEntry[] | null;
    couplingCandidates: Candidate[];
    statuses: string[];
    can: {
        update: boolean;
        change_status: boolean;
        couple: boolean;
        record_odometer: boolean;
        archive: boolean;
    };
};

const TABS = [
    'overview',
    'couplings',
    'mileage',
    'statuses',
    'documents',
    'waybills',
    'maintenance',
    'log',
] as const;

type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
    overview: 'Overview',
    couplings: 'Couplings',
    mileage: 'Mileage',
    statuses: 'Statuses',
    documents: 'Documents',
    waybills: 'Waybills',
    maintenance: 'Maintenance',
    log: 'Change log',
};

const selectClass =
    'border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs';

function initialTab(): Tab {
    if (typeof window === 'undefined') {
        return 'overview';
    }

    const tab = new URLSearchParams(window.location.search).get('tab');

    return TABS.includes(tab as Tab) ? (tab as Tab) : 'overview';
}

export default function VehiclesShow(props: Props) {
    const { vehicle, can } = props;
    const { t } = useT();
    const [tab, setTab] = useState<Tab>(initialTab);

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

    function archive() {
        if (
            confirm(
                t(
                    'Archive this vehicle? It will be hidden from the registry, history is preserved.',
                ),
            )
        ) {
            router.delete(vehicles.destroy.url(vehicle.id));
        }
    }

    const activeCouplings = props.couplings.filter((c) => !c.uncoupled_at);

    return (
        <>
            <Head title={vehicle.plate_number} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="font-mono text-2xl font-semibold tracking-tight">
                                {vehicle.plate_number}
                            </h1>
                            <VehicleStatusBadge status={vehicle.status} />
                            {vehicle.archived && (
                                <Badge variant="destructive">
                                    {t('Archived')}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {vehicle.type.name} ·{' '}
                            {[vehicle.make, vehicle.model, vehicle.year]
                                .filter(Boolean)
                                .join(' ')}
                            {vehicle.branch && <> · {vehicle.branch.name}</>}
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
                                            className="font-mono hover:underline"
                                        >
                                            {coupling.partner.plate_number}
                                        </Link>
                                    ) : null,
                                )}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {can.update && (
                            <Button variant="outline" asChild>
                                <Link href={vehicles.edit(vehicle.id)}>
                                    <Pencil />
                                    {t('Edit')}
                                </Link>
                            </Button>
                        )}
                        {can.archive && !vehicle.archived && (
                            <Button variant="outline" onClick={archive}>
                                <Archive />
                                {t('Archive vehicle')}
                            </Button>
                        )}
                        {can.archive && vehicle.archived && (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    router.post(
                                        vehicles.restore.url(vehicle.id),
                                    )
                                }
                            >
                                <ArchiveRestore />
                                {t('Restore from archive')}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
                    <div
                        role="tablist"
                        className="flex min-w-max gap-1 border-b"
                    >
                        {TABS.map((key) => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={tab === key}
                                onClick={() => selectTab(key)}
                                className={cn(
                                    '-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors',
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

                {tab === 'overview' && <OverviewTab {...props} />}
                {tab === 'couplings' && <CouplingsTab {...props} />}
                {tab === 'mileage' && <MileageTab {...props} />}
                {tab === 'statuses' && <StatusesTab {...props} />}
                {tab === 'documents' && (
                    <ComingSoon icon={FileText} stage={4} />
                )}
                {tab === 'waybills' && (
                    <ComingSoon icon={ClipboardList} stage={5} />
                )}
                {tab === 'maintenance' && (
                    <ComingSoon icon={Wrench} stage={7} />
                )}
                {tab === 'log' && <LogTab activity={props.activity} />}
            </div>
        </>
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
            {title && <h2 className="mb-4 text-base font-medium">{title}</h2>}
            {children}
        </section>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm">{children}</dd>
        </div>
    );
}

function ComingSoon({ icon, stage }: { icon: typeof FileText; stage: number }) {
    const { t } = useT();

    return (
        <EmptyState
            icon={icon}
            title={t('Coming')}
            description={t('Available in stage :stage.', { stage })}
        />
    );
}

function OverviewTab({ vehicle, can, statuses }: Props) {
    const { t, label } = useT();
    const format = useFormat();

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <Section className="lg:col-span-2">
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label={t('Plate number')}>
                        <span className="font-mono">
                            {vehicle.plate_number}
                        </span>
                    </Field>
                    <Field label={t('VIN')}>
                        <span className="font-mono">{vehicle.vin ?? '—'}</span>
                    </Field>
                    <Field label={t('Type')}>
                        {vehicle.type.name}
                        <span className="text-muted-foreground">
                            {' '}
                            ({label('vehicle_category', vehicle.type.category)})
                        </span>
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
                    <Field label={t('Current odometer')}>
                        {vehicle.has_odometer
                            ? format.km(vehicle.current_odometer_km)
                            : t(
                                  'Mileage is not tracked for this vehicle type.',
                              )}
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
                        <p className="mt-1 text-sm whitespace-pre-line">
                            {vehicle.notes}
                        </p>
                    </div>
                )}
            </Section>

            {can.change_status && (
                <Section title={t('Change status')}>
                    <StatusForm vehicle={vehicle} statuses={statuses} />
                </Section>
            )}
        </div>
    );
}

function StatusForm({
    vehicle,
    statuses,
}: Pick<Props, 'vehicle' | 'statuses'>) {
    const { t, label } = useT();
    const form = useForm({
        status: statuses.find((s) => s !== vehicle.status) ?? '',
        reason: '',
        changed_at: '',
    });

    return (
        <form
            className="space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                form.post(vehicles.status.url(vehicle.id), {
                    preserveScroll: true,
                    onSuccess: () => form.reset('reason', 'changed_at'),
                });
            }}
        >
            <div className="grid gap-2">
                <Label htmlFor="new-status">{t('New status')}</Label>
                <select
                    id="new-status"
                    className={selectClass}
                    value={form.data.status}
                    onChange={(event) =>
                        form.setData('status', event.target.value)
                    }
                >
                    {statuses
                        .filter((status) => status !== vehicle.status)
                        .map((status) => (
                            <option key={status} value={status}>
                                {label('vehicle_status', status)}
                            </option>
                        ))}
                </select>
                <InputError message={form.errors.status} />
                {form.data.status === 'decommissioned' && (
                    <p className="text-xs text-amber-600">
                        {t('Decommissioning closes all active couplings.')}
                    </p>
                )}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="status-reason">{t('Reason')}</Label>
                <Textarea
                    id="status-reason"
                    rows={2}
                    value={form.data.reason}
                    onChange={(event) =>
                        form.setData('reason', event.target.value)
                    }
                />
                <InputError message={form.errors.reason} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="status-changed-at">{t('Effective at')}</Label>
                <Input
                    id="status-changed-at"
                    type="datetime-local"
                    value={form.data.changed_at}
                    onChange={(event) =>
                        form.setData('changed_at', event.target.value)
                    }
                />
                <p className="text-xs text-muted-foreground">
                    {t('Leave empty to use the current time.')}
                </p>
                <InputError message={form.errors.changed_at} />
            </div>
            <Button type="submit" disabled={form.processing}>
                {form.processing && <Spinner />}
                {t('Change status')}
            </Button>
        </form>
    );
}

function CouplingsTab({ vehicle, couplings, couplingCandidates, can }: Props) {
    const { t } = useT();
    const format = useFormat();
    const form = useForm({
        trailer_id: '',
        position: '1',
        coupled_at: '',
        notes: '',
    });
    const [uncoupling, setUncoupling] = useState<number | null>(null);
    const uncoupleForm = useForm({ uncoupled_at: '' });

    const canAttach = can.couple && vehicle.type.can_tow;

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <Section
                title={t('Coupling history')}
                className={canAttach ? 'lg:col-span-2' : 'lg:col-span-3'}
            >
                {couplings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {t('No couplings yet.')}
                    </p>
                ) : (
                    <ul className="divide-y">
                        {couplings.map((coupling) => (
                            <li key={coupling.id} className="py-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs text-muted-foreground">
                                                {coupling.role === 'tractor'
                                                    ? t('Trailer')
                                                    : t('Tractor')}
                                            </span>
                                            {coupling.partner ? (
                                                <Link
                                                    href={vehicles.show(
                                                        coupling.partner.id,
                                                    )}
                                                    className="font-mono font-medium hover:underline"
                                                >
                                                    {
                                                        coupling.partner
                                                            .plate_number
                                                    }
                                                </Link>
                                            ) : (
                                                '—'
                                            )}
                                            <span className="text-sm text-muted-foreground">
                                                {coupling.partner?.name}
                                            </span>
                                            {!coupling.uncoupled_at && (
                                                <Badge variant="secondary">
                                                    {t('in progress')}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {format.dateTime(
                                                coupling.coupled_at,
                                            )}{' '}
                                            →{' '}
                                            {coupling.uncoupled_at
                                                ? format.dateTime(
                                                      coupling.uncoupled_at,
                                                  )
                                                : '…'}
                                            {coupling.coupled_by &&
                                                ` · ${coupling.coupled_by}`}
                                            {coupling.uncoupled_by &&
                                                ` / ${coupling.uncoupled_by}`}
                                        </div>
                                        {coupling.notes && (
                                            <div className="text-xs">
                                                {coupling.notes}
                                            </div>
                                        )}
                                    </div>

                                    {can.couple &&
                                        !coupling.uncoupled_at &&
                                        uncoupling !== coupling.id && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    uncoupleForm.reset();
                                                    setUncoupling(coupling.id);
                                                }}
                                            >
                                                <Unlink />
                                                {t('Uncouple')}
                                            </Button>
                                        )}
                                </div>

                                {uncoupling === coupling.id && (
                                    <form
                                        className="mt-3 flex flex-col gap-2 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-end"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            uncoupleForm.post(
                                                couplingRoutes.uncouple.url({
                                                    vehicle: vehicle.id,
                                                    coupling: coupling.id,
                                                }),
                                                {
                                                    preserveScroll: true,
                                                    onSuccess: () =>
                                                        setUncoupling(null),
                                                },
                                            );
                                        }}
                                    >
                                        <div className="grid flex-1 gap-1">
                                            <Label
                                                htmlFor={`uncouple-${coupling.id}`}
                                            >
                                                {t('Uncoupled at')}
                                            </Label>
                                            <Input
                                                id={`uncouple-${coupling.id}`}
                                                type="datetime-local"
                                                value={
                                                    uncoupleForm.data
                                                        .uncoupled_at
                                                }
                                                onChange={(event) =>
                                                    uncoupleForm.setData(
                                                        'uncoupled_at',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={
                                                    uncoupleForm.errors
                                                        .uncoupled_at
                                                }
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={
                                                    uncoupleForm.processing
                                                }
                                            >
                                                {t('Uncouple trailer')}
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    setUncoupling(null)
                                                }
                                            >
                                                {t('Cancel')}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            {canAttach && (
                <Section title={t('Couple trailer')}>
                    {couplingCandidates.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {t('No free trailers available.')}
                        </p>
                    ) : (
                        <form
                            className="space-y-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                form.post(
                                    couplingRoutes.store.url(vehicle.id),
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => form.reset(),
                                    },
                                );
                            }}
                        >
                            <div className="grid gap-2">
                                <Label htmlFor="trailer_id">
                                    {t('Trailer')}
                                </Label>
                                <select
                                    id="trailer_id"
                                    className={selectClass}
                                    value={form.data.trailer_id}
                                    onChange={(event) =>
                                        form.setData(
                                            'trailer_id',
                                            event.target.value,
                                        )
                                    }
                                    required
                                >
                                    <option value="">
                                        {t('Select trailer')}
                                    </option>
                                    {couplingCandidates.map((candidate) => (
                                        <option
                                            key={candidate.id}
                                            value={String(candidate.id)}
                                        >
                                            {candidate.plate_number} —{' '}
                                            {candidate.type}
                                            {candidate.name &&
                                                `, ${candidate.name}`}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.trailer_id} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="position">
                                        {t('Position')}
                                    </Label>
                                    <select
                                        id="position"
                                        className={selectClass}
                                        value={form.data.position}
                                        onChange={(event) =>
                                            form.setData(
                                                'position',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        {[1, 2, 3].map((position) => (
                                            <option
                                                key={position}
                                                value={String(position)}
                                            >
                                                {position}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2 grid gap-2">
                                    <Label htmlFor="coupled_at">
                                        {t('Coupled at')}
                                    </Label>
                                    <Input
                                        id="coupled_at"
                                        type="datetime-local"
                                        value={form.data.coupled_at}
                                        onChange={(event) =>
                                            form.setData(
                                                'coupled_at',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                            <InputError message={form.errors.position} />
                            <InputError message={form.errors.coupled_at} />
                            <p className="text-xs text-muted-foreground">
                                {t('Leave empty to use the current time.')}
                            </p>
                            <div className="grid gap-2">
                                <Label htmlFor="coupling-notes">
                                    {t('Note')}
                                </Label>
                                <Input
                                    id="coupling-notes"
                                    value={form.data.notes}
                                    onChange={(event) =>
                                        form.setData(
                                            'notes',
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing && <Spinner />}
                                <Link2 />
                                {t('Couple trailer')}
                            </Button>
                        </form>
                    )}
                </Section>
            )}
        </div>
    );
}

function MileageTab({ vehicle, odometerReadings, can }: Props) {
    const { t, label } = useT();
    const format = useFormat();
    const form = useForm({ value_km: '', recorded_at: '', note: '' });

    if (!vehicle.has_odometer) {
        return (
            <Section>
                <p className="text-sm text-muted-foreground">
                    {t(
                        'Trailers and semitrailers have no odometer; their mileage is derived from couplings.',
                    )}
                </p>
            </Section>
        );
    }

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <Section
                title={`${t('Current odometer')}: ${format.km(vehicle.current_odometer_km)}`}
                className={
                    can.record_odometer ? 'lg:col-span-2' : 'lg:col-span-3'
                }
            >
                {odometerReadings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {t('No readings yet.')}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-muted-foreground">
                                <tr>
                                    <th className="py-2 pr-4 font-medium">
                                        {t('Recorded at')}
                                    </th>
                                    <th className="py-2 pr-4 text-right font-medium">
                                        {t('Odometer, km')}
                                    </th>
                                    <th className="py-2 pr-4 font-medium">
                                        {t('Source')}
                                    </th>
                                    <th className="hidden py-2 font-medium sm:table-cell">
                                        {t('Recorded by')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {odometerReadings.map((reading) => (
                                    <tr key={reading.id} className="border-t">
                                        <td className="py-2 pr-4 whitespace-nowrap">
                                            {format.dateTime(
                                                reading.recorded_at,
                                            )}
                                        </td>
                                        <td className="py-2 pr-4 text-right tabular-nums">
                                            {format.number(reading.value_km)}
                                        </td>
                                        <td className="py-2 pr-4">
                                            <span className="inline-flex items-center gap-1">
                                                {reading.is_device && (
                                                    <Radio
                                                        className="size-3.5 text-sky-600"
                                                        aria-label={t(
                                                            'Device data',
                                                        )}
                                                    />
                                                )}
                                                {label(
                                                    'odometer_source',
                                                    reading.source,
                                                )}
                                            </span>
                                            {reading.note && (
                                                <div className="text-xs text-muted-foreground">
                                                    {reading.note}
                                                </div>
                                            )}
                                        </td>
                                        <td className="hidden py-2 text-muted-foreground sm:table-cell">
                                            {reading.recorded_by ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Section>

            {can.record_odometer && (
                <Section title={t('Record reading')}>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.post(odometerRoutes.store.url(vehicle.id), {
                                preserveScroll: true,
                                onSuccess: () => form.reset(),
                            });
                        }}
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="value_km">
                                {t('Odometer, km')}
                            </Label>
                            <Input
                                id="value_km"
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={form.data.value_km}
                                onChange={(event) =>
                                    form.setData('value_km', event.target.value)
                                }
                                required
                            />
                            <InputError message={form.errors.value_km} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="recorded_at">
                                {t('Recorded at')}
                            </Label>
                            <Input
                                id="recorded_at"
                                type="datetime-local"
                                value={form.data.recorded_at}
                                onChange={(event) =>
                                    form.setData(
                                        'recorded_at',
                                        event.target.value,
                                    )
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('Leave empty to use the current time.')}
                            </p>
                            <InputError message={form.errors.recorded_at} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="reading-note">{t('Note')}</Label>
                            <Input
                                id="reading-note"
                                value={form.data.note}
                                onChange={(event) =>
                                    form.setData('note', event.target.value)
                                }
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t(
                                'Readings cannot decrease over time. Values from telematics devices are marked separately.',
                            )}
                        </p>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            {t('Record reading')}
                        </Button>
                    </form>
                </Section>
            )}
        </div>
    );
}

function StatusesTab({ statusChanges }: Props) {
    const { t } = useT();
    const format = useFormat();

    return (
        <Section title={t('Status history')}>
            {statusChanges.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {t('No status changes yet.')}
                </p>
            ) : (
                <ol className="space-y-4">
                    {statusChanges.map((change) => (
                        <li
                            key={change.id}
                            className="flex flex-col gap-1 border-l-2 pl-4"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                {change.from_status && (
                                    <>
                                        <VehicleStatusBadge
                                            status={change.from_status}
                                        />
                                        <span className="text-muted-foreground">
                                            →
                                        </span>
                                    </>
                                )}
                                <VehicleStatusBadge status={change.to_status} />
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {format.dateTime(change.changed_at)}
                                {change.changed_by && ` · ${change.changed_by}`}
                            </div>
                            {change.reason && (
                                <div className="text-sm">{change.reason}</div>
                            )}
                        </li>
                    ))}
                </ol>
            )}
        </Section>
    );
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'boolean') {
        return value ? '✓' : '✗';
    }

    return String(value);
}

function LogTab({ activity }: { activity: ActivityEntry[] | null }) {
    const { t } = useT();
    const format = useFormat();

    if (activity === null) {
        return (
            <Section>
                <p className="text-sm text-muted-foreground">
                    {t('You do not have access to the change log.')}
                </p>
            </Section>
        );
    }

    return (
        <Section title={t('Change log')}>
            {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {t('No changes recorded yet.')}
                </p>
            ) : (
                <ul className="divide-y">
                    {activity.map((entry) => {
                        const attributes = entry.changes?.attributes ?? {};
                        const old = entry.changes?.old ?? {};

                        return (
                            <li key={entry.id} className="space-y-2 py-3">
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
                                                    className="flex flex-wrap gap-1"
                                                >
                                                    <dt className="text-muted-foreground">
                                                        {key}:
                                                    </dt>
                                                    <dd>
                                                        {key in old && (
                                                            <>
                                                                <span className="line-through opacity-60">
                                                                    {formatValue(
                                                                        old[
                                                                            key
                                                                        ],
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
            )}
        </Section>
    );
}

VehiclesShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Vehicles', href: vehicles.index() },
    ],
};
