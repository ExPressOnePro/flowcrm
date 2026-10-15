<?php

namespace App\Actions\Documents;

use App\Enums\DocumentSubject;
use App\Models\Contracts\HasDocuments;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateDocument
{
    public function __construct(
        private StoreDocumentFiles $storeFiles,
        private ArchiveDocument $archiveDocument,
    ) {}

    /**
     * @param  array{document_type_id: int, number?: string|null, issuer?: string|null, issued_on?: string|null, expires_on?: string|null, notes?: string|null}  $data
     * @param  list<UploadedFile>  $files
     */
    public function execute(
        User $actor,
        HasDocuments $subject,
        array $data,
        array $files = [],
        ?string $idempotencyKey = null,
        ?Document $replaces = null,
    ): Document {
        // A repeated submit (double tap, retry on a flaky mobile network) returns the document already saved.
        if ($idempotencyKey !== null) {
            $existing = Document::query()->where('idempotency_key', $idempotencyKey)->first();

            if ($existing !== null) {
                return $existing;
            }
        }

        $type = DocumentType::query()->findOrFail($data['document_type_id']);

        if (! $subject->applicableDocumentTypes()->whereKey($type->id)->exists()) {
            throw ValidationException::withMessages([
                'document_type_id' => $subject->documentSubject() === DocumentSubject::Driver
                    ? __('This document type does not apply to drivers.')
                    : __('This document type does not apply to the vehicle.'),
            ]);
        }

        if ($replaces !== null && ($replaces->isArchived() || $replaces->document_type_id !== $type->id || ! $replaces->documentable()->is($subject))) {
            throw ValidationException::withMessages([
                'replaces_id' => __('Only a current document of the same type can be renewed.'),
            ]);
        }

        try {
            return $this->create($actor, $subject, $data, $files, $idempotencyKey, $replaces, $type);
        } catch (UniqueConstraintViolationException $exception) {
            if ($idempotencyKey === null) {
                throw $exception;
            }

            return Document::query()->where('idempotency_key', $idempotencyKey)->firstOrFail();
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<UploadedFile>  $files
     */
    private function create(
        User $actor,
        HasDocuments $subject,
        array $data,
        array $files,
        ?string $idempotencyKey,
        ?Document $replaces,
        DocumentType $type,
    ): Document {
        return DB::transaction(function () use ($actor, $subject, $data, $files, $idempotencyKey, $replaces, $type): Document {
            $document = new Document([
                'document_type_id' => $type->id,
                'number' => $data['number'] ?? null,
                'issuer' => $data['issuer'] ?? null,
                'issued_on' => $data['issued_on'] ?? null,
                'expires_on' => $type->has_expiry ? ($data['expires_on'] ?? null) : null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $actor->id,
                'idempotency_key' => $idempotencyKey,
            ]);
            $document->documentable()->associate($subject);
            $document->save();

            $this->storeFiles->execute($document, $files, $actor);

            if ($replaces !== null) {
                $this->archiveDocument->execute($replaces, $actor, __('Replaced by a renewed document'), $document);
            }

            return $document;
        });
    }
}
