<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Vehicle;
use App\Support\BranchAccess;

class VehiclePolicy
{
    public function __construct(
        private BranchAccess $branchAccess,
    ) {}

    public function viewAny(User $user): bool
    {
        return $user->can('vehicles.view');
    }

    public function view(User $user, Vehicle $vehicle): bool
    {
        return $user->can('vehicles.view') && $this->inBranch($user, $vehicle);
    }

    public function create(User $user): bool
    {
        return $user->can('vehicles.create');
    }

    public function update(User $user, Vehicle $vehicle): bool
    {
        return $user->can('vehicles.update') && $this->inBranch($user, $vehicle);
    }

    public function changeStatus(User $user, Vehicle $vehicle): bool
    {
        return $user->can('vehicles.change_status') && $this->inBranch($user, $vehicle);
    }

    public function couple(User $user, Vehicle $vehicle): bool
    {
        return $user->can('vehicles.couple') && $this->inBranch($user, $vehicle);
    }

    public function recordOdometer(User $user, Vehicle $vehicle): bool
    {
        return $user->can('odometer.record') && $this->inBranch($user, $vehicle);
    }

    public function delete(User $user, Vehicle $vehicle): bool
    {
        return $user->can('vehicles.archive') && $this->inBranch($user, $vehicle);
    }

    public function viewAudit(User $user, Vehicle $vehicle): bool
    {
        return $user->can('audit.view') && $this->inBranch($user, $vehicle);
    }

    private function inBranch(User $user, Vehicle $vehicle): bool
    {
        return $this->branchAccess->canSeeBranch($user, $vehicle->branch_id);
    }
}
