<?php

namespace Database\Factories;

use App\Enums\DealStatus;
use App\Models\Customer;
use App\Models\Deal;
use App\Models\Organization;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Deal>
 */
class DealFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'pipeline_id' => Pipeline::factory(),
            'pipeline_stage_id' => PipelineStage::factory(),
            'customer_id' => null,
            'title' => fake()->catchPhrase(),
            'description' => fake()->boolean(40) ? fake()->sentence() : null,
            'value' => fake()->randomFloat(2, 1000, 50000),
            'currency' => 'EUR',
            'probability' => 25,
            'assigned_to' => null,
            'created_by' => User::factory(),
            'expected_close_date' => fake()->optional()->dateTimeBetween('now', '+3 months'),
            'closed_at' => null,
            'status' => DealStatus::Open,
            'lost_reason' => null,
        ];
    }

    public function forPipeline(Pipeline $pipeline, ?PipelineStage $stage = null): static
    {
        $stage ??= $pipeline->stages()->orderBy('position')->first()
            ?? PipelineStage::factory()->create([
                'organization_id' => $pipeline->organization_id,
                'pipeline_id' => $pipeline->id,
            ]);

        return $this->state(fn (): array => [
            'organization_id' => $pipeline->organization_id,
            'pipeline_id' => $pipeline->id,
            'pipeline_stage_id' => $stage->id,
            'probability' => $stage->probability,
        ]);
    }
}
