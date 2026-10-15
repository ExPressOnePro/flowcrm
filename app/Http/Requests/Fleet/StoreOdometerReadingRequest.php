<?php

namespace App\Http\Requests\Fleet;

use Illuminate\Foundation\Http\FormRequest;

class StoreOdometerReadingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('recordOdometer', $this->route('vehicle')) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'recorded_at' => $this->filled('recorded_at') ? $this->input('recorded_at') : null,
            'note' => $this->filled('note') ? $this->input('note') : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'value_km' => ['required', 'integer', 'min:0', 'max:9999999'],
            'recorded_at' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
