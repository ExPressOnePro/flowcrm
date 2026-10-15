<?php

namespace App\Http\Requests\Waybills;

use App\Models\Waybill;
use Illuminate\Foundation\Http\FormRequest;

class CloseWaybillRequest extends FormRequest
{
    public function authorize(): bool
    {
        $waybill = $this->route('waybill');

        return $waybill instanceof Waybill && ($this->user()?->can('close', $waybill) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'return_at' => ['nullable', 'date'],
            'return_odometer_km' => ['nullable', 'integer', 'min:0', 'max:9999999'],
            'return_fuel_l' => ['nullable', 'numeric', 'min:0', 'max:5000'],
            'fuel_added_l' => ['nullable', 'numeric', 'min:0', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
