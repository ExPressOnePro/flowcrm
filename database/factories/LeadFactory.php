<?php

namespace Database\Factories;

use App\Enums\LeadStatus;
use App\Models\Lead;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lead>
 */
class LeadFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'company_name' => fake()->boolean(70) ? fake()->company() : null,
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'source' => fake()->randomElement(['Website', 'Referral', 'LinkedIn', 'Ads', 'Cold call', null]),
            'status' => fake()->randomElement([
                LeadStatus::New,
                LeadStatus::Contacted,
                LeadStatus::Qualified,
                LeadStatus::Unqualified,
            ]),
            'estimated_value' => fake()->boolean(60) ? fake()->randomFloat(2, 500, 50000) : null,
            'currency' => 'EUR',
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

    public function converted(): static
    {
        return $this->state(fn (): array => [
            'status' => LeadStatus::Converted,
            'converted_at' => now(),
        ]);
    }
}
