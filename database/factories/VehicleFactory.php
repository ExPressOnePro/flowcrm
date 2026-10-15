<?php

namespace Database\Factories;

use App\Enums\OwnershipType;
use App\Enums\VehicleStatus;
use App\Models\Organization;
use App\Models\Vehicle;
use App\Models\VehicleType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Vehicle>
 */
class VehicleFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'branch_id' => null,
            'vehicle_type_id' => fn (array $attributes) => VehicleType::factory()->state([
                'organization_id' => $attributes['organization_id'],
            ]),
            'plate_number' => strtoupper(fake()->unique()->bothify('??? ###')),
            'vin' => strtoupper(fake()->unique()->bothify('??#########??###')).'1',
            'make' => fake()->randomElement(['Volvo', 'Scania', 'MAN', 'DAF', 'Mercedes-Benz', 'Iveco', 'Renault']),
            'model' => fake()->bothify('FH ###'),
            'year' => fake()->numberBetween(2008, 2026),
            'ownership_type' => OwnershipType::Owned,
            'status' => VehicleStatus::InService,
            'responsible_user_id' => null,
            'commissioned_on' => fake()->dateTimeBetween('-5 years', '-1 month')->format('Y-m-d'),
            'current_odometer_km' => null,
            'notes' => null,
        ];
    }

    public function forOrganization(Organization $organization): static
    {
        return $this->state(fn (): array => [
            'organization_id' => $organization->id,
        ]);
    }

    public function ofType(VehicleType $type): static
    {
        return $this->state(fn (): array => [
            'organization_id' => $type->organization_id,
            'vehicle_type_id' => $type->id,
        ]);
    }

    public function status(VehicleStatus $status): static
    {
        return $this->state(fn (): array => ['status' => $status]);
    }
}
