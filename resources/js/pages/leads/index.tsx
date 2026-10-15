import { Head, Link, router } from '@inertiajs/react';
import { Plus, Target } from 'lucide-react';
import { useState } from 'react';

import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { dashboard } from '@/routes';
import leads from '@/routes/leads';

type LeadRow = {
    id: number;
    name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    estimated_value: string | null;
    currency: string | null;
    source: string | null;
    assigned_to: { id: number; name: string } | null;
};

type PaginatedLeads = {
    data: LeadRow[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
};

type Props = {
    leads: PaginatedLeads;
    filters: {
        search: string;
        status: string;
    };
    statuses: string[];
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

export default function LeadsIndex({
    leads: paginated,
    filters,
    statuses,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);

    function applyFilters(next?: { search?: string; status?: string }) {
        router.get(
            leads.index.url(),
            {
                search: next?.search ?? search,
                status: next?.status ?? status,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    return (
        <>
            <Head title="Leads" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title="Leads"
                        description="Track inbound opportunities before they become customers."
                    />
                    <Button asChild>
                        <Link href={leads.create()}>
                            <Plus />
                            New lead
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-col gap-3 md:flex-row">
                    <Input
                        value={search}
                        placeholder="Search leads..."
                        className="md:max-w-xs"
                        onChange={(event) => setSearch(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                applyFilters();
                            }
                        }}
                    />
                    <select
                        className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            applyFilters({ status: event.target.value });
                        }}
                    >
                        <option value="">All statuses</option>
                        {statuses.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                    <Button variant="secondary" onClick={() => applyFilters()}>
                        Search
                    </Button>
                </div>

                {paginated.data.length === 0 ? (
                    <EmptyState
                        icon={Target}
                        title="No leads yet"
                        description="Capture inbound interest and convert qualified leads into customers."
                        action={
                            <Button asChild>
                                <Link href={leads.create()}>
                                    <Plus />
                                    New lead
                                </Link>
                            </Button>
                        }
                    />
                ) : (
                    <div className="overflow-hidden rounded-xl border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-left text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">
                                        Lead
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium md:table-cell">
                                        Company
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Status
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium sm:table-cell">
                                        Value
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium lg:table-cell">
                                        Owner
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.data.map((lead) => (
                                    <tr
                                        key={lead.id}
                                        className="border-t hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3">
                                            <Link
                                                href={leads.show(lead.id)}
                                                className="font-medium hover:underline"
                                            >
                                                {lead.name}
                                            </Link>
                                            <div className="text-xs text-muted-foreground">
                                                {lead.email ?? lead.phone ?? '—'}
                                            </div>
                                        </td>
                                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                                            {lead.company_name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="secondary"
                                                className="capitalize"
                                            >
                                                {lead.status}
                                            </Badge>
                                        </td>
                                        <td className="hidden px-4 py-3 sm:table-cell">
                                            {formatMoney(
                                                lead.estimated_value,
                                                lead.currency,
                                            )}
                                        </td>
                                        <td className="hidden px-4 py-3 lg:table-cell">
                                            {lead.assigned_to?.name ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                        {paginated.total} leads
                    </p>
                    <Pagination links={paginated.links} />
                </div>
            </div>
        </>
    );
}

LeadsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Leads', href: leads.index() },
    ],
};
