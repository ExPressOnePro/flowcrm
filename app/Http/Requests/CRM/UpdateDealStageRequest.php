<?php

namespace App\Http\Requests\CRM;

use App\Support\CurrentOrganization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDealStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('changeStage', $this->route('deal')) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $organizationId = app(CurrentOrganization::class)->id();
        $deal = $this->route('deal');

        return [
            'pipeline_stage_id' => [
                'required',
                Rule::exists('pipeline_stages', 'id')
                    ->where('organization_id', $organizationId)
                    ->where('pipeline_id', $deal->pipeline_id),
            ],
            'lost_reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
