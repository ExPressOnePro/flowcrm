import { Head, useForm } from '@inertiajs/react';
import { Check, Minus, Pencil, Plus, Shapes } from 'lucide-react';
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
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import typeRoutes from '@/routes/vehicle-types';

type VehicleType = {
    id: number;
    name: string;
    category: string;
    can_tow: boolean;
    is_towable: boolean;
    has_odometer: boolean;
    is_active: boolean;
    vehicles_count: number;
};

type FormData = {
    name: string;
    category: string;
    can_tow: boolean;
    is_towable: boolean;
    has_odometer: boolean;
    is_active: boolean;
};

const empty: FormData = {
    name: '',
    category: 'truck',
    can_tow: false,
    is_towable: false,
    has_odometer: true,
    is_active: true,
};

function Flag({ value }: { value: boolean }) {
    return value ? (
        <Check className="size-4 text-emerald-600" />
    ) : (
        <Minus className="size-4 text-muted-foreground" />
    );
}

export default function VehicleTypesIndex({
    types,
    categories,
}: {
    types: VehicleType[];
    categories: string[];
}) {
    const { t, label } = useT();
    const [editing, setEditing] = useState<VehicleType | 'new' | null>(null);
    const form = useForm<FormData>(empty);

    function open(type: VehicleType | 'new') {
        form.clearErrors();
        form.setData(
            type === 'new'
                ? empty
                : {
                      name: type.name,
                      category: type.category,
                      can_tow: type.can_tow,
                      is_towable: type.is_towable,
                      has_odometer: type.has_odometer,
                      is_active: type.is_active,
                  },
        );
        setEditing(type);
    }

    function submit() {
        const options = {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        };

        if (editing === 'new') {
            form.post(typeRoutes.store.url(), options);
        } else if (editing) {
            form.put(typeRoutes.update.url(editing.id), options);
        }
    }

    const flags: { key: keyof FormData; title: string }[] = [
        { key: 'can_tow', title: t('Can tow trailers') },
        { key: 'is_towable', title: t('Is a trailer') },
        { key: 'has_odometer', title: t('Has odometer') },
        { key: 'is_active', title: t('Active') },
    ];

    return (
        <>
            <Head title={t('Vehicle types')} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title={t('Vehicle types')}
                        description={t('Vehicle types and their behaviour.')}
                    />
                    <Button onClick={() => open('new')}>
                        <Plus />
                        {t('New vehicle type')}
                    </Button>
                </div>

                {editing && (
                    <form
                        className="grid gap-4 rounded-xl border p-4 md:grid-cols-2"
                        onSubmit={(event) => {
                            event.preventDefault();
                            submit();
                        }}
                    >
                        <h2 className="text-base font-medium md:col-span-2">
                            {editing === 'new'
                                ? t('New vehicle type')
                                : t('Edit vehicle type')}
                        </h2>
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t('Name')}</Label>
                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData('name', e.target.value)
                                }
                                required
                            />
                            <InputError message={form.errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">{t('Category')}</Label>
                            <select
                                id="category"
                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs"
                                value={form.data.category}
                                onChange={(e) =>
                                    form.setData('category', e.target.value)
                                }
                            >
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {label('vehicle_category', category)}
                                    </option>
                                ))}
                            </select>
                            <InputError message={form.errors.category} />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 md:col-span-2 lg:grid-cols-4">
                            {flags.map((flag) => (
                                <label
                                    key={flag.key}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <Checkbox
                                        checked={form.data[flag.key] as boolean}
                                        onCheckedChange={(checked) =>
                                            form.setData(
                                                flag.key,
                                                checked === true,
                                            )
                                        }
                                    />
                                    {flag.title}
                                </label>
                            ))}
                        </div>
                        <div className="md:col-span-2">
                            <InputError message={form.errors.is_towable} />
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'Deactivate instead of deleting to keep history.',
                                )}
                            </p>
                        </div>
                        <div className="flex gap-2 md:col-span-2">
                            <Button type="submit" disabled={form.processing}>
                                {form.processing && <Spinner />}
                                {t('Save')}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setEditing(null)}
                            >
                                {t('Cancel')}
                            </Button>
                        </div>
                    </form>
                )}

                {types.length === 0 ? (
                    <EmptyState icon={Shapes} title={t('Vehicle types')} />
                ) : (
                    <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-left text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">
                                        {t('Name')}
                                    </th>
                                    <th className="hidden px-4 py-3 font-medium sm:table-cell">
                                        {t('Category')}
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        {t('Can tow')}
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        {t('Towable')}
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        {t('Odometer')}
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        {t('Vehicles count')}
                                    </th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {types.map((type) => (
                                    <tr key={type.id} className="border-t">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">
                                                {type.name}
                                            </div>
                                            {!type.is_active && (
                                                <Badge variant="outline">
                                                    {t('Inactive')}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="hidden px-4 py-3 sm:table-cell">
                                            {label(
                                                'vehicle_category',
                                                type.category,
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Flag value={type.can_tow} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <Flag value={type.is_towable} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <Flag value={type.has_odometer} />
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {type.vehicles_count}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                aria-label={t(
                                                    'Edit vehicle type',
                                                )}
                                                onClick={() => open(type)}
                                            >
                                                <Pencil />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

VehicleTypesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Vehicle types', href: typeRoutes.index() },
    ],
};
