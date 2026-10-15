<?php

namespace Database\Factories;

use App\Enums\CustomerStatus;
use App\Enums\CustomerType;
use App\Models\Customer;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = fake()->randomElement(CustomerType::cases());
        $company = fake()->company();

        return [
            'organization_id' => Organization::factory(),
            'type' => $type,
            'name' => $type === CustomerType::Company
                ? $company
                : fake()->name(),
            'company_name' => $type === CustomerType::Company ? $company : null,
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'website' => fake()->boolean(40) ? fake()->url() : null,
            'tax_id' => fake()->boolean(30) ? fake()->numerify('TAX#######') : null,
            'country' => fake()->country(),
            'city' => fake()->city(),
            'address' => fake()->streetAddress(),
            'status' => fake()->randomElement(CustomerStatus::cases()),
            'source' => fake()->randomElement(['Website', 'Referral', 'Cold outreach', 'Conference', null]),
            'assigned_to' => null,
            'created_by' => User::factory(),
            'notes' => fake()->boolean(25) ? fake()->sentence() : null,
        ];
    }

    public function forOrganization(Organization $organization): static
    {
        return $this->state(fn (): array => [
            'organization_id' => $organization->id,
        ]);
    }

    public function company(): static
    {
        return $this->state(function (): array {
            $company = fake()->company();

            return [
                'type' => CustomerType::Company,
                'name' => $company,
                'company_name' => $company,
            ];
        });
    }

    public function individual(): static
    {
        return $this->state(fn (): array => [
            'type' => CustomerType::Individual,
            'name' => fake()->name(),
            'company_name' => null,
        ]);
    }
}
