<?php

namespace App\Actions\Documents;

use App\Models\Document;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class ArchiveDocument
{
    public function execute(Document $document, User $actor, string $reason, ?Document $replacedBy = null): Document
    {
        if ($document->isArchived()) {
            throw ValidationException::withMessages([
                'reason' => __('The document is already archived.'),
            ]);
        }

        $document->archived_at = now();
        $document->archived_by = $actor->id;
        $document->archive_reason = $reason;
        $document->replaced_by_id = $replacedBy?->id;
        $document->save();

        return $document;
    }
}
