<?php

namespace App\Actions\Waybills;

use App\Enums\WaybillStatus;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Waybill;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;

class SaveWaybillDraft
{
    /**
     * @param  array{vehicle_id: int, trailer_id?: int|null, driver_id: int, route: string, basis?: string|null, notes?: string|null, planned_departure_at: CarbonImmutable, planned_return_at?: CarbonImmutable|null}  $data
     */
    public function create(User $actor, array $data, ?string $idempotencyKey = null): Waybill
    {
        // A repeated submit (double tap, retry on a flaky mobile network) returns the draft already saved.
        if ($idempotencyKey !== null) {
            $existing = Waybill::query()->where('idempotency_key', $idempotencyKey)->first();

            if ($existing !== null) {
                return $existing;
            }
        }

        $waybill = new Waybill([...$data, 'created_by' => $actor->id, 'idempotency_key' => $idempotencyKey]);
        $waybill->status = WaybillStatus::Draft;
        $waybill->branch_id = Vehicle::query()->withTrashed()->whereKey($data['vehicle_id'])->value('branch_id');

        try {
            $waybill->save();
        } catch (UniqueConstraintViolationException $exception) {
            if ($idempotencyKey === null) {
                throw $exception;
            }

            return Waybill::query()->where('idempotency_key', $idempotencyKey)->firstOrFail();
        }

        return $waybill;
    }

    /**
     * @param  array{vehicle_id: int, trailer_id?: int|null, driver_id: int, route: string, basis?: string|null, notes?: string|null, planned_departure_at: CarbonImmutable, planned_return_at?: CarbonImmutable|null}  $data
     */
    public function update(Waybill $waybill, array $data): Waybill
    {
        if (! $waybill->isDraft()) {
            throw ValidationException::withMessages([
                'status' => __('Only a draft can be edited.'),
            ]);
        }

        $waybill->fill($data);
        $waybill->branch_id = Vehicle::query()->withTrashed()->whereKey($waybill->vehicle_id)->value('branch_id');
        $waybill->save();

        return $waybill;
    }
}
