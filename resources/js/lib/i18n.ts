import { usePage } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';

import { enumLabels } from '@/lang/enums';
import ru from '@/lang/ru';

const dictionaries: Record<string, Record<string, string>> = { ru };

type Params = Record<string, string | number>;

export function translate(
    locale: string,
    key: string,
    params: Params = {},
): string {
    const template = dictionaries[locale]?.[key] ?? key;

    return Object.entries(params).reduce(
        (text, [name, value]) => text.replaceAll(`:${name}`, String(value)),
        template,
    );
}

export function enumLabel(
    locale: string,
    group: string,
    value: string | null | undefined,
): string {
    if (!value) {
        return '—';
    }

    return (
        enumLabels[locale]?.[group]?.[value] ??
        enumLabels.en[group]?.[value] ??
        value
    );
}

/** Locale for code running outside the Inertia page context (providers, global handlers). */
export function documentLocale(): string {
    return typeof document === 'undefined'
        ? 'ru'
        : document.documentElement.lang || 'ru';
}

export function useLocale(): string {
    return (usePage().props.locale as string | undefined) ?? 'ru';
}

export function useT() {
    const locale = useLocale();

    const t = useCallback(
        (key: string, params?: Params) => translate(locale, key, params),
        [locale],
    );

    const label = useCallback(
        (group: string, value: string | null | undefined) =>
            enumLabel(locale, group, value),
        [locale],
    );

    return useMemo(() => ({ t, label, locale }), [t, label, locale]);
}
