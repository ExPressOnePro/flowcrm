import { Link, router } from '@inertiajs/react';
import { LogOut, Menu, Palette, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ResponsiveSheet } from '@/components/responsive-sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useT } from '@/lib/i18n';
import { bottomNavItems, navGroups, useNavPermissions } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import { edit as appearance } from '@/routes/appearance';
import { edit as profile } from '@/routes/profile';
import type { NavItem } from '@/types';

const itemClass =
    'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] leading-tight font-medium transition-colors';

/** Fixed bottom navigation for phones; tablets and desktops keep the sidebar. */
export function BottomNav() {
    const { t } = useT();
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { allowed, filterGroups } = useNavPermissions();
    const [moreOpen, setMoreOpen] = useState(false);
    const keyboardOpen = useEditingField();
    const navRef = usePublishedHeight('--bottom-nav-h');

    const pinned = bottomNavItems.filter(allowed);
    const moreGroups = filterGroups(navGroups, bottomNavItems);
    const moreActive =
        !pinned.some((item) => isCurrentOrParentUrl(item.href)) &&
        moreGroups.some((group) =>
            group.items.some((item) => isCurrentOrParentUrl(item.href)),
        );

    useEffect(() => router.on('navigate', () => setMoreOpen(false)), []);

    return (
        <>
            <nav
                ref={navRef}
                aria-label={t('Main navigation')}
                className={cn(
                    'fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden',
                    keyboardOpen && 'hidden',
                )}
            >
                <ul className="flex">
                    {pinned.map((item) => (
                        <li key={item.title} className="flex flex-1">
                            <BottomLink
                                item={item}
                                active={isCurrentOrParentUrl(item.href)}
                            />
                        </li>
                    ))}
                    <li className="flex flex-1">
                        <button
                            type="button"
                            onClick={() => setMoreOpen(true)}
                            aria-haspopup="dialog"
                            aria-expanded={moreOpen}
                            className={cn(
                                itemClass,
                                moreActive || moreOpen
                                    ? 'text-primary'
                                    : 'text-muted-foreground',
                            )}
                        >
                            <Menu className="size-5" />
                            <span>{t('More')}</span>
                        </button>
                    </li>
                </ul>
            </nav>

            <ResponsiveSheet
                open={moreOpen}
                onOpenChange={setMoreOpen}
                title={t('More')}
            >
                <div className="space-y-5">
                    {moreGroups.map((group) => (
                        <section key={group.title}>
                            <h3 className="mb-1 px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {t(group.title)}
                            </h3>
                            <ul className="divide-y rounded-xl border">
                                {group.items.map((item) => (
                                    <li key={item.title}>
                                        <MoreLink
                                            item={item}
                                            active={isCurrentOrParentUrl(
                                                item.href,
                                            )}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}

                    <section>
                        <h3 className="mb-1 px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {t('Account')}
                        </h3>
                        <ul className="divide-y rounded-xl border">
                            <li>
                                <MoreLink
                                    item={{
                                        title: 'Profile',
                                        href: profile(),
                                        icon: UserRound,
                                    }}
                                    active={isCurrentOrParentUrl(profile())}
                                />
                            </li>
                            <li>
                                <MoreLink
                                    item={{
                                        title: 'Appearance',
                                        href: appearance(),
                                        icon: Palette,
                                    }}
                                    active={isCurrentOrParentUrl(appearance())}
                                />
                            </li>
                            <li>
                                <Link
                                    href={logout()}
                                    as="button"
                                    onClick={() => router.flushAll()}
                                    className="flex min-h-12 w-full items-center gap-3 px-3 text-left text-sm text-destructive"
                                >
                                    <LogOut className="size-5" />
                                    {t('Log out')}
                                </Link>
                            </li>
                        </ul>
                    </section>
                </div>
            </ResponsiveSheet>
        </>
    );
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
    const { t } = useT();

    return (
        <Link
            href={item.href}
            prefetch
            aria-current={active ? 'page' : undefined}
            className={cn(
                itemClass,
                active ? 'text-primary' : 'text-muted-foreground',
            )}
        >
            {item.icon && <item.icon className="size-5" />}
            <span className="line-clamp-2 text-center">
                {t(item.shortTitle ?? item.title)}
            </span>
        </Link>
    );
}

function MoreLink({ item, active }: { item: NavItem; active: boolean }) {
    const { t } = useT();

    return (
        <Link
            href={item.href}
            prefetch
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex min-h-12 items-center gap-3 px-3 text-sm',
                active && 'font-medium text-primary',
            )}
        >
            {item.icon && (
                <item.icon className="size-5 text-muted-foreground" />
            )}
            <span className="flex-1">{t(item.title)}</span>
            {item.stage && (
                <span className="text-xs text-muted-foreground">
                    {t('soon')}
                </span>
            )}
        </Link>
    );
}

/**
 * Mirrors the element's height into a CSS variable on <html>, so sticky bars
 * can sit right above the navigation (0 while it is hidden).
 */
function usePublishedHeight(variable: string) {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        const element = ref.current;
        const root = document.documentElement;

        if (!element) {
            return;
        }

        const observer = new ResizeObserver(() =>
            root.style.setProperty(variable, `${element.offsetHeight}px`),
        );
        observer.observe(element);

        return () => {
            observer.disconnect();
            root.style.removeProperty(variable);
        };
    }, [variable]);

    return ref;
}

/**
 * True while a text field is focused: on phones the on-screen keyboard is open,
 * so the fixed bar would only cover the form.
 */
function useEditingField() {
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        const isField = (target: EventTarget | null) =>
            target instanceof HTMLElement &&
            (target.isContentEditable ||
                target instanceof HTMLTextAreaElement ||
                (target instanceof HTMLInputElement &&
                    ![
                        'checkbox',
                        'radio',
                        'button',
                        'submit',
                        'reset',
                        'file',
                        'range',
                        'color',
                    ].includes(target.type)));

        const onFocusIn = (event: FocusEvent) =>
            setEditing(isField(event.target));
        const onFocusOut = () => setEditing(false);

        document.addEventListener('focusin', onFocusIn);
        document.addEventListener('focusout', onFocusOut);

        return () => {
            document.removeEventListener('focusin', onFocusIn);
            document.removeEventListener('focusout', onFocusOut);
        };
    }, []);

    return editing;
}
