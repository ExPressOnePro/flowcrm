<?php

namespace App\Models;

use App\Enums\DocumentState;
use App\Enums\VehicleStatus;
use App\Models\Concerns\BelongsToOrganization;
use App\Support\OrganizationTime;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Documents are never deleted: replaced or obsolete ones are archived and
 * become read-only, so the paper trail stays complete.
 *
 * @property int $id
 * @property int $organization_id
 * @property int $document_type_id
 * @property string $documentable_type
 * @property int $documentable_id
 * @property string|null $number
 * @property string|null $issuer
 * @property Carbon|null $issued_on
 * @property Carbon|null $expires_on
 * @property string|null $notes
 * @property Carbon|null $archived_at
 * @property int|null $archived_by
 * @property string|null $archive_reason
 * @property int|null $replaced_by_id
 * @property int|null $created_by
 * @property string|null $idempotency_key
 * @property Carbon|null $created_at
 * @property-read DocumentType $type
 * @property-read Vehicle|null $documentable
 */
class Document extends Model
{
    use BelongsToOrganization, LogsActivity;

    public const EXPIRING_DAYS = 30;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'document_type_id',
        'documentable_type',
        'documentable_id',
        'number',
        'issuer',
        'issued_on',
        'expires_on',
        'notes',
        'created_by',
        'idempotency_key',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'issued_on' => 'date',
            'expires_on' => 'date',
            'archived_at' => 'datetime',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('documents')
            ->logOnly(['document_type_id', 'number', 'issuer', 'issued_on', 'expires_on', 'notes', 'archived_at', 'archive_reason', 'replaced_by_id'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class, 'document_type_id');
    }

    public function documentable(): MorphTo
    {
        return $this->morphTo()->withTrashed();
    }

    public function files(): HasMany
    {
        return $this->hasMany(DocumentFile::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function archivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'archived_by');
    }

    public function replacedBy(): BelongsTo
    {
        return $this->belongsTo(Document::class, 'replaced_by_id');
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    public function daysLeft(?CarbonImmutable $today = null): ?int
    {
        if ($this->expires_on === null) {
            return null;
        }

        $today ??= OrganizationTime::today();

        return (int) $today->diffInDays(CarbonImmutable::parse($this->expires_on->toDateString(), $today->getTimezone()), false);
    }

    public function state(?CarbonImmutable $today = null): DocumentState
    {
        if ($this->isArchived()) {
            return DocumentState::Archived;
        }

        $daysLeft = $this->daysLeft($today);

        return match (true) {
            $daysLeft === null => DocumentState::NoExpiry,
            $daysLeft < 0 => DocumentState::Expired,
            $daysLeft <= self::EXPIRING_DAYS => DocumentState::Expiring,
            default => DocumentState::Valid,
        };
    }

    /**
     * @param  Builder<Document>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull($this->qualifyColumn('archived_at'));
    }

    /**
     * @param  Builder<Document>  $query
     */
    public function scopeInState(Builder $query, DocumentState $state, CarbonImmutable $today): void
    {
        $expires = $this->qualifyColumn('expires_on');
        $limit = $today->addDays(self::EXPIRING_DAYS)->toDateString();

        match ($state) {
            DocumentState::Archived => $query->whereNotNull($this->qualifyColumn('archived_at')),
            DocumentState::NoExpiry => $query->active()->whereNull($expires),
            DocumentState::Expired => $query->active()->where($expires, '<', $today->toDateString()),
            DocumentState::Expiring => $query->active()->whereBetween($expires, [$today->toDateString(), $limit]),
            DocumentState::Valid => $query->active()->where($expires, '>', $limit),
        };
    }

    /**
     * Documents whose subject (vehicle) the user may see. Archived vehicles are excluded.
     *
     * @param  Builder<Document>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        $query->whereHasMorph('documentable', [Vehicle::class], fn (Builder $query) => $query->visibleTo($user));
    }

    /**
     * Excludes documents of decommissioned vehicles from reminders and counters.
     *
     * @param  Builder<Document>  $query
     */
    public function scopeForOperationalSubjects(Builder $query): void
    {
        $query->whereHasMorph(
            'documentable',
            [Vehicle::class],
            fn (Builder $query) => $query->where('status', '!=', VehicleStatus::Decommissioned->value),
        );
    }
}
