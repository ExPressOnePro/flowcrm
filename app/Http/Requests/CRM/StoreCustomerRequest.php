<?php

namespace App\Http\Requests\CRM;

use App\Enums\CustomerStatus;
use App\Enums\CustomerType;
use App\Support\CurrentOrganization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('customers.create') ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'company_name' => $this->filled('company_name') ? $this->input('company_name') : null,
            'email' => $this->filled('email') ? $this->input('email') : null,
            'phone' => $this->filled('phone') ? $this->input('phone') : null,
            'website' => $this->filled('website') ? $this->input('website') : null,
            'tax_id' => $this->filled('tax_id') ? $this->input('tax_id') : null,
            'source' => $this->filled('source') ? $this->input('source') : null,
            'notes' => $this->filled('notes') ? $this->input('notes') : null,
            'assigned_to' => $this->filled('assigned_to') ? $this->input('assigned_to') : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $organizationId = app(CurrentOrganization::class)->id();

        return [
            'type' => ['required', Rule::enum(CustomerType::class)],
            'name' => ['required', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'website' => ['nullable', 'url', 'max:255'],
            'tax_id' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::enum(CustomerStatus::class)],
            'source' => ['nullable', 'string', 'max:100'],
            'assigned_to' => [
                'nullable',
                Rule::exists('organization_user', 'user_id')
                    ->where('organization_id', $organizationId),
            ],
            'notes' => ['nullable', 'string'],
        ];
    }
}
