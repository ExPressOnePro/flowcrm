<?php

namespace App\Http\Controllers\Waybills;

use App\Actions\Waybills\CancelWaybill;
use App\Actions\Waybills\CloseWaybill;
use App\Actions\Waybills\IssueWaybill;
use App\Actions\Waybills\SaveWaybillDraft;
use App\Enums\DriverStatus;
use App\Enums\VehicleStatus;
use App\Enums\WaybillStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Waybills\CloseWaybillRequest;
use App\Http\Requests\Waybills\IssueWaybillRequest;
use App\Http\Requests\Waybills\WaybillRequest;
use App\Models\Branch;
use App\Models\Driver;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Waybill;
use App\Services\WaybillChecks;
use App\Services\WaybillPresenter;
use App\Support\BranchAccess;
use App\Support\OrganizationTime;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class WaybillController extends Controller
{
    private const STATUSES = ['draft', 'issued', 'overdue', 'closed', 'cancelled'];

    private const RELATIONS = ['vehicle:id,plate_number,make,model,vehicle_type_id,branch_id,current_odometer_km,status,deleted_at', 'trailer:id,plate_number,deleted_at', 'driver:id,last_name,first_name,middle_name', 'branch:id,name'];

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Waybill::class);

        $user = $request->user();
        $status = in_array($request->query('status'), self::STATUSES, true) ? $request->query('status') : '';
        $from = $request->date('from');
        $to = $request->date('to');

        $waybills = Waybill::query()
            ->visibleTo($user)
            ->with(self::RELATIONS)
            ->when($status === 'overdue', fn (Builder $query) => $query->returnOverdue())
            ->when($status !== '' && $status !== 'overdue', fn (Builder $query) => $query->where('status', $status))
            ->when($request->filled('branch'), fn (Builder $query) => $query->where('branch_id', $request->integer('branch')))
            ->when($request->filled('search'), fn (Builder $query) => $query->search($request->string('search')->toString()))
            ->when($from, fn (Builder $query) => $query->where('planned_departure_at', '>=', OrganizationTime::parse($from->toDateString())))
            ->when($to, fn (Builder $query) => $query->where('planned_departure_at', '<', OrganizationTime::parse($to->toDateString())?->addDay()))
            ->orderByRaw('CASE status WHEN ? THEN 0 WHEN ? THEN 1 ELSE 2 END', [WaybillStatus::Issued->value, WaybillStatus::Draft->value])
            ->orderByDesc('planned_departure_at')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Waybill $waybill) => WaybillPresenter::item($waybill));

        $visibleBranches = app(BranchAccess::class)->visibleBranchIds($user);
        $count = fn (Builder $query) => $query->visibleTo($user)->count();

        return Inertia::render('waybills/index', [
            'waybills' => $waybills,
            'filters' => [
                'status' => $status,
                'search' => $request->string('search')->toString(),
                'branch' => $request->string('branch')->toString(),
                'from' => $from?->toDateString() ?? '',
                'to' => $to?->toDateString() ?? '',
            ],
            'counts' => [
                'issued' => $count(Waybill::query()->open()),
                'overdue' => $count(Waybill::query()->returnOverdue()),
                'draft' => $count(Waybill::query()->where('status', WaybillStatus::Draft->value)),
            ],
            'branches' => Branch::query()
                ->when($visibleBranches !== null, fn ($query) => $query->whereIn('id', $visibleBranches))
                ->orderBy('name')
                ->get(['id', 'name']),
            'can' => ['create' => Gate::allows('create', Waybill::class)],
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', Waybill::class);

        $vehicleId = $request->integer('vehicle_id') ?: null;
        $vehicle = $vehicleId ? Vehicle::query()->visibleTo($request->user())->find($vehicleId) : null;
        $coupled = $vehicle?->activeTowingCouplings()->value('trailer_id');

        return Inertia::render('waybills/create', [
            ...$this->formOptions($request->user()),
            'defaults' => [
                'vehicle_id' => $vehicle?->id,
                'trailer_id' => $coupled,
                'driver_id' => $request->integer('driver_id') ?: null,
                'planned_departure_at' => WaybillPresenter::local(now()->addHour()->startOfHour()),
            ],
        ]);
    }

    public function store(WaybillRequest $request, SaveWaybillDraft $saveDraft): RedirectResponse
    {
        $waybill = $saveDraft->create($request->user(), $request->draftData(), $request->validated('idempotency_key'));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Draft saved. Check it and issue the waybill.')]);

        return to_route('waybills.show', $waybill);
    }

    public function show(Request $request, Waybill $waybill, WaybillChecks $checks): Response
    {
        Gate::authorize('view', $waybill);

        // Checks need full models: status, type, licence and branch of each participant.
        $waybill->load(['vehicle.type', 'trailer.type', 'driver', 'branch:id,name', 'createdBy:id,first_name,last_name', 'issuedBy:id,first_name,last_name', 'closedBy:id,first_name,last_name', 'cancelledBy:id,first_name,last_name']);
        $user = $request->user();
        $active = in_array($waybill->status, [WaybillStatus::Draft, WaybillStatus::Issued], true);

        return Inertia::render('waybills/show', [
            'waybill' => [
                ...WaybillPresenter::item($waybill),
                'vehicle' => [
                    'id' => $waybill->vehicle->id,
                    'plate_number' => $waybill->vehicle->plate_number,
                    'name' => trim($waybill->vehicle->make.' '.$waybill->vehicle->model),
                    'has_odometer' => $waybill->vehicle->type->has_odometer,
                    'current_odometer_km' => $waybill->vehicle->current_odometer_km,
                ],
                'basis' => $waybill->basis,
                'notes' => $waybill->notes,
                'departure_odometer_km' => $waybill->departure_odometer_km,
                'departure_fuel_l' => $waybill->departure_fuel_l,
                'return_fuel_l' => $waybill->return_fuel_l,
                'fuel_added_l' => $waybill->fuel_added_l,
                'return_odometer_km' => $waybill->return_odometer_km,
                'cancel_reason' => $waybill->cancel_reason,
                'created_by' => $waybill->createdBy?->name,
                'created_at' => WaybillPresenter::iso($waybill->created_at),
                'issued_by' => $waybill->issuedBy?->name,
                'issued_at' => WaybillPresenter::iso($waybill->issued_at),
                'closed_by' => $waybill->closedBy?->name,
                'closed_at' => WaybillPresenter::iso($waybill->closed_at),
                'cancelled_by' => $waybill->cancelledBy?->name,
                'cancelled_at' => WaybillPresenter::iso($waybill->cancelled_at),
            ],
            'warnings' => $active ? $checks->warnings($waybill) : [],
            'blocking' => $waybill->isDraft() ? array_values($checks->blockingErrors($waybill)) : [],
            'nowLocal' => WaybillPresenter::local(now()),
            'can' => [
                'update' => $user->can('update', $waybill),
                'issue' => $user->can('issue', $waybill),
                'close' => $user->can('close', $waybill),
                'cancel' => $user->can('cancel', $waybill),
                'view_vehicle' => $user->can('view', $waybill->vehicle),
                'view_driver' => $user->can('view', $waybill->driver),
            ],
        ]);
    }

    public function edit(Request $request, Waybill $waybill): Response
    {
        Gate::authorize('update', $waybill);

        return Inertia::render('waybills/edit', [
            ...$this->formOptions($request->user(), $waybill),
            'waybill' => [
                'id' => $waybill->id,
                'vehicle_id' => $waybill->vehicle_id,
                'trailer_id' => $waybill->trailer_id,
                'driver_id' => $waybill->driver_id,
                'route' => $waybill->route,
                'basis' => $waybill->basis,
                'notes' => $waybill->notes,
                'planned_departure_at' => WaybillPresenter::local($waybill->planned_departure_at),
                'planned_return_at' => WaybillPresenter::local($waybill->planned_return_at),
            ],
        ]);
    }

    public function update(WaybillRequest $request, Waybill $waybill, SaveWaybillDraft $saveDraft): RedirectResponse
    {
        $saveDraft->update($waybill, $request->draftData());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Draft updated.')]);

        return to_route('waybills.show', $waybill);
    }

    public function issue(IssueWaybillRequest $request, Waybill $waybill, IssueWaybill $issueWaybill): RedirectResponse
    {
        $waybill = $issueWaybill->execute(
            $waybill,
            $request->user(),
            OrganizationTime::parse($request->validated('departure_at')) ?? CarbonImmutable::now(),
            $request->filled('departure_odometer_km') ? $request->integer('departure_odometer_km') : null,
            $request->filled('departure_fuel_l') ? $request->float('departure_fuel_l') : null,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Waybill :number issued.', ['number' => $waybill->number])]);

        return back();
    }

    public function close(CloseWaybillRequest $request, Waybill $waybill, CloseWaybill $closeWaybill): RedirectResponse
    {
        $closeWaybill->execute(
            $waybill,
            $request->user(),
            OrganizationTime::parse($request->validated('return_at')) ?? CarbonImmutable::now(),
            $request->filled('return_odometer_km') ? $request->integer('return_odometer_km') : null,
            $request->validated('notes'),
            $request->filled('return_fuel_l') ? $request->float('return_fuel_l') : null,
            $request->filled('fuel_added_l') ? $request->float('fuel_added_l') : null,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Waybill closed.')]);

        return back();
    }

    public function cancel(Request $request, Waybill $waybill, CancelWaybill $cancelWaybill): RedirectResponse
    {
        Gate::authorize('cancel', $waybill);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $cancelWaybill->execute($waybill, $request->user(), $validated['reason']);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Waybill cancelled.')]);

        return back();
    }

    /**
     * Waybills tab of the vehicle card (as the main vehicle or as the trailer).
     */
    public function forVehicle(Request $request, Vehicle $vehicle): JsonResponse
    {
        Gate::authorize('view', $vehicle);
        Gate::authorize('viewAny', Waybill::class);

        return $this->listing(
            $request,
            Waybill::query()->where(fn (Builder $query) => $query->where('vehicle_id', $vehicle->id)->orWhere('trailer_id', $vehicle->id)),
        );
    }

    public function forDriver(Request $request, Driver $driver): JsonResponse
    {
        Gate::authorize('view', $driver);
        Gate::authorize('viewAny', Waybill::class);

        return $this->listing($request, Waybill::query()->where('driver_id', $driver->id));
    }

    /**
     * @param  Builder<Waybill>  $query
     */
    private function listing(Request $request, Builder $query): JsonResponse
    {
        $items = $query
            ->visibleTo($request->user())
            ->with(self::RELATIONS)
            ->orderByRaw('CASE status WHEN ? THEN 0 WHEN ? THEN 1 ELSE 2 END', [WaybillStatus::Issued->value, WaybillStatus::Draft->value])
            ->orderByDesc('planned_departure_at')
            ->orderByDesc('id')
            ->limit(51)
            ->get();

        return response()->json([
            'items' => $items->take(50)->map(fn (Waybill $waybill) => WaybillPresenter::item($waybill))->values(),
            'has_more' => $items->count() > 50,
        ]);
    }

    /**
     * @return array{vehicles: list<array<string, mixed>>, trailers: list<array<string, mixed>>, drivers: list<array<string, mixed>>}
     */
    private function formOptions(User $user, ?Waybill $current = null): array
    {
        $busy = fn (string $column) => Waybill::query()
            ->open()
            ->when($current, fn ($query) => $query->whereKeyNot($current->id))
            ->whereNotNull($column)
            ->pluck($column)
            ->all();
        $busyVehicles = [...$busy('vehicle_id'), ...$busy('trailer_id')];
        $busyDrivers = $busy('driver_id');

        $vehicles = Vehicle::query()
            ->visibleTo($user)
            ->with(['type:id,category,can_tow,is_towable,has_odometer', 'branch:id,name'])
            ->where('status', '!=', VehicleStatus::Decommissioned->value)
            ->orderBy('plate_number')
            ->get(['id', 'plate_number', 'make', 'model', 'branch_id', 'vehicle_type_id', 'status', 'current_odometer_km']);

        $present = fn (Vehicle $vehicle) => [
            'id' => $vehicle->id,
            'plate_number' => $vehicle->plate_number,
            'name' => trim($vehicle->make.' '.$vehicle->model),
            'category' => $vehicle->type->category->value,
            'branch' => $vehicle->branch?->name,
            'status' => $vehicle->status->value,
            'can_tow' => $vehicle->type->can_tow,
            'has_odometer' => $vehicle->type->has_odometer,
            'busy' => in_array($vehicle->id, $busyVehicles, true),
        ];

        return [
            'vehicles' => $vehicles->reject(fn (Vehicle $vehicle) => $vehicle->type->is_towable)->map($present)->values()->all(),
            'trailers' => $vehicles->filter(fn (Vehicle $vehicle) => $vehicle->type->is_towable)->map($present)->values()->all(),
            'drivers' => Driver::query()
                ->visibleTo($user)
                ->where('status', DriverStatus::Active->value)
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get()
                ->map(fn (Driver $driver) => [
                    'id' => $driver->id,
                    'name' => $driver->full_name,
                    'categories' => $driver->license_categories ?? [],
                    'busy' => in_array($driver->id, $busyDrivers, true),
                ])
                ->values()
                ->all(),
        ];
    }
}
