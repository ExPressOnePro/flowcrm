<?php

namespace App\Enums;

enum WaybillStatus: string
{
    case Draft = 'draft';
    case Issued = 'issued';
    case Closed = 'closed';
    case Cancelled = 'cancelled';
}
