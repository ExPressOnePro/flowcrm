<?php

namespace App\Models;

use App\Enums\OdometerSource;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * Append-only: corrections are recorded as new readings, never by editing old ones.
 *
 * @property int $id
 * @property int $organization_id
 * @property int $vehicle_id
 * @property int $value_km
 * @property Carbon $recorded_at
 * @property OdometerSource $source
 * @property string|null $sourceable_type
 * @property int|null $sourceable_id
 * @property string|null $note
 * @property int|null $recorded_by
 */
class OdometerReading extends Model
{
    use BelongsToOrganization;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'vehicle_id',
        'value_km',
        'recorded_at',
        'source',
        'sourceable_type',
        'sourceable_id',
        'note',
        'recorded_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value_km' => 'integer',
            'recorded_at' => 'datetime',
            'source' => OdometerSource::class,
        ];
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class)->withTrashed();
    }

    public function sourceable(): MorphTo
    {
        return $this->morphTo();
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
