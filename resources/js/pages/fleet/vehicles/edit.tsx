import { Head, Link, useForm } from '@inertiajs/react';

import { VehicleForm } from '@/components/fleet/vehicle-form';
import type { VehicleFormData } from '@/components/fleet/vehicle-form';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import vehicles from '@/routes/vehicles';
import type { VehicleOptions } from '@/types/fleet';

type Props = VehicleOptions & {
    vehicle: {
        id: number;
        plate_number: string;
        vin: string | null;
        make: string;
        model: string | null;
        year: number | null;
        vehicle_type_id: number;
        branch_id: number | null;
        ownership_type: string;
        responsible_user_id: number | null;
        commissioned_on: string | null;
        notes: string | null;
    };
};

export default function VehiclesEdit({
    vehicle,
    types,
    branches,
    users,
    ownershipTypes,
}: Props) {
    const { t } = useT();
    const { data, setData, put, processing, errors, isDirty } =
        useForm<VehicleFormData>(`VehicleEdit:${vehicle.id}`, {
            plate_number: vehicle.plate_number,
            vin: vehicle.vin ?? '',
            make: vehicle.make,
            model: vehicle.model ?? '',
            year: vehicle.year ? String(vehicle.year) : '',
            vehicle_type_id: String(vehicle.vehicle_type_id),
            branch_id: vehicle.branch_id ? String(vehicle.branch_id) : '',
            ownership_type: vehicle.ownership_type,
            responsible_user_id: vehicle.responsible_user_id
                ? String(vehicle.responsible_user_id)
                : '',
            commissioned_on: vehicle.commissioned_on ?? '',
            notes: vehicle.notes ?? '',
        });

    useUnsavedChanges(isDirty && !processing);

    return (
        <>
            <Head title={`${t('Edit vehicle')} ${vehicle.plate_number}`} />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
                <Heading
                    title={`${t('Edit vehicle')}: ${vehicle.plate_number}`}
                    description={t(
                        'Inactive types and branches are shown only if already selected.',
                    )}
                />

                <form
                    className="space-y-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        put(vehicles.update.url(vehicle.id));
                    }}
                >
                    <VehicleForm
                        data={data}
                        setData={setData}
                        errors={errors}
                        types={types}
                        branches={branches}
                        users={users}
                        ownershipTypes={ownershipTypes}
                    />

                    <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            {t('Save changes')}
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link href={vehicles.show(vehicle.id)}>
                                {t('Cancel')}
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

VehiclesEdit.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Vehicles', href: vehicles.index() },
        {
            title: props.vehicle.plate_number,
            href: vehicles.show(props.vehicle.id),
        },
        { title: 'Edit', href: vehicles.edit(props.vehicle.id) },
    ],
});
