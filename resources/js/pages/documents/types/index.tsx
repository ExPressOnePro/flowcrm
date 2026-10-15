import { Head, useForm } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { ResponsiveSheet } from '@/components/responsive-sheet';
import { Field, selectClass, SubmitBar } from '@/components/sheet-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import documentTypes from '@/routes/document-types';

type DocumentTypeRow = {
    id: number;
    subject: string;
    name: string;
    has_expiry: boolean;
    is_mandatory: boolean;
    vehicle_categories: string[];
    is_active: boolean;
    documents_count: number;
};

type Props = {
    types: DocumentTypeRow[];
    subjects: string[];
    categories: string[];
};

function Toggle({
    id,
    label,
    hint,
    checked,
    onChange,
    disabled,
}: {
    id: string;
    label: string;
    hint?: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <label
            htmlFor={id}
            className="flex min-h-11 items-start gap-3 py-1 text-sm"
        >
            <input
                id={id}
                type="checkbox"
                className="mt-0.5 size-5 shrink-0"
                checked={checked}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
            />
            <span>
                {label}
                {hint && (
                    <span className="block text-xs text-muted-foreground">
                        {hint}
                    </span>
                )}
            </span>
        </label>
    );
}

function TypeSheet({
    type,
    subjects,
    categories,
    onClose,
}: {
    type: DocumentTypeRow | null;
    subjects: string[];
    categories: string[];
    onClose: () => void;
}) {
    const { t, label } = useT();
    const form = useForm({
        subject: type?.subject ?? 'vehicle',
        name: type?.name ?? '',
        has_expiry: type?.has_expiry ?? true,
        is_mandatory: type?.is_mandatory ?? false,
        vehicle_categories: type?.vehicle_categories ?? ([] as string[]),
        is_active: type?.is_active ?? true,
    });
    const inUse = (type?.documents_count ?? 0) > 0;

    return (
        <ResponsiveSheet
            open
            onOpenChange={(value) => !value && onClose()}
            title={type ? t('Edit document type') : t('New document type')}
            footer={
                <SubmitBar
                    form="document-type-form"
                    processing={form.processing}
                    label={t('Save')}
                    onCancel={onClose}
                />
            }
        >
            <form
                id="document-type-form"
                className="grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    const options = {
                        preserveScroll: true,
                        onSuccess: onClose,
                    };

                    if (type) {
                        form.transform((data) => ({
                            ...data,
                            subject: undefined,
                        }));
                        form.put(documentTypes.update.url(type.id), options);
                    } else {
                        form.post(documentTypes.store.url(), options);
                    }
                }}
            >
                {!type && (
                    <Field
                        id="subject"
                        label={t('Applies to')}
                        required
                        error={form.errors.subject}
                    >
                        <select
                            id="subject"
                            className={selectClass}
                            value={form.data.subject}
                            onChange={(event) =>
                                form.setData('subject', event.target.value)
                            }
                        >
                            {subjects.map((subject) => (
                                <option key={subject} value={subject}>
                                    {label('document_subject', subject)}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
                <Field
                    id="type-name"
                    label={t('Name')}
                    required
                    error={form.errors.name}
                >
                    <Input
                        id="type-name"
                        value={form.data.name}
                        onChange={(event) =>
                            form.setData('name', event.target.value)
                        }
                        required
                    />
                </Field>
                <div className="grid">
                    <Toggle
                        id="has_expiry"
                        label={t('Has an expiry date')}
                        hint={
                            inUse
                                ? t(
                                      'Cannot be changed while documents use this type.',
                                  )
                                : t(
                                      'Reminders are sent 30, 14, 7 and 1 day before expiry.',
                                  )
                        }
                        checked={form.data.has_expiry}
                        disabled={inUse}
                        onChange={(value) => form.setData('has_expiry', value)}
                    />
                    <Toggle
                        id="is_mandatory"
                        label={t('Mandatory')}
                        hint={t(
                            'A missing document is shown as a warning on the vehicle card.',
                        )}
                        checked={form.data.is_mandatory}
                        onChange={(value) =>
                            form.setData('is_mandatory', value)
                        }
                    />
                    <Toggle
                        id="is_active"
                        label={t('Active')}
                        hint={t(
                            'Inactive types cannot be chosen for new documents.',
                        )}
                        checked={form.data.is_active}
                        onChange={(value) => form.setData('is_active', value)}
                    />
                </div>
                {form.data.subject === 'vehicle' && (
                    <fieldset className="grid gap-1">
                        <legend className="mb-1 text-sm font-medium">
                            {t('Vehicle categories')}
                        </legend>
                        <p className="mb-1 text-xs text-muted-foreground">
                            {t('None selected — applies to all categories.')}
                        </p>
                        <div className="grid grid-cols-2 gap-x-3">
                            {categories.map((category) => (
                                <Toggle
                                    key={category}
                                    id={`category-${category}`}
                                    label={label('vehicle_category', category)}
                                    checked={form.data.vehicle_categories.includes(
                                        category,
                                    )}
                                    onChange={(value) =>
                                        form.setData(
                                            'vehicle_categories',
                                            value
                                                ? [
                                                      ...form.data
                                                          .vehicle_categories,
                                                      category,
                                                  ]
                                                : form.data.vehicle_categories.filter(
                                                      (item) =>
                                                          item !== category,
                                                  ),
                                        )
                                    }
                                />
                            ))}
                        </div>
                    </fieldset>
                )}
            </form>
        </ResponsiveSheet>
    );
}

export default function DocumentTypesIndex({
    types,
    subjects,
    categories,
}: Props) {
    const { t, label } = useT();
    const [editing, setEditing] = useState<DocumentTypeRow | 'new' | null>(
        null,
    );

    const details = (type: DocumentTypeRow) =>
        [
            type.has_expiry ? t('With expiry') : t('No expiry'),
            type.is_mandatory ? t('Mandatory') : null,
            type.subject === 'vehicle' && type.vehicle_categories.length > 0
                ? type.vehicle_categories
                      .map((category) => label('vehicle_category', category))
                      .join(', ')
                : null,
        ]
            .filter(Boolean)
            .join(' · ');

    return (
        <>
            <Head title={t('Document types')} />

            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        title={t('Document types')}
                        description={t(
                            'Which documents the company tracks and which are mandatory.',
                        )}
                    />
                    <Button
                        className="shrink-0 max-sm:w-11 max-sm:px-0"
                        onClick={() => setEditing('new')}
                    >
                        <Plus />
                        <span className="max-sm:sr-only">{t('New type')}</span>
                    </Button>
                </div>

                {subjects.map((subject) => {
                    const rows = types.filter(
                        (type) => type.subject === subject,
                    );

                    if (rows.length === 0) {
                        return null;
                    }

                    return (
                        <section key={subject} className="grid gap-2">
                            <h2 className="text-sm font-medium text-muted-foreground">
                                {label('document_subject', subject)}
                            </h2>
                            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                                {rows.map((type) => (
                                    <li key={type.id}>
                                        <button
                                            type="button"
                                            onClick={() => setEditing(type)}
                                            className="flex h-full min-h-14 w-full items-start gap-3 rounded-xl border bg-card p-3 text-left hover:bg-muted/40"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium">
                                                        {type.name}
                                                    </span>
                                                    {!type.is_active && (
                                                        <Badge variant="secondary">
                                                            {t('Inactive')}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="mt-0.5 text-xs text-muted-foreground">
                                                    {details(type)}
                                                </div>
                                                <div className="mt-0.5 text-xs text-muted-foreground">
                                                    {t(
                                                        'Current documents: :count',
                                                        {
                                                            count: type.documents_count,
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                            <Pencil className="mt-1 size-4 shrink-0 text-muted-foreground" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                })}
            </div>

            {editing && (
                <TypeSheet
                    type={editing === 'new' ? null : editing}
                    subjects={subjects}
                    categories={categories}
                    onClose={() => setEditing(null)}
                />
            )}
        </>
    );
}

DocumentTypesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Document types', href: documentTypes.index() },
    ],
};
