<?php

namespace App\Http\Controllers\Fleet;

use App\Actions\Fleet\ChangeVehicleStatus;
use App\Enums\VehicleStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Fleet\ChangeVehicleStatusRequest;
use App\Models\Vehicle;
use App\Support\OrganizationTime;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class VehicleStatusController extends Controller
{
    public function __invoke(
        ChangeVehicleStatusRequest $request,
        Vehicle $vehicle,
        ChangeVehicleStatus $changeVehicleStatus,
    ): RedirectResponse {
        $changeVehicleStatus->execute(
            vehicle: $vehicle,
            status: VehicleStatus::from($request->validated('status')),
            actor: $request->user(),
            reason: $request->validated('reason'),
            changedAt: OrganizationTime::parse($request->validated('changed_at')),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Vehicle status changed.')]);

        return back();
    }
}
