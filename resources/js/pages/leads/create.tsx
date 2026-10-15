import { Head, Link, useForm } from '@inertiajs/react';

import Heading from '@/components/heading';
import { LeadForm, type LeadFormData } from '@/components/leads/lead-form';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import leads from '@/routes/leads';

type Props = {
    assignees: { id: number; name: string }[];
    statuses: string[];
};

export default function LeadsCreate({ assignees, statuses }: Props) {
    const { data, setData, post, processing, errors } = useForm<LeadFormData>({
        first_name: '',
        last_name: '',
        company_name: '',
        email: '',
        phone: '',
        source: '',
        status: 'new',
        estimated_value: '',
        currency: 'EUR',
        assigned_to: '',
        notes: '',
    });

    return (
        <>
            <Head title="New lead" />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="New lead"
                    description="Capture a new opportunity for your sales pipeline."
                />

                <form
                    className="space-y-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        post(leads.store.url());
                    }}
                >
                    <LeadForm
                        data={data}
                        setData={setData}
                        errors={errors}
                        statuses={statuses}
                        assignees={assignees}
                    />

                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Create lead
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link href={leads.index()}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

LeadsCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Leads', href: leads.index() },
        { title: 'New', href: leads.create() },
    ],
};
