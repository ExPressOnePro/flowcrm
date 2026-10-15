import { Head, Link, router } from '@inertiajs/react';
import { Plus, Users } from 'lucide-react';
import { useState } from 'react';

import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { dashboard } from '@/routes';
import customers from '@/routes/customers';

type CustomerRow = {
    id: number;
    name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    type: string;
    status: string;
    contacts_count: number;
    assigned_to: { id: number; name: string } | null;
};

type PaginatedCustomers = {
    data: CustomerRow[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
};

type Props = {
    customers: PaginatedCustomers;
    filters: {
        search: string;
        status: string;
        type: string;
    };
    statuses: string[];
    types: string[];
};

export default function CustomersIndex({
    customers: paginated,
    filters,
    statuses,
    types,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [type, setType] = useState(filters.type);

    function applyFilters(next?: {
        search?: string;
        status?: string;
        type?: string;
    }) {
        router.get(
            customers.index.url(),
            {
                search: next?.search ?? search,
                status: next?.status ?? status,
                type: next?.type ?? type,
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
            <Head title="Customers" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title="Customers"
                        description="Manage companies and people in your CRM."
                    />
                    <Button asChild>
                        <Link href={customers.create()}>
                            <Plus />
                            New customer
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-col gap-3 md:flex-row">
                    <Input
                        value={search}
                        placeholder="Search customers..."
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
                    <select
                        className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                        value={type}
                        onChange={(event) => {
                            setType(event.target.value);
                            applyFilters({ type: event.target.value });
                        }}
                    >
                        <option value="">All types</option>
                        {types.map((value) => (
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
                        icon={Users}
                        title="No customers yet"
                        description="Create your first customer to start building the pipeline."
                        action={
                            <Button asChild>
                                <Link href={customers.create()}>
                                    <Plus />
                                    New customer
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
                                        Customer
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium md:table-cell">
                                        Email
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium lg:table-cell">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Status
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium sm:table-cell">
                                        Contacts
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.data.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        className="border-t hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3">
                                            <Link
                                                href={customers.show(
                                                    customer.id,
                                                )}
                                                className="font-medium hover:underline"
                                            >
                                                {customer.name}
                                            </Link>
                                            {customer.company_name &&
                                                customer.company_name !==
                                                    customer.name && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {
                                                            customer.company_name
                                                        }
                                                    </div>
                                                )}
                                        </td>
                                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                                            {customer.email ?? '—'}
                                        </td>
                                        <td className="hidden px-4 py-3 capitalize lg:table-cell">
                                            {customer.type}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="secondary" className="capitalize">
                                                {customer.status}
                                            </Badge>
                                        </td>
                                        <td className="hidden px-4 py-3 sm:table-cell">
                                            {customer.contacts_count}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                        {paginated.total} customers
                    </p>
                    <Pagination links={paginated.links} />
                </div>
            </div>
        </>
    );
}

CustomersIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Customers', href: customers.index() },
    ],
};
