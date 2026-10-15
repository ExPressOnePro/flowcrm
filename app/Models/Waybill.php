<?php

namespace App\Models;

use App\Enums\WaybillStatus;
use App\Models\Concerns\BelongsToOrganization;
use App\Support\BranchAccess;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Lifecycle: draft → issued → closed, or cancelled from draft/issued.
 * Only drafts are editable; the number is assigned when the waybill is issued.
 * Status and odometer fields change only through the Waybills actions.
 *
 * @property int $id
 * @property int $organization_id
 * @property int|null $branch_id
 * @property int|null $number_year
 * @property int|null $number_seq
 * @property string|null $number
 * @property WaybillStatus $status
 * @property int $vehicle_id
 * @property int|null $trailer_id
 * @property int $driver_id
 * @property string $route
 * @property string|null $notes
 * @property CarbonImmutable $planned_departure_at
 * @property CarbonImmutable|null $planned_return_at
 * @property CarbonImmutable|null $departure_at
 * @property int|null $departure_odometer_km
 * @property int|null $departure_reading_id
 * @property CarbonImmutable|null $return_at
 * @property int|null $return_odometer_km
 * @property int|null $return_reading_id
 * @property int|null $distance_km
 * @property int|null $issued_by
 * @property CarbonImmutable|null $issued_at
 * @property int|null $closed_by
 * @property CarbonImmutable|null $closed_at
 * @property int|null $cancelled_by
 * @property CarbonImmutable|null $cancelled_at
 * @property string|null $cancel_reason
 * @property int|null $created_by
 * @property string|null $idempotency_key
 * @property-read Vehicle $vehicle
 * @property-read Vehicle|null $trailer
 * @property-read Driver $driver
 */
class Waybill extends Model
{
    use BelongsToOrganization, LogsActivity;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'vehicle_id',
        'trailer_id',
        'driver_id',
        'route',
        'basis',
        'notes',
        'planned_departure_at',
        'planned_return_at',
        'created_by',
        'idempotency_key',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => WaybillStatus::class,
            'planned_departure_at' => 'datetime',
            'planned_return_at' => 'datetime',
            'departure_at' => 'datetime',
            'return_at' => 'datetime',
            'issued_at' => 'datetime',
            'closed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'number_year' => 'integer',
            'number_seq' => 'integer',
            'departure_odometer_km' => 'integer',
            'return_odometer_km' => 'integer',
            'distance_km' => 'integer',
            'departure_fuel_l' => 'float',
            'return_fuel_l' => 'float',
            'fuel_added_l' => 'float',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('waybills')
            ->logOnly([
                'number', 'status', 'vehicle_id', 'trailer_id', 'driver_id', 'route', 'basis', 'notes',
                'planned_departure_at', 'planned_return_at', 'departure_at', 'departure_odometer_km',
                'return_at', 'return_odometer_km', 'distance_km', 'cancel_reason',
                'departure_fuel_l', 'return_fuel_l', 'fuel_added_l',
            ])
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    public function isDraft(): bool
    {
        return $this->status === WaybillStatus::Draft;
    }

    public function isOpen(): bool
    {
        return $this->status === WaybillStatus::Issued;
    }

    public function isReturnOverdue(?CarbonInterface $now = null): bool
    {
        return $this->isOpen()
            && $this->planned_return_at !== null
            && $this->planned_return_at->lt($now ?? now());
    }

    /**
     * @param  Builder<Waybill>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        $branchIds = app(BranchAccess::class)->visibleBranchIds($user);

        if ($branchIds === null) {
            return;
        }

        $query->whereIn($this->qualifyColumn('branch_id'), $branchIds);
    }

    /**
     * @param  Builder<Waybill>  $query
     */
    public function scopeOpen(Builder $query): void
    {
        $query->where('status', WaybillStatus::Issued->value);
    }

    /**
     * @param  Builder<Waybill>  $query
     */
    public function scopeReturnOverdue(Builder $query): void
    {
        $query->open()->whereNotNull('planned_return_at')->where('planned_return_at', '<', now());
    }

    /**
     * @param  Builder<Waybill>  $query
     */
    public function scopeSearch(Builder $query, string $term): void
    {
        $compact = str_replace([' ', '-'], '', mb_strtoupper($term));

        $query->where(fn (Builder $query) => $query
            ->where('number', 'like', "%{$term}%")
            ->orWhere('route', 'like', "%{$term}%")
            ->orWhereHas('vehicle', fn (Builder $query) => $query
                ->withTrashed()
                ->whereRaw("REPLACE(REPLACE(UPPER(plate_number), ' ', ''), '-', '') LIKE ?", ["%{$compact}%"]))
            ->orWhereHas('driver', fn (Builder $query) => $query->search($term)));
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class)->withTrashed();
    }

    public function trailer(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'trailer_id')->withTrashed();
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function departureReading(): BelongsTo
    {
        return $this->belongsTo(OdometerReading::class, 'departure_reading_id');
    }

    public function returnReading(): BelongsTo
    {
        return $this->belongsTo(OdometerReading::class, 'return_reading_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }
}
