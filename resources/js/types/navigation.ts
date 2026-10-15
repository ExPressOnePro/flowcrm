import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    /** Hide the item unless the user has this permission. */
    permission?: string;
    /** Compact label for the phone bottom bar. */
    shortTitle?: string;
    /** Module scheduled for a later delivery stage. */
    stage?: number;
};

export type NavGroup = {
    title: string;
    items: NavItem[];
};
