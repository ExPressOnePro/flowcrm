import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Ban,
    CircleCheck,
    Pencil,
    Send,
    XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ResponsiveSheet } from '@/components/responsive-sheet';
import { Field, SubmitBar } from '@/components/sheet-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { WaybillStatusBadge } from '@/components/waybills/waybill-status-badge';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import drivers from '@/routes/drivers';
import vehicles from '@/routes/vehicles';
import waybillRoutes from '@/routes/waybills';
import type { WaybillListItem, WaybillWarning } from '@/types/waybills';

type WaybillDetail = Omit<WaybillListItem, 'vehicle'> & {
    vehicle: {
        id: number;
        plate_number: string;
        name: string;
        has_odometer: boolean;
        current_odometer_km: number | null;
    };
    basis: string | null;
    notes: string | null;
    departure_odometer_km: number | null;
    departure_fuel_l: number | null;
    return_fuel_l: number | null;
    fuel_added_l: number | null;
    return_odometer_km: number | null;
    cancel_reason: string | null;
    created_by: string | null;
    created_at: string | null;
    issued_by: string | null;
    issued_at: string | null;
    closed_by: string | null;
    closed_at: string | null;
    cancelled_by: string | null;
    cancelled_at: string | null;
};

type Props = {
    waybill: WaybillDetail;
    warnings: WaybillWarning[];
    blocking: string[];
    nowLocal: string;
    can: {
        update: boolean;
        issue: boolean;
        close: boolean;
        cancel: boolean;
        view_vehicle: boolean;
        view_driver: boolean;
    };
};

type Action = 'issue' | 'close' | 'cancel';

/** Readings this far from the previous one are worth a second look, not a block. */
const LARGE_GAP_KM = 3000;

export default function WaybillsShow(props: Props) {
    const { waybill, warnings, blocking } = props;
    const { t } = useT();
    const [action, setAction] = useState<Action | null>(null);
    const title = waybill.number
        ? t('Waybill :number', { number: waybill.number })
        : t('Waybill draft');

    return (
        <>
            <Head title={title} />

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:gap-6 md:p-6">
                <header className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                            {waybill.number ? (
                                <>
                                    {t('Waybill')}{' '}
                                    <span className="font-mono">
                                        {waybill.number}
                                    </span>
                                </>
                            ) : (
                                t('Waybill draft')
                            )}
                        </h1>
                        <WaybillStatusBadge
                            status={waybill.status}
                            overdue={waybill.overdue}
                        />
                    </div>
                    <p className="text-sm break-words text-muted-foreground">
                        {waybill.route}
                    </p>
                </header>

                {blocking.length > 0 && (
                    <section
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                    >
                        <p className="flex items-center gap-2 font-medium">
                            <XCircle className="size-4 shrink-0" />
                            {t('Cannot be issued yet')}
                        </p>
                        <ul className="mt-1.5 list-disc space-y-0.5 pl-6">
                            {blocking.map((message) => (
                                <li key={message}>{message}</li>
                            ))}
                        </ul>
                    </section>
                )}

                {warnings.length > 0 && (
                    <ul className="flex flex-col gap-2">
                        {warnings.map((warning) => (
                            <li
                                key={warning.message}
                                role="status"
                                className={cn(
                                    'flex items-start gap-2 rounded-lg border p-3 text-sm',
                                    warning.level === 'danger'
                                        ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
                                        : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
                                )}
                            >
                                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                {warning.message}
                            </li>
                        ))}
                    </ul>
                )}

                <Actions {...props} onAction={setAction} />

                <div className="grid gap-4 md:grid-cols-2">
                    <Crew {...props} />
                    <Schedule waybill={waybill} />
                    <Audit waybill={waybill} />
                    {(waybill.notes || waybill.cancel_reason) && (
                        <Section title={t('Notes')}>
                            {waybill.cancel_reason && (
                                <p className="text-sm">
                                    <span className="text-muted-foreground">
                                        {t('Cancellation reason')}:
                                    </span>{' '}
                                    {waybill.cancel_reason}
                                </p>
                            )}
                            {waybill.notes && (
                                <p className="text-sm whitespace-pre-line">
                                    {waybill.notes}
                                </p>
                            )}
                        </Section>
                    )}
                </div>
            </div>

            {action === 'issue' && (
                <IssueSheet {...props} onClose={() => setAction(null)} />
            )}
            {action === 'close' && (
                <CloseSheet {...props} onClose={() => setAction(null)} />
            )}
            {action === 'cancel' && (
                <CancelSheet {...props} onClose={() => setAction(null)} />
            )}
        </>
    );
}

