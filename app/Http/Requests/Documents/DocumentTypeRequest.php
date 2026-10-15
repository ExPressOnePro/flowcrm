<?php

namespace App\Http\Requests\Documents;

use App\Enums\DocumentSubject;
use App\Enums\VehicleCategory;
use App\Models\DocumentType;
use App\Support\CurrentOrganization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DocumentTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $type = $this->route('document_type');

        return $type instanceof DocumentType
            ? $this->user()?->can('update', $type) ?? false
            : $this->user()?->can('create', DocumentType::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $categories = array_values(array_filter((array) $this->input('vehicle_categories', [])));

        $this->merge([
            'has_expiry' => $this->boolean('has_expiry'),
            'is_mandatory' => $this->boolean('is_mandatory'),
            'is_active' => $this->boolean('is_active', true),
            'vehicle_categories' => $categories === [] ? null : $categories,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $type = $this->route('document_type');
        $subject = $type instanceof DocumentType ? $type->subject->value : $this->input('subject');

        return [
            'subject' => [$type instanceof DocumentType ? 'prohibited' : 'required', Rule::enum(DocumentSubject::class)],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('document_types', 'name')
                    ->where('organization_id', app(CurrentOrganization::class)->id())
                    ->where('subject', $subject)
                    ->ignore($type instanceof DocumentType ? $type->id : null),
            ],
            'has_expiry' => ['boolean'],
            'is_mandatory' => ['boolean'],
            'is_active' => ['boolean'],
            'vehicle_categories' => ['nullable', 'array'],
            'vehicle_categories.*' => [Rule::enum(VehicleCategory::class)],
        ];
    }
}
