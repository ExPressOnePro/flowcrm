import type { ReactNode } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

/**
 * Bottom sheet on phones, side panel on larger screens.
 * The body scrolls on its own so long forms stay reachable above the keyboard.
 */
export function ResponsiveSheet({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    className,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
}) {
    const isMobile = useIsMobile();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side={isMobile ? 'bottom' : 'right'}
                className={cn(
                    'gap-0',
                    isMobile
                        ? 'max-h-[92dvh] rounded-t-2xl pb-safe'
                        : 'w-full sm:max-w-md',
                    className,
                )}
                {...(description ? {} : { 'aria-describedby': undefined })}
            >
                {isMobile && (
                    <div
                        aria-hidden
                        className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted"
                    />
                )}
                <SheetHeader className="pr-14">
                    <SheetTitle>{title}</SheetTitle>
                    {description && (
                        <SheetDescription>{description}</SheetDescription>
                    )}
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
                    {children}
                </div>
                {footer && (
                    <div className="border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                        {footer}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
