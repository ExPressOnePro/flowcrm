import { createInertiaApp, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { ConfirmProvider } from '@/components/confirm-dialog';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { documentLocale, translate } from '@/lib/i18n';
import { trackInAppHistory } from '@/lib/in-app-history';
import { registerServiceWorker } from '@/lib/service-worker';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                <ConfirmProvider>{app}</ConfirmProvider>
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

trackInAppHistory();

// Mobile connections drop often: tell the user instead of failing silently.
router.on('networkError', () => {
    toast.error(
        translate(
            documentLocale(),
            'No connection to the server. Check the internet and try again.',
        ),
        { id: 'network-error' },
    );
});

// This will set light / dark mode on load...
initializeTheme();

registerServiceWorker();
