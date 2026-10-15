<?php

namespace App\Models;

use App\Enums\VehicleCategory;
use App\Models\Concerns\BelongsToOrganization;
use Database\Factories\VehicleTypeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $name
 * @property VehicleCategory $category
 * @property bool $can_tow
 * @property bool $is_towable
 * @property bool $has_odometer
 * @property bool $is_active
 */
class VehicleType extends Model
{
    /** @use HasFactory<VehicleTypeFactory> */
    use BelongsToOrganization, HasFactory, LogsActivity;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'category',
        'can_tow',
        'is_towable',
        'has_odometer',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'category' => VehicleCategory::class,
            'can_tow' => 'boolean',
            'is_towable' => 'boolean',
            'has_odometer' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('fleet')
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class);
    }
}