function Actions({
    waybill,
    blocking,
    can,
    onAction,
}: Props & { onAction: (action: Action) => void }) {
    const { t } = useT();
    const buttons: ReactNode[] = [];

    if (can.issue) {
        buttons.push(
            <Button
                key="issue"
                disabled={blocking.length > 0}
                onClick={() => onAction('issue')}
            >
                <Send />
                {t('Issue')}
            </Button>,
        );
    }

    if (can.close) {
        buttons.push(
            <Button key="close" onClick={() => onAction('close')}>
                <CircleCheck />
                {t('Close trip')}
            </Button>,
        );
    }

    if (can.update) {
        buttons.push(
            <Button key="edit" variant="outline" asChild>
                <Link href={waybillRoutes.edit.url(waybill.id)}>
                    <Pencil />
                    {t('Edit')}
                </Link>
            </Button>,
        );
    }

    if (can.cancel) {
        buttons.push(
            <Button
                key="cancel"
                variant="outline"
                onClick={() => onAction('cancel')}
            >
                <Ban />
                {t('Void')}
            </Button>,
        );
    }

    if (buttons.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap [&>*:first-child:nth-last-child(odd)]:col-span-2 sm:[&>*:first-child:nth-last-child(odd)]:col-span-1">
            {buttons}
        </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-xl border p-4 md:p-5">
            <h2 className="mb-3 text-base font-medium">{title}</h2>
            <div className="grid gap-2">{children}</div>
        </section>
    );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
    return (
        <div className="grid gap-0.5 text-sm sm:grid-cols-[10rem_1fr] sm:gap-3">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="min-w-0 break-words">{children}</dd>
        </div>
    );
}

function Crew({ waybill, can }: Props) {
    const { t } = useT();
    const link =
        'font-medium underline-offset-4 hover:underline -my-3 inline-flex min-h-11 items-center md:my-0 md:min-h-0';

    return (
        <Section title={t('Crew')}>
            <dl className="grid gap-2">
                <Row term={t('Vehicle')}>
                    {can.view_vehicle ? (
                        <Link
                            href={vehicles.show.url(waybill.vehicle.id)}
                            className={cn(link, 'font-mono')}
                        >
                            {waybill.vehicle.plate_number}
                        </Link>
                    ) : (
                        <span className="font-mono">
                            {waybill.vehicle.plate_number}
                        </span>
                    )}
                    {waybill.vehicle.name && (
                        <span className="text-muted-foreground">
                            {' '}
                            · {waybill.vehicle.name}
                        </span>
                    )}
                </Row>
                {waybill.trailer && (
                    <Row term={t('Trailer')}>
                        <Link
                            href={vehicles.show.url(waybill.trailer.id)}
                            className={cn(link, 'font-mono')}
                        >
                            {waybill.trailer.plate_number}
                        </Link>
                    </Row>
                )}
                <Row term={t('Driver')}>
                    {can.view_driver ? (
                        <Link
                            href={drivers.show.url(waybill.driver.id)}
                            className={link}
                        >
                            {waybill.driver.name}
                        </Link>
                    ) : (
                        waybill.driver.name
                    )}
                </Row>
                {waybill.branch && (
                    <Row term={t('Branch')}>{waybill.branch}</Row>
                )}
            </dl>
        </Section>
    );
}

