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
    assignees: { id: number; name: string }[];
    statuses: string[];
    types: string[];
};

export default function CustomersCreate({
    assignees,
    statuses,
    types,
}: Props) {
    const { data, setData, post, processing, errors } = useForm<CustomerFormData>({
        type: 'company',
        name: '',
        company_name: '',
        email: '',
        phone: '',
        website: '',
        tax_id: '',
        country: '',
        city: '',
        address: '',
        status: 'active',
        source: '',
        assigned_to: '',
        notes: '',
    });

    return (
        <>
            <Head title="New customer" />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="New customer"
                    description="Add a company or individual to your workspace."
                />

                <form
                    className="space-y-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        post(customers.store.url());
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
                            Create customer
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link href={customers.index()}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

CustomersCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Customers', href: customers.index() },
        { title: 'New', href: customers.create() },
    ],
};
