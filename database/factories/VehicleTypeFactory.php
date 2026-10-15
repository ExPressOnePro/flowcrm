<?php

namespace Database\Factories;

use App\Enums\VehicleCategory;
use App\Models\Organization;
use App\Models\VehicleType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VehicleType>
 */
class VehicleTypeFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'name' => 'Тип '.fake()->unique()->numberBetween(1, 99999),
            'category' => VehicleCategory::Truck,
            'can_tow' => true,
            'is_towable' => false,
            'has_odometer' => true,
            'is_active' => true,
        ];
    }

    public function forOrganization(Organization $organization): static
    {
        return $this->state(fn (): array => [
            'organization_id' => $organization->id,
        ]);
    }

    public function tractor(): static
    {
        return $this->state(fn (): array => [
            'category' => VehicleCategory::Tractor,
            'can_tow' => true,
            'is_towable' => false,
            'has_odometer' => true,
        ]);
    }

    public function semitrailer(): static
    {
        return $this->state(fn (): array => [
            'category' => VehicleCategory::Semitrailer,
            'can_tow' => false,
            'is_towable' => true,
            'has_odometer' => false,
        ]);
    }
}
