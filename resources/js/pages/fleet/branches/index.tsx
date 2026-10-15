import { Head, useForm } from '@inertiajs/react';
import { MapPinned, Pencil, Plus } from 'lucide-react';
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
import branchRoutes from '@/routes/branches';

type Branch = {
    id: number;
    name: string;
    code: string | null;
    city: string | null;
    address: string | null;
    is_active: boolean;
    vehicles_count: number;
};

type FormData = {
    name: string;
    code: string;
    city: string;
    address: string;
    is_active: boolean;
};

const empty: FormData = {
    name: '',
    code: '',
    city: '',
    address: '',
    is_active: true,
};

export default function BranchesIndex({ branches }: { branches: Branch[] }) {
    const { t } = useT();
    const [editing, setEditing] = useState<Branch | 'new' | null>(null);
    const form = useForm<FormData>(empty);

    function open(branch: Branch | 'new') {
        form.clearErrors();
        form.setData(
            branch === 'new'
                ? empty
                : {
                      name: branch.name,
                      code: branch.code ?? '',
                      city: branch.city ?? '',
                      address: branch.address ?? '',
                      is_active: branch.is_active,
                  },
        );
        setEditing(branch);
    }

    function submit() {
        const options = {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        };

        if (editing === 'new') {
            form.post(branchRoutes.store.url(), options);
        } else if (editing) {
            form.put(branchRoutes.update.url(editing.id), options);
        }
    }

    return (
        <>
            <Head title={t('Branches')} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title={t('Branches')}
                        description={t('Branches and depots of the company.')}
                    />
                    <Button onClick={() => open('new')}>
                        <Plus />
                        {t('New branch')}
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
                                ? t('New branch')
                                : t('Edit branch')}
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
                            <Label htmlFor="code">{t('Code')}</Label>
                            <Input
                                id="code"
                                value={form.data.code}
                                onChange={(e) =>
                                    form.setData('code', e.target.value)
                                }
                            />
                            <InputError message={form.errors.code} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="city">{t('City')}</Label>
                            <Input
                                id="city"
                                value={form.data.city}
                                onChange={(e) =>
                                    form.setData('city', e.target.value)
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="address">{t('Address')}</Label>
                            <Input
                                id="address"
                                value={form.data.address}
                                onChange={(e) =>
                                    form.setData('address', e.target.value)
                                }
                            />
                        </div>
                        <label className="flex items-center gap-2 text-sm md:col-span-2">
                            <Checkbox
                                checked={form.data.is_active}
                                onCheckedChange={(checked) =>
                                    form.setData('is_active', checked === true)
                                }
                            />
                            {t('Active')}
                            <span className="text-xs text-muted-foreground">
                                —{' '}
                                {t(
                                    'Deactivate instead of deleting to keep history.',
                                )}
                            </span>
                        </label>
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

                {branches.length === 0 ? (
                    <EmptyState icon={MapPinned} title={t('Branches')} />
                ) : (
                    <>
                        <ul className="grid grid-cols-1 gap-3 md:hidden">
                            {branches.map((branch) => (
                                <li
                                    key={branch.id}
                                    className="flex items-start justify-between gap-3 rounded-xl border p-4"
                                >
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium">
                                                {branch.name}
                                            </span>
                                            <Badge
                                                variant={
                                                    branch.is_active
                                                        ? 'secondary'
                                                        : 'outline'
                                                }
                                            >
                                                {branch.is_active
                                                    ? t('Active')
                                                    : t('Inactive')}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {[branch.code, branch.city]
                                                .filter(Boolean)
                                                .join(' · ') || '—'}
                                        </div>
                                        <div className="text-sm">
                                            {t('Vehicles count')}:{' '}
                                            {branch.vehicles_count}
                                        </div>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label={t('Edit branch')}
                                        onClick={() => open(branch)}
                                    >
                                        <Pencil />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                        <div className="hidden overflow-x-auto rounded-xl border md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-left text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            {t('Name')}
                                        </th>
                                        <th className="hidden px-4 py-3 font-medium sm:table-cell">
                                            {t('City')}
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium">
                                            {t('Vehicles count')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {t('Status')}
                                        </th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {branches.map((branch) => (
                                        <tr
                                            key={branch.id}
                                            className="border-t"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium">
                                                    {branch.name}
                                                </div>
                                                {branch.code && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {branch.code}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="hidden px-4 py-3 sm:table-cell">
                                                {branch.city ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {branch.vehicles_count}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant={
                                                        branch.is_active
                                                            ? 'secondary'
                                                            : 'outline'
                                                    }
                                                >
                                                    {branch.is_active
                                                        ? t('Active')
                                                        : t('Inactive')}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    aria-label={t(
                                                        'Edit branch',
                                                    )}
                                                    onClick={() => open(branch)}
                                                >
                                                    <Pencil />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

BranchesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Branches', href: branchRoutes.index() },
    ],
};
