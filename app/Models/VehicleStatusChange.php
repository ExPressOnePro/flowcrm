<?php

namespace App\Models;

use App\Enums\VehicleStatus;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Append-only: rows are never updated or deleted by application code.
 *
 * @property int $id
 * @property int $organization_id
 * @property int $vehicle_id
 * @property VehicleStatus|null $from_status
 * @property VehicleStatus $to_status
 * @property Carbon $changed_at
 * @property string|null $reason
 * @property int|null $changed_by
 */
class VehicleStatusChange extends Model
{
    use BelongsToOrganization;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'vehicle_id',
        'from_status',
        'to_status',
        'changed_at',
        'reason',
        'changed_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'from_status' => VehicleStatus::class,
            'to_status' => VehicleStatus::class,
            'changed_at' => 'datetime',
        ];
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class)->withTrashed();
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
