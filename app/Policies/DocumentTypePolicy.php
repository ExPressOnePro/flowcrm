<?php

namespace App\Policies;

use App\Models\DocumentType;
use App\Models\User;

class DocumentTypePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('document_types.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('document_types.manage');
    }

    public function update(User $user, DocumentType $documentType): bool
    {
        return $user->can('document_types.manage');
    }
}
