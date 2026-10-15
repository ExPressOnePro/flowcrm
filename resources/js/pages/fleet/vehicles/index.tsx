import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Link2,
    Plus,
    Search,
    SlidersHorizontal,
    Truck,
    UserRound,
    X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { VehicleStatusBadge } from '@/components/fleet/vehicle-status-badge';
import Heading from '@/components/heading';
import { ResponsiveSheet } from '@/components/responsive-sheet';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import vehicles from '@/routes/vehicles';
import type { Paginated, VehicleOptions, VehicleSummary } from '@/types/fleet';

type VehicleRow = VehicleSummary & {
    responsible: string | null;
    coupled_with: { id: number; plate_number: string }[];
};

type Filters = {
    search: string;
    status: string;
    type: string;
    branch: string;
    category: string;
    coupled: string;
    attention: string;
    archived: boolean;
    sort: string;
};

type Props = VehicleOptions & {
    vehicles: Paginated<VehicleRow>;
    filters: Filters;
    can: { create: boolean };
};

const EMPTY: Omit<Filters, 'search' | 'sort'> = {
    status: '',
    type: '',
    branch: '',
    category: '',
    coupled: '',
    attention: '',
    archived: false,
};

const SORTS = [
    'plate',
    '-plate',
    'odometer',
    '-odometer',
    'commissioned',
    '-commissioned',
];

const selectClass =
    'border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs';

function query(filters: Filters) {
    return {
        search: filters.search || undefined,
        status: filters.status || undefined,
        type: filters.type || undefined,
        branch: filters.branch || undefined,
        category: filters.category || undefined,
        coupled: filters.coupled || undefined,
        attention: filters.attention || undefined,
        archived: filters.archived ? 1 : undefined,
        sort: filters.sort !== 'plate' ? filters.sort : undefined,
    };
}

