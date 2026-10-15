<?php

namespace App\Http\Controllers\Fleet;

use App\Actions\Fleet\RecordOdometerReading;
use App\Enums\OdometerSource;
use App\Http\Controllers\Controller;
use App\Http\Requests\Fleet\StoreOdometerReadingRequest;
use App\Models\Vehicle;
use App\Support\OrganizationTime;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class OdometerReadingController extends Controller
{
    public function store(
        StoreOdometerReadingRequest $request,
        Vehicle $vehicle,
        RecordOdometerReading $recordOdometerReading,
    ): RedirectResponse {
        $recordOdometerReading->execute(
            vehicle: $vehicle,
            valueKm: $request->integer('value_km'),
            recordedAt: OrganizationTime::parse($request->validated('recorded_at')) ?? CarbonImmutable::now(),
            source: OdometerSource::Manual,
            actor: $request->user(),
            note: $request->validated('note'),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Odometer reading recorded.')]);

        return back();
    }
}
