import { Head } from '@inertiajs/react';
import { Construction } from 'lucide-react';
import { dashboard } from '@/routes';

export default function ComingSoon() {
    return (
        <>
            <Head title="Coming soon" />
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                    <Construction className="size-7 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Coming in the next phase
                    </h1>
                    <p className="max-w-md text-sm text-muted-foreground">
                        Phase 1 shipped organizations, multi-tenancy, roles, and
                        the app shell. CRM modules will land next.
                    </p>
                </div>
            </div>
        </>
    );
}

ComingSoon.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Coming soon',
            href: '#',
        },
    ],
};
