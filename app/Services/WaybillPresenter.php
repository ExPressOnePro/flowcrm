<?php

namespace App\Services;

use App\Models\Waybill;
use App\Support\OrganizationTime;
use Carbon\CarbonInterface;

class WaybillPresenter
{
    /**
     * Relations expected: vehicle, trailer, driver, branch.
     *
     * @return array<string, mixed>
     */
    public static function item(Waybill $waybill): array
    {
        return [
            'id' => $waybill->id,
            'number' => $waybill->number,
            'status' => $waybill->status->value,
            'overdue' => $waybill->isReturnOverdue(),
            'route' => $waybill->route,
            'vehicle' => [
                'id' => $waybill->vehicle->id,
                'plate_number' => $waybill->vehicle->plate_number,
            ],
            'trailer' => $waybill->trailer ? [
                'id' => $waybill->trailer->id,
                'plate_number' => $waybill->trailer->plate_number,
            ] : null,
            'driver' => [
                'id' => $waybill->driver->id,
                'name' => $waybill->driver->full_name,
            ],
            'branch' => $waybill->branch?->name,
            'planned_departure_at' => self::iso($waybill->planned_departure_at),
            'planned_return_at' => self::iso($waybill->planned_return_at),
            'departure_at' => self::iso($waybill->departure_at),
            'return_at' => self::iso($waybill->return_at),
            'distance_km' => $waybill->distance_km,
        ];
    }

    public static function iso(?CarbonInterface $moment): ?string
    {
        return $moment?->toIso8601String();
    }

    /**
     * Value for `<input type="datetime-local">` in the organization's time zone.
     */
    public static function local(?CarbonInterface $moment): ?string
    {
        return $moment?->copy()->setTimezone(OrganizationTime::timezone())->format('Y-m-d\TH:i');
    }
}
