<?php

use App\Actions\Organizations\CreateOrganization;
use App\Enums\OrganizationUserStatus;
use App\Models\Organization;
use App\Models\User;
use App\Support\BranchAccess;
use App\Support\CurrentOrganization;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
*/

function seedPermissions(): void
{
    (new RolesAndPermissionsSeeder)->run();
}

/**
 * @param  array<string, mixed>  $userAttributes
 * @param  array<string, mixed>  $organizationAttributes
 */
function createUserWithOrganization(
    array $userAttributes = [],
    array $organizationAttributes = [],
): User {
    seedPermissions();

    $user = User::factory()->create($userAttributes);

    $organization = app(CreateOrganization::class)->execute(
        $user,
        [
            'name' => $organizationAttributes['name'] ?? 'Test Organization',
            ...$organizationAttributes,
        ],
    );

    session(['current_organization_id' => $organization->id]);
    app(CurrentOrganization::class)->set($organization);

    return $user->fresh();
}

function addOrganizationMember(Organization $organization, string $role, ?int $branchId = null): User
{
    $user = User::factory()->create();

    $organization->users()->attach($user->id, [
        'branch_id' => $branchId,
        'status' => OrganizationUserStatus::Active->value,
        'joined_at' => now(),
    ]);

    setPermissionsTeamId($organization->id);
    $user->assignRole(
        Role::query()->where('name', $role)->where('organization_id', $organization->id)->firstOrFail(),
    );

    app(BranchAccess::class)->flush();
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    return $user->fresh();
}
