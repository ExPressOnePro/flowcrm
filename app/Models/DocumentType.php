<?php

namespace App\Models;

use App\Enums\DocumentSubject;
use App\Enums\VehicleCategory;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property int $organization_id
 * @property DocumentSubject $subject
 * @property string $name
 * @property bool $has_expiry
 * @property bool $is_mandatory
 * @property list<string>|null $vehicle_categories null = every category
 * @property bool $is_active
 */
class DocumentType extends Model
{
    use BelongsToOrganization, LogsActivity;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'subject',
        'name',
        'has_expiry',
        'is_mandatory',
        'vehicle_categories',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'subject' => DocumentSubject::class,
            'has_expiry' => 'boolean',
            'is_mandatory' => 'boolean',
            'vehicle_categories' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('documents')
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function appliesToCategory(VehicleCategory $category): bool
    {
        return $this->vehicle_categories === null
            || $this->vehicle_categories === []
            || in_array($category->value, $this->vehicle_categories, true);
    }

    /**
     * @param  Builder<DocumentType>  $query
     */
    public function scopeForVehicleCategory(Builder $query, VehicleCategory $category): void
    {
        $query->where('subject', DocumentSubject::Vehicle->value)
            ->where(fn (Builder $query) => $query
                ->whereNull('vehicle_categories')
                ->orWhereJsonLength('vehicle_categories', 0)
                ->orWhereJsonContains('vehicle_categories', $category->value));
    }
}
