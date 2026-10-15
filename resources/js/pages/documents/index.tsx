import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronRight,
    FileText,
    Paperclip,
    Search,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DocumentStateBadge } from '@/components/documents/document-state-badge';
import Heading from '@/components/heading';
import { ResponsiveSheet } from '@/components/responsive-sheet';
import { Field, selectClass } from '@/components/sheet-form';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import documentRoutes from '@/routes/documents';
import vehicles from '@/routes/vehicles';
import type { DocumentListItem } from '@/types/documents';
import type { Option, Paginated } from '@/types/fleet';

type Filters = {
    search: string;
    state: string;
    type: string;
    branch: string;
    sort: string;
};

type Props = {
    documents: Paginated<DocumentListItem>;
    filters: Filters;
    counts: { expired: number; expiring: number };
    types: Option[];
    branches: Option[];
    expiringDays: number;
};

const STATES = ['', 'expiring', 'expired', 'valid', 'no_expiry', 'archived'];
const SORTS = ['expires', '-expires', 'plate', 'type'];

function query(filters: Filters) {
    return Object.fromEntries(
        Object.entries(filters).filter(
            ([key, value]) =>
                value !== '' && !(key === 'sort' && value === 'expires'),
        ),
    );
}

export default function DocumentsIndex(props: Props) {
    const { documents, filters, counts, types, branches } = props;
    const { t, label } = useT();
    const format = useFormat();
    const [search, setSearch] = useState(filters.search);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [draft, setDraft] = useState(filters);
    const [loading, setLoading] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(searchTimer.current), []);

    function visit(next: Filters) {
        router.get(documentRoutes.index.url(), query(next), {
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

    const extraFilters = [filters.type, filters.branch].filter(Boolean).length;
    const stateLabel = (state: string) =>
        state === ''
            ? t('All current')
            : state === 'expiring'
              ? t('Expiring in :days days', { days: props.expiringDays })
              : label('document_filter', state);
    const stateCount = (state: string) =>
        state === 'expired'
            ? counts.expired
            : state === 'expiring'
              ? counts.expiring
              : null;

    const selects = (
        value: Filters,
        onChange: (changes: Partial<Filters>) => void,
    ) => (
        <>
            <Field id="filter-type" label={t('Document type')}>
                <select
                    id="filter-type"
                    className={selectClass}
                    value={value.type}
                    onChange={(event) => onChange({ type: event.target.value })}
                >
                    <option value="">{t('All types')}</option>
                    {types.map((type) => (
                        <option key={type.id} value={type.id}>
                            {type.name}
                        </option>
                    ))}
                </select>
            </Field>
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
            <Field id="filter-sort" label={t('Sort')}>
                <select
                    id="filter-sort"
                    className={selectClass}
                    value={value.sort}
                    onChange={(event) => onChange({ sort: event.target.value })}
                >
                    {SORTS.map((sort) => (
                        <option key={sort} value={sort}>
                            {label('document_sort', sort)}
                        </option>
                    ))}
                </select>
            </Field>
        </>
    );

    return (
        <>
            <Head title={t('Documents')} />

            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
                <Heading
                    title={t('Documents')}
                    description={t(
                        'Vehicle documents and their expiry dates. Add documents from the vehicle card.',
                    )}
                />

                <div
                    role="group"
                    aria-label={t('Expiry')}
                    className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
                >
                    {STATES.map((state) => {
                        const count = stateCount(state);

                        return (
                            <button
                                key={state || 'current'}
                                type="button"
                                aria-pressed={filters.state === state}
                                onClick={() => apply({ state })}
                                className={cn(
                                    'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap max-md:min-h-11',
                                    filters.state === state
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'bg-background hover:bg-muted',
                                )}
                            >
                                {stateLabel(state)}
                                {count !== null && count > 0 && (
                                    <span
                                        className={cn(
                                            'rounded-full px-1.5 text-xs tabular-nums',
                                            filters.state === state
                                                ? 'bg-primary-foreground/20'
                                                : state === 'expired'
                                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                                        )}
                                    >
                                        {count}
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
                            autoCapitalize="characters"
                            autoCorrect="off"
                            spellCheck={false}
                            value={search}
                            aria-label={t('Search by plate or document number')}
                            placeholder={t('Plate or number')}
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

                {(filters.type || filters.branch) && (
                    <div className="flex flex-wrap items-center gap-2">
                        {filters.type && (
                            <button
                                type="button"
                                onClick={() => apply({ type: '' })}
                                className="inline-flex min-h-9 items-center gap-1 rounded-full border bg-muted/40 py-1 pr-2 pl-3 text-sm hover:bg-muted max-md:min-h-11"
                                aria-label={`${t('Remove filter')}: ${types.find((type) => String(type.id) === filters.type)?.name ?? ''}`}
                            >
                                {
                                    types.find(
                                        (type) =>
                                            String(type.id) === filters.type,
                                    )?.name
                                }
                                <X className="size-4 text-muted-foreground" />
                            </button>
                        )}
                        {filters.branch && (
                            <button
                                type="button"
                                onClick={() => apply({ branch: '' })}
                                className="inline-flex min-h-9 items-center gap-1 rounded-full border bg-muted/40 py-1 pr-2 pl-3 text-sm hover:bg-muted max-md:min-h-11"
                                aria-label={`${t('Remove filter')}: ${branches.find((branch) => String(branch.id) === filters.branch)?.name ?? ''}`}
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
                    </div>
                )}

                <div
                    className={cn(
                        'transition-opacity',
                        loading && 'pointer-events-none opacity-60',
                    )}
                    aria-busy={loading}
                >
                    {documents.data.length === 0 ? (
                        <EmptyState
                            icon={FileText}
                            title={
                                filters.search ||
                                filters.type ||
                                filters.branch ||
                                filters.state
                                    ? t('Nothing found')
                                    : t('No documents yet')
                            }
                            description={
                                filters.search ||
                                filters.type ||
                                filters.branch ||
                                filters.state
                                    ? t('Try changing the filters.')
                                    : t(
                                          'Open a vehicle card and add its documents on the Documents tab.',
                                      )
                            }
                            action={
                                filters.search ||
                                filters.type ||
                                filters.branch ||
                                filters.state ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSearch('');
                                            visit({
                                                search: '',
                                                state: '',
                                                type: '',
                                                branch: '',
                                                sort: filters.sort,
                                            });
                                        }}
                                    >
                                        {t('Reset all')}
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <>
                            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
                                {documents.data.map((document) => (
                                    <li key={document.id}>
                                        <Link
                                            href={
                                                document.vehicle
                                                    ? vehicles.show.url(
                                                          document.vehicle.id,
                                                          {
                                                              query: {
                                                                  tab: 'documents',
                                                              },
                                                          },
                                                      )
                                                    : '#'
                                            }
                                            className="flex h-full items-start gap-3 rounded-xl border bg-card p-4 hover:bg-muted/40"
                                        >
                                            <div className="min-w-0 flex-1 space-y-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="min-w-0 truncate font-mono text-base font-semibold">
                                                        {
                                                            document.vehicle
                                                                ?.plate_number
                                                        }
                                                    </span>
                                                    <DocumentStateBadge
                                                        state={document.state}
                                                        daysLeft={
                                                            document.days_left
                                                        }
                                                    />
                                                </div>
                                                <div className="text-sm">
                                                    {document.type.name}
                                                </div>
                                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                                    {document.number && (
                                                        <span className="font-mono">
                                                            {document.number}
                                                        </span>
                                                    )}
                                                    {document.expires_on && (
                                                        <span>
                                                            {t('until :date', {
                                                                date: format.date(
                                                                    document.expires_on,
                                                                ),
                                                            })}
                                                        </span>
                                                    )}
                                                    {document.vehicle
                                                        ?.branch && (
                                                        <span>
                                                            {
                                                                document.vehicle
                                                                    .branch
                                                            }
                                                        </span>
                                                    )}
                                                    {document.files_count >
                                                        0 && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <Paperclip className="size-3" />
                                                            {
                                                                document.files_count
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>

                            <div className="hidden overflow-hidden rounded-xl border lg:block">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/40 text-left text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-2.5 font-medium">
                                                {t('Vehicle')}
                                            </th>
                                            <th className="px-4 py-2.5 font-medium">
                                                {t('Document')}
                                            </th>
                                            <th className="px-4 py-2.5 font-medium">
                                                {t('Number')}
                                            </th>
                                            <th className="px-4 py-2.5 font-medium">
                                                {t('Valid until')}
                                            </th>
                                            <th className="px-4 py-2.5 font-medium">
                                                {t('State')}
                                            </th>
                                            <th className="hidden px-4 py-2.5 font-medium xl:table-cell">
                                                {t('Branch')}
                                            </th>
                                            <th className="px-4 py-2.5 font-medium">
                                                <span className="sr-only">
                                                    {t('Files')}
                                                </span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documents.data.map((document) => (
                                            <tr
                                                key={document.id}
                                                className="border-t hover:bg-muted/30"
                                            >
                                                <td className="px-4 py-2.5">
                                                    {document.vehicle && (
                                                        <Link
                                                            href={vehicles.show.url(
                                                                document.vehicle
                                                                    .id,
                                                                {
                                                                    query: {
                                                                        tab: 'documents',
                                                                    },
                                                                },
                                                            )}
                                                            className="font-mono font-medium hover:underline"
                                                        >
                                                            {
                                                                document.vehicle
                                                                    .plate_number
                                                            }
                                                        </Link>
                                                    )}
                                                    <div className="text-xs text-muted-foreground">
                                                        {document.vehicle?.name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {document.type.name}
                                                </td>
                                                <td className="px-4 py-2.5 font-mono">
                                                    {document.number ?? '—'}
                                                </td>
                                                <td className="px-4 py-2.5 tabular-nums">
                                                    {document.type.has_expiry
                                                        ? format.date(
                                                              document.expires_on,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <DocumentStateBadge
                                                        state={document.state}
                                                        daysLeft={
                                                            document.days_left
                                                        }
                                                    />
                                                </td>
                                                <td className="hidden px-4 py-2.5 xl:table-cell">
                                                    {document.vehicle?.branch ??
                                                        '—'}
                                                </td>
                                                <td className="px-4 py-2.5 text-muted-foreground">
                                                    {document.files_count >
                                                        0 && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <Paperclip className="size-3.5" />
                                                            {
                                                                document.files_count
                                                            }
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 flex flex-col items-center gap-2">
                                <p className="text-sm text-muted-foreground">
                                    {t('Found: :count', {
                                        count: documents.total,
                                    })}
                                </p>
                                <Pagination links={documents.links} />
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
                                    type: '',
                                    branch: '',
                                    sort: 'expires',
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

DocumentsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Documents', href: documentRoutes.index() },
    ],
};
