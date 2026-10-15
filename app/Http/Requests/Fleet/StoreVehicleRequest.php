<?php

namespace App\Http\Requests\Fleet;

use App\Enums\VehicleStatus;
use App\Models\Vehicle;
use Illuminate\Validation\Rule;

class StoreVehicleRequest extends VehicleRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Vehicle::class) ?? false;
    }

    protected function vehicle(): ?Vehicle
    {
        return null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'status' => ['nullable', Rule::enum(VehicleStatus::class)->except([VehicleStatus::Decommissioned])],
            'initial_odometer_km' => ['nullable', 'integer', 'min:0', 'max:9999999'],
        ];
    }
}