function Schedule({ waybill }: { waybill: WaybillDetail }) {
    const { t } = useT();
    const format = useFormat();

    return (
        <Section title={t('Trip')}>
            <dl className="grid gap-2">
                <Row term={t('Planned departure')}>
                    {format.dateTime(waybill.planned_departure_at)}
                </Row>
                <Row term={t('Planned return')}>
                    {format.dateTime(waybill.planned_return_at)}
                </Row>
                {waybill.departure_at && (
                    <Row term={t('Departure')}>
                        {format.dateTime(waybill.departure_at)}
                        {waybill.departure_odometer_km !== null &&
                            ` · ${format.km(waybill.departure_odometer_km)}`}
                    </Row>
                )}
                {waybill.return_at && (
                    <Row term={t('Return')}>
                        {format.dateTime(waybill.return_at)}
                        {waybill.return_odometer_km !== null &&
                            ` · ${format.km(waybill.return_odometer_km)}`}
                    </Row>
                )}
                {waybill.basis && (
                    <Row term={t('Basis for the trip')}>{waybill.basis}</Row>
                )}
                {(waybill.departure_fuel_l !== null ||
                    waybill.return_fuel_l !== null) && (
                    <Row term={t('Fuel')}>
                        <FuelSummary waybill={waybill} />
                    </Row>
                )}
                {waybill.status === 'closed' && (
                    <Row term={t('Distance')}>
                        {waybill.distance_km !== null
                            ? format.km(waybill.distance_km)
                            : t('Not calculated: no odometer readings')}
                    </Row>
                )}
            </dl>
        </Section>
    );
}

function fuelUsed(
    departure: number | null,
    added: number | null,
    returned: number | null,
) {
    return departure === null || returned === null
        ? null
        : Math.round((departure + (added ?? 0) - returned) * 10) / 10;
}

function FuelSummary({ waybill }: { waybill: WaybillDetail }) {
    const { t } = useT();
    const used = fuelUsed(
        waybill.departure_fuel_l,
        waybill.fuel_added_l,
        waybill.return_fuel_l,
    );
    const litres = (value: number | null) =>
        value === null ? '—' : t(':value l', { value });

    return (
        <div className="grid gap-0.5">
            <span>
                {t('Departure')}: {litres(waybill.departure_fuel_l)}
                {waybill.fuel_added_l !== null &&
                    ` · ${t('Refuelled')}: ${litres(waybill.fuel_added_l)}`}
                {waybill.return_fuel_l !== null &&
                    ` · ${t('Return')}: ${litres(waybill.return_fuel_l)}`}
            </span>
            {used !== null &&
                (used >= 0 ? (
                    <span className="text-muted-foreground">
                        {t('Used: :value l', { value: used })}
                    </span>
                ) : (
                    <span className="text-amber-700 dark:text-amber-300">
                        {t(
                            'Fuel figures do not add up: more on return than at departure plus refuelling.',
                        )}
                    </span>
                ))}
        </div>
    );
}

function Audit({ waybill }: { waybill: WaybillDetail }) {
    const { t } = useT();
    const format = useFormat();
    const rows: [string, string | null, string | null][] = [
        [t('Created'), waybill.created_by, waybill.created_at],
        [t('Issued'), waybill.issued_by, waybill.issued_at],
        [t('Closed'), waybill.closed_by, waybill.closed_at],
        [t('Cancelled'), waybill.cancelled_by, waybill.cancelled_at],
    ];

    return (
        <Section title={t('History')}>
            <dl className="grid gap-2">
                {rows
                    .filter(([, , at]) => at !== null)
                    .map(([term, by, at]) => (
                        <Row key={term} term={term}>
                            {format.dateTime(at)}
                            {by && (
                                <span className="text-muted-foreground">
                                    {' '}
                                    · {by}
                                </span>
                            )}
                        </Row>
                    ))}
            </dl>
        </Section>
    );
}

