<?php

namespace App\Enums;

enum VehicleStatus: string
{
    case InService = 'in_service';
    case UnderRepair = 'under_repair';
    case Idle = 'idle';
    case Decommissioned = 'decommissioned';

    public function isOperational(): bool
    {
        return $this !== self::Decommissioned;
    }
}
