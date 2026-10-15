<?php

namespace App\Enums;

/**
 * Derived from the expiry date in the organization's timezone; never stored.
 * Describes the paperwork only, not whether a vehicle may legally operate.
 */
enum DocumentState: string
{
    case Valid = 'valid';
    case Expiring = 'expiring';
    case Expired = 'expired';
    case NoExpiry = 'no_expiry';
    case Archived = 'archived';

    public function needsAttention(): bool
    {
        return $this === self::Expiring || $this === self::Expired;
    }
}
