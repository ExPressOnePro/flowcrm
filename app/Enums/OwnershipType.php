<?php

namespace App\Enums;

enum OwnershipType: string
{
    case Owned = 'owned';
    case Leased = 'leased';
    case Rented = 'rented';
}
