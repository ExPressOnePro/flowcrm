import { Link } from '@inertiajs/react';
import {
    Building2,
    CheckSquare,
    LayoutGrid,
    MapPinned,
    Settings2,
    Shapes,
    Truck,
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
import branches from '@/routes/branches';
import customers from '@/routes/customers';
import employees from '@/routes/employees';
import settings from '@/routes/settings';
import tasks from '@/routes/tasks';
import vehicleTypes from '@/routes/vehicle-types';
import vehicles from '@/routes/vehicles';
import type { NavGroup, NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
        permission: 'dashboard.view',
    },
];

/*
 * Leads, deals and invoices stay routable but are hidden from the menu
 * while the product is focused on fleet management.
 */
const navGroups: NavGroup[] = [
    {
        title: 'Fleet',
        items: [
            {
                title: 'Vehicles',
                href: vehicles.index(),
                icon: Truck,
                permission: 'vehicles.view',
            },
            {
                title: 'Branches',
                href: branches.index(),
                icon: MapPinned,
                permission: 'branches.manage',
            },
            {
                title: 'Vehicle types',
                href: vehicleTypes.index(),
                icon: Shapes,
                permission: 'vehicle_types.manage',
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
                permission: 'tasks.view',
            },
        ],
    },
    {
        title: 'Commerce',
        items: [
            {
                title: 'Customers',
                href: customers.index(),
                icon: Users,
                permission: 'customers.view',
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
                permission: 'employees.view',
            },
            {
                title: 'Settings',
                href: settings.organization(),
                icon: Settings2,
                permission: 'settings.view',
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
