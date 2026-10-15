<?php

namespace App\Actions\Finance;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SendInvoice
{
    public function execute(Invoice $invoice): Invoice
    {
        return DB::transaction(function () use ($invoice): Invoice {
            if ($invoice->status === InvoiceStatus::Cancelled) {
                throw new InvalidArgumentException('Cancelled invoices cannot be sent.');
            }

            if ($invoice->status === InvoiceStatus::Paid) {
                return $invoice;
            }

            $invoice->update([
                'status' => $invoice->due_date->isPast()
                    ? InvoiceStatus::Overdue
                    : InvoiceStatus::Sent,
            ]);

            return $invoice->refresh();
        });
    }
}
