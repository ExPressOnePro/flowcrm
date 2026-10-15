<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'invoice_id' => Invoice::factory(),
            'customer_id' => Customer::factory(),
            'amount' => fake()->randomFloat(2, 100, 5000),
            'currency' => 'EUR',
            'payment_method' => fake()->randomElement(['bank_transfer', 'card', 'cash']),
            'reference' => fake()->bothify('PAY-####'),
            'paid_at' => now(),
            'notes' => null,
            'created_by' => User::factory(),
        ];
    }
}
