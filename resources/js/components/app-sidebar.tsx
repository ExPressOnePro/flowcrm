import { Link } from '@inertiajs/react';
import {
    Building2,
    CheckSquare,
    FileText,
    Handshake,
    LayoutGrid,
    Settings2,
    Target,
    Users,
    UsersRound,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import customers from '@/routes/customers';
import deals from '@/routes/deals';
import employees from '@/routes/employees';
import invoices from '@/routes/invoices';
import leads from '@/routes/leads';
import settings from '@/routes/settings';
import tasks from '@/routes/tasks';
import type { NavGroup, NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

const navGroups: NavGroup[] = [
    {
        title: 'CRM',
        items: [
            {
                title: 'Customers',
                href: customers.index(),
                icon: Users,
            },
            {
                title: 'Leads',
                href: leads.index(),
                icon: Target,
            },
            {
                title: 'Deals',
                href: deals.index(),
                icon: Handshake,
            },
        ],
    },
    {
        title: 'Work',
        items: [
            {
                title: 'Tasks',
                href: tasks.index(),
                icon: CheckSquare,
            },
        ],
    },
    {
        title: 'Finance',
        items: [
            {
                title: 'Invoices',
                href: invoices.index(),
                icon: FileText,
            },
        ],
    },
    {
        title: 'Company',
        items: [
            {
                title: 'Employees',
                href: employees.index(),
                icon: UsersRound,
            },
            {
                title: 'Settings',
                href: settings.organization(),
                icon: Settings2,
            },
        ],
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} groups={navGroups} />
            </SidebarContent>

            <SidebarFooter>
                <div className="hidden items-center gap-2 px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                    <Building2 className="size-3.5" />
                    <span>FlowCRM</span>
                </div>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
