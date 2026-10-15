import { Check, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useId, useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type PickerOption = {
    id: number;
    title: string;
    subtitle?: string;
    /** Extra text matched by the search but not shown, e.g. licence categories. */
    keywords?: string;
    hint?: ReactNode;
    mono?: boolean;
};

const PAGE = 8;

const normalize = (value: string) =>
    value.toLocaleLowerCase().replace(/[\s\-–—.]/g, '');

/**
 * Search-as-you-type single choice: a filtered list of large tap targets instead
 * of a long native select. The chosen option collapses to a summary row.
 */
export function SearchPicker({
    label,
    required,
    options,
    value,
    onChange,
    placeholder,
    emptyText,
    noneLabel,
    error,
}: {
    label: string;
    required?: boolean;
    options: PickerOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    emptyText: string;
    /** When set, the field is optional and offers an explicit "none" choice. */
    noneLabel?: string;
    error?: string;
}) {
    const { t } = useT();
    const id = useId();
    const [query, setQuery] = useState('');
    const [limit, setLimit] = useState(PAGE);
    const [browsing, setBrowsing] = useState(value === '');
    const selected = options.find((option) => String(option.id) === value);

    const matches = useMemo(() => {
        const needle = normalize(query);

        return needle === ''
            ? options
            : options.filter((option) =>
                  normalize(
                      `${option.title} ${option.subtitle ?? ''} ${option.keywords ?? ''}`,
                  ).includes(needle),
              );
    }, [options, query]);

    function choose(next: string) {
        onChange(next);
        setBrowsing(false);
        setQuery('');
        setLimit(PAGE);
    }

    return (
        <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">
                {label}
                {required && (
                    <span
                        className="text-destructive"
                        aria-label={t('required')}
                    >
                        {' '}
                        *
                    </span>
                )}
            </legend>

            {!browsing && (selected || (noneLabel && value === '')) ? (
                <div className="flex min-h-14 items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                        <div
                            className={cn(
                                'font-medium break-words',
                                selected?.mono && 'font-mono',
                            )}
                        >
                            {selected?.title ?? noneLabel}
                        </div>
                        {selected?.subtitle && (
                            <div className="text-xs text-muted-foreground">
                                {selected.subtitle}
                            </div>
                        )}
                        {selected?.hint}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setBrowsing(true)}
                    >
                        {t('Change')}
                    </Button>
                </div>
            ) : (
                <>
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id={`${id}-search`}
                            type="search"
                            enterKeyHint="search"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            aria-label={`${label}: ${t('search')}`}
                            aria-controls={`${id}-list`}
                            placeholder={placeholder}
                            className="pl-9"
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setLimit(PAGE);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();

                                    if (matches.length === 1) {
                                        choose(String(matches[0].id));
                                    }
                                }
                            }}
                        />
                    </div>
                    <div
                        id={`${id}-list`}
                        role="radiogroup"
                        aria-label={label}
                        className="grid gap-1.5"
                    >
                        {noneLabel && query === '' && (
                            <OptionButton
                                checked={value === ''}
                                onClick={() => choose('')}
                                title={noneLabel}
                            />
                        )}
                        {matches.slice(0, limit).map((option) => (
                            <OptionButton
                                key={option.id}
                                checked={String(option.id) === value}
                                onClick={() => choose(String(option.id))}
                                title={option.title}
                                subtitle={option.subtitle}
                                hint={option.hint}
                                mono={option.mono}
                            />
                        ))}
                        {matches.length === 0 && (
                            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                                {emptyText}
                            </p>
                        )}
                        {matches.length > limit && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() =>
                                    setLimit((current) => current + PAGE)
                                }
                            >
                                {t('Show :count more', {
                                    count: Math.min(
                                        PAGE,
                                        matches.length - limit,
                                    ),
                                })}
                            </Button>
                        )}
                    </div>
                    {selected && (
                        <Button
                            type="button"
                            variant="ghost"
                            className="justify-self-start"
                            onClick={() => setBrowsing(false)}
                        >
                            {t('Keep :value', { value: selected.title })}
                        </Button>
                    )}
                </>
            )}
            <InputError message={error} />
        </fieldset>
    );
}

function OptionButton({
    checked,
    onClick,
    title,
    subtitle,
    hint,
    mono,
}: {
    checked: boolean;
    onClick: () => void;
    title: string;
    subtitle?: string;
    hint?: ReactNode;
    mono?: boolean;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={onClick}
            className={cn(
                'flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                checked && 'border-primary bg-primary/5',
            )}
        >
            <div className="min-w-0 flex-1">
                <div
                    className={cn(
                        'text-sm font-medium break-words',
                        mono && 'font-mono',
                    )}
                >
                    {title}
                </div>
                {subtitle && (
                    <div className="text-xs break-words text-muted-foreground">
                        {subtitle}
                    </div>
                )}
                {hint}
            </div>
            {checked && <Check className="size-4 shrink-0 text-primary" />}
        </button>
    );
}
