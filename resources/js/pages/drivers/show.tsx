import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ClipboardList,
    FileText,
    Info,
    Pencil,
    Phone,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { SubjectDocuments } from '@/components/documents/subject-documents';
import { DriverFormSheet } from '@/components/drivers/driver-form-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WaybillList } from '@/components/waybills/waybill-list';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import drivers from '@/routes/drivers';
import driverWaybills from '@/routes/drivers/waybills';
import waybillRoutes from '@/routes/waybills';
import type { DocumentSummary } from '@/types/documents';
import type { DriverFormOptions, DriverItem } from '@/types/drivers';

type Props = DriverFormOptions & {
    driver: DriverItem & {
        notes: string | null;
        user_email: string | null;
        created_at: string | null;
    };
    openWaybill: {
        id: number;
        number: string | null;
        plate_number: string;
        departure_at: string | null;
    } | null;
    documentSummary: DocumentSummary | null;
    can: {
        update: boolean;
        view_documents: boolean;
        create_document: boolean;
        update_document: boolean;
        archive_document: boolean;
        view_waybills: boolean;
        create_waybill: boolean;
    };
};

const TABS = ['overview', 'documents', 'waybills'] as const;

type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
    overview: 'Overview',
    documents: 'Documents',
    waybills: 'Waybills',
};

function initialTab(): Tab {
    if (typeof window === 'undefined') {
        return 'overview';
    }

    const tab = new URLSearchParams(window.location.search).get('tab');

    return TABS.includes(tab as Tab) ? (tab as Tab) : 'overview';
}

