<?php

namespace App\Services;

use App\Enums\DealStatus;
use App\Enums\TaskStatus;
use App\Models\Customer;
use App\Models\Deal;
use App\Models\Payment;
use App\Models\Pipeline;
use App\Models\Task;
use App\Support\CurrentOrganization;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    /**
     * @return array{
     *     revenue: float,
     *     revenueChange: float|null,
     *     pipelineValue: float,
     *     activeDeals: int,
     *     customers: int,
     *     currency: string
     * }
     */
    public function statistics(): array
    {
        $currency = app(CurrentOrganization::class)->get()?->currency ?? 'EUR';

        $now = now();
        $thisMonth = (float) Payment::query()
            ->whereBetween('paid_at', [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()])
            ->sum('amount');

        $previousMonth = (float) Payment::query()
            ->whereBetween('paid_at', [
                $now->copy()->subMonthNoOverflow()->startOfMonth(),
                $now->copy()->subMonthNoOverflow()->endOfMonth(),
            ])
            ->sum('amount');

        $revenueChange = null;

        if ($previousMonth > 0) {
            $revenueChange = round((($thisMonth - $previousMonth) / $previousMonth) * 100, 1);
        } elseif ($thisMonth > 0) {
            $revenueChange = 100.0;
        }

        return [
            'revenue' => round((float) Payment::query()->sum('amount'), 2),
            'revenueChange' => $revenueChange,
            'pipelineValue' => round((float) Deal::query()->where('status', DealStatus::Open)->sum('value'), 2),
            'activeDeals' => Deal::query()->where('status', DealStatus::Open)->count(),
            'customers' => Customer::query()->count(),
            'currency' => $currency,
        ];
    }

    /**
     * @return list<array{name: string, value: float, position: int}>
     */
    public function pipeline(): array
    {
        $pipeline = Pipeline::query()
            ->where('is_default', true)
            ->with(['stages' => fn ($query) => $query->orderBy('position')])
            ->first();

        if ($pipeline === null) {
            return [];
        }

        $values = Deal::query()
            ->select('pipeline_stage_id', DB::raw('SUM(value) as total'))
            ->where('status', DealStatus::Open)
            ->groupBy('pipeline_stage_id')
            ->pluck('total', 'pipeline_stage_id');

        return $pipeline->stages
            ->reject(fn ($stage) => $stage->is_won || $stage->is_lost)
            ->map(fn ($stage) => [
                'name' => $stage->name,
                'value' => round((float) ($values[$stage->id] ?? 0), 2),
                'position' => $stage->position,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{month: string, label: string, amount: float}>
     */
    public function revenue(): array
    {
        $start = now()->startOfMonth()->subMonths(11);

        $totals = Payment::query()
            ->where('paid_at', '>=', $start)
            ->get(['paid_at', 'amount'])
            ->groupBy(fn (Payment $payment) => $payment->paid_at->format('Y-m'))
            ->map(fn ($payments) => round((float) $payments->sum('amount'), 2));

        $series = [];

        for ($i = 0; $i < 12; $i++) {
            $month = $start->copy()->addMonths($i);
            $key = $month->format('Y-m');

            $series[] = [
                'month' => $key,
                'label' => $month->format('M'),
                'amount' => (float) ($totals[$key] ?? 0),
            ];
        }

        return $series;
    }

    /**
     * @return list<array{
     *     id: int,
     *     title: string,
     *     value: float,
     *     currency: string,
     *     stage: string|null,
     *     customer: string|null
     * }>
     */
    public function recentDeals(int $limit = 8): array
    {
        return Deal::query()
            ->with(['customer:id,name', 'stage:id,name'])
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (Deal $deal) => [
                'id' => $deal->id,
                'title' => $deal->title,
                'value' => (float) $deal->value,
                'currency' => $deal->currency,
                'stage' => $deal->stage?->name,
                'customer' => $deal->customer?->name,
            ])
            ->all();
    }

    /**
     * @return list<array{
     *     id: int,
     *     title: string,
     *     due_at: string|null,
     *     priority: string,
     *     status: string
     * }>
     */
    public function todayTasks(): array
    {
        return Task::query()
            ->whereDate('due_at', Carbon::today())
            ->whereNotIn('status', [TaskStatus::Completed, TaskStatus::Cancelled])
            ->orderBy('due_at')
            ->limit(10)
            ->get(['id', 'title', 'due_at', 'priority', 'status'])
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'due_at' => $task->due_at?->toIso8601String(),
                'priority' => $task->priority->value,
                'status' => $task->status->value,
            ])
            ->all();
    }
}
