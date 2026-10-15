<?php

namespace App\Http\Controllers;

use App\Actions\CRM\CreateCustomer;
use App\Actions\CRM\DeleteCustomer;
use App\Actions\CRM\UpdateCustomer;
use App\Enums\CustomerStatus;
use App\Enums\CustomerType;
use App\Http\Requests\CRM\StoreCustomerRequest;
use App\Http\Requests\CRM\UpdateCustomerRequest;
use App\Models\Contact;
use App\Models\Customer;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Customer::class);

        $customers = Customer::query()
            ->with(['assignedTo:id,first_name,last_name'])
            ->withCount('contacts')
            ->when(
                $request->filled('search'),
                function ($query) use ($request): void {
                    $search = $request->string('search')->toString();

                    $query->where(function ($query) use ($search): void {
                        $query->where('name', 'like', "%{$search}%")
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
            ->when(
                $request->filled('type'),
                fn ($query) => $query->where('type', $request->string('type')->toString()),
            )
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Customer $customer) => [
                'id' => $customer->id,
                'name' => $customer->name,
                'company_name' => $customer->company_name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'type' => $customer->type->value,
                'status' => $customer->status->value,
                'contacts_count' => $customer->contacts_count,
                'assigned_to' => $customer->assignedTo ? [
                    'id' => $customer->assignedTo->id,
                    'name' => $customer->assignedTo->name,
                ] : null,
            ]);

        return Inertia::render('customers/index', [
            'customers' => $customers,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'status' => $request->string('status')->toString(),
                'type' => $request->string('type')->toString(),
            ],
            'statuses' => collect(CustomerStatus::cases())->map->value,
            'types' => collect(CustomerType::cases())->map->value,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Customer::class);

        return Inertia::render('customers/create', [
            'assignees' => $this->assignees(),
            'statuses' => collect(CustomerStatus::cases())->map->value,
            'types' => collect(CustomerType::cases())->map->value,
        ]);
    }

    public function store(StoreCustomerRequest $request, CreateCustomer $createCustomer): RedirectResponse
    {
        $customer = $createCustomer->execute(
            $request->user(),
            $request->validated(),
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Customer created.'),
        ]);

        return to_route('customers.show', $customer);
    }

    public function show(Customer $customer): Response
    {
        Gate::authorize('view', $customer);

        $customer->load([
            'assignedTo:id,first_name,last_name,email',
            'createdBy:id,first_name,last_name',
            'contacts' => fn ($query) => $query->orderByDesc('is_primary')->orderBy('first_name'),
        ]);

        return Inertia::render('customers/show', [
            'customer' => [
                'id' => $customer->id,
                'type' => $customer->type->value,
                'name' => $customer->name,
                'company_name' => $customer->company_name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'website' => $customer->website,
                'tax_id' => $customer->tax_id,
                'country' => $customer->country,
                'city' => $customer->city,
                'address' => $customer->address,
                'status' => $customer->status->value,
                'source' => $customer->source,
                'notes' => $customer->notes,
                'assigned_to' => $customer->assignedTo ? [
                    'id' => $customer->assignedTo->id,
                    'name' => $customer->assignedTo->name,
                    'email' => $customer->assignedTo->email,
                ] : null,
                'created_by' => $customer->createdBy ? [
                    'id' => $customer->createdBy->id,
                    'name' => $customer->createdBy->name,
                ] : null,
                'contacts' => $customer->contacts->map(fn ($contact) => [
                    'id' => $contact->id,
                    'first_name' => $contact->first_name,
                    'last_name' => $contact->last_name,
                    'name' => $contact->name,
                    'position' => $contact->position,
                    'email' => $contact->email,
                    'phone' => $contact->phone,
                    'is_primary' => $contact->is_primary,
                    'notes' => $contact->notes,
                ]),
                'created_at' => $customer->created_at?->toIso8601String(),
            ],
            'can' => [
                'update' => Gate::allows('update', $customer),
                'delete' => Gate::allows('delete', $customer),
                'manage_contacts' => Gate::allows('create', Contact::class),
            ],
        ]);
    }

    public function edit(Customer $customer): Response
    {
        Gate::authorize('update', $customer);

        return Inertia::render('customers/edit', [
            'customer' => [
                'id' => $customer->id,
                'type' => $customer->type->value,
                'name' => $customer->name,
                'company_name' => $customer->company_name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'website' => $customer->website,
                'tax_id' => $customer->tax_id,
                'country' => $customer->country,
                'city' => $customer->city,
                'address' => $customer->address,
                'status' => $customer->status->value,
                'source' => $customer->source,
                'assigned_to' => $customer->assigned_to,
                'notes' => $customer->notes,
            ],
            'assignees' => $this->assignees(),
            'statuses' => collect(CustomerStatus::cases())->map->value,
            'types' => collect(CustomerType::cases())->map->value,
        ]);
    }

    public function update(
        UpdateCustomerRequest $request,
        Customer $customer,
        UpdateCustomer $updateCustomer,
    ): RedirectResponse {
        $updateCustomer->execute($customer, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Customer updated.'),
        ]);

        return to_route('customers.show', $customer);
    }

    public function destroy(Customer $customer, DeleteCustomer $deleteCustomer): RedirectResponse
    {
        Gate::authorize('delete', $customer);

        $deleteCustomer->execute($customer);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Customer deleted.'),
        ]);

        return to_route('customers.index');
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
