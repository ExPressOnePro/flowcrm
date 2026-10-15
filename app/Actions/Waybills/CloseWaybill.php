<?php

namespace App\Actions\Waybills;

use App\Actions\Fleet\RecordOdometerReading;
use App\Enums\OdometerSource;
use App\Enums\WaybillStatus;
use App\Models\User;
use App\Models\Waybill;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CloseWaybill
{
    public function __construct(
        private RecordOdometerReading $recordOdometerReading,
    ) {}

    /**
     * The return reading goes to the odometer history (source "waybill return").
     * Distance is derived from the two readings only; without them it stays empty.
     */
    public function execute(Waybill $waybill, User $actor, CarbonImmutable $returnAt, ?int $odometerKm, ?string $notes = null, ?float $returnFuel = null, ?float $fuelAdded = null): Waybill
    {
        return DB::transaction(function () use ($waybill, $actor, $returnAt, $odometerKm, $notes, $returnFuel, $fuelAdded): Waybill {
            $waybill = Waybill::query()->lockForUpdate()->findOrFail($waybill->id);

            if (! $waybill->isOpen()) {
                throw ValidationException::withMessages(['status' => __('Only an issued waybill can be closed.')]);
            }

            if ($returnAt->isAfter(CarbonImmutable::now()->addMinutes(5))) {
                throw ValidationException::withMessages(['return_at' => __('The date cannot be in the future.')]);
            }

            if ($waybill->departure_at !== null && $returnAt->lt($waybill->departure_at)) {
                throw ValidationException::withMessages(['return_at' => __('The return cannot be earlier than the departure.')]);
            }

            $vehicle = $waybill->vehicle()->with('type')->firstOrFail();
            $reading = null;

            if ($vehicle->type->has_odometer) {
                if ($odometerKm === null) {
                    throw ValidationException::withMessages(['return_odometer_km' => __('Enter the odometer reading on return.')]);
                }

                if ($waybill->departure_odometer_km !== null && $odometerKm < $waybill->departure_odometer_km) {
                    throw ValidationException::withMessages([
                        'return_odometer_km' => __('The value is lower than at departure (:km km).', [
                            'km' => number_format($waybill->departure_odometer_km, 0, '.', ' '),
                        ]),
                    ]);
                }

                $reading = OdometerErrors::remap(
                    fn () => $this->recordOdometerReading->execute(
                        $vehicle, $odometerKm, $returnAt, OdometerSource::WaybillReturn, $actor, null, $waybill,
                    ),
                    valueField: 'return_odometer_km',
                    dateField: 'return_at',
                );
            }

            $waybill->forceFill([
                'status' => WaybillStatus::Closed,
                'return_at' => $returnAt,
                'return_odometer_km' => $reading?->value_km,
                'return_reading_id' => $reading?->id,
                'distance_km' => $reading !== null && $waybill->departure_odometer_km !== null
                    ? $reading->value_km - $waybill->departure_odometer_km
                    : null,
                'notes' => $notes ?? $waybill->notes,
                'return_fuel_l' => $returnFuel,
                'fuel_added_l' => $fuelAdded,
                'closed_by' => $actor->id,
                'closed_at' => now(),
            ])->save();

            return $waybill;
        });
    }
}
