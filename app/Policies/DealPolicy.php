<?php

namespace App\Policies;

use App\Models\Deal;
use App\Models\User;

class DealPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('deals.view');
    }

    public function view(User $user, Deal $deal): bool
    {
        return $user->can('deals.view');
    }

    public function create(User $user): bool
    {
        return $user->can('deals.create');
    }

    public function update(User $user, Deal $deal): bool
    {
        return $user->can('deals.update');
    }

    public function delete(User $user, Deal $deal): bool
    {
        return $user->can('deals.delete');
    }

    public function changeStage(User $user, Deal $deal): bool
    {
        return $user->can('deals.change_stage');
    }
}
