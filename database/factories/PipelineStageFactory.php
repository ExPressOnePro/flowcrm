<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PipelineStage>
 */
class PipelineStageFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'pipeline_id' => Pipeline::factory(),
            'name' => fake()->randomElement(['New', 'Qualified', 'Proposal', 'Negotiation']),
            'position' => fake()->numberBetween(1, 10),
            'probability' => fake()->randomElement([10, 25, 50, 75]),
            'is_won' => false,
            'is_lost' => false,
        ];
    }
}
