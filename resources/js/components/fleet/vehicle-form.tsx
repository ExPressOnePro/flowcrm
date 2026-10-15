import InputError from '@/components/input-error';
import { identifierProps, selectClass } from '@/components/sheet-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useT } from '@/lib/i18n';
import type { BranchOption, Option, VehicleTypeOption } from '@/types/fleet';

export type VehicleFormData = {
    plate_number: string;
    vin: string;
    make: string;
    model: string;
    year: string;
    vehicle_type_id: string;
    branch_id: string;
    ownership_type: string;
    responsible_user_id: string;
    commissioned_on: string;
    notes: string;
    status?: string;
    initial_odometer_km?: string;
};

type Props = {
    data: VehicleFormData;
    setData: (key: keyof VehicleFormData, value: string) => void;
    errors: Partial<Record<keyof VehicleFormData, string>>;
    types: VehicleTypeOption[];
    branches: BranchOption[];
    users: Option[];
    ownershipTypes: string[];
    statuses?: string[];
    isCreate?: boolean;
};

function RequiredLabel({
    htmlFor,
    children,
}: {
    htmlFor: string;
    children: string;
}) {
    const { t } = useT();

    return (
        <Label htmlFor={htmlFor}>
            {children}
            <span className="text-destructive" aria-label={t('required')}>
                {' '}
                *
            </span>
        </Label>
    );
}

export function VehicleForm({
    data,
    setData,
    errors,
    types,
    branches,
    users,
    ownershipTypes,
    statuses = [],
    isCreate = false,
}: Props) {
    const { t, label } = useT();
    const selectedType = types.find(
        (type) => String(type.id) === data.vehicle_type_id,
    );
    const selectableTypes = types.filter(
        (type) => type.is_active || String(type.id) === data.vehicle_type_id,
    );
    const selectableBranches = branches.filter(
        (branch) => branch.is_active || String(branch.id) === data.branch_id,
    );

    return (
        <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <RequiredLabel htmlFor="vehicle_type_id">
                        {t('Type')}
                    </RequiredLabel>
                    <select
                        id="vehicle_type_id"
                        className={selectClass}
                        value={data.vehicle_type_id}
                        onChange={(event) =>
                            setData('vehicle_type_id', event.target.value)
                        }
                        required
                    >
                        <option value="">—</option>
                        {selectableTypes.map((type) => (
                            <option key={type.id} value={String(type.id)}>
                                {type.name}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.vehicle_type_id} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="branch_id">{t('Branch')}</Label>
                    <select
                        id="branch_id"
                        className={selectClass}
                        value={data.branch_id}
                        onChange={(event) =>
                            setData('branch_id', event.target.value)
                        }
                    >
                        <option value="">{t('No branch')}</option>
                        {selectableBranches.map((branch) => (
                            <option key={branch.id} value={String(branch.id)}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.branch_id} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <RequiredLabel htmlFor="plate_number">
                        {t('Plate number')}
                    </RequiredLabel>
                    <Input
                        id="plate_number"
                        value={data.plate_number}
                        className="font-mono uppercase"
                        enterKeyHint="next"
                        {...identifierProps}
                        onChange={(event) =>
                            setData('plate_number', event.target.value)
                        }
                        required
                    />
                    <InputError message={errors.plate_number} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="vin">{t('VIN')}</Label>
                    <Input
                        id="vin"
                        value={data.vin}
                        maxLength={20}
                        className="font-mono uppercase"
                        enterKeyHint="next"
                        {...identifierProps}
                        onChange={(event) => setData('vin', event.target.value)}
                    />
                    <InputError message={errors.vin} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                    <RequiredLabel htmlFor="make">{t('Make')}</RequiredLabel>
                    <Input
                        id="make"
                        autoCapitalize="words"
                        value={data.make}
                        onChange={(event) =>
                            setData('make', event.target.value)
                        }
                        required
                    />
                    <InputError message={errors.make} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="model">{t('Model')}</Label>
                    <Input
                        id="model"
                        value={data.model}
                        onChange={(event) =>
                            setData('model', event.target.value)
                        }
                    />
                    <InputError message={errors.model} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="year">{t('Year')}</Label>
                    <Input
                        id="year"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        autoComplete="off"
                        value={data.year}
                        onChange={(event) =>
                            setData(
                                'year',
                                event.target.value.replace(/\D/g, ''),
                            )
                        }
                    />
                    <InputError message={errors.year} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="ownership_type">{t('Ownership')}</Label>
                    <select
                        id="ownership_type"
                        className={selectClass}
                        value={data.ownership_type}
                        onChange={(event) =>
                            setData('ownership_type', event.target.value)
                        }
                    >
                        {ownershipTypes.map((value) => (
                            <option key={value} value={value}>
                                {label('ownership_type', value)}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.ownership_type} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="commissioned_on">
                        {t('Commissioned on')}
                    </Label>
                    <Input
                        id="commissioned_on"
                        type="date"
                        value={data.commissioned_on}
                        onChange={(event) =>
                            setData('commissioned_on', event.target.value)
                        }
                    />
                    <InputError message={errors.commissioned_on} />
                </div>
            </div>

            {isCreate && (
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="status">{t('Initial status')}</Label>
                        <select
                            id="status"
                            className={selectClass}
                            value={data.status}
                            onChange={(event) =>
                                setData('status', event.target.value)
                            }
                        >
                            {statuses
                                .filter((value) => value !== 'decommissioned')
                                .map((value) => (
                                    <option key={value} value={value}>
                                        {label('vehicle_status', value)}
                                    </option>
                                ))}
                        </select>
                        <InputError message={errors.status} />
                    </div>
                    {(selectedType?.has_odometer ?? true) && (
                        <div className="grid gap-2">
                            <Label htmlFor="initial_odometer_km">
                                {t('Initial odometer, km')}
                            </Label>
                            <Input
                                id="initial_odometer_km"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="off"
                                value={data.initial_odometer_km}
                                onChange={(event) =>
                                    setData(
                                        'initial_odometer_km',
                                        event.target.value.replace(/\D/g, ''),
                                    )
                                }
                            />
                            <InputError message={errors.initial_odometer_km} />
                        </div>
                    )}
                </div>
            )}

            {selectedType && !selectedType.has_odometer && (
                <p className="text-sm text-muted-foreground">
                    {t(
                        'Trailers and semitrailers have no odometer; their mileage is derived from couplings.',
                    )}
                </p>
            )}

            <div className="grid gap-2">
                <Label htmlFor="responsible_user_id">
                    {t('Responsible person')}
                </Label>
                <select
                    id="responsible_user_id"
                    className={selectClass}
                    value={data.responsible_user_id}
                    onChange={(event) =>
                        setData('responsible_user_id', event.target.value)
                    }
                >
                    <option value="">{t('Not assigned')}</option>
                    {users.map((user) => (
                        <option key={user.id} value={String(user.id)}>
                            {user.name}
                        </option>
                    ))}
                </select>
                <InputError message={errors.responsible_user_id} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="notes">{t('Notes')}</Label>
                <Textarea
                    id="notes"
                    value={data.notes}
                    onChange={(event) => setData('notes', event.target.value)}
                />
                <InputError message={errors.notes} />
            </div>
        </div>
    );
}
