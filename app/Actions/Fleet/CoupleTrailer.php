<?php

namespace App\Actions\Fleet;

use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleCoupling;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CoupleTrailer
{
    public function execute(
        Vehicle $tractor,
        Vehicle $trailer,
        User $actor,
        int $position = 1,
        ?CarbonImmutable $coupledAt = null,
        ?string $notes = null,
    ): VehicleCoupling {
        $coupledAt ??= CarbonImmutable::now();

        return DB::transaction(function () use ($tractor, $trailer, $actor, $position, $coupledAt, $notes): VehicleCoupling {
            $tractor = Vehicle::query()->with('type')->lockForUpdate()->findOrFail($tractor->id);
            $trailer = Vehicle::query()->with('type')->lockForUpdate()->findOrFail($trailer->id);

            $this->validate($tractor, $trailer, $position, $coupledAt);

            return VehicleCoupling::query()->create([
                'tractor_id' => $tractor->id,
                'trailer_id' => $trailer->id,
                'position' => $position,
                'coupled_at' => $coupledAt,
                'coupled_by' => $actor->id,
                'notes' => $notes,
            ]);
        });
    }

    private function validate(Vehicle $tractor, Vehicle $trailer, int $position, CarbonImmutable $coupledAt): void
    {
        $fail = fn (string $field, string $message) => throw ValidationException::withMessages([$field => $message]);

        if ($tractor->is($trailer)) {
            $fail('trailer_id', __('A vehicle cannot be coupled to itself.'));
        }

        if (! $tractor->type->can_tow) {
            $fail('trailer_id', __('This vehicle type cannot tow trailers.'));
        }

        if (! $trailer->type->is_towable) {
            $fail('trailer_id', __('The selected vehicle is not a trailer or semitrailer.'));
        }

        foreach ([$tractor, $trailer] as $vehicle) {
            if (! $vehicle->status->isOperational()) {
                $fail('trailer_id', __('Decommissioned vehicles cannot be coupled.'));
            }
        }

        if ($coupledAt->isFuture()) {
            $fail('coupled_at', __('The date cannot be in the future.'));
        }

        $trailerOverlaps = VehicleCoupling::query()
            ->where('trailer_id', $trailer->id)
            ->where(fn ($query) => $query
                ->whereNull('uncoupled_at')
                ->orWhere('uncoupled_at', '>', $coupledAt))
            ->exists();

        if ($trailerOverlaps) {
            $fail('trailer_id', __('The trailer is already coupled to another vehicle in this period.'));
        }

        $positionTaken = VehicleCoupling::query()
            ->where('tractor_id', $tractor->id)
            ->where('position', $position)
            ->where(fn ($query) => $query
                ->whereNull('uncoupled_at')
                ->orWhere('uncoupled_at', '>', $coupledAt))
            ->exists();

        if ($positionTaken) {
            $fail('position', __('This position is already occupied by another trailer.'));
        }
    }
}
