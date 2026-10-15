import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';

import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes';
import invoices from '@/routes/invoices';

type Item = {
    description: string;
    quantity: string;
    unit_price: string;
    tax_rate: string;
};

type Props = {
    customers: { id: number; name: string }[];
    default_currency: string;
};

const emptyItem = (): Item => ({
    description: '',
    quantity: '1',
    unit_price: '0',
    tax_rate: '20',
});

export default function InvoicesCreate({
    customers,
    default_currency,
}: Props) {
    const { data, setData, post, processing, errors } = useForm({
        customer_id: '',
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: new Date(Date.now() + 14 * 86400000)
            .toISOString()
            .slice(0, 10),
        currency: default_currency,
        discount: '0',
        notes: '',
        status: 'draft',
        items: [emptyItem()] as Item[],
    });

    function updateItem(index: number, key: keyof Item, value: string) {
        const items = data.items.map((item, itemIndex) =>
            itemIndex === index ? { ...item, [key]: value } : item,
        );
        setData('items', items);
    }

    return (
        <>
            <Head title="New invoice" />

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="New invoice"
                    description="Add line items and totals will calculate automatically."
                />

                <form
                    className="space-y-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        post(invoices.store.url());
                    }}
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="customer_id">Customer</Label>
                            <select
                                id="customer_id"
                                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                                value={data.customer_id}
                                onChange={(event) =>
                                    setData('customer_id', event.target.value)
                                }
                                required
                            >
                                <option value="">Select customer</option>
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

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="grid gap-2">
                            <Label htmlFor="issue_date">Issue date</Label>
                            <Input
                                id="issue_date"
                                type="date"
                                value={data.issue_date}
                                onChange={(event) =>
                                    setData('issue_date', event.target.value)
                                }
                                required
                            />
                            <InputError message={errors.issue_date} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="due_date">Due date</Label>
                            <Input
                                id="due_date"
                                type="date"
                                value={data.due_date}
                                onChange={(event) =>
                                    setData('due_date', event.target.value)
                                }
                                required
                            />
                            <InputError message={errors.due_date} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="discount">Discount</Label>
                            <Input
                                id="discount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.discount}
                                onChange={(event) =>
                                    setData('discount', event.target.value)
                                }
                            />
                            <InputError message={errors.discount} />
                        </div>
                    </div>

                    <div className="space-y-3 rounded-xl border p-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium">Line items</h3>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    setData('items', [
                                        ...data.items,
                                        emptyItem(),
                                    ])
                                }
                            >
                                <Plus />
                                Add line
                            </Button>
                        </div>

                        {data.items.map((item, index) => (
                            <div
                                key={index}
                                className="grid gap-3 rounded-lg border p-3 md:grid-cols-12"
                            >
                                <div className="grid gap-2 md:col-span-5">
                                    <Label>Description</Label>
                                    <Input
                                        value={item.description}
                                        onChange={(event) =>
                                            updateItem(
                                                index,
                                                'description',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Qty</Label>
                                    <Input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={item.quantity}
                                        onChange={(event) =>
                                            updateItem(
                                                index,
                                                'quantity',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Price</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unit_price}
                                        onChange={(event) =>
                                            updateItem(
                                                index,
                                                'unit_price',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Tax %</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={item.tax_rate}
                                        onChange={(event) =>
                                            updateItem(
                                                index,
                                                'tax_rate',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="flex items-end md:col-span-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={data.items.length === 1}
                                        onClick={() =>
                                            setData(
                                                'items',
                                                data.items.filter(
                                                    (_, itemIndex) =>
                                                        itemIndex !== index,
                                                ),
                                            )
                                        }
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <InputError message={errors.items} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={data.notes}
                            onChange={(event) =>
                                setData('notes', event.target.value)
                            }
                        />
                        <InputError message={errors.notes} />
                    </div>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Create invoice
                        </Button>
                        <Button variant="ghost" asChild>
                            <Link href={invoices.index()}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

InvoicesCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Invoices', href: invoices.index() },
        { title: 'New', href: invoices.create() },
    ],
};
