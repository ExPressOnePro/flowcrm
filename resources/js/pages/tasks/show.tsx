import { Form, Head, Link, router } from '@inertiajs/react';
import { Check, Pencil, Trash2 } from 'lucide-react';

import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import tasks, { complete } from '@/routes/tasks';

type Props = {
    task: {
        id: number;
        title: string;
        description: string | null;
        status: string;
        priority: string;
        due_at: string | null;
        completed_at: string | null;
        assigned_to: { id: number; name: string } | null;
        created_by: { id: number; name: string } | null;
        taskable: {
            type: string;
            id: number;
            name: string;
            url: string;
        } | null;
    };
    can: {
        update: boolean;
        delete: boolean;
        complete: boolean;
    };
};

export default function TasksShow({ task, can }: Props) {
    function deleteTask() {
        if (!confirm(`Delete task "${task.title}"?`)) {
            return;
        }

        router.delete(tasks.destroy.url(task.id));
    }

    return (
        <>
            <Head title={task.title} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Heading title={task.title} />
                            <Badge variant="secondary" className="capitalize">
                                {task.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                                {task.priority}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {task.due_at
                                ? `Due ${new Date(task.due_at).toLocaleString()}`
                                : 'No due date'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {can.complete && (
                            <Form {...complete.form(task.id)}>
                                {({ processing }) => (
                                    <Button type="submit" disabled={processing}>
                                        {processing && <Spinner />}
                                        <Check />
                                        Mark completed
                                    </Button>
                                )}
                            </Form>
                        )}
                        {can.update && (
                            <Button variant="outline" asChild>
                                <Link href={tasks.edit(task.id)}>
                                    <Pencil />
                                    Edit
                                </Link>
                            </Button>
                        )}
                        {can.delete && (
                            <Button
                                variant="destructive"
                                onClick={deleteTask}
                            >
                                <Trash2 />
                                Delete
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-4 rounded-xl border p-5 lg:col-span-2">
                        <h3 className="font-medium">Details</h3>
                        <dl className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Assigned to
                                </dt>
                                <dd className="text-sm font-medium">
                                    {task.assigned_to?.name ?? '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Created by
                                </dt>
                                <dd className="text-sm font-medium">
                                    {task.created_by?.name ?? '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Related
                                </dt>
                                <dd className="text-sm font-medium">
                                    {task.taskable ? (
                                        <Link
                                            href={task.taskable.url}
                                            className="hover:underline"
                                        >
                                            {task.taskable.type}:{' '}
                                            {task.taskable.name}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Completed at
                                </dt>
                                <dd className="text-sm font-medium">
                                    {task.completed_at
                                        ? new Date(
                                              task.completed_at,
                                          ).toLocaleString()
                                        : '—'}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-sm text-muted-foreground">
                                    Description
                                </dt>
                                <dd className="text-sm font-medium break-words">
                                    {task.description || '—'}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>
        </>
    );
}

TasksShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Tasks', href: tasks.index() },
        { title: 'Task', href: '#' },
    ],
};