export default function DriversShow(props: Props) {
    const { driver, can, openWaybill } = props;
    const { t, label } = useT();
    const [tab, setTab] = useState<Tab>(initialTab);
    const [editing, setEditing] = useState(false);
    const tabs = TABS.filter(
        (key) =>
            (key !== 'documents' || can.view_documents) &&
            (key !== 'waybills' || can.view_waybills),
    );
    const createWaybillUrl =
        can.create_waybill && !openWaybill
            ? waybillRoutes.create.url({ query: { driver_id: driver.id } })
            : null;

    function selectTab(next: Tab) {
        setTab(next);

        const url = new URL(window.location.href);

        if (next === 'overview') {
            url.searchParams.delete('tab');
        } else {
            url.searchParams.set('tab', next);
        }

        window.history.replaceState(window.history.state, '', url);
    }

    return (
        <>
            <Head title={driver.full_name} />

            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
                <header className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <h1 className="text-2xl font-semibold tracking-tight break-words md:text-3xl">
                            {driver.full_name}
                        </h1>
                        <Badge
                            variant={
                                driver.status === 'active'
                                    ? 'outline'
                                    : 'secondary'
                            }
                            className="font-normal"
                        >
                            {label('driver_status', driver.status)}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {[
                            driver.personnel_number &&
                                t('Pers. no. :number', {
                                    number: driver.personnel_number,
                                }),
                            driver.branch,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                </header>

                <Warnings
                    {...props}
                    onDocuments={() => selectTab('documents')}
                />

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    {driver.phone && (
                        <Button variant="outline" asChild>
                            <a
                                href={`tel:${driver.phone.replace(/[^\d+]/g, '')}`}
                            >
                                <Phone />
                                {t('Call')}
                            </a>
                        </Button>
                    )}
                    {openWaybill ? (
                        <Button variant="outline" asChild>
                            <Link href={waybillRoutes.show.url(openWaybill.id)}>
                                <ClipboardList />
                                {t('Waybill')}
                            </Link>
                        </Button>
                    ) : (
                        createWaybillUrl && (
                            <Button variant="outline" asChild>
                                <Link href={createWaybillUrl}>
                                    <ClipboardList />
                                    {t('New waybill')}
                                </Link>
                            </Button>
                        )
                    )}
                    {can.update && (
                        <Button
                            variant="outline"
                            onClick={() => setEditing(true)}
                        >
                            <Pencil />
                            {t('Edit')}
                        </Button>
                    )}
                </div>

                <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 bg-background/95 px-4 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
                    <div
                        role="tablist"
                        aria-label={t('Driver sections')}
                        className="flex [scrollbar-width:none] gap-1 overflow-x-auto border-b"
                    >
                        {tabs.map((key) => (
                            <button
                                key={key}
                                id={`driver-tab-${key}`}
                                type="button"
                                role="tab"
                                aria-selected={tab === key}
                                aria-controls="driver-tabpanel"
                                onClick={() => selectTab(key)}
                                className={cn(
                                    '-mb-px min-h-11 min-w-11 shrink-0 border-b-2 px-3 text-sm whitespace-nowrap transition-colors',
                                    tab === key
                                        ? 'border-primary font-medium text-foreground'
                                        : 'border-transparent text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {t(TAB_LABELS[key])}
                            </button>
                        ))}
                    </div>
                </div>

                <div
                    id="driver-tabpanel"
                    role="tabpanel"
                    aria-labelledby={`driver-tab-${tab}`}
                >
                    {tab === 'overview' && <Overview {...props} />}
                    {tab === 'documents' && can.view_documents && (
                        <SubjectDocuments
                            owner={{ kind: 'driver', id: driver.id }}
                            readOnly={driver.status === 'inactive'}
                            can={{
                                create: can.create_document,
                                renew:
                                    can.create_document && can.archive_document,
                                update: can.update_document,
                                archive: can.archive_document,
                                attach:
                                    can.create_document || can.update_document,
                            }}
                        />
                    )}
                    {tab === 'waybills' && can.view_waybills && (
                        <WaybillList
                            url={driverWaybills.index.url(driver.id)}
                            hide="driver"
                            createUrl={createWaybillUrl}
                            fullListUrl={waybillRoutes.index.url({
                                query: { search: driver.last_name },
                            })}
                        />
                    )}
                </div>
            </div>

            {editing && (
                <DriverFormSheet
                    driver={driver}
                    options={props}
                    onClose={() => setEditing(false)}
                />
            )}
        </>
    );
}

function Warnings({
    driver,
    openWaybill,
    documentSummary,
    onDocuments,
}: Props & { onDocuments: () => void }) {
    const { t } = useT();
    const format = useFormat();
    const items: {
        key: string;
        tone: 'danger' | 'warn' | 'info';
        text: string;
        action?: ReactNode;
    }[] = [];

    if (openWaybill) {
        items.push({
            key: 'waybill',
            tone: 'info',
            text: t('On a trip: waybill :number, vehicle :plate', {
                number: openWaybill.number ?? '',
                plate: openWaybill.plate_number,
            }),
            action: (
                <Button size="sm" variant="outline" asChild>
                    <Link href={waybillRoutes.show.url(openWaybill.id)}>
                        <ClipboardList />
                        {t('Open')}
                    </Link>
                </Button>
            ),
        });
    }

    if (driver.status === 'active' && documentSummary) {
        const open = (
            <Button size="sm" variant="outline" onClick={onDocuments}>
                <FileText />
                {t('Documents')}
            </Button>
        );

        if (documentSummary.expired.length > 0) {
            items.push({
                key: 'documents-expired',
                tone: 'danger',
                text: t('Expired: :list', {
                    list: documentSummary.expired
                        .map(
                            (item) =>
                                `${item.name} (${format.date(item.expires_on)})`,
                        )
                        .join(', '),
                }),
                action: open,
            });
        }

        if (documentSummary.expiring.length > 0) {
            items.push({
                key: 'documents-expiring',
                tone: 'warn',
                text: t('Expiring soon: :list', {
                    list: documentSummary.expiring
                        .map((item) =>
                            item.days_left === 0
                                ? `${item.name} — ${t('today')}`
                                : `${item.name} — ${t('in :days d.', { days: item.days_left ?? 0 })}`,
                        )
                        .join(', '),
                }),
                action: documentSummary.expired.length > 0 ? undefined : open,
            });
        }

        if (documentSummary.missing.length > 0) {
            items.push({
                key: 'documents-missing',
                tone: 'warn',
                text: t('Mandatory documents not added: :list', {
                    list: documentSummary.missing.join(', '),
                }),
                action:
                    documentSummary.expired.length +
                        documentSummary.expiring.length >
                    0
                        ? undefined
                        : open,
            });
        }
    }

    if (driver.status === 'inactive') {
        items.push({
            key: 'inactive',
            tone: 'info',
            text: t(
                'Inactive: cannot be assigned to new waybills. History is preserved.',
            ),
        });
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <ul className="flex flex-col gap-2">
            {items.map((item) => (
                <li
                    key={item.key}
                    role="status"
                    className={cn(
                        'flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between',
                        item.tone === 'danger' &&
                            'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
                        item.tone === 'warn' &&
                            'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
                        item.tone === 'info' && 'bg-muted/50',
                    )}
                >
                    <span className="flex items-start gap-2">
                        {item.tone === 'info' ? (
                            <Info className="mt-0.5 size-4 shrink-0" />
                        ) : (
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        )}
                        {item.text}
                    </span>
                    {item.action}
                </li>
            ))}
        </ul>
    );
}

function Overview({ driver }: Props) {
    const { t } = useT();
    const format = useFormat();
    const rows: [string, ReactNode][] = [
        [
            t('Driving licence number'),
            driver.license_number ? (
                <span className="font-mono">{driver.license_number}</span>
            ) : (
                t('Not specified')
            ),
        ],
        [
            t('Licence categories'),
            driver.license_categories.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                    {driver.license_categories.map((category) => (
                        <span
                            key={category}
                            className="rounded border px-1.5 font-mono text-xs"
                        >
                            {category}
                        </span>
                    ))}
                </span>
            ) : (
                t('Not specified')
            ),
        ],
        [
            t('Phone'),
            driver.phone ? (
                <a
                    href={`tel:${driver.phone.replace(/[^\d+]/g, '')}`}
                    className="-my-3 inline-flex min-h-11 items-center underline-offset-4 hover:underline md:my-0 md:min-h-0"
                >
                    {driver.phone}
                </a>
            ) : (
                '—'
            ),
        ],
        [t('Personnel number'), driver.personnel_number ?? '—'],
        [t('Branch'), driver.branch ?? t('Not assigned')],
        [
            t('User account'),
            driver.user
                ? `${driver.user}${driver.user_email ? ` (${driver.user_email})` : ''}`
                : t('No account'),
        ],
        [t('Added'), format.dayOf(driver.created_at)],
    ];

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border p-4 md:p-5">
                <dl className="grid gap-3 text-sm">
                    {rows.map(([term, value]) => (
                        <div
                            key={term}
                            className="grid gap-0.5 sm:grid-cols-[12rem_1fr] sm:gap-3"
                        >
                            <dt className="text-muted-foreground">{term}</dt>
                            <dd className="min-w-0 break-words">{value}</dd>
                        </div>
                    ))}
                </dl>
            </section>
            {driver.notes && (
                <section className="rounded-xl border p-4 md:p-5">
                    <h2 className="mb-2 text-base font-medium">{t('Notes')}</h2>
                    <p className="text-sm whitespace-pre-line">
                        {driver.notes}
                    </p>
                </section>
            )}
        </div>
    );
}

DriversShow.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Drivers', href: drivers.index() },
        { title: props.driver.full_name, href: drivers.show(props.driver.id) },
    ],
});
