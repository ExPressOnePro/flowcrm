<?php

namespace App\Http\Requests\CRM;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('payments.create') ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'payment_method' => $this->filled('payment_method') ? $this->input('payment_method') : null,
            'reference' => $this->filled('reference') ? $this->input('reference') : null,
            'notes' => $this->filled('notes') ? $this->input('notes') : null,
            'paid_at' => $this->filled('paid_at') ? $this->input('paid_at') : now()->toDateTimeString(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['nullable', 'string', 'size:3'],
            'payment_method' => ['nullable', 'string', 'max:100'],
            'reference' => ['nullable', 'string', 'max:255'],
            'paid_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
