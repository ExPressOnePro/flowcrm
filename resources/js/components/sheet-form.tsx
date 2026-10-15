import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/lib/i18n';

export const selectClass =
    'border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs';

/** Plate numbers, VINs and document numbers: no autocorrect, capital letters. */
export const identifierProps = {
    autoCapitalize: 'characters',
    autoCorrect: 'off',
    autoComplete: 'off',
    spellCheck: false,
} as const;

export function Field({
    id,
    label,
    required,
    hint,
    error,
    children,
}: {
    id: string;
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    children: ReactNode;
}) {
    const { t } = useT();

    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>
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
            </Label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            <InputError message={error} />
        </div>
    );
}

export function SubmitBar({
    processing,
    label,
    onCancel,
    destructive,
    form,
    disabled,
}: {
    processing: boolean;
    label: string;
    onCancel: () => void;
    destructive?: boolean;
    form: string;
    disabled?: boolean;
}) {
    const { t } = useT();

    return (
        <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
                {t('Cancel')}
            </Button>
            <Button
                type="submit"
                form={form}
                disabled={processing || disabled}
                variant={destructive ? 'destructive' : 'default'}
            >
                {processing && <Spinner />}
                {label}
            </Button>
        </div>
    );
}
