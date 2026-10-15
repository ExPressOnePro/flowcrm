import { Link, useForm, useRemember } from '@inertiajs/react';
import type { InertiaFormProps } from '@inertiajs/react';
import { AlertTriangle, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { SearchPicker } from '@/components/search-picker';
import type { PickerOption } from '@/components/search-picker';
import { Field } from '@/components/sheet-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type {
    WaybillDriverOption,
    WaybillFormOptions,
    WaybillVehicleOption,
} from '@/types/waybills';

export type WaybillFormData = {
    vehicle_id: string;
    trailer_id: string;
    driver_id: string;
    route: string;
    basis: string;
    notes: string;
    planned_departure_at: string;
    planned_return_at: string;
    idempotency_key?: string;
};

const STEPS = ['vehicle', 'driver', 'trip', 'review'] as const;

type Step = (typeof STEPS)[number];

const STEP_LABELS: Record<Step, string> = {
    vehicle: 'Vehicle',
    driver: 'Driver',
    trip: 'Trip',
    review: 'Review',
};

const STEP_FIELDS: Record<Step, (keyof WaybillFormData)[]> = {
    vehicle: ['vehicle_id', 'trailer_id'],
    driver: ['driver_id'],
    trip: [
        'route',
        'basis',
        'notes',
        'planned_departure_at',
        'planned_return_at',
    ],
    review: [],
};

const LICENSE_BY_CATEGORY: Record<string, string> = {
    tractor: 'CE',
    truck: 'C',
    bus: 'D',
    car: 'B',
};

type Warning = { level: 'danger' | 'warning'; text: string };

