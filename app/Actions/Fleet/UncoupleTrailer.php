<?php

namespace App\Actions\Fleet;

use App\Models\User;
use App\Models\VehicleCoupling;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

class UncoupleTrailer
{
    public function execute(
        VehicleCoupling $coupling,
        User $actor,
        ?CarbonImmutable $uncoupledAt = null,
    ): VehicleCoupling {
        $uncoupledAt ??= CarbonImmutable::now();

        if ($coupling->uncoupled_at !== null) {
            throw ValidationException::withMessages([
                'uncoupled_at' => __('This coupling is already closed.'),
            ]);
        }

        if ($uncoupledAt->lt($coupling->coupled_at)) {
            throw ValidationException::withMessages([
                'uncoupled_at' => __('Uncoupling cannot be earlier than coupling.'),
            ]);
        }

        if ($uncoupledAt->isFuture()) {
            throw ValidationException::withMessages([
                'uncoupled_at' => __('The date cannot be in the future.'),
            ]);
        }

        $coupling->update([
            'uncoupled_at' => $uncoupledAt,
            'uncoupled_by' => $actor->id,
        ]);

        return $coupling->refresh();
    }
}
