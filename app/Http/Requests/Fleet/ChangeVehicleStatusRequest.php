<?php

namespace App\Http\Requests\Fleet;

use App\Enums\VehicleStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChangeVehicleStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('changeStatus', $this->route('vehicle')) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'reason' => $this->filled('reason') ? $this->input('reason') : null,
            'changed_at' => $this->filled('changed_at') ? $this->input('changed_at') : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(VehicleStatus::class)],
            'reason' => [
                'nullable',
                'string',
                'max:1000',
                Rule::requiredIf(fn () => $this->input('status') === VehicleStatus::Decommissioned->value),
            ],
            'changed_at' => ['nullable', 'date'],
        ];
    }
}
