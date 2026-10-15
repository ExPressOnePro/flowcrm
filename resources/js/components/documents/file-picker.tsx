import { Camera, FileText, Paperclip, X } from 'lucide-react';
import { useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';

export const MAX_FILE_MB = 10;
export const MAX_FILES = 10;
const ALLOWED = /\.(pdf|jpe?g|png|webp|heic|heif)$/i;

export function formatSize(bytes: number): string {
    return bytes >= 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * "Take photo" opens the rear camera on phones; "Choose files" opens the
 * gallery / file manager. Files are checked here first and again on the server.
 */
export function FilePicker({
    files,
    onChange,
    error,
}: {
    files: File[];
    onChange: (files: File[]) => void;
    error?: string;
}) {
    const { t } = useT();
    const cameraRef = useRef<HTMLInputElement>(null);
    const filesRef = useRef<HTMLInputElement>(null);
    const [problem, setProblem] = useState<string | null>(null);

    function add(list: FileList | null) {
        if (!list) {
            return;
        }

        const accepted: File[] = [];
        let rejected: string | null = null;

        for (const file of Array.from(list)) {
            if (!ALLOWED.test(file.name) && !file.type.startsWith('image/')) {
                rejected = t('Allowed formats: PDF, JPG, PNG, WEBP, HEIC.');
            } else if (file.size > MAX_FILE_MB * 1024 * 1024) {
                rejected = t('Each file must be at most :size MB.', {
                    size: MAX_FILE_MB,
                });
            } else {
                accepted.push(file);
            }
        }

        const next = [...files, ...accepted];

        if (next.length > MAX_FILES) {
            rejected = t('No more than :count files at once.', {
                count: MAX_FILES,
            });
        }

        setProblem(rejected);
        onChange(next.slice(0, MAX_FILES));
    }

    return (
        <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraRef.current?.click()}
                >
                    <Camera />
                    {t('Take photo')}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => filesRef.current?.click()}
                >
                    <Paperclip />
                    {t('Choose files')}
                </Button>
            </div>
            <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(event) => {
                    add(event.target.files);
                    event.target.value = '';
                }}
            />
            <input
                ref={filesRef}
                type="file"
                accept="application/pdf,image/*,.heic,.heif"
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(event) => {
                    add(event.target.files);
                    event.target.value = '';
                }}
            />
            <p className="text-xs text-muted-foreground">
                {t('PDF or photo, up to :size MB each.', { size: MAX_FILE_MB })}
            </p>
            {files.length > 0 && (
                <ul className="grid gap-1.5">
                    {files.map((file, index) => (
                        <li
                            key={`${file.name}-${index}`}
                            className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm"
                        >
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate">
                                {file.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                                {formatSize(file.size)}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="-mr-2 shrink-0"
                                aria-label={t('Remove :name', {
                                    name: file.name,
                                })}
                                onClick={() =>
                                    onChange(
                                        files.filter((_, i) => i !== index),
                                    )
                                }
                            >
                                <X />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
            <InputError message={problem ?? error} />
        </div>
    );
}
