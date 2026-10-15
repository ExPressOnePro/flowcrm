<?php

namespace App\Services;

use App\Enums\DocumentState;
use App\Models\Document;
use App\Models\DocumentFile;
use App\Models\DocumentType;
use App\Models\Contracts\HasDocuments;
use App\Support\OrganizationTime;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class SubjectDocuments
{
    /**
     * @return Collection<int, Document>
     */
    public function current(HasDocuments $subject): Collection
    {
        return $subject->documents()
            ->active()
            ->with(['type', 'files', 'createdBy:id,first_name,last_name'])
            ->orderByRaw('expires_on IS NULL')
            ->orderBy('expires_on')
            ->orderBy('id')
            ->get();
    }

    /**
     * Mandatory types (per the organization's catalog) without a current document.
     *
     * @return Collection<int, DocumentType>
     */
    public function missingMandatory(HasDocuments $subject, ?Collection $current = null): Collection
    {
        $current ??= $subject->documents()->active()->get(['id', 'document_type_id']);
        $present = $current->pluck('document_type_id')->unique()->all();

        return $subject->applicableDocumentTypes()
            ->where('is_active', true)
            ->where('is_mandatory', true)
            ->whereNotIn('id', $present)
            ->orderBy('name')
            ->get();
    }

    /**
     * Short list for the card header: what is expired, expiring or missing.
     *
     * @return array{expired: list<array{id: int, name: string, expires_on: string|null}>, expiring: list<array{id: int, name: string, expires_on: string|null, days_left: int|null}>, missing: list<string>}
     */
    public function summary(HasDocuments $subject): array
    {
        $today = OrganizationTime::today();
        $current = $subject->documents()->active()->with('type:id,name')->get();

        $byState = fn (DocumentState $state) => $current
            ->filter(fn (Document $document) => $document->state($today) === $state)
            ->sortBy('expires_on')
            ->map(fn (Document $document) => [
                'id' => $document->id,
                'name' => $document->type->name,
                'expires_on' => $document->expires_on?->toDateString(),
                'days_left' => $document->daysLeft($today),
            ])
            ->values()
            ->all();

        return [
            'expired' => $byState(DocumentState::Expired),
            'expiring' => $byState(DocumentState::Expiring),
            'missing' => $this->missingMandatory($subject, $current)->pluck('name')->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function present(Document $document, ?CarbonImmutable $today = null): array
    {
        $today ??= OrganizationTime::today();

        return [
            'id' => $document->id,
            'type' => [
                'id' => $document->type->id,
                'name' => $document->type->name,
                'has_expiry' => $document->type->has_expiry,
            ],
            'number' => $document->number,
            'issuer' => $document->issuer,
            'issued_on' => $document->issued_on?->toDateString(),
            'expires_on' => $document->expires_on?->toDateString(),
            'days_left' => $document->daysLeft($today),
            'state' => $document->state($today)->value,
            'notes' => $document->notes,
            'created_by' => $document->createdBy?->name,
            'created_at' => $document->created_at?->toIso8601String(),
            'archived_at' => $document->archived_at?->toIso8601String(),
            'archive_reason' => $document->archive_reason,
            'archived_by' => $document->archivedBy?->name,
            'replaced_by_id' => $document->replaced_by_id,
            'files' => $document->relationLoaded('files')
                ? $document->files->map(fn (DocumentFile $file) => [
                    'id' => $file->id,
                    'name' => $file->original_name,
                    'mime_type' => $file->mime_type,
                    'size' => $file->size,
                    'is_image' => str_starts_with($file->mime_type, 'image/'),
                    'url' => route('documents.files.show', [$document->id, $file->id]),
                ])->values()->all()
                : [],
        ];
    }
}
