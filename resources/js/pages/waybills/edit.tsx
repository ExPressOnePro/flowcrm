import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import { WaybillForm } from '@/components/waybills/waybill-form';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import waybillRoutes from '@/routes/waybills';
import type { WaybillFormOptions } from '@/types/waybills';

type Props = WaybillFormOptions & {
    waybill: {
        id: number;
        vehicle_id: number;
        trailer_id: number | null;
        driver_id: number;
        route: string;
        basis: string | null;
        notes: string | null;
        planned_departure_at: string | null;
        planned_return_at: string | null;
    };
};

export default function WaybillsEdit({ waybill, ...options }: Props) {
    const { t } = useT();

    return (
        <>
            <Head title={t('Edit draft')} />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
                <Heading title={t('Edit draft')} />
                <WaybillForm
                    rememberKey={`WaybillEdit:${waybill.id}`}
                    initialStep="review"
                    initial={{
                        vehicle_id: String(waybill.vehicle_id),
                        trailer_id: waybill.trailer_id?.toString() ?? '',
                        driver_id: String(waybill.driver_id),
                        route: waybill.route,
                        basis: waybill.basis ?? '',
                        notes: waybill.notes ?? '',
                        planned_departure_at:
                            waybill.planned_departure_at ?? '',
                        planned_return_at: waybill.planned_return_at ?? '',
                    }}
                    options={options}
                    submitLabel={t('Save')}
                    cancelHref={waybillRoutes.show.url(waybill.id)}
                    onSubmit={(form) =>
                        form.put(waybillRoutes.update.url(waybill.id))
                    }
                />
            </div>
        </>
    );
}

WaybillsEdit.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Waybills', href: waybillRoutes.index() },
        { title: 'Draft', href: waybillRoutes.show(props.waybill.id) },
        { title: 'Edit', href: waybillRoutes.edit(props.waybill.id) },
    ],
});
