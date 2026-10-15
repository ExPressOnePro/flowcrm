import { Badge } from '@/components/ui/badge';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { WaybillStatus } from '@/types/waybills';

const styles: Record<WaybillStatus | 'overdue', string> = {
    draft: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
    issued: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300',
    overdue:
        'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
    closed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
    cancelled: 'border-transparent bg-muted text-muted-foreground',
};

export function WaybillStatusBadge({
    status,
    overdue = false,
}: {
    status: WaybillStatus;
    overdue?: boolean;
}) {
    const { t, label } = useT();
    const key = status === 'issued' && overdue ? 'overdue' : status;

    return (
        <Badge
            variant="outline"
            className={cn('shrink-0 font-normal', styles[key])}
        >
            {key === 'overdue'
                ? t('Return overdue')
                : label('waybill_status', status)}
        </Badge>
    );
}
