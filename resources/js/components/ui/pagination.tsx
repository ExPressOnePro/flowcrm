import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { InertiaLinkProps } from '@inertiajs/react';

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export function Pagination({
    links,
    className,
}: {
    links: PaginationLink[];
    className?: string;
}) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <div className={cn('flex flex-wrap items-center gap-1', className)}>
            {links.map((link, index) => {
                const label = link.label
                    .replace('&laquo;', '‹')
                    .replace('&raquo;', '›');
                // Phones keep previous / current / next only.
                const edge = index === 0 || index === links.length - 1;
                const compact = !edge && !link.active && 'max-sm:hidden';

                if (!link.url) {
                    return (
                        <Button
                            key={`${label}-${index}`}
                            variant="ghost"
                            size="sm"
                            className={cn(compact)}
                            disabled
                            dangerouslySetInnerHTML={{ __html: label }}
                        />
                    );
                }

                return (
                    <Button
                        key={`${label}-${index}`}
                        variant={link.active ? 'default' : 'ghost'}
                        size="sm"
                        className={cn('min-w-11 md:min-w-8', compact)}
                        asChild
                    >
                        <Link
                            href={link.url as NonNullable<InertiaLinkProps['href']>}
                            preserveScroll
                            preserveState
                            dangerouslySetInnerHTML={{ __html: label }}
                        />
                    </Button>
                );
            })}
        </div>
    );
}

export type { PaginationLink };
