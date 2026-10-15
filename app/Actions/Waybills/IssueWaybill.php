<?php

namespace App\Actions\Waybills;

use App\Actions\Fleet\RecordOdometerReading;
use App\Enums\OdometerSource;
use App\Enums\WaybillStatus;
use App\Models\User;
use App\Models\Waybill;
use App\Services\WaybillChecks;
use App\Support\OrganizationTime;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class IssueWaybill
{
    private const NUMBER_ATTEMPTS = 3;

    public function __construct(
        private WaybillChecks $checks,
        private RecordOdometerReading $recordOdometerReading,
    ) {}

    /**
     * Assigns the next number of the year and records the departure odometer
     * reading (source "waybill departure") with the usual monotonic checks.
     */
    public function execute(Waybill $waybill, User $actor, CarbonImmutable $departureAt, ?int $odometerKm, ?float $fuelLiters = null): Waybill
    {
        for ($attempt = 1; ; $attempt++) {
            try {
                return DB::transaction(fn () => $this->issue($waybill, $actor, $departureAt, $odometerKm, $fuelLiters));
            } catch (UniqueConstraintViolationException $exception) {
                // Two waybills issued at the same moment got the same number; take the next one.
                if ($attempt >= self::NUMBER_ATTEMPTS) {
                    throw $exception;
                }
            }
        }
    }

    private function issue(Waybill $waybill, User $actor, CarbonImmutable $departureAt, ?int $odometerKm, ?float $fuelLiters): Waybill
    {
        $waybill = Waybill::query()->lockForUpdate()->findOrFail($waybill->id);

        if (! $waybill->isDraft()) {
            throw ValidationException::withMessages(['status' => __('Only a draft can be issued.')]);
        }

        $errors = $this->checks->blockingErrors($waybill);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        if ($departureAt->isAfter(CarbonImmutable::now()->addMinutes(5))) {
            throw ValidationException::withMessages(['departure_at' => __('The date cannot be in the future.')]);
        }

        $vehicle = $waybill->vehicle()->with('type')->firstOrFail();
        $reading = null;

        if ($vehicle->type->has_odometer) {
            if ($odometerKm === null) {
                throw ValidationException::withMessages(['departure_odometer_km' => __('Enter the odometer reading at departure.')]);
            }

            $reading = OdometerErrors::remap(
                fn () => $this->recordOdometerReading->execute(
                    $vehicle, $odometerKm, $departureAt, OdometerSource::WaybillDeparture, $actor, null, $waybill,
                ),
                valueField: 'departure_odometer_km',
                dateField: 'departure_at',
            );
        }

        $year = (int) CarbonImmutable::now(OrganizationTime::timezone())->format('Y');
        $sequence = (int) Waybill::query()->where('number_year', $year)->max('number_seq') + 1;

        $waybill->forceFill([
            'number_year' => $year,
            'number_seq' => $sequence,
            'number' => sprintf('%d-%05d', $year, $sequence),
            'status' => WaybillStatus::Issued,
            'departure_at' => $departureAt,
            'departure_odometer_km' => $reading?->value_km,
            'departure_reading_id' => $reading?->id,
            'departure_fuel_l' => $fuelLiters,
            'issued_by' => $actor->id,
            'issued_at' => now(),
        ])->save();

        return $waybill;
    }
}