export default function VehiclesIndex(props: Props) {
    const { vehicles: paginated, filters, can } = props;
    const { t } = useT();
    const [search, setSearch] = useState(filters.search);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [draft, setDraft] = useState<Filters>(filters);
    const [loading, setLoading] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    function visit(next: Filters) {
        router.get(vehicles.index.url(), query(next), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    function apply(changes: Partial<Filters>) {
        visit({ ...filters, search, ...changes });
    }

    function onSearchChange(value: string) {
        setSearch(value);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(
            () => visit({ ...filters, search: value.trim() }),
            400,
        );
    }

    useEffect(() => () => clearTimeout(searchTimer.current), []);

    const chips = useActiveChips(props);
    const hasFilters = chips.length > 0 || filters.search !== '';

    return (
        <>
            <Head title={t('Fleet registry')} />

            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        title={t('Fleet registry')}
                        description={t(
                            'Tractors, trailers, trucks and their history.',
                        )}
                    />
                    {can.create && (
                        <Button
                            asChild
                            className="shrink-0 max-sm:w-11 max-sm:px-0"
                        >
                            <Link href={vehicles.create()}>
                                <Plus />
                                <span className="max-sm:sr-only">
                                    {t('New vehicle')}
                                </span>
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                        <div className="relative min-w-0 flex-1 lg:max-w-sm">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                enterKeyHint="search"
                                autoCapitalize="characters"
                                autoCorrect="off"
                                spellCheck={false}
                                value={search}
                                aria-label={t('Search by plate or VIN')}
                                placeholder={t('Plate or VIN')}
                                className="pl-9"
                                onChange={(event) =>
                                    onSearchChange(event.target.value)
                                }
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
                            className="md:hidden"
                            onClick={() => {
                                setDraft({ ...filters, search });
                                setSheetOpen(true);
                            }}
                        >
                            <SlidersHorizontal />
                            {t('Filters')}
                            {chips.length > 0 && (
                                <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
                                    {chips.length}
                                </span>
                            )}
                        </Button>
                        <div className="hidden flex-1 flex-wrap gap-2 md:flex">
                            <FilterFields
                                {...props}
                                value={filters}
                                onChange={(changes) => apply(changes)}
                                inline
                            />
                        </div>
                    </div>

                    {chips.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {chips.map((chip) => (
                                <button
                                    key={chip.key}
                                    type="button"
                                    onClick={() => apply(chip.clear)}
                                    className="inline-flex min-h-9 items-center gap-1 rounded-full border bg-muted/40 py-1 pr-2 pl-3 text-sm hover:bg-muted max-md:min-h-11"
                                    aria-label={`${t('Remove filter')}: ${chip.label}`}
                                >
                                    {chip.label}
                                    <X className="size-4 text-muted-foreground" />
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    apply({ ...EMPTY, search: '' });
                                }}
                                className="min-h-9 px-2 text-sm font-medium text-primary underline-offset-4 hover:underline max-md:min-h-11"
                            >
                                {t('Reset all')}
                            </button>
                        </div>
                    )}
                </div>

                <div
                    className={cn(
                        'transition-opacity',
                        loading && 'pointer-events-none opacity-60',
                    )}
                    aria-busy={loading}
                >
                    {paginated.data.length === 0 ? (
                        <EmptyState
                            icon={Truck}
                            title={
                                hasFilters || filters.archived
                                    ? t('No vehicles found')
                                    : t('No vehicles yet')
                            }
                            description={
                                hasFilters
                                    ? t('Try changing the filters.')
                                    : t(
                                          'Register your first tractor or trailer.',
                                      )
                            }
                            action={
                                hasFilters ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSearch('');
                                            apply({ ...EMPTY, search: '' });
                                        }}
                                    >
                                        {t('Reset all')}
                                    </Button>
                                ) : can.create ? (
                                    <Button asChild>
                                        <Link href={vehicles.create()}>
                                            <Plus />
                                            {t('New vehicle')}
                                        </Link>
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <>
                            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
                                {paginated.data.map((vehicle) => (
                                    <li key={vehicle.id}>
                                        <VehicleCard vehicle={vehicle} />
                                    </li>
                                ))}
                            </ul>
                            <VehicleTable
                                rows={paginated.data}
                                sort={filters.sort}
                                onSort={(sort) => apply({ sort })}
                            />
                        </>
                    )}
                </div>

                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <p className="text-sm text-muted-foreground">
                        {t('Total')}: {paginated.total}
                    </p>
                    <Pagination links={paginated.links} />
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
                                setDraft({ ...draft, ...EMPTY, sort: 'plate' })
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
                    <FilterFields
                        {...props}
                        value={draft}
                        onChange={(changes) =>
                            setDraft({ ...draft, ...changes })
                        }
                    />
                </div>
            </ResponsiveSheet>
        </>
    );
}

function FilterFields({
    value,
    onChange,
    inline = false,
    types,
    branches,
    statuses,
    categories,
}: Props & {
    value: Filters;
    onChange: (changes: Partial<Filters>) => void;
    inline?: boolean;
}) {
    const { t, label } = useT();

    const field = (id: string, title: string, control: ReactNode) =>
        inline ? (
            <div key={id} className="w-40 lg:w-44">
                {control}
            </div>
        ) : (
            <div key={id} className="grid gap-2">
                <Label htmlFor={id}>{title}</Label>
                {control}
            </div>
        );

    const select = (
        id: string,
        title: string,
        current: string,
        key: keyof Filters,
        options: ReactNode,
    ) =>
        field(
            id,
            title,
            <select
                id={inline ? undefined : id}
                aria-label={title}
                className={selectClass}
                value={current}
                onChange={(event) => onChange({ [key]: event.target.value })}
            >
                {options}
            </select>,
        );

    return (
        <>
            {select(
                'f-status',
                t('Status'),
                value.status,
                'status',
                <>
                    <option value="">{t('All statuses')}</option>
                    {statuses.map((status) => (
                        <option key={status} value={status}>
                            {label('vehicle_status', status)}
                        </option>
                    ))}
                </>,
            )}
            {select(
                'f-category',
                t('Category'),
                value.category,
                'category',
                <>
                    <option value="">{t('All categories')}</option>
                    {categories.map((category) => (
                        <option key={category} value={category}>
                            {label('vehicle_category', category)}
                        </option>
                    ))}
                </>,
            )}
            {select(
                'f-type',
                t('Type'),
                value.type,
                'type',
                <>
                    <option value="">{t('All types')}</option>
                    {types.map((type) => (
                        <option key={type.id} value={String(type.id)}>
                            {type.name}
                        </option>
                    ))}
                </>,
            )}
            {branches.length > 1 &&
                select(
                    'f-branch',
                    t('Branch'),
                    value.branch,
                    'branch',
                    <>
                        <option value="">{t('All branches')}</option>
                        {branches.map((branch) => (
                            <option key={branch.id} value={String(branch.id)}>
                                {branch.name}
                            </option>
                        ))}
                    </>,
                )}
            {select(
                'f-coupled',
                t('Coupling'),
                value.coupled,
                'coupled',
                <>
                    <option value="">{t('Any coupling')}</option>
                    <option value="1">{t('In a road train')}</option>
                    <option value="0">{t('Not coupled')}</option>
                </>,
            )}
            {select(
                'f-attention',
                t('Attention'),
                value.attention,
                'attention',
                <>
                    <option value="">{t('Any')}</option>
                    <option value="stale_odometer">
                        {t('No recent odometer reading')}
                    </option>
                </>,
            )}
            {/* Desktop sorts by table headers; cards (below lg) need a control. */}
            <div className={inline ? 'w-56 lg:hidden' : 'contents'}>
                {select(
                    'f-sort',
                    t('Sort by'),
                    value.sort,
                    'sort',
                    <>
                        {SORTS.map((sort) => (
                            <option key={sort} value={sort}>
                                {t(`sort:${sort}`)}
                            </option>
                        ))}
                    </>,
                )}
            </div>
            {inline ? (
                <Button
                    variant={value.archived ? 'default' : 'outline'}
                    aria-pressed={value.archived}
                    onClick={() => onChange({ archived: !value.archived })}
                >
                    {t('Archive')}
                </Button>
            ) : (
                <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                        type="checkbox"
                        className="size-5"
                        checked={value.archived}
                        onChange={(event) =>
                            onChange({ archived: event.target.checked })
                        }
                    />
                    {t('Show archived vehicles')}
                </label>
            )}
        </>
    );
}

type Chip = { key: string; label: string; clear: Partial<Filters> };

function useActiveChips({ filters, types, branches }: Props): Chip[] {
    const { t, label } = useT();
    const chips: Chip[] = [];

    if (filters.status) {
        chips.push({
            key: 'status',
            label: label('vehicle_status', filters.status),
            clear: { status: '' },
        });
    }

    if (filters.category) {
        chips.push({
            key: 'category',
            label: label('vehicle_category', filters.category),
            clear: { category: '' },
        });
    }

    if (filters.type) {
        chips.push({
            key: 'type',
            label:
                types.find((type) => String(type.id) === filters.type)?.name ??
                t('Type'),
            clear: { type: '' },
        });
    }

    if (filters.branch) {
        chips.push({
            key: 'branch',
            label:
                branches.find((branch) => String(branch.id) === filters.branch)
                    ?.name ?? t('Branch'),
            clear: { branch: '' },
        });
    }

    if (filters.coupled) {
        chips.push({
            key: 'coupled',
            label:
                filters.coupled === '1'
                    ? t('In a road train')
                    : t('Not coupled'),
            clear: { coupled: '' },
        });
    }

    if (filters.attention) {
        chips.push({
            key: 'attention',
            label: t('No recent odometer reading'),
            clear: { attention: '' },
        });
    }

    if (filters.archived) {
        chips.push({
            key: 'archived',
            label: t('Archive'),
            clear: { archived: false },
        });
    }

    return chips;
}

function VehicleCard({ vehicle }: { vehicle: VehicleRow }) {
    const { t } = useT();
    const format = useFormat();

    return (
        <Link
            href={vehicles.show(vehicle.id)}
            className="block rounded-xl border p-4 active:bg-muted/50"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="font-mono text-lg font-semibold">
                        {vehicle.plate_number}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">
                        {[vehicle.make, vehicle.model]
                            .filter(Boolean)
                            .join(' ')}{' '}
                        · {vehicle.type.name}
                    </div>
                </div>
                <VehicleStatusBadge status={vehicle.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                    <dt className="text-xs text-muted-foreground">
                        {t('Odometer')}
                    </dt>
                    <dd className="tabular-nums">
                        {format.km(vehicle.current_odometer_km)}
                    </dd>
                </div>
                <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">
                        {t('Responsible person')}
                    </dt>
                    <dd className="truncate">
                        {vehicle.responsible ?? t('Not assigned')}
                    </dd>
                </div>
                <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">
                        {t('Branch')}
                    </dt>
                    <dd className="truncate">
                        {vehicle.branch?.name ?? t('No branch')}
                    </dd>
                </div>
                {vehicle.coupled_with.length > 0 && (
                    <div className="min-w-0">
                        <dt className="text-xs text-muted-foreground">
                            {t('Coupled with')}
                        </dt>
                        <dd className="flex items-center gap-1 truncate font-mono">
                            <Link2 className="size-3.5 shrink-0" />
                            {vehicle.coupled_with
                                .map((partner) => partner.plate_number)
                                .join(', ')}
                        </dd>
                    </div>
                )}
            </dl>
        </Link>
    );
}

function VehicleTable({
    rows,
    sort,
    onSort,
}: {
    rows: VehicleRow[];
    sort: string;
    onSort: (sort: string) => void;
}) {
    const { t } = useT();
    const format = useFormat();

    return (
        <div className="hidden overflow-x-auto rounded-xl border lg:block">
            <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-muted-foreground">
                    <tr>
                        <SortHeader column="plate" sort={sort} onSort={onSort}>
                            {t('Plate number')}
                        </SortHeader>
                        <th className="px-4 py-3 font-medium">{t('Type')}</th>
                        <th className="hidden px-4 py-3 font-medium lg:table-cell">
                            {t('Make')} / {t('Model')}
                        </th>
                        <th className="hidden px-4 py-3 font-medium xl:table-cell">
                            {t('Responsible person')}
                        </th>
                        <th className="hidden px-4 py-3 font-medium lg:table-cell">
                            {t('Branch')}
                        </th>
                        <th className="px-4 py-3 font-medium">
                            {t('Coupled with')}
                        </th>
                        <SortHeader
                            column="odometer"
                            sort={sort}
                            onSort={onSort}
                            align="right"
                        >
                            {t('Odometer')}
                        </SortHeader>
                        <SortHeader
                            column="commissioned"
                            sort={sort}
                            onSort={onSort}
                            className="hidden xl:table-cell"
                        >
                            {t('Commissioned on')}
                        </SortHeader>
                        <th className="px-4 py-3 font-medium">{t('Status')}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((vehicle) => (
                        <tr
                            key={vehicle.id}
                            className="border-t hover:bg-muted/30"
                        >
                            <td className="px-4 py-3">
                                <Link
                                    href={vehicles.show(vehicle.id)}
                                    className="font-mono font-semibold hover:underline"
                                >
                                    {vehicle.plate_number}
                                </Link>
                                {vehicle.vin && (
                                    <div className="font-mono text-xs text-muted-foreground">
                                        {vehicle.vin}
                                    </div>
                                )}
                            </td>
                            <td className="px-4 py-3">{vehicle.type.name}</td>
                            <td className="hidden px-4 py-3 lg:table-cell">
                                {[vehicle.make, vehicle.model]
                                    .filter(Boolean)
                                    .join(' ')}
                                {vehicle.year && (
                                    <span className="text-muted-foreground">
                                        {' '}
                                        · {vehicle.year}
                                    </span>
                                )}
                            </td>
                            <td className="hidden px-4 py-3 xl:table-cell">
                                {vehicle.responsible ? (
                                    <span className="inline-flex items-center gap-1">
                                        <UserRound className="size-3.5 text-muted-foreground" />
                                        {vehicle.responsible}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">
                                        —
                                    </span>
                                )}
                            </td>
                            <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                                {vehicle.branch?.name ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                                {vehicle.coupled_with.length === 0
                                    ? '—'
                                    : vehicle.coupled_with.map((partner) => (
                                          <Link
                                              key={partner.id}
                                              href={vehicles.show(partner.id)}
                                              className="mr-2 font-mono hover:underline"
                                          >
                                              {partner.plate_number}
                                          </Link>
                                      ))}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                                {format.km(vehicle.current_odometer_km)}
                            </td>
                            <td className="hidden px-4 py-3 xl:table-cell">
                                {format.date(vehicle.commissioned_on)}
                            </td>
                            <td className="px-4 py-3">
                                <VehicleStatusBadge status={vehicle.status} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function SortHeader({
    column,
    sort,
    onSort,
    align,
    className,
    children,
}: {
    column: string;
    sort: string;
    onSort: (sort: string) => void;
    align?: 'right';
    className?: string;
    children: ReactNode;
}) {
    const active = sort.replace('-', '') === column;
    const descending = sort.startsWith('-');
    const Icon = !active ? ArrowUpDown : descending ? ArrowDown : ArrowUp;

    return (
        <th
            className={cn('px-2 py-1.5 font-medium', className)}
            aria-sort={
                active ? (descending ? 'descending' : 'ascending') : 'none'
            }
        >
            <button
                type="button"
                onClick={() =>
                    onSort(active && !descending ? `-${column}` : column)
                }
                className={cn(
                    'inline-flex min-h-9 w-full items-center gap-1 rounded-md px-2 hover:bg-muted hover:text-foreground',
                    align === 'right' && 'justify-end',
                    active && 'text-foreground',
                )}
            >
                {children}
                <Icon className="size-3.5" />
            </button>
        </th>
    );
}

VehiclesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Vehicles', href: vehicles.index() },
    ],
};
