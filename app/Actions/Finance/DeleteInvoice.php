<?php

namespace App\Actions\Finance;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class DeleteInvoice
{
    public function execute(Invoice $invoice): void
    {
        if ($invoice->payments()->exists()) {
            throw new InvalidArgumentException('Invoices with payments cannot be deleted.');
        }

        DB::transaction(function () use ($invoice): void {
            if ($invoice->status !== InvoiceStatus::Draft) {
                $invoice->update(['status' => InvoiceStatus::Cancelled]);

                return;
            }

            $invoice->items()->delete();
            $invoice->delete();
        });
    }
}
