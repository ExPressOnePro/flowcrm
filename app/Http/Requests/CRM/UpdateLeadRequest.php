<?php

namespace App\Http\Requests\CRM;

use App\Enums\LeadStatus;
use App\Support\CurrentOrganization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('lead')) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'company_name' => $this->filled('company_name') ? $this->input('company_name') : null,
            'email' => $this->filled('email') ? $this->input('email') : null,
            'phone' => $this->filled('phone') ? $this->input('phone') : null,
            'source' => $this->filled('source') ? $this->input('source') : null,
            'estimated_value' => $this->filled('estimated_value') ? $this->input('estimated_value') : null,
            'currency' => $this->filled('currency') ? $this->input('currency') : null,
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
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'source' => ['nullable', 'string', 'max:100'],
            'status' => [
                'required',
                Rule::enum(LeadStatus::class)->except([LeadStatus::Converted]),
            ],
            'estimated_value' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'assigned_to' => [
                'nullable',
                Rule::exists('organization_user', 'user_id')
                    ->where('organization_id', $organizationId),
            ],
            'notes' => ['nullable', 'string'],
        ];
    }
}
