<?php

namespace App\Http\Requests\CRM;

use App\Support\CurrentOrganization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDealRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('deal')) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'description' => $this->filled('description') ? $this->input('description') : null,
            'customer_id' => $this->filled('customer_id') ? $this->input('customer_id') : null,
            'assigned_to' => $this->filled('assigned_to') ? $this->input('assigned_to') : null,
            'expected_close_date' => $this->filled('expected_close_date') ? $this->input('expected_close_date') : null,
            'lost_reason' => $this->filled('lost_reason') ? $this->input('lost_reason') : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $organizationId = app(CurrentOrganization::class)->id();

        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'value' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'customer_id' => [
                'nullable',
                Rule::exists('customers', 'id')->where('organization_id', $organizationId),
            ],
            'assigned_to' => [
                'nullable',
                Rule::exists('organization_user', 'user_id')->where('organization_id', $organizationId),
            ],
            'expected_close_date' => ['nullable', 'date'],
            'lost_reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
