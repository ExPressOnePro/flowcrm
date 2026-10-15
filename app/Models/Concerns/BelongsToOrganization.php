<?php

namespace App\Models\Concerns;

use App\Models\Organization;
use App\Models\Scopes\OrganizationScope;
use App\Support\CurrentOrganization;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToOrganization
{
    public static function bootBelongsToOrganization(): void
    {
        static::creating(function ($model): void {
            if (! empty($model->organization_id)) {
                return;
            }

            $organizationId = app(CurrentOrganization::class)->id();

            if ($organizationId !== null) {
                $model->organization_id = $organizationId;
            }
        });

        static::addGlobalScope(new OrganizationScope);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
