<?php

namespace App\Http\Requests\Fleet;

use Illuminate\Foundation\Http\FormRequest;

class UncoupleTrailerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('couple', $this->route('vehicle')) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'uncoupled_at' => $this->filled('uncoupled_at') ? $this->input('uncoupled_at') : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'uncoupled_at' => ['nullable', 'date'],
        ];
    }
}
