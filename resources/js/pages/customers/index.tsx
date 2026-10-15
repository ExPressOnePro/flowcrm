import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search, Users } from 'lucide-react';
import { useState } from 'react';

import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { useT } from '@/lib/i18n';
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

const selectClass =
    'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs';

export default function CustomersIndex({
    customers: paginated,
    filters,
    statuses,
    types,
}: Props) {
    const { t, label } = useT();
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
            <Head title={t('Customers')} />

            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        title={t('Customers')}
                        description={t('Companies and people you work with.')}
                    />
                    <Button
                        asChild
                        className="shrink-0 max-sm:w-11 max-sm:px-0"
                    >
                        <Link href={customers.create()}>
                            <Plus />
                            <span className="max-sm:sr-only">
                                {t('New customer')}
                            </span>
                        </Link>
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 md:flex md:flex-row">
                    <div className="relative col-span-2 md:w-72">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            enterKeyHint="search"
                            value={search}
                            aria-label={t('Search customers')}
                            placeholder={t('Search customers')}
                            className="pl-9"
                            onChange={(event) => setSearch(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.currentTarget.blur();
                                    applyFilters();
                                }
                            }}
                        />
                    </div>
                    <select
                        aria-label={t('Status')}
                        className={selectClass}
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            applyFilters({ status: event.target.value });
                        }}
                    >
                        <option value="">{t('All statuses')}</option>
                        {statuses.map((value) => (
                            <option key={value} value={value}>
                                {label('customer_status', value)}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label={t('Type')}
                        className={selectClass}
                        value={type}
                        onChange={(event) => {
                            setType(event.target.value);
                            applyFilters({ type: event.target.value });
                        }}
                    >
                        <option value="">{t('All types')}</option>
                        {types.map((value) => (
                            <option key={value} value={value}>
                                {label('customer_type', value)}
                            </option>
                        ))}
                    </select>
                </div>

                {paginated.data.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title={t('No customers yet')}
                        action={
                            <Button asChild>
                                <Link href={customers.create()}>
                                    <Plus />
                                    {t('New customer')}
                                </Link>
                            </Button>
                        }
                    />
                ) : (
                    <>
                        <ul className="grid grid-cols-1 gap-3 md:hidden">
                            {paginated.data.map((customer) => (
                                <li key={customer.id}>
                                    <Link
                                        href={customers.show(customer.id)}
                                        className="block rounded-xl border p-4 active:bg-muted/50"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="font-medium break-words">
                                                    {customer.name}
                                                </div>
                                                {customer.company_name &&
                                                    customer.company_name !==
                                                        customer.name && (
                                                        <div className="truncate text-sm text-muted-foreground">
                                                            {
                                                                customer.company_name
                                                            }
                                                        </div>
                                                    )}
                                            </div>
                                            <Badge variant="secondary">
                                                {label(
                                                    'customer_status',
                                                    customer.status,
                                                )}
                                            </Badge>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span>
                                                {label(
                                                    'customer_type',
                                                    customer.type,
                                                )}
                                            </span>
                                            {customer.phone && (
                                                <span>{customer.phone}</span>
                                            )}
                                            {customer.email && (
                                                <span className="break-all">
                                                    {customer.email}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <div className="hidden overflow-x-auto rounded-xl border md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            {t('Customer')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {t('Email')}
                                        </th>
                                        <th className="hidden px-4 py-3 font-medium lg:table-cell">
                                            {t('Type')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {t('Status')}
                                        </th>
                                        <th className="hidden px-4 py-3 font-medium lg:table-cell">
                                            {t('Contacts')}
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
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {customer.email ?? '—'}
                                            </td>
                                            <td className="hidden px-4 py-3 lg:table-cell">
                                                {label(
                                                    'customer_type',
                                                    customer.type,
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="secondary">
                                                    {label(
                                                        'customer_status',
                                                        customer.status,
                                                    )}
                                                </Badge>
                                            </td>
                                            <td className="hidden px-4 py-3 lg:table-cell">
                                                {customer.contacts_count}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <p className="text-sm text-muted-foreground">
                        {t('Total')}: {paginated.total}
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
