import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useConfirm } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { ResponsiveSheet } from '@/components/responsive-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import vehicles from '@/routes/vehicles';
import couplingRoutes from '@/routes/vehicles/couplings';
import odometerRoutes from '@/routes/vehicles/odometer';
import type {
    ActiveCoupling,
    CouplingCandidate,
    VehicleDetail,
} from '@/types/fleet';

export type VehicleAction = 'status' | 'odometer' | 'couple';

const selectClass =
    'border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs';

type SheetProps = {
    open: boolean;
    onClose: () => void;
    onDone: () => void;
    vehicle: VehicleDetail;
};

function Field({
    id,
    label,
    required,
    hint,
    error,
    children,
}: {
    id: string;
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    children: ReactNode;
}) {
    const { t } = useT();

    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>
                {label}
                {required && (
                    <span
                        className="text-destructive"
                        aria-label={t('required')}
                    >
                        {' '}
                        *
                    </span>
                )}
            </Label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            <InputError message={error} />
        </div>
    );
}

function SubmitBar({
    processing,
    label,
    onCancel,
    destructive,
    form,
}: {
    processing: boolean;
    label: string;
    onCancel: () => void;
    destructive?: boolean;
    form: string;
}) {
    const { t } = useT();

    return (
        <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
                {t('Cancel')}
            </Button>
            <Button
                type="submit"
                form={form}
                disabled={processing}
                variant={destructive ? 'destructive' : 'default'}
            >
                {processing && <Spinner />}
                {label}
            </Button>
        </div>
    );
}

export function StatusSheet({
    open,
    onClose,
    onDone,
    vehicle,
    statuses,
}: SheetProps & { statuses: string[] }) {
    const { t, label } = useT();
    const confirm = useConfirm();
    const options = statuses.filter((status) => status !== vehicle.status);
    const form = useForm({
        status: options[0] ?? '',
        reason: '',
        changed_at: '',
    });
    const decommission = form.data.status === 'decommissioned';

    async function submit(event: FormEvent) {
        event.preventDefault();

        if (
            decommission &&
            !(await confirm({
                title: t('Decommission :plate?', {
                    plate: vehicle.plate_number,
                }),
                description: t(
                    'Active couplings will be closed. The vehicle stays in history and can be returned to service later.',
                ),
                confirmLabel: t('Decommission'),
                destructive: true,
            }))
        ) {
            return;
        }

        form.post(vehicles.status.url(vehicle.id), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('reason', 'changed_at');
                onDone();
            },
        });
    }

    return (
        <ResponsiveSheet
            open={open}
            onOpenChange={(value) => !value && onClose()}
            title={t('Change status')}
            footer={
                <SubmitBar
                    form="status-form"
                    processing={form.processing}
                    label={t('Change status')}
                    onCancel={onClose}
                    destructive={decommission}
                />
            }
        >
            <form id="status-form" className="grid gap-4" onSubmit={submit}>
                <Field
                    id="new-status"
                    label={t('New status')}
                    required
                    error={form.errors.status}
                >
                    <select
                        id="new-status"
                        className={selectClass}
                        value={form.data.status}
                        onChange={(event) =>
                            form.setData('status', event.target.value)
                        }
                    >
                        {options.map((status) => (
                            <option key={status} value={status}>
                                {label('vehicle_status', status)}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field
                    id="status-reason"
                    label={t('Reason')}
                    required={decommission}
                    error={form.errors.reason}
                >
                    <Textarea
                        id="status-reason"
                        rows={3}
                        value={form.data.reason}
                        onChange={(event) =>
                            form.setData('reason', event.target.value)
                        }
                    />
                </Field>
                <Field
                    id="status-changed-at"
                    label={t('Effective at')}
                    hint={t('Leave empty to use the current time.')}
                    error={form.errors.changed_at}
                >
                    <Input
                        id="status-changed-at"
                        type="datetime-local"
                        value={form.data.changed_at}
                        onChange={(event) =>
                            form.setData('changed_at', event.target.value)
                        }
                    />
                </Field>
            </form>
        </ResponsiveSheet>
    );
}

export function OdometerSheet({ open, onClose, onDone, vehicle }: SheetProps) {
    const { t } = useT();
    const format = useFormat();
    const form = useForm({ value_km: '', recorded_at: '', note: '' });

    return (
        <ResponsiveSheet
            open={open}
            onOpenChange={(value) => !value && onClose()}
            title={t('Record reading')}
            description={`${t('Current odometer')}: ${format.km(vehicle.current_odometer_km)}`}
            footer={
                <SubmitBar
                    form="odometer-form"
                    processing={form.processing}
                    label={t('Save')}
                    onCancel={onClose}
                />
            }
        >
            <form
                id="odometer-form"
                className="grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(odometerRoutes.store.url(vehicle.id), {
                        preserveScroll: true,
                        onSuccess: () => {
                            form.reset();
                            onDone();
                        },
                    });
                }}
            >
                <Field
                    id="value_km"
                    label={t('Odometer, km')}
                    required
                    error={form.errors.value_km}
                >
                    <Input
                        id="value_km"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={form.data.value_km}
                        onChange={(event) =>
                            form.setData(
                                'value_km',
                                event.target.value.replace(/\D/g, ''),
                            )
                        }
                        required
                    />
                </Field>
                <Field
                    id="recorded_at"
                    label={t('Recorded at')}
                    hint={t('Leave empty to use the current time.')}
                    error={form.errors.recorded_at}
                >
                    <Input
                        id="recorded_at"
                        type="datetime-local"
                        value={form.data.recorded_at}
                        onChange={(event) =>
                            form.setData('recorded_at', event.target.value)
                        }
                    />
                </Field>
                <Field id="reading-note" label={t('Note')}>
                    <Input
                        id="reading-note"
                        value={form.data.note}
                        onChange={(event) =>
                            form.setData('note', event.target.value)
                        }
                    />
                </Field>
                <p className="text-xs text-muted-foreground">
                    {t(
                        'Readings cannot decrease over time. Values from telematics devices are marked separately.',
                    )}
                </p>
            </form>
        </ResponsiveSheet>
    );
}

