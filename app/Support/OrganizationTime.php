<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Converts wall-clock input from the UI (in the organization's timezone)
 * into UTC timestamps for storage, and resolves "today" for date-only rules.
 */
class OrganizationTime
{
    public static function timezone(): string
    {
        return app(CurrentOrganization::class)->get()?->timezone ?? config('app.timezone');
    }

    public static function parse(?string $value): ?CarbonImmutable
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return CarbonImmutable::parse($value, self::timezone())->utc();
    }

    public static function today(): CarbonImmutable
    {
        return CarbonImmutable::now(self::timezone())->startOfDay();
    }
}
