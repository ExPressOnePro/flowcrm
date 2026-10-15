<?php

namespace App\Http\Requests\Fleet;

use App\Models\Branch;
use App\Support\CurrentOrganization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BranchRequest extends FormRequest
{
    public function authorize(): bool
    {
        $branch = $this->route('branch');

        return $branch instanceof Branch
            ? $this->user()?->can('update', $branch) ?? false
            : $this->user()?->can('create', Branch::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'code' => $this->filled('code') ? $this->input('code') : null,
            'city' => $this->filled('city') ? $this->input('city') : null,
            'address' => $this->filled('address') ? $this->input('address') : null,
            'is_active' => $this->boolean('is_active', true),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $organizationId = app(CurrentOrganization::class)->id();
        $branch = $this->route('branch');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('branches', 'name')
                    ->where('organization_id', $organizationId)
                    ->ignore($branch instanceof Branch ? $branch->id : null),
            ],
            'code' => ['nullable', 'string', 'max:32'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
        ];
    }
}
