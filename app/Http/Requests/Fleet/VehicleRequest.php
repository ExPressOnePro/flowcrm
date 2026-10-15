<?php

namespace App\Http\Requests\Fleet;

use App\Enums\OwnershipType;
use App\Enums\VehicleStatus;
use App\Models\Vehicle;
use App\Support\BranchAccess;
use App\Support\CurrentOrganization;
use App\Support\OrganizationTime;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class VehicleRequest extends FormRequest
{
    abstract protected function vehicle(): ?Vehicle;

    protected function prepareForValidation(): void
    {
        $nullable = ['branch_id', 'vin', 'model', 'year', 'responsible_user_id', 'commissioned_on', 'notes', 'initial_odometer_km', 'status'];

        $this->merge(collect($nullable)->mapWithKeys(fn (string $key) => [
            $key => $this->filled($key) ? $this->input($key) : null,
        ])->all());

        if ($this->filled('plate_number')) {
            $this->merge(['plate_number' => Vehicle::normalizePlate((string) $this->input('plate_number'))]);
        }

        $this->merge(['vin' => Vehicle::normalizeVin($this->input('vin'))]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $organizationId = app(CurrentOrganization::class)->id();
        $vehicle = $this->vehicle();
        $visibleBranches = app(BranchAccess::class)->visibleBranchIds($this->user());

        $branchRules = ['nullable', Rule::exists('branches', 'id')->where('organization_id', $organizationId)];

        if ($visibleBranches !== null) {
            $branchRules = ['required', Rule::in($visibleBranches)];
        }

        return [
            'branch_id' => $branchRules,
            'vehicle_type_id' => [
                'required',
                Rule::exists('vehicle_types', 'id')->where('organization_id', $organizationId),
            ],
            'plate_number' => [
                'required',
                'string',
                'max:32',
                $this->uniqueActivePlate($organizationId, $vehicle),
            ],
            'vin' => [
                'nullable',
                'string',
                'size:17',
                'regex:/^[A-HJ-NPR-Z0-9]{17}$/',
                Rule::unique('vehicles', 'vin')
                    ->where('organization_id', $organizationId)
                    ->ignore($vehicle?->id),
            ],
            'make' => ['required', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'year' => ['nullable', 'integer', 'min:1950', 'max:'.(now()->year + 1)],
            'ownership_type' => ['required', Rule::enum(OwnershipType::class)],
            'responsible_user_id' => [
                'nullable',
                Rule::exists('organization_user', 'user_id')->where('organization_id', $organizationId),
            ],
            'commissioned_on' => ['nullable', 'date', 'before_or_equal:'.OrganizationTime::today()->toDateString()],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'vin.regex' => __('VIN may contain only Latin letters (except I, O, Q) and digits.'),
        ];
    }

    private function uniqueActivePlate(?int $organizationId, ?Vehicle $vehicle): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($organizationId, $vehicle): void {
            $compact = str_replace([' ', '-'], '', (string) $value);

            $exists = Vehicle::query()
                ->withoutGlobalScopes()
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->where('status', '!=', VehicleStatus::Decommissioned->value)
                ->when($vehicle, fn ($query) => $query->whereKeyNot($vehicle->id))
                ->whereRaw("REPLACE(REPLACE(plate_number, ' ', ''), '-', '') = ?", [$compact])
                ->exists();

            if ($exists) {
                $fail(__('An active vehicle with this plate number already exists.'));
            }
        };
    }
}
