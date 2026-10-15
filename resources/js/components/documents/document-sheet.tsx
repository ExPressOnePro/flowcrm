import { useForm } from '@inertiajs/react';
import {
    Archive,
    Download,
    FileText,
    Image as ImageIcon,
    Pencil,
    RefreshCw,
    Upload,
} from 'lucide-react';
import { useState } from 'react';
import { DocumentStateBadge } from '@/components/documents/document-state-badge';
import { FilePicker, formatSize } from '@/components/documents/file-picker';
import { ResponsiveSheet } from '@/components/responsive-sheet';
import { Field } from '@/components/sheet-form';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import documentRoutes from '@/routes/documents';
import documentFiles from '@/routes/documents/files';
import type { DocumentItem } from '@/types/documents';

export type DocumentPermissions = {
    renew: boolean;
    update: boolean;
    archive: boolean;
    attach: boolean;
};

function Row({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="grid grid-cols-[8rem_1fr] gap-2 py-1.5 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">{value || '—'}</dd>
        </div>
    );
}

export function DocumentSheet({
    document,
    can,
    onClose,
    onEdit,
    onRenew,
    onDone,
}: {
    document: DocumentItem | null;
    can: DocumentPermissions;
    onClose: () => void;
    onEdit: (document: DocumentItem) => void;
    onRenew: (document: DocumentItem) => void;
    onDone: () => void;
}) {
    const { t } = useT();
    const format = useFormat();
    const [panel, setPanel] = useState<'none' | 'upload' | 'archive'>('none');
    const upload = useForm<{ files: File[] }>({ files: [] });
    const archive = useForm({ reason: '' });
    const archived = document?.state === 'archived';
    const fileError = Object.entries(upload.errors).find(([key]) =>
        key.startsWith('files'),
    )?.[1];

    function close() {
        setPanel('none');
        upload.reset();
        archive.reset();
        upload.clearErrors();
        archive.clearErrors();
        onClose();
    }

    return (
        <ResponsiveSheet
            open={document !== null}
            onOpenChange={(value) => !value && close()}
            title={document?.type.name ?? ''}
            description={document?.number ?? undefined}
        >
            {document && (
                <div className="grid gap-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <DocumentStateBadge
                            state={document.state}
                            daysLeft={document.days_left}
                        />
                        {document.expires_on && (
                            <span className="text-sm text-muted-foreground">
                                {t('valid until :date', {
                                    date: format.date(document.expires_on),
                                })}
                            </span>
                        )}
                    </div>

                    <dl className="divide-y rounded-lg border px-3">
                        <Row label={t('Number')} value={document.number} />
                        <Row
                            label={t('Issued on')}
                            value={
                                document.issued_on
                                    ? format.date(document.issued_on)
                                    : null
                            }
                        />
                        <Row
                            label={t('Valid until')}
                            value={
                                document.type.has_expiry
                                    ? format.date(document.expires_on)
                                    : t('No expiry')
                            }
                        />
                        <Row label={t('Issued by')} value={document.issuer} />
                        <Row label={t('Note')} value={document.notes} />
                        <Row
                            label={t('Added')}
                            value={`${format.dateTime(document.created_at)}${document.created_by ? ` · ${document.created_by}` : ''}`}
                        />
                        {archived && (
                            <>
                                <Row
                                    label={t('Archived')}
                                    value={`${format.dateTime(document.archived_at)}${document.archived_by ? ` · ${document.archived_by}` : ''}`}
                                />
                                <Row
                                    label={t('Reason')}
                                    value={document.archive_reason}
                                />
                            </>
                        )}
                    </dl>

                    <section className="grid gap-2">
                        <h3 className="text-sm font-medium">
                            {t('Files')} ({document.files.length})
                        </h3>
                        {document.files.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t('No files attached.')}
                            </p>
                        ) : (
                            <ul className="grid gap-1.5">
                                {document.files.map((file) => (
                                    <li
                                        key={file.id}
                                        className="flex items-center gap-1 rounded-md border pl-3"
                                    >
                                        {file.is_image ? (
                                            <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                                        ) : (
                                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                                        )}
                                        <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener"
                                            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-2 text-sm hover:underline"
                                        >
                                            <span className="truncate">
                                                {file.name}
                                            </span>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {formatSize(file.size)}
                                            </span>
                                        </a>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            asChild
                                        >
                                            <a
                                                href={`${file.url}?download=1`}
                                                aria-label={t(
                                                    'Download :name',
                                                    {
                                                        name: file.name,
                                                    },
                                                )}
                                            >
                                                <Download />
                                            </a>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {!archived && panel === 'upload' && (
                        <form
                            className="grid gap-3 rounded-lg border p-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                upload.post(
                                    documentFiles.store.url(document.id),
                                    {
                                        forceFormData: true,
                                        preserveScroll: true,
                                        onSuccess: () => {
                                            upload.reset();
                                            setPanel('none');
                                            onDone();
                                        },
                                    },
                                );
                            }}
                        >
                            <FilePicker
                                files={upload.data.files}
                                onChange={(files) =>
                                    upload.setData('files', files)
                                }
                                error={fileError}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        upload.reset();
                                        setPanel('none');
                                    }}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        upload.processing ||
                                        upload.data.files.length === 0
                                    }
                                >
                                    {upload.processing && <Spinner />}
                                    {upload.progress
                                        ? `${upload.progress.percentage ?? 0}%`
                                        : t('Upload')}
                                </Button>
                            </div>
                        </form>
                    )}

                    {!archived && panel === 'archive' && (
                        <form
                            className="grid gap-3 rounded-lg border border-destructive/40 p-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                archive.post(
                                    documentRoutes.archive.url(document.id),
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => {
                                            archive.reset();
                                            setPanel('none');
                                            onDone();
                                            onClose();
                                        },
                                    },
                                );
                            }}
                        >
                            <p className="text-sm">
                                {t(
                                    'The document becomes read-only and stays in the history. It cannot be deleted.',
                                )}
                            </p>
                            <Field
                                id="archive-reason"
                                label={t('Reason')}
                                required
                                error={archive.errors.reason}
                            >
                                <Textarea
                                    id="archive-reason"
                                    rows={2}
                                    value={archive.data.reason}
                                    onChange={(event) =>
                                        archive.setData(
                                            'reason',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </Field>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setPanel('none')}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={archive.processing}
                                >
                                    {archive.processing && <Spinner />}
                                    {t('Move to archive')}
                                </Button>
                            </div>
                        </form>
                    )}

                    {!archived && panel === 'none' && (
                        <div className="grid grid-cols-2 gap-2">
                            {can.renew && (
                                <Button
                                    variant="outline"
                                    onClick={() => onRenew(document)}
                                >
                                    <RefreshCw />
                                    {t('Renew')}
                                </Button>
                            )}
                            {can.update && (
                                <Button
                                    variant="outline"
                                    onClick={() => onEdit(document)}
                                >
                                    <Pencil />
                                    {t('Edit')}
                                </Button>
                            )}
                            {can.attach && (
                                <Button
                                    variant="outline"
                                    onClick={() => setPanel('upload')}
                                >
                                    <Upload />
                                    {t('Add files')}
                                </Button>
                            )}
                            {can.archive && (
                                <Button
                                    variant="outline"
                                    className="text-destructive"
                                    onClick={() => setPanel('archive')}
                                >
                                    <Archive />
                                    {t('To archive')}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </ResponsiveSheet>
    );
}