export function CoupleSheet({
    open,
    onClose,
    onDone,
    vehicle,
    candidates,
}: SheetProps & { candidates: CouplingCandidate[] }) {
    const { t } = useT();
    const form = useForm({
        trailer_id: '',
        position: '1',
        coupled_at: '',
        notes: '',
    });

    return (
        <ResponsiveSheet
            open={open}
            onOpenChange={(value) => !value && onClose()}
            title={t('Couple trailer')}
            footer={
                candidates.length > 0 ? (
                    <SubmitBar
                        form="couple-form"
                        processing={form.processing}
                        label={t('Couple trailer')}
                        onCancel={onClose}
                    />
                ) : undefined
            }
        >
            {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {t('No free trailers available.')}
                </p>
            ) : (
                <form
                    id="couple-form"
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(couplingRoutes.store.url(vehicle.id), {
                            preserveScroll: true,
                            onSuccess: () => {
                                form.reset();
                                onDone();
                            },
                        });
                    }}
                >
                    <Field
                        id="trailer_id"
                        label={t('Trailer')}
                        required
                        error={form.errors.trailer_id}
                    >
                        <select
                            id="trailer_id"
                            className={selectClass}
                            value={form.data.trailer_id}
                            onChange={(event) =>
                                form.setData('trailer_id', event.target.value)
                            }
                            required
                        >
                            <option value="">{t('Select trailer')}</option>
                            {candidates.map((candidate) => (
                                <option
                                    key={candidate.id}
                                    value={String(candidate.id)}
                                >
                                    {candidate.plate_number} — {candidate.type}
                                    {candidate.name && `, ${candidate.name}`}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field
                        id="position"
                        label={t('Position')}
                        error={form.errors.position}
                    >
                        <select
                            id="position"
                            className={selectClass}
                            value={form.data.position}
                            onChange={(event) =>
                                form.setData('position', event.target.value)
                            }
                        >
                            {[1, 2, 3].map((position) => (
                                <option key={position} value={String(position)}>
                                    {position}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field
                        id="coupled_at"
                        label={t('Coupled at')}
                        hint={t('Leave empty to use the current time.')}
                        error={form.errors.coupled_at}
                    >
                        <Input
                            id="coupled_at"
                            type="datetime-local"
                            value={form.data.coupled_at}
                            onChange={(event) =>
                                form.setData('coupled_at', event.target.value)
                            }
                        />
                    </Field>
                    <Field id="coupling-notes" label={t('Note')}>
                        <Input
                            id="coupling-notes"
                            value={form.data.notes}
                            onChange={(event) =>
                                form.setData('notes', event.target.value)
                            }
                        />
                    </Field>
                </form>
            )}
        </ResponsiveSheet>
    );
}

export function UncoupleSheet({
    coupling,
    onClose,
    onDone,
    vehicle,
}: Omit<SheetProps, 'open'> & { coupling: ActiveCoupling | null }) {
    const { t } = useT();
    const format = useFormat();
    const form = useForm({ uncoupled_at: '' });

    return (
        <ResponsiveSheet
            open={coupling !== null}
            onOpenChange={(value) => !value && onClose()}
            title={t('Uncouple trailer')}
            description={
                coupling?.partner
                    ? `${vehicle.plate_number} + ${coupling.partner.plate_number} · ${t('since')} ${format.dateTime(coupling.coupled_at)}`
                    : undefined
            }
            footer={
                <SubmitBar
                    form="uncouple-form"
                    processing={form.processing}
                    label={t('Uncouple')}
                    onCancel={onClose}
                    destructive
                />
            }
        >
            <form
                id="uncouple-form"
                className="grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault();

                    if (!coupling) {
                        return;
                    }

                    form.post(
                        couplingRoutes.uncouple.url({
                            vehicle: vehicle.id,
                            coupling: coupling.id,
                        }),
                        {
                            preserveScroll: true,
                            onSuccess: () => {
                                form.reset();
                                onDone();
                            },
                        },
                    );
                }}
            >
                <Field
                    id="uncoupled_at"
                    label={t('Uncoupled at')}
                    hint={t('Leave empty to use the current time.')}
                    error={form.errors.uncoupled_at}
                >
                    <Input
                        id="uncoupled_at"
                        type="datetime-local"
                        value={form.data.uncoupled_at}
                        onChange={(event) =>
                            form.setData('uncoupled_at', event.target.value)
                        }
                    />
                </Field>
            </form>
        </ResponsiveSheet>
    );
}
