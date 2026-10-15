<?php

namespace App\Http\Requests\Documents;

use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Vehicle;
use App\Support\CurrentOrganization;
use App\Support\OrganizationTime;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentRequest extends FormRequest
{
    use DocumentFilesRules;

    public function authorize(): bool
    {
        $vehicle = $this->route('vehicle');

        return $vehicle instanceof Vehicle
            && ($this->user()?->can('create', [Document::class, $vehicle]) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $organizationId = app(CurrentOrganization::class)->id();
        $type = DocumentType::query()->find($this->integer('document_type_id'));

        return [
            'document_type_id' => [
                'required',
                'integer',
                Rule::exists('document_types', 'id')
                    ->where('organization_id', $organizationId)
                    ->where('is_active', true),
            ],
            'number' => ['nullable', 'string', 'max:100'],
            'issuer' => ['nullable', 'string', 'max:255'],
            'issued_on' => ['nullable', 'date', 'before_or_equal:'.OrganizationTime::today()->toDateString()],
            'expires_on' => [
                $type?->has_expiry ? 'required' : 'nullable',
                'date',
                'after_or_equal:issued_on',
            ],
            'notes' => ['nullable', 'string', 'max:2000'],
            'replaces_id' => ['nullable', 'integer'],
            'idempotency_key' => ['nullable', 'string', 'max:64'],
            ...$this->fileRules(required: false),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->fileMessages();
    }
}
