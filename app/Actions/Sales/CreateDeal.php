<?php

namespace App\Actions\Sales;

use App\Enums\DealStatus;
use App\Models\Deal;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CreateDeal
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $actor, array $data): Deal
    {
        return DB::transaction(function () use ($actor, $data): Deal {
            $pipeline = isset($data['pipeline_id'])
                ? Pipeline::query()->findOrFail($data['pipeline_id'])
                : Pipeline::query()->where('is_default', true)->firstOrFail();

            $stage = isset($data['pipeline_stage_id'])
                ? PipelineStage::query()->findOrFail($data['pipeline_stage_id'])
                : $pipeline->stages()->orderBy('position')->firstOrFail();

            if ($stage->pipeline_id !== $pipeline->id) {
                throw new InvalidArgumentException('Stage does not belong to the selected pipeline.');
            }

            $organization = app(CurrentOrganization::class)->get();

            return Deal::query()->create([
                'pipeline_id' => $pipeline->id,
                'pipeline_stage_id' => $stage->id,
                'customer_id' => $data['customer_id'] ?? null,
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'value' => $data['value'] ?? 0,
                'currency' => $data['currency'] ?? ($organization?->currency ?? 'EUR'),
                'probability' => $data['probability'] ?? $stage->probability,
                'assigned_to' => $data['assigned_to'] ?? $actor->id,
                'created_by' => $actor->id,
                'expected_close_date' => $data['expected_close_date'] ?? null,
                'status' => DealStatus::Open,
                'lost_reason' => null,
                'closed_at' => null,
            ]);
        });
    }
}
