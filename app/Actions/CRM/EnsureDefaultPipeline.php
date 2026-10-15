<?php

namespace App\Actions\CRM;

use App\Models\Organization;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use Illuminate\Support\Facades\DB;

class EnsureDefaultPipeline
{
    /**
     * @var list<array{name: string, probability: int, is_won?: bool, is_lost?: bool}>
     */
    public const DEFAULT_STAGES = [
        ['name' => 'New', 'probability' => 10],
        ['name' => 'Qualified', 'probability' => 25],
        ['name' => 'Proposal', 'probability' => 50],
        ['name' => 'Negotiation', 'probability' => 75],
        ['name' => 'Won', 'probability' => 100, 'is_won' => true],
        ['name' => 'Lost', 'probability' => 0, 'is_lost' => true],
    ];

    public function execute(Organization $organization): Pipeline
    {
        return DB::transaction(function () use ($organization): Pipeline {
            $pipeline = Pipeline::query()->firstOrCreate(
                [
                    'organization_id' => $organization->id,
                    'is_default' => true,
                ],
                [
                    'name' => 'Default Sales Pipeline',
                ],
            );

            if ($pipeline->stages()->exists()) {
                return $pipeline->load('stages');
            }

            foreach (self::DEFAULT_STAGES as $index => $stage) {
                PipelineStage::query()->create([
                    'organization_id' => $organization->id,
                    'pipeline_id' => $pipeline->id,
                    'name' => $stage['name'],
                    'position' => $index + 1,
                    'probability' => $stage['probability'],
                    'is_won' => $stage['is_won'] ?? false,
                    'is_lost' => $stage['is_lost'] ?? false,
                ]);
            }

            return $pipeline->load('stages');
        });
    }
}
