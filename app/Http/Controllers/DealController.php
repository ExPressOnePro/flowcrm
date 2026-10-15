<?php

namespace App\Http\Controllers;

use App\Actions\Sales\CreateDeal;
use App\Actions\Sales\DeleteDeal;
use App\Actions\Sales\MoveDealToStage;
use App\Actions\Sales\UpdateDeal;
use App\Http\Requests\CRM\StoreDealRequest;
use App\Http\Requests\CRM\UpdateDealRequest;
use App\Http\Requests\CRM\UpdateDealStageRequest;
use App\Models\Customer;
use App\Models\Deal;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DealController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', Deal::class);

        $pipeline = Pipeline::query()
            ->where('is_default', true)
            ->with(['stages' => fn ($query) => $query->orderBy('position')])
            ->firstOrFail();

        $deals = Deal::query()
            ->with([
                'customer:id,name',
                'assignedTo:id,first_name,last_name',
                'stage:id,name,probability,is_won,is_lost',
            ])
            ->where('pipeline_id', $pipeline->id)
            ->latest()
            ->get()
            ->map(fn (Deal $deal) => $this->dealPayload($deal));

        $columns = $pipeline->stages->map(function (PipelineStage $stage) use ($deals) {
            $stageDeals = $deals->where('pipeline_stage_id', $stage->id)->values();

            return [
                'id' => $stage->id,
                'name' => $stage->name,
                'position' => $stage->position,
                'probability' => $stage->probability,
                'is_won' => $stage->is_won,
                'is_lost' => $stage->is_lost,
                'total_value' => $stageDeals->sum(fn ($deal) => (float) $deal['value']),
                'deals' => $stageDeals,
            ];
        })->values();

        return Inertia::render('deals/index', [
            'pipeline' => [
                'id' => $pipeline->id,
                'name' => $pipeline->name,
            ],
            'columns' => $columns,
            'can' => [
                'create' => Gate::allows('create', Deal::class),
                'change_stage' => $this->userCanChangeStage(),
            ],
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Deal::class);

        $pipeline = Pipeline::query()
            ->where('is_default', true)
            ->with(['stages' => fn ($query) => $query->orderBy('position')])
            ->firstOrFail();

        return Inertia::render('deals/create', [
            'pipeline' => [
                'id' => $pipeline->id,
                'name' => $pipeline->name,
                'stages' => $pipeline->stages->map(fn (PipelineStage $stage) => [
                    'id' => $stage->id,
                    'name' => $stage->name,
                ]),
            ],
            'customers' => Customer::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Customer $customer) => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                ]),
            'assignees' => $this->assignees(),
            'default_currency' => app(CurrentOrganization::class)->get()?->currency ?? 'EUR',
        ]);
    }

    public function store(StoreDealRequest $request, CreateDeal $createDeal): RedirectResponse
    {
        $deal = $createDeal->execute($request->user(), $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Deal created.'),
        ]);

        return to_route('deals.show', $deal);
    }

    public function show(Deal $deal): Response
    {
        Gate::authorize('view', $deal);

        $deal->load([
            'customer:id,name,email',
            'assignedTo:id,first_name,last_name,email',
            'createdBy:id,first_name,last_name',
            'stage',
            'pipeline',
        ]);

        return Inertia::render('deals/show', [
            'deal' => [
                ...$this->dealPayload($deal),
                'description' => $deal->description,
                'expected_close_date' => $deal->expected_close_date?->toDateString(),
                'closed_at' => $deal->closed_at?->toIso8601String(),
                'lost_reason' => $deal->lost_reason,
                'created_by' => $deal->createdBy ? [
                    'id' => $deal->createdBy->id,
                    'name' => $deal->createdBy->name,
                ] : null,
                'pipeline' => [
                    'id' => $deal->pipeline->id,
                    'name' => $deal->pipeline->name,
                ],
            ],
            'stages' => $deal->pipeline->stages()
                ->orderBy('position')
                ->get()
                ->map(fn (PipelineStage $stage) => [
                    'id' => $stage->id,
                    'name' => $stage->name,
                    'is_won' => $stage->is_won,
                    'is_lost' => $stage->is_lost,
                ]),
            'can' => [
                'update' => Gate::allows('update', $deal),
                'delete' => Gate::allows('delete', $deal),
                'change_stage' => Gate::allows('changeStage', $deal),
            ],
        ]);
    }

    public function edit(Deal $deal): Response
    {
        Gate::authorize('update', $deal);

        return Inertia::render('deals/edit', [
            'deal' => [
                'id' => $deal->id,
                'title' => $deal->title,
                'description' => $deal->description,
                'value' => $deal->value,
                'currency' => $deal->currency,
                'customer_id' => $deal->customer_id,
                'assigned_to' => $deal->assigned_to,
                'expected_close_date' => $deal->expected_close_date?->toDateString(),
                'lost_reason' => $deal->lost_reason,
            ],
            'customers' => Customer::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Customer $customer) => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                ]),
            'assignees' => $this->assignees(),
        ]);
    }

    public function update(
        UpdateDealRequest $request,
        Deal $deal,
        UpdateDeal $updateDeal,
    ): RedirectResponse {
        $updateDeal->execute($deal, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Deal updated.'),
        ]);

        return to_route('deals.show', $deal);
    }

    public function destroy(Deal $deal, DeleteDeal $deleteDeal): RedirectResponse
    {
        Gate::authorize('delete', $deal);

        $deleteDeal->execute($deal);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Deal deleted.'),
        ]);

        return to_route('deals.index');
    }

    public function updateStage(
        UpdateDealStageRequest $request,
        Deal $deal,
        MoveDealToStage $moveDealToStage,
    ): RedirectResponse {
        $stage = PipelineStage::query()->findOrFail(
            $request->validated('pipeline_stage_id'),
        );

        $moveDealToStage->execute($deal, $stage, [
            'lost_reason' => $request->validated('lost_reason'),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Deal stage updated.'),
        ]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function dealPayload(Deal $deal): array
    {
        return [
            'id' => $deal->id,
            'title' => $deal->title,
            'value' => $deal->value,
            'currency' => $deal->currency,
            'probability' => $deal->probability,
            'status' => $deal->status->value,
            'pipeline_stage_id' => $deal->pipeline_stage_id,
            'customer' => $deal->customer ? [
                'id' => $deal->customer->id,
                'name' => $deal->customer->name,
            ] : null,
            'assigned_to' => $deal->assignedTo ? [
                'id' => $deal->assignedTo->id,
                'name' => $deal->assignedTo->name,
            ] : null,
            'stage' => $deal->stage ? [
                'id' => $deal->stage->id,
                'name' => $deal->stage->name,
                'probability' => $deal->stage->probability,
                'is_won' => $deal->stage->is_won,
                'is_lost' => $deal->stage->is_lost,
            ] : null,
        ];
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function assignees(): array
    {
        $organization = app(CurrentOrganization::class)->get();

        if ($organization === null) {
            return [];
        }

        return $organization->users()
            ->orderBy('users.first_name')
            ->get(['users.id', 'users.first_name', 'users.last_name'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
            ])
            ->all();
    }

    private function userCanChangeStage(): bool
    {
        $user = auth()->user();

        return $user?->can('deals.change_stage') ?? false;
    }
}
