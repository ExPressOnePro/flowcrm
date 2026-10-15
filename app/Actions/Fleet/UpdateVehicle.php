<?php

namespace App\Actions\Fleet;

use App\Models\Vehicle;
use Illuminate\Validation\ValidationException;

class UpdateVehicle
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Vehicle $vehicle, array $data): Vehicle
    {
        $attributes = collect($data)->only($vehicle->getFillable())->all();

        if (array_key_exists('plate_number', $attributes)) {
            $attributes['plate_number'] = Vehicle::normalizePlate($attributes['plate_number']);
        }

        if (array_key_exists('vin', $attributes)) {
            $attributes['vin'] = Vehicle::normalizeVin($attributes['vin']);
        }

        if (
            array_key_exists('vehicle_type_id', $attributes)
            && (int) $attributes['vehicle_type_id'] !== $vehicle->vehicle_type_id
            && ($vehicle->activeTowingCouplings()->exists() || $vehicle->activeTowedCoupling()->exists())
        ) {
            throw ValidationException::withMessages([
                'vehicle_type_id' => __('Uncouple the vehicle before changing its type.'),
            ]);
        }

        $vehicle->update($attributes);

        return $vehicle->refresh();
    }
}
