<?php

namespace App\Actions\Fleet;

use App\Enums\OdometerSource;
use App\Models\OdometerReading;
use App\Models\User;
use App\Models\Vehicle;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecordOdometerReading
{
    private const DUPLICATE_WINDOW_SECONDS = 60;

    /**
     * Readings must be monotonic in time: a value can't be lower than any earlier
     * reading or higher than any later one. A replaced odometer is a future
     * "odometer reset" feature, not something to bypass here.
     */
    public function execute(
        Vehicle $vehicle,
        int $valueKm,
        CarbonImmutable $recordedAt,
        OdometerSource $source,
        ?User $actor = null,
        ?string $note = null,
        ?Model $sourceable = null,
    ): OdometerReading {
        return DB::transaction(function () use ($vehicle, $valueKm, $recordedAt, $source, $actor, $note, $sourceable): OdometerReading {
            $vehicle = Vehicle::query()->with('type')->lockForUpdate()->findOrFail($vehicle->id);

            if (! $vehicle->type->has_odometer) {
                throw ValidationException::withMessages([
                    'value_km' => __('This vehicle type does not track odometer readings.'),
                ]);
            }

            // A repeated submit (double tap, retry on a flaky mobile network) returns the reading already saved.
            if ($actor !== null && $sourceable === null) {
                $duplicate = OdometerReading::query()
                    ->where('vehicle_id', $vehicle->id)
                    ->where('value_km', $valueKm)
                    ->where('source', $source->value)
                    ->where('recorded_by', $actor->id)
                    ->where('created_at', '>=', now()->subSeconds(self::DUPLICATE_WINDOW_SECONDS))
                    ->latest('id')
                    ->first();

                if ($duplicate !== null) {
                    return $duplicate;
                }
            }

            if ($valueKm < 0) {
                throw ValidationException::withMessages([
                    'value_km' => __('The odometer value cannot be negative.'),
                ]);
            }

            if ($recordedAt->isAfter(CarbonImmutable::now()->addMinutes(5))) {
                throw ValidationException::withMessages([
                    'recorded_at' => __('The date cannot be in the future.'),
                ]);
            }

            $previous = OdometerReading::query()
                ->where('vehicle_id', $vehicle->id)
                ->where('recorded_at', '<=', $recordedAt)
                ->max('value_km');

            if ($previous !== null && $valueKm < (int) $previous) {
                throw ValidationException::withMessages([
                    'value_km' => __('The value is lower than the previous reading (:km km).', ['km' => number_format((int) $previous, 0, '.', ' ')]),
                ]);
            }

            $next = OdometerReading::query()
                ->where('vehicle_id', $vehicle->id)
                ->where('recorded_at', '>', $recordedAt)
                ->min('value_km');

            if ($next !== null && $valueKm > (int) $next) {
                throw ValidationException::withMessages([
                    'value_km' => __('The value is higher than a later reading (:km km).', ['km' => number_format((int) $next, 0, '.', ' ')]),
                ]);
            }

            $reading = OdometerReading::query()->create([
                'vehicle_id' => $vehicle->id,
                'value_km' => $valueKm,
                'recorded_at' => $recordedAt,
                'source' => $source,
                'sourceable_type' => $sourceable?->getMorphClass(),
                'sourceable_id' => $sourceable?->getKey(),
                'note' => $note,
                'recorded_by' => $actor?->id,
            ]);

            $vehicle->current_odometer_km = (int) OdometerReading::query()
                ->where('vehicle_id', $vehicle->id)
                ->orderByDesc('recorded_at')
                ->orderByDesc('id')
                ->value('value_km');
            $vehicle->save();

            return $reading;
        });
    }
}
