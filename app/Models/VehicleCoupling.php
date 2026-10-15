<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $tractor_id
 * @property int $trailer_id
 * @property int $position
 * @property Carbon $coupled_at
 * @property Carbon|null $uncoupled_at
 * @property int|null $coupled_by
 * @property int|null $uncoupled_by
 * @property string|null $notes
 */
class VehicleCoupling extends Model
{
    use BelongsToOrganization, LogsActivity;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'tractor_id',
        'trailer_id',
        'position',
        'coupled_at',
        'uncoupled_at',
        'coupled_by',
        'uncoupled_by',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'coupled_at' => 'datetime',
            'uncoupled_at' => 'datetime',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('fleet')
            ->logOnly(['tractor_id', 'trailer_id', 'position', 'coupled_at', 'uncoupled_at', 'notes'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    public function tractor(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'tractor_id')->withTrashed();
    }

    public function trailer(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'trailer_id')->withTrashed();
    }

    public function coupledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coupled_by');
    }

    public function uncoupledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uncoupled_by');
    }
}
