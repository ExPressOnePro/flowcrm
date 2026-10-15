import type { Auth, Organization } from '@/types/auth';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            locale: string;
            auth: Auth;
            organization: Organization | null;
            authPermissions: string[];
            unreadNotifications: number;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
