import { Form, Head, Link, router } from '@inertiajs/react';
import { ArrowRightLeft, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import customers from '@/routes/customers';
import leads, { convert } from '@/routes/leads';

type Lead = {
    id: number;
    first_name: string;
    last_name: string;
    name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    source: string | null;
    status: string;
    estimated_value: string | null;
    currency: string | null;
    notes: string | null;
    converted_at: string | null;
    converted_customer: { id: number; name: string } | null;
    assigned_to: { id: number; name: string; email: string } | null;
    created_by: { id: number; name: string } | null;
};

type Props = {
    lead: Lead;
    can: {
        update: boolean;
        delete: boolean;
        convert: boolean;
    };
};

function formatMoney(
    value: string | null,
    currency: string | null,
): string {
    if (!value) {
        return '—';
    }

    const amount = Number(value);

    if (Number.isNaN(amount)) {
        return value;
    }

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'EUR',
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function LeadsShow({ lead, can }: Props) {
    const [createDeal, setCreateDeal] = useState(true);

    function deleteLead() {
        if (!confirm(`Delete lead "${lead.name}"?`)) {
            return;
        }

        router.delete(leads.destroy.url(lead.id));
    }

    return (
        <>
            <Head title={lead.name} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Heading title={lead.name} />
                            <Badge variant="secondary" className="capitalize">
                                {lead.status}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {lead.company_name ?? 'No company'}
                            {lead.source ? ` · ${lead.source}` : ''}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {can.convert && (
                            <Form
                                {...convert.form(lead.id)}
                                options={{ preserveScroll: true }}
                            >
                                {({ processing }) => (
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <input
                                            type="hidden"
                                            name="create_deal"
                                            value={createDeal ? '1' : '0'}
                                        />
                                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Checkbox
                                                checked={createDeal}
                                                onCheckedChange={(checked) =>
                                                    setCreateDeal(
                                                        checked === true,
                                                    )
                                                }
                                            />
                                            Create deal
                                        </label>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing && <Spinner />}
                                            <ArrowRightLeft />
                                            Convert to customer
                                        </Button>
                                    </div>
                                )}
                            </Form>
                        )}
                        {can.update && (
                            <Button variant="outline" asChild>
                                <Link href={leads.edit(lead.id)}>
                                    <Pencil />
                                    Edit
                                </Link>
                            </Button>
                        )}
                        {can.delete && (
                            <Button
                                variant="destructive"
                                onClick={deleteLead}
                            >
                                <Trash2 />
                                Delete
                            </Button>
                        )}
                    </div>
                </div>

                {lead.converted_customer && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
                        Converted to customer{' '}
                        <Link
                            href={customers.show(lead.converted_customer.id)}
                            className="font-medium underline"
                        >
                            {lead.converted_customer.name}
                        </Link>
                        .
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-4 rounded-xl border p-5 lg:col-span-2">
                        <h3 className="font-medium">Details</h3>
                        <dl className="grid gap-4 sm:grid-cols-2">
                            <Detail label="Email" value={lead.email} />
                            <Detail label="Phone" value={lead.phone} />
                            <Detail label="Source" value={lead.source} />
                            <Detail
                                label="Estimated value"
                                value={formatMoney(
                                    lead.estimated_value,
                                    lead.currency,
                                )}
                            />
                            <Detail
                                label="Assigned to"
                                value={lead.assigned_to?.name}
                            />
                            <Detail
                                label="Created by"
                                value={lead.created_by?.name}
                            />
                            <Detail
                                label="Notes"
                                value={lead.notes}
                                className="sm:col-span-2"
                            />
                        </dl>
                    </div>

                    <div className="space-y-4 rounded-xl border p-5">
                        <h3 className="font-medium">Conversion</h3>
                        <p className="text-sm text-muted-foreground">
                            Converting creates a customer and a primary contact.
                            Optionally create a deal in the default sales
                            pipeline.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

function Detail({
    label,
    value,
    className,
}: {
    label: string;
    value?: string | null;
    className?: string;
}) {
    return (
        <div className={className}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium break-words">
                {value || '—'}
            </dd>
        </div>
    );
}

LeadsShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Leads', href: leads.index() },
        { title: 'Lead', href: '#' },
    ],
};
