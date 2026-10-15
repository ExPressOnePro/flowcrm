<?php

namespace App\Http\Requests\CRM;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Support\CurrentOrganization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tasks.create') ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'description' => $this->filled('description') ? $this->input('description') : null,
            'assigned_to' => $this->filled('assigned_to') ? $this->input('assigned_to') : null,
            'due_at' => $this->filled('due_at') ? $this->input('due_at') : null,
            'taskable_type' => $this->filled('taskable_type') ? $this->input('taskable_type') : null,
            'taskable_id' => $this->filled('taskable_id') ? $this->input('taskable_id') : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $organizationId = app(CurrentOrganization::class)->id();

        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => [
                'nullable',
                Rule::enum(TaskStatus::class)->except([TaskStatus::Completed]),
            ],
            'priority' => ['required', Rule::enum(TaskPriority::class)],
            'assigned_to' => [
                'nullable',
                Rule::exists('organization_user', 'user_id')->where('organization_id', $organizationId),
            ],
            'due_at' => ['nullable', 'date'],
            'taskable_type' => ['nullable', 'in:customer,lead,deal,invoice'],
            'taskable_id' => ['nullable', 'integer', 'required_with:taskable_type'],
        ];
    }
}
