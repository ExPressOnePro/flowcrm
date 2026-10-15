import { router } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useT } from '@/lib/i18n';
import { canGoBackInApp } from '@/lib/in-app-history';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { t } = useT();
    const current = breadcrumbs.at(-1);
    const parent = breadcrumbs.length > 1 ? breadcrumbs.at(-2) : undefined;

    function goBack() {
        if (canGoBackInApp()) {
            window.history.back();
        } else if (parent) {
            router.visit(parent.href);
        }
    }

    return (
        <header className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-sidebar-border/50 bg-background/95 pt-safe backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:h-16 md:bg-transparent md:px-4 md:pt-0 md:backdrop-blur-none md:transition-[width,height] md:ease-linear md:group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex h-14 min-w-0 flex-1 items-center gap-1 px-2 md:hidden">
                {parent ? (
                    <button
                        type="button"
                        onClick={goBack}
                        className="-ml-1 flex size-11 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-accent"
                        aria-label={t('Back')}
                    >
                        <ChevronLeft className="size-6" />
                    </button>
                ) : (
                    <span className="w-2" />
                )}
                <p className="min-w-0 truncate text-base font-semibold">
                    {current ? t(current.title) : ''}
                </p>
            </div>

            <div className="hidden items-center gap-2 md:flex">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
        </header>
    );
}
