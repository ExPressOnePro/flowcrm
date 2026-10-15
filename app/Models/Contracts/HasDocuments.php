<?php

namespace App\Models\Contracts;

use App\Enums\DocumentSubject;
use App\Models\DocumentType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * A record that documents can be attached to (vehicle, driver).
 */
interface HasDocuments
{
    public function documents(): MorphMany;

    public function documentSubject(): DocumentSubject;

    /**
     * @return Builder<DocumentType>
     */
    public function applicableDocumentTypes(): Builder;

    public function documentBranchId(): ?int;

    public function documentLabel(): string;

    public function documentsUrl(): string;

    /**
     * Documents of decommissioned vehicles or inactive drivers don't trigger reminders.
     */
    public function isOperational(): bool;
}
