<?php

namespace App\Http\Requests\CRM;

use Illuminate\Foundation\Http\FormRequest;

class ConvertLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('convert', $this->route('lead')) ?? false;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('create_deal')) {
            $this->merge([
                'create_deal' => filter_var(
                    $this->input('create_deal'),
                    FILTER_VALIDATE_BOOLEAN,
                ),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'create_deal' => ['sometimes', 'boolean'],
        ];
    }
}
