import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type CustomerFormData = {
    type: string;
    name: string;
    company_name: string;
    email: string;
    phone: string;
    website: string;
    tax_id: string;
    country: string;
    city: string;
    address: string;
    status: string;
    source: string;
    assigned_to: string;
    notes: string;
};

type Assignee = {
    id: number;
    name: string;
};

type Props = {
    data: CustomerFormData;
    setData: (key: keyof CustomerFormData, value: string) => void;
    errors: Partial<Record<keyof CustomerFormData, string>>;
    types: string[];
    statuses: string[];
    assignees: Assignee[];
};

export function CustomerForm({
    data,
    setData,
    errors,
    types,
    statuses,
    assignees,
}: Props) {
    return (
        <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="type">Type</Label>
                    <select
                        id="type"
                        className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                        value={data.type}
                        onChange={(event) => setData('type', event.target.value)}
                    >
                        {types.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.type} />
                </div>

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
                        {statuses.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.status} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(event) => setData('name', event.target.value)}
                    required
                />
                <InputError message={errors.name} />
            </div>

            {data.type === 'company' && (
                <div className="grid gap-2">
                    <Label htmlFor="company_name">Company name</Label>
                    <Input
                        id="company_name"
                        value={data.company_name}
                        onChange={(event) =>
                            setData('company_name', event.target.value)
                        }
                    />
                    <InputError message={errors.company_name} />
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
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

            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                        id="website"
                        type="url"
                        placeholder="https://"
                        value={data.website}
                        onChange={(event) =>
                            setData('website', event.target.value)
                        }
                    />
                    <InputError message={errors.website} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="tax_id">Tax ID</Label>
                    <Input
                        id="tax_id"
                        value={data.tax_id}
                        onChange={(event) =>
                            setData('tax_id', event.target.value)
                        }
                    />
                    <InputError message={errors.tax_id} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                        id="country"
                        value={data.country}
                        onChange={(event) =>
                            setData('country', event.target.value)
                        }
                    />
                    <InputError message={errors.country} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                        id="city"
                        value={data.city}
                        onChange={(event) => setData('city', event.target.value)}
                    />
                    <InputError message={errors.city} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="source">Source</Label>
                    <Input
                        id="source"
                        value={data.source}
                        onChange={(event) =>
                            setData('source', event.target.value)
                        }
                    />
                    <InputError message={errors.source} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                    id="address"
                    value={data.address}
                    onChange={(event) => setData('address', event.target.value)}
                />
                <InputError message={errors.address} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="assigned_to">Assigned to</Label>
                <select
                    id="assigned_to"
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
                    value={data.assigned_to}
                    onChange={(event) =>
                        setData('assigned_to', event.target.value)
                    }
                >
                    <option value="">Unassigned</option>
                    {assignees.map((assignee) => (
                        <option key={assignee.id} value={String(assignee.id)}>
                            {assignee.name}
                        </option>
                    ))}
                </select>
                <InputError message={errors.assigned_to} />
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
        </div>
    );
}
