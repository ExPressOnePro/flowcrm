import { Head, Link, usePage } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import {
    AlertTriangle,
    BarChart3,
    CheckSquare2,
    ChevronRight,
    Gauge,
    Link2,
    Plus,
    Truck,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { VehicleStatusBadge } from '@/components/fleet/vehicle-status-badge';
import { Button } from '@/components/ui/button';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { analytics, dashboard } from '@/routes';
import tasks from '@/routes/tasks';
import vehicles from '@/routes/vehicles';

type Fleet = {
    total: number;
    by_status: Record<string, number>;
    road_trains: number;
    stale_odometer: number;
};

type AttentionItem = {
    id: number;
    plate_number: string;
    name: string;
    status: string;
    reason: 'under_repair' | 'stale_odometer';
    since: string | null;
};

type TaskItem = {
    id: number;
    title: string;
    due_at: string | null;
    overdue: boolean;
    priority: string;
    status: string;
};

type Props = {
    fleet: Fleet | null;
    attention: AttentionItem[];
    tasks: TaskItem[];
    staleOdometerDays: number;
    can: {
        create_vehicle: boolean;
        view_analytics: boolean;
        view_tasks: boolean;
    };
};

export default function Dashboard({
    fleet,
    attention,
    tasks: myTasks,
    staleOdometerDays,
    can,
}: Props) {
    const { t } = useT();
    const { auth } = usePage().props;

    return (
        <>
            <Head title={t('Dashboard')} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                            {t('Hello, :name', { name: auth.user.first_name })}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t('Fleet status and what needs attention today.')}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                        {can.create_vehicle && (
                            <Button asChild>
                                <Link href={vehicles.create()}>
                                    <Plus />
                                    {t('New vehicle')}
                                </Link>
                            </Button>
                        )}
                        {can.view_analytics && (
                            <Button variant="outline" asChild>
                                <Link href={analytics()}>
                                    <BarChart3 />
                                    {t('Analytics')}
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {fleet && (
                    <section aria-label={t('Fleet')}>
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Kpi
                                label={t('Vehicles in fleet')}
                                value={fleet.total}
                                icon={Truck}
                                href={vehicles.index()}
                            />
                            <Kpi
                                label={t('In service')}
                                value={fleet.by_status.in_service ?? 0}
                                href={vehicles.index({
                                    query: { status: 'in_service' },
                                })}
                                tone="good"
                            />
                            <Kpi
                                label={t('Under repair')}
                                value={fleet.by_status.under_repair ?? 0}
                                icon={Wrench}
                                href={vehicles.index({
                                    query: { status: 'under_repair' },
                                })}
                                tone={
                                    (fleet.by_status.under_repair ?? 0) > 0
                                        ? 'warn'
                                        : undefined
                                }
                            />
                            <Kpi
                                label={t('Idle')}
                                value={fleet.by_status.idle ?? 0}
                                href={vehicles.index({
                                    query: { status: 'idle' },
                                })}
                            />
                            <Kpi
                                label={t('Road trains')}
                                value={fleet.road_trains}
                                icon={Link2}
                                href={vehicles.index({
                                    query: { coupled: '1' },
                                })}
                            />
                            <Kpi
                                label={t('No odometer reading for :days days', {
                                    days: staleOdometerDays,
                                })}
                                value={fleet.stale_odometer}
                                icon={Gauge}
                                href={vehicles.index({
                                    query: { attention: 'stale_odometer' },
                                })}
                                tone={
                                    fleet.stale_odometer > 0
                                        ? 'warn'
                                        : undefined
                                }
                            />
                            <Kpi
                                label={t('Decommissioned')}
                                value={fleet.by_status.decommissioned ?? 0}
                                href={vehicles.index({
                                    query: { status: 'decommissioned' },
                                })}
                                muted
                            />
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                            {t(
                                'Expiring documents and open waybills will appear here after stages 4 and 5.',
                            )}
                        </p>
                    </section>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    {fleet && (
                        <section className="rounded-xl border">
                            <SectionHeader
                                title={t('Needs attention')}
                                icon={AlertTriangle}
                            />
                            {attention.length === 0 ? (
                                <p className="px-4 pb-4 text-sm text-muted-foreground">
                                    {t('Nothing requires attention.')}
                                </p>
                            ) : (
                                <ul className="divide-y">
                                    {attention.map((item) => (
                                        <li key={`${item.reason}-${item.id}`}>
                                            <AttentionRow
                                                item={item}
                                                staleDays={staleOdometerDays}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}

                    {can.view_tasks && (
                        <section className="rounded-xl border">
                            <SectionHeader
                                title={t('My tasks for today')}
                                icon={CheckSquare2}
                                href={tasks.index()}
                            />
                            {myTasks.length === 0 ? (
                                <p className="px-4 pb-4 text-sm text-muted-foreground">
                                    {t('No tasks due today.')}
                                </p>
                            ) : (
                                <ul className="divide-y">
                                    {myTasks.map((task) => (
                                        <li key={task.id}>
                                            <TaskRow task={task} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </>
    );
}

function Kpi({
    label,
    value,
    href,
    icon: Icon,
    tone,
    muted,
}: {
    label: string;
    value: number;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon;
    tone?: 'good' | 'warn';
    muted?: boolean;
}) {
    const format = useFormat();

    return (
        <Link
            href={href}
            prefetch
            className={cn(
                'group flex min-h-24 flex-col justify-between gap-2 rounded-xl border p-3 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:p-4',
                tone === 'warn' &&
                    'border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30',
                muted && 'text-muted-foreground',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="text-xs leading-snug text-muted-foreground md:text-sm">
                    {label}
                </span>
                {Icon && (
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                )}
            </div>
            <div className="flex items-end justify-between">
                <span
                    className={cn(
                        'text-2xl font-semibold tabular-nums md:text-3xl',
                        tone === 'good' &&
                            'text-emerald-700 dark:text-emerald-400',
                        tone === 'warn' && 'text-amber-700 dark:text-amber-400',
                    )}
                >
                    {format.number(value)}
                </span>
                <ChevronRight className="size-4 text-muted-foreground opacity-60 group-hover:opacity-100" />
            </div>
        </Link>
    );
}

function SectionHeader({
    title,
    icon: Icon,
    href,
}: {
    title: string;
    icon: LucideIcon;
    href?: NonNullable<InertiaLinkProps['href']>;
}) {
    const { t } = useT();

    return (
        <div className="flex items-center justify-between gap-2 p-4 pb-2">
            <h2 className="flex items-center gap-2 text-base font-medium">
                <Icon className="size-4 text-muted-foreground" />
                {title}
            </h2>
            {href && (
                <Link
                    href={href}
                    className="-my-2 flex min-h-11 min-w-11 items-center justify-center px-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    {t('All')}
                </Link>
            )}
        </div>
    );
}

function AttentionRow({
    item,
    staleDays,
}: {
    item: AttentionItem;
    staleDays: number;
}) {
    const { t } = useT();
    const format = useFormat();

    const reason =
        item.reason === 'under_repair'
            ? item.since
                ? t('Under repair since :date', {
                      date: format.dayOf(item.since),
                  })
                : t('Under repair')
            : item.since
              ? t('Last odometer reading :date', {
                    date: format.dayOf(item.since),
                })
              : t('No odometer readings for :days days', { days: staleDays });

    return (
        <Link
            href={vehicles.show(item.id)}
            className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-muted/40"
        >
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold">
                        {item.plate_number}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                        {item.name}
                    </span>
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-400">
                    {reason}
                </div>
            </div>
            <VehicleStatusBadge status={item.status} />
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
    );
}

function TaskRow({ task }: { task: TaskItem }) {
    const { t } = useT();
    const format = useFormat();

    return (
        <Link
            href={tasks.show(task.id)}
            className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-muted/40"
        >
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{task.title}</div>
                <div
                    className={cn(
                        'text-xs',
                        task.overdue
                            ? 'text-destructive'
                            : 'text-muted-foreground',
                    )}
                >
                    {task.overdue ? `${t('Overdue')} · ` : ''}
                    {format.dateTime(task.due_at)}
                </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
