import { Head, Link, router } from '@inertiajs/react';
import { Archive, Link2, Plus, Truck } from 'lucide-react';
import { useState } from 'react';

import { VehicleStatusBadge } from '@/components/fleet/vehicle-status-badge';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import vehicles from '@/routes/vehicles';
import type { Paginated, VehicleOptions, VehicleSummary } from '@/types/fleet';

type VehicleRow = VehicleSummary & {
    coupled_with: { id: number; plate_number: string }[];
};

type Filters = {
    search: string;
    status: string;
    type: string;
    branch: string;
    category: string;
    archived: boolean;
};

type Props = VehicleOptions & {
    vehicles: Paginated<VehicleRow>;
    filters: Filters;
    can: { create: boolean };
};

const selectClass =
    'border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs';

export default function VehiclesIndex({
    vehicles: paginated,
    filters,
    types,
    branches,
    statuses,
    categories,
    can,
}: Props) {
    const { t, label } = useT();
    const format = useFormat();
    const [state, setState] = useState<Filters>(filters);

    function apply(next: Partial<Filters> = {}) {
        const merged = { ...state, ...next };
        setState(merged);

        router.get(
            vehicles.index.url(),
            {
                search: merged.search || undefined,
                status: merged.status || undefined,
                type: merged.type || undefined,
                branch: merged.branch || undefined,
                category: merged.category || undefined,
                archived: merged.archived ? 1 : undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    const hasFilters =
        filters.search ||
        filters.status ||
        filters.type ||
        filters.branch ||
        filters.category;

    return (
        <>
            <Head title={t('Fleet registry')} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title={t('Fleet registry')}
                        description={t(
                            'Tractors, trailers, trucks and their history.',
                        )}
                    />
                    {can.create && (
                        <Button asChild>
                            <Link href={vehicles.create()}>
                                <Plus />
                                {t('New vehicle')}
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
                    <Input
                        value={state.search}
                        placeholder={t('Search by plate, VIN, make…')}
                        className="lg:max-w-xs"
                        onChange={(event) =>
                            setState({ ...state, search: event.target.value })
                        }
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                apply();
                            }
                        }}
                    />
                    <select
                        className={selectClass}
                        value={state.status}
                        aria-label={t('Status')}
                        onChange={(event) =>
                            apply({ status: event.target.value })
                        }
                    >
                        <option value="">{t('All statuses')}</option>
                        {statuses.map((value) => (
                            <option key={value} value={value}>
                                {label('vehicle_status', value)}
                            </option>
                        ))}
                    </select>
                    <select
                        className={selectClass}
                        value={state.category}
                        aria-label={t('Category')}
                        onChange={(event) =>
                            apply({ category: event.target.value })
                        }
                    >
                        <option value="">{t('All categories')}</option>
                        {categories.map((value) => (
                            <option key={value} value={value}>
                                {label('vehicle_category', value)}
                            </option>
                        ))}
                    </select>
                    <select
                        className={selectClass}
                        value={state.type}
                        aria-label={t('Type')}
                        onChange={(event) =>
                            apply({ type: event.target.value })
                        }
                    >
                        <option value="">{t('All types')}</option>
                        {types.map((type) => (
                            <option key={type.id} value={String(type.id)}>
                                {type.name}
                            </option>
                        ))}
                    </select>
                    {branches.length > 1 && (
                        <select
                            className={selectClass}
                            value={state.branch}
                            aria-label={t('Branch')}
                            onChange={(event) =>
                                apply({ branch: event.target.value })
                            }
                        >
                            <option value="">{t('All branches')}</option>
                            {branches.map((branch) => (
                                <option
                                    key={branch.id}
                                    value={String(branch.id)}
                                >
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    )}
                    <Button variant="secondary" onClick={() => apply()}>
                        {t('Search')}
                    </Button>
                    <Button
                        variant={state.archived ? 'default' : 'outline'}
                        onClick={() => apply({ archived: !state.archived })}
                    >
                        <Archive />
                        {t('Show archive')}
                    </Button>
                </div>

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
                                : t('Register your first tractor or trailer.')
                        }
                        action={
                            can.create && !hasFilters ? (
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
                        {/* Mobile: cards */}
                        <div className="grid gap-3 md:hidden">
                            {paginated.data.map((vehicle) => (
                                <Link
                                    key={vehicle.id}
                                    href={vehicles.show(vehicle.id)}
                                    className="rounded-xl border p-4 hover:bg-muted/30"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-mono text-base font-semibold">
                                                {vehicle.plate_number}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {vehicle.type.name} ·{' '}
                                                {[vehicle.make, vehicle.model]
                                                    .filter(Boolean)
                                                    .join(' ')}
                                            </div>
                                        </div>
                                        <VehicleStatusBadge
                                            status={vehicle.status}
                                        />
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        <span>
                                            {vehicle.branch?.name ??
                                                t('No branch')}
                                        </span>
                                        {vehicle.current_odometer_km !==
                                            null && (
                                            <span>
                                                {format.km(
                                                    vehicle.current_odometer_km,
                                                )}
                                            </span>
                                        )}
                                        {vehicle.coupled_with.length > 0 && (
                                            <span className="inline-flex items-center gap-1">
                                                <Link2 className="size-3" />
                                                {vehicle.coupled_with
                                                    .map((v) => v.plate_number)
                                                    .join(', ')}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Desktop: table */}
                        <div className="hidden overflow-x-auto rounded-xl border md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            {t('Plate number')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {t('Type')}
                                        </th>
                                        <th className="hidden px-4 py-3 font-medium lg:table-cell">
                                            {t('Make')} / {t('Model')}
                                        </th>
                                        <th className="hidden px-4 py-3 font-medium lg:table-cell">
                                            {t('Branch')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {t('Coupled with')}
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium">
                                            {t('Odometer')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {t('Status')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.data.map((vehicle) => (
                                        <tr
                                            key={vehicle.id}
                                            className="border-t hover:bg-muted/30"
                                        >
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={vehicles.show(
                                                        vehicle.id,
                                                    )}
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
                                            <td className="px-4 py-3">
                                                {vehicle.type.name}
                                            </td>
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
                                            <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                                                {vehicle.branch?.name ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {vehicle.coupled_with.length ===
                                                0
                                                    ? '—'
                                                    : vehicle.coupled_with.map(
                                                          (partner) => (
                                                              <Link
                                                                  key={
                                                                      partner.id
                                                                  }
                                                                  href={vehicles.show(
                                                                      partner.id,
                                                                  )}
                                                                  className="mr-2 font-mono hover:underline"
                                                              >
                                                                  {
                                                                      partner.plate_number
                                                                  }
                                                              </Link>
                                                          ),
                                                      )}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {format.km(
                                                    vehicle.current_odometer_km,
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <VehicleStatusBadge
                                                    status={vehicle.status}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <p className="text-sm text-muted-foreground">
                        {t('Total')}: {paginated.total}
                    </p>
                    <Pagination links={paginated.links} />
                </div>
            </div>
        </>
    );
}

VehiclesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Vehicles', href: vehicles.index() },
    ],
};
