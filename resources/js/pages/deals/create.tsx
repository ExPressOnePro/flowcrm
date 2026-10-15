import { Head, Link, useForm } from '@inertiajs/react';

import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes';
import deals from '@/routes/deals';

type Props = {
    pipeline: {
        id: number;
        name: string;
        stages: { id: number; name: string }[];
    };
    customers: { id: number; name: string }[];
    assignees: { id: number; name: string }[];
    default_currency: string;
};

export default function DealsCreate({
    pipeline,
    customers,
    assignees,
    default_currency,
}: Props) {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        value: '0',
        currency: default_currency,
        pipeline_id: String(pipeline.id),
        pipeline_stage_id: pipeline.stages[0]
            ? String(pipeline.stages[0].id)
            : '',
        customer_id: '',
        assigned_to: '',
        expected_close_date: '',
    });

    return (
        <>
            <Head title="New deal" />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="New deal"
                    description={`Add an opportunity to ${pipeline.name}.`}
                />

                <form
                    className="space-y-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        post(deals.store.url());
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

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="value">Value</Label>
                            <Input
                                id="value"
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.value}
                                onChange={(event) =>
                                    setData('value', event.target.value)
                                }
                                required
                            />
                            <InputError message={errors.value} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="currency">Currency</Label>
                            <Input
                                id="currency"
                                value={data.currency}
                                maxLength={3}
                                onChange={(event) =>
                                    setData(
                                        'currency',
                                        event.target.value.toUpperCase(),
                                    )
                                }
                            />
                            <InputError message={errors.currency} />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="pipeline_stage_id">Stage</Label>
                            <select
                                id="pipeline_stage_id"
                                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                                value={data.pipeline_stage_id}
                                onChange={(event) =>
                                    setData(
                                        'pipeline_stage_id',
                                        event.target.value,
                                    )
                                }
                            >
                                {pipeline.stages.map((stage) => (
                                    <option key={stage.id} value={stage.id}>
                                        {stage.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.pipeline_stage_id} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="customer_id">Customer</Label>
                            <select
                                id="customer_id"
                                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                                value={data.customer_id}
                                onChange={(event) =>
                                    setData('customer_id', event.target.value)
                                }
                            >
                                <option value="">No customer</option>
                                {customers.map((customer) => (
                                    <option
                                        key={customer.id}
                                        value={customer.id}
                                    >
                                        {customer.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.customer_id} />
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
                            <Label htmlFor="expected_close_date">
                                Expected close date
                            </Label>
                            <Input
                                id="expected_close_date"
                                type="date"
                                value={data.expected_close_date}
                                onChange={(event) =>
                                    setData(
                                        'expected_close_date',
                                        event.target.value,
                                    )
                                }
                            />
                            <InputError message={errors.expected_close_date} />
                        </div>
                    </div>

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
                            Create deal
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link href={deals.index()}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

DealsCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Deals', href: deals.index() },
        { title: 'New', href: deals.create() },
    ],
};
