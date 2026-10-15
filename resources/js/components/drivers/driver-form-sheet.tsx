import { useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { ResponsiveSheet } from '@/components/responsive-sheet';
import {
    Field,
    identifierProps,
    selectClass,
    SubmitBar,
} from '@/components/sheet-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import drivers from '@/routes/drivers';
import type { DriverFormOptions, DriverItem } from '@/types/drivers';

type DriverWithNotes = DriverItem & { notes?: string | null };

/** Mount only while open so every opening starts from the saved data. */
export function DriverFormSheet({
    driver,
    options,
    onClose,
}: {
    driver: DriverWithNotes | null;
    options: DriverFormOptions;
    onClose: () => void;
}) {
    const { t, label } = useT();
    const form = useForm({
        last_name: driver?.last_name ?? '',
        first_name: driver?.first_name ?? '',
        middle_name: driver?.middle_name ?? '',
        phone: driver?.phone ?? '',
        personnel_number: driver?.personnel_number ?? '',
        license_number: driver?.license_number ?? '',
        license_categories: driver?.license_categories ?? ([] as string[]),
        branch_id:
            driver?.branch_id?.toString() ??
            (options.branches.length === 1
                ? String(options.branches[0].id)
                : ''),
        user_id: driver?.user_id?.toString() ?? '',
        status: driver?.status ?? 'active',
        notes: driver?.notes ?? '',
    });
    const categoryError = Object.entries(form.errors).find(([key]) =>
        key.startsWith('license_categories'),
    )?.[1];

    function toggleCategory(category: string) {
        const selected = form.data.license_categories;

        form.setData(
            'license_categories',
            selected.includes(category)
                ? selected.filter((value) => value !== category)
                : options.categories.filter(
                      (value) => value === category || selected.includes(value),
                  ),
        );
    }

    return (
        <ResponsiveSheet
            open
            onOpenChange={(value) => !value && onClose()}
            title={driver ? t('Edit driver') : t('New driver')}
            footer={
                <SubmitBar
                    form="driver-form"
                    processing={form.processing}
                    label={driver ? t('Save') : t('Add driver')}
                    onCancel={onClose}
                />
            }
        >
            <form
                id="driver-form"
                className="grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    const options = {
                        preserveScroll: true,
                        onSuccess: onClose,
                    };

                    if (driver) {
                        form.put(drivers.update.url(driver.id), options);
                    } else {
                        form.transform((data) => ({
                            ...data,
                            status: undefined,
                        }));
                        form.post(drivers.store.url(), options);
                    }
                }}
            >
                <Field
                    id="last_name"
                    label={t('Last name')}
                    required
                    error={form.errors.last_name}
                >
                    <Input
                        id="last_name"
                        autoComplete="off"
                        value={form.data.last_name}
                        onChange={(event) =>
                            form.setData('last_name', event.target.value)
                        }
                        required
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        id="first_name"
                        label={t('First name')}
                        required
                        error={form.errors.first_name}
                    >
                        <Input
                            id="first_name"
                            autoComplete="off"
                            value={form.data.first_name}
                            onChange={(event) =>
                                form.setData('first_name', event.target.value)
                            }
                            required
                        />
                    </Field>
                    <Field
                        id="middle_name"
                        label={t('Middle name')}
                        error={form.errors.middle_name}
                    >
                        <Input
                            id="middle_name"
                            autoComplete="off"
                            value={form.data.middle_name}
                            onChange={(event) =>
                                form.setData('middle_name', event.target.value)
                            }
                        />
                    </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        id="phone"
                        label={t('Phone')}
                        error={form.errors.phone}
                    >
                        <Input
                            id="phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="off"
                            value={form.data.phone}
                            onChange={(event) =>
                                form.setData('phone', event.target.value)
                            }
                        />
                    </Field>
                    <Field
                        id="personnel_number"
                        label={t('Personnel number')}
                        error={form.errors.personnel_number}
                    >
                        <Input
                            id="personnel_number"
                            {...identifierProps}
                            value={form.data.personnel_number}
                            onChange={(event) =>
                                form.setData(
                                    'personnel_number',
                                    event.target.value,
                                )
                            }
                        />
                    </Field>
                </div>
                <Field
                    id="license_number"
                    label={t('Driving licence number')}
                    error={form.errors.license_number}
                >
                    <Input
                        id="license_number"
                        {...identifierProps}
                        value={form.data.license_number}
                        onChange={(event) =>
                            form.setData('license_number', event.target.value)
                        }
                    />
                </Field>
                <fieldset className="grid gap-2">
                    <legend className="mb-2 text-sm font-medium">
                        {t('Licence categories')}
                    </legend>
                    <div className="flex flex-wrap gap-2">
                        {options.categories.map((category) => {
                            const checked =
                                form.data.license_categories.includes(category);

                            return (
                                <label
                                    key={category}
                                    className={cn(
                                        'inline-flex min-h-11 min-w-14 cursor-pointer items-center justify-center rounded-full border px-3 font-mono text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring md:min-h-9',
                                        checked
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'bg-background hover:bg-muted',
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={checked}
                                        onChange={() =>
                                            toggleCategory(category)
                                        }
                                    />
                                    {category}
                                </label>
                            );
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {t(
                            'The licence expiry date is kept as a driver document with reminders.',
                        )}
                    </p>
                    <InputError message={categoryError} />
                </fieldset>
                {options.branches.length > 0 && (
                    <Field
                        id="driver-branch"
                        label={t('Branch')}
                        error={form.errors.branch_id}
                    >
                        <select
                            id="driver-branch"
                            className={selectClass}
                            value={form.data.branch_id}
                            onChange={(event) =>
                                form.setData('branch_id', event.target.value)
                            }
                        >
                            <option value="">{t('Not assigned')}</option>
                            {options.branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
                {options.users.length > 0 && (
                    <Field
                        id="driver-user"
                        label={t('User account')}
                        hint={t(
                            'Optional. Links the driver to a CRM login, for example to show their own waybills.',
                        )}
                        error={form.errors.user_id}
                    >
                        <select
                            id="driver-user"
                            className={selectClass}
                            value={form.data.user_id}
                            onChange={(event) =>
                                form.setData('user_id', event.target.value)
                            }
                        >
                            <option value="">{t('No account')}</option>
                            {options.users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
                {driver && (
                    <Field
                        id="driver-status"
                        label={t('Status')}
                        hint={t(
                            'Inactive drivers cannot be assigned to new waybills. Their history is kept.',
                        )}
                        error={form.errors.status}
                    >
                        <select
                            id="driver-status"
                            className={selectClass}
                            value={form.data.status}
                            onChange={(event) =>
                                form.setData(
                                    'status',
                                    event.target
                                        .value as typeof form.data.status,
                                )
                            }
                        >
                            {['active', 'inactive'].map((status) => (
                                <option key={status} value={status}>
                                    {label('driver_status', status)}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
                <Field
                    id="driver-notes"
                    label={t('Notes')}
                    error={form.errors.notes}
                >
                    <Textarea
                        id="driver-notes"
                        rows={3}
                        value={form.data.notes}
                        onChange={(event) =>
                            form.setData('notes', event.target.value)
                        }
                    />
                </Field>
            </form>
        </ResponsiveSheet>
    );
}
