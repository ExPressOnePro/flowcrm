<?php

namespace App\Models;

use App\Enums\DealStatus;
use App\Models\Concerns\BelongsToOrganization;
use Database\Factories\DealFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $pipeline_id
 * @property int $pipeline_stage_id
 * @property int|null $customer_id
 * @property string $title
 * @property string|null $description
 * @property string $value
 * @property string $currency
 * @property int $probability
 * @property int|null $assigned_to
 * @property int $created_by
 * @property Carbon|null $expected_close_date
 * @property Carbon|null $closed_at
 * @property DealStatus $status
 * @property string|null $lost_reason
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
class Deal extends Model
{
    /** @use HasFactory<DealFactory> */
    use BelongsToOrganization, HasFactory, SoftDeletes;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'organization_id',
        'pipeline_id',
        'pipeline_stage_id',
        'customer_id',
        'title',
        'description',
        'value',
        'currency',
        'probability',
        'assigned_to',
        'created_by',
        'expected_close_date',
        'closed_at',
        'status',
        'lost_reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'probability' => 'integer',
            'expected_close_date' => 'date',
            'closed_at' => 'datetime',
            'status' => DealStatus::class,
        ];
    }

    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    public function stage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'pipeline_stage_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tasks(): MorphMany
    {
        return $this->morphMany(Task::class, 'taskable');
    }
}
