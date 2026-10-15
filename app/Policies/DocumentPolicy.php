<?php

namespace App\Policies;

use App\Models\Contracts\HasDocuments;
use App\Models\Document;
use App\Models\User;
use App\Models\Vehicle;
use App\Support\BranchAccess;

/**
 * There is deliberately no delete ability: documents are archived, never removed.
 */
class DocumentPolicy
{
    public function __construct(
        private BranchAccess $branchAccess,
    ) {}

    public function viewAny(User $user): bool
    {
        return $user->can('documents.view');
    }

    public function view(User $user, Document $document): bool
    {
        return $user->can('documents.view') && $this->canSeeSubject($user, $document);
    }

    public function create(User $user, ?HasDocuments $subject = null): bool
    {
        if (! $user->can('documents.create')) {
            return false;
        }

        if ($subject === null) {
            return true;
        }

        return ! ($subject instanceof Vehicle && $subject->trashed())
            && $this->branchAccess->canSeeBranch($user, $subject->documentBranchId());
    }

    public function update(User $user, Document $document): bool
    {
        return $user->can('documents.update')
            && ! $document->isArchived()
            && $this->canSeeSubject($user, $document);
    }

    public function attachFiles(User $user, Document $document): bool
    {
        return ($user->can('documents.update') || $user->can('documents.create'))
            && ! $document->isArchived()
            && $this->canSeeSubject($user, $document);
    }

    public function archive(User $user, Document $document): bool
    {
        return $user->can('documents.archive')
            && ! $document->isArchived()
            && $this->canSeeSubject($user, $document);
    }

    private function canSeeSubject(User $user, Document $document): bool
    {
        $subject = $document->documentable;

        return $subject instanceof HasDocuments
            && $this->branchAccess->canSeeBranch($user, $subject->documentBranchId());
    }
}
