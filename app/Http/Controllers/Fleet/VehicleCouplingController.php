<?php

namespace App\Http\Controllers\Fleet;

use App\Actions\Fleet\CoupleTrailer;
use App\Actions\Fleet\UncoupleTrailer;
use App\Http\Controllers\Controller;
use App\Http\Requests\Fleet\StoreVehicleCouplingRequest;
use App\Http\Requests\Fleet\UncoupleTrailerRequest;
use App\Models\Vehicle;
use App\Models\VehicleCoupling;
use App\Support\OrganizationTime;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class VehicleCouplingController extends Controller
{
    public function store(
        StoreVehicleCouplingRequest $request,
        Vehicle $vehicle,
        CoupleTrailer $coupleTrailer,
    ): RedirectResponse {
        $trailer = Vehicle::query()->findOrFail($request->integer('trailer_id'));

        Gate::authorize('couple', $trailer);

        $coupleTrailer->execute(
            tractor: $vehicle,
            trailer: $trailer,
            actor: $request->user(),
            position: $request->integer('position', 1),
            coupledAt: OrganizationTime::parse($request->validated('coupled_at')),
            notes: $request->validated('notes'),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Trailer coupled.')]);

        return back();
    }

    public function destroy(
        UncoupleTrailerRequest $request,
        Vehicle $vehicle,
        VehicleCoupling $coupling,
        UncoupleTrailer $uncoupleTrailer,
    ): RedirectResponse {
        abort_unless($coupling->tractor_id === $vehicle->id || $coupling->trailer_id === $vehicle->id, 404);

        $uncoupleTrailer->execute(
            $coupling,
            $request->user(),
            OrganizationTime::parse($request->validated('uncoupled_at')),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Trailer uncoupled.')]);

        return back();
    }
}
