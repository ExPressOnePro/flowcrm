import { Head, Link, router, useForm } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';

import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import customers from '@/routes/customers';
import deals from '@/routes/deals';

type Deal = {
    id: number;
    title: string;
    description: string | null;
    value: string;
    currency: string;
    probability: number;
    status: string;
    expected_close_date: string | null;
    closed_at: string | null;
    lost_reason: string | null;
    pipeline_stage_id: number;
    customer: { id: number; name: string } | null;
    assigned_to: { id: number; name: string } | null;
    created_by: { id: number; name: string } | null;
    stage: {
        id: number;
        name: string;
        probability: number;
        is_won: boolean;
        is_lost: boolean;
    } | null;
    pipeline: { id: number; name: string };
};

type Props = {
    deal: Deal;
    stages: {
        id: number;
        name: string;
        is_won: boolean;
        is_lost: boolean;
    }[];
    can: {
        update: boolean;
        delete: boolean;
        change_stage: boolean;
    };
};

function formatMoney(value: string, currency: string): string {
    const amount = Number(value);

    if (Number.isNaN(amount)) {
        return value;
    }

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function DealsShow({ deal, stages, can }: Props) {
    const stageForm = useForm({
        pipeline_stage_id: String(deal.pipeline_stage_id),
        lost_reason: deal.lost_reason ?? '',
    });

    function deleteDeal() {
        if (!confirm(`Delete deal "${deal.title}"?`)) {
            return;
        }

        router.delete(deals.destroy.url(deal.id));
    }

    return (
        <>
            <Head title={deal.title} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Heading title={deal.title} />
                            <Badge variant="secondary" className="capitalize">
                                {deal.status}
                            </Badge>
                            <Badge variant="outline">
                                {deal.stage?.name ?? 'No stage'}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {formatMoney(deal.value, deal.currency)} ·{' '}
                            {deal.probability}% probability
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {can.update && (
                            <Button variant="outline" asChild>
                                <Link href={deals.edit(deal.id)}>
                                    <Pencil />
                                    Edit
                                </Link>
                            </Button>
                        )}
                        {can.delete && (
                            <Button
                                variant="destructive"
                                onClick={deleteDeal}
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
                                    Customer
                                </dt>
                                <dd className="text-sm font-medium">
                                    {deal.customer ? (
                                        <Link
                                            href={customers.show(
                                                deal.customer.id,
                                            )}
                                            className="hover:underline"
                                        >
                                            {deal.customer.name}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Assigned to
                                </dt>
                                <dd className="text-sm font-medium">
                                    {deal.assigned_to?.name ?? '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Expected close
                                </dt>
                                <dd className="text-sm font-medium">
                                    {deal.expected_close_date ?? '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Pipeline
                                </dt>
                                <dd className="text-sm font-medium">
                                    {deal.pipeline.name}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-sm text-muted-foreground">
                                    Description
                                </dt>
                                <dd className="text-sm font-medium break-words">
                                    {deal.description || '—'}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {can.change_stage && (
                        <div className="space-y-4 rounded-xl border p-5">
                            <h3 className="font-medium">Move stage</h3>
                            <form
                                className="space-y-4"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    stageForm.patch(deals.stage.url(deal.id), {
                                        preserveScroll: true,
                                    });
                                }}
                            >
                                <div className="grid gap-2">
                                    <Label htmlFor="pipeline_stage_id">
                                        Stage
                                    </Label>
                                    <select
                                        id="pipeline_stage_id"
                                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
                                        value={stageForm.data.pipeline_stage_id}
                                        onChange={(event) =>
                                            stageForm.setData(
                                                'pipeline_stage_id',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        {stages.map((stage) => (
                                            <option
                                                key={stage.id}
                                                value={stage.id}
                                            >
                                                {stage.name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError
                                        message={
                                            stageForm.errors.pipeline_stage_id
                                        }
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="lost_reason">
                                        Lost reason
                                    </Label>
                                    <Input
                                        id="lost_reason"
                                        value={stageForm.data.lost_reason}
                                        onChange={(event) =>
                                            stageForm.setData(
                                                'lost_reason',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={stageForm.errors.lost_reason}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={stageForm.processing}
                                >
                                    {stageForm.processing && <Spinner />}
                                    Update stage
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

DealsShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Deals', href: deals.index() },
        { title: 'Deal', href: '#' },
    ],
};
