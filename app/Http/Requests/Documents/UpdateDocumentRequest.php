<?php

namespace App\Http\Requests\Documents;

use App\Models\Document;
use App\Support\OrganizationTime;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $document = $this->route('document');

        return $document instanceof Document
            && ($this->user()?->can('update', $document) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Document $document */
        $document = $this->route('document');

        return [
            'number' => ['nullable', 'string', 'max:100'],
            'issuer' => ['nullable', 'string', 'max:255'],
            'issued_on' => ['nullable', 'date', 'before_or_equal:'.OrganizationTime::today()->toDateString()],
            'expires_on' => [
                $document->type->has_expiry ? 'required' : 'nullable',
                'date',
                'after_or_equal:issued_on',
            ],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
