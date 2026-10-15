<?php

namespace App\Enums;

enum OdometerSource: string
{
    case Initial = 'initial';
    case Manual = 'manual';
    case WaybillDeparture = 'waybill_departure';
    case WaybillReturn = 'waybill_return';
    case Maintenance = 'maintenance';
    case Telematics = 'telematics';

    public function isDeviceReported(): bool
    {
        return $this === self::Telematics;
    }
}
