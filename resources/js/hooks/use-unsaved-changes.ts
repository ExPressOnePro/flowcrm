import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { useT } from '@/lib/i18n';

/**
 * Asks before leaving a form with unsaved input: in-app links and the
 * browser tab closing/reloading. Back/forward restores remembered form state.
 */
export function useUnsavedChanges(dirty: boolean) {
    const { t } = useT();
    const dirtyRef = useRef(dirty);

    useEffect(() => {
        dirtyRef.current = dirty;
    }, [dirty]);

    useEffect(() => {
        const removeBefore = router.on('before', (event) => {
            const visit = event.detail.visit;

            if (
                !dirtyRef.current ||
                visit.prefetch ||
                visit.method !== 'get' ||
                visit.only.length > 0 ||
                visit.preserveState === true
            ) {
                return;
            }

            if (!window.confirm(t('You have unsaved changes. Leave anyway?'))) {
                event.preventDefault();
            }
        });

        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            if (dirtyRef.current) {
                event.preventDefault();
            }
        };

        window.addEventListener('beforeunload', onBeforeUnload);

        return () => {
            removeBefore();
            window.removeEventListener('beforeunload', onBeforeUnload);
        };
    }, [t]);
}
