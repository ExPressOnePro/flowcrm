import type { ReactNode } from 'react';
import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { documentLocale, translate } from '@/lib/i18n';

type ConfirmOptions = {
    title: string;
    description?: string;
    confirmLabel?: string;
    destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Promise-based confirmation for dangerous actions (archive, decommission, uncouple). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
    // Rendered around the Inertia app, so page props (and useT) are not available here.
    const t = (key: string) => translate(documentLocale(), key);
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolver = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback<ConfirmFn>((next) => {
        resolver.current?.(false);
        setOptions(next);

        return new Promise<boolean>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    function settle(value: boolean) {
        resolver.current?.(value);
        resolver.current = null;
        setOptions(null);
    }

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <Dialog
                open={options !== null}
                onOpenChange={(open) => !open && settle(false)}
            >
                <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
                    <DialogHeader className="pr-10 text-left">
                        <DialogTitle>{options?.title}</DialogTitle>
                        <DialogDescription>
                            {options?.description ?? ''}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => settle(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button
                            variant={
                                options?.destructive ? 'destructive' : 'default'
                            }
                            onClick={() => settle(true)}
                        >
                            {options?.confirmLabel ?? t('Confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ConfirmContext.Provider>
    );
}

export function useConfirm(): ConfirmFn {
    const confirm = useContext(ConfirmContext);

    if (!confirm) {
        throw new Error('useConfirm must be used inside ConfirmProvider');
    }

    return confirm;
}
