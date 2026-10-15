import { Head } from '@inertiajs/react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { WaybillForm } from '@/components/waybills/waybill-form';
import { useT } from '@/lib/i18n';
import { newIdempotencyKey } from '@/lib/idempotency';
import { dashboard } from '@/routes';
import waybillRoutes from '@/routes/waybills';
import type { WaybillFormOptions } from '@/types/waybills';

type Props = WaybillFormOptions & {
    defaults: {
        vehicle_id: number | null;
        trailer_id: number | null;
        driver_id: number | null;
        planned_departure_at: string;
    };
};

export default function WaybillsCreate({ defaults, ...options }: Props) {
    const { t } = useT();
    const [initial] = useState(() => ({
        vehicle_id: defaults.vehicle_id?.toString() ?? '',
        trailer_id: defaults.trailer_id?.toString() ?? '',
        driver_id: defaults.driver_id?.toString() ?? '',
        route: '',
        basis: '',
        notes: '',
        planned_departure_at: defaults.planned_departure_at,
        planned_return_at: '',
        idempotency_key: newIdempotencyKey(),
    }));

    return (
        <>
            <Head title={t('New waybill')} />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
                <Heading
                    title={t('New waybill')}
                    description={t(
                        'Saved as a draft first. The number is assigned when the waybill is issued.',
                    )}
                />
                <WaybillForm
                    rememberKey="WaybillCreate"
                    initial={initial}
                    options={options}
                    submitLabel={t('Save draft')}
                    cancelHref={waybillRoutes.index.url()}
                    onSubmit={(form) => form.post(waybillRoutes.store.url())}
                />
            </div>
        </>
    );
}

WaybillsCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Waybills', href: waybillRoutes.index() },
        { title: 'New', href: waybillRoutes.create() },
    ],
};
