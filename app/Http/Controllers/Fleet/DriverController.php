<?php

namespace App\Http\Controllers\Fleet;

use App\Enums\DriverStatus;
use App\Enums\OrganizationUserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Fleet\DriverRequest;
use App\Models\Branch;
use App\Models\Document;
use App\Models\Driver;
use App\Models\Organization;
use App\Models\User;
use App\Models\Waybill;
use App\Services\SubjectDocuments;
use App\Services\WaybillPresenter;
use App\Support\BranchAccess;
use App\Support\CurrentOrganization;
use App\Support\OrganizationTime;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DriverController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Driver::class);

        $user = $request->user();
        $status = DriverStatus::tryFrom($request->string('status', DriverStatus::Active->value)->toString());
        $today = OrganizationTime::today()->toDateString();
        $canViewDocuments = Gate::allows('viewAny', Document::class);

        $drivers = Driver::query()
            ->visibleTo($user)
            ->with(['branch:id,name', 'user:id,first_name,last_name'])
            ->when($status !== null, fn (Builder $query) => $query->where('status', $status->value))
            ->when($request->filled('branch'), fn (Builder $query) => $query->where('branch_id', $request->integer('branch')))
            ->when($request->filled('search'), fn (Builder $query) => $query->search($request->string('search')->toString()))
            ->when($canViewDocuments, fn (Builder $query) => $query->withCount([
                'documents as expired_documents_count' => fn (Builder $query) => $query->active()->whereNotNull('expires_on')->where('expires_on', '<', $today),
            ]))
            ->withCount(['waybills as open_waybills_count' => fn (Builder $query) => $query->open()])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(30)
            ->withQueryString()
            ->through(fn (Driver $driver) => [
                ...$this->present($driver),
                'expired_documents' => $driver->getAttribute('expired_documents_count'),
                'on_trip' => $driver->getAttribute('open_waybills_count') > 0,
            ]);

        return Inertia::render('drivers/index', [
            'drivers' => $drivers,
            'filters' => [
                'status' => $request->has('status') ? $request->string('status')->toString() : DriverStatus::Active->value,
                'search' => $request->string('search')->toString(),
                'branch' => $request->string('branch')->toString(),
            ],
            ...$this->formOptions($user),
            'can' => ['create' => Gate::allows('create', Driver::class)],
        ]);
    }

    public function store(DriverRequest $request): RedirectResponse
    {
        $driver = new Driver($request->safe()->except('status'));
        $driver->status = DriverStatus::Active;
        $driver->created_by = $request->user()->id;
        $driver->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Driver added.')]);

        return to_route('drivers.show', $driver);
    }

    public function show(Request $request, Driver $driver, SubjectDocuments $documents): Response
    {
        Gate::authorize('view', $driver);

        $user = $request->user();
        $canViewDocuments = Gate::allows('viewAny', Document::class);
        $openWaybill = $driver->waybills()->open()->with('vehicle:id,plate_number,deleted_at')->first();

        return Inertia::render('drivers/show', [
            'driver' => [
                ...$this->present($driver->load(['branch:id,name', 'user:id,first_name,last_name,email'])),
                'notes' => $driver->notes,
                'user_email' => $driver->user?->email,
                'created_at' => $driver->created_at?->toIso8601String(),
            ],
            'openWaybill' => $openWaybill ? [
                'id' => $openWaybill->id,
                'number' => $openWaybill->number,
                'plate_number' => $openWaybill->vehicle->plate_number,
                'departure_at' => WaybillPresenter::iso($openWaybill->departure_at),
            ] : null,
            'documentSummary' => $canViewDocuments ? $documents->summary($driver) : null,
            ...$this->formOptions($user),
            'can' => [
                'update' => $user->can('update', $driver),
                'view_documents' => $canViewDocuments,
                'create_document' => Gate::allows('create', [Document::class, $driver]),
                'update_document' => $user->can('documents.update'),
                'archive_document' => $user->can('documents.archive'),
                'view_waybills' => Gate::allows('viewAny', Waybill::class),
                'create_waybill' => $driver->status === DriverStatus::Active && Gate::allows('create', Waybill::class),
            ],
        ]);
    }

    public function update(DriverRequest $request, Driver $driver): RedirectResponse
    {
        $driver->fill($request->validated());
        $driver->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Driver updated.')]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Driver $driver): array
    {
        return [
            'id' => $driver->id,
            'full_name' => $driver->full_name,
            'last_name' => $driver->last_name,
            'first_name' => $driver->first_name,
            'middle_name' => $driver->middle_name,
            'phone' => $driver->phone,
            'personnel_number' => $driver->personnel_number,
            'license_number' => $driver->license_number,
            'license_categories' => $driver->license_categories ?? [],
            'status' => $driver->status->value,
            'branch_id' => $driver->branch_id,
            'branch' => $driver->branch?->name,
            'user_id' => $driver->user_id,
            'user' => $driver->user?->name,
        ];
    }

    /**
     * @return array{branches: mixed, users: mixed, categories: list<string>}
     */
    private function formOptions(User $user): array
    {
        $visibleBranches = app(BranchAccess::class)->visibleBranchIds($user);
        $organization = app(CurrentOrganization::class)->get();

        return [
            'branches' => Branch::query()
                ->when($visibleBranches !== null, fn ($query) => $query->whereIn('id', $visibleBranches))
                ->orderBy('name')
                ->get(['id', 'name']),
            // Only people who can edit drivers pick the linked account; others don't need the member list.
            'users' => $organization instanceof Organization && $user->can('drivers.manage')
                ? $organization->users()
                    ->wherePivot('status', OrganizationUserStatus::Active->value)
                    ->orderBy('last_name')
                    ->get(['users.id', 'first_name', 'last_name', 'email'])
                    ->map(fn (User $member) => ['id' => $member->id, 'name' => $member->name, 'email' => $member->email])
                    ->values()
                : [],
            'categories' => Driver::LICENSE_CATEGORIES,
        ];
    }
}
