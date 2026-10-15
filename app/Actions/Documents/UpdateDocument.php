<?php

namespace App\Actions\Documents;

use App\Models\Document;
use App\Models\DocumentAlert;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateDocument
{
    /**
     * Every change is written to the activity log. A new expiry date restarts
     * the reminder schedule for the document.
     *
     * @param  array{number?: string|null, issuer?: string|null, issued_on?: string|null, expires_on?: string|null, notes?: string|null}  $data
     */
    public function execute(Document $document, array $data): Document
    {
        if ($document->isArchived()) {
            throw ValidationException::withMessages([
                'number' => __('Archived documents cannot be changed.'),
            ]);
        }

        return DB::transaction(function () use ($document, $data): Document {
            $document->fill([
                'number' => $data['number'] ?? null,
                'issuer' => $data['issuer'] ?? null,
                'issued_on' => $data['issued_on'] ?? null,
                'expires_on' => $document->type->has_expiry ? ($data['expires_on'] ?? null) : null,
                'notes' => $data['notes'] ?? null,
            ]);

            if ($document->isDirty('expires_on')) {
                DocumentAlert::query()->where('document_id', $document->id)->delete();
            }

            $document->save();

            return $document;
        });
    }
}
