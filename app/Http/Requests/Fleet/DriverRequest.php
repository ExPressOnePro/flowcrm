<?php

namespace App\Http\Requests\Fleet;

use App\Enums\DriverStatus;
use App\Models\Driver;
use App\Support\BranchAccess;
use App\Support\CurrentOrganization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class DriverRequest extends FormRequest
{
    public function authorize(): bool
    {
        $driver = $this->route('driver');

        return $driver instanceof Driver
            ? ($this->user()?->can('update', $driver) ?? false)
            : ($this->user()?->can('create', Driver::class) ?? false);
    }

    protected function prepareForValidation(): void
    {
        $license = $this->input('license_number');

        $this->merge([
            'license_number' => is_string($license) && trim($license) !== ''
                ? mb_strtoupper((string) preg_replace('/\s+/', '', $license))
                : null,
            'license_categories' => array_values(array_unique(array_filter((array) $this->input('license_categories', [])))),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $organizationId = app(CurrentOrganization::class)->id();
        $driver = $this->route('driver');
        $ignoreId = $driver instanceof Driver ? $driver->id : null;

        return [
            'last_name' => ['required', 'string', 'max:100'],
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'personnel_number' => [
                'nullable', 'string', 'max:50',
                Rule::unique('drivers', 'personnel_number')->where('organization_id', $organizationId)->ignore($ignoreId),
            ],
            'license_number' => ['nullable', 'string', 'max:50'],
            'license_categories' => ['array'],
            'license_categories.*' => [Rule::in(Driver::LICENSE_CATEGORIES)],
            'branch_id' => [
                'nullable', 'integer',
                Rule::exists('branches', 'id')->where('organization_id', $organizationId),
            ],
            'user_id' => [
                'nullable', 'integer',
                Rule::exists('organization_user', 'user_id')->where('organization_id', $organizationId),
                Rule::unique('drivers', 'user_id')->where('organization_id', $organizationId)->ignore($ignoreId),
            ],
            'status' => [$driver instanceof Driver ? 'required' : 'nullable', Rule::enum(DriverStatus::class)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $user = $this->user();
                $branchId = $this->filled('branch_id') ? $this->integer('branch_id') : null;

                // Branch-limited staff could otherwise create a driver they can't see afterwards.
                if ($user !== null && ! app(BranchAccess::class)->canSeeBranch($user, $branchId)) {
                    $validator->errors()->add('branch_id', __('Choose your branch.'));
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'personnel_number.unique' => __('A driver with this personnel number already exists.'),
            'user_id.unique' => __('This account is already linked to another driver.'),
        ];
    }
}
