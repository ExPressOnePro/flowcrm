<?php

namespace App\Actions\Organizations;

use App\Actions\CRM\EnsureDefaultPipeline;
use App\Enums\OrganizationStatus;
use App\Enums\OrganizationUserStatus;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class CreateOrganization
{
    public function __construct(
        private EnsureOrganizationRoles $ensureOrganizationRoles,
        private EnsureDefaultPipeline $ensureDefaultPipeline,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(User $owner, array $attributes, string $ownerRole = 'Owner'): Organization
    {
        return DB::transaction(function () use ($owner, $attributes, $ownerRole): Organization {
            $name = $attributes['name'];

            $organization = Organization::query()->create([
                'name' => $name,
                'slug' => $this->uniqueSlug($name),
                'email' => $attributes['email'] ?? $owner->email,
                'phone' => $attributes['phone'] ?? null,
                'website' => $attributes['website'] ?? null,
                'currency' => $attributes['currency'] ?? 'EUR',
                'timezone' => $attributes['timezone'] ?? 'Europe/Chisinau',
                'status' => OrganizationStatus::Active,
            ]);

            $organization->users()->attach($owner->id, [
                'job_title' => $attributes['job_title'] ?? 'Owner',
                'department' => $attributes['department'] ?? null,
                'status' => OrganizationUserStatus::Active->value,
                'joined_at' => now(),
            ]);

            $this->ensureOrganizationRoles->execute($organization);
            $this->ensureDefaultPipeline->execute($organization);

            app(PermissionRegistrar::class)->setPermissionsTeamId($organization->id);

            $role = Role::query()
                ->where('name', $ownerRole)
                ->where('organization_id', $organization->id)
                ->firstOrFail();

            $owner->assignRole($role);

            return $organization;
        });
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'organization';
        $slug = $base;
        $counter = 1;

        while (Organization::query()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
