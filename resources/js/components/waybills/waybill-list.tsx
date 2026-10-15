import { Link } from '@inertiajs/react';
import { AlertTriangle, ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useJson } from '@/hooks/use-json';
import { useT } from '@/lib/i18n';
import type { WaybillListItem } from '@/types/waybills';
import { WaybillCard } from './waybill-card';

/**
 * Waybills tab of a vehicle or driver card: open ones first, then the latest.
 */
export function WaybillList({
    url,
    hide,
    createUrl,
    fullListUrl,
}: {
    url: string;
    hide: 'vehicle' | 'driver';
    createUrl: string | null;
    fullListUrl: string;
}) {
    const { t } = useT();
    const list = useJson<{ items: WaybillListItem[]; has_more: boolean }>(url);

    if (list.status === 'loading') {
        return (
            <div className="grid gap-2" aria-busy>
                {[0, 1, 2].map((index) => (
                    <Skeleton key={index} className="h-24 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    if (list.status === 'error' || !list.data) {
        return (
            <EmptyState
                icon={AlertTriangle}
                title={t('Could not load waybills')}
                description={t('Check your connection and try again.')}
                action={
                    <Button variant="outline" onClick={list.retry}>
                        {t('Retry')}
                    </Button>
                }
            />
        );
    }

    const create = createUrl && (
        <Button asChild className="sm:justify-self-start">
            <Link href={createUrl}>
                <Plus />
                {t('New waybill')}
            </Link>
        </Button>
    );

    if (list.data.items.length === 0) {
        return (
            <EmptyState
                icon={ClipboardList}
                title={t('No waybills yet')}
                description={t(
                    'Waybills issued for trips will appear here with departure and return mileage.',
                )}
                action={create || undefined}
            />
        );
    }

    return (
        <div className="grid gap-4">
            {create}
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {list.data.items.map((waybill) => (
                    <li key={waybill.id}>
                        <WaybillCard waybill={waybill} hide={hide} />
                    </li>
                ))}
            </ul>
            {list.data.has_more && (
                <Button
                    asChild
                    variant="outline"
                    className="sm:justify-self-start"
                >
                    <Link href={fullListUrl}>{t('All waybills')}</Link>
                </Button>
            )}
        </div>
    );
}
