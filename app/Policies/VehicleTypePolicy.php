<?php

namespace App\Policies;

use App\Models\User;
use App\Models\VehicleType;

class VehicleTypePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('vehicle_types.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('vehicle_types.manage');
    }

    public function update(User $user, VehicleType $vehicleType): bool
    {
        return $user->can('vehicle_types.manage');
    }
}
