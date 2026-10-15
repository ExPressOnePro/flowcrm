<?php

namespace App\Http\Controllers\Fleet;

use App\Enums\VehicleCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Fleet\VehicleTypeRequest;
use App\Models\VehicleType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class VehicleTypeController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', VehicleType::class);

        return Inertia::render('fleet/vehicle-types/index', [
            'types' => VehicleType::query()
                ->withCount('vehicles')
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get()
                ->map(fn (VehicleType $type) => [
                    'id' => $type->id,
                    'name' => $type->name,
                    'category' => $type->category->value,
                    'can_tow' => $type->can_tow,
                    'is_towable' => $type->is_towable,
                    'has_odometer' => $type->has_odometer,
                    'is_active' => $type->is_active,
                    'vehicles_count' => $type->vehicles_count,
                ]),
            'categories' => collect(VehicleCategory::cases())->map->value,
        ]);
    }

    public function store(VehicleTypeRequest $request): RedirectResponse
    {
        VehicleType::query()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Vehicle type created.')]);

        return back();
    }

    public function update(VehicleTypeRequest $request, VehicleType $vehicleType): RedirectResponse
    {
        $data = $request->validated();

        if ($vehicleType->vehicles()->withTrashed()->exists()) {
            $behaviour = ['can_tow', 'is_towable', 'has_odometer'];
            $changed = collect($behaviour)->contains(fn (string $key) => (bool) $data[$key] !== (bool) $vehicleType->{$key});

            if ($changed) {
                Inertia::flash('toast', ['type' => 'error', 'message' => __('Towing and odometer settings cannot be changed while vehicles use this type.')]);

                return back();
            }
        }

        $vehicleType->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Vehicle type updated.')]);

        return back();
    }
}
