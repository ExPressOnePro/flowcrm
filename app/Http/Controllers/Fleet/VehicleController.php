<?php

namespace App\Http\Controllers\Fleet;

use App\Actions\Fleet\RegisterVehicle;
use App\Actions\Fleet\UpdateVehicle;
use App\Enums\OwnershipType;
use App\Enums\VehicleCategory;
use App\Enums\VehicleStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Fleet\StoreVehicleRequest;
use App\Http\Requests\Fleet\UpdateVehicleRequest;
use App\Models\Branch;
use App\Models\OdometerReading;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleCoupling;
use App\Models\VehicleStatusChange;
use App\Models\VehicleType;
use App\Support\BranchAccess;
use App\Support\CurrentOrganization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class VehicleController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Vehicle::class);

        $user = $request->user();
        $archived = $request->boolean('archived');

        $vehicles = Vehicle::query()
            ->visibleTo($user)
            ->when($archived, fn ($query) => $query->onlyTrashed())
            ->with([
                'type:id,name,category,can_tow,is_towable',
                'branch:id,name',
                'activeTowingCouplings.trailer:id,plate_number',
                'activeTowedCoupling.tractor:id,plate_number',
            ])
            ->when($request->filled('search'), fn ($query) => $query->search($request->string('search')->toString()))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('type'), fn ($query) => $query->where('vehicle_type_id', $request->integer('type')))
            ->when($request->filled('branch'), fn ($query) => $query->where('branch_id', $request->integer('branch')))
            ->when(
                $request->filled('category'),
                fn ($query) => $query->whereHas('type', fn ($query) => $query->where('category', $request->string('category')->toString())),
            )
            ->orderBy('plate_number')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Vehicle $vehicle) => [
                ...$this->summary($vehicle),
                'coupled_with' => $vehicle->type->can_tow
                    ? $vehicle->activeTowingCouplings->map(fn (VehicleCoupling $coupling) => [
                        'id' => $coupling->trailer->id,
                        'plate_number' => $coupling->trailer->plate_number,
                    ])->values()
                    : $vehicle->activeTowedCoupling->map(fn (VehicleCoupling $coupling) => [
                        'id' => $coupling->tractor->id,
                        'plate_number' => $coupling->tractor->plate_number,
                    ])->values(),
            ]);

        return Inertia::render('fleet/vehicles/index', [
            'vehicles' => $vehicles,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'status' => $request->string('status')->toString(),
                'type' => $request->string('type')->toString(),
                'branch' => $request->string('branch')->toString(),
                'category' => $request->string('category')->toString(),
                'archived' => $archived,
            ],
            ...$this->options($user),
            'can' => [
                'create' => Gate::allows('create', Vehicle::class),
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', Vehicle::class);

        return Inertia::render('fleet/vehicles/create', [
            ...$this->options($request->user()),
            'defaultBranchId' => app(BranchAccess::class)->assignedBranchId($request->user()),
        ]);
    }

    public function store(StoreVehicleRequest $request, RegisterVehicle $registerVehicle): RedirectResponse
    {
        $vehicle = $registerVehicle->execute($request->user(), $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Vehicle registered.')]);

        return to_route('vehicles.show', $vehicle);
    }

    public function show(Request $request, Vehicle $vehicle): Response
    {
        Gate::authorize('view', $vehicle);

        $vehicle->load([
            'type',
            'branch:id,name',
            'responsible:id,first_name,last_name,email',
            'createdBy:id,first_name,last_name',
        ]);

        $couplings = VehicleCoupling::query()
            ->where(fn ($query) => $query->where('tractor_id', $vehicle->id)->orWhere('trailer_id', $vehicle->id))
            ->with([
                'tractor:id,plate_number,make,model,deleted_at',
                'trailer:id,plate_number,make,model,deleted_at',
                'coupledBy:id,first_name,last_name',
                'uncoupledBy:id,first_name,last_name',
            ])
            ->orderByRaw('uncoupled_at IS NOT NULL')
            ->orderByDesc('coupled_at')
            ->limit(100)
            ->get();

        $readings = OdometerReading::query()
            ->where('vehicle_id', $vehicle->id)
            ->with('recordedBy:id,first_name,last_name')
            ->orderByDesc('recorded_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        $statusChanges = VehicleStatusChange::query()
            ->where('vehicle_id', $vehicle->id)
            ->with('changedBy:id,first_name,last_name')
            ->orderByDesc('changed_at')
            ->orderByDesc('id')
            ->get();

        $canCouple = Gate::allows('couple', $vehicle) && ! $vehicle->trashed();

        return Inertia::render('fleet/vehicles/show', [
            'vehicle' => [
                ...$this->summary($vehicle),
                'vehicle_type_id' => $vehicle->vehicle_type_id,
                'branch_id' => $vehicle->branch_id,
                'has_odometer' => $vehicle->type->has_odometer,
                'responsible' => $vehicle->responsible ? [
                    'id' => $vehicle->responsible->id,
                    'name' => $vehicle->responsible->name,
                    'email' => $vehicle->responsible->email,
                ] : null,
                'created_by' => $vehicle->createdBy?->name,
                'notes' => $vehicle->notes,
                'created_at' => $vehicle->created_at?->toIso8601String(),
                'deleted_at' => $vehicle->deleted_at?->toIso8601String(),
            ],
            'couplings' => $couplings->map(fn (VehicleCoupling $coupling) => [
                'id' => $coupling->id,
                'role' => $coupling->tractor_id === $vehicle->id ? 'tractor' : 'trailer',
                'partner' => $this->partner($coupling->tractor_id === $vehicle->id ? $coupling->trailer : $coupling->tractor),
                'position' => $coupling->position,
                'coupled_at' => $coupling->coupled_at->toIso8601String(),
                'uncoupled_at' => $coupling->uncoupled_at?->toIso8601String(),
                'coupled_by' => $coupling->coupledBy?->name,
                'uncoupled_by' => $coupling->uncoupledBy?->name,
                'notes' => $coupling->notes,
            ]),
            'odometerReadings' => $readings->map(fn (OdometerReading $reading) => [
                'id' => $reading->id,
                'value_km' => $reading->value_km,
                'recorded_at' => $reading->recorded_at->toIso8601String(),
                'source' => $reading->source->value,
                'is_device' => $reading->source->isDeviceReported(),
                'note' => $reading->note,
                'recorded_by' => $reading->recordedBy?->name,
            ]),
            'statusChanges' => $statusChanges->map(fn (VehicleStatusChange $change) => [
                'id' => $change->id,
                'from_status' => $change->from_status?->value,
                'to_status' => $change->to_status->value,
                'changed_at' => $change->changed_at->toIso8601String(),
                'reason' => $change->reason,
                'changed_by' => $change->changedBy?->name,
            ]),
            'activity' => Gate::allows('viewAudit', $vehicle) ? $this->activity($vehicle, $couplings->pluck('id')->all()) : null,
            'couplingCandidates' => $canCouple && $vehicle->type->can_tow ? $this->couplingCandidates($request->user()) : [],
            'statuses' => collect(VehicleStatus::cases())->map->value,
            'can' => [
                'update' => Gate::allows('update', $vehicle) && ! $vehicle->trashed(),
                'change_status' => Gate::allows('changeStatus', $vehicle) && ! $vehicle->trashed(),
                'couple' => $canCouple,
                'record_odometer' => Gate::allows('recordOdometer', $vehicle) && ! $vehicle->trashed() && $vehicle->type->has_odometer,
                'archive' => Gate::allows('delete', $vehicle),
            ],
        ]);
    }

    public function edit(Request $request, Vehicle $vehicle): Response
    {
        Gate::authorize('update', $vehicle);

        return Inertia::render('fleet/vehicles/edit', [
            'vehicle' => [
                'id' => $vehicle->id,
                'plate_number' => $vehicle->plate_number,
                'vin' => $vehicle->vin,
                'make' => $vehicle->make,
                'model' => $vehicle->model,
                'year' => $vehicle->year,
                'vehicle_type_id' => $vehicle->vehicle_type_id,
                'branch_id' => $vehicle->branch_id,
                'ownership_type' => $vehicle->ownership_type->value,
                'responsible_user_id' => $vehicle->responsible_user_id,
                'commissioned_on' => $vehicle->commissioned_on?->toDateString(),
                'notes' => $vehicle->notes,
            ],
            ...$this->options($request->user()),
        ]);
    }

    public function update(UpdateVehicleRequest $request, Vehicle $vehicle, UpdateVehicle $updateVehicle): RedirectResponse
    {
        $updateVehicle->execute($vehicle, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Vehicle updated.')]);

        return to_route('vehicles.show', $vehicle);
    }

    public function destroy(Vehicle $vehicle): RedirectResponse
    {
        Gate::authorize('delete', $vehicle);

        if ($vehicle->activeTowingCouplings()->exists() || $vehicle->activeTowedCoupling()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Uncouple the vehicle before archiving it.')]);

            return back();
        }

        $vehicle->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Vehicle archived. History is preserved.')]);

        return to_route('vehicles.index');
    }

    public function restore(Vehicle $vehicle): RedirectResponse
    {
        Gate::authorize('delete', $vehicle);

        $conflict = Vehicle::query()
            ->where('status', '!=', VehicleStatus::Decommissioned->value)
            ->whereKeyNot($vehicle->id)
            ->whereRaw("REPLACE(REPLACE(plate_number, ' ', ''), '-', '') = ?", [str_replace([' ', '-'], '', $vehicle->plate_number)])
            ->exists();

        if ($conflict) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('An active vehicle with this plate number already exists.')]);

            return back();
        }

        $vehicle->restore();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Vehicle restored from archive.')]);

        return to_route('vehicles.show', $vehicle);
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(Vehicle $vehicle): array
    {
        return [
            'id' => $vehicle->id,
            'plate_number' => $vehicle->plate_number,
            'vin' => $vehicle->vin,
            'make' => $vehicle->make,
            'model' => $vehicle->model,
            'year' => $vehicle->year,
            'status' => $vehicle->status->value,
            'ownership_type' => $vehicle->ownership_type->value,
            'commissioned_on' => $vehicle->commissioned_on?->toDateString(),
            'current_odometer_km' => $vehicle->current_odometer_km,
            'type' => [
                'id' => $vehicle->type->id,
                'name' => $vehicle->type->name,
                'category' => $vehicle->type->category->value,
                'can_tow' => $vehicle->type->can_tow,
                'is_towable' => $vehicle->type->is_towable,
            ],
            'branch' => $vehicle->branch ? ['id' => $vehicle->branch->id, 'name' => $vehicle->branch->name] : null,
            'archived' => $vehicle->trashed(),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function partner(?Vehicle $vehicle): ?array
    {
        return $vehicle ? [
            'id' => $vehicle->id,
            'plate_number' => $vehicle->plate_number,
            'name' => trim($vehicle->make.' '.$vehicle->model),
            'archived' => $vehicle->trashed(),
        ] : null;
    }

    /**
     * @param  list<int>  $couplingIds
     * @return list<array<string, mixed>>
     */
    private function activity(Vehicle $vehicle, array $couplingIds): array
    {
        return Activity::query()
            ->with('causer')
            ->where(fn ($query) => $query
                ->where(fn ($query) => $query->where('subject_type', $vehicle->getMorphClass())->where('subject_id', $vehicle->id))
                ->orWhere(fn ($query) => $query->where('subject_type', (new VehicleCoupling)->getMorphClass())->whereIn('subject_id', $couplingIds)))
            ->latest('id')
            ->limit(100)
            ->get()
            ->map(fn (Activity $activity) => [
                'id' => $activity->id,
                'event' => $activity->event,
                'subject' => $activity->subject_type,
                'changes' => $activity->attribute_changes,
                'causer' => $activity->causer instanceof User ? $activity->causer->name : null,
                'created_at' => $activity->created_at?->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function couplingCandidates(User $user): array
    {
        return Vehicle::query()
            ->visibleTo($user)
            ->whereHas('type', fn ($query) => $query->where('is_towable', true))
            ->where('status', '!=', VehicleStatus::Decommissioned->value)
            ->whereDoesntHave('activeTowedCoupling')
            ->with('type:id,name')
            ->orderBy('plate_number')
            ->get()
            ->map(fn (Vehicle $trailer) => [
                'id' => $trailer->id,
                'plate_number' => $trailer->plate_number,
                'name' => trim($trailer->make.' '.$trailer->model),
                'type' => $trailer->type->name,
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function options(User $user): array
    {
        $visibleBranches = app(BranchAccess::class)->visibleBranchIds($user);
        $organization = app(CurrentOrganization::class)->get();

        return [
            'types' => VehicleType::query()
                ->orderBy('name')
                ->get(['id', 'name', 'category', 'can_tow', 'is_towable', 'has_odometer', 'is_active'])
                ->map(fn (VehicleType $type) => [
                    'id' => $type->id,
                    'name' => $type->name,
                    'category' => $type->category->value,
                    'has_odometer' => $type->has_odometer,
                    'is_active' => $type->is_active,
                ]),
            'branches' => Branch::query()
                ->when($visibleBranches !== null, fn ($query) => $query->whereIn('id', $visibleBranches))
                ->orderBy('name')
                ->get(['id', 'name', 'is_active']),
            'users' => $organization
                ? $organization->users()->orderBy('users.first_name')->get(['users.id', 'users.first_name', 'users.last_name'])
                    ->map(fn (User $member) => ['id' => $member->id, 'name' => $member->name])
                : [],
            'statuses' => collect(VehicleStatus::cases())->map->value,
            'categories' => collect(VehicleCategory::cases())->map->value,
            'ownershipTypes' => collect(OwnershipType::cases())->map->value,
        ];
    }
}
