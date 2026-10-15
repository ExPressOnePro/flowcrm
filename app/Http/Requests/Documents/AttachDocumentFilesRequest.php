<?php

namespace App\Http\Requests\Documents;

use App\Models\Document;
use Illuminate\Foundation\Http\FormRequest;

class AttachDocumentFilesRequest extends FormRequest
{
    use DocumentFilesRules;

    public function authorize(): bool
    {
        $document = $this->route('document');

        return $document instanceof Document
            && ($this->user()?->can('attachFiles', $document) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return $this->fileRules(required: true);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->fileMessages();
    }
}
