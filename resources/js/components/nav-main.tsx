import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useT } from '@/lib/i18n';
import { useNavPermissions } from '@/lib/navigation';
import type { NavGroup, NavItem } from '@/types';

export function NavMain({
    items = [],
    groups = [],
}: {
    items?: NavItem[];
    groups?: NavGroup[];
}) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { t } = useT();
    const { allowed, filterGroups } = useNavPermissions();

    const visibleItems = items.filter(allowed);
    const visibleGroups = filterGroups(groups);

    return (
        <>
            {visibleItems.length > 0 && (
                <SidebarGroup className="px-2 py-0">
                    <SidebarMenu>
                        {visibleItems.map((item) => (
                            <NavLink
                                key={item.title}
                                item={item}
                                title={t(item.title)}
                                isActive={isCurrentOrParentUrl(item.href)}
                            />
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            )}

            {visibleGroups.map((group) => (
                <SidebarGroup key={group.title} className="px-2 py-0">
                    <SidebarGroupLabel>{t(group.title)}</SidebarGroupLabel>
                    <SidebarMenu>
                        {group.items.map((item) => (
                            <NavLink
                                key={item.title}
                                item={item}
                                title={t(item.title)}
                                isActive={isCurrentOrParentUrl(item.href)}
                            />
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </>
    );
}

function NavLink({
    item,
    title,
    isActive,
}: {
    item: NavItem;
    title: string;
    isActive: boolean;
}) {
    const { t } = useT();

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={{ children: title }}
            >
                <Link href={item.href} prefetch>
                    {item.icon && <item.icon />}
                    <span>{title}</span>
                </Link>
            </SidebarMenuButton>
            {item.stage && (
                <SidebarMenuBadge className="text-[10px] font-normal text-muted-foreground">
                    {t('soon')}
                </SidebarMenuBadge>
            )}
        </SidebarMenuItem>
    );
}
