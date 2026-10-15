import { Badge } from '@/components/ui/badge';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { DocumentState } from '@/types/documents';

const tone: Record<DocumentState, string> = {
    valid: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
    expiring:
        'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
    expired:
        'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300',
    no_expiry: 'border-border bg-muted text-muted-foreground',
    archived: 'border-border bg-muted text-muted-foreground',
};

export function useDocumentStateText() {
    const { t, label } = useT();

    return (state: DocumentState, daysLeft: number | null) => {
        if (state === 'expiring' && daysLeft !== null) {
            return daysLeft === 0
                ? t('Expires today')
                : t('Expires in :days d.', { days: daysLeft });
        }

        if (state === 'expired' && daysLeft !== null) {
            return t('Expired :days d. ago', { days: Math.abs(daysLeft) });
        }

        return label('document_state', state);
    };
}

export function DocumentStateBadge({
    state,
    daysLeft,
    className,
}: {
    state: DocumentState;
    daysLeft: number | null;
    className?: string;
}) {
    const text = useDocumentStateText();

    return (
        <Badge
            variant="outline"
            className={cn('shrink-0 font-normal', tone[state], className)}
        >
            {text(state, daysLeft)}
        </Badge>
    );
}
