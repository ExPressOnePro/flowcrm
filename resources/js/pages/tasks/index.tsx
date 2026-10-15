import { Head, Link, router } from '@inertiajs/react';
import { CheckSquare, Plus } from 'lucide-react';
import { useState } from 'react';

import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
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

export default function TasksIndex({
    tasks: paginated,
    filters,
    statuses,
    can,
}: Props) {
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
            <Head title="Tasks" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title="Tasks"
                        description="Track work across customers, leads, and deals."
                    />
                    {can.create && (
                        <Button asChild>
                            <Link href={tasks.create()}>
                                <Plus />
                                New task
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <Input
                        value={search}
                        placeholder="Search tasks..."
                        className="md:max-w-xs"
                        onChange={(event) => setSearch(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                applyFilters();
                            }
                        }}
                    />
                    <select
                        className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            applyFilters({ status: event.target.value });
                        }}
                    >
                        <option value="">All statuses</option>
                        {statuses.map((value) => (
                            <option key={value} value={value}>
                                {value.replace('_', ' ')}
                            </option>
                        ))}
                    </select>
                    <Button
                        variant={today ? 'default' : 'secondary'}
                        onClick={() => {
                            const next = !today;
                            setToday(next);
                            applyFilters({ today: next });
                        }}
                    >
                        Due today
                    </Button>
                    <Button variant="secondary" onClick={() => applyFilters()}>
                        Search
                    </Button>
                </div>

                {paginated.data.length === 0 ? (
                    <EmptyState
                        icon={CheckSquare}
                        title="No tasks"
                        description="Create a task and link it to a customer, lead, or deal."
                        action={
                            can.create ? (
                                <Button asChild>
                                    <Link href={tasks.create()}>
                                        <Plus />
                                        New task
                                    </Link>
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="overflow-hidden rounded-xl border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-left text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">
                                        Task
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Status
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium sm:table-cell">
                                        Priority
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium md:table-cell">
                                        Due
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium lg:table-cell">
                                        Related
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
                                                    'Unassigned'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="secondary"
                                                className="capitalize"
                                            >
                                                {task.status.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="hidden px-4 py-3 capitalize sm:table-cell">
                                            {task.priority}
                                        </td>
                                        <td className="hidden px-4 py-3 md:table-cell">
                                            {task.due_at
                                                ? new Date(
                                                      task.due_at,
                                                  ).toLocaleString()
                                                : '—'}
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
                )}

                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                        {paginated.total} tasks
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
