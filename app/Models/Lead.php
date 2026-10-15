<?php

namespace App\Models;

use App\Enums\LeadStatus;
use App\Models\Concerns\BelongsToOrganization;
use Database\Factories\LeadFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $first_name
 * @property string $last_name
 * @property-read string $name
 * @property string|null $company_name
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $source
 * @property LeadStatus $status
 * @property string|null $estimated_value
 * @property string|null $currency
 * @property int|null $assigned_to
 * @property int $created_by
 * @property string|null $notes
 * @property Carbon|null $converted_at
 * @property int|null $converted_customer_id
 * @property int|null $converted_deal_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
class Lead extends Model
{
    /** @use HasFactory<LeadFactory> */
    use BelongsToOrganization, HasFactory, SoftDeletes;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'organization_id',
        'first_name',
        'last_name',
        'company_name',
        'email',
        'phone',
        'source',
        'status',
        'estimated_value',
        'currency',
        'assigned_to',
        'created_by',
        'notes',
        'converted_at',
        'converted_customer_id',
        'converted_deal_id',
    ];

    /**
     * @var list<string>
     */
    protected $appends = [
        'name',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => LeadStatus::class,
            'estimated_value' => 'decimal:2',
            'converted_at' => 'datetime',
        ];
    }

    /**
     * @return Attribute<string, never>
     */
    protected function name(): Attribute
    {
        return Attribute::get(
            fn (): string => trim("{$this->first_name} {$this->last_name}"),
        );
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function convertedCustomer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'converted_customer_id');
    }

    public function convertedDeal(): BelongsTo
    {
        return $this->belongsTo(Deal::class, 'converted_deal_id');
    }

    public function tasks(): MorphMany
    {
        return $this->morphMany(Task::class, 'taskable');
    }

    public function isConverted(): bool
    {
        return $this->status === LeadStatus::Converted;
    }
}
