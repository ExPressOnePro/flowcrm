<?php

namespace App\Models;

use App\Enums\InvoiceStatus;
use App\Models\Concerns\BelongsToOrganization;
use Database\Factories\InvoiceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $customer_id
 * @property string $number
 * @property Carbon $issue_date
 * @property Carbon $due_date
 * @property InvoiceStatus $status
 * @property string $currency
 * @property string $subtotal
 * @property string $tax
 * @property string $discount
 * @property string $total
 * @property string $paid_amount
 * @property string $balance
 * @property string|null $notes
 * @property int $created_by
 */
class Invoice extends Model
{
    /** @use HasFactory<InvoiceFactory> */
    use BelongsToOrganization, HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'organization_id',
        'customer_id',
        'number',
        'issue_date',
        'due_date',
        'status',
        'currency',
        'subtotal',
        'tax',
        'discount',
        'total',
        'paid_amount',
        'balance',
        'notes',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'due_date' => 'date',
            'status' => InvoiceStatus::class,
            'subtotal' => 'decimal:2',
            'tax' => 'decimal:2',
            'discount' => 'decimal:2',
            'total' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'balance' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('position');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->latest('paid_at');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tasks(): MorphMany
    {
        return $this->morphMany(Task::class, 'taskable');
    }

    public function refreshPaymentState(): void
    {
        $paidAmount = (float) $this->payments()->sum('amount');
        $total = (float) $this->total;
        $balance = round($total - $paidAmount, 2);

        $status = $this->status;

        if ($status !== InvoiceStatus::Cancelled && $status !== InvoiceStatus::Draft) {
            if ($balance <= 0) {
                $status = InvoiceStatus::Paid;
                $balance = 0;
            } elseif ($paidAmount > 0) {
                $status = InvoiceStatus::Partial;
            } elseif ($this->due_date->isPast()) {
                $status = InvoiceStatus::Overdue;
            } else {
                $status = InvoiceStatus::Sent;
            }
        }

        $this->forceFill([
            'paid_amount' => $paidAmount,
            'balance' => $balance,
            'status' => $status,
        ])->save();
    }
}
