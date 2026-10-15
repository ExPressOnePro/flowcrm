<?php

namespace App\Http\Requests\Waybills;

use App\Models\Waybill;
use Illuminate\Foundation\Http\FormRequest;

class IssueWaybillRequest extends FormRequest
{
    public function authorize(): bool
    {
        $waybill = $this->route('waybill');

        return $waybill instanceof Waybill && ($this->user()?->can('issue', $waybill) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'departure_at' => ['nullable', 'date'],
            'departure_odometer_km' => ['nullable', 'integer', 'min:0', 'max:9999999'],
            'departure_fuel_l' => ['nullable', 'numeric', 'min:0', 'max:5000'],
        ];
    }
}
