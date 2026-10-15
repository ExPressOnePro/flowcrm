import { Link, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import notifications from '@/routes/notifications';

export function NotificationBell({ className }: { className?: string }) {
    const { t } = useT();
    const unread = usePage().props.unreadNotifications ?? 0;

    return (
        <Link
            href={notifications.index()}
            className={cn(
                'relative flex size-11 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-accent md:size-9',
                className,
            )}
            aria-label={
                unread > 0
                    ? t('Notifications: :count unread', { count: unread })
                    : t('Notifications')
            }
        >
            <Bell className="size-5" />
            {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] leading-4 font-semibold text-white tabular-nums md:top-0.5 md:right-0.5">
                    {unread > 99 ? '99+' : unread}
                </span>
            )}
        </Link>
    );
}
