import { Head, Link, useForm } from '@inertiajs/react';

import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes';
import tasks from '@/routes/tasks';

type Option = { id: number; name: string };

type Props = {
    statuses: string[];
    priorities: string[];
    assignees: Option[];
    taskables: {
        customers: Option[];
        leads: Option[];
        deals: Option[];
        invoices: Option[];
    };
};

export default function TasksCreate({
    statuses,
    priorities,
    assignees,
    taskables,
}: Props) {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        status: 'open',
        priority: 'medium',
        assigned_to: '',
        due_at: '',
        taskable_type: '',
        taskable_id: '',
    });

    const relatedOptions =
        data.taskable_type === 'customer'
            ? taskables.customers
            : data.taskable_type === 'lead'
              ? taskables.leads
              : data.taskable_type === 'deal'
                ? taskables.deals
                : data.taskable_type === 'invoice'
                  ? taskables.invoices
                  : [];

    return (
        <>
            <Head title="New task" />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="New task"
                    description="Create work and optionally link it to a CRM record."
                />

                <form
                    className="space-y-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        post(tasks.store.url());
                    }}
                >
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={data.title}
                            onChange={(event) =>
                                setData('title', event.target.value)
                            }
                            required
                        />
                        <InputError message={errors.title} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                                value={data.status}
                                onChange={(event) =>
                                    setData('status', event.target.value)
                                }
                            >
                                {statuses
                                    .filter((status) => status !== 'completed')
                                    .map((status) => (
                                        <option key={status} value={status}>
                                            {status.replace('_', ' ')}
                                        </option>
                                    ))}
                            </select>
                            <InputError message={errors.status} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="priority">Priority</Label>
                            <select
                                id="priority"
                                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                                value={data.priority}
                                onChange={(event) =>
                                    setData('priority', event.target.value)
                                }
                            >
                                {priorities.map((priority) => (
                                    <option key={priority} value={priority}>
                                        {priority}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.priority} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="due_at">Due at</Label>
                            <Input
                                id="due_at"
                                type="datetime-local"
                                value={data.due_at}
                                onChange={(event) =>
                                    setData('due_at', event.target.value)
                                }
                            />
                            <InputError message={errors.due_at} />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="assigned_to">Assigned to</Label>
                            <select
                                id="assigned_to"
                                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                                value={data.assigned_to}
                                onChange={(event) =>
                                    setData('assigned_to', event.target.value)
                                }
                            >
                                <option value="">Unassigned</option>
                                {assignees.map((assignee) => (
                                    <option
                                        key={assignee.id}
                                        value={assignee.id}
                                    >
                                        {assignee.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.assigned_to} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="taskable_type">Related to</Label>
                            <select
                                id="taskable_type"
                                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                                value={data.taskable_type}
                                onChange={(event) => {
                                    setData('taskable_type', event.target.value);
                                    setData('taskable_id', '');
                                }}
                            >
                                <option value="">Nothing</option>
                                <option value="customer">Customer</option>
                                <option value="lead">Lead</option>
                                <option value="deal">Deal</option>
                                <option value="invoice">Invoice</option>
                            </select>
                            <InputError message={errors.taskable_type} />
                        </div>
                    </div>

                    {data.taskable_type && (
                        <div className="grid gap-2">
                            <Label htmlFor="taskable_id">Record</Label>
                            <select
                                id="taskable_id"
                                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                                value={data.taskable_id}
                                onChange={(event) =>
                                    setData('taskable_id', event.target.value)
                                }
                            >
                                <option value="">Select...</option>
                                {relatedOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.taskable_id} />
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(event) =>
                                setData('description', event.target.value)
                            }
                        />
                        <InputError message={errors.description} />
                    </div>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Create task
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link href={tasks.index()}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

TasksCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Tasks', href: tasks.index() },
        { title: 'New', href: tasks.create() },
    ],
};
