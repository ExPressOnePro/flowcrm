<?php

namespace App\Actions\Fleet;

use App\Enums\VehicleStatus;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleCoupling;
use App\Models\VehicleStatusChange;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChangeVehicleStatus
{
    public function __construct(
        private UncoupleTrailer $uncoupleTrailer,
    ) {}

    public function execute(
        Vehicle $vehicle,
        VehicleStatus $status,
        User $actor,
        ?string $reason = null,
        ?CarbonImmutable $changedAt = null,
    ): VehicleStatusChange {
        $changedAt ??= CarbonImmutable::now();

        if ($vehicle->status === $status) {
            throw ValidationException::withMessages([
                'status' => __('The vehicle already has this status.'),
            ]);
        }

        if ($changedAt->isFuture()) {
            throw ValidationException::withMessages([
                'changed_at' => __('The date cannot be in the future.'),
            ]);
        }

        return DB::transaction(function () use ($vehicle, $status, $actor, $reason, $changedAt): VehicleStatusChange {
            $change = VehicleStatusChange::query()->create([
                'vehicle_id' => $vehicle->id,
                'from_status' => $vehicle->status,
                'to_status' => $status,
                'changed_at' => $changedAt,
                'reason' => $reason,
                'changed_by' => $actor->id,
            ]);

            $vehicle->status = $status;
            $vehicle->save();

            if ($status === VehicleStatus::Decommissioned) {
                VehicleCoupling::query()
                    ->whereNull('uncoupled_at')
                    ->where(fn ($query) => $query
                        ->where('tractor_id', $vehicle->id)
                        ->orWhere('trailer_id', $vehicle->id))
                    ->get()
                    ->each(fn (VehicleCoupling $coupling) => $this->uncoupleTrailer->execute(
                        $coupling,
                        $actor,
                        $changedAt->max($coupling->coupled_at),
                    ));
            }

            return $change;
        });
    }
}
