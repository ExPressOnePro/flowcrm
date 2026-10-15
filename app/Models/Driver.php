<?php

namespace App\Models;

use App\Enums\DocumentSubject;
use App\Enums\DriverStatus;
use App\Models\Concerns\BelongsToOrganization;
use App\Models\Contracts\HasDocuments;
use App\Support\BranchAccess;
use Database\Factories\DriverFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Drivers are never deleted: waybills and documents keep referring to them.
 * A driver who left is marked inactive.
 *
 * @property int $id
 * @property int $organization_id
 * @property int|null $branch_id
 * @property int|null $user_id
 * @property string $last_name
 * @property string $first_name
 * @property string|null $middle_name
 * @property string|null $phone
 * @property string|null $personnel_number
 * @property string|null $license_number
 * @property list<string>|null $license_categories
 * @property DriverStatus $status
 * @property string|null $notes
 * @property int|null $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read string $full_name
 */
class Driver extends Model implements HasDocuments
{
    /** @use HasFactory<DriverFactory> */
    use BelongsToOrganization, HasFactory, LogsActivity;

    public const LICENSE_CATEGORIES = ['B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE'];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'branch_id',
        'user_id',
        'last_name',
        'first_name',
        'middle_name',
        'phone',
        'personnel_number',
        'license_number',
        'license_categories',
        'status',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'license_categories' => 'array',
            'status' => DriverStatus::class,
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('fleet')
            ->logOnly($this->fillable)
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    public function getFullNameAttribute(): string
    {
        return trim(implode(' ', array_filter([$this->last_name, $this->first_name, $this->middle_name])));
    }

    public function hasCategory(string $category): bool
    {
        return in_array($category, $this->license_categories ?? [], true);
    }

    /**
     * @param  Builder<Driver>  $query
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
     * @param  Builder<Driver>  $query
     */
    public function scopeSearch(Builder $query, string $term): void
    {
        $query->where(fn (Builder $query) => $query
            ->where('last_name', 'like', "%{$term}%")
            ->orWhere('first_name', 'like', "%{$term}%")
            ->orWhere('personnel_number', 'like', "%{$term}%")
            ->orWhere('license_number', 'like', "%{$term}%")
            ->orWhere('phone', 'like', "%{$term}%"));
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function waybills(): HasMany
    {
        return $this->hasMany(Waybill::class);
    }

    public function documents(): MorphMany
    {
        return $this->morphMany(Document::class, 'documentable');
    }

    public function documentSubject(): DocumentSubject
    {
        return DocumentSubject::Driver;
    }

    public function applicableDocumentTypes(): Builder
    {
        return DocumentType::query()->where('subject', DocumentSubject::Driver->value);
    }

    public function documentBranchId(): ?int
    {
        return $this->branch_id;
    }

    public function documentLabel(): string
    {
        return $this->full_name;
    }

    public function documentsUrl(): string
    {
        return route('drivers.show', ['driver' => $this->id, 'tab' => 'documents'], false);
    }

    public function isOperational(): bool
    {
        return $this->status === DriverStatus::Active;
    }
}
