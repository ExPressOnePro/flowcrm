<?php

namespace App\Actions\Finance;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class RecordPayment
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Invoice $invoice, User $actor, array $data): Payment
    {
        return DB::transaction(function () use ($invoice, $actor, $data): Payment {
            if (in_array($invoice->status, [InvoiceStatus::Draft, InvoiceStatus::Cancelled], true)) {
                throw new InvalidArgumentException('Cannot record payment for this invoice status.');
            }

            $amount = round((float) $data['amount'], 2);

            if ($amount <= 0) {
                throw new InvalidArgumentException('Payment amount must be greater than zero.');
            }

            if ($amount > (float) $invoice->balance + 0.00001) {
                throw new InvalidArgumentException('Payment amount exceeds invoice balance.');
            }

            $payment = Payment::query()->create([
                'invoice_id' => $invoice->id,
                'customer_id' => $invoice->customer_id,
                'amount' => $amount,
                'currency' => $data['currency'] ?? $invoice->currency,
                'payment_method' => $data['payment_method'] ?? null,
                'reference' => $data['reference'] ?? null,
                'paid_at' => $data['paid_at'] ?? now(),
                'notes' => $data['notes'] ?? null,
                'created_by' => $actor->id,
            ]);

            if ($invoice->status === InvoiceStatus::Draft) {
                $invoice->status = InvoiceStatus::Sent;
                $invoice->save();
            }

            $invoice->refreshPaymentState();

            return $payment->fresh(['invoice', 'customer']);
        });
    }
}
