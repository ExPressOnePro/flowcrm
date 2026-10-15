import { Head, Link, router } from '@inertiajs/react';
import { FileText, Plus } from 'lucide-react';
import { useState } from 'react';

import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { dashboard } from '@/routes';
import invoices from '@/routes/invoices';

type InvoiceRow = {
    id: number;
    number: string;
    status: string;
    total: string;
    balance: string;
    currency: string;
    issue_date: string | null;
    due_date: string | null;
    customer: { id: number; name: string } | null;
};

type Props = {
    invoices: {
        data: InvoiceRow[];
        links: { url: string | null; label: string; active: boolean }[];
        total: number;
    };
    filters: { search: string; status: string };
    statuses: string[];
    can: { create: boolean };
};

function money(value: string, currency: string) {
    const amount = Number(value);

    if (Number.isNaN(amount)) {
        return value;
    }

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function InvoicesIndex({
    invoices: paginated,
    filters,
    statuses,
    can,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);

    function applyFilters(next?: { search?: string; status?: string }) {
        router.get(
            invoices.index.url(),
            {
                search: next?.search ?? search,
                status: next?.status ?? status,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Invoices" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title="Invoices"
                        description="Issue invoices and track payments."
                    />
                    {can.create && (
                        <Button asChild>
                            <Link href={invoices.create()}>
                                <Plus />
                                New invoice
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="flex flex-col gap-3 md:flex-row">
                    <Input
                        value={search}
                        placeholder="Search invoices..."
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
                        icon={FileText}
                        title="No invoices"
                        description="Create an invoice for a customer to start collecting payments."
                        action={
                            can.create ? (
                                <Button asChild>
                                    <Link href={invoices.create()}>
                                        <Plus />
                                        New invoice
                                    </Link>
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="overflow-hidden rounded-xl border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-left text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">
                                        Number
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Customer
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Status
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium sm:table-cell">
                                        Total
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium md:table-cell">
                                        Balance
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.data.map((invoice) => (
                                    <tr
                                        key={invoice.id}
                                        className="border-t hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3">
                                            <Link
                                                href={invoices.show(invoice.id)}
                                                className="font-medium hover:underline"
                                            >
                                                {invoice.number}
                                            </Link>
                                            <div className="text-xs text-muted-foreground">
                                                {invoice.due_date
                                                    ? `Due ${invoice.due_date}`
                                                    : '—'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {invoice.customer?.name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="secondary"
                                                className="capitalize"
                                            >
                                                {invoice.status}
                                            </Badge>
                                        </td>
                                        <td className="hidden px-4 py-3 sm:table-cell">
                                            {money(
                                                invoice.total,
                                                invoice.currency,
                                            )}
                                        </td>
                                        <td className="hidden px-4 py-3 md:table-cell">
                                            {money(
                                                invoice.balance,
                                                invoice.currency,
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                        {paginated.total} invoices
                    </p>
                    <Pagination links={paginated.links} />
                </div>
            </div>
        </>
    );
}

InvoicesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Invoices', href: invoices.index() },
    ],
};
