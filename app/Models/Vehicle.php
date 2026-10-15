<?php

namespace App\Models;

use App\Enums\OwnershipType;
use App\Enums\VehicleStatus;
use App\Models\Concerns\BelongsToOrganization;
use App\Support\BranchAccess;
use Database\Factories\VehicleFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property int $organization_id
 * @property int|null $branch_id
 * @property int $vehicle_type_id
 * @property string $plate_number
 * @property string|null $vin
 * @property string $make
 * @property string|null $model
 * @property int|null $year
 * @property OwnershipType $ownership_type
 * @property VehicleStatus $status
 * @property int|null $responsible_user_id
 * @property Carbon|null $commissioned_on
 * @property int|null $current_odometer_km
 * @property string|null $notes
 * @property int|null $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read VehicleType $type
 */
class Vehicle extends Model
{
    /** @use HasFactory<VehicleFactory> */
    use BelongsToOrganization, HasFactory, LogsActivity, SoftDeletes;

    public const STALE_ODOMETER_DAYS = 30;

    /**
     * `status` and `current_odometer_km` are changed only through
     * ChangeVehicleStatus / RecordOdometerReading so their history stays complete.
     *
     * @var list<string>
     */
    protected $fillable = [
        'branch_id',
        'vehicle_type_id',
        'plate_number',
        'vin',
        'make',
        'model',
        'year',
        'ownership_type',
        'responsible_user_id',
        'commissioned_on',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'ownership_type' => OwnershipType::class,
            'status' => VehicleStatus::class,
            'commissioned_on' => 'date',
            'year' => 'integer',
            'current_odometer_km' => 'integer',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('fleet')
            ->logOnly([...$this->fillable, 'status', 'current_odometer_km'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    public static function normalizePlate(string $plate): string
    {
        return (string) preg_replace('/\s+/', ' ', mb_strtoupper(trim($plate)));
    }

    public static function normalizeVin(?string $vin): ?string
    {
        if ($vin === null || trim($vin) === '') {
            return null;
        }

        return mb_strtoupper((string) preg_replace('/[\s-]+/', '', $vin));
    }

    /**
     * @param  Builder<Vehicle>  $query
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
     * @param  Builder<Vehicle>  $query
     */
    public function scopeSearch(Builder $query, string $term): void
    {
        $compact = str_replace([' ', '-'], '', mb_strtoupper($term));

        $query->where(function (Builder $query) use ($term, $compact): void {
            $query->whereRaw("REPLACE(REPLACE(UPPER(plate_number), ' ', ''), '-', '') LIKE ?", ["%{$compact}%"])
                ->orWhere('vin', 'like', "%{$compact}%")
                ->orWhere('make', 'like', "%{$term}%")
                ->orWhere('model', 'like', "%{$term}%");
        });
    }

    /**
     * Operational vehicles with an odometer and no reading within the window.
     *
     * @param  Builder<Vehicle>  $query
     */
    public function scopeOdometerStale(Builder $query): void
    {
        $query->where('status', '!=', VehicleStatus::Decommissioned->value)
            ->whereHas('type', fn (Builder $query) => $query->where('has_odometer', true))
            ->whereDoesntHave(
                'odometerReadings',
                fn (Builder $query) => $query->where('recorded_at', '>=', now()->subDays(self::STALE_ODOMETER_DAYS)),
            );
    }

    /**
     * @param  Builder<Vehicle>  $query
     */
    public function scopeCoupled(Builder $query, bool $coupled = true): void
    {
        $method = $coupled ? 'where' : 'whereNot';

        $query->{$method}(fn (Builder $query) => $query
            ->whereHas('activeTowingCouplings')
            ->orWhereHas('activeTowedCoupling'));
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(VehicleType::class, 'vehicle_type_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function responsible(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_user_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function statusChanges(): HasMany
    {
        return $this->hasMany(VehicleStatusChange::class);
    }

    public function odometerReadings(): HasMany
    {
        return $this->hasMany(OdometerReading::class);
    }

    public function towingCouplings(): HasMany
    {
        return $this->hasMany(VehicleCoupling::class, 'tractor_id');
    }

    public function towedCouplings(): HasMany
    {
        return $this->hasMany(VehicleCoupling::class, 'trailer_id');
    }

    public function activeTowingCouplings(): HasMany
    {
        return $this->towingCouplings()->whereNull('uncoupled_at');
    }

    public function activeTowedCoupling(): HasMany
    {
        return $this->towedCouplings()->whereNull('uncoupled_at');
    }

    public function tasks(): MorphMany
    {
        return $this->morphMany(Task::class, 'taskable');
    }
}
