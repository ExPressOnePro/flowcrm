<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $document_id
 * @property int $threshold_days 0 = already expired
 */
class DocumentAlert extends Model
{
    use BelongsToOrganization;

    public const UPDATED_AT = null;

    /**
     * Days before expiry at which reminders go out; 0 means "has expired".
     *
     * @var list<int>
     */
    public const THRESHOLDS = [30, 14, 7, 1, 0];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'document_id',
        'threshold_days',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * Thresholds reached for a document with the given number of days left,
     * ordered from least to most urgent.
     *
     * @return list<int>
     */
    public static function reached(int $daysLeft): array
    {
        return array_values(array_filter(
            self::THRESHOLDS,
            fn (int $threshold) => $threshold === 0 ? $daysLeft < 0 : $daysLeft <= $threshold,
        ));
    }
}
