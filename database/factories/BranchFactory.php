<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Branch>
 */
class BranchFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $city = fake()->unique()->city();

        return [
            'organization_id' => Organization::factory(),
            'name' => $city,
            'code' => strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $city) ?: 'BR', 0, 3)).fake()->unique()->numberBetween(1, 999),
            'city' => $city,
            'address' => fake()->streetAddress(),
            'is_active' => true,
        ];
    }

    public function forOrganization(Organization $organization): static
    {
        return $this->state(fn (): array => [
            'organization_id' => $organization->id,
        ]);
    }
}
