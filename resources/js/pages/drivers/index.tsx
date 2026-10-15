import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronRight,
    FileWarning,
    Search,
    Truck,
    UserPlus,
    Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DriverFormSheet } from '@/components/drivers/driver-form-sheet';
import Heading from '@/components/heading';
import { selectClass } from '@/components/sheet-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import drivers from '@/routes/drivers';
import type { DriverFormOptions, DriverListItem } from '@/types/drivers';
import type { Paginated } from '@/types/fleet';

type Filters = { status: string; search: string; branch: string };

type Props = DriverFormOptions & {
    drivers: Paginated<DriverListItem>;
    filters: Filters;
    can: { create: boolean };
};

const STATUSES = ['active', 'inactive', ''];

export default function DriversIndex(props: Props) {
    const { filters, branches, can } = props;
    const { t, label } = useT();
    const [search, setSearch] = useState(filters.search);
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(searchTimer.current), []);

    function visit(next: Filters) {
        router.get(
            drivers.index.url(),
            Object.fromEntries(
                Object.entries(next).filter(
                    ([key, value]) => value !== '' || key === 'status',
                ),
            ),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    }

    const filtered = Boolean(filters.search || filters.branch);

    return (
        <>
            <Head title={t('Drivers')} />

            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
                <div className="flex items-start justify-between gap-3">
                    <Heading
                        title={t('Drivers')}
                        description={t(
                            'Driver directory: licences, categories and their documents.',
                        )}
                    />
                    {can.create && (
                        <Button
                            className="shrink-0 max-sm:w-11 max-sm:px-0"
                            onClick={() => setCreating(true)}
                            aria-label={t('Add driver')}
                        >
                            <UserPlus />
                            <span className="max-sm:sr-only">
                                {t('Add driver')}
                            </span>
                        </Button>
                    )}
                </div>

                <div
                    role="group"
                    aria-label={t('Status')}
                    className="flex flex-wrap gap-2"
                >
                    {STATUSES.map((status) => (
                        <button
                            key={status || 'all'}
                            type="button"
                            aria-pressed={filters.status === status}
                            onClick={() =>
                                visit({ ...filters, search, status })
                            }
                            className={cn(
                                'inline-flex min-h-9 items-center rounded-full border px-3 text-sm whitespace-nowrap max-md:min-h-11',
                                filters.status === status
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'bg-background hover:bg-muted',
                            )}
                        >
                            {status === ''
                                ? t('All')
                                : label('driver_status_filter', status)}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative min-w-0 flex-1 sm:max-w-sm">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            enterKeyHint="search"
                            autoCorrect="off"
                            spellCheck={false}
                            value={search}
                            aria-label={t(
                                'Search by name, personnel or licence number',
                            )}
                            placeholder={t('Name, personnel or licence no.')}
                            className="pl-9"
                            onChange={(event) => {
                                const value = event.target.value;
                                setSearch(value);
                                clearTimeout(searchTimer.current);
                                searchTimer.current = setTimeout(
                                    () =>
                                        visit({
                                            ...filters,
                                            search: value.trim(),
                                        }),
                                    400,
                                );
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    clearTimeout(searchTimer.current);
                                    event.currentTarget.blur();
                                    visit({
                                        ...filters,
                                        search: search.trim(),
                                    });
                                }
                            }}
                        />
                    </div>
                    {branches.length > 1 && (
                        <select
                            aria-label={t('Branch')}
                            className={cn(selectClass, 'sm:w-56')}
                            value={filters.branch}
                            onChange={(event) =>
                                visit({
                                    ...filters,
                                    search,
                                    branch: event.target.value,
                                })
                            }
                        >
                            <option value="">{t('All branches')}</option>
                            {branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div
                    className={cn(
                        'transition-opacity',
                        loading && 'pointer-events-none opacity-60',
                    )}
                    aria-busy={loading}
                >
                    {props.drivers.data.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title={
                                filtered
                                    ? t('Nothing found')
                                    : t('No drivers yet')
                            }
                            description={
                                filtered
                                    ? t('Try changing the filters.')
                                    : t(
                                          'Add drivers to assign them to waybills and track their licences.',
                                      )
                            }
                            action={
                                !filtered && can.create ? (
                                    <Button onClick={() => setCreating(true)}>
                                        <UserPlus />
                                        {t('Add driver')}
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <>
                            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {props.drivers.data.map((driver) => (
                                    <li key={driver.id}>
                                        <DriverCard driver={driver} />
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-4 flex flex-col items-center gap-2">
                                <p className="text-sm text-muted-foreground">
                                    {t('Found: :count', {
                                        count: props.drivers.total,
                                    })}
                                </p>
                                <Pagination links={props.drivers.links} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {creating && (
                <DriverFormSheet
                    driver={null}
                    options={props}
                    onClose={() => setCreating(false)}
                />
            )}
        </>
    );
}

function DriverCard({ driver }: { driver: DriverListItem }) {
    const { t, label } = useT();

    return (
        <Link
            href={drivers.show.url(driver.id)}
            className="flex h-full items-start gap-3 rounded-xl border bg-card p-4 hover:bg-muted/40"
        >
            <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 font-medium break-words">
                        {driver.full_name}
                    </span>
                    {driver.status === 'inactive' && (
                        <Badge variant="secondary" className="font-normal">
                            {label('driver_status', driver.status)}
                        </Badge>
                    )}
                    {driver.on_trip && (
                        <Badge
                            variant="outline"
                            className="border-sky-200 bg-sky-50 font-normal text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300"
                        >
                            <Truck />
                            {t('On a trip')}
                        </Badge>
                    )}
                </div>
                <div className="flex flex-wrap gap-1">
                    {driver.license_categories.length > 0 ? (
                        driver.license_categories.map((category) => (
                            <span
                                key={category}
                                className="rounded border px-1.5 font-mono text-xs"
                            >
                                {category}
                            </span>
                        ))
                    ) : (
                        <span className="text-xs text-muted-foreground">
                            {t('Categories not set')}
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {driver.personnel_number && (
                        <span>
                            {t('Pers. no. :number', {
                                number: driver.personnel_number,
                            })}
                        </span>
                    )}
                    {driver.branch && <span>{driver.branch}</span>}
                    {driver.user && <span>{driver.user}</span>}
                </div>
                {(driver.expired_documents ?? 0) > 0 && (
                    <p className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300">
                        <FileWarning className="size-3.5" />
                        {t('Expired documents: :count', {
                            count: driver.expired_documents ?? 0,
                        })}
                    </p>
                )}
            </div>
            <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
        </Link>
    );
}

DriversIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Drivers', href: drivers.index() },
    ],
};
