<?php

namespace App\Actions\Sales;

use App\Enums\DealStatus;
use App\Models\Deal;
use App\Models\PipelineStage;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class MoveDealToStage
{
    /**
     * @param  array{lost_reason?: string|null}  $options
     */
    public function execute(Deal $deal, PipelineStage $stage, array $options = []): Deal
    {
        return DB::transaction(function () use ($deal, $stage, $options): Deal {
            if ($stage->pipeline_id !== $deal->pipeline_id) {
                throw new InvalidArgumentException('Stage does not belong to this deal pipeline.');
            }

            $status = DealStatus::Open;
            $closedAt = null;
            $lostReason = null;

            if ($stage->is_won) {
                $status = DealStatus::Won;
                $closedAt = now();
            } elseif ($stage->is_lost) {
                $status = DealStatus::Lost;
                $closedAt = now();
                $lostReason = $options['lost_reason'] ?? $deal->lost_reason;
            }

            $deal->update([
                'pipeline_stage_id' => $stage->id,
                'probability' => $stage->probability,
                'status' => $status,
                'closed_at' => $closedAt,
                'lost_reason' => $lostReason,
            ]);

            return $deal->refresh()->load(['stage', 'customer', 'assignedTo']);
        });
    }
}
