import { Head, Link, useForm } from '@inertiajs/react';

import { VehicleForm } from '@/components/fleet/vehicle-form';
import type { VehicleFormData } from '@/components/fleet/vehicle-form';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import vehicles from '@/routes/vehicles';
import type { VehicleOptions } from '@/types/fleet';

type Props = VehicleOptions & {
    defaultBranchId: number | null;
};

export default function VehiclesCreate({
    types,
    branches,
    users,
    statuses,
    ownershipTypes,
    defaultBranchId,
}: Props) {
    const { t } = useT();
    const { data, setData, post, processing, errors } =
        useForm<VehicleFormData>({
            plate_number: '',
            vin: '',
            make: '',
            model: '',
            year: '',
            vehicle_type_id: '',
            branch_id: defaultBranchId ? String(defaultBranchId) : '',
            ownership_type: 'owned',
            responsible_user_id: '',
            commissioned_on: '',
            notes: '',
            status: 'in_service',
            initial_odometer_km: '',
        });

    return (
        <>
            <Head title={t('Register vehicle')} />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
                <Heading
                    title={t('Register vehicle')}
                    description={t(
                        'Register a tractor, trailer or other vehicle.',
                    )}
                />

                <form
                    className="space-y-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        post(vehicles.store.url());
                    }}
                >
                    <VehicleForm
                        data={data}
                        setData={setData}
                        errors={errors}
                        types={types}
                        branches={branches}
                        users={users}
                        statuses={statuses}
                        ownershipTypes={ownershipTypes}
                        isCreate
                    />

                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            {t('Register vehicle')}
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link href={vehicles.index()}>{t('Cancel')}</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

VehiclesCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Vehicles', href: vehicles.index() },
        { title: 'New', href: vehicles.create() },
    ],
};