export function WaybillForm({
    rememberKey,
    initial,
    initialStep = 'vehicle',
    options,
    submitLabel,
    cancelHref,
    onSubmit,
}: {
    rememberKey: string;
    initial: WaybillFormData;
    initialStep?: Step;
    options: WaybillFormOptions;
    submitLabel: string;
    cancelHref: string;
    onSubmit: (form: InertiaFormProps<WaybillFormData>) => void;
}) {
    const { t } = useT();
    const form = useForm<WaybillFormData>(rememberKey, initial);
    const [step, setStep] = useRemember<Step>(
        initialStep,
        `${rememberKey}:step`,
    );
    const headingRef = useRef<HTMLHeadingElement>(null);
    const { data, setData, errors, processing } = form;
    const change = (
        field: Exclude<keyof WaybillFormData, 'idempotency_key'>,
        value: string,
    ) => {
        setData(field, value);
        form.clearErrors(field);
    };
    const vehicle = options.vehicles.find(
        (option) => String(option.id) === data.vehicle_id,
    );
    const trailer = options.trailers.find(
        (option) => String(option.id) === data.trailer_id,
    );
    const driver = options.drivers.find(
        (option) => String(option.id) === data.driver_id,
    );
    const requiredLicense = vehicle
        ? data.trailer_id && vehicle.category === 'truck'
            ? 'CE'
            : LICENSE_BY_CATEGORY[vehicle.category]
        : undefined;
    const index = STEPS.indexOf(step);

    useUnsavedChanges(form.isDirty && !processing);

    useEffect(() => {
        headingRef.current?.focus({ preventScroll: true });
        headingRef.current?.scrollIntoView({ block: 'nearest' });
    }, [step]);

    useEffect(() => {
        const failed = STEPS.find((key) =>
            STEP_FIELDS[key].some((field) => errors[field]),
        );

        if (failed) {
            setStep(failed);
        }
        // Only jump when a new set of server errors arrives.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [errors]);

    type Missing = { field: keyof WaybillFormData; message: string } | null;
    const missing: Record<Step, Missing> = {
        vehicle: data.vehicle_id
            ? null
            : { field: 'vehicle_id', message: t('Choose a vehicle.') },
        driver: data.driver_id
            ? null
            : { field: 'driver_id', message: t('Choose a driver.') },
        trip: !data.planned_departure_at
            ? {
                  field: 'planned_departure_at',
                  message: t('Enter the planned departure time.'),
              }
            : !data.route.trim()
              ? { field: 'route', message: t('Enter the route.') }
              : data.planned_return_at &&
                  data.planned_return_at <= data.planned_departure_at
                ? {
                      field: 'planned_return_at',
                      message: t(
                          'The planned return must be later than the departure.',
                      ),
                  }
                : null,
        review: null,
    };

    const warnings: Warning[] = [];

    if (vehicle?.busy) {
        warnings.push({
            level: 'warning',
            text: t(
                'This vehicle is on another trip. The draft can be saved, but it can only be issued after that trip is closed.',
            ),
        });
    }

    if (trailer?.busy) {
        warnings.push({
            level: 'warning',
            text: t('This trailer is on another trip.'),
        });
    }

    if (driver?.busy) {
        warnings.push({
            level: 'warning',
            text: t('This driver is on another trip.'),
        });
    }

    if (vehicle && vehicle.status !== 'in_service') {
        warnings.push({
            level: 'warning',
            text: t('Vehicle status: :status.', {
                status: t(
                    vehicle.status === 'under_repair'
                        ? 'Under repair'
                        : vehicle.status === 'idle'
                          ? 'Idle'
                          : vehicle.status,
                ),
            }),
        });
    }

    if (
        driver &&
        requiredLicense &&
        !driver.categories.includes(requiredLicense)
    ) {
        warnings.push({
            level: 'warning',
            text: t(
                'The driver card has no category :category. Check the licence before issuing.',
                { category: requiredLicense },
            ),
        });
    }

    if (data.planned_departure_at && !data.planned_return_at) {
        warnings.push({
            level: 'warning',
            text: t(
                'No planned return time: an overdue return will not be flagged.',
            ),
        });
    }

    function next() {
        const problem = missing[step];

        if (problem) {
            form.setError(problem.field, problem.message);

            return;
        }

        form.clearErrors(...STEP_FIELDS[step]);
        setStep(STEPS[index + 1]);
    }

    const vehicleOption = (option: WaybillVehicleOption): PickerOption => ({
        id: option.id,
        title: option.plate_number,
        subtitle: [option.name, option.branch].filter(Boolean).join(' · '),
        mono: true,
        hint: option.busy ? <BusyHint /> : undefined,
    });
    const driverOption = (option: WaybillDriverOption): PickerOption => ({
        id: option.id,
        title: option.name,
        subtitle:
            option.categories.length > 0
                ? t('Categories: :list', { list: option.categories.join(', ') })
                : t('Categories not set'),
        keywords: option.categories.join(' '),
        hint: option.busy ? <BusyHint /> : undefined,
    });

    return (
        <form
            className="flex flex-col gap-5"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();

                if (step !== 'review') {
                    next();

                    return;
                }

                const incomplete = STEPS.find((key) => missing[key]);

                if (incomplete) {
                    setStep(incomplete);

                    return;
                }

                onSubmit(form);
            }}
        >
            <ol className="grid grid-cols-4 gap-1" aria-label={t('Steps')}>
                {STEPS.map((key, position) => {
                    const reachable =
                        position <= index ||
                        STEPS.slice(0, position).every(
                            (prior) => !missing[prior],
                        );

                    return (
                        <li key={key}>
                            <button
                                type="button"
                                disabled={!reachable}
                                aria-current={key === step ? 'step' : undefined}
                                onClick={() => setStep(key)}
                                className={cn(
                                    'flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs disabled:opacity-50',
                                    key === step
                                        ? 'bg-primary/10 font-medium text-foreground'
                                        : 'text-muted-foreground hover:bg-muted',
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex size-6 items-center justify-center rounded-full border text-[11px] tabular-nums',
                                        key === step &&
                                            'border-primary bg-primary text-primary-foreground',
                                        position < index &&
                                            !missing[key] &&
                                            'border-primary text-primary',
                                    )}
                                >
                                    {position + 1}
                                </span>
                                <span className="max-w-full truncate">
                                    {t(STEP_LABELS[key])}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>

            <section className="grid gap-4 rounded-xl border p-4 md:p-5">
                <h2
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-base font-medium outline-none"
                >
                    {t(':current of :total. :title', {
                        current: index + 1,
                        total: STEPS.length,
                        title: t(
                            {
                                vehicle: 'Vehicle and trailer',
                                driver: 'Driver',
                                trip: 'Date, route and basis',
                                review: 'Check and save',
                            }[step],
                        ),
                    })}
                </h2>

                {step === 'vehicle' && (
                    <>
                        <SearchPicker
                            label={t('Vehicle')}
                            required
                            options={options.vehicles.map(vehicleOption)}
                            value={data.vehicle_id}
                            onChange={(value) => {
                                const chosen = options.vehicles.find(
                                    (option) => String(option.id) === value,
                                );
                                setData((previous) => ({
                                    ...previous,
                                    vehicle_id: value,
                                    trailer_id: chosen?.can_tow
                                        ? previous.trailer_id
                                        : '',
                                }));
                                form.clearErrors('vehicle_id');
                            }}
                            placeholder={t('Plate, make or branch')}
                            emptyText={t('No vehicles found.')}
                            error={errors.vehicle_id}
                        />
                        {vehicle?.can_tow && options.trailers.length > 0 && (
                            <SearchPicker
                                label={t('Trailer')}
                                options={options.trailers.map(vehicleOption)}
                                value={data.trailer_id}
                                onChange={(value) =>
                                    change('trailer_id', value)
                                }
                                placeholder={t('Trailer plate')}
                                emptyText={t('No trailers found.')}
                                noneLabel={t('No trailer')}
                                error={errors.trailer_id}
                            />
                        )}
                    </>
                )}

                {step === 'driver' && (
                    <SearchPicker
                        label={t('Driver')}
                        required
                        options={options.drivers.map(driverOption)}
                        value={data.driver_id}
                        onChange={(value) => change('driver_id', value)}
                        placeholder={t('Name or licence category')}
                        emptyText={t('No active drivers found.')}
                        error={errors.driver_id}
                    />
                )}

                {step === 'trip' && (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                id="planned_departure_at"
                                label={t('Planned departure')}
                                required
                                error={errors.planned_departure_at}
                            >
                                <Input
                                    id="planned_departure_at"
                                    type="datetime-local"
                                    value={data.planned_departure_at}
                                    onChange={(event) =>
                                        change(
                                            'planned_departure_at',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </Field>
                            <Field
                                id="planned_return_at"
                                label={t('Planned return')}
                                error={errors.planned_return_at}
                                hint={t('Used to flag overdue returns.')}
                            >
                                <Input
                                    id="planned_return_at"
                                    type="datetime-local"
                                    min={data.planned_departure_at || undefined}
                                    value={data.planned_return_at}
                                    onChange={(event) =>
                                        change(
                                            'planned_return_at',
                                            event.target.value,
                                        )
                                    }
                                />
                            </Field>
                        </div>
                        <Field
                            id="route"
                            label={t('Route')}
                            required
                            error={errors.route}
                        >
                            <Textarea
                                id="route"
                                rows={2}
                                maxLength={500}
                                placeholder={t(
                                    'For example: Chișinău — Bălți — Chișinău',
                                )}
                                value={data.route}
                                onChange={(event) =>
                                    change('route', event.target.value)
                                }
                                required
                            />
                        </Field>
                        <Field
                            id="basis"
                            label={t('Basis for the trip')}
                            hint={t('Order, contract or request number.')}
                            error={errors.basis}
                        >
                            <Input
                                id="basis"
                                maxLength={255}
                                autoComplete="off"
                                value={data.basis}
                                onChange={(event) =>
                                    change('basis', event.target.value)
                                }
                            />
                        </Field>
                        <Field
                            id="notes"
                            label={t('Notes')}
                            error={errors.notes}
                        >
                            <Textarea
                                id="notes"
                                rows={3}
                                value={data.notes}
                                onChange={(event) =>
                                    change('notes', event.target.value)
                                }
                            />
                        </Field>
                    </>
                )}

                {step === 'review' && (
                    <>
                        <dl className="grid gap-3 text-sm">
                            <ReviewRow
                                term={t('Vehicle')}
                                onEdit={() => setStep('vehicle')}
                            >
                                <span className="font-mono">
                                    {vehicle?.plate_number ?? '—'}
                                </span>
                                {vehicle?.name && (
                                    <span className="text-muted-foreground">
                                        {' '}
                                        · {vehicle.name}
                                    </span>
                                )}
                                {trailer && (
                                    <div className="font-mono">
                                        + {trailer.plate_number}
                                    </div>
                                )}
                            </ReviewRow>
                            <ReviewRow
                                term={t('Driver')}
                                onEdit={() => setStep('driver')}
                            >
                                {driver?.name ?? '—'}
                            </ReviewRow>
                            <ReviewRow
                                term={t('Trip')}
                                onEdit={() => setStep('trip')}
                            >
                                <div className="break-words">{data.route}</div>
                                <div className="text-muted-foreground tabular-nums">
                                    {formatLocal(data.planned_departure_at)}
                                    {data.planned_return_at &&
                                        ` – ${formatLocal(data.planned_return_at)}`}
                                </div>
                                {data.basis && (
                                    <div className="text-muted-foreground">
                                        {t('Basis')}: {data.basis}
                                    </div>
                                )}
                            </ReviewRow>
                        </dl>

                        {warnings.length > 0 && (
                            <ul className="grid gap-2">
                                {warnings.map((warning) => (
                                    <li
                                        key={warning.text}
                                        role="status"
                                        className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                                    >
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                        {warning.text}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                            <Info className="mt-0.5 size-4 shrink-0" />
                            {vehicle?.has_odometer
                                ? t(
                                      'The waybill is saved as a draft. The odometer reading and fuel are entered when it is issued at departure.',
                                  )
                                : t(
                                      'The waybill is saved as a draft and gets its number when issued.',
                                  )}
                        </p>
                    </>
                )}
            </section>

            <div className="sticky bottom-(--bottom-nav-h,0px) z-20 -mx-4 grid grid-cols-[auto_1fr] gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:flex sm:items-center md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
                {index > 0 ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(STEPS[index - 1])}
                    >
                        <ChevronLeft />
                        {t('Back')}
                    </Button>
                ) : (
                    <Button variant="ghost" asChild>
                        <Link href={cancelHref}>{t('Cancel')}</Link>
                    </Button>
                )}
                <Button type="submit" disabled={processing}>
                    {processing && <Spinner />}
                    {step === 'review' ? (
                        submitLabel
                    ) : (
                        <>
                            {t('Next')}
                            <ChevronRight />
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}

/** "2026-10-16T08:00" from a datetime-local input, shown as entered. */
function formatLocal(value: string) {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/);

    return match ? `${match[3]}.${match[2]}.${match[1]}, ${match[4]}` : '—';
}

function BusyHint() {
    const { t } = useT();

    return (
        <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {t('on a trip')}
        </span>
    );
}

function ReviewRow({
    term,
    onEdit,
    children,
}: {
    term: string;
    onEdit: () => void;
    children: ReactNode;
}) {
    const { t } = useT();

    return (
        <div className="flex items-start gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
                <dt className="text-xs text-muted-foreground">{term}</dt>
                <dd className="mt-0.5">{children}</dd>
            </div>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onEdit}
                aria-label={`${t('Edit')}: ${term}`}
            >
                {t('Edit')}
            </Button>
        </div>
    );
}