function IssueSheet({
    waybill,
    nowLocal,
    onClose,
}: Props & { onClose: () => void }) {
    const { t } = useT();
    const format = useFormat();
    const form = useForm({
        departure_at: nowLocal,
        departure_odometer_km: '',
        departure_fuel_l: '',
    });
    const current = waybill.vehicle.current_odometer_km;
    const entered = Number.parseInt(form.data.departure_odometer_km, 10);
    const gap =
        current !== null && Number.isFinite(entered) ? entered - current : null;

    return (
        <ResponsiveSheet
            open
            onOpenChange={(value) => !value && onClose()}
            title={t('Issue waybill')}
            description={t(
                'The waybill gets its number, and the vehicle and driver are marked as on a trip.',
            )}
            footer={
                <SubmitBar
                    form="issue-form"
                    processing={form.processing}
                    label={t('Issue')}
                    onCancel={onClose}
                />
            }
        >
            <form
                id="issue-form"
                className="grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(waybillRoutes.issue.url(waybill.id), {
                        preserveScroll: true,
                        onSuccess: onClose,
                    });
                }}
            >
                <Field
                    id="departure_at"
                    label={t('Departure time')}
                    required
                    error={form.errors.departure_at}
                >
                    <Input
                        id="departure_at"
                        type="datetime-local"
                        max={nowLocal}
                        value={form.data.departure_at}
                        onChange={(event) =>
                            form.setData('departure_at', event.target.value)
                        }
                        required
                    />
                </Field>
                {waybill.vehicle.has_odometer && (
                    <Field
                        id="departure_odometer_km"
                        label={t('Odometer at departure, km')}
                        required
                        hint={
                            current !== null
                                ? t('Last recorded: :km', {
                                      km: format.km(current),
                                  })
                                : undefined
                        }
                        error={form.errors.departure_odometer_km}
                    >
                        <Input
                            id="departure_odometer_km"
                            type="number"
                            inputMode="numeric"
                            min={current ?? 0}
                            step={1}
                            placeholder={current?.toString()}
                            value={form.data.departure_odometer_km}
                            onChange={(event) =>
                                form.setData(
                                    'departure_odometer_km',
                                    event.target.value,
                                )
                            }
                            required
                        />
                    </Field>
                )}
                {gap !== null && gap > LARGE_GAP_KM && (
                    <p
                        role="status"
                        className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                    >
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        {t(
                            ':km more than the last recorded reading. Check the value: trips in between may be missing.',
                            { km: format.km(gap) },
                        )}
                    </p>
                )}
                <Field
                    id="departure_fuel_l"
                    label={t('Fuel at departure, l')}
                    error={form.errors.departure_fuel_l}
                >
                    <Input
                        id="departure_fuel_l"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={0.1}
                        value={form.data.departure_fuel_l}
                        onChange={(event) =>
                            form.setData('departure_fuel_l', event.target.value)
                        }
                    />
                </Field>
                <OtherErrors
                    errors={form.errors}
                    shown={[
                        'departure_at',
                        'departure_odometer_km',
                        'departure_fuel_l',
                    ]}
                />
            </form>
        </ResponsiveSheet>
    );
}

function OtherErrors({
    errors,
    shown,
}: {
    errors: Record<string, string | undefined>;
    shown: string[];
}) {
    const messages = Object.entries(errors)
        .filter(([key, message]) => message && !shown.includes(key))
        .map(([, message]) => message as string);

    if (messages.length === 0) {
        return null;
    }

    return (
        <ul
            role="alert"
            className="grid gap-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
            {messages.map((message) => (
                <li key={message}>{message}</li>
            ))}
        </ul>
    );
}

