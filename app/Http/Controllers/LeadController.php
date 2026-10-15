<?php

namespace App\Http\Controllers;

use App\Actions\CRM\ConvertLead;
use App\Actions\CRM\CreateLead;
use App\Actions\CRM\DeleteLead;
use App\Actions\CRM\UpdateLead;
use App\Enums\LeadStatus;
use App\Http\Requests\CRM\ConvertLeadRequest;
use App\Http\Requests\CRM\StoreLeadRequest;
use App\Http\Requests\CRM\UpdateLeadRequest;
use App\Models\Lead;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class LeadController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Lead::class);

        $leads = Lead::query()
            ->with(['assignedTo:id,first_name,last_name'])
            ->when(
                $request->filled('search'),
                function ($query) use ($request): void {
                    $search = $request->string('search')->toString();

                    $query->where(function ($query) use ($search): void {
                        $query->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('company_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
                },
            )
            ->when(
                $request->filled('status'),
                fn ($query) => $query->where('status', $request->string('status')->toString()),
            )
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Lead $lead) => [
                'id' => $lead->id,
                'name' => $lead->name,
                'company_name' => $lead->company_name,
                'email' => $lead->email,
                'phone' => $lead->phone,
                'status' => $lead->status->value,
                'estimated_value' => $lead->estimated_value,
                'currency' => $lead->currency,
                'source' => $lead->source,
                'assigned_to' => $lead->assignedTo ? [
                    'id' => $lead->assignedTo->id,
                    'name' => $lead->assignedTo->name,
                ] : null,
            ]);

        return Inertia::render('leads/index', [
            'leads' => $leads,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'status' => $request->string('status')->toString(),
            ],
            'statuses' => collect(LeadStatus::cases())->map->value,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Lead::class);

        return Inertia::render('leads/create', [
            'assignees' => $this->assignees(),
            'statuses' => collect(LeadStatus::cases())
                ->reject(fn (LeadStatus $status) => $status === LeadStatus::Converted)
                ->map->value
                ->values(),
        ]);
    }

    public function store(StoreLeadRequest $request, CreateLead $createLead): RedirectResponse
    {
        $lead = $createLead->execute($request->user(), $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Lead created.'),
        ]);

        return to_route('leads.show', $lead);
    }

    public function show(Lead $lead): Response
    {
        Gate::authorize('view', $lead);

        $lead->load([
            'assignedTo:id,first_name,last_name,email',
            'createdBy:id,first_name,last_name',
            'convertedCustomer:id,name',
        ]);

        return Inertia::render('leads/show', [
            'lead' => [
                'id' => $lead->id,
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'name' => $lead->name,
                'company_name' => $lead->company_name,
                'email' => $lead->email,
                'phone' => $lead->phone,
                'source' => $lead->source,
                'status' => $lead->status->value,
                'estimated_value' => $lead->estimated_value,
                'currency' => $lead->currency,
                'notes' => $lead->notes,
                'converted_at' => $lead->converted_at?->toIso8601String(),
                'converted_customer' => $lead->convertedCustomer ? [
                    'id' => $lead->convertedCustomer->id,
                    'name' => $lead->convertedCustomer->name,
                ] : null,
                'assigned_to' => $lead->assignedTo ? [
                    'id' => $lead->assignedTo->id,
                    'name' => $lead->assignedTo->name,
                    'email' => $lead->assignedTo->email,
                ] : null,
                'created_by' => $lead->createdBy ? [
                    'id' => $lead->createdBy->id,
                    'name' => $lead->createdBy->name,
                ] : null,
            ],
            'can' => [
                'update' => Gate::allows('update', $lead),
                'delete' => Gate::allows('delete', $lead),
                'convert' => Gate::allows('convert', $lead),
            ],
        ]);
    }

    public function edit(Lead $lead): Response
    {
        Gate::authorize('update', $lead);

        return Inertia::render('leads/edit', [
            'lead' => [
                'id' => $lead->id,
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'company_name' => $lead->company_name,
                'email' => $lead->email,
                'phone' => $lead->phone,
                'source' => $lead->source,
                'status' => $lead->status->value,
                'estimated_value' => $lead->estimated_value,
                'currency' => $lead->currency,
                'assigned_to' => $lead->assigned_to,
                'notes' => $lead->notes,
            ],
            'assignees' => $this->assignees(),
            'statuses' => collect(LeadStatus::cases())
                ->reject(fn (LeadStatus $status) => $status === LeadStatus::Converted)
                ->map->value
                ->values(),
        ]);
    }

    public function update(
        UpdateLeadRequest $request,
        Lead $lead,
        UpdateLead $updateLead,
    ): RedirectResponse {
        $updateLead->execute($lead, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Lead updated.'),
        ]);

        return to_route('leads.show', $lead);
    }

    public function destroy(Lead $lead, DeleteLead $deleteLead): RedirectResponse
    {
        Gate::authorize('delete', $lead);

        $deleteLead->execute($lead);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Lead deleted.'),
        ]);

        return to_route('leads.index');
    }

    public function convert(
        ConvertLeadRequest $request,
        Lead $lead,
        ConvertLead $convertLead,
    ): RedirectResponse {
        Gate::authorize('convert', $lead);

        $customer = $convertLead->execute(
            $lead,
            $request->user(),
            $request->validated(),
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Lead converted to customer.'),
        ]);

        return to_route('customers.show', $customer);
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
}
