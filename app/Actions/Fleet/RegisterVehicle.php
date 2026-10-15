<?php

namespace App\Actions\Fleet;

use App\Enums\OdometerSource;
use App\Enums\VehicleStatus;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleStatusChange;
use App\Support\OrganizationTime;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class RegisterVehicle
{
    public function __construct(
        private RecordOdometerReading $recordOdometerReading,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $actor, array $data): Vehicle
    {
        return DB::transaction(function () use ($actor, $data): Vehicle {
            $status = VehicleStatus::from($data['status'] ?? VehicleStatus::InService->value);

            $vehicle = new Vehicle([
                ...collect($data)->only((new Vehicle)->getFillable())->all(),
                'plate_number' => Vehicle::normalizePlate($data['plate_number']),
                'vin' => Vehicle::normalizeVin($data['vin'] ?? null),
            ]);
            $vehicle->status = $status;
            $vehicle->created_by = $actor->id;
            $vehicle->save();

            VehicleStatusChange::query()->create([
                'vehicle_id' => $vehicle->id,
                'from_status' => null,
                'to_status' => $status,
                'changed_at' => now(),
                'reason' => __('Vehicle registered'),
                'changed_by' => $actor->id,
            ]);

            if (isset($data['initial_odometer_km']) && $vehicle->type->has_odometer) {
                $recordedAt = isset($data['commissioned_on'])
                    ? CarbonImmutable::parse($data['commissioned_on'], OrganizationTime::timezone())->utc()
                    : CarbonImmutable::now();

                $this->recordOdometerReading->execute(
                    vehicle: $vehicle,
                    valueKm: (int) $data['initial_odometer_km'],
                    recordedAt: $recordedAt->isFuture() ? CarbonImmutable::now() : $recordedAt,
                    source: OdometerSource::Initial,
                    actor: $actor,
                );
            }

            return $vehicle->refresh();
        });
    }
}
