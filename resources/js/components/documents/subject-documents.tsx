import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    FilePlus2,
    Paperclip,
} from 'lucide-react';
import { useState } from 'react';
import { DocumentFormSheet } from '@/components/documents/document-form-sheet';
import type { DocumentFormMode } from '@/components/documents/document-form-sheet';
import { DocumentSheet } from '@/components/documents/document-sheet';
import type { DocumentPermissions } from '@/components/documents/document-sheet';
import { DocumentStateBadge } from '@/components/documents/document-state-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useJson } from '@/hooks/use-json';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import type { DocumentItem, SubjectDocumentsPayload } from '@/types/documents';
import { ownerDocumentsUrl } from './owner';
import type { DocumentOwner } from './owner';

function DocumentRow({
    document,
    onOpen,
}: {
    document: DocumentItem;
    onOpen: () => void;
}) {
    const { t } = useT();
    const format = useFormat();

    return (
        <li>
            <button
                type="button"
                onClick={onOpen}
                className="flex min-h-14 w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left hover:bg-muted/40"
            >
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">
                            {document.type.name}
                        </span>
                        <DocumentStateBadge
                            state={document.state}
                            daysLeft={document.days_left}
                        />
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {document.number && (
                            <span className="font-mono">{document.number}</span>
                        )}
                        {document.expires_on && (
                            <span>
                                {t('until :date', {
                                    date: format.date(document.expires_on),
                                })}
                            </span>
                        )}
                        {document.files.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                                <Paperclip className="size-3" />
                                {document.files.length}
                            </span>
                        )}
                    </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
        </li>
    );
}

export function SubjectDocuments({
    owner,
    readOnly,
    can,
}: {
    owner: DocumentOwner;
    readOnly: boolean;
    can: DocumentPermissions & { create: boolean };
}) {
    const { t } = useT();
    const [refreshKey, setRefreshKey] = useState(0);
    const [showArchive, setShowArchive] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [form, setForm] = useState<DocumentFormMode | null>(null);
    const current = useJson<SubjectDocumentsPayload>(
        ownerDocumentsUrl(owner),
        refreshKey,
    );
    const archive = useJson<{ items: DocumentItem[] }>(
        showArchive ? ownerDocumentsUrl(owner, true) : null,
        refreshKey,
    );
    const data = current.data;
    const editable = !readOnly;
    const permissions: DocumentPermissions = editable
        ? can
        : { renew: false, update: false, archive: false, attach: false };
    const selected =
        [...(data?.items ?? []), ...(archive.data?.items ?? [])].find(
            (document) => document.id === selectedId,
        ) ?? null;

    function changed() {
        setRefreshKey((value) => value + 1);
        router.reload({ only: ['documentSummary'] });
    }

    if (current.status === 'loading') {
        return (
            <div className="grid gap-2" aria-busy>
                {[0, 1, 2].map((index) => (
                    <Skeleton key={index} className="h-16 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    if (current.status === 'error' || !data) {
        return (
            <EmptyState
                icon={AlertTriangle}
                title={t('Could not load documents')}
                description={t('Check your connection and try again.')}
                action={
                    <Button variant="outline" onClick={current.retry}>
                        {t('Retry')}
                    </Button>
                }
            />
        );
    }

    return (
        <div className="grid gap-4">
            {editable && can.create && (
                <Button
                    className="sm:justify-self-start"
                    onClick={() => setForm({ kind: 'create' })}
                >
                    <FilePlus2 />
                    {t('Add document')}
                </Button>
            )}

            {data.missing.length > 0 && (
                <section
                    aria-label={t('Missing mandatory documents')}
                    className="grid gap-2"
                >
                    {data.missing.map((type) => (
                        <div
                            key={type.id}
                            className="flex min-h-14 items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
                        >
                            <AlertTriangle className="size-4 shrink-0" />
                            <div className="min-w-0 flex-1 text-sm">
                                <div className="font-medium">{type.name}</div>
                                <div className="text-xs opacity-80">
                                    {t(
                                        'Mandatory per company settings; not added yet',
                                    )}
                                </div>
                            </div>
                            {editable && can.create && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="shrink-0 bg-background"
                                    onClick={() =>
                                        setForm({
                                            kind: 'create',
                                            typeId: type.id,
                                        })
                                    }
                                >
                                    {t('Add')}
                                </Button>
                            )}
                        </div>
                    ))}
                </section>
            )}

            {data.items.length === 0 ? (
                <EmptyState
                    icon={FilePlus2}
                    title={t('No documents yet')}
                    description={t(
                        'Add insurance, inspection and other documents to get expiry reminders.',
                    )}
                />
            ) : (
                <ul
                    className={`grid gap-2 transition-opacity ${current.refreshing ? 'opacity-60' : ''}`}
                >
                    {data.items.map((document) => (
                        <DocumentRow
                            key={document.id}
                            document={document}
                            onOpen={() => setSelectedId(document.id)}
                        />
                    ))}
                </ul>
            )}

            {data.archived_count > 0 && (
                <section className="grid gap-2">
                    <Button
                        variant="ghost"
                        className="justify-start px-2 text-muted-foreground"
                        aria-expanded={showArchive}
                        onClick={() => setShowArchive((value) => !value)}
                    >
                        <ChevronDown
                            className={`transition-transform ${showArchive ? '' : '-rotate-90'}`}
                        />
                        {t('Archive (:count)', { count: data.archived_count })}
                    </Button>
                    {showArchive &&
                        (archive.status === 'loading' ? (
                            <Skeleton className="h-16 w-full rounded-lg" />
                        ) : archive.status === 'error' ? (
                            <Button variant="outline" onClick={archive.retry}>
                                {t('Retry')}
                            </Button>
                        ) : (
                            <ul className="grid gap-2 opacity-80">
                                {archive.data?.items.map((document) => (
                                    <DocumentRow
                                        key={document.id}
                                        document={document}
                                        onOpen={() =>
                                            setSelectedId(document.id)
                                        }
                                    />
                                ))}
                            </ul>
                        ))}
                </section>
            )}

            <DocumentSheet
                document={form ? null : selected}
                can={permissions}
                onClose={() => setSelectedId(null)}
                onEdit={(document) => setForm({ kind: 'edit', document })}
                onRenew={(document) => setForm({ kind: 'renew', document })}
                onDone={changed}
            />

            {form && (
                <DocumentFormSheet
                    mode={form}
                    owner={owner}
                    types={data.types}
                    onClose={() => setForm(null)}
                    onDone={() => {
                        if (form.kind === 'renew') {
                            setSelectedId(null);
                        }

                        setForm(null);
                        changed();
                    }}
                />
            )}
        </div>
    );
}
