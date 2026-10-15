import { usePage } from '@inertiajs/react';
import {
    BarChart3,
    CheckSquare,
    ClipboardList,
    FileCog,
    FileText,
    History,
    IdCard,
    LayoutGrid,
    MapPinned,
    Settings2,
    Shapes,
    Truck,
    Users,
    UsersRound,
    Wrench,
} from 'lucide-react';
import { analytics, dashboard } from '@/routes';
import branches from '@/routes/branches';
import customers from '@/routes/customers';
import documentTypes from '@/routes/document-types';
import documents from '@/routes/documents';
import drivers from '@/routes/drivers';
import employees from '@/routes/employees';
import maintenance from '@/routes/maintenance';
import operations from '@/routes/operations';
import settings from '@/routes/settings';
import tasks from '@/routes/tasks';
import vehicleTypes from '@/routes/vehicle-types';
import vehicles from '@/routes/vehicles';
import waybills from '@/routes/waybills';
import type { NavGroup, NavItem } from '@/types';

export const dashboardItem: NavItem = {
    title: 'Dashboard',
    shortTitle: 'Home',
    href: dashboard(),
    icon: LayoutGrid,
    permission: 'dashboard.view',
};

export const vehiclesItem: NavItem = {
    title: 'Vehicles',
    shortTitle: 'Fleet',
    href: vehicles.index(),
    icon: Truck,
    permission: 'vehicles.view',
};

export const documentsItem: NavItem = {
    title: 'Documents',
    href: documents.index(),
    icon: FileText,
    permission: 'documents.view',
};

export const waybillsItem: NavItem = {
    title: 'Waybills',
    href: waybills.index(),
    icon: ClipboardList,
    permission: 'waybills.view',
};

export const driversItem: NavItem = {
    title: 'Drivers',
    href: drivers.index(),
    icon: IdCard,
    permission: 'drivers.view',
};

/*
 * Leads, deals and invoices stay routable but are hidden from the menu
 * while the product is focused on fleet management.
 */
export const navGroups: NavGroup[] = [
    {
        title: 'Fleet',
        items: [
            vehiclesItem,
            waybillsItem,
            driversItem,
            documentsItem,
            {
                title: 'Maintenance',
                href: maintenance.index(),
                icon: Wrench,
                permission: 'vehicles.view',
                stage: 7,
            },
            {
                title: 'Operations history',
                href: operations.index(),
                icon: History,
                permission: 'vehicles.view',
                stage: 6,
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
        title: 'Reports',
        items: [
            {
                title: 'Analytics',
                href: analytics(),
                icon: BarChart3,
                permission: 'analytics.view',
            },
        ],
    },
    {
        title: 'Catalogs',
        items: [
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
            {
                title: 'Document types',
                href: documentTypes.index(),
                icon: FileCog,
                permission: 'document_types.manage',
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

/** Items pinned to the phone bottom bar; everything else lives under "More". */
export const bottomNavItems: NavItem[] = [
    dashboardItem,
    vehiclesItem,
    waybillsItem,
    documentsItem,
];

export function useNavPermissions() {
    const permissions = usePage().props.authPermissions;

    const allowed = (item: NavItem) =>
        !item.permission || permissions.includes(item.permission);

    const filterGroups = (groups: NavGroup[], exclude: NavItem[] = []) =>
        groups
            .map((group) => ({
                ...group,
                items: group.items.filter(
                    (item) => allowed(item) && !exclude.includes(item),
                ),
            }))
            .filter((group) => group.items.length > 0);

    return { allowed, filterGroups };
}
