import { Head, Link, router } from '@inertiajs/react';
import {
    ClipboardList,
    Plus,
    Search,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Heading from '@/components/heading';
import { ResponsiveSheet } from '@/components/responsive-sheet';
import { Field, selectClass } from '@/components/sheet-form';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
    useWaybillTimes,
    WaybillCard,
} from '@/components/waybills/waybill-card';
import { WaybillStatusBadge } from '@/components/waybills/waybill-status-badge';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import waybillRoutes from '@/routes/waybills';
import type { Option, Paginated } from '@/types/fleet';
import type { WaybillListItem } from '@/types/waybills';

type Filters = {
    status: string;
    search: string;
    branch: string;
    from: string;
    to: string;
};

type Props = {
    waybills: Paginated<WaybillListItem>;
    filters: Filters;
    counts: { issued: number; overdue: number; draft: number };
    branches: Option[];
    can: { create: boolean };
};

const STATUSES = ['', 'issued', 'overdue', 'draft', 'closed', 'cancelled'];

export default function WaybillsIndex(props: Props) {
    const { waybills, filters, counts, branches, can } = props;
    const { t, label } = useT();
    const format = useFormat();
    const times = useWaybillTimes();
    const [search, setSearch] = useState(filters.search);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [draft, setDraft] = useState(filters);
    const [loading, setLoading] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(searchTimer.current), []);

    function visit(next: Filters) {
        router.get(
            waybillRoutes.index.url(),
            Object.fromEntries(
                Object.entries(next).filter(([, value]) => value !== ''),
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

    function apply(changes: Partial<Filters>) {
        visit({ ...filters, search, ...changes });
    }

    const count = (status: string) =>
        status === 'issued' || status === 'overdue' || status === 'draft'
            ? counts[status]
            : null;
    const extraFilters = [filters.branch, filters.from || filters.to].filter(
        Boolean,
    ).length;
    const filtered = Boolean(
        filters.search ||
        filters.branch ||
        filters.from ||
        filters.to ||
        filters.status,
    );

    const selects = (
        value: Filters,
        onChange: (changes: Partial<Filters>) => void,
    ) => (
        <>
            {branches.length > 1 && (
                <Field id="filter-branch" label={t('Branch')}>
                    <select
                        id="filter-branch"
                        className={selectClass}
                        value={value.branch}
                        onChange={(event) =>
                            onChange({ branch: event.target.value })
                        }
                    >
                        <option value="">{t('All branches')}</option>
                        {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                </Field>
            )}
            <Field id="filter-from" label={t('Departure from')}>
                <Input
                    id="filter-from"
                    type="date"
                    value={value.from}
                    max={value.to || undefined}
                    onChange={(event) => onChange({ from: event.target.value })}
                />
            </Field>
            <Field id="filter-to" label={t('Departure to')}>
                <Input
                    id="filter-to"
                    type="date"
                    value={value.to}
                    min={value.from || undefined}
                    onChange={(event) => onChange({ to: event.target.value })}
                />
            </Field>
        </>
    );

    return (
        <>
            <Head title={t('Waybills')} />

            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
                <div className="flex items-start justify-between gap-3">
                    <Heading
                        title={t('Waybills')}
                        description={t(
                            'Trips: vehicle, trailer, driver, departure and return mileage.',
                        )}
                    />
                    {can.create && (
                        <Button
                            asChild
                            className="shrink-0 max-sm:w-11 max-sm:px-0"
                        >
                            <Link
                                href={waybillRoutes.create.url()}
                                aria-label={t('New waybill')}
                            >
                                <Plus />
                                <span className="max-sm:sr-only">
                                    {t('New waybill')}
                                </span>
                            </Link>
                        </Button>
                    )}
                </div>

                <div
                    role="group"
                    aria-label={t('Status')}
                    className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
                >
                    {STATUSES.map((status) => {
                        const value = count(status);

                        return (
                            <button
                                key={status || 'all'}
                                type="button"
                                aria-pressed={filters.status === status}
                                onClick={() => apply({ status })}
                                className={cn(
                                    'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap max-md:min-h-11',
                                    filters.status === status
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'bg-background hover:bg-muted',
                                )}
                            >
                                {status === ''
                                    ? t('All')
                                    : label('waybill_filter', status)}
                                {value !== null && value > 0 && (
                                    <span
                                        className={cn(
                                            'rounded-full px-1.5 text-xs tabular-nums',
                                            filters.status === status
                                                ? 'bg-primary-foreground/20'
                                                : status === 'overdue'
                                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                                  : 'bg-muted text-foreground',
                                        )}
                                    >
                                        {value}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1 lg:max-w-sm">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            enterKeyHint="search"
                            autoCorrect="off"
                            spellCheck={false}
                            value={search}
                            aria-label={t(
                                'Search by number, plate, driver or route',
                            )}
                            placeholder={t('Number, plate, driver, route')}
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
                    <Button
                        variant="outline"
                        className="lg:hidden"
                        onClick={() => {
                            setDraft({ ...filters, search });
                            setSheetOpen(true);
                        }}
                    >
                        <SlidersHorizontal />
                        {t('Filters')}
                        {extraFilters > 0 && (
                            <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
                                {extraFilters}
                            </span>
                        )}
                    </Button>
                    <div className="hidden flex-1 items-end gap-2 lg:flex [&>div]:max-w-56 [&>div]:min-w-40 [&>div]:flex-1">
                        {selects(filters, apply)}
                    </div>
                </div>

                {(filters.branch || filters.from || filters.to) && (
                    <div className="flex flex-wrap items-center gap-2 lg:hidden">
                        {filters.branch && (
                            <button
                                type="button"
                                onClick={() => apply({ branch: '' })}
                                className="inline-flex min-h-11 items-center gap-1 rounded-full border bg-muted/40 py-1 pr-2 pl-3 text-sm hover:bg-muted"
                                aria-label={`${t('Remove filter')}: ${t('Branch')}`}
                            >
                                {
                                    branches.find(
                                        (branch) =>
                                            String(branch.id) ===
                                            filters.branch,
                                    )?.name
                                }
                                <X className="size-4 text-muted-foreground" />
                            </button>
                        )}
                        {(filters.from || filters.to) && (
                            <button
                                type="button"
                                onClick={() => apply({ from: '', to: '' })}
                                className="inline-flex min-h-11 items-center gap-1 rounded-full border bg-muted/40 py-1 pr-2 pl-3 text-sm hover:bg-muted"
                                aria-label={`${t('Remove filter')}: ${t('Dates')}`}
                            >
                                {[
                                    filters.from && format.date(filters.from),
                                    filters.to && format.date(filters.to),
                                ]
                                    .map((value) => value || '…')
                                    .join(' – ')}
                                <X className="size-4 text-muted-foreground" />
                            </button>
                        )}
                    </div>
                )}

                <div
                    className={cn(
                        'transition-opacity',
                        loading && 'pointer-events-none opacity-60',
                    )}
                    aria-busy={loading}
                >
                    {waybills.data.length === 0 ? (
                        <EmptyState
                            icon={ClipboardList}
                            title={
                                filtered
                                    ? t('Nothing found')
                                    : t('No waybills yet')
                            }
                            description={
                                filtered
                                    ? t('Try changing the filters.')
                                    : t(
                                          'Create a waybill for a trip: choose the vehicle, trailer and driver.',
                                      )
                            }
                            action={
                                filtered ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSearch('');
                                            visit({
                                                status: '',
                                                search: '',
                                                branch: '',
                                                from: '',
                                                to: '',
                                            });
                                        }}
                                    >
                                        {t('Reset all')}
                                    </Button>
                                ) : can.create ? (
                                    <Button asChild>
                                        <Link href={waybillRoutes.create.url()}>
                                            <Plus />
                                            {t('New waybill')}
                                        </Link>
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <>
                            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
                                {waybills.data.map((waybill) => (
                                    <li key={waybill.id}>
                                        <WaybillCard waybill={waybill} />
                                    </li>
                                ))}
                            </ul>

                            <div className="hidden overflow-hidden rounded-xl border lg:block">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/40 text-left text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-2.5 font-medium">
                                                {t('Number')}
                                            </th>
                                            <th className="px-4 py-2.5 font-medium">
                                                {t('Vehicle')}
                                            </th>
                                            <th className="px-4 py-2.5 font-medium">
                                                {t('Driver')}
                                            </th>
                                            <th className="px-4 py-2.5 font-medium">
                                                {t('Route')}
                                            </th>
                                            <th className="px-4 py-2.5 font-medium">
                                                {t('Time')}
                                            </th>
                                            <th className="px-4 py-2.5 text-right font-medium">
                                                {t('Distance')}
                                            </th>
                                            <th className="px-4 py-2.5 font-medium">
                                                {t('Status')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {waybills.data.map((waybill) => (
                                            <tr
                                                key={waybill.id}
                                                className="border-t hover:bg-muted/30"
                                            >
                                                <td className="px-4 py-2.5">
                                                    <Link
                                                        href={waybillRoutes.show.url(
                                                            waybill.id,
                                                        )}
                                                        className="font-mono font-medium whitespace-nowrap hover:underline"
                                                    >
                                                        {waybill.number ??
                                                            t('No number')}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-2.5 font-mono whitespace-nowrap">
                                                    {
                                                        waybill.vehicle
                                                            .plate_number
                                                    }
                                                    {waybill.trailer && (
                                                        <div className="text-xs text-muted-foreground">
                                                            +{' '}
                                                            {
                                                                waybill.trailer
                                                                    .plate_number
                                                            }
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {waybill.driver.name}
                                                </td>
                                                <td className="max-w-64 px-4 py-2.5">
                                                    <span className="line-clamp-2">
                                                        {waybill.route}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-xs tabular-nums">
                                                    {times(waybill)}
                                                </td>
                                                <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">
                                                    {waybill.distance_km !==
                                                    null
                                                        ? format.km(
                                                              waybill.distance_km,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <WaybillStatusBadge
                                                        status={waybill.status}
                                                        overdue={
                                                            waybill.overdue
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 flex flex-col items-center gap-2">
                                <p className="text-sm text-muted-foreground">
                                    {t('Found: :count', {
                                        count: waybills.total,
                                    })}
                                </p>
                                <Pagination links={waybills.links} />
                            </div>
                        </>
                    )}
                </div>
            </div>

            <ResponsiveSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                title={t('Filters')}
                footer={
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            onClick={() =>
                                setDraft({
                                    ...draft,
                                    branch: '',
                                    from: '',
                                    to: '',
                                })
                            }
                        >
                            {t('Reset all')}
                        </Button>
                        <Button
                            onClick={() => {
                                setSheetOpen(false);
                                visit({ ...draft, search });
                            }}
                        >
                            {t('Show')}
                        </Button>
                    </div>
                }
            >
                <div className="grid gap-4">
                    {selects(draft, (changes) =>
                        setDraft({ ...draft, ...changes }),
                    )}
                </div>
            </ResponsiveSheet>
        </>
    );
}

WaybillsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Waybills', href: waybillRoutes.index() },
    ],
};
