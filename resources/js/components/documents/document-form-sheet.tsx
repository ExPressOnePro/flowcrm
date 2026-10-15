import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useConfirm } from '@/components/confirm-dialog';
import { FilePicker } from '@/components/documents/file-picker';
import { ResponsiveSheet } from '@/components/responsive-sheet';
import {
    Field,
    identifierProps,
    selectClass,
    SubmitBar,
} from '@/components/sheet-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useT } from '@/lib/i18n';
import { newIdempotencyKey } from '@/lib/idempotency';
import documentRoutes from '@/routes/documents';
import vehicleDocuments from '@/routes/vehicles/documents';
import type { DocumentItem, DocumentTypeOption } from '@/types/documents';

export type DocumentFormMode =
    | { kind: 'create'; typeId?: number }
    | { kind: 'renew'; document: DocumentItem }
    | { kind: 'edit'; document: DocumentItem };

type FormData = {
    document_type_id: string;
    number: string;
    issuer: string;
    issued_on: string;
    expires_on: string;
    notes: string;
    files: File[];
    replaces_id: string;
    idempotency_key: string;
};

function initialData(mode: DocumentFormMode): FormData {
    const base: FormData = {
        document_type_id: '',
        number: '',
        issuer: '',
        issued_on: '',
        expires_on: '',
        notes: '',
        files: [],
        replaces_id: '',
        idempotency_key: newIdempotencyKey(),
    };

    switch (mode.kind) {
        case 'create':
            return { ...base, document_type_id: String(mode.typeId ?? '') };
        case 'renew':
            return {
                ...base,
                document_type_id: String(mode.document.type.id),
                issuer: mode.document.issuer ?? '',
                replaces_id: String(mode.document.id),
            };
        case 'edit':
            return {
                ...base,
                document_type_id: String(mode.document.type.id),
                number: mode.document.number ?? '',
                issuer: mode.document.issuer ?? '',
                issued_on: mode.document.issued_on ?? '',
                expires_on: mode.document.expires_on ?? '',
                notes: mode.document.notes ?? '',
            };
    }
}

/**
 * Mount it only while open: each opening starts with fresh data and a new
 * idempotency key, so a retried submit can't create a second document.
 */
export function DocumentFormSheet({
    mode,
    vehicleId,
    types,
    onClose,
    onDone,
}: {
    mode: DocumentFormMode;
    vehicleId: number;
    types: DocumentTypeOption[];
    onClose: () => void;
    onDone: () => void;
}) {
    const { t } = useT();
    const confirm = useConfirm();
    const [initial] = useState(() => initialData(mode));
    const form = useForm<FormData>(initial);
    const type = types.find(
        (option) => String(option.id) === form.data.document_type_id,
    );
    const hasExpiry =
        mode.kind === 'create'
            ? (type?.has_expiry ?? true)
            : mode.document.type.has_expiry;
    const fileError = Object.entries(form.errors).find(([key]) =>
        key.startsWith('files'),
    )?.[1];

    const title = {
        create: t('Add document'),
        renew: t('Renew document'),
        edit: t('Edit document'),
    }[mode.kind];

    async function close() {
        if (form.processing) {
            return;
        }

        if (
            (form.isDirty || form.data.files.length > 0) &&
            !(await confirm({
                title: t('Discard changes?'),
                description: t(
                    'The entered data and selected files will be lost.',
                ),
                confirmLabel: t('Discard'),
                destructive: true,
            }))
        ) {
            return;
        }

        onClose();
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => onDone(),
        };

        if (mode.kind === 'edit') {
            form.put(documentRoutes.update.url(mode.document.id), options);

            return;
        }

        form.post(vehicleDocuments.store.url(vehicleId), {
            ...options,
            forceFormData: true,
        });
    }

    return (
        <ResponsiveSheet
            open
            onOpenChange={(value) => !value && void close()}
            title={title}
            description={
                mode.kind === 'create' ? undefined : mode.document.type.name
            }
            footer={
                <div className="grid gap-2">
                    {form.progress && (
                        <div
                            className="h-1.5 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-label={t('Uploading')}
                            aria-valuenow={form.progress.percentage ?? 0}
                        >
                            <div
                                className="h-full bg-primary transition-[width]"
                                style={{
                                    width: `${form.progress.percentage ?? 0}%`,
                                }}
                            />
                        </div>
                    )}
                    <SubmitBar
                        form="document-form"
                        processing={form.processing}
                        label={mode.kind === 'renew' ? t('Renew') : t('Save')}
                        onCancel={() => void close()}
                    />
                </div>
            }
        >
            <form id="document-form" className="grid gap-4" onSubmit={submit}>
                {mode.kind === 'create' && (
                    <Field
                        id="document_type_id"
                        label={t('Document type')}
                        required
                        error={form.errors.document_type_id}
                    >
                        <select
                            id="document_type_id"
                            className={selectClass}
                            value={form.data.document_type_id}
                            onChange={(event) =>
                                form.setData(
                                    'document_type_id',
                                    event.target.value,
                                )
                            }
                            required
                        >
                            <option value="">{t('Select type')}</option>
                            {types.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
                {mode.kind === 'renew' && (
                    <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                        {t(
                            'A new document will be created; the current one moves to the archive with a link to the new one.',
                        )}
                    </p>
                )}
                <Field
                    id="document-number"
                    label={t('Number')}
                    error={form.errors.number}
                >
                    <Input
                        id="document-number"
                        value={form.data.number}
                        onChange={(event) =>
                            form.setData('number', event.target.value)
                        }
                        {...identifierProps}
                    />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field
                        id="issued_on"
                        label={t('Issued on')}
                        error={form.errors.issued_on}
                    >
                        <Input
                            id="issued_on"
                            type="date"
                            value={form.data.issued_on}
                            onChange={(event) =>
                                form.setData('issued_on', event.target.value)
                            }
                        />
                    </Field>
                    {hasExpiry && (
                        <Field
                            id="expires_on"
                            label={t('Valid until')}
                            required
                            error={form.errors.expires_on}
                        >
                            <Input
                                id="expires_on"
                                type="date"
                                value={form.data.expires_on}
                                onChange={(event) =>
                                    form.setData(
                                        'expires_on',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </Field>
                    )}
                </div>
                <Field
                    id="issuer"
                    label={t('Issued by')}
                    error={form.errors.issuer}
                >
                    <Input
                        id="issuer"
                        value={form.data.issuer}
                        onChange={(event) =>
                            form.setData('issuer', event.target.value)
                        }
                    />
                </Field>
                {mode.kind !== 'edit' && (
                    <Field id="document-files" label={t('Files')}>
                        <FilePicker
                            files={form.data.files}
                            onChange={(files) => form.setData('files', files)}
                            error={fileError}
                        />
                    </Field>
                )}
                <Field
                    id="document-notes"
                    label={t('Note')}
                    error={form.errors.notes}
                >
                    <Textarea
                        id="document-notes"
                        rows={2}
                        value={form.data.notes}
                        onChange={(event) =>
                            form.setData('notes', event.target.value)
                        }
                    />
                </Field>
            </form>
        </ResponsiveSheet>
    );
}