function CloseSheet({
    waybill,
    nowLocal,
    onClose,
}: Props & { onClose: () => void }) {
    const { t } = useT();
    const format = useFormat();
    const form = useForm({
        return_at: nowLocal,
        return_odometer_km: '',
        return_fuel_l: '',
        fuel_added_l: '',
        notes: waybill.notes ?? '',
    });
    const number = (value: string) => {
        const parsed = Number.parseFloat(value);

        return Number.isFinite(parsed) ? parsed : null;
    };
    const used = fuelUsed(
        waybill.departure_fuel_l,
        number(form.data.fuel_added_l),
        number(form.data.return_fuel_l),
    );
    const start = waybill.departure_odometer_km;
    const value = Number.parseInt(form.data.return_odometer_km, 10);
    const distance =
        start !== null && Number.isFinite(value) && value >= start
            ? value - start
            : null;

    return (
        <ResponsiveSheet
            open
            onOpenChange={(open) => !open && onClose()}
            title={t('Close trip')}
            description={t(
                'The return reading is saved to the vehicle mileage history.',
            )}
            footer={
                <SubmitBar
                    form="close-form"
                    processing={form.processing}
                    label={t('Close trip')}
                    onCancel={onClose}
                />
            }
        >
            <form
                id="close-form"
                className="grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(waybillRoutes.close.url(waybill.id), {
                        preserveScroll: true,
                        onSuccess: onClose,
                    });
                }}
            >
                <Field
                    id="return_at"
                    label={t('Return time')}
                    required
                    error={form.errors.return_at}
                >
                    <Input
                        id="return_at"
                        type="datetime-local"
                        max={nowLocal}
                        value={form.data.return_at}
                        onChange={(event) =>
                            form.setData('return_at', event.target.value)
                        }
                        required
                    />
                </Field>
                {waybill.vehicle.has_odometer && (
                    <Field
                        id="return_odometer_km"
                        label={t('Odometer on return, km')}
                        required
                        hint={
                            start !== null
                                ? distance !== null
                                    ? t('At departure: :km. Trip: :distance', {
                                          km: format.km(start),
                                          distance: format.km(distance),
                                      })
                                    : t('At departure: :km', {
                                          km: format.km(start),
                                      })
                                : undefined
                        }
                        error={form.errors.return_odometer_km}
                    >
                        <Input
                            id="return_odometer_km"
                            type="number"
                            inputMode="numeric"
                            min={start ?? 0}
                            step={1}
                            value={form.data.return_odometer_km}
                            onChange={(event) =>
                                form.setData(
                                    'return_odometer_km',
                                    event.target.value,
                                )
                            }
                            required
                        />
                    </Field>
                )}
                {distance !== null && distance > LARGE_GAP_KM && (
                    <p
                        role="status"
                        className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                    >
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        {t('Unusually long trip: :km. Check the reading.', {
                            km: format.km(distance),
                        })}
                    </p>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <Field
                        id="return_fuel_l"
                        label={t('Fuel on return, l')}
                        error={form.errors.return_fuel_l}
                    >
                        <Input
                            id="return_fuel_l"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={0.1}
                            value={form.data.return_fuel_l}
                            onChange={(event) =>
                                form.setData(
                                    'return_fuel_l',
                                    event.target.value,
                                )
                            }
                        />
                    </Field>
                    <Field
                        id="fuel_added_l"
                        label={t('Refuelled, l')}
                        error={form.errors.fuel_added_l}
                    >
                        <Input
                            id="fuel_added_l"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={0.1}
                            value={form.data.fuel_added_l}
                            onChange={(event) =>
                                form.setData('fuel_added_l', event.target.value)
                            }
                        />
                    </Field>
                </div>
                {used !== null && (
                    <p
                        role="status"
                        className={cn(
                            'text-sm',
                            used < 0
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-muted-foreground',
                        )}
                    >
                        {used < 0
                            ? t(
                                  'Fuel figures do not add up: more on return than at departure plus refuelling.',
                              )
                            : t('Used: :value l', { value: used })}
                    </p>
                )}
                <Field
                    id="close-notes"
                    label={t('Notes')}
                    error={form.errors.notes}
                >
                    <Textarea
                        id="close-notes"
                        rows={3}
                        value={form.data.notes}
                        onChange={(event) =>
                            form.setData('notes', event.target.value)
                        }
                    />
                </Field>
                <OtherErrors
                    errors={form.errors}
                    shown={[
                        'return_at',
                        'return_odometer_km',
                        'return_fuel_l',
                        'fuel_added_l',
                        'notes',
                    ]}
                />
            </form>
        </ResponsiveSheet>
    );
}

function CancelSheet({ waybill, onClose }: Props & { onClose: () => void }) {
    const { t } = useT();
    const form = useForm({ reason: '' });

    return (
        <ResponsiveSheet
            open
            onOpenChange={(open) => !open && onClose()}
            title={t('Cancel waybill')}
            description={
                waybill.status === 'issued'
                    ? t(
                          'The number stays used. Odometer readings already recorded are kept in the history.',
                      )
                    : t('The draft is kept in the list as cancelled.')
            }
            footer={
                <SubmitBar
                    form="cancel-form"
                    processing={form.processing}
                    label={t('Cancel waybill')}
                    onCancel={onClose}
                    destructive
                />
            }
        >
            <form
                id="cancel-form"
                className="grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(waybillRoutes.cancel.url(waybill.id), {
                        preserveScroll: true,
                        onSuccess: onClose,
                    });
                }}
            >
                <Field
                    id="reason"
                    label={t('Reason')}
                    required
                    error={
                        form.errors.reason ??
                        (form.errors as Record<string, string | undefined>)
                            .status
                    }
                >
                    <Textarea
                        id="reason"
                        rows={3}
                        maxLength={255}
                        value={form.data.reason}
                        onChange={(event) =>
                            form.setData('reason', event.target.value)
                        }
                        required
                    />
                </Field>
            </form>
        </ResponsiveSheet>
    );
}

WaybillsShow.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Waybills', href: waybillRoutes.index() },
        {
            title: props.waybill.number ?? 'Draft',
            href: waybillRoutes.show(props.waybill.id),
        },
    ],
});
