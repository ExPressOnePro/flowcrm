import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type LeadFormData = {
    first_name: string;
    last_name: string;
    company_name: string;
    email: string;
    phone: string;
    source: string;
    status: string;
    estimated_value: string;
    currency: string;
    assigned_to: string;
    notes: string;
};

type Assignee = {
    id: number;
    name: string;
};

type Props = {
    data: LeadFormData;
    setData: (key: keyof LeadFormData, value: string) => void;
    errors: Partial<Record<keyof LeadFormData, string>>;
    statuses: string[];
    assignees: Assignee[];
};

export function LeadForm({
    data,
    setData,
    errors,
    statuses,
    assignees,
}: Props) {
    return (
        <div className="grid gap-6">
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

            <div className="grid gap-2">
                <Label htmlFor="company_name">Company</Label>
                <Input
                    id="company_name"
                    value={data.company_name}
                    onChange={(event) =>
                        setData('company_name', event.target.value)
                    }
                />
                <InputError message={errors.company_name} />
            </div>

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
                        {statuses.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.status} />
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
                            <option
                                key={assignee.id}
                                value={String(assignee.id)}
                            >
                                {assignee.name}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.assigned_to} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="estimated_value">Estimated value</Label>
                    <Input
                        id="estimated_value"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.estimated_value}
                        onChange={(event) =>
                            setData('estimated_value', event.target.value)
                        }
                    />
                    <InputError message={errors.estimated_value} />
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
