<?php

namespace App\Http\Requests\Fleet;

use App\Support\CurrentOrganization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVehicleCouplingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('couple', $this->route('vehicle')) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'position' => $this->filled('position') ? $this->input('position') : 1,
            'coupled_at' => $this->filled('coupled_at') ? $this->input('coupled_at') : null,
            'notes' => $this->filled('notes') ? $this->input('notes') : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'trailer_id' => [
                'required',
                'integer',
                Rule::exists('vehicles', 'id')
                    ->where('organization_id', app(CurrentOrganization::class)->id())
                    ->whereNull('deleted_at'),
            ],
            'position' => ['required', 'integer', 'min:1', 'max:3'],
            'coupled_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
