import { Form, Head, Link, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { dashboard } from '@/routes';
import customers from '@/routes/customers';
import {
    destroy as destroyContact,
    store as storeContact,
    update as updateContact,
} from '@/routes/customers/contacts';

type Contact = {
    id: number;
    first_name: string;
    last_name: string;
    name: string;
    position: string | null;
    email: string | null;
    phone: string | null;
    is_primary: boolean;
    notes: string | null;
};

type Customer = {
    id: number;
    type: string;
    name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    tax_id: string | null;
    country: string | null;
    city: string | null;
    address: string | null;
    status: string;
    source: string | null;
    notes: string | null;
    assigned_to: { id: number; name: string; email: string } | null;
    created_by: { id: number; name: string } | null;
    contacts: Contact[];
    created_at: string | null;
};

type Props = {
    customer: Customer;
    can: {
        update: boolean;
        delete: boolean;
        manage_contacts: boolean;
    };
};

type ContactFormState = {
    first_name: string;
    last_name: string;
    position: string;
    email: string;
    phone: string;
    is_primary: boolean;
    notes: string;
};

const emptyContact = (): ContactFormState => ({
    first_name: '',
    last_name: '',
    position: '',
    email: '',
    phone: '',
    is_primary: false,
    notes: '',
});

export default function CustomersShow({ customer, can }: Props) {
    const [editingContactId, setEditingContactId] = useState<number | null>(
        null,
    );
    const [showForm, setShowForm] = useState(false);

    const createForm = useForm<ContactFormState>(emptyContact());
    const editForm = useForm<ContactFormState>(emptyContact());

    function startEdit(contact: Contact) {
        setEditingContactId(contact.id);
        setShowForm(false);
        editForm.setData({
            first_name: contact.first_name,
            last_name: contact.last_name,
            position: contact.position ?? '',
            email: contact.email ?? '',
            phone: contact.phone ?? '',
            is_primary: contact.is_primary,
            notes: contact.notes ?? '',
        });
    }

    function deleteCustomer() {
        if (
            !confirm(
                `Delete customer "${customer.name}"? This cannot be undone.`,
            )
        ) {
            return;
        }

        router.delete(customers.destroy.url(customer.id));
    }

    return (
        <>
            <Head title={customer.name} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Heading title={customer.name} />
                            <Badge variant="secondary" className="capitalize">
                                {customer.status}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                                {customer.type}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {[customer.city, customer.country]
                                .filter(Boolean)
                                .join(', ') || 'No location set'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {can.update && (
                            <Button variant="outline" asChild>
                                <Link href={customers.edit(customer.id)}>
                                    <Pencil />
                                    Edit
                                </Link>
                            </Button>
                        )}
                        {can.delete && (
                            <Button
                                variant="destructive"
                                onClick={deleteCustomer}
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
                            <Detail label="Email" value={customer.email} />
                            <Detail label="Phone" value={customer.phone} />
                            <Detail label="Website" value={customer.website} />
                            <Detail label="Tax ID" value={customer.tax_id} />
                            <Detail label="Source" value={customer.source} />
                            <Detail
                                label="Assigned to"
                                value={customer.assigned_to?.name}
                            />
                            <Detail
                                label="Address"
                                value={customer.address}
                                className="sm:col-span-2"
                            />
                            <Detail
                                label="Notes"
                                value={customer.notes}
                                className="sm:col-span-2"
                            />
                        </dl>
                    </div>

                    <div className="space-y-4 rounded-xl border p-5">
                        <h3 className="font-medium">Meta</h3>
                        <dl className="space-y-3 text-sm">
                            <div>
                                <dt className="text-muted-foreground">
                                    Created by
                                </dt>
                                <dd>{customer.created_by?.name ?? '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Company name
                                </dt>
                                <dd>{customer.company_name ?? '—'}</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                <div className="space-y-4 rounded-xl border p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-medium">Contacts</h3>
                            <p className="text-sm text-muted-foreground">
                                People linked to this customer.
                            </p>
                        </div>
                        {can.manage_contacts && (
                            <Button
                                size="sm"
                                onClick={() => {
                                    setShowForm(true);
                                    setEditingContactId(null);
                                    createForm.setData(emptyContact());
                                }}
                            >
                                <Plus />
                                Add contact
                            </Button>
                        )}
                    </div>

                    {showForm && (
                        <ContactFormFields
                            data={createForm.data}
                            setData={createForm.setData}
                            errors={createForm.errors}
                            processing={createForm.processing}
                            submitLabel="Add contact"
                            onCancel={() => setShowForm(false)}
                            onSubmit={() =>
                                createForm.post(
                                    storeContact.url(customer.id),
                                    {
                                        onSuccess: () => {
                                            createForm.reset();
                                            setShowForm(false);
                                        },
                                    },
                                )
                            }
                        />
                    )}

                    {customer.contacts.length === 0 && !showForm ? (
                        <EmptyState
                            icon={Users}
                            title="No contacts"
                            description="Add decision makers and day-to-day contacts for this account."
                        />
                    ) : (
                        <div className="space-y-3">
                            {customer.contacts.map((contact) =>
                                editingContactId === contact.id ? (
                                    <ContactFormFields
                                        key={contact.id}
                                        data={editForm.data}
                                        setData={editForm.setData}
                                        errors={editForm.errors}
                                        processing={editForm.processing}
                                        submitLabel="Save contact"
                                        onCancel={() =>
                                            setEditingContactId(null)
                                        }
                                        onSubmit={() =>
                                            editForm.put(
                                                updateContact.url({
                                                    customer: customer.id,
                                                    contact: contact.id,
                                                }),
                                                {
                                                    onSuccess: () =>
                                                        setEditingContactId(
                                                            null,
                                                        ),
                                                },
                                            )
                                        }
                                    />
                                ) : (
                                    <div
                                        key={contact.id}
                                        className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                                    >
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-medium">
                                                    {contact.name}
                                                </p>
                                                {contact.is_primary && (
                                                    <Badge>Primary</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {contact.position ??
                                                    'No position'}
                                            </p>
                                            <p className="mt-2 text-sm">
                                                {[contact.email, contact.phone]
                                                    .filter(Boolean)
                                                    .join(' · ') ||
                                                    'No contact details'}
                                            </p>
                                        </div>

                                        {can.manage_contacts && (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        startEdit(contact)
                                                    }
                                                >
                                                    Edit
                                                </Button>
                                                <Form
                                                    {...destroyContact.form({
                                                        customer: customer.id,
                                                        contact: contact.id,
                                                    })}
                                                    onSubmit={(event) => {
                                                        if (
                                                            !confirm(
                                                                `Delete contact "${contact.name}"?`,
                                                            )
                                                        ) {
                                                            event.preventDefault();
                                                        }
                                                    }}
                                                >
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        type="submit"
                                                    >
                                                        Delete
                                                    </Button>
                                                </Form>
                                            </div>
                                        )}
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function Detail({
    label,
    value,
    className,
}: {
    label: string;
    value?: string | null;
    className?: string;
}) {
    return (
        <div className={className}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium break-words">
                {value || '—'}
            </dd>
        </div>
    );
}

function ContactFormFields({
    data,
    setData,
    errors,
    processing,
    submitLabel,
    onSubmit,
    onCancel,
}: {
    data: ContactFormState;
    setData: {
        (key: keyof ContactFormState, value: string | boolean): void;
    };
    errors: Partial<Record<keyof ContactFormState, string>>;
    processing: boolean;
    submitLabel: string;
    onSubmit: () => void;
    onCancel: () => void;
}) {
    return (
        <form
            className="space-y-4 rounded-lg border bg-muted/20 p-4"
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="first_name">First name</Label>
                    <Input
                        id="first_name"
                        value={data.first_name}
                        onChange={(event) =>
                            setData('first_name', event.target.value)
                        }
                        required
                    />
                    <InputError message={errors.first_name} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="last_name">Last name</Label>
                    <Input
                        id="last_name"
                        value={data.last_name}
                        onChange={(event) =>
                            setData('last_name', event.target.value)
                        }
                        required
                    />
                    <InputError message={errors.last_name} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                        id="position"
                        value={data.position}
                        onChange={(event) =>
                            setData('position', event.target.value)
                        }
                    />
                    <InputError message={errors.position} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(event) =>
                            setData('email', event.target.value)
                        }
                    />
                    <InputError message={errors.email} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                        id="phone"
                        value={data.phone}
                        onChange={(event) =>
                            setData('phone', event.target.value)
                        }
                    />
                    <InputError message={errors.phone} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                    id="notes"
                    value={data.notes}
                    onChange={(event) => setData('notes', event.target.value)}
                />
                <InputError message={errors.notes} />
            </div>

            <div className="flex items-center gap-2">
                <Checkbox
                    id="is_primary"
                    checked={data.is_primary}
                    onCheckedChange={(checked) =>
                        setData('is_primary', checked === true)
                    }
                />
                <Label htmlFor="is_primary">Primary contact</Label>
            </div>

            <div className="flex gap-2">
                <Button type="submit" disabled={processing}>
                    {processing && <Spinner />}
                    {submitLabel}
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}

CustomersShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Customers', href: customers.index() },
        { title: 'Customer', href: '#' },
    ],
};
