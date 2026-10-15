<?php

namespace App\Http\Requests\Waybills;

use App\Enums\DriverStatus;
use App\Models\Driver;
use App\Models\Vehicle;
use App\Models\Waybill;
use App\Support\BranchAccess;
use App\Support\CurrentOrganization;
use App\Support\OrganizationTime;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class WaybillRequest extends FormRequest
{
    public function authorize(): bool
    {
        $waybill = $this->route('waybill');

        return $waybill instanceof Waybill
            ? ($this->user()?->can('update', $waybill) ?? false)
            : ($this->user()?->can('create', Waybill::class) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $organizationId = app(CurrentOrganization::class)->id();

        return [
            'vehicle_id' => [
                'required', 'integer',
                Rule::exists('vehicles', 'id')->where('organization_id', $organizationId)->whereNull('deleted_at'),
            ],
            'trailer_id' => [
                'nullable', 'integer', 'different:vehicle_id',
                Rule::exists('vehicles', 'id')->where('organization_id', $organizationId)->whereNull('deleted_at'),
            ],
            'driver_id' => [
                'required', 'integer',
                Rule::exists('drivers', 'id')->where('organization_id', $organizationId)->where('status', DriverStatus::Active->value),
            ],
            'route' => ['required', 'string', 'max:500'],
            'basis' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'planned_departure_at' => ['required', 'date'],
            'planned_return_at' => ['nullable', 'date', 'after:planned_departure_at'],
            'idempotency_key' => ['nullable', 'string', 'max:64'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $user = $this->user();
                $access = app(BranchAccess::class);
                $vehicle = Vehicle::query()->with('type')->find($this->integer('vehicle_id'));
                $trailer = $this->filled('trailer_id') ? Vehicle::query()->with('type')->find($this->integer('trailer_id')) : null;
                $driver = Driver::query()->find($this->integer('driver_id'));

                if ($vehicle !== null && ! $access->canSeeBranch($user, $vehicle->branch_id)) {
                    $validator->errors()->add('vehicle_id', __('The selected vehicle is invalid.'));
                } elseif ($vehicle?->type->is_towable) {
                    $validator->errors()->add('vehicle_id', __('A trailer cannot be the main vehicle of a waybill.'));
                }

                if ($trailer !== null && (! $trailer->type->is_towable || ! $vehicle?->type->can_tow)) {
                    $validator->errors()->add('trailer_id', __('This vehicle cannot tow the selected trailer.'));
                }

                if ($driver !== null && ! $access->canSeeBranch($user, $driver->branch_id)) {
                    $validator->errors()->add('driver_id', __('The selected driver is invalid.'));
                }
            },
        ];
    }

    /**
     * @return array{vehicle_id: int, trailer_id: int|null, driver_id: int, route: string, notes: string|null, planned_departure_at: CarbonImmutable, planned_return_at: CarbonImmutable|null}
     */
    public function draftData(): array
    {
        return [
            'vehicle_id' => $this->integer('vehicle_id'),
            'trailer_id' => $this->filled('trailer_id') ? $this->integer('trailer_id') : null,
            'driver_id' => $this->integer('driver_id'),
            'route' => trim((string) $this->validated('route')),
            'basis' => $this->validated('basis'),
            'notes' => $this->validated('notes'),
            'planned_departure_at' => OrganizationTime::parse($this->validated('planned_departure_at')),
            'planned_return_at' => OrganizationTime::parse($this->validated('planned_return_at')),
        ];
    }
}
