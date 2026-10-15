<?php

namespace App\Http\Requests\Fleet;

use App\Models\Vehicle;

class UpdateVehicleRequest extends VehicleRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->vehicle()) ?? false;
    }

    protected function vehicle(): ?Vehicle
    {
        /** @var Vehicle */
        return $this->route('vehicle');
    }
}
