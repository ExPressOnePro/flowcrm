import { Head, Link, useForm } from '@inertiajs/react';

import {
    CustomerForm,
    type CustomerFormData,
} from '@/components/customers/customer-form';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import customers from '@/routes/customers';

type Props = {
    customer: {
        id: number;
        type: string;
        name: string;
        company_name: string | null;
        email: string | null;
        phone: string | null;
        website: string | null;
        tax_id: string | null;
        country: string | null;
        city: string | null;
        address: string | null;
        status: string;
        source: string | null;
        assigned_to: number | null;
        notes: string | null;
    };
    assignees: { id: number; name: string }[];
    statuses: string[];
    types: string[];
};

export default function CustomersEdit({
    customer,
    assignees,
    statuses,
    types,
}: Props) {
    const { data, setData, put, processing, errors } = useForm<CustomerFormData>({
        type: customer.type,
        name: customer.name,
        company_name: customer.company_name ?? '',
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        website: customer.website ?? '',
        tax_id: customer.tax_id ?? '',
        country: customer.country ?? '',
        city: customer.city ?? '',
        address: customer.address ?? '',
        status: customer.status,
        source: customer.source ?? '',
        assigned_to: customer.assigned_to
            ? String(customer.assigned_to)
            : '',
        notes: customer.notes ?? '',
    });

    return (
        <>
            <Head title={`Edit ${customer.name}`} />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
                <Heading
                    title={`Edit ${customer.name}`}
                    description="Update customer details."
                />

                <form
                    className="space-y-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        put(customers.update.url(customer.id));
                    }}
                >
                    <CustomerForm
                        data={data}
                        setData={setData}
                        errors={errors}
                        types={types}
                        statuses={statuses}
                        assignees={assignees}
                    />

                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Save changes
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link href={customers.show(customer.id)}>
                                Cancel
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

CustomersEdit.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Customers', href: customers.index() },
        { title: 'Edit', href: '#' },
    ],
};
