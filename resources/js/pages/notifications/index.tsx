import { Head, router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck, FileWarning } from 'lucide-react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useFormat } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import notificationRoutes from '@/routes/notifications';
import type { Paginated } from '@/types/fleet';

type DocumentExpiringData = {
    document_type: string;
    plate_number: string | null;
    subject?: 'vehicle' | 'driver';
    subject_label?: string | null;
    expires_on: string | null;
    days_left: number;
    url: string;
};

type NotificationItem = {
    id: string;
    type: string;
    data: DocumentExpiringData;
    read: boolean;
    created_at: string | null;
};

export default function NotificationsIndex({
    notifications,
}: {
    notifications: Paginated<NotificationItem>;
}) {
    const { t } = useT();
    const format = useFormat();
    const unread = usePage().props.unreadNotifications;

    const describe = (data: DocumentExpiringData) =>
        data.days_left < 0
            ? t(':document expired on :date', {
                  document: data.document_type,
                  date: format.date(data.expires_on),
              })
            : data.days_left === 0
              ? t(':document expires today', { document: data.document_type })
              : t(':document expires on :date (in :days d.)', {
                    document: data.document_type,
                    date: format.date(data.expires_on),
                    days: data.days_left,
                });

    return (
        <>
            <Head title={t('Notifications')} />

            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        title={t('Notifications')}
                        description={t('Document expiry reminders.')}
                    />
                    {unread > 0 && (
                        <Button
                            variant="outline"
                            className="shrink-0 max-sm:w-11 max-sm:px-0"
                            onClick={() =>
                                router.post(
                                    notificationRoutes.readAll.url(),
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            <CheckCheck />
                            <span className="max-sm:sr-only">
                                {t('Mark all as read')}
                            </span>
                        </Button>
                    )}
                </div>

                {notifications.data.length === 0 ? (
                    <EmptyState
                        icon={Bell}
                        title={t('No notifications')}
                        description={t(
                            'Reminders appear here 30, 14, 7 and 1 day before a document expires.',
                        )}
                    />
                ) : (
                    <>
                        <ul className="grid gap-2">
                            {notifications.data.map((notification) => (
                                <li key={notification.id}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.post(
                                                notificationRoutes.open.url(
                                                    notification.id,
                                                ),
                                            )
                                        }
                                        className={cn(
                                            'flex min-h-14 w-full items-start gap-3 rounded-xl border p-3 text-left hover:bg-muted/40',
                                            !notification.read &&
                                                'border-primary/30 bg-primary/5',
                                        )}
                                    >
                                        <FileWarning
                                            className={cn(
                                                'mt-0.5 size-5 shrink-0',
                                                notification.data.days_left < 0
                                                    ? 'text-rose-600'
                                                    : 'text-amber-600',
                                            )}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm">
                                                {(notification.data
                                                    .subject_label ??
                                                    notification.data
                                                        .plate_number) && (
                                                    <span
                                                        className={cn(
                                                            'mr-1.5 font-semibold',
                                                            notification.data
                                                                .subject !==
                                                                'driver' &&
                                                                'font-mono',
                                                        )}
                                                    >
                                                        {notification.data
                                                            .subject_label ??
                                                            notification.data
                                                                .plate_number}
                                                    </span>
                                                )}
                                                {describe(notification.data)}
                                            </div>
                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                                {format.dateTime(
                                                    notification.created_at,
                                                )}
                                            </div>
                                        </div>
                                        {!notification.read && (
                                            <span
                                                className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                                                aria-label={t('Unread')}
                                            />
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <Pagination links={notifications.links} />
                    </>
                )}
            </div>
        </>
    );
}

NotificationsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Notifications', href: notificationRoutes.index() },
    ],
};
