import { Form, Head, Link, router, useForm } from '@inertiajs/react';
import { Send, Trash2 } from 'lucide-react';

import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes';
import customers from '@/routes/customers';
import invoices, { send } from '@/routes/invoices';
import { store as storePayment } from '@/routes/invoices/payments';

type Props = {
    invoice: {
        id: number;
        number: string;
        status: string;
        issue_date: string | null;
        due_date: string | null;
        currency: string;
        subtotal: string;
        tax: string;
        discount: string;
        total: string;
        paid_amount: string;
        balance: string;
        notes: string | null;
        customer: { id: number; name: string; email: string | null } | null;
        created_by: { id: number; name: string } | null;
        items: {
            id: number;
            description: string;
            quantity: string;
            unit_price: string;
            tax_rate: string;
            total: string;
        }[];
        payments: {
            id: number;
            amount: string;
            currency: string;
            payment_method: string | null;
            reference: string | null;
            paid_at: string | null;
            notes: string | null;
            created_by: string | null;
        }[];
    };
    can: {
        send: boolean;
        pay: boolean;
        delete: boolean;
    };
};

function money(value: string, currency: string) {
    const amount = Number(value);

    if (Number.isNaN(amount)) {
        return value;
    }

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    }).format(amount);
}

export default function InvoicesShow({ invoice, can }: Props) {
    const paymentForm = useForm({
        amount: invoice.balance,
        currency: invoice.currency,
        payment_method: 'bank_transfer',
        reference: '',
        paid_at: new Date().toISOString().slice(0, 16),
        notes: '',
    });

    function deleteInvoice() {
        if (!confirm(`Delete or cancel invoice ${invoice.number}?`)) {
            return;
        }

        router.delete(invoices.destroy.url(invoice.id));
    }

    return (
        <>
            <Head title={invoice.number} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Heading title={invoice.number} />
                            <Badge variant="secondary" className="capitalize">
                                {invoice.status}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {invoice.customer ? (
                                <Link
                                    href={customers.show(invoice.customer.id)}
                                    className="hover:underline"
                                >
                                    {invoice.customer.name}
                                </Link>
                            ) : (
                                'No customer'
                            )}
                            {' · '}
                            Balance {money(invoice.balance, invoice.currency)}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {can.send && (
                            <Form {...send.form(invoice.id)}>
                                {({ processing }) => (
                                    <Button type="submit" disabled={processing}>
                                        {processing && <Spinner />}
                                        <Send />
                                        Mark as sent
                                    </Button>
                                )}
                            </Form>
                        )}
                        {can.delete && (
                            <Button
                                variant="destructive"
                                onClick={deleteInvoice}
                            >
                                <Trash2 />
                                Delete
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-4 rounded-xl border p-5 lg:col-span-2">
                        <h3 className="font-medium">Line items</h3>
                        <div className="overflow-hidden rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">
                                            Description
                                        </th>
                                        <th className="px-3 py-2 font-medium">
                                            Qty
                                        </th>
                                        <th className="px-3 py-2 font-medium">
                                            Price
                                        </th>
                                        <th className="px-3 py-2 font-medium">
                                            Tax
                                        </th>
                                        <th className="px-3 py-2 font-medium">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.items.map((item) => (
                                        <tr key={item.id} className="border-t">
                                            <td className="px-3 py-2">
                                                {item.description}
                                            </td>
                                            <td className="px-3 py-2">
                                                {item.quantity}
                                            </td>
                                            <td className="px-3 py-2">
                                                {money(
                                                    item.unit_price,
                                                    invoice.currency,
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {item.tax_rate}%
                                            </td>
                                            <td className="px-3 py-2">
                                                {money(
                                                    item.total,
                                                    invoice.currency,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <dl className="ml-auto grid max-w-xs gap-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">
                                    Subtotal
                                </dt>
                                <dd>
                                    {money(invoice.subtotal, invoice.currency)}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Tax</dt>
                                <dd>
                                    {money(invoice.tax, invoice.currency)}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">
                                    Discount
                                </dt>
                                <dd>
                                    {money(invoice.discount, invoice.currency)}
                                </dd>
                            </div>
                            <div className="flex justify-between font-medium">
                                <dt>Total</dt>
                                <dd>
                                    {money(invoice.total, invoice.currency)}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Paid</dt>
                                <dd>
                                    {money(
                                        invoice.paid_amount,
                                        invoice.currency,
                                    )}
                                </dd>
                            </div>
                            <div className="flex justify-between font-medium">
                                <dt>Balance</dt>
                                <dd>
                                    {money(invoice.balance, invoice.currency)}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div className="space-y-4">
                        {can.pay && (
                            <div className="space-y-4 rounded-xl border p-5">
                                <h3 className="font-medium">Record payment</h3>
                                <form
                                    className="space-y-3"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        paymentForm.post(
                                            storePayment.url(invoice.id),
                                            { preserveScroll: true },
                                        );
                                    }}
                                >
                                    <div className="grid gap-2">
                                        <Label htmlFor="amount">Amount</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={paymentForm.data.amount}
                                            onChange={(event) =>
                                                paymentForm.setData(
                                                    'amount',
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                        <InputError
                                            message={paymentForm.errors.amount}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="payment_method">
                                            Method
                                        </Label>
                                        <Input
                                            id="payment_method"
                                            value={
                                                paymentForm.data.payment_method
                                            }
                                            onChange={(event) =>
                                                paymentForm.setData(
                                                    'payment_method',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="reference">
                                            Reference
                                        </Label>
                                        <Input
                                            id="reference"
                                            value={paymentForm.data.reference}
                                            onChange={(event) =>
                                                paymentForm.setData(
                                                    'reference',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="paid_at">Paid at</Label>
                                        <Input
                                            id="paid_at"
                                            type="datetime-local"
                                            value={paymentForm.data.paid_at}
                                            onChange={(event) =>
                                                paymentForm.setData(
                                                    'paid_at',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="notes">Notes</Label>
                                        <Textarea
                                            id="notes"
                                            value={paymentForm.data.notes}
                                            onChange={(event) =>
                                                paymentForm.setData(
                                                    'notes',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={paymentForm.processing}
                                    >
                                        {paymentForm.processing && <Spinner />}
                                        Record payment
                                    </Button>
                                </form>
                            </div>
                        )}

                        <div className="space-y-3 rounded-xl border p-5">
                            <h3 className="font-medium">Payments</h3>
                            {invoice.payments.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No payments yet.
                                </p>
                            ) : (
                                invoice.payments.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className="rounded-lg border p-3 text-sm"
                                    >
                                        <div className="font-medium">
                                            {money(
                                                payment.amount,
                                                payment.currency,
                                            )}
                                        </div>
                                        <div className="text-muted-foreground">
                                            {payment.paid_at
                                                ? new Date(
                                                      payment.paid_at,
                                                  ).toLocaleString()
                                                : '—'}
                                            {payment.payment_method
                                                ? ` · ${payment.payment_method}`
                                                : ''}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

InvoicesShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Invoices', href: invoices.index() },
        { title: 'Invoice', href: '#' },
    ],
};
