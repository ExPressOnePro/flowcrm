<?php

namespace Database\Factories;

use App\Enums\InvoiceStatus;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $subtotal = fake()->randomFloat(2, 500, 10000);
        $tax = round($subtotal * 0.2, 2);
        $total = round($subtotal + $tax, 2);

        return [
            'organization_id' => Organization::factory(),
            'customer_id' => Customer::factory(),
            'number' => 'INV-'.fake()->unique()->numerify('#####'),
            'issue_date' => now()->subDays(fake()->numberBetween(0, 20)),
            'due_date' => now()->addDays(fake()->numberBetween(7, 30)),
            'status' => InvoiceStatus::Sent,
            'currency' => 'EUR',
            'subtotal' => $subtotal,
            'tax' => $tax,
            'discount' => 0,
            'total' => $total,
            'paid_amount' => 0,
            'balance' => $total,
            'notes' => null,
            'created_by' => User::factory(),
        ];
    }
}
