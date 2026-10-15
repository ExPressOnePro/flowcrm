import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavGroup, NavItem } from '@/types';

export function NavMain({
    items = [],
    groups = [],
}: {
    items?: NavItem[];
    groups?: NavGroup[];
}) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <>
            {items.length > 0 && (
                <SidebarGroup className="px-2 py-0">
                    <SidebarMenu>
                        {items.map((item) => (
                            <NavLink
                                key={item.title}
                                item={item}
                                isActive={isCurrentUrl(item.href)}
                            />
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            )}

            {groups.map((group) => (
                <SidebarGroup key={group.title} className="px-2 py-0">
                    <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                    <SidebarMenu>
                        {group.items.map((item) => (
                            <NavLink
                                key={item.title}
                                item={item}
                                isActive={isCurrentUrl(item.href)}
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
    isActive,
}: {
    item: NavItem;
    isActive: boolean;
}) {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={{ children: item.title }}
            >
                <Link href={item.href} prefetch>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
