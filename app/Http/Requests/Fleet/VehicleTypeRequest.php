<?php

namespace App\Http\Requests\Fleet;

use App\Enums\VehicleCategory;
use App\Models\VehicleType;
use App\Support\CurrentOrganization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class VehicleTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $type = $this->route('vehicle_type');

        return $type instanceof VehicleType
            ? $this->user()?->can('update', $type) ?? false
            : $this->user()?->can('create', VehicleType::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'can_tow' => $this->boolean('can_tow'),
            'is_towable' => $this->boolean('is_towable'),
            'has_odometer' => $this->boolean('has_odometer'),
            'is_active' => $this->boolean('is_active', true),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $organizationId = app(CurrentOrganization::class)->id();
        $type = $this->route('vehicle_type');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('vehicle_types', 'name')
                    ->where('organization_id', $organizationId)
                    ->ignore($type instanceof VehicleType ? $type->id : null),
            ],
            'category' => ['required', Rule::enum(VehicleCategory::class)],
            'can_tow' => ['boolean'],
            'is_towable' => ['boolean'],
            'has_odometer' => ['boolean'],
            'is_active' => ['boolean'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->boolean('can_tow') && $this->boolean('is_towable')) {
                    $validator->errors()->add('is_towable', __('A vehicle type cannot both tow and be towed.'));
                }
            },
        ];
    }
}
