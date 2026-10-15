import { Head, Link, router } from '@inertiajs/react';
import { CheckSquare, Plus, Search } from 'lucide-react';
import { useState } from 'react';

import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import tasks from '@/routes/tasks';

type TaskRow = {
    id: number;
    title: string;
    status: string;
    priority: string;
    due_at: string | null;
    assigned_to: { id: number; name: string } | null;
    taskable: {
        type: string;
        id: number;
        name: string;
        url: string;
    } | null;
};

type Props = {
    tasks: {
        data: TaskRow[];
        links: { url: string | null; label: string; active: boolean }[];
        total: number;
    };
    filters: {
        search: string;
        status: string;
        today: boolean;
    };
    statuses: string[];
    can: {
        create: boolean;
    };
};

function isOverdue(task: TaskRow) {
    return (
        task.due_at !== null &&
        new Date(task.due_at) < new Date() &&
        !['completed', 'cancelled'].includes(task.status)
    );
}

export default function TasksIndex({
    tasks: paginated,
    filters,
    statuses,
    can,
}: Props) {
    const { t, label } = useT();
    const format = useFormat();
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [today, setToday] = useState(filters.today);

    function applyFilters(next?: {
        search?: string;
        status?: string;
        today?: boolean;
    }) {
        router.get(
            tasks.index.url(),
            {
                search: next?.search ?? search,
                status: next?.status ?? status,
                today: (next?.today ?? today) ? 1 : undefined,
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
            <Head title={t('Tasks')} />

            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        title={t('Tasks')}
                        description={t('Work assigned to the team.')}
                    />
                    {can.create && (
                        <Button
                            asChild
                            className="shrink-0 max-sm:w-11 max-sm:px-0"
                        >
                            <Link href={tasks.create()}>
                                <Plus />
                                <span className="max-sm:sr-only">
                                    {t('New task')}
                                </span>
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 md:flex md:flex-row md:items-center">
                    <div className="relative sm:col-span-2 md:w-72">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            enterKeyHint="search"
                            value={search}
                            aria-label={t('Search tasks')}
                            placeholder={t('Search tasks')}
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
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            applyFilters({ status: event.target.value });
                        }}
                    >
                        <option value="">{t('All statuses')}</option>
                        {statuses.map((value) => (
                            <option key={value} value={value}>
                                {label('task_status', value)}
                            </option>
                        ))}
                    </select>
                    <Button
                        variant={today ? 'default' : 'outline'}
                        aria-pressed={today}
                        onClick={() => {
                            const next = !today;
                            setToday(next);
                            applyFilters({ today: next });
                        }}
                    >
                        {t('Due today')}
                    </Button>
                </div>

                {paginated.data.length === 0 ? (
                    <EmptyState
                        icon={CheckSquare}
                        title={t('No tasks')}
                        description={
                            filters.search || filters.status || filters.today
                                ? t('Try changing the filters.')
                                : undefined
                        }
                        action={
                            can.create ? (
                                <Button asChild>
                                    <Link href={tasks.create()}>
                                        <Plus />
                                        {t('New task')}
                                    </Link>
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <>
                        <ul className="grid grid-cols-1 gap-3 md:hidden">
                            {paginated.data.map((task) => (
                                <li key={task.id}>
                                    <Link
                                        href={tasks.show(task.id)}
                                        className="block rounded-xl border p-4 active:bg-muted/50"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="min-w-0 font-medium break-words">
                                                {task.title}
                                            </span>
                                            <Badge variant="secondary">
                                                {label(
                                                    'task_status',
                                                    task.status,
                                                )}
                                            </Badge>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span
                                                className={cn(
                                                    isOverdue(task) &&
                                                        'font-medium text-destructive',
                                                )}
                                            >
                                                {isOverdue(task) &&
                                                    `${t('Overdue')} · `}
                                                {format.dateTime(task.due_at)}
                                            </span>
                                            <span>
                                                {label(
                                                    'task_priority',
                                                    task.priority,
                                                )}
                                            </span>
                                            <span>
                                                {task.assigned_to?.name ??
                                                    t('Not assigned')}
                                            </span>
                                            {task.taskable && (
                                                <span className="truncate">
                                                    {task.taskable.name}
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
                                            {t('Task')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {t('Status')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {t('Priority')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {t('Due')}
                                        </th>
                                        <th className="hidden px-4 py-3 font-medium lg:table-cell">
                                            {t('Related to')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.data.map((task) => (
                                        <tr
                                            key={task.id}
                                            className="border-t hover:bg-muted/30"
                                        >
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={tasks.show(task.id)}
                                                    className="font-medium hover:underline"
                                                >
                                                    {task.title}
                                                </Link>
                                                <div className="text-xs text-muted-foreground">
                                                    {task.assigned_to?.name ??
                                                        t('Not assigned')}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="secondary">
                                                    {label(
                                                        'task_status',
                                                        task.status,
                                                    )}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                {label(
                                                    'task_priority',
                                                    task.priority,
                                                )}
                                            </td>
                                            <td
                                                className={cn(
                                                    'px-4 py-3 whitespace-nowrap',
                                                    isOverdue(task) &&
                                                        'text-destructive',
                                                )}
                                            >
                                                {format.dateTime(task.due_at)}
                                            </td>
                                            <td className="hidden px-4 py-3 lg:table-cell">
                                                {task.taskable ? (
                                                    <Link
                                                        href={task.taskable.url}
                                                        className="hover:underline"
                                                    >
                                                        {task.taskable.name}
                                                    </Link>
                                                ) : (
                                                    '—'
                                                )}
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

TasksIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Tasks', href: tasks.index() },
    ],
};
