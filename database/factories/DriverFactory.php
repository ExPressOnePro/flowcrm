<?php

namespace Database\Factories;

use App\Enums\DriverStatus;
use App\Models\Driver;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Driver>
 */
class DriverFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'last_name' => fake()->lastName(),
            'first_name' => fake()->firstName(),
            'phone' => fake()->numerify('+373 6## ## ###'),
            'personnel_number' => fake()->unique()->numerify('T-####'),
            'license_number' => fake()->unique()->bothify('??######'),
            'license_categories' => ['B', 'C', 'CE'],
            'status' => DriverStatus::Active,
        ];
    }

    public function inactive(): static
    {
        return $this->state(['status' => DriverStatus::Inactive]);
    }
}
