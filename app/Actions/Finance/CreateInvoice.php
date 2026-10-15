<?php

namespace App\Actions\Finance;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CreateInvoice
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $actor, array $data): Invoice
    {
        return DB::transaction(function () use ($actor, $data): Invoice {
            $items = $data['items'] ?? [];

            if ($items === []) {
                throw new InvalidArgumentException('Invoice requires at least one item.');
            }

            $totals = $this->calculateTotals($items, (float) ($data['discount'] ?? 0));

            $invoice = Invoice::query()->create([
                'customer_id' => $data['customer_id'],
                'number' => $data['number'] ?? $this->nextNumber(),
                'issue_date' => $data['issue_date'],
                'due_date' => $data['due_date'],
                'status' => $data['status'] ?? InvoiceStatus::Draft,
                'currency' => $data['currency'] ?? (app(CurrentOrganization::class)->get()?->currency ?? 'EUR'),
                'subtotal' => $totals['subtotal'],
                'tax' => $totals['tax'],
                'discount' => $totals['discount'],
                'total' => $totals['total'],
                'paid_amount' => 0,
                'balance' => $totals['total'],
                'notes' => $data['notes'] ?? null,
                'created_by' => $actor->id,
            ]);

            foreach (array_values($items) as $index => $item) {
                $line = $this->lineTotals($item);

                InvoiceItem::query()->create([
                    'invoice_id' => $invoice->id,
                    'description' => $item['description'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'tax_rate' => $line['tax_rate'],
                    'subtotal' => $line['subtotal'],
                    'tax_amount' => $line['tax_amount'],
                    'total' => $line['total'],
                    'position' => $index + 1,
                ]);
            }

            return $invoice->load(['items', 'customer']);
        });
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return array{subtotal: float, tax: float, discount: float, total: float}
     */
    private function calculateTotals(array $items, float $discount): array
    {
        $subtotal = 0.0;
        $tax = 0.0;

        foreach ($items as $item) {
            $line = $this->lineTotals($item);
            $subtotal += $line['subtotal'];
            $tax += $line['tax_amount'];
        }

        $subtotal = round($subtotal, 2);
        $tax = round($tax, 2);
        $discount = round(max(0, $discount), 2);
        $total = round(max(0, $subtotal + $tax - $discount), 2);

        return compact('subtotal', 'tax', 'discount', 'total');
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array{quantity: float, unit_price: float, tax_rate: float, subtotal: float, tax_amount: float, total: float}
     */
    private function lineTotals(array $item): array
    {
        $quantity = round((float) $item['quantity'], 2);
        $unitPrice = round((float) $item['unit_price'], 2);
        $taxRate = round((float) ($item['tax_rate'] ?? 0), 2);
        $subtotal = round($quantity * $unitPrice, 2);
        $taxAmount = round($subtotal * ($taxRate / 100), 2);
        $total = round($subtotal + $taxAmount, 2);

        return [
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'tax_rate' => $taxRate,
            'subtotal' => $subtotal,
            'tax_amount' => $taxAmount,
            'total' => $total,
        ];
    }

    private function nextNumber(): string
    {
        $organizationId = app(CurrentOrganization::class)->id();

        $latest = Invoice::query()
            ->where('organization_id', $organizationId)
            ->orderByDesc('id')
            ->value('number');

        $sequence = 1;

        if (is_string($latest) && preg_match('/(\d+)$/', $latest, $matches) === 1) {
            $sequence = ((int) $matches[1]) + 1;
        }

        return 'INV-'.str_pad((string) $sequence, 5, '0', STR_PAD_LEFT);
    }
}
