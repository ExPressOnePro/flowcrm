import { Head, Link, usePage } from '@inertiajs/react';
import { CheckSquare2, Users } from 'lucide-react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { dashboard } from '@/routes';
import customers from '@/routes/customers';
import deals from '@/routes/deals';
import tasks from '@/routes/tasks';

type Props = {
    stats: {
        revenue: number;
        revenueChange: number | null;
        pipelineValue: number;
        activeDeals: number;
        customers: number;
        currency: string;
    };
    pipeline: { name: string; value: number; position: number }[];
    revenueChart: { month: string; label: string; amount: number }[];
    recentDeals: {
        id: number;
        title: string;
        value: number;
        currency: string;
        stage: string | null;
        customer: string | null;
    }[];
    tasks: {
        id: number;
        title: string;
        due_at: string | null;
        priority: string;
        status: string;
    }[];
};

function money(value: number, currency: string, digits = 0) {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: digits,
    }).format(value);
}

export default function Dashboard({
    stats,
    pipeline,
    revenueChart,
    recentDeals,
    tasks: todayTasks,
}: Props) {
    const { auth } = usePage().props;
    const maxPipeline = Math.max(...pipeline.map((stage) => stage.value), 1);

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <Heading
                    title={`Welcome back, ${auth.user.first_name}`}
                    description="Overview of revenue, pipeline and work for today."
                />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Total Revenue"
                        value={money(stats.revenue, stats.currency)}
                        hint={
                            stats.revenueChange === null
                                ? 'From recorded payments'
                                : `${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange}% vs last month`
                        }
                        positive={
                            stats.revenueChange === null
                                ? undefined
                                : stats.revenueChange >= 0
                        }
                    />
                    <StatCard
                        label="Pipeline Value"
                        value={money(stats.pipelineValue, stats.currency)}
                        hint="Open deals"
                    />
                    <StatCard
                        label="Active Deals"
                        value={String(stats.activeDeals)}
                        hint="Currently in pipeline"
                    />
                    <StatCard
                        label="Customers"
                        value={String(stats.customers)}
                        hint="In this organization"
                    />
                </div>

                <div className="grid gap-6 xl:grid-cols-5">
                    <div className="space-y-4 rounded-xl border p-5 xl:col-span-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-medium">Revenue</h2>
                            <span className="text-xs text-muted-foreground">
                                Last 12 months
                            </span>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueChart}>
                                    <defs>
                                        <linearGradient
                                            id="revenueFill"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="oklch(0.45 0.08 250)"
                                                stopOpacity={0.35}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="oklch(0.45 0.08 250)"
                                                stopOpacity={0.02}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="oklch(0.9 0.01 250)"
                                    />
                                    <XAxis
                                        dataKey="label"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(value) =>
                                            `${Math.round(Number(value) / 1000)}k`
                                        }
                                    />
                                    <Tooltip
                                        formatter={(value) =>
                                            money(
                                                Number(value ?? 0),
                                                stats.currency,
                                                2,
                                            )
                                        }
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="oklch(0.4 0.08 250)"
                                        fill="url(#revenueFill)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="space-y-4 rounded-xl border p-5 xl:col-span-2">
                        <h2 className="font-medium">Pipeline overview</h2>
                        {pipeline.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No pipeline stages yet.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {pipeline.map((stage) => (
                                    <div key={stage.name} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>{stage.name}</span>
                                            <span className="text-muted-foreground">
                                                {money(
                                                    stage.value,
                                                    stats.currency,
                                                )}
                                            </span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-foreground/70"
                                                style={{
                                                    width: `${Math.max(
                                                        4,
                                                        (stage.value /
                                                            maxPipeline) *
                                                            100,
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-5">
                    <div className="space-y-4 rounded-xl border p-5 xl:col-span-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-medium">Recent deals</h2>
                            <Link
                                href={deals.index()}
                                className="text-sm text-muted-foreground hover:underline"
                            >
                                View all
                            </Link>
                        </div>

                        {recentDeals.length === 0 ? (
                            <EmptyState
                                icon={Users}
                                title="No deals yet"
                                description="Create your first deal to see it on the dashboard."
                            />
                        ) : (
                            <div className="overflow-hidden rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/40 text-left text-muted-foreground">
                                        <tr>
                                            <th className="px-3 py-2 font-medium">
                                                Deal
                                            </th>
                                            <th className="hidden px-3 py-2 font-medium sm:table-cell">
                                                Customer
                                            </th>
                                            <th className="px-3 py-2 font-medium">
                                                Value
                                            </th>
                                            <th className="hidden px-3 py-2 font-medium md:table-cell">
                                                Stage
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentDeals.map((deal) => (
                                            <tr
                                                key={deal.id}
                                                className="border-t"
                                            >
                                                <td className="px-3 py-2">
                                                    <Link
                                                        href={deals.show(
                                                            deal.id,
                                                        )}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {deal.title}
                                                    </Link>
                                                </td>
                                                <td className="hidden px-3 py-2 sm:table-cell">
                                                    {deal.customer ?? '—'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {money(
                                                        deal.value,
                                                        deal.currency,
                                                    )}
                                                </td>
                                                <td className="hidden px-3 py-2 md:table-cell">
                                                    {deal.stage ? (
                                                        <Badge
                                                            variant="secondary"
                                                            className="capitalize"
                                                        >
                                                            {deal.stage}
                                                        </Badge>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 rounded-xl border p-5 xl:col-span-2">
                        <div className="flex items-center justify-between">
                            <h2 className="font-medium">Tasks today</h2>
                            <Link
                                href={tasks.index()}
                                className="text-sm text-muted-foreground hover:underline"
                            >
                                View all
                            </Link>
                        </div>

                        {todayTasks.length === 0 ? (
                            <EmptyState
                                icon={CheckSquare2}
                                title="Nothing due today"
                                description="You're clear for now."
                            />
                        ) : (
                            <div className="space-y-3">
                                {todayTasks.map((task) => (
                                    <Link
                                        key={task.id}
                                        href={tasks.show(task.id)}
                                        className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/40"
                                    >
                                        <div>
                                            <div className="text-sm font-medium">
                                                {task.title}
                                            </div>
                                            <div className="text-xs capitalize text-muted-foreground">
                                                {task.priority} priority
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {task.due_at
                                                ? new Date(
                                                      task.due_at,
                                                  ).toLocaleTimeString(
                                                      undefined,
                                                      {
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                      },
                                                  )
                                                : '—'}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-sm text-muted-foreground">
                    <Link
                        href={customers.index()}
                        className="hover:underline"
                    >
                        Browse customers
                    </Link>
                </div>
            </div>
        </>
    );
}

function StatCard({
    label,
    value,
    hint,
    positive,
}: {
    label: string;
    value: string;
    hint: string;
    positive?: boolean;
}) {
    return (
        <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
            <p
                className={`mt-1 text-xs ${
                    positive === undefined
                        ? 'text-muted-foreground'
                        : positive
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                }`}
            >
                {hint}
            </p>
        </div>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
