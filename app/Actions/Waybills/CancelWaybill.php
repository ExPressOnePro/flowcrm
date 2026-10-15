<?php

namespace App\Actions\Waybills;

use App\Enums\WaybillStatus;
use App\Models\User;
use App\Models\Waybill;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CancelWaybill
{
    /**
     * The waybill and its number stay in the register; an odometer reading taken
     * at departure is real history and is kept.
     */
    public function execute(Waybill $waybill, User $actor, string $reason): Waybill
    {
        return DB::transaction(function () use ($waybill, $actor, $reason): Waybill {
            $waybill = Waybill::query()->lockForUpdate()->findOrFail($waybill->id);

            if (! in_array($waybill->status, [WaybillStatus::Draft, WaybillStatus::Issued], true)) {
                throw ValidationException::withMessages(['status' => __('This waybill can no longer be cancelled.')]);
            }

            $waybill->forceFill([
                'status' => WaybillStatus::Cancelled,
                'cancel_reason' => $reason,
                'cancelled_by' => $actor->id,
                'cancelled_at' => now(),
            ])->save();

            return $waybill;
        });
    }
}
