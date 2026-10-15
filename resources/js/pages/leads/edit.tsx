import { Head, Link, useForm } from '@inertiajs/react';

import Heading from '@/components/heading';
import { LeadForm, type LeadFormData } from '@/components/leads/lead-form';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import leads from '@/routes/leads';

type Props = {
    lead: {
        id: number;
        first_name: string;
        last_name: string;
        company_name: string | null;
        email: string | null;
        phone: string | null;
        source: string | null;
        status: string;
        estimated_value: string | null;
        currency: string | null;
        assigned_to: number | null;
        notes: string | null;
    };
    assignees: { id: number; name: string }[];
    statuses: string[];
};

export default function LeadsEdit({ lead, assignees, statuses }: Props) {
    const { data, setData, put, processing, errors } = useForm<LeadFormData>({
        first_name: lead.first_name,
        last_name: lead.last_name,
        company_name: lead.company_name ?? '',
        email: lead.email ?? '',
        phone: lead.phone ?? '',
        source: lead.source ?? '',
        status: lead.status,
        estimated_value: lead.estimated_value ?? '',
        currency: lead.currency ?? 'EUR',
        assigned_to: lead.assigned_to ? String(lead.assigned_to) : '',
        notes: lead.notes ?? '',
    });

    return (
        <>
            <Head title={`Edit ${lead.first_name} ${lead.last_name}`} />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
                <Heading
                    title={`Edit ${lead.first_name} ${lead.last_name}`}
                    description="Update lead details and qualification status."
                />

                <form
                    className="space-y-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        put(leads.update.url(lead.id));
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
                            Save changes
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link href={leads.show(lead.id)}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

LeadsEdit.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Leads', href: leads.index() },
        { title: 'Edit', href: '#' },
    ],
};
