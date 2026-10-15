import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';

import { useLocale } from '@/lib/i18n';

const intlLocale = (locale: string) => (locale === 'ru' ? 'ru-RU' : 'en-GB');

/**
 * Formatting helpers bound to the current organization's timezone,
 * so timestamps stored in UTC are shown as local wall-clock time.
 */
export function useFormat() {
    const locale = useLocale();
    const timezone =
        usePage().props.organization?.timezone ??
        Intl.DateTimeFormat().resolvedOptions().timeZone;

    return useMemo(() => {
        const dateTime = new Intl.DateTimeFormat(intlLocale(locale), {
            timeZone: timezone,
            dateStyle: 'short',
            timeStyle: 'short',
        });
        const number = new Intl.NumberFormat(intlLocale(locale));

        return {
            timezone,
            dateTime: (value: string | null | undefined) =>
                value ? dateTime.format(new Date(value)) : '—',
            date: (value: string | null | undefined) => {
                if (!value) {
                    return '—';
                }

                const [year, month, day] = value.slice(0, 10).split('-');

                return `${day}.${month}.${year}`;
            },
            km: (value: number | null | undefined) =>
                value === null || value === undefined
                    ? '—'
                    : `${number.format(value)} ${locale === 'ru' ? 'км' : 'km'}`,
            number: (value: number) => number.format(value),
            /** Current time in the organization's timezone, for datetime-local inputs. */
            nowLocalInput: () => {
                const parts = new Intl.DateTimeFormat('en-CA', {
                    timeZone: timezone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hourCycle: 'h23',
                }).formatToParts(new Date());
                const get = (type: string) =>
                    parts.find((part) => part.type === type)?.value ?? '00';

                return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
            },
        };
    }, [locale, timezone]);
}
