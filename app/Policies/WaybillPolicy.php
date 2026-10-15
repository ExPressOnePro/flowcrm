<?php

namespace App\Policies;

use App\Enums\WaybillStatus;
use App\Models\User;
use App\Models\Waybill;
use App\Support\BranchAccess;

class WaybillPolicy
{
    public function __construct(
        private BranchAccess $branchAccess,
    ) {}

    public function viewAny(User $user): bool
    {
        return $user->can('waybills.view');
    }

    public function view(User $user, Waybill $waybill): bool
    {
        return $user->can('waybills.view') && $this->inBranch($user, $waybill);
    }

    public function create(User $user): bool
    {
        return $user->can('waybills.create');
    }

    public function update(User $user, Waybill $waybill): bool
    {
        return $user->can('waybills.create')
            && $waybill->status === WaybillStatus::Draft
            && $this->inBranch($user, $waybill);
    }

    public function issue(User $user, Waybill $waybill): bool
    {
        return $user->can('waybills.issue')
            && $waybill->status === WaybillStatus::Draft
            && $this->inBranch($user, $waybill);
    }

    public function close(User $user, Waybill $waybill): bool
    {
        return $user->can('waybills.close')
            && $waybill->status === WaybillStatus::Issued
            && $this->inBranch($user, $waybill);
    }

    public function cancel(User $user, Waybill $waybill): bool
    {
        return $user->can('waybills.cancel')
            && in_array($waybill->status, [WaybillStatus::Draft, WaybillStatus::Issued], true)
            && $this->inBranch($user, $waybill);
    }

    private function inBranch(User $user, Waybill $waybill): bool
    {
        return $this->branchAccess->canSeeBranch($user, $waybill->branch_id);
    }
}
