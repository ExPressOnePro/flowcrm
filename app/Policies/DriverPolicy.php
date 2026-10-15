<?php

namespace App\Policies;

use App\Models\Driver;
use App\Models\User;
use App\Support\BranchAccess;

class DriverPolicy
{
    public function __construct(
        private BranchAccess $branchAccess,
    ) {}

    public function viewAny(User $user): bool
    {
        return $user->can('drivers.view');
    }

    public function view(User $user, Driver $driver): bool
    {
        return $user->can('drivers.view') && $this->branchAccess->canSeeBranch($user, $driver->branch_id);
    }

    public function create(User $user): bool
    {
        return $user->can('drivers.manage');
    }

    public function update(User $user, Driver $driver): bool
    {
        return $user->can('drivers.manage') && $this->branchAccess->canSeeBranch($user, $driver->branch_id);
    }
}
