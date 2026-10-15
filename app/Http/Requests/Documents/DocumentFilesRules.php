<?php

namespace App\Http\Requests\Documents;

use App\Models\DocumentFile;

trait DocumentFilesRules
{
    /**
     * `mimes` checks the detected content type, so a renamed executable is rejected.
     *
     * @return array<string, list<string>>
     */
    protected function fileRules(bool $required): array
    {
        return [
            'files' => [$required ? 'required' : 'nullable', 'array', 'max:'.DocumentFile::MAX_FILES],
            'files.*' => ['file', 'mimes:'.implode(',', DocumentFile::ALLOWED_EXTENSIONS), 'max:'.DocumentFile::MAX_KILOBYTES],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function fileMessages(): array
    {
        return [
            'files.*.mimes' => __('Allowed formats: PDF, JPG, PNG, WEBP, HEIC.'),
            'files.*.max' => __('Each file must be at most :size MB.', ['size' => DocumentFile::MAX_KILOBYTES / 1024]),
            'files.max' => __('No more than :count files at once.', ['count' => DocumentFile::MAX_FILES]),
        ];
    }
}
